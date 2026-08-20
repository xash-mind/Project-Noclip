import 'playcanvas';

declare module 'playcanvas' {
  interface BoundingSphere {
    center: { set(x: number, y: number, z: number): void };
    radius: number;
  }

  interface Frustum {
    containsSphere(sphere: BoundingSphere): number;
  }

  const Vec3: { new (): unknown };
  const BoundingSphere: { new (center?: unknown, radius?: number): BoundingSphere };

  interface StandardMaterial {
    clone(): StandardMaterial;
  }
  interface Entity {
    getLocalPosition(): Readonly<Vec3>;
    getLocalScale(): Readonly<Vec3>;
  }
}
