import {
  DEFAULT_PLAYER_CHARACTER_APPEARANCE,
  type CharacterProfileId,
  type PlayerCharacterAppearance,
  type PlayerCharacterProfile
} from './profile.js';

export const AVATAR_REPRESENTATION_VERSION = 1 as const;
export const AVATAR_ASSET_CONTRACT_VERSION = 'avatar-assets-v1' as const;
export const AVATAR_RIG_CONTRACT_ID = 'humanoid-v1' as const;
export const AVATAR_ANIMATION_VOCABULARY_ID = 'avatar-motion-v1' as const;

export type AvatarBodyFrame = 'light' | 'standard' | 'solid';
export type AvatarSkinTone = 'tone-1' | 'tone-2' | 'tone-3' | 'tone-4' | 'tone-5' | 'tone-6';
export type AvatarHairStyle = 'short' | 'close-cropped' | 'medium' | 'tied-back' | 'shaved';
export type AvatarHairColor = 'black' | 'dark-brown' | 'brown' | 'auburn' | 'blond' | 'grey';
export type AvatarUpperGarment = 'tee' | 'long-sleeve' | 'hoodie';
export type AvatarUpperColor = 'cream' | 'mustard' | 'olive' | 'charcoal' | 'burgundy' | 'navy';
export type AvatarLowerGarment = 'trousers' | 'jeans' | 'cargo';
export type AvatarLowerColor = 'khaki' | 'black' | 'denim' | 'brown' | 'olive';
export type AvatarFootwearStyle = 'default-low-profile';
export type AvatarFootwearColor = 'neutral-dark';

export interface AvatarAppearance {
  body: {
    frame: AvatarBodyFrame;
  };
  skin: {
    tone: AvatarSkinTone;
  };
  hair: {
    style: AvatarHairStyle;
    color: AvatarHairColor;
  };
  clothing: {
    upper: {
      garment: AvatarUpperGarment;
      color: AvatarUpperColor;
    };
    lower: {
      garment: AvatarLowerGarment;
      color: AvatarLowerColor;
    };
    footwear: {
      style: AvatarFootwearStyle;
      color: AvatarFootwearColor;
    };
  };
  accessories: readonly string[];
}

export interface AvatarDefinition {
  version: typeof AVATAR_REPRESENTATION_VERSION;
  characterProfileId: CharacterProfileId;
  appearance: AvatarAppearance;
  assetContractVersion: typeof AVATAR_ASSET_CONTRACT_VERSION;
  rigContractId: typeof AVATAR_RIG_CONTRACT_ID;
  animationVocabularyId: typeof AVATAR_ANIMATION_VOCABULARY_ID;
}

const BODY_FRAME_MAP: Readonly<Record<string, AvatarBodyFrame>> = {
  light: 'light',
  standard: 'standard',
  solid: 'solid'
};
const SKIN_TONE_MAP: Readonly<Record<string, AvatarSkinTone>> = {
  'tone-1': 'tone-1',
  'tone-2': 'tone-2',
  'tone-3': 'tone-3',
  'tone-4': 'tone-4',
  'tone-5': 'tone-5',
  'tone-6': 'tone-6'
};
const HAIR_STYLE_MAP: Readonly<Record<string, AvatarHairStyle>> = {
  short: 'short',
  'close-cropped': 'close-cropped',
  medium: 'medium',
  'tied-back': 'tied-back',
  shaved: 'shaved'
};
const HAIR_COLOR_MAP: Readonly<Record<string, AvatarHairColor>> = {
  black: 'black',
  'dark-brown': 'dark-brown',
  brown: 'brown',
  auburn: 'auburn',
  blond: 'blond',
  grey: 'grey'
};
const UPPER_GARMENT_MAP: Readonly<Record<string, AvatarUpperGarment>> = {
  tee: 'tee',
  'long-sleeve': 'long-sleeve',
  hoodie: 'hoodie'
};
const UPPER_COLOR_MAP: Readonly<Record<string, AvatarUpperColor>> = {
  cream: 'cream',
  mustard: 'mustard',
  olive: 'olive',
  charcoal: 'charcoal',
  burgundy: 'burgundy',
  navy: 'navy'
};
const LOWER_GARMENT_MAP: Readonly<Record<string, AvatarLowerGarment>> = {
  trousers: 'trousers',
  jeans: 'jeans',
  cargo: 'cargo'
};
const LOWER_COLOR_MAP: Readonly<Record<string, AvatarLowerColor>> = {
  khaki: 'khaki',
  black: 'black',
  denim: 'denim',
  brown: 'brown',
  olive: 'olive'
};

