import { parsePlayerCharacterProfile, type PlayerCharacterProfile } from './profile.js';

const PROFILE_STORE_KEY = 'project-noclip-player-profiles-v1';
const PROFILE_STORE_VERSION = 1 as const;

interface ProfileStoreEnvelopeV1 {
  version: typeof PROFILE_STORE_VERSION;
  activeProfileId?: string;
  profiles: Record<string, PlayerCharacterProfile>;
}

export interface CharacterProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function emptyEnvelope(): ProfileStoreEnvelopeV1 {
  return { version: PROFILE_STORE_VERSION, profiles: {} };
}

function resolveBrowserStorage(): CharacterProfileStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function parseEnvelope(raw: string | null): ProfileStoreEnvelopeV1 {
  if (!raw) return emptyEnvelope();
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileStoreEnvelopeV1>;
    if (parsed.version !== PROFILE_STORE_VERSION || !parsed.profiles || typeof parsed.profiles !== 'object') return emptyEnvelope();
    const profiles: Record<string, PlayerCharacterProfile> = {};
    for (const [profileId, value] of Object.entries(parsed.profiles)) {
      const profile = parsePlayerCharacterProfile(value);
      if (profile && profile.profileId === profileId) profiles[profileId] = profile;
    }
    return {
      version: PROFILE_STORE_VERSION,
      activeProfileId: typeof parsed.activeProfileId === 'string' && profiles[parsed.activeProfileId] ? parsed.activeProfileId : undefined,
      profiles
    };
  } catch {
    return emptyEnvelope();
  }
}

export class LocalPlayerCharacterProfileStore {
  constructor(private readonly storage: CharacterProfileStorage | undefined = resolveBrowserStorage()) {}

  loadActive(): PlayerCharacterProfile | undefined {
    if (!this.storage) return undefined;
    try {
      const envelope = parseEnvelope(this.storage.getItem(PROFILE_STORE_KEY));
      const active = envelope.activeProfileId ? envelope.profiles[envelope.activeProfileId] : undefined;
      return active ? structuredClone(active) : undefined;
    } catch {
      return undefined;
    }
  }

  save(profile: PlayerCharacterProfile): boolean {
    if (!this.storage) return false;
    const parsed = parsePlayerCharacterProfile(profile);
    if (!parsed) return false;
    try {
      const envelope = parseEnvelope(this.storage.getItem(PROFILE_STORE_KEY));
      envelope.profiles[parsed.profileId] = structuredClone(parsed);
      envelope.activeProfileId = parsed.profileId;
      this.storage.setItem(PROFILE_STORE_KEY, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }
}

export const PLAYER_CHARACTER_PROFILE_STORAGE_KEY = PROFILE_STORE_KEY;
