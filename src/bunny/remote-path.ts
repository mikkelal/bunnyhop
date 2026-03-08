import type { StorageFile } from "@bunny.net/storage-sdk";
import { joinRemote, stripPrefix } from "../shared/path.ts";

export function getRemoteRelPath(remote: StorageFile, zoneName: string) {
   const zonePrefix = `/${zoneName}/`;
   const pathNoZone = stripPrefix(remote.path, zonePrefix);
   return joinRemote(pathNoZone, remote.objectName);
}
