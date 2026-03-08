import { Effect, Either, Ref } from "effect";
import { stripLeadingSlash } from "../shared/path.ts";
import { retryPolicy } from "../shared/retry.ts";
import { progress } from "../ui/progress.ts";
import { log } from "@clack/prompts";

export interface PurgeFailure {
   url: string;
   status?: number;
   message: string;
}

function purgeOnce(apiKey: string, url: string, requestTimeout: number) {
   return Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
         try: () =>
            fetch(
               `https://api.bunny.net/purge?url=${encodeURIComponent(url)}`,
               {
                  method: "POST",
                  headers: {
                     AccessKey: apiKey,
                  },
                  signal: AbortSignal.timeout(requestTimeout),
               },
            ),
         catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
      });

      if (response.ok) return;

      const details = yield* Effect.tryPromise({
         try: () => response.text(),
         catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
      }).pipe(Effect.catchAll(() => Effect.succeed("")));

      const suffix = details ? ` - ${details}` : "";
      return yield* Effect.fail(new Error(`HTTP ${response.status}${suffix}`));
   });
}

function purgeWithRetry(apiKey: string, url: string, attempts: number, requestTimeout: number) {
   return purgeOnce(apiKey, url, requestTimeout).pipe(Effect.retry(retryPolicy(attempts)));
}

export interface PurgeConfig {
   pullZoneUrl: string;
   apiKey: string;
   bunny_api_rate_limit: number;
   retryLimit: number;
   requestTimeout: number;
   purgeStrict: boolean;
}

export function purgeUrls(
   paths: Iterable<string>,
   config: PurgeConfig,
) {
   return Effect.gen(function* () {
      const unique = Array.from(
         new Set(
            Array.from(paths)
               .map((path) => path.trim())
               .filter((path) => path.length > 0),
         ),
      );

      const total = unique.length;
      if (total === 0) {
         return { total: 0, purged: 0, failed: [] };
      }

      const purgeProg = progress({
         style: "block",
         max: total,
      });
      purgeProg.start(`Purging ${total} files from bunny.net pull zone.`);

      const concurrency = config.bunny_api_rate_limit;
      const baseUrl = `${config.pullZoneUrl}/`;
      const apiKey = config.apiKey;
      const purgedRef = yield* Ref.make(0);
      const maybeFailures = yield* Effect.forEach(
         unique,
         (path) =>
            Effect.gen(function* () {
               const url = new URL(stripLeadingSlash(path), baseUrl).toString();
               const outcome = yield* Effect.either(purgeWithRetry(apiKey, url, config.retryLimit, config.requestTimeout));

               return yield* Either.match(outcome, {
                  onRight: () =>
                     Effect.gen(function* () {
                        yield* Ref.update(purgedRef, (n) => n + 1);
                        purgeProg.advance(1);
                        return undefined;
                     }),
                  onLeft: (error) =>
                     Effect.gen(function* () {
                        log.error(`Purge failed: ${url} (${error.message})`);
                        return {
                           url,
                           message: error.message,
                        } satisfies PurgeFailure;
                     }),
               });
            }),
         { concurrency },
      ).pipe(
         Effect.ensuring(
            Effect.gen(function* () {
               const purged = yield* Ref.get(purgedRef);
               purgeProg.stop(`Purged ${purged}/${total} files from bunny.net pull zone.`);
            }),
         ),
      );

      const failed = maybeFailures.filter((failure): failure is PurgeFailure => failure !== undefined);

      if (failed.length > 0 && config.purgeStrict) {
         return yield* Effect.fail(
            new Error(`Purge failed for ${failed.length} of ${total} URLs.`),
         );
      }

      return {
         total,
         purged: total - failed.length,
         failed,
      };
   });
}
