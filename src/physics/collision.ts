export interface CollisionBounds { minX: number; maxX: number; minZ: number; maxZ: number; }

export function resolveCircleAgainstAabbs(currentX: number, currentZ: number, nextX: number, nextZ: number, colliders: readonly CollisionBounds[], radius = 0.34): [number, number] {
  const dx = nextX - currentX; const dz = nextZ - currentZ;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.12));
  let x = currentX; let z = currentZ;
  for (let step = 1; step <= steps; step += 1) {
    const targetX = currentX + dx * step / steps;
    const targetZ = currentZ + dz * step / steps;
    x = sweepAxis(x, z, targetX, colliders, radius, 'x');
    z = sweepAxis(x, z, targetZ, colliders, radius, 'z');
    [x, z] = depenetrate(x, z, colliders, radius);
  }
  return [x, z];
}

function sweepAxis(x: number, z: number, target: number, colliders: readonly CollisionBounds[], radius: number, axis: 'x' | 'z'): number {
  const current = axis === 'x' ? x : z; const delta = target - current;
  if (Math.abs(delta) < 1e-9) return current;
  let result = target;
  for (const collider of colliders) {
    const cross = axis === 'x' ? z : x;
    const crossMin = (axis === 'x' ? collider.minZ : collider.minX) - radius;
    const crossMax = (axis === 'x' ? collider.maxZ : collider.maxX) + radius;
    if (cross <= crossMin + 1e-6 || cross >= crossMax - 1e-6) continue;
    const min = (axis === 'x' ? collider.minX : collider.minZ) - radius;
    const max = (axis === 'x' ? collider.maxX : collider.maxZ) + radius;
    if (delta > 0 && current <= min + 1e-5 && target > min) result = Math.min(result, min - 1e-5);
    else if (delta < 0 && current >= max - 1e-5 && target < max) result = Math.max(result, max + 1e-5);
  }
  return result;
}

function depenetrate(x: number, z: number, colliders: readonly CollisionBounds[], radius: number): [number, number] {
  let resolvedX = x; let resolvedZ = z;
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (const collider of colliders) {
      const minX = collider.minX - radius; const maxX = collider.maxX + radius; const minZ = collider.minZ - radius; const maxZ = collider.maxZ + radius;
      if (resolvedX <= minX || resolvedX >= maxX || resolvedZ <= minZ || resolvedZ >= maxZ) continue;
      const choices = [
        { axis: 'x' as const, value: minX - 1e-4, distance: resolvedX - minX },
        { axis: 'x' as const, value: maxX + 1e-4, distance: maxX - resolvedX },
        { axis: 'z' as const, value: minZ - 1e-4, distance: resolvedZ - minZ },
        { axis: 'z' as const, value: maxZ + 1e-4, distance: maxZ - resolvedZ }
      ].sort((a, b) => a.distance - b.distance);
      const nearest = choices[0]!;
      if (nearest.axis === 'x') resolvedX = nearest.value; else resolvedZ = nearest.value;
      changed = true;
    }
    if (!changed) break;
  }
  return [resolvedX, resolvedZ];
}
