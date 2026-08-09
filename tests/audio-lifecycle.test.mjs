import assert from 'node:assert/strict';
import test from 'node:test';

class FakeAudioParam {
  constructor(value = 0) { this.value = value; this.targets = []; }
  cancelScheduledValues(time) { this.cancelledAt = time; }
  setTargetAtTime(value, time, timeConstant) { this.value = value; this.targets.push({ value, time, timeConstant }); }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  connect(target) { this.connectedTo = target; return target; }
}

class FakeGainNode extends FakeNode {
  constructor() { super(); this.gain = new FakeAudioParam(); }
}

class FakeOscillatorNode extends FakeNode {
  constructor() {
    super(); this.type = 'sine'; this.frequency = new FakeAudioParam(); this.started = false; this.stopped = false;
  }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  static instances = [];
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = new FakeNode();
    this.oscillators = [];
    this.gains = [];
    this.resumeCalls = 0;
    FakeAudioContext.instances.push(this);
  }
  createGain() { const gain = new FakeGainNode(); this.gains.push(gain); return gain; }
  createOscillator() { const oscillator = new FakeOscillatorNode(); this.oscillators.push(oscillator); return oscillator; }
  async resume() { this.resumeCalls += 1; this.state = 'running'; }
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  contains(value) { return this.values.has(value); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
}

class FakeElement {
  constructor() { this.hidden = false; this.classList = new FakeClassList(); }
}

const canvas = new FakeElement();
const title = new FakeElement(); title.hidden = true;
const hud = new FakeElement(); hud.hidden = false;
const pause = new FakeElement();
const lab = new FakeElement();
const note = new FakeElement();
const elements = new Map([
  ['#game-canvas', canvas],
  ['[data-ui="title"]', title],
  ['[data-ui="hud"]', hud],
  ['[data-ui="pause"]', pause],
  ['[data-ui="lab"]', lab],
  ['[data-ui="note"]', note]
]);

let focused = true;
let touchMedia = false;
const windowListeners = new Map();
const documentListeners = new Map();
const observerCallbacks = [];
const timerCallbacks = [];

const addListener = (map, type, callback) => {
  const callbacks = map.get(type) ?? [];
  callbacks.push(callback);
  map.set(type, callbacks);
};

const fakeWindow = {
  AudioContext: FakeAudioContext,
  innerWidth: 1440,
  innerHeight: 900,
  matchMedia: () => ({ matches: touchMedia }),
  addEventListener: (type, callback) => addListener(windowListeners, type, callback),
  setTimeout: (callback) => { timerCallbacks.push(callback); return timerCallbacks.length; }
};

const fakeDocument = {
  hidden: false,
  pointerLockElement: canvas,
  hasFocus: () => focused,
  querySelector: (selector) => elements.get(selector) ?? null,
  addEventListener: (type, callback) => addListener(documentListeners, type, callback)
};

Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: 0 } });
Object.defineProperty(globalThis, 'MutationObserver', {
  configurable: true,
  value: class {
    constructor(callback) { this.callback = callback; observerCallbacks.push(callback); }
    observe() {}
    disconnect() {}
  }
});

const {
  AMBIENCE_TUNING,
  ProceduralAmbience,
  readJourneyAudioLifecycle,
  shouldProceduralAmbienceBeActive
} = await import('../.test-dist/src/audio/Ambience.js');

function resetJourneyUi() {
  title.hidden = true;
  hud.hidden = false;
  pause.classList.remove('visible');
  lab.classList.remove('visible');
  note.classList.remove('visible');
  fakeDocument.pointerLockElement = canvas;
  fakeDocument.hidden = false;
  focused = true;
  touchMedia = false;
  globalThis.navigator.maxTouchPoints = 0;
  fakeWindow.innerWidth = 1440;
  fakeWindow.innerHeight = 900;
}

function fireLatestObserver() {
  const callback = observerCallbacks.at(-1);
  assert.ok(callback, 'expected a lifecycle MutationObserver');
  callback([], {});
}

function flushLatestTimer() {
  const callback = timerCallbacks.pop();
  assert.ok(callback, 'expected a deferred lifecycle sync');
  callback();
}

test('journey audio lifecycle only activates for focused, unpaused gameplay', () => {
  const active = { started: true, paused: false, labOpen: false, noteOpen: false, focused: true };
  assert.equal(shouldProceduralAmbienceBeActive(active), true);
  assert.equal(shouldProceduralAmbienceBeActive({ ...active, started: false }), false);
  assert.equal(shouldProceduralAmbienceBeActive({ ...active, paused: true }), false);
  assert.equal(shouldProceduralAmbienceBeActive({ ...active, labOpen: true }), false);
  assert.equal(shouldProceduralAmbienceBeActive({ ...active, noteOpen: true }), false);
  assert.equal(shouldProceduralAmbienceBeActive({ ...active, focused: false }), false);
});

