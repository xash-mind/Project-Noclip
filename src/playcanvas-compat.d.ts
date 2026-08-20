import 'playcanvas';

declare module 'playcanvas' {
  class Vec3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): Vec3;
  }

  class BoundingSphere {
    constructor(center?: Vec3, radius?: number);
    readonly center: Vec3;
    radius: number;
  }

  class Frustum {
    containsSphere(sphere: BoundingSphere): number;
  }

  interface StandardMaterial {
    clone(): StandardMaterial;
  }
  interface Entity {
    getLocalPosition(): Readonly<Vec3>;
    getLocalScale(): Readonly<Vec3>;
  }
}
