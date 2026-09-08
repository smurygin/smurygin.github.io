import { watchPalette } from './watch-palette.mjs';
import { InkFlow } from './fluid/ink.mjs';

const controllers = new WeakMap();
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const COLORS = ['#243a1f', '#344b27', '#91a55f', '#b7c77d'];
const GLYPHS = '.,:;+=xX#@';
const BLOCKED = 'button,a,input,select,textarea,dialog,[data-foreground]';

/** A distributed source for the same ink solver, rather than a second animation. */
export function feedBackdrop(field, dt, time = 0, seed = false) {
  const w = field.width, h = field.height;
  const phase = time * .085;
  for (let y = 1; y < h - 1; y++) {
    const ny = y / (h - 1);
    for (let x = 1; x < w - 1; x++) {
      const nx = x / (w - 1), i = x + y * w;
      const ribbon = Math.sin(nx * 9.1 + Math.sin(ny * 7.3 + phase) * 1.8 - phase)
        + .62 * Math.cos(ny * 10.4 - nx * 4.2 + phase * 1.3);
      const target = (.035 + .54 * smooth((ribbon + .5) / 1.65)) * (.78 + nx * .18 + ny * .15);
      const a = nx * Math.PI * 2 + phase, b = ny * Math.PI * 2 - phase * .8;
      const u = (Math.sin(a) * Math.cos(b) * 10 + Math.cos(ny * 8.5 + phase) * 4) * w / 128;
      const v = (-Math.cos(a) * Math.sin(b) * 10 + Math.sin(nx * 8.5 - phase) * 4) * h / 80;
      if (seed) {
        field.density[i] = Math.max(field.density[i] * .75, target);
        field.u[i] += u;
        field.v[i] += v;
      } else {
        // Replenish the broad field as the solver advects and dissipates its dye.
        field.density[i] = clamp(field.density[i] + (target - field.density[i]) * dt * .72, 0, 1.65);
        field.u[i] += (u - field.u[i]) * dt * .28;
        field.v[i] += (v - field.v[i]) * dt * .28;
      }
    }
  }
}

export function mountBackground(canvas, options = {}) {
  if (controllers.has(canvas)) return controllers.get(canvas);
  if (!canvas.isConnected) return;
  const controller = new BackgroundArt(canvas, options);
  controllers.set(canvas, controller);
  return controller;
}

