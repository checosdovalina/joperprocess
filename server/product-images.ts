export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const signatures: Record<string, (data: Buffer) => boolean> = {
  "image/jpeg": data => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  "image/png": data =>
    data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": data =>
    data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP",
  "image/gif": data =>
    data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.toString("ascii", 0, 6)),
};

export function getProductImageExtension(buffer: Buffer, declaredContentType: string): string | null {
  const extension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extension[declaredContentType] && signatures[declaredContentType](buffer)
    ? extension[declaredContentType]
    : null;
}