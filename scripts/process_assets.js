import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const brainDir = 'C:/Users/hp/.gemini/antigravity-ide/brain/4fa4347b-ec96-43cb-9d5a-8422bedca799';
const publicDir = 'd:/skillfight 2/public/assets';

fs.mkdirSync(path.join(publicDir, 'backgrounds'), { recursive: true });
fs.mkdirSync(path.join(publicDir, 'characters'), { recursive: true });

// Backgrounds
const bgList = [
  { src: 'sky_arena_bg_1792254187940.jpg', dest: 'backgrounds/battle_arena.jpg' },
  { src: 'academy_sky_bg_1792254228709.jpg', dest: 'backgrounds/home_bg.jpg' }
];

for (const bg of bgList) {
  const srcPath = path.join(brainDir, bg.src);
  const destPath = path.join(publicDir, bg.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied background: ${bg.dest}`);
  } else {
    console.warn(`File not found: ${srcPath}`);
  }
}

// Flood fill algorithm to remove only external white background starting from corners/edges
async function removeExternalWhiteBackground(srcFile, destFile, tolerance = 20) {
  const srcPath = path.join(brainDir, srcFile);
  const destPath = path.join(publicDir, destFile);

  if (!fs.existsSync(srcPath)) {
    console.warn(`Not found: ${srcPath}`);
    return;
  }

  const image = sharp(srcPath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Get raw RGBA buffer
  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const isWhite = (x, y) => {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Color distance from pure white (255, 255, 255)
    return (255 - r <= tolerance && 255 - g <= tolerance && 255 - b <= tolerance);
  };

  const isNearWhite = (x, y) => {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return (255 - r <= tolerance + 25 && 255 - g <= tolerance + 25 && 255 - b <= tolerance + 25);
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  // Enqueue outer border pixels that are white
  for (let x = 0; x < width; x++) {
    if (isWhite(x, 0)) {
      visited[0 * width + x] = 1;
      queue[tail++] = 0 * width + x;
    }
    if (isWhite(x, height - 1)) {
      visited[(height - 1) * width + x] = 1;
      queue[tail++] = (height - 1) * width + x;
    }
  }
  for (let y = 0; y < height; y++) {
    if (!visited[y * width + 0] && isWhite(0, y)) {
      visited[y * width + 0] = 1;
      queue[tail++] = y * width + 0;
    }
    if (!visited[y * width + (width - 1)] && isWhite(width - 1, y)) {
      visited[y * width + (width - 1)] = 1;
      queue[tail++] = y * width + (width - 1);
    }
  }

  // BFS flood fill
  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    // Set pixel to fully transparent
    const idx = curr * 4;
    data[idx + 3] = 0;

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && isWhite(nx, ny)) {
          visited[nIdx] = 1;
          queue[tail++] = nIdx;
        }
      }
    }
  }

  // Second pass: soft alpha feathering on boundary for smooth anti-aliased edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      // If this pixel is not transparent, but is adjacent to a transparent pixel and is near-white
      if (data[idx + 3] > 0 && isNearWhite(x, y)) {
        const hasTransparentNeighbor =
          data[((y - 1) * width + x) * 4 + 3] === 0 ||
          data[((y + 1) * width + x) * 4 + 3] === 0 ||
          data[(y * width + (x - 1)) * 4 + 3] === 0 ||
          data[(y * width + (x + 1)) * 4 + 3] === 0;

        if (hasTransparentNeighbor) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;
          if (brightness > 235) {
            data[idx + 3] = Math.max(0, Math.min(255, Math.floor((255 - brightness) * 8)));
          }
        }
      }
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png({ compressionLevel: 8 })
    .toFile(destPath);

  console.log(`Processed transparent character sprite: ${destFile}`);
}

async function processAll() {
  const characters = [
    { src: 'blue_fighter_idle_1792254343659.jpg', dest: 'characters/p1_idle.png', tol: 22 },
    { src: 'blue_fighter_attack_1792254442354.jpg', dest: 'characters/p1_attack.png', tol: 22 },
    { src: 'blue_fighter_hit_1792254501949.jpg', dest: 'characters/p1_hit.png', tol: 22 },
    { src: 'blue_fighter_victory_1792254584363.jpg', dest: 'characters/p1_victory.png', tol: 22 },
    { src: 'blue_fighter_portrait_1792254652726.jpg', dest: 'characters/p1_portrait.png', tol: 20 },

    { src: 'pink_fighter_idle_1792254720147.jpg', dest: 'characters/p2_idle.png', tol: 22 },
    { src: 'pink_fighter_attack_1792254774795.jpg', dest: 'characters/p2_attack.png', tol: 22 },
    { src: 'pink_fighter_hit_1792254828274.jpg', dest: 'characters/p2_hit.png', tol: 22 },
    { src: 'pink_fighter_victory_1792254905521.jpg', dest: 'characters/p2_victory.png', tol: 22 },
    { src: 'pink_fighter_portrait_1792254975443.jpg', dest: 'characters/p2_portrait.png', tol: 20 },
  ];

  for (const c of characters) {
    await removeExternalWhiteBackground(c.src, c.dest, c.tol);
  }

  console.log('All character sprites and backgrounds successfully processed!');
}

processAll().catch(err => {
  console.error('Processing error:', err);
  process.exit(1);
});
