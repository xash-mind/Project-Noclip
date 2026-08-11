import assert from 'node:assert/strict';
import test from 'node:test';

class FakeAudioParam {
  constructor(value = 0) { this.value = value; }
  cancelScheduledValues() {}
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}
class FakeNode { connect(target) { return target; } }
class FakeGainNode extends FakeNode { constructor() { super(); this.gain = new FakeAudioParam(); } }
class FakeOscillatorNode extends FakeNode {
  constructor() { super(); this.type = 'sine'; this.frequency = new FakeAudioParam(); }
  start() {}
  stop() {}
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 1; this.destination = new FakeNode(); }
  createGain() { return new FakeGainNode(); }
  createOscillator() { return new FakeOscillatorNode(); }
  async resume() { this.state = 'running'; }
}
class FakeElement {
  constructor() { this.hidden = false; this.classList = { contains: () => false }; }
}
const canvas = new FakeElement();
const title = new FakeElement(); title.hidden = true;
const hud = new FakeElement(); hud.hidden = false;
const pause = new FakeElement();
const lab = new FakeElement();
const note = new FakeElement();
const elements = new Map([
  ['#game-canvas', canvas], ['[data-ui="title"]', title], ['[data-ui="hud"]', hud],
  ['[data-ui="pause"]', pause], ['[data-ui="lab"]', lab], ['[data-ui="note"]', note]
]);
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  AudioContext: FakeAudioContext,
  innerWidth: 1440,
  innerHeight: 900,
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
  setTimeout(callback) { callback(); return 1; }
} });
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  hidden: false,
  pointerLockElement: canvas,
  hasFocus: () => true,
  querySelector: (selector) => elements.get(selector) ?? null,
  addEventListener() {}
} });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: 0 } });
Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: class { observe() {} } });

const { AMBIENCE_TUNING, ProceduralAmbience } = await import('../.test-dist/src/audio/Ambience.js');

const field = (overrides = {}) => ({
  energy: 0.64,
  activeGroups: 3,
  flickerGroups: 1,
  nearbyGroups: 4,
  flickerPulse: 0,
  temperature: 0.96,
  ...overrides
});

test('clustered light field modulates the existing ambience graph with bounded synchronized flicker', async () => {
  const ambience = new ProceduralAmbience();
  await ambience.start(0.68);
  assert.equal(ambience.getDebugState().active, true);
  assert.equal(ambience.getDebugState().graphStarts, 1);
  assert.equal(ambience.getDebugState().humLayers, 3);

  ambience.setLightField(field());
  let debug = ambience.getDebugState();
  assert.equal(debug.lightEnergy, 0.64);
  assert.equal(debug.activeLightGroups, 3);
  assert.equal(debug.flickerGroups, 1);
  assert.ok(debug.targetHumGain > 0 && debug.targetHumGain <= AMBIENCE_TUNING.normalHumGain);

  const before = debug.flickerStarts;
  ambience.setLightField(field({ flickerPulse: 0.72 }));
  debug = ambience.getDebugState();
  assert.equal(debug.flickerStarts, before + 1);
  assert.equal(debug.graphStarts, 1, 'field flicker must not create another persistent audio graph');

  ambience.setLightField(field({ flickerPulse: 0.9 }));
  assert.equal(ambience.getDebugState().flickerStarts, before + 1, 'one dim interval produces at most one flicker snap');
  ambience.setLightField(field({ flickerPulse: 0 }));
  ambience.setLightField(field({ flickerPulse: 0.7 }));
  assert.equal(ambience.getDebugState().flickerStarts, before + 2, 'a later distinct flicker interval may produce one more snap');
});

test('deep Blackout removes local hum while the external boundary cue rises gradually', async () => {
  const ambience = new ProceduralAmbience();
  await ambience.start(0.68);
  ambience.setLightField(field({ energy: 1 }));
  ambience.setEnvironment(1, 0);
  assert.equal(ambience.getDebugState().targetHumGain, 0);
  ambience.setEnvironment(0.8, 0.25);
  const distant = ambience.getDebugState().targetHumGain;
  ambience.setEnvironment(0.6, 0.8);
  const near = ambience.getDebugState().targetHumGain;
  assert.ok(distant > 0);
  assert.ok(near > distant);
  assert.ok(near <= AMBIENCE_TUNING.externalEscapeHumGain);
});

test('lifecycle resume suppresses an immediate clustered flicker snap', async () => {
  const ambience = new ProceduralAmbience();
  await ambience.start(0.68);
  ambience.setLightField(field({ flickerPulse: 0 }));
  ambience.setActive(false);
  const before = ambience.getDebugState().flickerStarts;
  ambience.setActive(true);
  ambience.setLightField(field({ flickerPulse: 0.8 }));
  assert.equal(ambience.getDebugState().flickerStarts, before);
  ambience.setLightField(field({ flickerPulse: 0 }));
  ambience.setLightField(field({ flickerPulse: 0.8 }));
  assert.equal(ambience.getDebugState().flickerStarts, before + 1);
});
