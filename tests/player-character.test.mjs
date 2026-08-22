import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultPlayerCharacterProfile,
  finalizePlayerCharacterProfile,
  randomizePlayerCharacterAppearance,
  validatePlayerCharacterProfile
} from '../.test-dist/src/player-character/profile.js';
import { beginJourneyWithCharacterProfile } from '../.test-dist/src/player-character/newGameFlow.js';
import { LocalPlayerCharacterProfileStore } from '../.test-dist/src/player-character/profileStore.js';
import { migrateSave } from '../.test-dist/src/persistence/types.js';
import { EMPTY_EXPOSURE } from '../.test-dist/src/simulation/timeline.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test('Character Profile identity is stable while appearance remains semantic presentation data', () => {
  const original = createDefaultPlayerCharacterProfile('pcp_test-stable-identity', 100);
  const appearance = randomizePlayerCharacterAppearance(() => 0.99);
  const changed = finalizePlayerCharacterProfile({ ...original, displayName: '  Ada  ', appearance }, 200);
  assert.equal(changed.profileId, original.profileId);
  assert.equal(changed.displayName, 'Ada');
  assert.deepEqual(validatePlayerCharacterProfile(changed), []);
  assert.equal('height' in changed.appearance, false);
  assert.equal('collision' in changed.appearance, false);
});

test('local Character Profile store survives a new store instance independently of Journey saves', () => {
  const storage = new MemoryStorage();
  const firstStore = new LocalPlayerCharacterProfileStore(storage);
  const profile = createDefaultPlayerCharacterProfile('pcp_persisted-profile', 10);
  assert.equal(firstStore.save(profile), true);
  const restartedStore = new LocalPlayerCharacterProfileStore(storage);
  assert.deepEqual(restartedStore.loadActive(), profile);
});

test('invalid Character Profile cannot begin a Journey', () => {
  const invalid = { ...createDefaultPlayerCharacterProfile('pcp_invalid-profile', 10), displayName: '   ' };
  let started = false;
  let saved = false;
  const result = beginJourneyWithCharacterProfile('seed-kept', invalid, { save: () => { saved = true; return true; } }, () => { started = true; }, 20);
  assert.equal(result.ok, false);
  assert.equal(saved, false);
  assert.equal(started, false);
});

test('profile persistence failure blocks Journey creation', () => {
  const profile = createDefaultPlayerCharacterProfile('pcp_storage-failure', 10);
  let started = false;
  const result = beginJourneyWithCharacterProfile('seed-kept', profile, { save: () => false }, () => { started = true; }, 20);
  assert.equal(result.ok, false);
  assert.match(result.error, /No Journey was created/);
  assert.equal(started, false);
});

test('appearance choices do not rewrite the world seed passed into the authoritative New Game path', () => {
  const seed = 'same-world-seed';
  const first = createDefaultPlayerCharacterProfile('pcp_appearance-a', 10);
  const second = { ...createDefaultPlayerCharacterProfile('pcp_appearance-b', 10), appearance: randomizePlayerCharacterAppearance(() => 0.99) };
  const received = [];
  const writer = { save: () => true };
  assert.equal(beginJourneyWithCharacterProfile(seed, first, writer, (value) => received.push(value), 20).ok, true);
  assert.equal(beginJourneyWithCharacterProfile(seed, second, writer, (value) => received.push(value), 20).ok, true);
  assert.deepEqual(received, [seed, seed]);
});

test('pre-profile Journey saves remain loadable without a Character Profile reference', () => {
  const oldJourney = {
    version: 1,
    characterId: 'legacy-journey-character',
    seed: 'legacy-world',
    generationVersion: 'gen2',
    createdAt: 1,
    starterRolled: true,
    position: { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 },
    inventory: [],
    droppedItems: [],
    pickedLootNodeIds: [],
    marks: [],
    hydration: 0.76,
    exposure: structuredClone(EMPTY_EXPOSURE),
    shiftEpochs: {},
    unloadCounts: {},
    discoveredExits: [],
    settings: { sensitivity: 0.095, reducedMotion: false, reducedFlicker: false, masterVolume: 0.68 },
    savedAt: 2
  };
  const migrated = migrateSave(oldJourney);
  assert.ok(migrated);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.seed, 'legacy-world');
  assert.equal('profileId' in migrated, false);
});
