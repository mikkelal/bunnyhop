import process from "node:process";
import { updateSettings } from "@clack/prompts";

function resolveInteractiveUi(ci: boolean): boolean {
   return !ci && !!process.stdout.isTTY;
}

let interactiveUi = resolveInteractiveUi(false);

export function configureUi(ci: boolean): boolean {
   interactiveUi = resolveInteractiveUi(ci);
   updateSettings({
      withGuide: interactiveUi,
   });
   return interactiveUi;
}

export function isInteractiveUi(): boolean {
   return interactiveUi;
}