function recordOf(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === 'object' ? value as Readonly<Record<string, unknown>> : {};
}

function mapped<T extends string>(map: Readonly<Record<string, T>>, value: unknown, fallback: T): T {
  return typeof value === 'string' && map[value] !== undefined ? map[value]! : fallback;
}

/**
 * Converts current or legacy-like creator appearance data into the canonical
 * renderer-facing semantic appearance. Unknown values fall back per slot, so a
 * future migration never needs to invent renderer state or reject the rest of
 * an otherwise usable appearance record.
 */
export function mapPlayerCharacterAppearanceToAvatar(input: unknown): AvatarAppearance {
  const appearance = recordOf(input);
  return {
    body: {
      frame: mapped(BODY_FRAME_MAP, appearance.bodyFrame, DEFAULT_PLAYER_CHARACTER_APPEARANCE.bodyFrame)
    },
    skin: {
      tone: mapped(SKIN_TONE_MAP, appearance.skinTone, DEFAULT_PLAYER_CHARACTER_APPEARANCE.skinTone)
    },
    hair: {
      style: mapped(HAIR_STYLE_MAP, appearance.hairPreset, DEFAULT_PLAYER_CHARACTER_APPEARANCE.hairPreset),
      color: mapped(HAIR_COLOR_MAP, appearance.hairColor, DEFAULT_PLAYER_CHARACTER_APPEARANCE.hairColor)
    },
    clothing: {
      upper: {
        garment: mapped(UPPER_GARMENT_MAP, appearance.upperClothing, DEFAULT_PLAYER_CHARACTER_APPEARANCE.upperClothing),
        color: mapped(UPPER_COLOR_MAP, appearance.upperColor, DEFAULT_PLAYER_CHARACTER_APPEARANCE.upperColor)
      },
      lower: {
        garment: mapped(LOWER_GARMENT_MAP, appearance.lowerClothing, DEFAULT_PLAYER_CHARACTER_APPEARANCE.lowerClothing),
        color: mapped(LOWER_COLOR_MAP, appearance.lowerColor, DEFAULT_PLAYER_CHARACTER_APPEARANCE.lowerColor)
      },
      footwear: {
        style: 'default-low-profile',
        color: 'neutral-dark'
      }
    },
    accessories: []
  };
}

export function createAvatarDefinition(
  profile: Pick<PlayerCharacterProfile, 'profileId' | 'appearance'>
): AvatarDefinition {
  return {
    version: AVATAR_REPRESENTATION_VERSION,
    characterProfileId: profile.profileId,
    appearance: mapPlayerCharacterAppearanceToAvatar(profile.appearance),
    assetContractVersion: AVATAR_ASSET_CONTRACT_VERSION,
    rigContractId: AVATAR_RIG_CONTRACT_ID,
    animationVocabularyId: AVATAR_ANIMATION_VOCABULARY_ID
  };
}

export type AvatarAnimationState = 'idle' | 'walk' | 'run' | 'crouch' | 'fall' | 'land' | 'interact';

export const AVATAR_ANIMATION_STATES: readonly AvatarAnimationState[] = [
  'idle',
  'walk',
  'run',
  'crouch',
  'fall',
  'land',
  'interact'
] as const;

export const AVATAR_ANIMATION_STATE_CONTRACT = {
  id: AVATAR_ANIMATION_VOCABULARY_ID,
  states: AVATAR_ANIMATION_STATES,
  persisted: false,
  affectsWorldGeneration: false,
  owner: 'future AvatarRuntime'
} as const;

export type AvatarRigJoint =
  | 'root'
  | 'hips'
  | 'spine'
  | 'head'
  | 'left-upper-arm'
  | 'left-hand'
  | 'right-upper-arm'
  | 'right-hand'
  | 'left-upper-leg'
  | 'left-foot'
  | 'right-upper-leg'
  | 'right-foot';

export const AVATAR_REQUIRED_RIG_JOINTS: readonly AvatarRigJoint[] = [
  'root',
  'hips',
  'spine',
  'head',
  'left-upper-arm',
  'left-hand',
  'right-upper-arm',
  'right-hand',
  'left-upper-leg',
  'left-foot',
  'right-upper-leg',
  'right-foot'
] as const;

export const AVATAR_RIG_CONTRACT = {
  id: AVATAR_RIG_CONTRACT_ID,
  family: 'conventional-humanoid',
  requiredJoints: AVATAR_REQUIRED_RIG_JOINTS,
  humanoidRetargetable: true,
  rootMotionPolicy: 'runtime-owned-not-profile-or-save',
  scalePolicy: 'uniform-runtime-scale-only'
} as const;

