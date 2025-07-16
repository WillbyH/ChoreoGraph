export * from './choreograph';

declare module './choreograph' {
  interface cgInstance {
    Tiled: {
      readonly totalExternalTileSets: number;
      readonly totalExternalTileMaps: number;
      readonly loadedExternalTileSets: number;
      readonly loadedExternalTileMaps: number;
      readonly tileSets: Record<string, object>;

      importTileSetFromFile: (dataUrl: string, callback?: (tiles: cgTilemapTile[]) => void) => void;
      importTileSet(data: object, id: string, callback?: (tiles: cgTilemapTile[]) => void): void;
      importTileMapFromFile: (importData: cgTiledTileMapImportData, callback?: (tilemap: cgTilemap) => void) => void;
      importTileMap: (importData: cgTiledTileMapImportData, callback?: (tilemap: cgTilemap) => void) => void;
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
}