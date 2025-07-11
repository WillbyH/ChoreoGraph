export declare interface ChoreoGraph {
  readonly VERSION: "3.2.0";
  settings: {
    maxFPS: number;
    pauseWhenUnfocused: boolean;
    pauseWhenOffscreen: boolean;
    pauseLoop: boolean;
    storeProcessTime: boolean;
  };
  readonly started: boolean;
  readonly frame: ChoreoGraphFrame;
  readonly lastPerformanceTime: number;
  readonly now: Date;
  readonly nowint: number;
  readonly timeDelta: number;
  readonly processTime: number;
  readonly plugins: Record<string, unknown>;
  globalBeforeLoops: (() => void)[];
  globalAfterLoops: (() => void)[];
  instances: cgInstance[];

  id: cgIDManager;

  AreaTextOptions: typeof cgAreaTextOptions;

  applyAttributes(obj: object, attributes: Record<string, any>, strict: boolean): void;
  colourLerp(colourFrom: string, colourTo: string, amount: number): string;
  degreeToRadianStandard(degree: number): number;
  transformContext(
    camera?: cgCamera,
    x?: number,
    y?: number,
    r?: number,
    sx?: number,
    sy?: number,
    CGSpace?: boolean,
    flipX?: boolean,
    flipY?: boolean,
    canvasSpaceXAnchor?: number,
    canvasSpaceYAnchor?: number,
    ctx?: CanvasRenderingContext2D,
    cx?: number,
    cy?: number,
    cz?: number,
    canvasSpaceScale?: number,
    w?: number,
    h?: number,
    manualScaling?: boolean
  ): void;
  instantiate(init?: DeepPartial<cgSettings>): cgInstance;
  start(): void;
}

interface cgInstance {
  settings: cgSettings;
  readonly canvases: Record<ChoreoGraphId, cgCanvas>;
  readonly cameras: Record<ChoreoGraphId, cgCamera>;
  readonly scenes: Record<ChoreoGraphId, cgScene>;
  readonly graphics: Record<ChoreoGraphId, cgGraphicMap[keyof cgGraphicMap]>;
  readonly transforms: Record<ChoreoGraphId, cgTransform>;
  readonly images: Record<ChoreoGraphId, cgImage>;
  readonly sequences: Record<ChoreoGraphId, cgSequence>;
  readonly events: Record<ChoreoGraphId, cgEvent>;
  readonly paths: Record<ChoreoGraphId, [number, number][]>;
  readonly objects: Record<ChoreoGraphId, cgObject>;

  readonly keys: Record<string, ChoreoGraphId[]>;

  readonly timeDelta: number;
  disabled: boolean;
  readonly clock: number;
  readonly timeSinceLastFrame: number;
  readonly ready: boolean;
  loadChecks: ((cg: cgInstance) => void)[];

  graphicTypes: Record<string, cgGraphicType>;
  processLoops: ((cg: cgInstance) => void)[];
  predrawLoops: ((cg: cgInstance) => void)[];
  overlayLoops: ((cg: cgInstance) => void)[];
  debugLoops: ((cg: cgInstance) => void)[];

  readonly cw: number;
  readonly ch: number;
  readonly c: CanvasRenderingContext2D;
  readonly canvas: cgCanvas;
  readonly camera: cgCamera;
  readonly scene: cgScene;

  createCanvas(init?: cgCanvasInit, id?: ChoreoGraphId): cgCanvas;
  createCamera(init?: cgCameraInit, id?: ChoreoGraphId): cgCamera;
  createScene(init?: cgSceneInit, id?: ChoreoGraphId): cgScene;
  createGraphic(init?: cgGraphicInit, id?: ChoreoGraphId): cgGraphic;
  createTransform(init?: cgTransformInit, id?: ChoreoGraphId): cgTransform;
  createImage(init?: cgImageInit, id?: ChoreoGraphId): cgImage;
  createSequence(init?: cgSequenceInit, id?: ChoreoGraphId): cgSequence;
  createEvent(init?: cgEventInit, id?: ChoreoGraphId): cgEvent;
  createPath(path: [number, number][], id?: ChoreoGraphId): [number, number][];
  createObject(init?: cgObjectInit, id?: ChoreoGraphId): cgObject;
}

