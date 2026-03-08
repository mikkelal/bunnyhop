import type { LocalScanEntry, RemoteScanEntry } from "../scan/types.ts";
import type { DeployDiffResult } from "./types.ts";

export function diffLocalRemote(
   localEntries: Map<string, LocalScanEntry>,
   remoteEntries: Map<string, RemoteScanEntry>,
): DeployDiffResult {
   const changed: LocalScanEntry[] = [];
   const unchanged: LocalScanEntry[] = [];

   for (const [relPath, local] of localEntries) {
      const remote = remoteEntries.get(relPath);
      if (!remote) {
         changed.push(local);
         continue;
      }

      const remoteChecksum = remote.checksum?.toLowerCase();
      if (remoteChecksum && remoteChecksum === local.checksum.toLowerCase()) {
         unchanged.push(local);
         continue;
      }

      changed.push(local);
   }

   const unknownRemote: RemoteScanEntry[] = [];
   for (const [relPath, remote] of remoteEntries) {
      if (!localEntries.has(relPath)) unknownRemote.push(remote);
   }

   return { changed, unchanged, unknownRemote };
}
