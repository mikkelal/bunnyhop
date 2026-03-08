import * as Bunny from "@bunny.net/storage-sdk";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { Duration, Effect } from "effect";
import { ensureLeadingSlash } from "../shared/path.ts";
import { retryPolicy } from "../shared/retry.ts";

export type RegionCode = `${Bunny.regions.StorageRegion}`;

export const regionValues: RegionCode[] = Object.values(Bunny.regions.StorageRegion);

export function connectZone(
   region: RegionCode,
   zoneName: string,
   accessKey: string,
) {
   return Bunny.zone.connect_with_accesskey(
      region as Bunny.regions.StorageRegion,
      zoneName,
      accessKey,
   );
}

export function listDirectory(
   storageZone: Bunny.zone.StorageZone,
   path: string,
   requestTimeout?: number,
) {
   const effect = Effect.tryPromise({
      try: () => Bunny.file.list(storageZone, ensureLeadingSlash(path)),
      catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
   });

   if (!requestTimeout) return effect;

   return Effect.timeoutFail(effect, {
      duration: Duration.millis(requestTimeout),
      onTimeout: () => new Error(`listDirectory timed out after ${requestTimeout}ms`),
   });
}

export function uploadFile(
   storageZone: Bunny.zone.StorageZone,
   remotePath: string,
   localPath: string,
   sha256: string,
   contentType: string,
   retries = 3,
   requestTimeout?: number,
) {
   const effect = Effect.tryPromise({
      try: () =>
         Bunny.file.upload(
            storageZone,
            ensureLeadingSlash(remotePath),
            Readable.toWeb(createReadStream(localPath)),
            {
               sha256Checksum: sha256,
               contentType,
            },
         ),
      catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
   });

   const withTimeout = requestTimeout
      ? Effect.timeoutFail(effect, {
         duration: Duration.millis(requestTimeout),
         onTimeout: () => new Error(`uploadFile timed out after ${requestTimeout}ms`),
      })
      : effect;

   return Effect.retry(withTimeout, retryPolicy(retries));
}

export function deleteFile(
   storageZone: Bunny.zone.StorageZone,
   remotePath: string,
   retries = 3,
   requestTimeout?: number,
) {
   const effect = Effect.tryPromise({
      try: () => Bunny.file.remove(storageZone, ensureLeadingSlash(remotePath)),
      catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
   });

   const withTimeout = requestTimeout
      ? Effect.timeoutFail(effect, {
         duration: Duration.millis(requestTimeout),
         onTimeout: () => new Error(`deleteFile timed out after ${requestTimeout}ms`),
      })
      : effect;

   return Effect.retry(withTimeout, retryPolicy(retries));
}
