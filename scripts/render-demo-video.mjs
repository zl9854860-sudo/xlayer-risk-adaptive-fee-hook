import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "docs", "submission", "demo-video-assets");
const textDir = path.join(outputDir, "text");
const svgDir = path.join(outputDir, "svg");
const imageDir = path.join(outputDir, "images");
const audioDir = path.join(outputDir, "audio");
const videoDir = path.join(outputDir, "segments");
const finalVideo = path.join(repoRoot, "docs", "submission", "risk-adaptive-fee-hook-demo.mp4");

const voice = process.env.SAY_VOICE || "Alex";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "inherit",
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    throw new Error(`${command} failed with exit code ${result.status}${stderr}`);
  }

  return result;
}

function capture(command, args, options = {}) {
  const result = run(command, args, {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.stdout.trim();
}

function ensureCommand(command) {
  capture("which", [command]);
}

function wrapWords(text, width = 66) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = word;
      continue;
    }
    if (`${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line += ` ${word}`;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function bodyText(lines) {
  const rendered = [];

  const wrapLongToken = (token, width = 46) => {
    const chunks = [];
    for (let offset = 0; offset < token.length; offset += width) {
      const chunk = token.slice(offset, offset + width);
      chunks.push(offset === 0 ? chunk : `  ${chunk}`);
    }
    return chunks;
  };

  for (const line of lines) {
    if (line === "") {
      rendered.push("");
      continue;
    }
    if (line.startsWith("0x") || line.startsWith("https://")) {
      rendered.push(...wrapLongToken(line));
      continue;
    }
    if (line.endsWith(":")) {
      rendered.push(line);
      continue;
    }

    const bullet = line.startsWith("- ") ? line.slice(2) : line;
    const wrapped = wrapWords(bullet, 50);
    rendered.push(`- ${wrapped[0]}`);
    for (const extra of wrapped.slice(1)) rendered.push(`  ${extra}`);
  }

  return rendered.join("\n");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgText(lines, { x, y, size, color, weight = 400, lineHeight = 1.3 }) {
  return lines
    .map((line, index) => {
      const lineY = y + index * size * lineHeight;
      return `<text x="${x}" y="${lineY}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-weight="${weight}" font-size="${size}">${escapeHtml(line)}</text>`;
    })
    .join("\n");
}

function renderSvg(slide, bodyLines) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#0b1117"/>
  <rect x="0" y="0" width="1920" height="12" fill="#38bdf8"/>
  <rect x="90" y="245" width="1740" height="642" rx="18" fill="#101a24" opacity="0.96"/>
  <rect x="90" y="245" width="8" height="642" fill="#22c55e"/>
  <circle cx="1700" cy="130" r="84" fill="#122437"/>
  <circle cx="1780" cy="210" r="44" fill="#14351f"/>
  ${svgText([slide.title], { x: 110, y: 140, size: 66, color: "#f8fafc", weight: 700 })}
  ${svgText([slide.accent], { x: 112, y: 205, size: 34, color: "#7dd3fc" })}
  ${svgText(bodyLines, { x: 138, y: 302, size: 30, color: "#e5edf5", lineHeight: 1.5 })}
  ${svgText(["Built for Build X Hackathon / X Layer / Uniswap v4"], { x: 110, y: 1002, size: 28, color: "#94a3b8" })}