test('DOM lifecycle resolver covers desktop pointer lock and landscape touch', () => {
  resetJourneyUi();
  assert.deepEqual(readJourneyAudioLifecycle(), {
    started: true, paused: false, labOpen: false, noteOpen: false, focused: true
  });

  fakeDocument.pointerLockElement = null;
  assert.equal(readJourneyAudioLifecycle().paused, true);

  globalThis.navigator.maxTouchPoints = 1;
  touchMedia = true;
  fakeWindow.innerWidth = 900;
  fakeWindow.innerHeight = 450;
  assert.equal(readJourneyAudioLifecycle().paused, false);
  fakeWindow.innerWidth = 450;
  fakeWindow.innerHeight = 900;
  assert.equal(readJourneyAudioLifecycle().paused, true);

  resetJourneyUi();
  lab.classList.add('visible');
  assert.equal(readJourneyAudioLifecycle().labOpen, true);
  lab.classList.remove('visible');
  note.classList.add('visible');
  assert.equal(readJourneyAudioLifecycle().noteOpen, true);
  note.classList.remove('visible');
  focused = false;
  assert.equal(readJourneyAudioLifecycle().focused, false);
});

test('ambience graph is reused, lifecycle transitions mute smoothly, and resume does not burst step timers', async () => {
  resetJourneyUi();
  FakeAudioContext.instances.length = 0;
  const ambience = new ProceduralAmbience();
  await ambience.start(0.68);
  flushLatestTimer();

  let debug = ambience.getDebugState();
  assert.equal(debug.graphStarts, 1);
  assert.equal(debug.active, true);
  assert.ok(debug.targetMasterGain > 0);
  assert.ok(debug.targetMasterGain < 0.68 * 0.28, 'master gain should be gentler than the legacy scale');

  await ambience.start(0.5);
  debug = ambience.getDebugState();
  assert.equal(debug.graphStarts, 1, 'restarting must not duplicate the oscillator graph');
  assert.equal(debug.targetMasterGain, 0.5 * AMBIENCE_TUNING.masterScale);

  const context = FakeAudioContext.instances[0];
  context.currentTime = 10;
  lab.classList.add('visible');
  fireLatestObserver();
  debug = ambience.getDebugState();
  assert.equal(debug.active, false);
  assert.equal(debug.targetMasterGain, 0);
  assert.equal(debug.graphStarts, 1);

  context.currentTime = 50;
  lab.classList.remove('visible');
  fireLatestObserver();
  assert.equal(ambience.getDebugState().active, true);
  const stepsBeforeResume = ambience.getDebugState().stepStarts;
  ambience.step(1);
  assert.equal(ambience.getDebugState().stepStarts, stepsBeforeResume, 'resume must not emit an immediate queued step transient');
  context.currentTime = 50.6;
  ambience.step(1);
  assert.equal(ambience.getDebugState().stepStarts, stepsBeforeResume + 1, 'active ambience should resume normal movement transients');

  note.classList.add('visible');
  fireLatestObserver();
  assert.equal(ambience.getDebugState().active, false);
  note.classList.remove('visible');
  fireLatestObserver();
  assert.equal(ambience.getDebugState().active, true);
  assert.equal(ambience.getDebugState().graphStarts, 1);

  for (const listener of windowListeners.get('blur') ?? []) listener();
  assert.equal(ambience.getDebugState().active, false);
});

test('fluorescent hum is measurably gentler while retaining its identity', () => {
  assert.equal(AMBIENCE_TUNING.humWaveform, 'triangle');
  assert.ok(AMBIENCE_TUNING.masterScale < 0.28);
  assert.ok(AMBIENCE_TUNING.normalHumGain < 0.025);
  assert.ok(AMBIENCE_TUNING.failedHumGain < AMBIENCE_TUNING.normalHumGain);
  assert.ok(AMBIENCE_TUNING.blackoutHumGain < AMBIENCE_TUNING.failedHumGain);
});

test('suspended and unavailable Web Audio states degrade without duplicating graphs', async () => {
  resetJourneyUi();
  const ambience = new ProceduralAmbience();
  await ambience.start(0.68);
  const context = FakeAudioContext.instances.at(-1);
  context.state = 'suspended';
  ambience.setActive(true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(context.state, 'running');
  assert.ok(context.resumeCalls >= 1);
  assert.equal(ambience.getDebugState().graphStarts, 1);

  const savedAudioContext = fakeWindow.AudioContext;
  fakeWindow.AudioContext = undefined;
  const unavailable = new ProceduralAmbience();
  await assert.doesNotReject(() => unavailable.start(0.68));
  assert.equal(unavailable.getDebugState().contextState, 'unavailable');
  assert.equal(unavailable.getDebugState().graphStarts, 0);
  fakeWindow.AudioContext = savedAudioContext;
});
