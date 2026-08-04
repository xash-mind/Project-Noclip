import type { NoteSpec } from './types.js';

export const NOTE_LIBRARY = {
  manila: {
    title: 'The Manila Ledger',
    body: `DAY UNKNOWN

The room is smaller every time I remember it.

The table stays. The book stays. People do not.

If you are reading this, do not mistake the quiet for safety. Wait if you need to. Leave before the lights decide for you.

— M.`
  },
  wetFloor: {
    title: 'Facilities Memo 0-17',
    body: `Do not drink from the carpet.

This instruction has been repeated because the previous copies keep disappearing.

The outlets are not grounded. The humming is not a maintenance request.`
  },
  margin: {
    title: 'Margin Test',
    body: `I marked the same wall on three different days.

The first mark returned behind me.
The second was written in my handwriting, but I did not remember making it.
The third said STOP COUNTING.`
  },
  utility: {
    title: 'Utility Notice',
    body: `Circuit B is scheduled for replacement.

There is no Circuit A on the plan.
There is no plan attached.
There is no date on this notice.`
  },
  warning: {
    title: 'Folded Warning',
    body: `The green light is useful.

The green light is also visible from very far away.

Decide which matters more before you crack it.`
  }
} as const;

export function makeNote(id: string, key: keyof typeof NOTE_LIBRARY, x: number, z: number, source: NoteSpec['source']): NoteSpec {
  const note = NOTE_LIBRARY[key];
  const y = source === 'manila-book' ? 0.94 : 0.018;
  return { id, title: note.title, body: note.body, localPosition: { x, y, z }, source };
}
