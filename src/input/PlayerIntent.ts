export interface MovementIntent {
  forward: number;
  strafe: number;
  sprinting: boolean;
  crouching: boolean;
}

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

/**
 * Device-neutral player movement intent.
 *
 * Keyboard and touch update this state, while simulation/collision code consumes
 * only the resulting intent. No world or persistence logic depends on the input
 * device that produced it.
 */
export class PlayerIntent {
  private readonly keys = new Set<string>();
  private touchForward = 0;
  private touchStrafe = 0;

  keyDown(code: string): void { this.keys.add(code); }
  keyUp(code: string): void { this.keys.delete(code); }

  setTouchMovement(forward: number, strafe: number): void {
    const clampedForward = clampUnit(forward);
    const clampedStrafe = clampUnit(strafe);
    const length = Math.hypot(clampedForward, clampedStrafe);
    const scale = length > 1 ? 1 / length : 1;
    this.touchForward = clampedForward * scale;
    this.touchStrafe = clampedStrafe * scale;
  }

  clearKeyboard(): void { this.keys.clear(); }
  clearTouch(): void { this.touchForward = 0; this.touchStrafe = 0; }
  clearAll(): void { this.clearKeyboard(); this.clearTouch(); }

  movement(): MovementIntent {
    const keyboardForward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const keyboardStrafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    return {
      forward: clampUnit(keyboardForward + this.touchForward),
      strafe: clampUnit(keyboardStrafe + this.touchStrafe),
      crouching: this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC'),
      sprinting: (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && !(this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC'))
    };
  }
}
