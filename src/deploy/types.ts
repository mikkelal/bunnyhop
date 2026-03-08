import type { LocalScanEntry, RemoteScanEntry } from "../scan/types.ts";

export interface DeployDiffResult {
   changed: LocalScanEntry[];
   unchanged: LocalScanEntry[];
   unknownRemote: RemoteScanEntry[];
}
