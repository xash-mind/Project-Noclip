declare module 'playcanvas' {
  export const RESOLUTION_AUTO: string;
  export const FILLMODE_FILL_WINDOW: string;
  export const ADDRESS_REPEAT: number;
  export const FILTER_LINEAR: number;
  export const FILTER_LINEAR_MIPMAP_LINEAR: number;
  export const FOG_LINEAR: string;
  export const SHADOWUPDATE_NONE: number;
  export const SHADOWUPDATE_THISFRAME: number;
  export class Color { constructor(r?: number, g?: number, b?: number, a?: number); r: number; g: number; b: number; }
  export class Vec2 { constructor(x?: number, y?: number); x: number; y: number; }
  export class Texture {
    constructor(device: unknown, options?: Record<string, unknown>);
    setSource(source: CanvasImageSource): void;
    addressU: number;
    addressV: number;
    minFilter: number;
    magFilter: number;
  }
  export class StandardMaterial {
    diffuse: Color;
    emissive: Color;
    emissiveIntensity: number;
    gloss: number;
    metalness: number;
    opacity: number;
    diffuseMap?: Texture;
    diffuseMapTiling?: Vec2;
    update(): void;
  }
  export class Mesh {
    constructor(device: unknown);
    setPositions(positions: number[] | ArrayBufferView): void;
    setNormals(normals: number[] | ArrayBufferView): void;
    setUvs(channel: number, uvs: number[] | ArrayBufferView): void;
    setIndices(indices: number[] | Uint8Array | Uint16Array | Uint32Array): void;
    update(): void;
  }
  export class MeshInstance {
    constructor(mesh: Mesh, material: StandardMaterial);
  }
  export class Entity {
    constructor(name?: string);
    name: string;
    enabled: boolean;
    render?: { material: StandardMaterial };
    light?: { intensity: number; range: number; color: Color; shadowUpdateMode: number };
    addComponent(type: string, data?: Record<string, unknown>): void;
    addChild(child: Entity): void;
    setPosition(x: number, y: number, z: number): void;
    setLocalPosition(x: number, y: number, z: number): void;
    setLocalScale(x: number, y: number, z: number): void;
    setEulerAngles(x: number, y: number, z: number): void;
    setLocalEulerAngles(x: number, y: number, z: number): void;
    getPosition(): { x: number; y: number; z: number };
    destroy(): void;
  }
  export class Application {
    constructor(canvas: HTMLCanvasElement, options?: Record<string, unknown>);
    root: Entity;
    scene: {
      ambientLight: Color;
      skyboxIntensity: number;
      fog?: string;
      fogColor?: Color;
      fogStart?: number;
      fogEnd?: number;
    };
    graphicsDevice: unknown;
    stats?: { drawCalls?: { total?: number } };
    setCanvasResolution(mode: string): void;
    setCanvasFillMode(mode: string): void;
    resizeCanvas(): void;
    on(event: string, callback: (dt: number) => void): void;
    start(): void;
  }
}