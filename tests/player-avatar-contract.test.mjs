import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AVATAR_ANIMATION_STATES,
  AVATAR_ASSET_SLOT_CONTRACTS,
  AVATAR_CINEMATIC_READINESS_CONTRACT,
  AVATAR_REQUIRED_RIG_JOINTS,
  AVATAR_VISIBILITY_RULES,
  createAvatarDefinition,
  mapPlayerCharacterAppearanceToAvatar,
  validateAvatarAssetSlotContracts
} from '../.test-dist/src/player-character/avatar.js';
import {
  createDefaultPlayerCharacterProfile,
  DEFAULT_PLAYER_CHARACTER_APPEARANCE
} from '../.test-dist/src/player-character/profile.js';

test('same Player Character Profile produces the same deterministic Avatar Definition', () => {
  const profile = createDefaultPlayerCharacterProfile('pcp_avatar-stable', 100);
  assert.deepEqual(createAvatarDefinition(profile), createAvatarDefinition(profile));
});

test('Avatar Definition retains CharacterProfileId as actor ownership identity', () => {
  const profile = createDefaultPlayerCharacterProfile('pcp_avatar-owner', 100);
  const avatar = createAvatarDefinition(profile);
  assert.equal(avatar.characterProfileId, profile.profileId);
  assert.equal('characterId' in avatar, false);
  assert.equal('journeyId' in avatar, false);
});

test('changing one creator choice changes only its relevant Avatar appearance slot', () => {
  const profile = createDefaultPlayerCharacterProfile('pcp_avatar-slot-change', 100);
  const original = createAvatarDefinition(profile);
  const changed = createAvatarDefinition({
    ...profile,
    appearance: { ...profile.appearance, upperColor: 'navy' }
  });

  assert.deepEqual(changed.appearance.body, original.appearance.body);
  assert.deepEqual(changed.appearance.skin, original.appearance.skin);
  assert.deepEqual(changed.appearance.hair, original.appearance.hair);
  assert.equal(changed.appearance.clothing.upper.garment, original.appearance.clothing.upper.garment);
  assert.notEqual(changed.appearance.clothing.upper.color, original.appearance.clothing.upper.color);
  assert.deepEqual(changed.appearance.clothing.lower, original.appearance.clothing.lower);
  assert.deepEqual(changed.appearance.clothing.footwear, original.appearance.clothing.footwear);
  assert.deepEqual(changed.appearance.accessories, original.appearance.accessories);
});

test('Journey/world seed metadata does not influence Avatar appearance mapping', () => {
  const profile = createDefaultPlayerCharacterProfile('pcp_avatar-seed-independent', 100);
  const first = createAvatarDefinition({ ...profile, seed: 'world-a', journeyId: 'journey-a' });
  const second = createAvatarDefinition({ ...profile, seed: 'world-b', journeyId: 'journey-b' });
  assert.deepEqual(first, second);
});

test('Avatar mapping does not mutate the Player Character Profile', () => {
  const profile = createDefaultPlayerCharacterProfile('pcp_avatar-no-mutation', 100);
  const before = structuredClone(profile);
  createAvatarDefinition(profile);
  assert.deepEqual(profile, before);
});

test('unrecognized legacy appearance values degrade per slot without erasing valid choices', () => {
  const legacyLike = {
    ...DEFAULT_PLAYER_CHARACTER_APPEARANCE,
    hairPreset: 'legacy-mohawk',
    lowerColor: null,
    upperColor: 'navy'
  };
  const mapped = mapPlayerCharacterAppearanceToAvatar(legacyLike);
  assert.equal(mapped.hair.style, DEFAULT_PLAYER_CHARACTER_APPEARANCE.hairPreset);
  assert.equal(mapped.clothing.lower.color, DEFAULT_PLAYER_CHARACTER_APPEARANCE.lowerColor);
  assert.equal(mapped.clothing.upper.color, 'navy');
  assert.equal(mapped.clothing.footwear.style, 'default-low-profile');
  assert.deepEqual(mapped.accessories, []);
});

test('Avatar Asset-slot contract is complete, semantic, and validates current NAL extension boundaries', () => {
  assert.deepEqual(validateAvatarAssetSlotContracts(), []);
  assert.equal(AVATAR_ASSET_SLOT_CONTRACTS.some((slot) => slot.key === 'body.base-mesh'), true);
  assert.equal(AVATAR_ASSET_SLOT_CONTRACTS.some((slot) => slot.key === 'rig.humanoid'), true);
  assert.equal(AVATAR_ASSET_SLOT_CONTRACTS.some((slot) => slot.key === 'material.skin'), true);
  for (const state of AVATAR_ANIMATION_STATES) {
    const slot = AVATAR_ASSET_SLOT_CONTRACTS.find((candidate) => candidate.key === `animation.${state}`);
    assert.ok(slot);
    assert.equal(slot.assetType, 'animation');
    assert.equal(slot.nalSupport, 'requires-animation-asset-extension');
  }

  const invalid = [
    ...AVATAR_ASSET_SLOT_CONTRACTS,
    { ...AVATAR_ASSET_SLOT_CONTRACTS[0], label: '' }
  ];
  assert.equal(validateAvatarAssetSlotContracts(invalid).some((error) => /Duplicate Avatar Asset slot/.test(error)), true);
  assert.equal(validateAvatarAssetSlotContracts(invalid).some((error) => /has no label/.test(error)), true);
});

test('humanoid rig, animation, visibility, and cinematic vocabulary expose the required future contract', () => {
  for (const joint of ['root', 'hips', 'spine', 'head', 'left-hand', 'right-hand', 'left-foot', 'right-foot']) {
    assert.equal(AVATAR_REQUIRED_RIG_JOINTS.includes(joint), true);
  }
  assert.deepEqual(AVATAR_ANIMATION_STATES, ['idle', 'walk', 'run', 'crouch', 'fall', 'land', 'interact']);
  assert.equal(AVATAR_VISIBILITY_RULES.FIRST_PERSON.headVisible, false);
  assert.equal(AVATAR_VISIBILITY_RULES.FIRST_PERSON.faceVisible, false);
  assert.equal(AVATAR_VISIBILITY_RULES.FIRST_PERSON.bodyVisibility, 'selective');
  assert.equal(AVATAR_VISIBILITY_RULES.THIRD_PERSON.bodyVisibility, 'full');
  assert.equal(AVATAR_VISIBILITY_RULES.CINEMATIC.addressableByCharacterProfileId, true);
  assert.equal(AVATAR_VISIBILITY_RULES.REMOTE.addressableByCharacterProfileId, true);
  assert.equal(AVATAR_CINEMATIC_READINESS_CONTRACT.actorIdentity, 'CharacterProfileId');
  assert.deepEqual(AVATAR_CINEMATIC_READINESS_CONTRACT.sequence, [
    'resolve-actor',
    'position-actor',
    'play-animation',
    'frame-cinematic-camera',
    'attach-dialogue-event'
  ]);
});

test('Avatar representation module has no live renderer or PlayCanvas runtime dependency', () => {
  const source = readFileSync(new URL('../src/player-character/avatar.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]playcanvas['"]/);
  assert.doesNotMatch(source, /src\/renderer|\.\.\/renderer|WorldRenderer|ProjectNoclipGame/);
});
