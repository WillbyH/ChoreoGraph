export * from './choreograph';

declare module './choreograph' {
  interface ChoreoGraph {
    Shaders: {
      debug: boolean;

      defaultVertexShaderCode: string;
      defaultFragmentShaderCode: string;

      createVertexAndFragmentShader: (
        gl: WebGLRenderingContext,
        vertexShaderCode: string,
        fragmentShaderCode: string
      ) => [WebGLShader, WebGLShader];
    }
  }

  interface cgInstance {
    Shaders: {
      shaderCanvases: Record<ChoreoGraphId, cgShaderCanvas>;

      readonly updateIndex: number;

      createCanvas(init: cgShaderCanvasInit, id?: ChoreoGraphId): cgShaderCanvas;
    }
  }

  type cgShaderCanvas = {
    id: ChoreoGraphId;
    width: number;
    height: number;

    element: HTMLCanvasElement;
    clearColor: { r: number; g: number; b: number; a: number; };
    sources: cgShaderCanvasSource[];

    gl: WebGLRenderingContext;

    parentElement: HTMLElement;
    redrawCanvas: cgCanvas;

    setupParentElement(parentElement: HTMLElement): void;
    addSource(init: cgShaderCanvasSourceInit): cgShaderCanvasSource;
    draw(): void;
  }

  type cgShaderCanvasInit = {
    element?: HTMLCanvasElement;
    width?: number;
    height?: number;
    clearColor?: { r: number; g: number; b: number; a: number; };
    redrawCanvas?: cgCanvas;
  }

  type cgShaderCanvasSource = {
    readonly program: WebGLProgram;
    readonly texture: WebGLTexture;
    readonly shaderCanvas: HTMLCanvasElement;
    readonly sourceCanvas: HTMLCanvasElement;

    readonly lastWidth: number;
    readonly lastHeight: number;

    readonly uniforms: Record<string, any>;
  }

  type cgShaderCanvasSourceInit = {
    source: HTMLCanvasElement;
    vertexShaderCode?: string;
    fragmentShaderCode?: string;
    uniforms?: Record<string, any>;
  }

  interface cgShaderGraphic extends cgGraphicBase {
    type: "shader";
    width: number;
    height: number;
    canvas: HTMLCanvasElement;

    gl: WebGLRenderingContext;

    clearColor: { r: number; g: number; b: number; a: number; };

    program: WebGLProgram;
    drawCallback: (gl: WebGLRenderingContext, graphic: cgShaderGraphic) => void;

    createShader(
      vertexShaderCode: string,
      fragmentShaderCode: string
    ): cgShaderGraphic;

    declareUniform(name: string): void;
    setSize(width: number, height: number): void;
  }

  interface cgShaderGraphicInit extends cgGraphicInitBase {
    type: "shader";
    width?: number;
    height?: number;
    canvas?: HTMLCanvasElement;
    clearColor?: { r: number; g: number; b: number; a: number; };
    drawCallback?: (gl: WebGLRenderingContext, graphic: cgShaderGraphic) => void;
  }

  interface cgGraphicMap {
    shader: cgShaderGraphic;
  }

  interface cgGraphicInitMap {
    shader: cgShaderGraphicInit;
  }
}