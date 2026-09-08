/** A small, deterministic 2-D ink simulation. Velocities are grid cells / second. */
export class InkFlow {
  constructor(width = 88, height = 58) {
    this.width = Math.max(8, Math.round(width));
    this.height = Math.max(8, Math.round(height));
    const size = this.width * this.height;
    for (const name of ['density', 'u', 'v', '_u', '_v', '_d', '_back', '_pressure', '_pressureNext', '_divergence', '_curl']) {
      this[name] = new Float32Array(size);
    }
    this._time = 0;
    this.reset();
  }

  reset() {
    const w = this.width, h = this.height;
    for (const name of ['density', 'u', 'v', '_u', '_v', '_d', '_back', '_pressure', '_pressureNext', '_divergence', '_curl']) {
      this[name].fill(0);
    }
    this._time = 0;
    // A coherent first frame: a narrow rising plume and two rolled-up ink edges.
    // The subsequent grid dynamics, rather than this seed, animate the image.
    const curls = [
      { x: .45 * w, y: .39 * h, r: .115 * h, sign: 1 },
      { x: .60 * w, y: .57 * h, r: .090 * h, sign: -1 },
    ];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w, ny = y / h;
        const center = w * (.50 + .065 * Math.sin(ny * 12 + .9));
        const breadth = w * (.016 + .020 * (1 - ny));
        const vertical = Math.exp(-Math.pow((ny - .59) / .25, 6));
        const across = (x - center) / breadth;
        let d = .87 * Math.exp(-across * across) * vertical;
        let u = 3.8 * Math.cos(ny * 12 + .9) * Math.exp(-across * across / 5) * vertical;
        let v = -11 * Math.exp(-across * across / 5) * vertical;
        for (const c of curls) {
          const dx = x - c.x, dy = y - c.y, r = Math.hypot(dx, dy);
          const theta = Math.atan2(dy, dx);
          const spiral = Math.sin(r * 1.30 - c.sign * 2 * theta);
          const envelope = Math.exp(-Math.pow((r - c.r * .68) / (c.r * .65), 4));
          d += .47 * Math.pow(Math.max(0, spiral), 6) * envelope;
          const spin = c.sign * 1.15 * Math.exp(-r * r / (c.r * c.r * 1.4));
          u += -dy * spin;
          v += dx * spin;
        }
        this.density[i] = Math.min(1.3, d);
        this.u[i] = u;
        this.v[i] = v;
      }
    }
    this._project(22);
    this._boundaries();
  }

  /** dt is elapsed seconds. pointer coordinates/deltas are fractions of the canvas. */
  step(dt = 1 / 30, options = {}) {
    dt = Math.min(.05, Math.max(0, Number.isFinite(dt) ? dt : 1 / 30));
    if (!dt) return this;
    const energy = Math.min(3, Math.max(0, Number.isFinite(options.energy) ? options.energy : 1));
    const viscosity = Math.min(1, Math.max(0, Number.isFinite(options.viscosity) ? options.viscosity : .5));
    this._time = Number.isFinite(options.time) ? options.time : this._time + dt;
    const time = this._time;
    const w = this.width, h = this.height, u = this.u, v = this.v, density = this.density;

    this._advect(u, u, v, this._u, dt);
    this._advect(v, u, v, this._v, dt);
    u.set(this._u);
    v.set(this._v);

    const diffuse = dt * (0.15 + viscosity * 3.8);
    const damping = Math.exp(-dt * (.12 + viscosity * .35));
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        u[i] = (this._u[i] + diffuse * (this._u[i - 1] + this._u[i + 1] + this._u[i - w] + this._u[i + w] - 4 * this._u[i])) * damping;
        v[i] = (this._v[i] + diffuse * (this._v[i - 1] + this._v[i + 1] + this._v[i - w] + this._v[i + w] - 4 * this._v[i])) * damping;
        // Gentle buoyancy follows the ink, so clear background stays quiet.
        v[i] -= dt * density[i] * (1.9 + energy * 2.7);
        this._curl[i] = .5 * (this._v[i + 1] - this._v[i - 1] - this._u[i + w] + this._u[i - w]);
      }
    }
    const confinement = dt * (.65 + energy * .75) * (1 - viscosity * .55);
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = x + y * w;
        let gx = Math.abs(this._curl[i + 1]) - Math.abs(this._curl[i - 1]);
        let gy = Math.abs(this._curl[i + w]) - Math.abs(this._curl[i - w]);
        const length = Math.hypot(gx, gy) + .00001;
        gx /= length; gy /= length;
        u[i] += gy * this._curl[i] * confinement;
        v[i] -= gx * this._curl[i] * confinement;
      }
    }

    // Two thin, curved jets form the living plume rather than flooding the screen.
    const speedScale = h / 58;
    for (let jet = 0; jet < 2; jet++) {
      const phase = time * .64 + jet * 2.9;
      const cx = w * (.46 + jet * .095 + .023 * Math.sin(phase));
      const cy = h * (.82 - jet * .035 + .012 * Math.cos(phase * .8));
      this._splat(cx, cy, Math.max(1.05, w * .015), dt * (1.65 + energy * .75),
        Math.cos(phase * 1.17) * (12 + energy * 11) * speedScale * dt,
        -(29 + energy * 29) * speedScale * dt);
    }

    const pointer = options.pointer;
    if (pointer?.inside && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)) {
      const px = Math.min(1, Math.max(0, pointer.x)) * (w - 1);
      const py = Math.min(1, Math.max(0, pointer.y)) * (h - 1);
      const dx = Number.isFinite(pointer.dx) ? pointer.dx : 0;
      const dy = Number.isFinite(pointer.dy) ? pointer.dy : 0;
      // Displacement -> pointer speed, then acceleration integrated over dt.
      // This keeps identical gestures comparable at different frame rates.
      const pointerU = Math.max(-90, Math.min(90, dx * w / dt));
      const pointerV = Math.max(-90, Math.min(90, dy * h / dt));
      const stir = pointer.down ? 13 : 8;
      this._splat(px, py, Math.max(2.4, h * .075), pointer.down ? dt * 3.5 : 0,
        pointerU * stir * dt, pointerV * stir * dt);
    }
    this._boundaries();
    this._project(18);
    this._boundaries();

    // A limited forward/backward correction keeps tendrils crisp without ringing.
    this._advect(density, u, v, this._d, dt);
    this._advect(this._d, u, v, this._back, -dt);
    const fade = Math.exp(-dt * (.19 + viscosity * .035));
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        const sx = Math.min(w - 1.001, Math.max(.001, x - dt * u[i]));
        const sy = Math.min(h - 1.001, Math.max(.001, y - dt * v[i]));
        const ix = Math.floor(sx), iy = Math.floor(sy), si = ix + iy * w;
        const a = density[si], b = density[si + 1], c = density[si + w], d = density[si + w + 1];
        const corrected = this._d[i] + .5 * (density[i] - this._back[i]);
        // Write to the scratch velocity array: original density is needed for every limiter.
        this._u[i] = Math.min(1.65, Math.max(0, Math.max(Math.min(a, b, c, d), Math.min(Math.max(a, b, c, d), corrected)))) * fade;
      }
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        density[i] = this._u[i] < .001 ? 0 : this._u[i];
      }
    }
    this._boundaries();
    return this;
  }

  _splat(cx, cy, radius, dye, du, dv) {
    const w = this.width, h = this.height, range = radius * 2.6;
    const x0 = Math.max(1, Math.floor(cx - range)), x1 = Math.min(w - 2, Math.ceil(cx + range));
    const y0 = Math.max(1, Math.floor(cy - range)), y1 = Math.min(h - 2, Math.ceil(cy + range));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = x + y * w;
        const weight = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (radius * radius));
        this.density[i] = Math.min(1.65, this.density[i] + dye * weight);
        this.u[i] = Math.max(-95, Math.min(95, this.u[i] + du * weight));
        this.v[i] = Math.max(-95, Math.min(95, this.v[i] + dv * weight));
      }
    }
  }

  _advect(field, u, v, target, dt) {
    const w = this.width, h = this.height;
    target.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        const px = Math.min(w - 1.001, Math.max(.001, x - dt * u[i]));
        const py = Math.min(h - 1.001, Math.max(.001, y - dt * v[i]));
        const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy, a = ix + iy * w;
        target[i] = (field[a] * (1 - fx) + field[a + 1] * fx) * (1 - fy)
          + (field[a + w] * (1 - fx) + field[a + w + 1] * fx) * fy;
      }
    }
  }

  _project(iterations) {
    const w = this.width, h = this.height, u = this.u, v = this.v, div = this._divergence;
    let p = this._pressure, next = this._pressureNext;
    p.fill(0); next.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        div[i] = -.5 * (u[i + 1] - u[i - 1] + v[i + w] - v[i - w]);
      }
    }
    for (let n = 0; n < iterations; n++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = x + y * w;
          next[i] = .25 * (div[i] + p[i - 1] + p[i + 1] + p[i - w] + p[i + w]);
        }
      }
      for (let x = 1; x < w - 1; x++) { next[x] = next[x + w]; next[(h - 1) * w + x] = next[(h - 2) * w + x]; }
      for (let y = 0; y < h; y++) { next[y * w] = next[y * w + 1]; next[y * w + w - 1] = next[y * w + w - 2]; }
      [p, next] = [next, p];
    }
    this._pressure = p; this._pressureNext = next;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = x + y * w;
        u[i] -= .5 * (p[i + 1] - p[i - 1]);
        v[i] -= .5 * (p[i + w] - p[i - w]);
      }
    }
  }

  _boundaries() {
    const w = this.width, h = this.height, u = this.u, v = this.v, d = this.density;
    for (let x = 0; x < w; x++) {
      const top = x, bottom = (h - 1) * w + x;
      u[top] = u[top + w]; u[bottom] = u[bottom - w];
      v[top] = 0; v[bottom] = 0; d[top] = 0; d[bottom] = 0;
    }
    for (let y = 0; y < h; y++) {
      const left = y * w, right = left + w - 1;
      u[left] = 0; u[right] = 0;
      v[left] = v[left + 1]; v[right] = v[right - 1]; d[left] = 0; d[right] = 0;
    }
  }
}
