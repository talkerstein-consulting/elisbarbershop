// Downloads all remote site media into public/media/ so the site is fully self-hosted.
// Run:  npm run fetch:media   (needs internet access to elisbarbershop.com)
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "media");
const BASE = "https://elisbarbershop.com/wp-content/uploads/2024/11/";
const FILES = [
  "eli-logo-white.png",
  "eli-favicon-300x300.png",
  "Icon-2.png",
  "Icon-3.png",
  "Icon-4.png",
];

await mkdir(OUT, { recursive: true });
let ok = 0, fail = 0;
for (const f of FILES) {
  try {
    const res = await fetch(BASE + encodeURIComponent(f));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(OUT, f), buf);
    console.log("✓", f, "(" + (buf.length / 1024).toFixed(0) + " KB)");
    ok++;
  } catch (e) {
    console.error("✗", f, "-", e.message);
    fail++;
  }
}
console.log(`\nDone: ${ok} downloaded, ${fail} failed -> public/media/`);
if (fail) process.exitCode = 1;
