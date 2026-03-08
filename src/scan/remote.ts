import type * as Bunny from "@bunny.net/storage-sdk";
import { Effect, Ref } from "effect";
import { listDirectory } from "../bunny/storage.ts";
import { retryPolicy } from "../shared/retry.ts";
import { getRemoteRelPath } from "../bunny/remote-path.ts";
import { ensureLeadingSlash } from "../shared/path.ts";
import { progress } from "../ui/progress.ts";
import type { RemoteScanEntry, ScanSnapshot } from "./types.ts";

export interface ScanRemoteOptions {
   zoneName: string;
   concurrency: number;
}

export function scanRemote(
   storageZone: Bunny.zone.StorageZone,
   concurrency: number,
   requestTimeout?: number,
   retries = 3,
) {
   return Effect.gen(function* () {
      const queue: string[] = ["/"];
      const entries = new Map<string, RemoteScanEntry>();
      const scannedRef = yield* Ref.make(0);

      const prog = progress({
         style: "block",
         max: 100,
         indicator: "timer", // Shows elapsed time instead of animated dots
      });
      prog.start("Processing bunny.net storage.");

      while (queue.length > 0) {
         const batch = queue.splice(0, concurrency);

         const lists = yield* Effect.forEach(
            batch,
            (path) => listDirectory(storageZone, path, requestTimeout).pipe(Effect.retry(retryPolicy(retries))),
            { concurrency },
         );

         for (const list of lists) {
            for (const item of list) {
               if (item.isDirectory) {
                  const relPath = getRemoteRelPath(item, storageZone.name);
                  const basePath = relPath.length > 0 ? ensureLeadingSlash(relPath) : "/";
                  const childPath = basePath.endsWith("/") ? basePath : `${basePath}/`;
                  queue.push(childPath);
                  continue;
               }

               const relPath = getRemoteRelPath(item, storageZone.name);
               entries.set(relPath, {
                  source: "remote",
                  relPath,
                  checksum: item.checksum?.toLowerCase(),
               });

               yield* Ref.update(scannedRef, (n) => n + 1);
               prog.advance(1);
            }
         }
      }

      const scanned = yield* Ref.get(scannedRef);
      prog.stop(`Finished reading bunny.net storage.`);

      return {
         entries,
         total: entries.size,
         scanned,
      } satisfies ScanSnapshot<RemoteScanEntry>;
   });
}
