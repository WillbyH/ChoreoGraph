export * from './choreograph';

declare module './choreograph' {
  interface cgInstance {
    Tilemaps: {
      tilemaps: Record<ChoreoGraphId, cgTilemap>;
      tiles: Record<ChoreoGraphId, cgTilemapTile>;

      createTilemap(init: cgTilemapInit, id?: ChoreoGraphId): cgTilemap;
      createTile(init: cgTilemapTileInit, id?: ChoreoGraphId): cgTilemapTile;
      createAnimatedTile(id?: ChoreoGraphId): cgTilemapAnimatedTile;
    }
  }

  interface cgSettings {
    tilemaps: {
      preCacheChunkLayers: boolean;
      appendCanvases: boolean;
    }
  }

  type cgTilemap = {
    id: ChoreoGraphId;
    tileWidth: number;
    tileHeight: number;
    cache: boolean;

    readonly awaitedImages: cgImage[];
    readonly loadedImages: number;
    readonly imagesReady: boolean;
    readonly hasDrawBufferedWithAllImagesReady: boolean;
    readonly chunks: cgTilemapChunk[];
    readonly layers: cgTilemapLayer[];

    createChunk(init: cgTilemapChunkInit): cgTilemapChunk;
    createLayer(init: cgTilemapLayerInit): cgTilemapLayer;
    createChunkedLayer(init: cgTilemapChunkedLayerInit): void;
  }

  type cgTilemapChunkedLayerInit = {
    tiles: cgTilemapTile[];
    chunkWidth: number;
    chunkHeight: number;
    totalWidth: number;
    chunksOffsetX?: number;
    chunksOffsetY?: number;
    layerName?: string;
    layerVisible?: boolean;
  }

  type cgTilemapInit = {
    tileWidth?: number;
    tileHeight?: number;
    cache?: boolean;
  }

  type cgTilemapChunk = {
    readonly tilemap: cgTilemap;
    x: number;
    y: number;
    width: number;
    height: number;
    readonly layers: cgTilemapLayer[];

    createLayer(init: cgTilemapLayerInit, layerIndex?: number): cgTilemapChunkLayer;
  }

  type cgTilemapChunkInit = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  type cgTilemapLayer = {
    name: string;
    visible: boolean;
  }

  type cgTilemapLayerInit = {
    name?: string;
    visible?: boolean;
  }

  type cgTilemapChunkLayer = {
    readonly tilemap: cgTilemap;
    readonly index: number;
    readonly chunk: cgTilemapChunk;
    readonly cache: cgTilemapCachedChunkLayer;
  }

  type cgTilemapCachedChunkLayer = {
    readonly canvas: HTMLCanvasElement;
    readonly c: CanvasRenderingContext2D;
    readonly animatedTiles: {
      tile: cgTilemapAnimatedTile;
      x: number;
      y: number;
    }[];
    readonly chunkLayer: cgTilemapChunkLayer;
    readonly awaitingImages: cgImage[];

    draw(): void;
    updateAnimatedTiles(): void;
  }

  type cgTilemapTile = {
    readonly id: ChoreoGraphId;
    image: cgImage;
    flipX: boolean;
    flipY: boolean;
    flipDiagonal: boolean;
    imageX: number;
    imageY: number;
    width: number;
    height: number;

    draw(c: CanvasRenderingContext2D): void;
  }

  type cgTilemapTileInit = {
    image: cgImage;
    flipX?: boolean;
    flipY?: boolean;
    flipDiagonal?: boolean;
    imageX?: number;
    imageY?: number;
    width: number;
    height: number;
  }

  type cgTilemapAnimatedTile = {
    readonly frames: cgTilemapAnimatedTileFrame[];
    readonly duration: number;

    draw(c: CanvasRenderingContext2D): void;
    addFrame(init: cgTilemapAnimatedTileFrameInit): cgTilemapAnimatedTile;
  }

  type cgTilemapAnimatedTileFrame = {
    image: cgImage;
    duration: number;
    flipX: boolean;
    flipY: boolean;
    flipDiagonal: boolean;
    imageX: number;
    imageY: number;
    width: number;
    height: number;
  }

  type cgTilemapAnimatedTileFrameInit = {
    image: cgImage;
    duration: number;
    flipX?: boolean;
    flipY?: boolean;
    flipDiagonal?: boolean;
    imageX?: number;
    imageY?: number;
    width: number;
    height: number;
  }

  interface cgTilemapGraphic extends cgGraphicBase {
    type: "tilemap";
    manualTransform: true;
    visibleLayers: ChoreoGraphId[];
    culling: boolean;
    debug: boolean;
    useDrawBuffer: boolean;

    readonly drawBuffer: HTMLCanvasElement;
    drawBufferContext: CanvasRenderingContext2D;
    previousBufferWidth: number;
    previousBufferHeight: number;
  }

  interface cgGraphicMap {
    tilemap: cgTilemapGraphic;
  }

  interface cgTilemapGraphicInit extends cgGraphicInitBase {
    tilemap: cgTilemap;
    visibleLayers?: ChoreoGraphId[];
    culling?: boolean;
    debug?: boolean;
    useDrawBuffer?: boolean;
  }

  interface cgGraphicInitMap {
    tilemap: cgTilemapGraphicInit;
  }
}