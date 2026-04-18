/**
 * Flattens transparency to white, removes near-white gray backgrounds,
 * center-crops to 1:1, exports icon sizes for app/ and public/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontRoot = path.join(__dirname, "..");

const INPUT = path.join(frontRoot, "app", "icon.png");

/** Unify very light gray / off-white pixels to pure #FFFFFF (background only). */
function whitenLightGrayBackground(buf, width, height, channels) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = buf[i];
      const g = buf[i + 1];
      const b = buf[i + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      const delta = maxC - minC;
      // Near-neutral light grays (circle / shadow on white)
      if (minC > 228 && delta < 28) {
        buf[i] = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
      }
    }
  }
}

async function pipelineFromInputBuffer(inputBuf) {
  const flattened = await sharp(inputBuf)
    .ensureAlpha()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  const meta = await sharp(flattened).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const size = Math.min(w, h);
  const left = Math.floor((w - size) / 2);
  const top = Math.floor((h - size) / 2);

  const cropped = await sharp(flattened)
    .extract({ left, top, width: size, height: size })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = cropped;
  const ch = info.channels;
  whitenLightGrayBackground(data, info.width, info.height, ch);

  const cleaned = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: ch,
    },
  })
    .png()
    .toBuffer();

  return cleaned;
}

async function resizePng(squareBuf, px) {
  return sharp(squareBuf)
    .resize(px, px, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const inputBuf = fs.readFileSync(INPUT);

  const squareMaster = await pipelineFromInputBuffer(inputBuf);

  const png512 = await resizePng(squareMaster, 512);
  const png180 = await resizePng(squareMaster, 180);
  const png48 = await resizePng(squareMaster, 48);
  const png32 = await resizePng(squareMaster, 32);
  const png16 = await resizePng(squareMaster, 16);

  const appDir = path.join(frontRoot, "app");
  const publicDir = path.join(frontRoot, "public");

  fs.writeFileSync(path.join(appDir, "icon.png"), png512);
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), png180);

  const icoBuf = await pngToIco([png16, png32, png48]);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuf);

  // Keep public/ in sync with layout.tsx (served URLs)
  fs.writeFileSync(path.join(publicDir, "icon.png"), png512);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), png180);
  fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), png16);
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), png32);
  fs.writeFileSync(path.join(publicDir, "favicon-48x48.png"), png48);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuf);

  console.log("Icons written: app/icon.png, app/apple-icon.png, app/favicon.ico + public/*");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
