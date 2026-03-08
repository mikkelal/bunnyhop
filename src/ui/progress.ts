import { log, progress as clackProgress } from "@clack/prompts";
import type { ProgressOptions, ProgressResult } from "@clack/prompts";
import { isInteractiveUi } from "./runtime.ts";

export type { ProgressOptions, ProgressResult } from "@clack/prompts";

export class Progress implements ProgressResult {
   private readonly inner: ProgressResult | null;
   private readonly interactive: boolean;

   constructor(options?: ProgressOptions) {
      this.interactive = isInteractiveUi();
      this.inner = this.interactive ? clackProgress(options) : null;
   }

   start(msg?: string) {
      if (!this.interactive) {
         if (msg !== undefined) log.info(msg);
         return;
      }
      this.inner!.start(msg);
   }

   stop(msg?: string) {
      if (!this.interactive) {
         if (msg !== undefined) log.info(msg);
         return;
      }
      this.inner!.stop(msg);
   }

   cancel(msg?: string) {
      if (!this.interactive) {
         if (msg !== undefined) log.info(msg);
         return;
      }
      this.inner!.cancel(msg);
   }

   error(msg?: string) {
      if (!this.interactive) {
         if (msg !== undefined) log.error(msg);
         return;
      }
      this.inner!.error(msg);
   }

   message(msg?: string) {
      if (!this.interactive) {
         if (msg !== undefined) log.info(msg);
         return;
      }
      this.inner!.message(msg);
   }

   clear() {
      if (!this.interactive) return;
      this.inner!.clear();
   }

   advance(step?: number, msg?: string) {
      if (!this.interactive) return;
      this.inner!.advance(step, msg);
   }

   get isCancelled() {
      if (!this.interactive) return false;
      return this.inner!.isCancelled;
   }
}

export const progress: typeof clackProgress = (options) => new Progress(options);
