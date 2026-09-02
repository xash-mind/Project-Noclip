# Player Avatar Representation Contract

## Purpose

This contract is the renderer-independent bridge between the existing Player Character Profile and a future visible player actor.

```text
PlayerCharacterProfile
  -> AvatarAppearance
  -> AvatarDefinition
  -> AvatarRuntime [FUTURE]
```

`src/player-character/avatar.ts` owns the semantic mapping and future runtime requirements. It does not create PlayCanvas entities, alter the camera, affect movement/collision, participate in world generation, or add live animation.

## Identity law

These identities remain separate:

- `PlayerCharacterProfile` = who the human character is.
- `CharacterProfileId` = stable future actor identity and lookup key.
- Journey = one deterministic world experience.
- World seed = Generation 3 world identity.
- Item Instance identity = independent persistent object identity.

`AvatarDefinition.characterProfileId` is copied directly from the profile. Journey identifiers and world seeds are not inputs to avatar mapping and must not influence appearance.

## Canonical appearance

The current Character Creator maps one-to-one into semantic avatar slots:

| Character Profile choice | Avatar slot |
| --- | --- |
| `bodyFrame` | `body.frame` |
| `skinTone` | `skin.tone` |
| `hairPreset` | `hair.style` |
| `hairColor` | `hair.color` |
| `upperClothing` | `clothing.upper.garment` |
| `upperColor` | `clothing.upper.color` |
| `lowerClothing` | `clothing.lower.garment` |
| `lowerColor` | `clothing.lower.color` |

The current creator does not expose footwear or accessories. The representation therefore preserves the creator unchanged and supplies a neutral semantic footwear default plus an empty accessory list. A future creator revision may expose those slots without changing the actor-identity law.

Unknown or legacy-like appearance values degrade independently to the current profile default for that slot. A bad hair value, for example, does not erase valid clothing choices. Mapping is pure and does not mutate the profile.

## AvatarDefinition

`AvatarDefinition` is plain serializable data containing:

- representation version;
- `CharacterProfileId` actor ownership;
- canonical `AvatarAppearance`;
- Asset-contract version;
- humanoid-rig contract ID;
- animation-vocabulary ID.

It intentionally contains no PlayCanvas entity, animation controller, camera state, collision body, Cell/Region identity, Journey ID, world seed, or transient animation state.

## Asset-slot contract

Future Avatar Runtime resolves semantic slots instead of hard-coded filenames. Required/optional slots cover:

- body/base mesh;
- humanoid rig;
- hair mesh;
- upper/lower/footwear meshes;
- optional skin/hair/clothing material textures;
- optional accessory mesh;
- one humanoid animation clip for each canonical animation state.

Every slot declares a semantic key, NAL Profile, roles, requiredness, and the representation field that selects it.

Current NAL v1 supports `mesh` and `image` assets needed by the non-animation slots. NAL does not yet expose an animation-clip Asset type, so animation slots explicitly declare `requires-animation-asset-extension`. This run does not widen the global NAL schema or import an avatar Asset pack merely to hide that future dependency.

## Rig contract

The minimum future rig is conventional and humanoid-retargetable. Required semantic joints are:

- root;
- hips/pelvis;
- spine;
- head;
- left/right upper arm and hand;
- left/right upper leg and foot.

Root motion is runtime-owned and is not profile/save identity. Runtime scale, if used, must be uniform; the representation contract does not change player collision dimensions.

## Animation vocabulary

The canonical semantic states are:

```text
idle
walk
run
crouch
fall
land
interact
```

These are future Avatar Runtime presentation states. They are not persisted identity, do not enter world generation, and do not change Journey determinism.

## Camera / visibility modes

### FIRST_PERSON

- selective local body visibility;
- head and face excluded to prevent local camera clipping;
- hands/body may later be selectively rendered;
- actor remains addressable by `CharacterProfileId`.

### THIRD_PERSON

- full avatar visible;
- head/face visible;
- no third-person camera is implemented by this contract.

### CINEMATIC

- canonical full avatar visible;
- actor addressable by `CharacterProfileId`;
- no Cinematic Mode or sequence system is implemented here.

### REMOTE

- future multiplayer-facing full actor representation;
- identity mapping remains `CharacterProfileId`-based;
- no networking or replication is implemented here.

## Cinematic readiness

The contract makes the future sequence boundary explicit:

```text
CharacterProfileId
  -> resolve AvatarRuntime actor
  -> position actor
  -> play semantic animation
  -> frame with cinematic camera
  -> attach dialogue/speech-bubble event
```

The sequence engine, camera behavior, dialogue presentation, and live actor registry remain future work.

## Deferred Avatar Runtime work

This foundation deliberately defers:

- actual avatar meshes/materials/animation Asset imports;
- NAL animation-clip support;
- PlayCanvas `AvatarRuntime` entity creation and lifecycle;
- skeleton binding/retargeting and animation controller implementation;
- live first-person selective-body rendering;
- third-person camera/runtime mode;
- Cinematic Mode and sequence orchestration;
- speech bubble/dialogue runtime attachment;
- remote/multiplayer actor replication;
- any WorldRenderer participation integration;
- any movement, collision, streaming, M-F1, StaticWorldBatching, or save-identity changes.
