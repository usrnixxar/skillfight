import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function analyze() {
  const dir = 'Male_Fighter_PNG_Frames';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();

  console.log(`Analyzing ${files.length} frames...`);

  // Let's sample every few frames and calculate:
  // 1. Non-transparent bounding box (top, bottom, left, right)
  // 2. Average brightness, peak brightness
  // 3. Rightmost reach (when arm/weapon extends to the right)
  // 4. Blue/cyan pixels or high brightness flash (muzzle flash / energy)
  
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const frameNum = i + 1;
    const { data, info } = await sharp(path.join(dir, file))
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    let nonTransparentCount = 0;
    let totalBrightness = 0;
    let highBrightCount = 0;
    let cyanBlueCount = 0;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const a = data[idx + 3];
        if (a > 20) {
          nonTransparentCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const bright = (r + g + b) / 3;
          totalBrightness += bright;

          if (bright > 220) highBrightCount++;
          // Cyan / bright blue
          if (b > 180 && g > 140 && r < 160) cyanBlueCount++;
        }
      }
    }

    results.push({
      frameNum,
      file,
      width: maxX - minX,
      height: maxY - minY,
      minX,
      maxX,
      minY,
      maxY,
      avgBright: nonTransparentCount > 0 ? totalBrightness / nonTransparentCount : 0,
      highBrightCount,
      cyanBlueCount,
      nonTransparentCount
    });
  }

  // Find frames with significant state changes
  console.log('\n--- KEY TRANSITIONS ---');
  // Rightmost reach
  let maxRight = 0;
  let maxRightFrame = 0;
  for (const r of results) {
    if (r.maxX > maxRight) {
      maxRight = r.maxX;
      maxRightFrame = r.frameNum;
    }
  }
  console.log(`Maximum rightward extension at frame ${maxRightFrame} (maxX = ${maxRight})`);

  // Max high brightness (flash)
  let maxFlash = 0;
  let maxFlashFrame = 0;
  for (const r of results) {
    if (r.highBrightCount > maxFlash) {
      maxFlash = r.highBrightCount;
      maxFlashFrame = r.frameNum;
    }
  }
  console.log(`Peak high brightness / flash at frame ${maxFlashFrame} (${maxFlash} bright pixels)`);

  // Max cyan/blue energy
  let maxEnergy = 0;
  let maxEnergyFrame = 0;
  for (const r of results) {
    if (r.cyanBlueCount > maxEnergy) {
      maxEnergy = r.cyanBlueCount;
      maxEnergyFrame = r.frameNum;
    }
  }
  console.log(`Peak blue/cyan energy at frame ${maxEnergyFrame} (${maxEnergy} pixels)`);

  // Print intervals of interest
  console.log('\n--- SAMPLING ACROSS PROPOSED TIMELINE ---');
  const samples = [1, 10, 24, 25, 40, 60, 61, 80, 96, 97, 120, 137, 144, 145, 148, 150, 151, 152, 153, 154, 155, 160, 170, 180, 181, 200, 220, 240];
  for (const s of samples) {
    const r = results[s - 1];
    if (r) {
      console.log(`Frame ${r.frameNum.toString().padStart(3, '0')}: maxX=${r.maxX}, width=${r.width}, bright=${r.avgBright.toFixed(1)}, highBright=${r.highBrightCount}, cyanBlue=${r.cyanBlueCount}`);
    }
  }
}

analyze().catch(console.error);
