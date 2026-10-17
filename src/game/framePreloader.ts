import { MALE_ATTACK_CONFIG, getMaleAttackFramePath } from './maleFighterConfig';

class FramePreloader {
  private images: Map<number, HTMLImageElement> = new Map();
  private isLoaded = false;
  private isLoading = false;
  private loadProgress = 0;

  public async preloadAll(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) return;

    this.isLoading = true;
    const total = MALE_ATTACK_CONFIG.totalFrames;
    let loadedCount = 0;

    const loadSingleFrame = (frameNum: number): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = getMaleAttackFramePath(frameNum);
        img.onload = () => {
          this.images.set(frameNum, img);
          loadedCount++;
          this.loadProgress = Math.floor((loadedCount / total) * 100);
          resolve();
        };
        img.onerror = () => {
          // Fallback if network blip
          loadedCount++;
          this.loadProgress = Math.floor((loadedCount / total) * 100);
          resolve();
        };
      });
    };

    // Preload in batches of 16 concurrent requests for maximum throughput without choking
    const batchSize = 16;
    for (let i = 1; i <= total; i += batchSize) {
      const promises: Promise<void>[] = [];
      for (let j = i; j < i + batchSize && j <= total; j++) {
        promises.push(loadSingleFrame(j));
      }
      await Promise.all(promises);
    }

    this.isLoaded = true;
    this.isLoading = false;
    this.loadProgress = 100;
  }

  public getFrame(frameNum: number): HTMLImageElement | undefined {
    return this.images.get(frameNum);
  }

  public getLoadedState(): boolean {
    return this.isLoaded;
  }

  public getProgress(): number {
    return this.loadProgress;
  }
}

export const framePreloader = new FramePreloader();
