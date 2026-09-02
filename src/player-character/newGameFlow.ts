import { finalizePlayerCharacterProfile, validatePlayerCharacterProfile, type PlayerCharacterProfile } from './profile.js';

export interface CharacterProfileWriter {
  save(profile: PlayerCharacterProfile): boolean;
}

export interface BeginJourneySuccess {
  ok: true;
  profile: PlayerCharacterProfile;
}

export interface BeginJourneyFailure {
  ok: false;
  error: string;
}

export type BeginJourneyResult = BeginJourneySuccess | BeginJourneyFailure;

export function beginJourneyWithCharacterProfile(
  seed: string,
  draft: PlayerCharacterProfile,
  profileStore: CharacterProfileWriter,
  startJourney: (seed: string) => void,
  now = Date.now()
): BeginJourneyResult {
  const profile = finalizePlayerCharacterProfile(draft, now);
  const errors = validatePlayerCharacterProfile(profile);
  if (errors.length > 0) return { ok: false, error: errors[0]! };
  if (!profileStore.save(profile)) return { ok: false, error: 'Character Profile could not be saved locally. No Journey was created.' };
  startJourney(seed);
  return { ok: true, profile };
}
