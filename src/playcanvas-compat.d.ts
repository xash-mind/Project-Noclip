import 'playcanvas';

declare module 'playcanvas' {
  interface StandardMaterial {
    clone(): StandardMaterial;
  }
  interface Entity {
    getLocalPosition(): Readonly<Vec3>;
    getLocalScale(): Readonly<Vec3>;
  }
}
