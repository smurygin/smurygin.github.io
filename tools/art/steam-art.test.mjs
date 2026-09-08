import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  SteamArt,
  orderedDither,
  displacePixels,
} from '../../public/art/steam-art.mjs';

const fixtures = new Map();
const pending = new Map();
const requests = [];
const saved = new Map();

class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;

  set src(value) {
    const path = new URL(value).pathname;
    requests.push(path);
    const result = fixtures.get(path);
    if (result === 'pending') pending.set(path, this);
    else queueMicrotask(() => this.complete(result));
  }

  complete(result) {
    if (result === 'ok') {
      this.naturalWidth = 460;
      this.naturalHeight = 215;
      this.onload?.();
    } else this.onerror?.();
  }
}

before(() => {
  for (const key of ['Image', 'document', 'window'])
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  globalThis.Image = FakeImage;
  globalThis.document = { baseURI: 'http://localhost:4300/' };
  globalThis.window = { location: { origin: 'http://localhost:4300' } };
});

after(() => {
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

function art() {
  return {
    disposed: false,
    canvas: { dataset: { artSource: 'loading' } },
    image: null,
    rebuilds: 0,
    rebuild() {
      this.rebuilds++;
    },
  };
}

test('a failed icon selects the deterministic fallback', async () => {
  fixtures.set('/missing-icon.png', 'error');
  const target = art();
  await SteamArt.prototype.load.call(target, '/missing-icon.png');
  assert.equal(target.canvas.dataset.artSource, 'fallback');
  assert.equal(target.image, null);
  assert.equal(target.rebuilds, 1);
});

test('disposal during a pending icon load prevents later state updates', async () => {
  fixtures.set('/pending-icon.png', 'pending');
  const target = art();
  const completion = SteamArt.prototype.load.call(target, '/pending-icon.png');
  assert(pending.has('/pending-icon.png'));
  target.disposed = true;
  pending.get('/pending-icon.png').complete('ok');
  await completion;
  assert.equal(target.rebuilds, 0);
  assert.equal(target.image, null);
  assert.equal(target.canvas.dataset.artSource, 'loading');
});

test('foreign sources are rejected before Image fetch and use fallback', async () => {
  const previousRequests = requests.length;
  const target = art();
  await SteamArt.prototype.load.call(
    target,
    'https://foreign.example/icon.png',
  );
  assert.equal(requests.length, previousRequests);
  assert.equal(target.canvas.dataset.artSource, 'fallback');
  assert.equal(target.image, null);
  assert.equal(target.rebuilds, 1);
});

test('a successful icon rebuilds once', async () => {
  fixtures.set('/good-icon.png', 'ok');
  const target = art();
  await SteamArt.prototype.load.call(target, '/good-icon.png');
  assert.equal(target.canvas.dataset.artSource, 'icon');
  assert.equal(target.rebuilds, 1);
});

test('ordered dithering preserves endpoints, opacity, and monotonic brightness', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4);
  let previous = -1;
  for (let brightness = 0; brightness <= 255; brightness++) {
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = rgba[i + 1] = rgba[i + 2] = brightness;
      rgba[i + 3] = 255;
    }
    const tones = orderedDither(rgba, 4, 4);
    const mean = tones.reduce((sum, value) => sum + value, 0) / tones.length;
    assert(mean >= previous);
    assert(tones.every((value) => value >= 0 && value <= 3));
    if (brightness === 0) assert(tones.every((value) => value === 0));
    if (brightness === 255) assert(tones.every((value) => value === 3));
    previous = mean;
  }
  rgba.fill(0);
  assert(orderedDither(rgba, 4, 4).every((value) => value === 3));
});

test('ripples displace pixels and settle to the exact immutable source', () => {
  const width = 128,
    height = 60;
  const source = Uint8Array.from(
    { length: width * height },
    (_, index) => (Math.floor(index / width) + index) % 4,
  );
  const savedSource = source.slice();
  assert.deepEqual(displacePixels(source, width, height, []), source);
  const wave = { x: 0.5, y: 0.5, age: 0.05, strength: 1.4 };
  const displaced = displacePixels(source, width, height, [wave]);
  assert(displaced.some((value, index) => value !== source[index]));
  assert(displaced.every((value) => value >= 0 && value <= 3));
  assert.deepEqual(
    displacePixels(source, width, height, [{ ...wave, age: 5 }]),
    source,
  );
  assert.deepEqual(source, savedSource);
});