export type AvatarRepresentationMode = 'FIRST_PERSON' | 'THIRD_PERSON' | 'CINEMATIC' | 'REMOTE';
export type AvatarBodyVisibility = 'hidden' | 'selective' | 'full';

export interface AvatarVisibilityRule {
  mode: AvatarRepresentationMode;
  bodyVisibility: AvatarBodyVisibility;
  headVisible: boolean;
  faceVisible: boolean;
  handsMayBeRendered: boolean;
  addressableByCharacterProfileId: true;
  localCameraClipExclusion: boolean;
}

export const AVATAR_VISIBILITY_RULES: Readonly<Record<AvatarRepresentationMode, AvatarVisibilityRule>> = {
  FIRST_PERSON: {
    mode: 'FIRST_PERSON',
    bodyVisibility: 'selective',
    headVisible: false,
    faceVisible: false,
    handsMayBeRendered: true,
    addressableByCharacterProfileId: true,
    localCameraClipExclusion: true
  },
  THIRD_PERSON: {
    mode: 'THIRD_PERSON',
    bodyVisibility: 'full',
    headVisible: true,
    faceVisible: true,
    handsMayBeRendered: true,
    addressableByCharacterProfileId: true,
    localCameraClipExclusion: false
  },
  CINEMATIC: {
    mode: 'CINEMATIC',
    bodyVisibility: 'full',
    headVisible: true,
    faceVisible: true,
    handsMayBeRendered: true,
    addressableByCharacterProfileId: true,
    localCameraClipExclusion: false
  },
  REMOTE: {
    mode: 'REMOTE',
    bodyVisibility: 'full',
    headVisible: true,
    faceVisible: true,
    handsMayBeRendered: true,
    addressableByCharacterProfileId: true,
    localCameraClipExclusion: false
  }
} as const;

export type AvatarAssetType = 'mesh' | 'image' | 'animation';
export type AvatarNalSupport = 'nal-v1' | 'requires-animation-asset-extension';

export type AvatarAssetSlotKey =
  | 'body.base-mesh'
  | 'rig.humanoid'
  | 'hair.mesh'
  | 'clothing.upper-mesh'
  | 'clothing.lower-mesh'
  | 'clothing.footwear-mesh'
  | 'material.skin'
  | 'material.hair'
  | 'material.upper'
  | 'material.lower'
  | 'material.footwear'
  | 'accessory.mesh'
  | `animation.${AvatarAnimationState}`;

export interface AvatarAssetSlotContract {
  key: AvatarAssetSlotKey;
  label: string;
  assetType: AvatarAssetType;
  nalProfile: string;
  roles: readonly string[];
  required: boolean;
  selectionSource: string;
  nalSupport: AvatarNalSupport;
}

const animationSlot = (state: AvatarAnimationState): AvatarAssetSlotContract => ({
  key: `animation.${state}`,
  label: `${state[0]!.toUpperCase()}${state.slice(1)} animation`,
  assetType: 'animation',
  nalProfile: 'Humanoid Animation Clip',
  roles: ['humanoid-animation', state],
  required: true,
  selectionSource: `animationState.${state}`,
  nalSupport: 'requires-animation-asset-extension'
});

