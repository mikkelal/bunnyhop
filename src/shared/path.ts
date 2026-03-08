import { sep } from "node:path";
import { join as posixJoin, sep as posixSep } from "node:path/posix";

export function toPosixPath(value: string) {
   return value.split(sep).join(posixSep);
}

export function joinRemote(...parts: string[]) {
   const cleaned = parts.filter(Boolean).map((part) => part.replace(/\/+$/, ""));

   return posixJoin(...cleaned);
}

export function ensureLeadingSlash(value: string) {
   return value.startsWith("/") ? value : `/${value}`;
}

export function stripLeadingSlash(value: string) {
   return value.startsWith("/") ? value.slice(1) : value;
}

export function stripPrefix(value: string, prefix: string) {
   return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
