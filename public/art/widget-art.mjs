import { watchPalette } from './watch-palette.mjs';
import { orderedDither, displacePixels, STEAM_PALETTE } from './steam-art.mjs';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const TAU = Math.PI * 2;
const RATIO = 460 / 215;

/** The three drawn widgets use the same whole-image LCD surface as SteamArt. */
export class WidgetArt {
  constructor(canvas, { kind = 'weather', weather = () => 'cloud', paused = () => false, playing = () => true, zone = () => 'UTC' } = {}) {
    this.canvas = canvas;
    this.kind = kind;
    this.weather = weather;
    this.paused = paused;
    this.playing = playing;
    this.zone = zone;
    this.ctx = canvas.getContext('2d');
    this.dirty = true;
    this.visible = true;
    this.disposed = false;
    this.phase = 0;
    this.waves = [];
    this.pointer = { x: .5, y: .5 };
    this.lastImpulse = -Infinity;
    this.abort = new AbortController();
    this.stopWatchingPalette = watchPalette(() => { this.colors = null; this.dirty = true; });
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    this.displayCanvas = document.createElement('canvas');
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.originalTabindex = canvas.getAttribute('tabindex');
    this.originalTouchAction = canvas.style.touchAction;
    if (this.originalTabindex === null) canvas.tabIndex = 0;
    canvas.style.touchAction = 'pan-y';
    canvas.dataset.artSource = 'geometry';
    canvas.dataset.motion = 'idle';

    const events = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !this.motionAllowed()) return;
      this.updatePointer(event);
      this.impulse(1.3, true);
    }, events);
    canvas.addEventListener('pointermove', event => {
      if (!this.motionAllowed()) return;
      const previous = this.previousPointer;
      this.updatePointer(event);
      const distance = previous ? Math.hypot(this.pointer.x - previous.x, this.pointer.y - previous.y) : .025;
      if (distance > .002) this.impulse(clamp(.36 + distance * 9, .36, 1.2));
    }, events);
    for (const name of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) {
      canvas.addEventListener(name, () => { this.previousPointer = null; }, events);
    }
    canvas.addEventListener('keydown', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!this.motionAllowed()) return;
      this.pointer = { x: .5, y: .5 };
      this.impulse(1.4, true);
    }, events);
    document.addEventListener('visibilitychange', () => this.stopMotion(), events);
    this.onMotionChange = () => this.stopMotion();
    this.motionQuery.addEventListener('change', this.onMotionChange);
    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(canvas);
    this.intersection = new IntersectionObserver(entries => {
      if (this.disposed) return;
      this.visible = entries[0]?.isIntersecting ?? false;
      if (!this.visible) this.stopMotion();
      else this.dirty = true;
    });
    this.intersection.observe(canvas);
    this.measure();
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
    this.waves.push({ ...this.pointer, age: 0, strength });
    this.canvas.dataset.motion = 'ripple';
    this.dirty = true;
  }

  measure() {
    if (this.disposed) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    if (this.w === bounds.width && this.h === bounds.height && this.dpr === dpr) return;
    this.w = bounds.width;
    this.h = bounds.height;
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    const inset = Math.min(8, this.w * .055, this.h * .075);
    const width = Math.min(this.w - inset * 2, (this.h - inset * 2) * RATIO);
    const height = width / RATIO;
    this.fit = { x: (this.w - width) / 2, y: (this.h - height) / 2, width, height };
    this.sampleWidth = Math.max(1, Math.min(Math.floor(width), clamp(Math.round(width / 2), 100, 140)));
    this.sampleHeight = Math.max(1, Math.round(this.sampleWidth / RATIO));
    this.sampleCanvas.width = this.displayCanvas.width = this.sampleWidth;
    this.sampleCanvas.height = this.displayCanvas.height = this.sampleHeight;
    this.source = new Uint8Array(this.sampleWidth * this.sampleHeight);
    this.displaced = new Uint8Array(this.source.length);
    this.imageData = this.displayCtx.createImageData(this.sampleWidth, this.sampleHeight);
    this.stopMotion();
  }

  palette() {
    const style = getComputedStyle(this.canvas);
    return ['--gb-ink', '--gb-dark', '--gb-mid', '--gb-light'].map((name, index) => {
      const color = style.getPropertyValue(name).trim() || STEAM_PALETTE[index];
      this.sampleCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.sampleCtx.clearRect(0, 0, 1, 1);
      this.sampleCtx.fillStyle = STEAM_PALETTE[index];
      this.sampleCtx.fillStyle = color;
      this.sampleCtx.fillRect(0, 0, 1, 1);
      return [...this.sampleCtx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
  }

  localTime() {
    const requestedZone = this.zone() || 'UTC';
    if (requestedZone !== this.currentZone || !this.clockFormatter) {
      this.currentZone = requestedZone;
      try {
        this.clockFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: requestedZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
      } catch {
        this.clockFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
      }
    }
    const fields = Object.fromEntries(this.clockFormatter.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { hour: Number(fields.hour) % 24, minute: Number(fields.minute), second: Number(fields.second) };
  }

  circle(x, y, radius, fill, stroke = null, lineWidth = 1) {
    const ctx = this.sampleCtx;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  line(x1, y1, x2, y2, color = '#111', width = 1) {
    const ctx = this.sampleCtx;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  sun(x, y, radius, phase) {
    for (let i = 0; i < 12; i++) {
      const angle = i * TAU / 12 + phase * .055;
      this.line(x + Math.cos(angle) * (radius + 3), y + Math.sin(angle) * (radius + 3), x + Math.cos(angle) * (radius + 6), y + Math.sin(angle) * (radius + 6), '#555', 1.4);
    }
    this.circle(x, y, radius, '#555');
    this.circle(x - 1.5, y - 1.5, radius - 2.5, '#d3d3d3');
  }

  cloud(x, y) {
    const ctx = this.sampleCtx;
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 8);
    ctx.bezierCurveTo(x - 33, y + 7, x - 33, y - 7, x - 20, y - 8);
    ctx.bezierCurveTo(x - 17, y - 21, x + 3, y - 20, x + 7, y - 10);
    ctx.bezierCurveTo(x + 23, y - 14, x + 31, y + 8, x + 16, y + 8);
    ctx.closePath();
    ctx.fillStyle = '#696969';
    ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 3);
    ctx.bezierCurveTo(x - 31, y + 2, x - 28, y - 6, x - 18, y - 6);
    ctx.bezierCurveTo(x - 14, y - 17, x + 1, y - 16, x + 4, y - 6);
    ctx.bezierCurveTo(x + 16, y - 11, x + 24, y + 3, x + 16, y + 3);
    ctx.closePath();
    ctx.fillStyle = '#e8e8e8'; ctx.fill();
  }

  drawWeather(condition) {
    const ctx = this.sampleCtx;
    if (condition === 'sun') {
      this.sun(50, 22, 10.5, this.phase);
      this.line(14, 41, 35, 41, '#b3b3b3');
      this.line(65, 41, 86, 41, '#b3b3b3');
      return;
    }
    // Extend the cloud and rain composition; keep its geometry,
    // greyscale shading, sampling, ordered dither and pointer ripples.
    const drift = Math.sin(this.phase * .45) * 2;
    const precipitation = ['rain', 'snow', 'storm'].includes(condition);
    if (condition === 'cloud') this.sun(65, 16, 7, this.phase);
    this.cloud(50 + drift, precipitation ? 21 : 27);
    if (condition === 'fog') {
      for (let i = 0; i < 3; i++) this.line(18 + i * 4, 33 + i * 4, 82 - i * 4, 33 + i * 4, '#b3b3b3', 1.2);
    }
    if (precipitation) {
      ctx.save();
      ctx.beginPath(); ctx.rect(15, 31, 73, 12); ctx.clip();
      for (let i = 0; i < 10; i++) {
        const x = 25 + i * 5.5;
        const y = 28 + ((i % 3) * 4 + this.phase * (condition === 'snow' ? 4 : 13)) % 17;
        if (condition === 'snow') this.circle(x, y, 1.2, i % 2 ? '#777' : '#222');
        else this.line(x, y, x - 2, y + 4, i % 2 ? '#777' : '#222', 1.2);
      }
      ctx.restore();
    }
  }

  drawMusic() {
    const ctx = this.sampleCtx;
    const x = 43, y = 23.5;
    const playing = this.playing();
    this.circle(x, y, 21, '#1c1c1c');
    for (let radius = 8; radius < 21; radius += 2) this.circle(x, y, radius, null, radius % 4 ? '#777' : '#aaa', .6);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(this.phase * .65);
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 18.5, i * Math.PI + .15, i * Math.PI + .58);
      ctx.strokeStyle = '#c5c5c5'; ctx.lineWidth = 3.4; ctx.stroke();
    }
    this.circle(0, 0, 7, '#d8d8d8');
    if (playing) {
      this.circle(0, -4.1, 1.1, '#555');
      this.circle(0, 0, 1.5, '#111');
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(-3, -3, 2, 6); ctx.fillRect(1, -3, 2, 6);
    }
    ctx.restore();
    this.circle(78, 8, 3, '#777', '#111', .8);
    const armX = playing ? 78 : 84;
    const headX = playing ? 66 : 84;
    this.line(78, 8, armX, 26, '#222', 1.8);
    this.line(armX, 26, headX, 35, '#222', 1.8);
    ctx.save();
    ctx.translate(headX, 35); ctx.rotate(playing ? -.65 : -Math.PI / 2);
    ctx.fillStyle = '#333'; ctx.fillRect(-4, -1.8, 7, 3.6);
    ctx.restore();
  }

  drawClock(clock, motion) {
    const ctx = this.sampleCtx;
    // The sand completes one cycle per local minute. Pausing (including reduced
    // motion) holds the current amount instead of continuing the animation.
    if (motion || this.hourglassProgress === undefined) this.hourglassProgress = clamp(clock.second / 60, 0, 1);
    const progress = this.hourglassProgress;
    const topSurface = Math.ceil(22 - 13 * Math.sqrt(1 - progress));
    const pileTop = 38 - Math.floor(14 * Math.sqrt(progress));

    // Integer rectangles give the glass its deliberate staircase contour.
    ctx.fillStyle = '#222';
    ctx.fillRect(33, 3, 34, 3);
    ctx.fillRect(33, 40, 34, 3);
    ctx.fillStyle = '#777';
    ctx.fillRect(34, 6, 2, 34);
    ctx.fillRect(64, 6, 2, 34);
    ctx.fillStyle = '#333';
    ctx.fillRect(37, 7, 26, 1);
    ctx.fillRect(37, 38, 26, 1);
    for (let y = 8; y < 38; y++) {
      const half = y <= 22 ? 12 - Math.floor((y - 8) * .85) : 1 + Math.floor((y - 23) * .85);
      ctx.fillStyle = '#333';
      ctx.fillRect(49 - half, y, 1, 1);
      ctx.fillRect(50 + half, y, 1, 1);
      if (y <= 22 && y >= topSurface) {
        ctx.fillStyle = '#737373';
        ctx.fillRect(50 - half, y, half * 2, 1);
      } else if (y > 22 && y >= pileTop && progress > 0) {
        const sandHalf = Math.min(half, Math.max(1, Math.floor((y - pileTop) * 1.1 + 1)));
        ctx.fillStyle = '#737373';
        ctx.fillRect(50 - sandHalf, y, sandHalf * 2, 1);
      }
    }
    if (motion && pileTop > 25) {
      const fallDistance = pileTop - 24;
      ctx.fillStyle = '#555';
      for (let i = 0; i < 2; i++) {
        const y = 24 + Math.floor((this.phase * 12 + i * fallDistance / 2) % fallDistance);
        ctx.fillRect(49 + i, y, 1, 1);
      }
    }
  }

  rebuildSource(condition, clock, motion) {
    const ctx = this.sampleCtx;
    ctx.setTransform(this.sampleWidth / 100, 0, 0, this.sampleHeight / (100 / RATIO), 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 100, 100 / RATIO);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (this.kind === 'music') this.drawMusic();
    else if (this.kind === 'time') this.drawClock(clock, motion);
    else this.drawWeather(condition);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.source = orderedDither(ctx.getImageData(0, 0, this.sampleWidth, this.sampleHeight).data, this.sampleWidth, this.sampleHeight);
  }

  draw(_time, dt = 1 / 30) {
    if (this.disposed || !this.visible || document.hidden || !this.fit) return;
    const motion = this.motionAllowed();
    if (!motion && this.waves.length) this.stopMotion();
    const elapsed = clamp(Number.isFinite(dt) ? dt : 1 / 30, 0, .1);
    const playing = this.kind !== 'music' || this.playing();
    if (this.kind === 'music') this.canvas.dataset.playback = playing ? 'playing' : 'idle';
    const ambient = motion && playing;
    const condition = this.kind === 'weather' ? this.weather() : '';
    const clock = this.kind === 'time' ? this.localTime() : null;
    const state = `${condition}|${playing}|${motion}|${clock ? `${this.currentZone}:${clock.hour}:${clock.minute}:${motion ? clock.second : 0}` : ''}`;
    if (state !== this.state) this.dirty = true;
    this.state = state;
    if (!this.dirty && !ambient && !this.waves.length) return;
    if (ambient) this.phase += elapsed;
    if (motion) {
      for (const wave of this.waves) wave.age += elapsed;
      this.waves = this.waves.filter(wave => wave.age < 1.35);
    }
    if (!this.colors) this.colors = this.palette();
    this.rebuildSource(condition, clock, motion);
    const pixels = displacePixels(this.source, this.sampleWidth, this.sampleHeight, this.waves, this.displaced);
    const data = this.imageData.data;
    for (let i = 0; i < pixels.length; i++) {
      const color = this.colors[pixels[i]], offset = i * 4;
      data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]; data[offset + 3] = 255;
    }
    this.displayCtx.putImageData(this.imageData, 0, 0);
    this.ctx.fillStyle = `rgb(${this.colors[3].join(',')})`;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.displayCanvas, this.fit.x, this.fit.y, this.fit.width, this.fit.height);
    this.canvas.dataset.motion = this.waves.length ? 'ripple' : 'idle';
    this.dirty = false;
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
    this.canvas.style.touchAction = this.originalTouchAction;
    if (this.originalTabindex === null) this.canvas.removeAttribute('tabindex');
    else this.canvas.setAttribute('tabindex', this.originalTabindex);
    this.canvas.dataset.motion = 'idle';
    this.source = this.displaced = this.imageData = null;
    this.sampleCanvas.width = this.sampleCanvas.height = this.displayCanvas.width = this.displayCanvas.height = 0;
  }
}