export const AVATAR_ASSET_SLOT_CONTRACTS: readonly AvatarAssetSlotContract[] = [
  { key: 'body.base-mesh', label: 'Body base mesh', assetType: 'mesh', nalProfile: 'Humanoid Body Mesh', roles: ['avatar-body'], required: true, selectionSource: 'appearance.body.frame', nalSupport: 'nal-v1' },
  { key: 'rig.humanoid', label: 'Humanoid rig', assetType: 'mesh', nalProfile: 'Humanoid Rig', roles: ['humanoid-rig'], required: true, selectionSource: 'rigContractId', nalSupport: 'nal-v1' },
  { key: 'hair.mesh', label: 'Hair mesh', assetType: 'mesh', nalProfile: 'Avatar Hair Mesh', roles: ['avatar-hair'], required: true, selectionSource: 'appearance.hair.style', nalSupport: 'nal-v1' },
  { key: 'clothing.upper-mesh', label: 'Upper clothing mesh', assetType: 'mesh', nalProfile: 'Avatar Clothing Mesh', roles: ['avatar-upper-clothing'], required: true, selectionSource: 'appearance.clothing.upper.garment', nalSupport: 'nal-v1' },
  { key: 'clothing.lower-mesh', label: 'Lower clothing mesh', assetType: 'mesh', nalProfile: 'Avatar Clothing Mesh', roles: ['avatar-lower-clothing'], required: true, selectionSource: 'appearance.clothing.lower.garment', nalSupport: 'nal-v1' },
  { key: 'clothing.footwear-mesh', label: 'Footwear mesh', assetType: 'mesh', nalProfile: 'Avatar Clothing Mesh', roles: ['avatar-footwear'], required: true, selectionSource: 'appearance.clothing.footwear.style', nalSupport: 'nal-v1' },
  { key: 'material.skin', label: 'Skin material texture', assetType: 'image', nalProfile: 'Avatar Material Texture', roles: ['avatar-skin-texture'], required: false, selectionSource: 'appearance.skin.tone', nalSupport: 'nal-v1' },
  { key: 'material.hair', label: 'Hair material texture', assetType: 'image', nalProfile: 'Avatar Material Texture', roles: ['avatar-hair-texture'], required: false, selectionSource: 'appearance.hair.color', nalSupport: 'nal-v1' },
  { key: 'material.upper', label: 'Upper clothing material texture', assetType: 'image', nalProfile: 'Avatar Material Texture', roles: ['avatar-upper-texture'], required: false, selectionSource: 'appearance.clothing.upper.color', nalSupport: 'nal-v1' },
  { key: 'material.lower', label: 'Lower clothing material texture', assetType: 'image', nalProfile: 'Avatar Material Texture', roles: ['avatar-lower-texture'], required: false, selectionSource: 'appearance.clothing.lower.color', nalSupport: 'nal-v1' },
  { key: 'material.footwear', label: 'Footwear material texture', assetType: 'image', nalProfile: 'Avatar Material Texture', roles: ['avatar-footwear-texture'], required: false, selectionSource: 'appearance.clothing.footwear.color', nalSupport: 'nal-v1' },
  { key: 'accessory.mesh', label: 'Optional accessory mesh', assetType: 'mesh', nalProfile: 'Avatar Accessory Mesh', roles: ['avatar-accessory'], required: false, selectionSource: 'appearance.accessories', nalSupport: 'nal-v1' },
  ...AVATAR_ANIMATION_STATES.map(animationSlot)
] as const;

const REQUIRED_AVATAR_ASSET_SLOT_KEYS: readonly AvatarAssetSlotKey[] = [
  'body.base-mesh',
  'rig.humanoid',
  'hair.mesh',
  'clothing.upper-mesh',
  'clothing.lower-mesh',
  'clothing.footwear-mesh',
  ...AVATAR_ANIMATION_STATES.map((state) => `animation.${state}` as AvatarAssetSlotKey)
] as const;

export function validateAvatarAssetSlotContracts(
  slots: readonly AvatarAssetSlotContract[] = AVATAR_ASSET_SLOT_CONTRACTS
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    if (seen.has(slot.key)) errors.push(`Duplicate Avatar Asset slot: ${slot.key}`);
    seen.add(slot.key);
    if (slot.label.trim().length === 0) errors.push(`Avatar Asset slot ${slot.key} has no label.`);
    if (slot.nalProfile.trim().length === 0) errors.push(`Avatar Asset slot ${slot.key} has no NAL Profile.`);
    if (slot.roles.length === 0 || slot.roles.some((role) => role.trim().length === 0)) errors.push(`Avatar Asset slot ${slot.key} has invalid role metadata.`);
    if (slot.selectionSource.trim().length === 0) errors.push(`Avatar Asset slot ${slot.key} has no semantic selection source.`);
    if (slot.assetType === 'animation' && slot.nalSupport !== 'requires-animation-asset-extension') errors.push(`Avatar animation slot ${slot.key} must declare the NAL animation extension boundary.`);
    if (slot.assetType !== 'animation' && slot.nalSupport !== 'nal-v1') errors.push(`Avatar Asset slot ${slot.key} must use the current NAL v1 boundary.`);
  }
  for (const requiredKey of REQUIRED_AVATAR_ASSET_SLOT_KEYS) {
    const slot = slots.find((candidate) => candidate.key === requiredKey);
    if (!slot) errors.push(`Missing required Avatar Asset slot: ${requiredKey}`);
    else if (!slot.required) errors.push(`Required Avatar Asset slot is not marked required: ${requiredKey}`);
  }
  return errors;
}

export const AVATAR_CINEMATIC_READINESS_CONTRACT = {
  actorIdentity: 'CharacterProfileId',
  lookup: 'CharacterProfileId -> AvatarRuntime actor',
  sequence: [
    'resolve-actor',
    'position-actor',
    'play-animation',
    'frame-cinematic-camera',
    'attach-dialogue-event'
  ],
  implementedRuntime: false
} as const;

export function playerAppearanceForAvatar(profile: PlayerCharacterProfile): PlayerCharacterAppearance {
  return { ...profile.appearance };
}
