export const PLAYER_CHARACTER_PROFILE_VERSION = 1 as const;
export const PLAYER_CHARACTER_NAME_MAX_LENGTH = 32;

export const BODY_FRAME_OPTIONS = [
  { id: 'light', label: 'Light frame' },
  { id: 'standard', label: 'Standard frame' },
  { id: 'solid', label: 'Solid frame' }
] as const;

export const SKIN_TONE_OPTIONS = [
  { id: 'tone-1', label: 'Tone 1', swatch: '#f2d2bd' },
  { id: 'tone-2', label: 'Tone 2', swatch: '#d9aa83' },
  { id: 'tone-3', label: 'Tone 3', swatch: '#bd835f' },
  { id: 'tone-4', label: 'Tone 4', swatch: '#966044' },
  { id: 'tone-5', label: 'Tone 5', swatch: '#70452f' },
  { id: 'tone-6', label: 'Tone 6', swatch: '#4b2c20' }
] as const;

export const HAIR_PRESET_OPTIONS = [
  { id: 'short', label: 'Short' },
  { id: 'close-cropped', label: 'Close cropped' },
  { id: 'medium', label: 'Medium' },
  { id: 'tied-back', label: 'Tied back' },
  { id: 'shaved', label: 'Shaved' }
] as const;

export const HAIR_COLOR_OPTIONS = [
  { id: 'black', label: 'Black', swatch: '#171512' },
  { id: 'dark-brown', label: 'Dark brown', swatch: '#33241b' },
  { id: 'brown', label: 'Brown', swatch: '#5a3b28' },
  { id: 'auburn', label: 'Auburn', swatch: '#743c27' },
  { id: 'blond', label: 'Blond', swatch: '#bda66b' },
  { id: 'grey', label: 'Grey', swatch: '#88857d' }
] as const;

export const UPPER_CLOTHING_OPTIONS = [
  { id: 'tee', label: 'T-shirt' },
  { id: 'long-sleeve', label: 'Long sleeve' },
  { id: 'hoodie', label: 'Hoodie' }
] as const;

export const UPPER_COLOR_OPTIONS = [
  { id: 'cream', label: 'Cream', swatch: '#d5c99b' },
  { id: 'mustard', label: 'Mustard', swatch: '#a88d43' },
  { id: 'olive', label: 'Olive', swatch: '#666748' },
  { id: 'charcoal', label: 'Charcoal', swatch: '#44443f' },
  { id: 'burgundy', label: 'Burgundy', swatch: '#673d42' },
  { id: 'navy', label: 'Navy', swatch: '#3d4757' }
] as const;

export const LOWER_CLOTHING_OPTIONS = [
  { id: 'trousers', label: 'Trousers' },
  { id: 'jeans', label: 'Jeans' },
  { id: 'cargo', label: 'Cargo trousers' }
] as const;

export const LOWER_COLOR_OPTIONS = [
  { id: 'khaki', label: 'Khaki', swatch: '#8b8060' },
  { id: 'black', label: 'Black', swatch: '#292927' },
  { id: 'denim', label: 'Denim', swatch: '#4f6072' },
  { id: 'brown', label: 'Brown', swatch: '#594b3b' },
  { id: 'olive', label: 'Olive', swatch: '#5a6048' }
] as const;

type OptionId<T extends readonly { id: string }[]> = T[number]['id'];

export type CharacterProfileId = string;

export interface PlayerCharacterAppearance {
  bodyFrame: OptionId<typeof BODY_FRAME_OPTIONS>;
  skinTone: OptionId<typeof SKIN_TONE_OPTIONS>;
  hairPreset: OptionId<typeof HAIR_PRESET_OPTIONS>;
  hairColor: OptionId<typeof HAIR_COLOR_OPTIONS>;
  upperClothing: OptionId<typeof UPPER_CLOTHING_OPTIONS>;
  upperColor: OptionId<typeof UPPER_COLOR_OPTIONS>;
  lowerClothing: OptionId<typeof LOWER_CLOTHING_OPTIONS>;
  lowerColor: OptionId<typeof LOWER_COLOR_OPTIONS>;
}

