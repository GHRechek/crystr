/** A picture, made small enough for a phone screen before it goes up: the long side capped (1600px, plenty for
 *  a feed card at twice density), re-saved as a JPEG. Photos off a camera are 2–3 MB; this brings them to a few
 *  hundred KB, so the feed loads in a blink instead of a minute. Anything already small, a GIF (it would lose its
 *  motion) or a picture the browser cannot decode (HEIC outside Safari) goes up as it is. */
export async function shrink(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (file.type === "image/gif" || file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg" && file.size < 900 * 1024) { bitmap.close(); return file; }
    const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    // A PNG with transparency (a drawing) stays a PNG; everything else becomes a JPEG.
    const keepPng = file.type === "image/png" && hasAlpha(ctx, w, h);
    const type = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, keepPng ? undefined : quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[a-z0-9]+$/i, "") + (keepPng ? ".png" : ".jpg");
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  // Sample a grid of pixels: enough to catch a transparent background without reading the whole picture.
  const step = Math.max(1, Math.floor(Math.min(w, h) / 24));
  for (let y = 0; y < h; y += step) {
    const row = ctx.getImageData(0, y, w, 1).data;
    for (let x = 3; x < row.length; x += 4 * step) if (row[x] < 250) return true;
  }
  return false;
}