interface cgSettings {
  core: {
    defaultCanvas: cgCanvasInit | null;
    timeScale: number;
    generateBasicEnvironment: boolean;
    includeCoreGraphicTypes: boolean;
    inactiveTime: number;
    waitUntilReady: boolean;
    defaultCanvasSpaceScale: number;
    debugCGScale: number;
    debugCanvasScale: number;
    frustumCulling: boolean;
    baseImagePath: string;
    defaultCursor: string;
    assumptions: boolean;
    imageSmoothingEnabled: boolean;
    skipLoadChecks: boolean;
    areaTextDebug: boolean;

    callbacks: {
      loopBefore: ((cg: cgInstance) => void);
      loopAfter: ((cg: cgInstance) => void);
      resume: ((ms: number, cg: cgInstance) => void);
      loadingLoop: ((checkData: Record<
        ChoreoGraphId,
        {
          id: ChoreoGraphId;
          pass: boolean;
          loaded: boolean;
          total: number;
        }
      >, cg: cgInstance) => void);
      start: (() => void | null);
      resize: ((cgCanvas: cgCanvas) => void);
    };
  };
}

interface cgGraphicBase {
  readonly id: string;
  readonly type: string;
  readonly manualTransform: boolean;
  readonly imageSmoothingEnabled: boolean;

  draw(c: CanvasRenderingContext2D, ax: number, ay: number): void;
  getBounds(): cgCullBounds;

  [key: string]: any;
}

interface cgGraphicInitBase {
  [key: string]: any;
}

interface cgRectangleGraphic extends cgGraphicBase {
  type: "rectangle";
  fill: boolean;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  radius: number;

  width: number;
  height: number;
  colour: string;
}

interface cgRectangleGraphicInit extends cgGraphicInitBase {
  type: "rectangle";
  fill?: boolean;
  lineWidth?: number;
  lineJoin?: CanvasLineJoin;
  miterLimit?: number;
  radius?: number;

  width?: number;
  height?: number;
  colour?: string;
}

interface cgArcGraphic extends cgGraphicBase {
  type: "arc";
  fill: boolean;
  closePath: boolean;
  lineWidth: number;
  lineCap: CanvasLineCap;

  radius: number;
  colour: string;
  start: number;
  end: number;
  counterclockwise: boolean;
}

interface cgArcGraphicInit extends cgGraphicInitBase {
  type: "arc";
  fill?: boolean;
  closePath?: boolean;
  lineWidth?: number;
  lineCap?: CanvasLineCap;

  radius?: number;
  colour?: string;
  start?: number;
  end?: number;
  counterclockwise?: boolean;
}

interface cgPolygonGraphic extends cgGraphicBase {
  type: "polygon";
  fillBeforeStroke: boolean;
  fill: boolean;
  stroke: boolean;
  closePath: boolean;
  lineWidth: number;
  lineCap: CanvasLineCap;

  path: [number, number][];

  fillColour: string;
  strokeColour: string;
}

interface cgPolygonGraphicInit extends cgGraphicInitBase {
  type: "polygon";
  fillBeforeStroke?: boolean;
  fill?: boolean;
  stroke?: boolean;
  closePath?: boolean;
  lineWidth?: number;
  lineCap?: CanvasLineCap;

  path?: [number, number][];

  fillColour?: string;
  strokeColour?: string;
}

interface cgImageGraphic extends cgGraphicBase {
  type: "image";
  image: cgImage;
  width: number;
  height: number;
  flipX: boolean;
  flipY: boolean;
}

interface cgImageGraphicInit extends cgGraphicInitBase {
  type: "image";
  image: cgImage;
  width?: number;
  height?: number;
  flipX?: boolean;
  flipY?: boolean;
}

interface cgPointTextGraphic extends cgGraphicBase {
  type: "pointText";
  text: string;
  fontFamily: string;
  fontSize: number;
  sizeType: 'px' | 'em' | 'rem' | 'pt';
  colour: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  miterLimit: number;
  fill: boolean;
  lineWidth: number;
  maxWidth: number;
}

interface cgPointTextGraphicInit extends cgGraphicInitBase {
  type: "pointText";
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  sizeType?: 'px' | 'em' | 'rem' | 'pt';
  colour?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  miterLimit?: number;
  fill?: boolean;
  lineWidth?: number;
  maxWidth?: number;
}

interface cgAreaTextGraphic extends cgGraphicBase {
  type: "areaText";
  text: string;
  options: cgAreaTextOptions;
}

interface cgAreaTextGraphicInit extends cgGraphicInitBase {
  type: "areaText";
  text: string;
}

