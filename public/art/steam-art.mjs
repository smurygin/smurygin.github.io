import { watchPalette } from './watch-palette.mjs';
/** Whole Steam artwork, sampled into the site's four-tone green palette. */
export const STEAM_PALETTE = ['#243a1f', '#344b27', '#91a55f', '#b7c77d'];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const imageCache = new Map();
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Pure conversion, also usable without a browser for deterministic checks. */
export function orderedDither(rgba, width, height) {
  const tones = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x, offset = i * 4, alpha = rgba[offset + 3] / 255;
      const light = ((rgba[offset] * .2126 + rgba[offset + 1] * .7152 + rgba[offset + 2] * .0722) / 255) * alpha + (1 - alpha);
      const threshold = (BAYER[(y % 4) * 4 + x % 4] + .5) / 16 - .5;
      tones[i] = clamp(Math.round(light * 3 + threshold * .9), 0, 3);
    }
  }
  return tones;
}

/** The same radial displacement works for every source; zero waves is an exact copy. */
export function displacePixels(source, width, height, waves, target = new Uint8Array(source.length)) {
  if (!waves.length) { target.set(source); return target; }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = 0, dy = 0;
      for (const wave of waves) {
        const rx = x - wave.x * (width - 1), ry = y - wave.y * (height - 1);
        const distance = Math.hypot(rx, ry), front = wave.age * 28;
        const band = (distance - front) / 7;
        const envelope = Math.exp(-band * band * .5) * Math.exp(-wave.age * 3.8);
        const amplitude = Math.sin((distance - front) * .7) * envelope * wave.strength * 3.1;
        if (distance > .001) { dx += rx / distance * amplitude; dy += ry / distance * amplitude; }
      }
      const sx = clamp(Math.round(x + clamp(dx, -6, 6)), 0, width - 1);
      const sy = clamp(Math.round(y + clamp(dy, -6, 6)), 0, height - 1);
      target[y * width + x] = source[sy * width + sx];
    }
  }
  return target;
}

function loadImage(path) {
  if (!path) return Promise.reject(new Error('Artwork path is absent'));
  let url;
  try {
    url = new URL(path, document.baseURI);
    if (url.origin !== window.location.origin) throw new Error('Artwork must be same-origin');
  } catch (error) { return Promise.reject(error); }
  if (imageCache.has(url.href)) return imageCache.get(url.href);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (error) reject(error); else resolve(image);
    };
    const timeout = setTimeout(() => finish(new Error('Artwork load timed out')), 5000);
    image.decoding = 'async';
    image.onload = () => finish(image.naturalWidth && image.naturalHeight ? null : new Error('Artwork is empty'));
    image.onerror = () => finish(new Error('Artwork could not load'));
    image.src = url.href;
  });
  imageCache.set(url.href, promise);
  promise.catch(() => { if (imageCache.get(url.href) === promise) imageCache.delete(url.href); });
  // Keep the shared image cache bounded when the laboratory changes games repeatedly.
  if (imageCache.size > 16) imageCache.delete(imageCache.keys().next().value);
  return promise;
}

function seedNumber(seed) {
  const text = String(seed ?? 'steam');
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

function fallbackPixels(width, height, seed) {
  const tones = new Uint8Array(width * height), phase = (seed % 997) / 997 * Math.PI * 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width, ny = y / height;
      const contour = Math.sin(nx * 12 + Math.sin(ny * 7 + phase) * 1.7 + phase)
        + Math.cos(ny * 11 - nx * 4 + phase) * .7;
      const light = clamp(.54 + contour * .19, 0, 1);
      const threshold = (BAYER[(y % 4) * 4 + x % 4] + .5) / 16 - .5;
      tones[y * width + x] = clamp(Math.round(light * 3 + threshold * .9), 0, 3);
    }
  }
  return tones;
}

