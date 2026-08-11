# Reference Entry Template

Use one entry per distinct visual reference. These entries are intended to be pasted into a Level/Region/Structure reference pack under `docs/references/`.

```md
## REF-[ID] — [short descriptive label]

**Image URL:** [URL]  
**Source/site:** [site or creator if known]  
**Source tier:** [A — authoritative/source material | B — strong secondary reference | C — real-world inspiration | D — mood-only]  
**Applies to:** [Level / Region / Structure / Material / Condition / Feature / Transition]  
**Retrieved/checked:** [YYYY-MM-DD]  
**Confidence:** [High | Medium | Low | Unverified]

### What the image directly shows

- [observable fact]
- [observable fact]
- [observable fact]

### Spatial / architectural grammar

- **Overall proportions:** [what is visibly supported]
- **Walls / dividers / partitions:** [construction and arrangement]
- **Openings:** [shape, framing, placement]
- **Glass / windows:** [if visible]
- **Columns / supports:** [if visible]
- **Ceiling:** [height, grid, fixtures, services]
- **Floor:** [surface, pattern, wear]
- **Doors / thresholds:** [if visible]
- **Repetition / variation:** [what repeats and what varies]

### Materials and surface character

- **Walls:** [visible finish/material]
- **Floor:** [visible finish/material]
- **Ceiling:** [visible finish/material]
- **Trim / frames / metal / glass:** [visible details]
- **Wear / damp / stains / damage:** [visible condition]

### Lighting grammar

- **Fixture type/layout:** [visible facts]
- **Brightness / contrast:** [visible facts]
- **Color/temperature:** [only if reasonably supported by the image]
- **Shadow character:** [soft/hard/flat/etc.]
- **Dark areas / falloff:** [visible behavior]

### Signature details this reference supports

- [important motif]
- [important motif]

### Things this image does NOT support

- [tempting but unsupported interpretation]
- [geometry or detail that should not be invented from the label alone]

### Classification

**Source-supported:**
- [facts directly evidenced by this image/source]

**Interpretation for Project Noclip:**
- [reasonable adaptation, clearly marked as interpretation]

**Invented:**
- [anything proposed without direct evidence; write `None` if none]

### Caveats

- [camera distortion, incomplete view, uncertain provenance, conflicting references, etc.]

### Implementation relevance

- [what an agent should preserve when generating this content]
- [what should be compared in screenshots during fidelity QA]
```

## Rules

- Describe only what can actually be observed or verified.
- Do not convert a text label into geometry. Names are not geometry.
- Do not infer hidden room layout from a single viewpoint.
- Do not infer audio from a still image.
- Do not treat fan art, renders, Pinterest reposts, or unsourced images as authoritative without provenance.
- If provenance or the image itself cannot be verified, mark the entry `Unverified` rather than guessing.
- When several images depict the same area, use them together to derive the valid range of appearances instead of copying one image literally.