export interface PlayerCharacterProfile {
  version: typeof PLAYER_CHARACTER_PROFILE_VERSION;
  profileId: CharacterProfileId;
  displayName: string;
  appearance: PlayerCharacterAppearance;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_PLAYER_CHARACTER_APPEARANCE: PlayerCharacterAppearance = {
  bodyFrame: 'standard',
  skinTone: 'tone-3',
  hairPreset: 'short',
  hairColor: 'dark-brown',
  upperClothing: 'tee',
  upperColor: 'cream',
  lowerClothing: 'trousers',
  lowerColor: 'khaki'
};

function includesId<T extends readonly { id: string }[]>(options: T, value: unknown): value is OptionId<T> {
  return typeof value === 'string' && options.some((option) => option.id === value);
}

function finiteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function createCharacterProfileId(): CharacterProfileId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `pcp_${crypto.randomUUID()}`;
  return `pcp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function createDefaultPlayerCharacterProfile(
  profileId: CharacterProfileId = createCharacterProfileId(),
  now = Date.now()
): PlayerCharacterProfile {
  return {
    version: PLAYER_CHARACTER_PROFILE_VERSION,
    profileId,
    displayName: 'Wanderer',
    appearance: { ...DEFAULT_PLAYER_CHARACTER_APPEARANCE },
    createdAt: now,
    updatedAt: now
  };
}

export function validatePlayerCharacterProfile(profile: PlayerCharacterProfile): string[] {
  const errors: string[] = [];
  const name = profile.displayName.trim();
  if (profile.version !== PLAYER_CHARACTER_PROFILE_VERSION) errors.push('Unsupported Character Profile version.');
  if (!profile.profileId.startsWith('pcp_') || profile.profileId.length < 8) errors.push('Character Profile ID is invalid.');
  if (name.length === 0) errors.push('Character name is required.');
  if (name.length > PLAYER_CHARACTER_NAME_MAX_LENGTH) errors.push(`Character name must be ${PLAYER_CHARACTER_NAME_MAX_LENGTH} characters or fewer.`);
  if (!finiteTimestamp(profile.createdAt) || !finiteTimestamp(profile.updatedAt) || profile.updatedAt < profile.createdAt) errors.push('Character Profile timestamps are invalid.');
  if (!includesId(BODY_FRAME_OPTIONS, profile.appearance.bodyFrame)) errors.push('Body frame is invalid.');
  if (!includesId(SKIN_TONE_OPTIONS, profile.appearance.skinTone)) errors.push('Skin tone is invalid.');
  if (!includesId(HAIR_PRESET_OPTIONS, profile.appearance.hairPreset)) errors.push('Hair preset is invalid.');
  if (!includesId(HAIR_COLOR_OPTIONS, profile.appearance.hairColor)) errors.push('Hair colour is invalid.');
  if (!includesId(UPPER_CLOTHING_OPTIONS, profile.appearance.upperClothing)) errors.push('Upper clothing preset is invalid.');
  if (!includesId(UPPER_COLOR_OPTIONS, profile.appearance.upperColor)) errors.push('Upper clothing colour is invalid.');
  if (!includesId(LOWER_CLOTHING_OPTIONS, profile.appearance.lowerClothing)) errors.push('Lower clothing preset is invalid.');
  if (!includesId(LOWER_COLOR_OPTIONS, profile.appearance.lowerColor)) errors.push('Lower clothing colour is invalid.');
  return errors;
}

export function parsePlayerCharacterProfile(input: unknown): PlayerCharacterProfile | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const candidate = input as PlayerCharacterProfile;
  if (!candidate.appearance || typeof candidate.appearance !== 'object') return undefined;
  const profile: PlayerCharacterProfile = {
    version: candidate.version,
    profileId: candidate.profileId,
    displayName: candidate.displayName,
    appearance: { ...candidate.appearance },
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt
  };
  return validatePlayerCharacterProfile(profile).length === 0 ? profile : undefined;
}

export function finalizePlayerCharacterProfile(profile: PlayerCharacterProfile, now = Date.now()): PlayerCharacterProfile {
  return {
    ...profile,
    displayName: profile.displayName.trim(),
    appearance: { ...profile.appearance },
    updatedAt: Math.max(now, profile.createdAt)
  };
}

function pickId<T extends readonly { id: string }[]>(options: T, random: () => number): OptionId<T> {
  const index = Math.min(options.length - 1, Math.max(0, Math.floor(random() * options.length)));
  return options[index].id as OptionId<T>;
}

export function randomizePlayerCharacterAppearance(random: () => number = Math.random): PlayerCharacterAppearance {
  return {
    bodyFrame: pickId(BODY_FRAME_OPTIONS, random),
    skinTone: pickId(SKIN_TONE_OPTIONS, random),
    hairPreset: pickId(HAIR_PRESET_OPTIONS, random),
    hairColor: pickId(HAIR_COLOR_OPTIONS, random),
    upperClothing: pickId(UPPER_CLOTHING_OPTIONS, random),
    upperColor: pickId(UPPER_COLOR_OPTIONS, random),
    lowerClothing: pickId(LOWER_CLOTHING_OPTIONS, random),
    lowerColor: pickId(LOWER_COLOR_OPTIONS, random)
  };
}
