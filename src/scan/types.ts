export interface ScanEntryBase {
   relPath: string;
   checksum?: string;
}

export interface LocalScanEntry extends ScanEntryBase {
   source: "local";
   absPath: string;
   checksum: string;
}

export interface RemoteScanEntry extends ScanEntryBase {
   source: "remote";
}

export type ScanEntry = LocalScanEntry | RemoteScanEntry;

export interface ScanSnapshot<TEntry extends ScanEntry = ScanEntry> {
   entries: Map<string, TEntry>;
   total: number;
   scanned: number;
}
