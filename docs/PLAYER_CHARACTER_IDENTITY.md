# Player Character Identity

## Ownership

Player Character identity is local presentation identity and is distinct from a Journey and its deterministic world seed.

```text
PlayerCharacterProfile
  -> who the player is
  -> src/player-character/profile.ts
  -> local profile persistence in src/player-character/profileStore.ts

Journey
  -> one deterministic save/world experience
  -> src/persistence/* + ProjectNoclipGame

World seed
  -> deterministic world identity used by generation
  -> unchanged by Player Character appearance
```

`CharacterProfileId` is the stable future-facing human actor reference. The existing Journey `characterId` remains untouched in Dev.9.7 because it already participates in Journey-local inventory/starter identity. This run does not reinterpret it as a Player Character Profile ID.

## New Game flow

Before Dev.9.7:

```text
Title / seed
  -> GameUI onNewGame(seed)
  -> ProjectNoclipGame.startNew(seed)
  -> create SaveData v2 + Journey-local characterId
  -> roll starter items
  -> save Journey
  -> launch Level 0
```

After Dev.9.7:

```text
Title / New Game / seed
  -> Character Creator
  -> validate PlayerCharacterProfile
  -> persist local Player Character Profile
  -> existing GameUI onNewGame(seed)
  -> existing ProjectNoclipGame.startNew(seed)
  -> create/save Journey exactly as before
  -> launch Level 0
```

Opening the Character Creator does not create or overwrite a Journey. Back discards the unsaved creator draft and returns to the title screen.

## Profile schema v1

A Player Character Profile contains:

- `version: 1`
- stable `profileId` (`pcp_...`)
- `displayName`
- semantic appearance data:
  - body/frame preset
  - skin tone
  - hair preset
  - hair colour
  - upper-clothing preset and colour
  - lower-clothing preset and colour
- `createdAt`
- `updatedAt`

Appearance has no height, collision, renderer object, DOM object, seed, Region, Cell, Feature, or world-generation state.

## Storage

Profiles use the separate local key:

```text
project-noclip-player-profiles-v1
```

The envelope is versioned and can hold multiple profiles even though the initial creator edits/restores only the active profile. A valid profile must be written successfully before the existing Journey creation callback is invoked.

Journey save schema remains v2. No Player Character field was added to SaveData in this run. Existing saves therefore continue through the unchanged migration/load path without requiring a profile.

## Creator scope

The initial creator supports character name, body/frame, skin tone, hair preset/colour, upper clothing/colour, lower clothing/colour, Randomize, Reset, Back, and Begin Journey. Its preview is deliberately a simple DOM/CSS mannequin.

The mannequin is not an in-world player Representation. Dev.9.8 introduces the renderer-independent contract in `src/player-character/avatar.ts` and `docs/PLAYER_AVATAR_REPRESENTATION.md`:

```text
PlayerCharacterProfile
  -> AvatarAppearance
  -> AvatarDefinition
  -> AvatarRuntime [FUTURE]
```

The mapping preserves `CharacterProfileId` as actor ownership and does not add Journey/world-seed identity, renderer state, collision dimensions, camera state, or live animation to the profile. Future avatar, mirror, multiplayer, third-person, and Cinematic Mode work should resolve the actor by `CharacterProfileId` through this contract rather than reinterpret Journey-local `characterId`.
