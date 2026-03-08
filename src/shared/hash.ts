import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { Effect } from "effect";
import { Buffer } from "node:buffer";

export function sha256File(filePath: string) {
   return Effect.tryPromise({
      try: () =>
         new Promise<string>((resolve, reject) => {
            const hash = createHash("sha256");
            const stream = createReadStream(filePath);

            stream.on("data", (data: string | Buffer) => {
               if (typeof data === "string") {
                  hash.update(data);
                  return;
               }

               hash.update(new Uint8Array(data));
            });

            stream.on("end", () => {
               resolve(hash.digest("hex"));
            });

            stream.on("error", (cause) => {
               reject(cause instanceof Error ? cause : new Error(String(cause)));
            });
         }),
      catch: (cause) => cause instanceof Error ? cause : new Error(String(cause)),
   });
}
