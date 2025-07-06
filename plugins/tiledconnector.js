ChoreoGraph.plugin({
  name : "TiledConnector",
  key : "Tiled",
  version : "1.1",

  globalPackage : new class FMODConnector {
    instanceObject = class cgInstanceTiledConnector {
      totalExternalTileSets = 0;
      totalExternalTileMaps = 0;
      loadedExternalTileSets = 0;
      loadedExternalTileMaps = 0;
      tileSets = {};
      tileMaps = [];

      async importTileSetFromFile(dataUrl, callback=null) {
        this.totalExternalTileSets++;
        let response = await fetch(dataUrl);
        let data = await response.json();
        this.importTileSet(data, dataUrl.split("/").pop(), callback);
        this.loadedExternalTileSets++;
      };

      importTileSet(data, id, callback=null) {
        const cg = this.cg;
        this.tileSets[id] = data;
        let imageId;
        if ("properties" in data) {
          imageId = data.properties.find(p=>p.name=="cgimage");
        }
        if (imageId == undefined) {
          if (cg.keys.images.includes(data.name)) {
            imageId = data.name;
          } else {
            console.warn("Tiled Tileset missing 'cgimage' custom property.\n\nTo add this go to the tileset in Tiled, then click on Tileset (in the menu bar) -> Tileset Properties and then add the property in the Custom Properties section. Set the value to the id of the image the tileset uses.\n\nIf you think you did already, you might have added the property to a tile instead of the full tileset. Alternatively, if the name of the tileset matches the id of the image this will also work.");
            return;
          }
        } else {
          imageId = imageId.value;
        }

        const animatedGids = [];
        if (data.tiles!=undefined) {
          for (let animatedTileData of data.tiles) {
            if (animatedTileData.animation && animatedTileData.animation.length > 0) {
              animatedGids.push(animatedTileData.id);
            }
          }
        }

        if (cg.keys.images.includes(imageId)) {
          let tiles = [];
          let TilesetGid = 0;
          let cols = Math.floor(data.imagewidth / data.tilewidth);
          let rows = Math.floor(data.imageheight / data.tileheight);
          for (let rowi=0; rowi<rows; rowi++) {
            for (let coli=0; coli<cols; coli++) {
              let extension = "";
              if (animatedGids.includes(TilesetGid)) {
                extension = "_raw";
              }
              let Tile = cg.Tilemaps.createTile({
                image : cg.images[imageId],
                imageX : coli * data.tilewidth,
                imageY : rowi * data.tileheight,
                width : data.tilewidth,
                height : data.tileheight,
                TiledTileset: data.name,
                TiledTilesetGid: TilesetGid,
              },"Tiled_" + data.name + "_" + TilesetGid + extension);
              tiles.push(Tile);
              TilesetGid++;
            }
          }

          if (data.tiles!=undefined) {
            for (let animatedTileData of data.tiles) {
              let Tile = cg.Tilemaps.createAnimatedTile("Tiled_" + data.name + "_" + animatedTileData.id);
              for (let frameData of animatedTileData.animation) {
                let frameGid = frameData.tileid;
                Tile.addFrame({
                  image: cg.images[imageId],
                  imageX: (frameGid % cols) * data.tilewidth,
                  imageY: Math.floor(frameGid / cols) * data.tileheight,
                  width: data.tilewidth,
                  height: data.tileheight,
                  duration: frameData.duration / 1000
                });
              };
              tiles.push(Tile);
            }
          }

          this.tileSets[id].cgTiles = tiles;
          if (callback) { callback(tiles); }
        } else {
          console.warn("No image found for Tiled tileset with id: " + imageId);
        }
      };

      async importTileMapFromFile(importData={}, callback=null) {
        this.totalExternalTileMaps++;
        let dataUrl = importData.dataUrl;
        if (dataUrl==undefined) {
          dataUrl = importData;
          if (dataUrl==undefined) {
            console.warn("dataUrl not found in importTileMapFromFile");
            return;
          }
        } else {
          delete importData.dataUrl;
        }
        if (typeof importData!=="object") {
          importData = {};
        }
        let response = await fetch(dataUrl);
        importData.data = await response.json();
        this.importTileMap(importData, callback);
        this.loadedExternalTileMaps++;
      };

      importTileMap(importData={},callback=null) {
        let cg = this.cg;
        let data = importData.data;
        if (data==undefined) {
          console.warn("data not found in importTileMap");
          return;
        }

        if (data.orientation!=="orthogonal") {
          console.warn("TiledConnector and TileMaps only support orthogonal tilemaps.");
          return;
        }

        let init = {
          tileHeight : data.tileheight,
          tileWidth : data.tilewidth,
          TiledTileMap : data
        };
        if (importData.cache!==undefined) { init.cache = importData.cache; }
        if (importData.chunkOffsetX!==undefined) { init.chunkOffsetX = importData.chunkOffsetX; }
        if (importData.chunkOffsetY!==undefined) { init.chunkOffsetY = importData.chunkOffsetY; }

        let tilemap = cg.Tilemaps.createTilemap(init,importData.id||"ImportedTiledTileMap");

        // FIND GIDs
        let gidMap = {};

        function mapGid(gid) {
          if (gid==0) { return; }
          if (gidMap[gid]===undefined) {
            let tileSetGid = gid;
            let flipX = false;
            let flipY = false;
            let flipDiagonal = false;
            if (gid>=536870912) { // Handle data in the tile id
              let bitField = gid.toString(2).padStart(32,"0");
              flipX = bitField[0]=="1";
              flipY = bitField[1]=="1";
              flipDiagonal = bitField[2]=="1";
              bitField = bitField.substring(0,0) + "0" + bitField.substring(1); // Set first bit to 0
              bitField = bitField.substring(0,1) + "0" + bitField.substring(2); // Set second bit to 0
              bitField = bitField.substring(0,2) + "0" + bitField.substring(3); // Set third bit to 0
              tileSetGid = parseInt(bitField, 2);
            }
            let tileSetReference;
            for (let i=data.tilesets.length-1;i>=0;i--) {
              let tileSet = data.tilesets[i];
              if (tileSetGid>=tileSet.firstgid) {
                tileSetReference = tileSet;
                break;
              }
            }
            tileSetGid -= tileSetReference.firstgid - 1;
            let tileSet = cg.Tiled.tileSets[tileSetReference.source];
            if (tileSet===undefined) {
              console.warn("Tiled tileset with id '" + tileSetReference.source + "' does not exist. Be sure to import the tileset before importing the tilemap.");
              return;
            }
            if (gidMap[gid]!==undefined) { return; }
            let tileId = "Tiled_"+tileSet.name+"_"+(tileSetGid-1);
            let unmodifiedTile = cg.Tilemaps.tiles[tileId];
            if (flipX) { tileId += "_flipX"; }
            if (flipY) { tileId += "_flipY"; }
            if (flipDiagonal) { tileId += "_flipDiagonal"; }
            let tile;
            if (!cg.keys.tiles.includes(tileId)) {
              if (unmodifiedTile.animated) {
                tile = cg.Tilemaps.createAnimatedTile(tileId);
                for (let frame of unmodifiedTile.frames) {
                  tile.addFrame({
                    image : frame.image,
                    imageX : frame.imageX,
                    imageY : frame.imageY,
                    width : frame.width,
                    height : frame.height,
                    duration : frame.duration,
                    flipX : flipX,
                    flipY : flipY,
                    flipDiagonal : flipDiagonal
                  });
                }
              } else {
                tile = cg.Tilemaps.createTile({
                  image : unmodifiedTile.image,
                  imageX : unmodifiedTile.imageX,
                  imageY : unmodifiedTile.imageY,
                  width : unmodifiedTile.width,
                  height : unmodifiedTile.height,
                  TiledTileset: unmodifiedTile.TiledTileset,
                  TiledTilesetGid: unmodifiedTile.TiledTilesetGid,
                  flipX : flipX,
                  flipY : flipY,
                  flipDiagonal : flipDiagonal
                },tileId);
              }
            } else {
              tile = cg.Tilemaps.tiles[tileId];
            }
            gidMap[gid] = tile;
          }
        }

        for (let layer of data.layers) {
          if (layer.type !== "tilelayer") { continue; }
          if (data.infinite) {
            for (let chunk of layer.chunks) {
              for (let gid of chunk.data) {
                mapGid(gid);
              }
            }
          } else {
            for (let gid of layer.data) {
              mapGid(gid);
            }
          }
        }

        function convertLayerData(layerData) {
          let output = [];
          for (let gid of layerData) {
            if (gid==0) {
              output.push(null);
            } else {
              output.push(gidMap[gid].id);
            }
          }
          return output;
        }

        if (data.infinite) {
          // CREATE CHUNKS FROM DATA
            let layerIndex = 0;
            for (let layer of data.layers) {
              if (layer.type !== "tilelayer") { continue; }
              tilemap.createLayer({
                name : layer.name,
                visible : layer.visible
              });
              for (let chunkData of layer.chunks) {
                let chunk = null;
                let x = chunkData.x + (importData.offsetX || 0);
                let y = chunkData.y + (importData.offsetY || 0);
                for (let existingChunk of tilemap.chunks) {
                  if (existingChunk.x===x && existingChunk.y===y && existingChunk.width===chunkData.width && existingChunk.height===chunkData.height) {
                    chunk = existingChunk;
                    break;
                  }
                }
                if (chunk===null) {
                  chunk = tilemap.createChunk({
                    x : x,
                    y : y,
                    width : chunkData.width,
                    height : chunkData.height
                  })
                }
                chunk.createLayer({
                  tiles : convertLayerData(chunkData.data)
                },layerIndex);
              }
              layerIndex++;
            }
        } else {
          if (importData.autoChunk===undefined) { importData.autoChunk = false; }

          // CREATE AUTO CHUNKED LAYERS
          if (importData.autoChunk) {
            for (let layer of data.layers) {
              if (layer.type !== "tilelayer") { continue; }
              tilemap.createChunkedLayer({
                tiles : convertLayerData(layer.data),
                chunkWidth : importData.chunkWidth,
                chunkHeight : importData.chunkWidth,
                totalWidth : data.width,
                chunksOffsetX : importData.chunkOffsetX || 0,
                chunksOffsetY : importData.chunkOffsetY || 0,
                layerName : layer.name,
                layerVisible : layer.visible
              });
            }

          // CREATE SINGLE CHUNK
          } else {
            let chunk = tilemap.createChunk({
              x : importData.offsetX || 0,
              y : importData.offsetY || 0,
              width : data.width,
              height : data.height
            });
            for (let layer of data.layers) {
              if (layer.type !== "tilelayer") { continue; }
              tilemap.createLayer({
                name : layer.name,
                visible : layer.visible
              });
              chunk.createLayer({
                tiles : convertLayerData(layer.data)
              });
            }
          }
        }
        if (callback) { callback(tilemap); }
      };
    };

    tilesetLoadCheck(cg) {
      let pass = cg.Tiled.loadedExternalTileSets === cg.Tiled.totalExternalTileSets;
      return ["tilesets",pass,cg.Tiled.loadedExternalTileSets,cg.Tiled.totalExternalTileSets];
    };

    tilemapLoadCheck(cg) {
      let pass = cg.Tiled.loadedExternalTileMaps === cg.Tiled.totalExternalTileMaps;
      return ["tilemaps",pass,cg.Tiled.loadedExternalTileMaps,cg.Tiled.totalExternalTileMaps];
    };
  },

  instanceConnect(cg) {
    cg.Tiled = new ChoreoGraph.Tiled.instanceObject(cg);
    cg.Tiled.cg = cg;
    cg.loadChecks.push(ChoreoGraph.Tiled.tilesetLoadCheck);
    cg.loadChecks.push(ChoreoGraph.Tiled.tilemapLoadCheck);
  }
});