interface cgGraphicMap {
  rectangle: cgRectangleGraphic;
  arc: cgArcGraphic;
  polygon: cgPolygonGraphic;
  image: cgImageGraphic;
  pointText: cgPointTextGraphic;
  areaText: cgAreaTextGraphic;
}

type cgGraphic = cgGraphicMap[keyof cgGraphicMap];

interface cgGraphicInitMap {
  rectangle: cgRectangleGraphicInit;
  arc: cgArcGraphicInit;
  polygon: cgPolygonGraphicInit;
  image: cgImageGraphicInit;
  pointText: cgPointTextGraphicInit;
  areaText: cgAreaTextGraphicInit & cgAreaTextOptionsInit;
}

type cgGraphicInit =
  | cgGraphicInitMap[keyof cgGraphicInitMap]
  | ({ type: Exclude<string, keyof cgGraphicInitMap> } & Record<string, any>);


  interface cgObjectComponentInitBase {
    master?: boolean;
    key?: string;

    [key: string]: any;
  }

  type cgObjectGraphic = {
    readonly manifest: {
      type: 'Graphic';
      key: string;
      master: true;
      functions: {
        update: true;
        delete: true;
      };
    };

    graphic: cgGraphic;
    collection: string;
    readonly transform: cgTransform;

    deleteTransformOnDelete: boolean;
  }

  interface cgObjectGraphicInit extends cgObjectComponentInitBase {
    graphic?: cgGraphic;
    collection?: string;

    deleteTransformOnDelete?: boolean;

    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;
  }

  type cgObjectCamera = {
    readonly manifest: {
      type: 'Camera';
      key: string;
      master: true;
      functions: {
        update: true;
      };
    };

    camera: cgCamera;
    readonly transform: cgTransform;
    active: boolean;
    jump: boolean;
    jumpDistance: number;
    smoothing: boolean;
  }

  interface cgObjectCameraInit extends cgObjectComponentInitBase {
    camera: cgCamera | null;

    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;

    active?: boolean;
    jump?: boolean;
    jumpDistance?: number;
    smoothing?: boolean;
  }

  type cgObjectScript = {
    readonly manifest: {
      type: 'Script';
      key: string;
      master: true;
      functions: {
        update: true;
        delete: true;
      };
    };

    startScript: ((object: cgObject) => void) | null;
    updateScript: ((object: cgObject, scene: cgScene) => void) | null;
    deleteScript: ((object: cgObject) => void) | null;
  }

  interface cgObjectScriptInit extends cgObjectComponentInitBase {
    startScript?: ((object: cgObject) => void) | null;
    updateScript?: ((object: cgObject, scene: cgScene) => void) | null;
    deleteScript?: ((object: cgObject) => void) | null;
  }

  interface cgObjectComponentMap {
    Graphic: cgObjectGraphic;
    Camera: cgObjectCamera;
    Script: cgObjectScript;
  }

  type cgObjectComponent = cgObjectComponentMap[keyof cgObjectComponentMap];

  interface cgObjectComponentInitMap {
    Graphic: cgObjectGraphicInit;
    Camera: cgObjectCameraInit;
    Script: cgObjectScriptInit;
  }

  type cgObjectComponentInit = cgObjectComponentInitMap[keyof cgObjectComponentInitMap];

