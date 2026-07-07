/**
 * PerformanceMonitor — rolling FPS over the last ~60 frames + auto-degrade hook.
 *
 *  Usage:
 *    const mon = new PerformanceMonitor();
 *    mon.start();
 *    mon.onDegrade(() => reduceQuality());
 *    ...later
 *    mon.stop();
 */
export class PerformanceMonitor {
  private rafId = 0;
  private last  = 0;
  private samples: number[] = [];
  private degraded = false;
  private degradeCb?: () => void;
  /** dev-only — expose current fps for the HUD */
  fps = 60;

  start() {
    this.last = performance.now();
    const tick = (t: number) => {
      const dt = t - this.last;
      this.last = t;
      if (dt > 0 && dt < 1000) {
        const inst = 1000 / dt;
        this.samples.push(inst);
        if (this.samples.length > 60) this.samples.shift();
        // rolling avg
        const sum = this.samples.reduce((a, b) => a + b, 0);
        this.fps = sum / this.samples.length;
        // trigger degrade once if persistently below 30 fps
        if (!this.degraded && this.samples.length === 60 && this.fps < 30) {
          this.degraded = true;
          this.degradeCb?.();
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  onDegrade(cb: () => void) { this.degradeCb = cb; }
  stop() { cancelAnimationFrame(this.rafId); }
}
