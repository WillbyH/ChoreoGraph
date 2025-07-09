interface cgInstance {
  Tiled: {
    readonly totalExternalTileSets: number;
    readonly totalExternalTileMaps: number;
    readonly loadedExternalTileSets: number;
    readonly loadedExternalTileMaps: number;
    readonly tileSets: Record<string, object>;

    importTileSetFromFile: (dataUrl: string, callback?: (tileSet: any) => void) => void;
    importTileSet(data: object, id: string, callback?: (tileSet: any) => void): void;
    importTileMapFromFile: (importData: cgTiledTileMapImportData, callback?: (tilemap: any) => void) => void;
    importTileMap: (importData: cgTiledTileMapImportData, callback?: (tilemap: any) => void) => void;
  }
}

type cgTiledTileMapImportData = {
  id?: ChoreoGraphId
  dataUrl?: string;
  cache?: boolean;
  chunkOffsetX?: number;
  chunkOffsetY?: number;
  offsetX?: number;
  offsetY?: number;
  autoChunk?: boolean;
  chunkWidth?: number;
  chunkHeight?: number;
}