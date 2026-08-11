# Level 0 Reference Prompt Template

Copy this prompt into any AI that can open and inspect the supplied image URL. Fill only the four fields at the top.

```text
You are analyzing one visual reference for Project Noclip's Level 0 evidence ledger.

URL:
[PASTE IMAGE URL]

APPLIES TO:
[Level / Region / Variant / Geometry / Material / Condition / Feature / Structure / Carver / Anomaly / Entity / Item / Transition — be as specific as you can]

CONTEXT:
[Anything I know about what this is, where it came from, what area it depicts, or why I think it matters. Leave blank if none.]

SOURCE TIER:
[A — authoritative/source material | B — strong secondary reference | C — real-world inspiration | D — mood-only | UNKNOWN]

Inspect the image itself. If you cannot actually access or inspect it, do not pretend you can: return an entry marked Unverified and explain the limitation in Caveats.

Analyze only what the image/source supports. Do not infer unseen geometry, hidden rooms, lore, history, audio, or game mechanics. Names are labels, not geometry. In particular, a label such as "Arch Rooms" is not evidence for freestanding literal arches.

Return ONLY one Markdown entry ready to append to `docs/references/level-0/REFERENCES.md` using exactly this structure:

## REF-L0-[suggest a short unique ID] — [short descriptive label]

**Processing status:** UNPROCESSED  
**URL:** [supplied URL]  
**Applies to:** [supplied target]  
**Context:** [supplied context or None]  
**Source tier:** [A | B | C | D | Unverified]  
**Source/site:** [verifiable site/creator/original source if known; otherwise Unknown]  
**Confidence:** [High | Medium | Low | Unverified]

### Directly supported observations

- [observable/source-verifiable fact]
- [observable/source-verifiable fact]
- [observable/source-verifiable fact]

### Spatial and architectural evidence

- **Scale/proportions:** [visible evidence only]
- **Walls/dividers/partitions:** [visible construction and arrangement]
- **Openings:** [shape, framing, placement]
- **Glass/windows:** [visible evidence or Not visible]
- **Columns/supports:** [visible evidence or Not visible]
- **Ceiling:** [height cues, grid, fixtures, services]
- **Floor:** [surface, pattern, wear]
- **Doors/thresholds:** [visible evidence or Not visible]
- **Repetition/variation:** [what repeats and what varies]

### Materials, condition and lighting

- **Walls:** [visible finish/material or uncertain]
- **Floor:** [visible finish/material or uncertain]
- **Ceiling:** [visible finish/material or uncertain]
- **Trim/frames/metal/glass:** [visible details]
- **Wear/damp/stains/damage:** [visible condition]
- **Lighting/fixtures:** [visible facts]
- **Brightness/contrast/falloff:** [visible facts]
- **Color/temperature:** [only when reasonably supported]

### Signature details supported by this reference

- [motif/detail]
- [motif/detail]

### This reference does NOT support

- [tempting but unsupported interpretation]
- [geometry/detail that must not be invented from the label]

### Project Noclip interpretation

**Source-supported:**
- [facts directly supported by evidence]

**Reasonable interpretation:**
- [game adaptation clearly marked as interpretation]

**Invented:**
- [anything proposed without evidence, or None]

### Caveats / conflicts

- [crop, camera distortion, uncertain provenance, low quality, conflicting reference, etc.]

### Promotion candidates

List only durable conclusions that a future Reference update agent should consider propagating into `WORLD.md`, an implementation Issue, or another normal orientation surface. Do not decide canon yourself if the evidence is weak or conflicting.

- [candidate durable conclusion]
- [candidate durable conclusion]

Before returning the entry, silently verify that every claim is directly visible/source-verified or clearly labeled as interpretation/uncertain. Do not infer audio from a still image.
```
