const lookup: Record<string, string> = {
   ".html": "text/html",
   ".css": "text/css",
   ".js": "application/javascript",
   ".mjs": "application/javascript",
   ".json": "application/json",
   ".png": "image/png",
   ".jpg": "image/jpeg",
   ".jpeg": "image/jpeg",
   ".gif": "image/gif",
   ".svg": "image/svg+xml",
   ".webp": "image/webp",
   ".woff": "font/woff",
   ".woff2": "font/woff2",
   ".xml": "application/xml",
   ".txt": "text/plain",
   ".map": "application/json",
};

export function getContentType(path: string) {
   const lower = path.toLowerCase();
   const idx = lower.lastIndexOf(".");
   if (idx === -1) return "application/octet-stream";
   const ext = lower.slice(idx);
   return lookup[ext] ?? "application/octet-stream";
}