declare global {
  interface Window {
    ChoreoGraph: ChoreoGraph;
  }
  declare const ChoreoGraph: ChoreoGraph;

  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object
      ? T[P] extends Function
        ? T[P]
        : DeepPartial<T[P]>
      : T[P];
  };
  type cgCullBounds = [width: number, height: number, xo: number, yo: number];
  type ChoreoGraphFrame = number;
  type ChoreoGraphId = string | number;

  type cgCanvas = {
    readonly id: ChoreoGraphId;
    readonly width: number;
    readonly height: number;
    readonly rawWidth: number;
    readonly rawHeight: number;

    keepCursorHidden: boolean;
    hideDebugOverlays: boolean;

    imageRendering: 'auto' | 'smooth' | 'crisp-edges' | 'pixelated';

    readonly camera: cgCamera;
    readonly parentElement: HTMLElement;
    pixelSize: number;
    background: string;

    readonly c: CanvasRenderingContext2D;
    readonly element: HTMLCanvasElement;

    resizeWithSelf(): cgCanvas;
    drawImage(
      image: cgImage,
      x: number,
      y: number,
      width?: number,
      height?: number,
      rotation?: number,
      ax?: number,
      ay?: number,
      flipX?: boolean,
      flipY?: boolean
    ): void;
    drawAreaText(
      text: string,
      x: number,
      y: number,
      areaTextOptionsOrInit?: cgAreaTextOptions | cgAreaTextOptionsInit,
    ): void;
    setCamera(camera: cgCamera): cgCanvas;
    delete(): void;
  }

  type cgCanvasInit = {
    element: HTMLCanvasElement | HTMLElement | null;
    width?: number;
    height?: number;
    rawWidth?: number;
    rawHeight?: number;
    keepCursorHidden?: boolean;
    hideDebugOverlays?: boolean;
    imageRendering?: 'auto' | 'smooth' | 'crisp-edges' | 'pixelated';
    pixelSize?: number;
    background?: string;
  }

  type cgCamera = {
    readonly id: ChoreoGraphId;
    readonly scenes: cgScene[];
    readonly canvas: cgCanvas;

    readonly cullOverride: cgCamera;
    readonly inactiveCanvas: cgCanvas;

    readonly x: number;
    readonly y: number;
    z: number;

    transform: cgTransform;
    canvasSpaceScale: number;

    scaleMode: 'pixels' | 'maximum' | 'minimum';
    pixelScale: number;
    size: number;
    width: number;
    height: number;

    readonly cx: number;
    readonly cy: number;
    readonly cz: number;

    getCGSpaceX(x: number): number;
    getCGSpaceY(y: number): number;

    getCanvasSpaceX(x: number): number;
    getCanvasSpaceY(y: number): number;

    addScene(scene: cgScene): void;
    removeScene(scene: cgScene): void;
    setScene(scene: cgScene): void;
    isSceneOpen(scene: cgScene): boolean;
    delete(): void;
  }

  type cgCameraInit = {
    scaleMode? : 'pixels' | 'maximum' | 'minimum';
    pixelScale?: number;
    size?: number;
    width?: number;
    height?: number;

    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;
  }

  type cgScene = {
    readonly id: ChoreoGraphId;
    readonly tree: cgSceneTree;
    readonly structure: cgSceneItem[];
    readonly objects: cgObject[];
    readonly collections: Record<string, cgSceneItem>;
    readonly drawBuffer: object[];
    readonly drawBufferCollections: Record<string, cgSceneItem[]>;
    readonly cameras: cgCamera[];
    readonly items: Record<string, cgSceneItem>;

    createItem(type: 'graphic' | 'collection', init: cgSceneItemInit, id?: ChoreoGraphId, collection?: ChoreoGraphId): cgSceneItem;
    addObject(object: cgObject): void;
    removeObject(object: cgObject): void;
    addToBuffer(graphic: cgGraphic, transform: cgTransform, collection: string): void;
    delete(): void;
  }

  type cgSceneInit = {

  }

  type cgSceneTree = cgSceneItem | cgSceneTreeBranch;
  type cgSceneTreeBranch = Record<ChoreoGraphId, cgSceneItemTree>;

  type cgSceneItem = cgSceneItemGraphic | cgSceneItemCollection;

  type cgSceneItemGraphic = {
    readonly type: 'graphic';
    readonly id: ChoreoGraphId;
    readonly graphic: cgGraphic;
    readonly transform: cgTransform;
  }

  type cgSceneItemCollection = {
    readonly type: 'collection';
    readonly id: ChoreoGraphId;
    readonly children: cgSceneItem[];
    readonly path: string[];
  }

  type cgSceneItemInit = cgSceneItemGraphicInit | cgSceneItemCollectionInit;

  type cgSceneItemGraphicInit = {
    graphic: cgGraphic;
    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;
  }

  type cgSceneItemCollectionInit = {
    children?: cgSceneItem[];
    path?: any[];
  }

  type cgGraphicType = {
    setup?(init: cgGraphicInit, cg: cgInstance): void;
    draw(graphic: cgGraphic, init: cgGraphicInit, cg: cgInstance): void;
    draw(item: cgSceneItem, transform: cgTransform): void;
  }

  type cgTransform = {
    readonly id: ChoreoGraphId;
    x: number;
    y: number;
    /** Offset X */
    ox: number;
    /** Offset Y */
    oy: number;
    /** Scale X */
    sx: number;
    /** Scale Y */
    sy: number;
    /** Anchor X */
    ax: number;
    /** Anchor Y */
    ay: number;
    /** Rotation in degrees */
    r: number;
    /** Opacity from 0 to 1 */
    o: number | boolean;
    CGSpace: boolean;
    canvasSpaceXAnchor: number;
    canvasSpaceYAnchor: number;
    flipX: boolean;
    flipY: boolean;
    parent: cgTransform | null;
    delete(): void;
  }

  type cgTransformInit = {
    x?: number;
    y?: number;
    ox?: number;
    oy?: number;
    sx?: number;
    sy?: number;
    ax?: number;
    ay?: number;
    r?: number;
    o?: number;
    CGSpace?: boolean;
    canvasSpaceXAnchor?: number;
    canvasSpaceYAnchor?: number;
    flipX?: boolean;
    flipY?: boolean;
    parent?: cgTransform;
  }

  type cgImage = {
    readonly id: ChoreoGraphId;
    readonly file: string;
    readonly image: HTMLImageElement;
    readonly crop: number[];
    readonly unsetCrop: boolean;
    readonly rawWidth: number;
    readonly rawHeight: number;
    readonly width: number;
    readonly height: number;
    readonly scale: [number, number];
    readonly ready: boolean;
    readonly loadAttempts: number;

    disableCropping: boolean;
    onLoad?: (image: cgImage) => void;

    [key: string]: any;
  }

  type cgImageInit = {
    file?: string;
    image?: HTMLImageElement | HTMLCanvasElement;
    crop?: number[];
    unsetCrop?: boolean;
    disableCropping?: boolean;
    onLoad?: (image: cgImage) => void;

    width?: number;
    height?: number;
    scale?: [number, number];

    [key: string]: any;
  }

  type cgSequence = {
    readonly id: ChoreoGraphId;
    data: any[];
    callbacks: Record<string, Function>;

    run(): void;
    delete(): void;

    [key: string]: any;
  }

  type cgSequenceInit = {
    data?: any[];
    callbacks?: Record<string, Function>;

    [key: string]: any;
  }

  type cgEvent = {
    readonly id: ChoreoGraphId;
    readonly stt: number;
    readonly ent: number;
    readonly duration: number;
    loop: boolean;
    end?: (event: cgEvent) => void;
    delete(): void;

    [key: string]: any;
  }

  type cgEventInit = {
    duration?: number;
    loop?: boolean;
    end?: (event: cgEvent) => void;

    [key: string]: any;
  }

  type cgObject = {
    readonly id: ChoreoGraphId;
    objectData: {
      readonly components: cgObjectComponent[];
      deleteTransformOnDelete: boolean;
    };
    readonly transform: cgTransform;

    [key: string]: any;

    attach(
      componentName: keyof cgObjectComponentMap,
      init?: cgObjectComponentInit
    ): cgObject;
    update(scene: cgScene): void;
    delete(): void;
  }

  type cgObjectInit = {
    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;

    [key: string]: any;
  }

  declare class cgAreaTextOptions {
    fontFamily: string;
    fontSize: number;
    leading: number;
    sizeType: "px" | "em" | "rem" | "pt";
    fontWeight: "normal";
    textAlign: "left" | "center" | "right";
    textBaseline: "alphabetic" | "top" | "middle" | "bottom";
    area: "middle" | "top" | "bottom";
    fill: true;
    colour: string;
    lineWidth: number;
    minWidth: number;
    maxWidth: number;
    maxLines: number;

    measuredHeight: number;
    lineWords: number[];
    lineWidths: number[];
    calibratedText: string;

    constructor(text: string, c: CanvasRenderingContext2D, areaTextInit: cgAreaTextOptionsInit);

    calibrate(text: string, c: CanvasRenderingContext2D): void;
  }

  type cgAreaTextOptionsInit = {
    fontFamily?: string;
    fontSize?: number;
    leading?: number;
    sizeType?: "px" | "em" | "rem" | "pt";
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
    textBaseline?: "alphabetic" | "top" | "middle" | "bottom";
    area?: "middle" | "top" | "bottom";
    fill?: true;
    colour?: string;
    lineWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    maxLines?: number;
  }

  type cgIDManager = {
    used: string[];

    get: (length: number) => string;
    release: (id: string) => void;
  }

  type cgPlugin = {
    name: string;
    key: string;
    version: string;

    instanceConnect: (cg: cgInstance) => void;
    instanceStart: (cg: cgInstance) => void;
    globalStart: () => void;
  }
}