export * from './choreograph';

declare module './choreograph' {
  interface ChoreoGraph {
    Lighting: {
      SHADOW_FULL: cgShadowFullType;
      SHADOW_PATH: cgShadowPathType;
      SHADOW_RECTANGLE: cgShadowRectangleType;
      SHADOW_IMAGE: cgShadowImageType;
    }
  }

  interface cgInstance {
    Lighting: {
      readonly lights: Record<string, cgLight>;
      readonly occluders: Record<string, cgOccluder>;

      lightTypes: {
        spot: "SpotLight";
        image: "ImageLight";
      }

      createLight: (init: cgLightInit, id?: ChoreoGraphId) => cgLight;
      createOccluder: (init: cgOccluderInit, id?: ChoreoGraphId) => cgOccluder;
    }
  }

  interface cgSettings {
    lighting: {
      appendCanvases?: boolean;

      debug: {
        active: boolean;

        clipShade: boolean;
        raycasts: boolean;
        raycastCount: boolean;
        interceptions: boolean;
        lightBounds: boolean;
        occluders: boolean;
        activeSides: boolean;
      }
    }
  }

  interface cgLight {
    transform: cgTransform;
    brightness: number;
    occlude: boolean;
    feather: number;

    getPosition(): [number, number];
    getBounds(): cgCullBounds;
    delete(): void;

    [key: string]: any;
  }

  interface cgLightInitMain {
    brightness?: number;
    occlude?: boolean;
    feather?: number;

    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: any;

    [key: string]: any;
  }

  type cgSpotLightType = "spot";
  type cgImageLightType = "image";
  type cgShadowFullType = "full";
  type cgShadowPathType = "path";
  type cgShadowRectangleType = "rectangle";
  type cgShadowImageType = "image";

  interface cgSpotLight extends cgLight {
    readonly type: cgSpotLightType;
    penumbra: number;
    colourR: number;
    colourG: number;
    colourB: number;
    innerRadius: number;
    outerRadius: number;

    readonly lightGradient: CanvasGradient | null;
    readonly colourGradient: CanvasGradient | null;
    readonly lastRadialData: string | null;

    readonly angleStart: number;
    readonly angleEnd: number;
  }

  interface cgSpotLightInit extends cgLightInitMain {
    type: cgSpotLightType;
    penumbra?: number;
    colourR?: number;
    colourG?: number;
    colourB?: number;
    hexColour?: string;
    innerRadius?: number;
    outerRadius?: number;

    [key: string]: any;
  }

  interface cgImageLight extends cgLight {
    readonly type: cgImageLightType;
    image: cgImage;
    width: number;
    height: number;

    [key: string]: any;
  }

  interface cgImageLightInit extends cgLightInitMain {
    type: cgImageLightType;
    image: cgImage;
    width?: number;
    height?: number;

    [key: string]: any;
  }

  type cgLightInit = cgSpotLightInit | cgImageLightInit;

  type cgOccluder = {
    transform: cgTransform;
    path: [number, number][];
    readonly sidesBuffer: [number, number, number, number, number, number, number, number, number, number][];

    [key: string]: any;
  }

  type cgOccluderInit = {
    path: [number, number][];

    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;

    [key: string]: any;
  }

  interface cgLightingGraphic extends cgGraphicBase {
    type: "lighting";
    lights: cgLight[];
    occluders: cgOccluder[];
    shadowType: cgShadowFullType | cgShadowPathType | cgShadowRectangleType | cgShadowImageType;
    shadowColour: string;
    shadowPath: [number, number][];
    image: cgImage | null;
    shadowWidth: number;
    shadowHeight: number;
    sideRayPrecision: number;

    readonly detections: [number, number, number, number, number, number][];
    readonly raycastCount: number;
    readonly culledRayCount: number;

    aabbLightGraphic(
      lightBounds: cgCullBounds,
      graphicBounds: cgCullBounds,
      lx: number,
      ly: number,
      transform: cgTransform
    ): boolean;
    aabbLightCamera(
      lightBounds: cgCullBounds,
      camera: cgCamera,
      lx: number,
      ly: number
    ): boolean;
  }

  interface cgGraphicMap {
    lighting: cgLightingGraphic;
  }

  interface cgLightingGraphicInit extends cgGraphicInitBase {
    type: "lighting";
    shadowType: cgShadowFullType | cgShadowPathType | cgShadowRectangleType | cgShadowImageType;
    lights?: cgLight[];
    occluders?: cgOccluder[];
    shadowColour?: string;
    shadowPath?: [number, number][];
    image?: cgImage | null;
    shadowWidth?: number;
    shadowHeight?: number;
    sideRayPrecision?: number;
  }

  interface cgGraphicInitMap {
    lighting: cgLightingGraphicInit;
  }
}