export class SteamArt {
  constructor(canvas, { icon, seed, paused = () => false } = {}) {
    this.canvas = canvas;
    this.kind = 'steam';
    this.ctx = canvas.getContext('2d');
    this.paused = paused;
    this.seed = seedNumber(seed);
    this.dirty = true;
    this.visible = true;
    this.disposed = false;
    this.waves = [];
    this.pointer = { x: .5, y: .5 };
    this.previousPointer = null;
    this.lastImpulse = -Infinity;
    this.abort = new AbortController();
    this.stopWatchingPalette = watchPalette(() => { this.colors = null; this.dirty = true; });
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    this.displayCanvas = document.createElement('canvas');
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.canvas.dataset.artSource = 'loading';
    this.canvas.dataset.motion = 'idle';
    this.originalTabindex = canvas.getAttribute('tabindex');
    this.originalTouchAction = canvas.style.touchAction;
    if (this.originalTabindex === null) canvas.tabIndex = 0;
    canvas.style.touchAction = 'pan-y';
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !this.motionAllowed()) return;
      this.updatePointer(event);
      this.impulse(1.3, true);
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
      this.heldPointer = event.pointerId;
    }, options);
    canvas.addEventListener('pointermove', event => {
      if (!this.motionAllowed()) return;
      const previous = this.previousPointer;
      this.updatePointer(event);
      const distance = previous ? Math.hypot(this.pointer.x - previous.x, this.pointer.y - previous.y) : .025;
      if (distance > .002) this.impulse(clamp(.36 + distance * 9, .36, 1.2));
    }, options);
    const release = () => {
      if (this.heldPointer !== undefined && canvas.hasPointerCapture?.(this.heldPointer)) canvas.releasePointerCapture(this.heldPointer);
      this.heldPointer = undefined;
      this.previousPointer = null;
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave', 'blur']) canvas.addEventListener(event, release, options);
    canvas.addEventListener('keydown', event => {
      if (![' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (!this.motionAllowed()) return;
      if (event.key === 'ArrowLeft') this.pointer.x = clamp(this.pointer.x - .1, 0, 1);
      if (event.key === 'ArrowRight') this.pointer.x = clamp(this.pointer.x + .1, 0, 1);
      if (event.key === 'ArrowUp') this.pointer.y = clamp(this.pointer.y - .1, 0, 1);
      if (event.key === 'ArrowDown') this.pointer.y = clamp(this.pointer.y + .1, 0, 1);
      this.impulse(event.key.startsWith('Arrow') ? 1 : 1.4, true);
    }, options);
    document.addEventListener('visibilitychange', () => {
      this.stopMotion();
      release();
    }, options);
    this.onMotionChange = () => this.stopMotion();
    this.motionQuery.addEventListener('change', this.onMotionChange);
    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(canvas);
    this.intersection = new IntersectionObserver(entries => {
      if (this.disposed) return;
      this.visible = entries[0]?.isIntersecting ?? false;
      if (!this.visible) { this.stopMotion(); release(); }
      else this.dirty = true;
    });
    this.intersection.observe(canvas);
    this.measure();
    this.load(icon);
  }

  motionAllowed() {
    return !this.disposed && this.visible && !document.hidden && !this.motionQuery.matches && !this.paused();
  }

  stopMotion() {
    this.waves.length = 0;
    this.previousPointer = null;
    this.canvas.dataset.motion = 'idle';
    this.dirty = true;
  }

  updatePointer(event) {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !this.fit) return;
    this.pointer = {
      x: clamp((event.clientX - bounds.left - this.fit.x) / this.fit.width, 0, 1),
      y: clamp((event.clientY - bounds.top - this.fit.y) / this.fit.height, 0, 1),
    };
    this.previousPointer = this.pointer;
  }

  impulse(strength, force = false) {
    const now = performance.now();
    if (!force && now - this.lastImpulse < 45) return;
    this.lastImpulse = now;
    if (this.waves.length >= 6) this.waves.shift();
    this.waves.push({ x: this.pointer.x, y: this.pointer.y, age: 0, strength });
    this.canvas.dataset.motion = 'ripple';
    this.dirty = true;
  }

  async load(icon) {
    if (icon) {
      try {
        const image = await loadImage(icon);
        if (this.disposed) return;
        this.image = image;
        this.canvas.dataset.artSource = 'icon';
        this.rebuild();
        return;
      } catch {
        if (this.disposed) return;
      }
    }
    if (this.disposed) return;
    this.image = null;
    this.canvas.dataset.artSource = 'fallback';
    this.rebuild();
  }

  measure() {
    if (this.disposed) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    if (this.w === bounds.width && this.h === bounds.height && this.dpr === dpr) return;
    this.w = bounds.width; this.h = bounds.height; this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.rebuild();
  }

  rebuild() {
    if (this.disposed || !this.w || !this.h) return;
    const ratio = this.image ? this.image.naturalWidth / this.image.naturalHeight : 460 / 215;
    const inset = Math.min(8, this.w * .055, this.h * .075);
    const availableWidth = this.w - inset * 2, availableHeight = this.h - inset * 2;
    const width = Math.min(availableWidth, availableHeight * ratio), height = width / ratio;
    this.fit = { x: (this.w - width) / 2, y: (this.h - height) / 2, width, height };
    this.sampleWidth = Math.max(1, Math.min(Math.floor(width), clamp(Math.round(width / 2), 100, 140)));
    this.sampleHeight = Math.max(1, Math.round(this.sampleWidth / ratio));
    this.sampleCanvas.width = this.displayCanvas.width = this.sampleWidth;
    this.sampleCanvas.height = this.displayCanvas.height = this.sampleHeight;
    // Average the source before quantizing; only the final pixel surface uses nearest-neighbour scaling.
    this.sampleCtx.imageSmoothingEnabled = true;
    this.sampleCtx.imageSmoothingQuality = 'high';
    if (this.image) {
      this.sampleCtx.clearRect(0, 0, this.sampleWidth, this.sampleHeight);
      this.sampleCtx.drawImage(this.image, 0, 0, this.sampleWidth, this.sampleHeight);
      this.source = orderedDither(this.sampleCtx.getImageData(0, 0, this.sampleWidth, this.sampleHeight).data, this.sampleWidth, this.sampleHeight);
    } else this.source = fallbackPixels(this.sampleWidth, this.sampleHeight, this.seed);
    this.displaced = new Uint8Array(this.source.length);
    this.imageData = this.displayCtx.createImageData(this.sampleWidth, this.sampleHeight);
    this.stopMotion();
  }

  palette() {
    const style = getComputedStyle(this.canvas);
    return ['--gb-ink', '--gb-dark', '--gb-mid', '--gb-light'].map((name, index) => {
      const color = style.getPropertyValue(name).trim() || STEAM_PALETTE[index];
      // CSS owns the palette. A single pixel resolves its exact RGB representation.
      this.sampleCtx.clearRect(0, 0, 1, 1);
      this.sampleCtx.fillStyle = STEAM_PALETTE[index];
      this.sampleCtx.fillStyle = color;
      this.sampleCtx.fillRect(0, 0, 1, 1);
      return [...this.sampleCtx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
  }

  draw(_time, dt = 1 / 30) {
    if (this.disposed || !this.visible || document.hidden || !this.source) return;
    const motion = this.motionAllowed();
    if (!motion && this.waves.length) this.stopMotion();
    if (!this.dirty && !this.waves.length) return;
    const active = this.waves.length > 0;
    if (motion) {
      const elapsed = clamp(Number.isFinite(dt) ? dt : 1 / 30, 0, .1);
      for (const wave of this.waves) wave.age += elapsed;
      this.waves = this.waves.filter(wave => wave.age < 1.35);
    }
    const pixels = displacePixels(this.source, this.sampleWidth, this.sampleHeight, this.waves, this.displaced);
    // Palette sampling is only needed on a dirty source/theme, never on every ripple frame.
    if (!this.colors) this.colors = this.palette();
    const data = this.imageData.data;
    for (let i = 0; i < pixels.length; i++) {
      const color = this.colors[pixels[i]], offset = i * 4;
      data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]; data[offset + 3] = 255;
    }
    this.displayCtx.putImageData(this.imageData, 0, 0);
    const light = this.colors[3];
    this.ctx.fillStyle = `rgb(${light.join(',')})`;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.imageSmoothingEnabled = false;
    const fit = this.fit;
    this.ctx.drawImage(this.displayCanvas, fit.x, fit.y, fit.width, fit.height);
    this.canvas.dataset.motion = this.waves.length ? 'ripple' : 'idle';
    this.dirty = false;
    // The final active frame writes the unwarped source before becoming idle.
    if (active && !this.waves.length) this.canvas.dataset.motion = 'idle';
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.stopWatchingPalette();
    this.resize.disconnect();
    this.intersection.disconnect();
    this.motionQuery.removeEventListener('change', this.onMotionChange);
    this.waves.length = 0;
    if (this.heldPointer !== undefined && this.canvas.hasPointerCapture?.(this.heldPointer)) this.canvas.releasePointerCapture(this.heldPointer);
    this.canvas.style.touchAction = this.originalTouchAction;
    if (this.originalTabindex === null) this.canvas.removeAttribute('tabindex');
    else this.canvas.setAttribute('tabindex', this.originalTabindex);
    this.canvas.dataset.motion = 'idle';
    this.image = null;
    this.source = this.displaced = this.imageData = null;
    this.sampleCanvas.width = this.sampleCanvas.height = this.displayCanvas.width = this.displayCanvas.height = 0;
  }
}
