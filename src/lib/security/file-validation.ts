import "server-only";
import sharp from "sharp";

export const allowed = new Map([["image/jpeg", ["jpg", "jpeg"]], ["image/png", ["png"]], ["image/webp", ["webp"]], ["application/pdf", ["pdf"]], ["text/plain", ["txt"]], ["application/zip", ["zip"]]]);
export function extension(name: string) { const ext = name.toLowerCase().split(".").pop() ?? ""; return ext; }
export async function validateFile(bytes: Uint8Array, name: string, declaredMime: string, maxSize: number) {
  if (bytes.byteLength > maxSize) throw new Error("FILE_TOO_LARGE");
  const ext = extension(name);
  if (!allowed.has(declaredMime) || !allowed.get(declaredMime)?.includes(ext)) throw new Error("FILE_TYPE_NOT_ALLOWED");
  if (["image/jpeg", "image/png", "image/webp"].includes(declaredMime)) {
    try { const meta = await sharp(bytes).metadata(); if (!meta.format) throw new Error("INVALID_IMAGE"); } catch { throw new Error("INVALID_IMAGE"); }
  } else if (declaredMime === "application/pdf" && !(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new Error("INVALID_PDF");
  return { ext };
}