class BackgroundArt {
  constructor(canvas, { quietElement, quietElements = [], paused = () => false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.quietElement = typeof quietElement === 'string' ? document.querySelector(quietElement) : quietElement;
    this.extraQuietElements = quietElements.map(element => typeof element === 'string' ? document.querySelector(element) : element).filter(Boolean);
    this.paused = paused;
    this.disposed = false;
    this.dirty = true;
    this.time = 0;
    this.last = 0;
    this.pointer = { x: .5, y: .5, dx: 0, dy: 0, down: false, inside: false };
    this.abort = new AbortController();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.atlas = document.createElement('canvas');
    this.atlas.width = GLYPHS.length * 8;
    this.atlas.height = 30;
    const options = { signal: this.abort.signal, passive: true };
    const blocked = event => event.target instanceof Element && !!event.target.closest(BLOCKED);
    const move = event => {
      if (blocked(event) || this.isPaused()) { this.release(); return; }
      const x = clamp(event.clientX / this.width), y = clamp(event.clientY / this.height);
      if (this.pointer.inside) {
        this.pointer.dx = clamp(this.pointer.dx + x - this.pointer.x, -.08, .08);
        this.pointer.dy = clamp(this.pointer.dy + y - this.pointer.y, -.08, .08);
      }
      this.pointer.x = x; this.pointer.y = y; this.pointer.inside = true;
    };
    document.addEventListener('pointermove', move, options);
    document.addEventListener('pointerdown', event => {
      if (event.button !== 0 || blocked(event) || this.isPaused()) return;
      move(event);
      this.pointer.down = true;
    }, options);
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(name, () => this.release(), options);
    window.addEventListener('blur', () => this.release(), options);
    document.addEventListener('visibilitychange', () => {
      this.release();
      this.last = 0;
      this.dirty = true;
      this.canvas.dataset.motion = this.isPaused() ? 'paused' : 'running';
    }, options);
    this.reduced.addEventListener('change', () => {
      this.release(); this.last = 0; this.dirty = true;
    }, options);
    window.addEventListener('resize', () => this.measure(), options);
    window.addEventListener('scroll', () => this.measureQuiet(), options);
    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(canvas);
    if (this.quietElement) this.resize.observe(this.quietElement);
    for (const element of this.extraQuietElements) this.resize.observe(element);
    this.measure();
    this.buildAtlas();
    this.stopWatchingPalette = watchPalette(() => this.buildAtlas());
    document.fonts?.ready.then(() => { if (!this.disposed) this.buildAtlas(); });
    this.loop = now => this.frame(now);
    this.frameId = requestAnimationFrame(this.loop);
  }

  isPaused() { return document.hidden || this.reduced.matches || this.paused(); }

  release() {
    this.pointer.down = this.pointer.inside = false;
    this.pointer.dx = this.pointer.dy = 0;
  }

  measureQuiet() {
    if (this.disposed) return;
    const visibleRect = element => {
      if (!element?.isConnected) return null;
      const rect = element.getBoundingClientRect();
      return rect.width && rect.height ? rect : null;
    };
    this.quiet = visibleRect(this.quietElement);
    this.extraQuiet = this.extraQuietElements.map(visibleRect).filter(Boolean);
    this.buildQuietMask();
    this.dirty = true;
  }

  measure() {
    if (this.disposed) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const changed = this.width !== bounds.width || this.height !== bounds.height;
    this.width = bounds.width; this.height = bounds.height;
    if (changed) {
      // One physical pixel per CSS pixel is deliberate for this pixel display.
      this.canvas.width = Math.round(this.width);
      this.canvas.height = Math.round(this.height);
      this.ctx.imageSmoothingEnabled = false;
      const scale = Math.max(1, Math.sqrt((this.width / 8) * (this.height / 10) / 14000));
      this.cols = Math.ceil(this.width / (8 * scale));
      this.rows = Math.ceil(this.height / (10 * scale));
      this.cellWidth = this.width / this.cols;
      this.cellHeight = this.height / this.rows;
      if (!this.solver) {
        const w = Math.round(clamp(this.width / this.height * 80, 64, 144));
        const h = Math.round(clamp(w * this.height / this.width, 56, 112));
        this.solver = new InkFlow(w, h);
        feedBackdrop(this.solver, 0, 0, true);
      }
      // Preserve the live field while resizing instead of restarting its animation.
      this.canvas.dataset.viewport = `${Math.round(this.width)}x${Math.round(this.height)}`;
      this.canvas.dataset.fluidGrid = `${this.solver.width}x${this.solver.height}`;
      this.canvas.dataset.glyphGrid = `${this.cols}x${this.rows}`;
      this.sampleIndices = new Uint32Array(this.cols * this.rows);
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          const gx = Math.round(1 + x / Math.max(1, this.cols - 1) * (this.solver.width - 3));
          const gy = Math.round(1 + y / Math.max(1, this.rows - 1) * (this.solver.height - 3));
          this.sampleIndices[x + y * this.cols] = gx + gy * this.solver.width;
        }
      }
    }
    this.measureQuiet();
  }

  buildQuietMask() {
    if (!this.cols || !this.rows) return;
    this.quietMask = new Float32Array(this.cols * this.rows);
    const quiet = this.quiet;
    const feather = Math.min(110, Math.max(54, this.width * .08));
    const strengthAt = (rect, px, py, radius) => {
      const dx = Math.max(rect.left - 6 - px, 0, px - rect.right - 6);
      const dy = Math.max(rect.top - 6 - py, 0, py - rect.bottom - 6);
      return .018 + .982 * smooth(Math.hypot(dx, dy) / radius);
    };
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let strength = 1;
        const px = (x + .5) * this.cellWidth, py = (y + .5) * this.cellHeight;
        if (quiet) strength = strengthAt(quiet, px, py, feather);
        for (const rect of this.extraQuiet || []) strength = Math.min(strength, strengthAt(rect, px, py, 32));
        this.quietMask[x + y * this.cols] = strength;
      }
    }
  }

  buildAtlas() {
    if (this.disposed) return;
    const ctx = this.atlas.getContext('2d', { willReadFrequently: true });
    const style = getComputedStyle(this.canvas);
    this.colors = ['--gb-ink', '--gb-dark', '--gb-mid', '--gb-light'].map((name, index) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = COLORS[index];
      ctx.fillStyle = style.getPropertyValue(name).trim() || COLORS[index];
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
    ctx.clearRect(0, 0, this.atlas.width, this.atlas.height);
    ctx.font = '10px "Tiny5", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    for (let x = 0; x < GLYPHS.length; x++) ctx.fillText(GLYPHS[x], x * 8 + 4, 5);
    const mask = ctx.getImageData(0, 0, this.atlas.width, 10);
    const output = ctx.createImageData(this.atlas.width, this.atlas.height);
    for (let tone = 0; tone < 3; tone++) {
      for (let i = 0; i < mask.width * mask.height; i++) {
        const alpha = mask.data[i * 4 + 3] >= 96 ? 255 : 0;
        const offset = (i + tone * mask.width * mask.height) * 4;
        output.data[offset] = this.colors[tone][0];
        output.data[offset + 1] = this.colors[tone][1];
        output.data[offset + 2] = this.colors[tone][2];
        output.data[offset + 3] = alpha;
      }
    }
    ctx.putImageData(output, 0, 0);
    this.paper = `rgb(${this.colors[3].join(',')})`;
    this.dirty = true;
  }

  frame(now) {
    if (this.disposed) return;
    if (!this.canvas.isConnected) { this.dispose(); return; }
    this.frameId = requestAnimationFrame(this.loop);
    const paused = this.isPaused();
    this.canvas.dataset.motion = paused ? 'paused' : 'running';
    if (document.hidden || !this.solver || now - this.last < 32) return;
    const dt = this.last ? Math.min(.05, (now - this.last) / 1000) : 1 / 30;
    this.last = now;
    if (!paused) {
      this.time += dt;
      feedBackdrop(this.solver, dt, this.time);
      this.solver.step(dt, { energy: 1.8, viscosity: .05, pointer: this.pointer, time: this.time });
      this.pointer.dx = this.pointer.dy = 0;
      this.dirty = true;
    } else this.release();
    if (this.dirty) this.draw();
  }

  draw() {
    const ctx = this.ctx, field = this.solver, density = field.density;
    ctx.fillStyle = this.paper;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = x + y * this.cols, index = this.sampleIndices[cell];
        const ink = Math.pow(clamp(density[index]), .69);
        const edge = Math.abs(density[index + 1] - density[index - 1])
          + Math.abs(density[index + field.width] - density[index - field.width]);
        const value = clamp(ink * .86 + edge * .36) * this.quietMask[cell];
        if (value < .052) continue;
        const glyph = clamp(Math.floor(value * GLYPHS.length), 0, GLYPHS.length - 1);
        const tone = value > .49 ? 0 : value > .26 ? 1 : 2;
        ctx.drawImage(this.atlas, glyph * 8, tone * 10, 8, 10,
          Math.floor(x * this.cellWidth), Math.floor(y * this.cellHeight), Math.ceil(this.cellWidth), Math.ceil(this.cellHeight));
      }
    }
    this.dirty = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.abort.abort();
    this.stopWatchingPalette();
    this.resize.disconnect();
    this.release();
    controllers.delete(this.canvas);
    this.canvas.dataset.motion = 'paused';
    this.atlas.width = this.atlas.height = 0;
    this.solver = this.sampleIndices = this.quietMask = null;
  }
}
