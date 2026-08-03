declare module 'playcanvas' {
  export class Color { constructor(r?: number, g?: number, b?: number, a?: number); r: number; g: number; b: number; a: number; }
  export class Vec3 { constructor(x?: number, y?: number, z?: number); x: number; y: number; z: number; clone(): Vec3; copy(v: Vec3): Vec3; set(x: number, y: number, z: number): Vec3; add(v: Vec3): Vec3; sub(v: Vec3): Vec3; scale(v: number): Vec3; normalize(): Vec3; length(): number; dot(v: Vec3): number; }
  export class Quat { setFromEulerAngles(x: number, y: number, z: number): Quat; transformVector(v: Vec3, out?: Vec3): Vec3; }
  export class StandardMaterial { diffuse: Color; emissive: Color; emissiveIntensity: number; gloss: number; metalness: number; opacity: number; blendType: number; depthWrite: boolean; update(): void; }
  export class Entity {
    constructor(name?: string);
    name: string;
    enabled: boolean;
    camera?: any;
    light?: any;
    render?: any;
    addComponent(type: string, data?: Record<string, unknown>): void;
    addChild(entity: Entity): void;
    destroy(): void;
    setPosition(x: number | Vec3, y?: number, z?: number): void;
    setLocalPosition(x: number | Vec3, y?: number, z?: number): void;
    getPosition(): Vec3;
    setEulerAngles(x: number, y: number, z: number): void;
    setLocalEulerAngles(x: number, y: number, z: number): void;
    setLocalScale(x: number, y: number, z: number): void;
    getRotation(): Quat;
    forward: Vec3;
  }
  export class Application {
    constructor(canvas: HTMLCanvasElement, options?: Record<string, unknown>);
    root: Entity;
    scene: any;
    graphicsDevice: any;
    stats: any;
    setCanvasResolution(mode: number): void;
    setCanvasFillMode(mode: number): void;
    start(): void;
    on(name: string, callback: (dt: number) => void): void;
    resizeCanvas(width?: number, height?: number): void;
  }
  export const FILLMODE_FILL_WINDOW: number;
  export const RESOLUTION_AUTO: number;
  export const BLEND_NORMAL: number;
}
