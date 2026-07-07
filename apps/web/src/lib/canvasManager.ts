/**
 * CanvasManager — hi-DPI canvas setup + draw helpers tuned for frame sequences.
 *
 *  - Auto resizes to its container with `devicePixelRatio` capped at 2 (perf).
 *  - `drawCover(img)` paints an image with object-fit: cover semantics.
 *  - Idempotent: safe to call resize / draw repeatedly.
 */
export class CanvasManager {
  readonly canvas: HTMLCanvasElement;
  readonly ctx:    CanvasRenderingContext2D;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  private ro?: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) throw new Error('Canvas2D not supported in this browser');
    this.ctx = ctx;
  }

  /** Bind to a container and resize when it changes. */
  attach(container: HTMLElement): () => void {
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      this.canvas.style.width  = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width  = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };
    resize();
    this.ro = new ResizeObserver(resize);
    this.ro.observe(container);
    return () => this.ro?.disconnect();
  }

  clear() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width / this.dpr, height / this.dpr);
  }

  /** Draw image at the canvas size using object-fit: cover semantics. */
  drawCover(img: HTMLImageElement) {
    const cw = this.canvas.width  / this.dpr;
    const ch = this.canvas.height / this.dpr;
    const iw = img.naturalWidth  || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const r = Math.max(cw / iw, ch / ih);
    const w = iw * r;
    const h = ih * r;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, x, y, w, h);
  }
}
