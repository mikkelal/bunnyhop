import { readdir } from "node:fs/promises";
import { relative } from "node:path";
import { Effect, Ref } from "effect";
import { sha256File } from "../shared/hash.ts";
import { toPosixPath } from "../shared/path.ts";
import { progress } from "../ui/progress.ts";
import { loadIgnoreFilter } from "./ignore.ts";
import type { LocalScanEntry, ScanSnapshot } from "./types.ts";
import process from "node:process";

export interface ScanLocalOptions {
   concurrency?: number | "unbounded";
}

export function scanLocal(
   root: string,
   options: ScanLocalOptions = {},
) {
   return Effect.gen(function* () {
      const ignoreFilter = yield* loadIgnoreFilter(process.cwd());

      const files = yield* Effect.tryPromise({
         try: async () => {
            const entries = await readdir(root, { recursive: true, withFileTypes: true });
            const allFiles = entries.filter((e) => e.isFile()).map((e) => `${e.parentPath}/${e.name}`);

            if (!ignoreFilter) return allFiles;

            return allFiles.filter((absPath) => {
               const relPath = toPosixPath(relative(root, absPath));
               return ignoreFilter(relPath);
            });
         },
         catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
      });

      const total = files.length;

      const prog = progress({
         style: "block",
         max: total,
      });
      prog.start("Processing files");

      const doneRef = yield* Ref.make(0);
      const entries = yield* Effect.forEach(
         files,
         (filePath): Effect.Effect<LocalScanEntry, Error> => {
            return Effect.gen(function* () {
               const checksum = yield* sha256File(filePath);
               const done = yield* Ref.updateAndGet(doneRef, (value) => value + 1);

               prog.advance(1, `Processing files: ${done}/${total}`);

               return {
                  source: "local",
                  absPath: filePath,
                  relPath: toPosixPath(relative(root, filePath)),
                  checksum,
               };
            });
         },
         { concurrency: options.concurrency ?? "unbounded" },
      );

      const map = new Map<string, LocalScanEntry>();
      for (const entry of entries) {
         map.set(entry.relPath, entry);
      }

      const scanned = yield* Ref.get(doneRef);
      prog.stop(`Read ${scanned} files from ${root}`);

      return {
         entries: map,
         total,
         scanned,
      } satisfies ScanSnapshot<LocalScanEntry>;
   });
}
