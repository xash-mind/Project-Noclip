# AI Image Reference Prompt

Copy this prompt into any capable AI, replace the placeholders, and provide the image URL. The AI should return a Markdown reference entry ready to paste into the appropriate Project Noclip reference pack.

```text
You are creating a visual-reference entry for Project Noclip, a Backrooms game.

IMAGE URL:
[PASTE IMAGE URL HERE]

APPLIES TO:
[Level / Region / Structure / Material / Condition / Feature / Transition — e.g. Level 0 / Arch Rooms]

OPTIONAL CONTEXT:
[Any context I know about the image, source, area name, or what I think it depicts. Leave blank if none.]

SOURCE TIER IF ALREADY KNOWN:
[A — authoritative/source material | B — strong secondary reference | C — real-world inspiration | D — mood-only | UNKNOWN]

Your job:
1. Open and inspect the image itself if you are able to access the URL.
2. Identify the original source/provenance if reasonably possible from the URL/page. Do not invent provenance.
3. Analyze only what is visually supported. Do not hallucinate unseen geometry, hidden rooms, materials, history, lore, or audio.
4. Treat names as labels, not geometry. Never turn a name such as "Arch Rooms" into literal freestanding arches unless the image evidence actually supports that structure.
5. Separate direct evidence from game-design interpretation.
6. Explicitly state tempting interpretations that the image does NOT support.
7. If the image is inaccessible, too low quality, or provenance cannot be established, say so and mark confidence appropriately. Do not pretend you inspected it.
8. Do NOT write an essay or explanation outside the requested Markdown. Return only the ready-to-paste Markdown entry.

Use exactly this output structure:

## REF-[suggest a short stable ID] — [short descriptive label]

**Image URL:** [the supplied URL]  
**Source/site:** [site/creator if verifiable; otherwise Unknown]  
**Source tier:** [A | B | C | D | Unverified]  
**Applies to:** [supplied target]  
**Confidence:** [High | Medium | Low | Unverified]

### What the image directly shows

- [observable fact]
- [observable fact]
- [observable fact]

### Spatial / architectural grammar

- **Overall proportions:** [visible evidence only]
- **Walls / dividers / partitions:** [visible construction and arrangement]
- **Openings:** [shape, framing, placement]
- **Glass / windows:** [visible evidence or Not visible]
- **Columns / supports:** [visible evidence or Not visible]
- **Ceiling:** [height cues, grid, fixtures, services]
- **Floor:** [surface, pattern, wear]
- **Doors / thresholds:** [visible evidence or Not visible]
- **Repetition / variation:** [what repeats and what varies]

### Materials and surface character

- **Walls:** [visible finish/material or uncertain]
- **Floor:** [visible finish/material or uncertain]
- **Ceiling:** [visible finish/material or uncertain]
- **Trim / frames / metal / glass:** [visible details]
- **Wear / damp / stains / damage:** [visible condition]

### Lighting grammar

- **Fixture type/layout:** [visible facts]
- **Brightness / contrast:** [visible facts]
- **Color/temperature:** [only if reasonably supported]
- **Shadow character:** [visible facts]
- **Dark areas / falloff:** [visible behavior]

### Signature details this reference supports

- [important motif]
- [important motif]

### Things this image does NOT support

- [unsupported interpretation]
- [unsupported geometry/detail that should not be invented]

### Classification

**Source-supported:**
- [facts directly evidenced]

**Interpretation for Project Noclip:**
- [reasonable adaptation clearly marked as interpretation]

**Invented:**
- [anything proposed without direct evidence, or None]

### Caveats

- [camera distortion, crop, incomplete view, uncertain source, conflicts, etc.]

### Implementation relevance

- [what a world-generation/visual agent should preserve]
- [what should be compared against gameplay screenshots during fidelity QA]

Before returning the Markdown, silently check that every claim is either directly visible, source-verified, or explicitly marked as interpretation/uncertain. Do not infer audio from a still image.
```