</svg>
`;
}

const slides = [
  {
    title: "Risk Adaptive Fee Hook",
    accent: "A Uniswap v4 Hook for X Layer launch markets",
    body: [
      "Static fee pools underpay LPs when risk spikes.",
      "New assets can shift from calm trading to volatile trading in minutes.",
      "Goal: keep normal swaps cheap, then charge more when pool risk is high.",
    ],
    narration:
      "Introducing Risk Adaptive Fee Hook for Build X. Meme and newly launched asset pools can move from calm trading into high risk volatility very quickly. Static fees do not respond to that shift, so LPs may be underpaid exactly when risk is highest.",
  },
  {
    title: "Product",
    accent: "Risk score to dynamic LP fee",
    body: [
      "Uniswap v4 Hook deployed on X Layer mainnet.",
      "Each pool has a risk score from 0 to 10000.",
      "The Hook maps that score into a dynamic LP fee before each swap.",
      "",
      "Hook:",
      "0xB31113726d8dCc12B3650Ab00c623e153c37d080",
    ],
    narration:
      "The product is a Uniswap v4 Hook deployed on X Layer mainnet. It stores a risk score for each pool and converts that score into a dynamic swap fee. Low risk trading stays cheap. High risk trading raises the fee so LPs receive more compensation.",
  },
  {
    title: "Hook Mechanism",
    accent: "afterInitialize plus beforeSwap",
    body: [
      "afterInitialize requires a dynamic-fee v4 pool.",
      "beforeSwap returns the LP fee override.",
      "Trusted updater sets the demo risk score.",
      "Future risk agents can use volatility, social, and trading signals.",
      "",
      "Permission mask: 0x1080",
      "Pool ID:",
      "0x9d21001d22fb3b0532133769302b7a7754e72b771c47dcc4a38bbdc41192a022",
    ],
    narration:
      "The Hook uses after initialize to require a dynamic fee v4 pool. Then before swap returns the LP fee override. In this demo, a trusted updater sets the risk score. A later version can compute the score with an off chain agent using volatility, social, and trading signals.",
  },
  {
    title: "X Layer Chain Proof",
    accent: "Deployed and initialized on mainnet",
    body: [
      "Chain ID: 196",
      "PoolManager: 0x360e68faccca8ca495c1b759fd9eee466db9fb32",
      "",
      "Hook deploy tx:",
      "0x57abac64b02ce92db9e7bf7d50fbec2acaae6332b46a2973168d82ea301a3469",
      "Pool initialize tx:",
      "0x9910aae4550f36173bc5d8624988b9c0ad133e5aa1d47d4bf95ea9e4645ecab3",
    ],
    narration:
      "The chain proof is public on X Layer mainnet. The Hook was deployed with the required v4 permission bits, and a dynamic fee pool was initialized with this Hook. The PoolManager address, deploy transaction, and pool initialization transaction are all included in the repository.",
  },
  {
    title: "Real Swap Proof",
    accent: "PoolManager emitted the risk-adjusted fee",
    body: [
      "Risk update tx:",
      "0x11c40fb54dd77765572a0730d5488c44ddb6ecddb3c9e67ac7c3f157b3a3ddaa",
      "Hook quoted fee after update: 6500",
      "",
      "Real swap tx:",
      "0x5303a1d0b73d6d3c9835caf2dab994e9c4c1475e9c37b4815440713003497650",
      "PoolManager Swap event emitted fee: 6500",
    ],
    narration:
      "The behavior is not only deployed, it was triggered by a real swap. After the risk update, the Hook quoted fee was 6500. The real swap transaction emitted a PoolManager Swap event with fee 6500, matching the Hook's risk adjusted quote.",
  },
  {
    title: "Why It Matters",
    accent: "A reusable primitive for launch markets",
    body: [
      "Normal conditions: cheap trading.",
      "High-risk conditions: LPs receive higher compensation.",
      "The mechanism is transparent, chain-verifiable, and extensible.",
      "",
      "GitHub:",
      "https://github.com/zl9854860-sudo/xlayer-risk-adaptive-fee-hook",
      "X post:",
      "https://x.com/lizh1813648/status/2059286447186985422?s=20",
    ],
    narration:
      "Risk Adaptive Fee Hook turns a static fee curve into a risk aware market primitive for Uniswap v4 on X Layer. Normal conditions keep trading efficient. High risk conditions compensate LPs more. The mechanism is transparent, chain verifiable, and easy to extend with richer risk models.",
  },
];

ensureCommand("ffmpeg");
ensureCommand("ffprobe");
ensureCommand("qlmanage");
ensureCommand("say");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(textDir, { recursive: true });
mkdirSync(svgDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });
mkdirSync(audioDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });

const segmentFiles = [];

for (const [index, slide] of slides.entries()) {
  const number = String(index + 1).padStart(2, "0");
  const titleFile = path.join(textDir, `slide-${number}-title.txt`);
  const accentFile = path.join(textDir, `slide-${number}-accent.txt`);
  const bodyFile = path.join(textDir, `slide-${number}-body.txt`);
  const narrationFile = path.join(textDir, `slide-${number}-narration.txt`);
  const svgFile = path.join(svgDir, `slide-${number}.svg`);
  const pngFile = path.join(imageDir, `slide-${number}.svg.png`);
  const audioFile = path.join(audioDir, `slide-${number}.aiff`);
  const rawVideoFile = path.join(videoDir, `slide-${number}-raw.mp4`);
  const segmentFile = path.join(videoDir, `slide-${number}.mp4`);

  const renderedBody = bodyText(slide.body);
  writeFileSync(titleFile, slide.title);
  writeFileSync(accentFile, slide.accent);
  writeFileSync(bodyFile, renderedBody);
  writeFileSync(narrationFile, slide.narration);
  writeFileSync(svgFile, renderSvg(slide, renderedBody.split("\n")));

  run("say", ["-v", voice, "-r", "178", "-f", narrationFile, "-o", audioFile]);
  run("qlmanage", ["-t", "-s", "1920", "-o", imageDir, svgFile], { stdio: "ignore" });

  const audioDuration = Number(
    capture("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioFile,
    ]),
  );
  const duration = Math.max(10, audioDuration + 1.2).toFixed(2);

  run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "30",
    "-t",
    duration,
    "-i",
    pngFile,
    "-vf",
    "scale=1920:1080,format=yuv420p",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    rawVideoFile,
  ]);

  run("ffmpeg", [
    "-y",
    "-i",
    rawVideoFile,
    "-i",
    audioFile,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-af",
    "apad=pad_dur=1.0",
    "-t",
    duration,
    segmentFile,
  ]);

  segmentFiles.push(segmentFile);
}

const concatFile = path.join(outputDir, "concat.txt");
writeFileSync(
  concatFile,
  segmentFiles
    .map((file) => `file '${path.relative(outputDir, file).replaceAll("'", "'\\''")}'`)
    .join("\n"),
);

run("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatFile,
  "-c",
  "copy",
  "-movflags",
  "+faststart",
  finalVideo,
], { cwd: outputDir });

const finalDuration = capture("ffprobe", [
  "-v",
  "error",
  "-show_entries",
  "format=duration",
  "-of",
  "default=noprint_wrappers=1:nokey=1",
  finalVideo,
]);

console.log(`Demo video written: ${finalVideo}`);
console.log(`Duration: ${Number(finalDuration).toFixed(1)} seconds`);
