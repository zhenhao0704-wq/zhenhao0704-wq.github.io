import { spawnSync } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "img");
const smallDirectory = path.join(sourceDirectory, "thumbs", "400");
const largeDirectory = path.join(sourceDirectory, "thumbs", "1200");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
const supportedImage = /\.(?:jpe?g|png|webp)$/i;

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return result.stdout;
}

function readDimensions(source) {
  const output = run(ffprobe, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "json",
    source,
  ], `Could not inspect ${path.basename(source)}`);
  const stream = JSON.parse(output).streams?.[0];
  if (!stream?.width || !stream?.height) throw new Error(`Missing dimensions for ${source}`);
  return { width: stream.width, height: stream.height };
}

await Promise.all([
  mkdir(smallDirectory, { recursive: true }),
  mkdir(largeDirectory, { recursive: true }),
]);

const files = (await readdir(sourceDirectory))
  .filter((filename) => supportedImage.test(filename))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const stems = new Set();
const manifest = {};

for (const [index, filename] of files.entries()) {
  const stem = filename.replace(/\.[^.]+$/, "");
  if (stems.has(stem)) throw new Error(`Duplicate image stem: ${stem}`);
  stems.add(stem);

  const source = path.join(sourceDirectory, filename);
  const smallFilename = `${stem}.webp`;
  const largeFilename = `${stem}.webp`;
  const smallOutput = path.join(smallDirectory, smallFilename);
  const largeOutput = path.join(largeDirectory, largeFilename);
  const { width, height } = readDimensions(source);

  run(ffmpeg, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", source,
    "-filter_complex",
    "[0:v]split=2[small][large];[small]scale=w='min(400,iw)':h=-2:flags=lanczos[smallout];[large]scale=w='min(1200,iw)':h=-2:flags=lanczos[largeout]",
    "-map", "[smallout]", "-frames:v", "1", "-c:v", "libwebp", "-quality", "76", "-preset", "photo", smallOutput,
    "-map", "[largeout]", "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", "-preset", "photo", largeOutput,
  ], `Could not convert ${filename}`);

  manifest[filename] = {
    original: `img/${filename}`,
    small: `img/thumbs/400/${smallFilename}`,
    large: `img/thumbs/1200/${largeFilename}`,
    width,
    height,
  };

  if ((index + 1) % 50 === 0 || index === files.length - 1) {
    console.log(`Generated ${index + 1} of ${files.length} image derivatives.`);
  }
}

await writeFile(
  path.join(sourceDirectory, "image-derivatives.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
