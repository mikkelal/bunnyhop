import { log } from "@clack/prompts";
import { Duration, Effect, Option } from "effect";
import { purgeUrls } from "../bunny/purge.ts";
import * as storage from "../bunny/storage.ts";
import type { CliConfig } from "../cli/config.ts";
import { scanLocal } from "../scan/local.ts";
import { scanRemote } from "../scan/remote.ts";
import { getContentType } from "../shared/content-type.ts";
import { diffLocalRemote } from "./diff.ts";
import { progress } from "../ui/progress.ts";

export function deploy(
   config: CliConfig,
) {
   return Effect.gen(function* () {
      const zone = storage.connectZone(
         config.bunny_storage_region,
         config.bunny_storage_zone,
         config.bunny_storage_accessKey,
      );
      const concurrency = config.bunny_api_rate_limit;

      const localSnapshot = yield* scanLocal(config.buildDir);

      const remoteSnapshot = yield* scanRemote(zone, config.bunny_api_rate_limit, config.requestTimeout, config.retryLimit);

      const fileDiff = diffLocalRemote(
         localSnapshot.entries,
         remoteSnapshot.entries,
      );

      const purgePaths = new Set<string>();

      function addPurgePath(path: string) {
         // see docs: https://docs.bunny.net/api-reference/core/purge/purge-url
         if (path.endsWith("/index.html")) {
            const base = path.slice(0, -"/index.html".length);
            purgePaths.add(`${base}/`);
            purgePaths.add(base);
            return;
         }

         purgePaths.add(path);
      }

      // delete unknown/untracked files in bunny.net
      const unknownFiles = fileDiff.unknownRemote.length;
      if (!config.keepUnknownFiles && unknownFiles) {
         const prog = progress({
            style: "block",
            max: unknownFiles,
         });
         prog.start(`Deleting ${unknownFiles} unknown files in bunny.net storage.`);

         yield* Effect.forEach(
            fileDiff.unknownRemote,
            (remote) => {
               return Effect.gen(function* () {
                  yield* storage.deleteFile(zone, remote.relPath, config.retryLimit, config.requestTimeout);
                  addPurgePath(remote.relPath);
                  prog.advance(1);
               });
            },
            { concurrency: config.bunny_api_rate_limit },
         );
         prog.stop(`Deleted ${unknownFiles} unknown files in bunny.net storage.`);
      }

      const uploadTotal = fileDiff.changed.length;
      const uploadProg = progress({
         style: "block",
         max: uploadTotal,
      });
      uploadProg.start(`Uploading ${uploadTotal} ${uploadTotal > 1 ? "files" : "file"} to bunny.net storage.`);

      yield* Effect.forEach(
         fileDiff.changed,
         (local) => {
            return Effect.gen(function* () {
               const remoteRel = local.relPath;

               yield* storage.uploadFile(
                  zone,
                  remoteRel,
                  local.absPath,
                  local.checksum,
                  getContentType(local.relPath),
                  config.retryLimit,
                  config.requestTimeout,
               );

               addPurgePath(remoteRel);
               uploadProg.advance(1);
            });
         },
         { concurrency },
      );
      uploadProg.stop(`Uploaded ${uploadTotal} ${uploadTotal > 1 ? "files" : "file"} to bunny.net storage.`);

      // purge
      if (!config.skipPurge && purgePaths.size > 0) {
         if (config.replicationTimeout > 0) {
            log.info(`Waiting ${config.replicationTimeout}ms for geo-replication to sync.`);
            yield* Effect.sleep(Duration.millis(config.replicationTimeout));
         }
         yield* purgeUrls(purgePaths, {
            pullZoneUrl: Option.getOrThrow(config.pullZoneUrl),
            apiKey: Option.getOrThrow(config.apiKey),
            bunny_api_rate_limit: config.bunny_api_rate_limit,
            retryLimit: config.retryLimit,
            requestTimeout: config.requestTimeout,
            purgeStrict: config.purgeStrict,
         });
      }
   });
}
