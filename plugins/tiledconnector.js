if (ChoreoGraph.plugins.TileMaps==undefined) { console.warn("TiledConnector requires the TileMaps plugin to work."); }
else
ChoreoGraph.plugin({
  name: "TiledConnector",
  key: "TiledConnector",
  version: "1.0",
  tilesetNames: {},
  instanceConnect: function(cg) {
    cg.importTileSetFromFile = async function(dataUrl,callback) {
      let cg = this;
      let response = await fetch(dataUrl);
      let data = await response.json();
      cg.importTileSet(data,dataUrl.split("/").pop(),callback);
    }
    cg.importTileSet = function(data,filename,callback=null) {
      let cg = this;
      ChoreoGraph.plugins.TiledConnector.tilesetNames[filename] = data.name;
      let imageId;
      if ("properties" in data) {
        imageId = data.properties.find(p=>p.name=="cgimage");
      }
      if (imageId == undefined) {
        console.warn("Tiled Tileset missing 'cgimage' custom property. To add this go to the tileset in Tiled, then click on Tileset (in the menu bar) -> Tileset Properties and then add the property in the Custom Properties section.")
      } else {
        imageId = imageId.value;
        if (imageId in cg.images) {
          let tiles = [];
          let TilesetIndex = 0;
          let cols = Math.floor(data.imagewidth / data.tilewidth);
          let rows = Math.floor(data.imageheight / data.tileheight);
          for (let rowi=0; rowi<rows; rowi++) {
            for (let coli=0; coli<cols; coli++) {
              let Tile = ChoreoGraph.plugins.TileMaps.createTile({
                image: cg.images[imageId],
                x: coli * data.tilewidth,
                y: rowi * data.tileheight,
                width: data.tilewidth,
                height: data.tileheight,
                TiledTileset: data.name,
                TiledTilesetIndex: TilesetIndex,
                id: "Tiled_" + data.name + "_" + TilesetIndex
              });
              tiles.push(Tile);
              TilesetIndex++;
            }
          }
          if (callback) { callback(tiles); }
        } else {
          console.warn("No image found for Tiled tileset with id: " + imageId);
          return;
        }
      }
    }

    cg.importTileMapFromFile = async function(dataUrl,callback) {
      let response = await fetch(dataUrl);
      let data = await response.json();
      this.importTileMap(data,callback);
    }
    cg.importTileMap = function(data,callback=null) {
      let ChunkTemplate = class Chunk {
        constructor(init) {
          this.x = 0;
          this.y = 0;
          this.width = 16;
          this.height = 16;
          this.layers = [];
          if (init!=undefined) {
            for (let key in init) {
              this[key] = init[key];
            }
          }
        }
      };

      function createChunk(init) {
        let newChunk = new ChunkTemplate(init);
        return newChunk;
      }

      let uncommittedChunks = {};
      let layers = [];
      let chunks = [];

      if (data.layers[0].chunks!=undefined) {
        let layerNum = 0;
        for (let layer of data.layers) {
          layers.push({
            "name" : layer.name,
            "visible" : layer.visible
          });
          for (let chunk of layer.chunks) {
            if (uncommittedChunks[chunk.x+","+chunk.y]==undefined) {
              uncommittedChunks[chunk.x+","+chunk.y] = createChunk({x:chunk.x,y:chunk.y,width:chunk.width,height:chunk.height});
            }
            uncommittedChunks[chunk.x+","+chunk.y].layers[layerNum] = chunk.data;
          }
          layerNum++;
        }
        for (let key in uncommittedChunks) {
          let foundData = false;
          for (let layer=0;layer<uncommittedChunks[key].layers.length;layer++) {
            if (uncommittedChunks[key].layers[layer]==undefined) { continue }
            for (let tile=0;tile<uncommittedChunks[key].layers[layer].length;tile++) {
              if (uncommittedChunks[key].layers[layer][tile]!=0) {
                foundData = true;
                chunks.push(uncommittedChunks[key]);
                break;
              }
            }
            if (foundData) { break; }
          }
        }
      } else {
        let chunk = createChunk({x:0,y:0,width:data.width,height:data.height});
        let layerNum = 0;
        for (let layer of data.layers) {
          layers.push({
            "name" : layer.name,
            "visible" : layer.visible
          });
          chunk.layers[layerNum] = layer.data;
          layerNum++;
        }
        chunks.push(chunk);
      }

      let TileMap = new ChoreoGraph.plugins.TileMaps.createTileMap({
        width: data.width,
        height: data.height,
        tilePixelHeight: data.tileheight,
        tilePixelWidth: data.tilewidth,
        layers: layers,
        chunks: chunks
      });

      if ("properties" in data) {
        let tileFudge = data.properties.find(p=>p.name=="tileFudge");
        if (tileFudge!=undefined) {
          TileMap.tileFudge = parseFloat(tileFudge.value);
        }
        let tileSeamAllowance = data.properties.find(p=>p.name=="tileSeamAllowance");
        if (tileSeamAllowance!=undefined) {
          TileMap.tileSeamAllowance = parseFloat(tileSeamAllowance.value);
        }
        let dontRound = data.properties.find(p=>p.name=="dontRound");
        if (dontRound!=undefined) {
          TileMap.dontRound = true;
        }
      }

      let usedTileIds = [];
      let highestTileId = 0;
      let modifiedRules = [];
      for (let chunkNum=0;chunkNum<chunks.length;chunkNum++) {
        let chunk = chunks[chunkNum];
        for (let layer=0;layer<chunk.layers.length;layer++) { // Find the highest tile id and add all used ids to the usedTileIds array
          if (chunk.layers[layer]==undefined) { continue; }
          for (let tile=0;tile<chunk.layers[layer].length;tile++) {
            if (chunk.layers[layer][tile]>=536870912) { // Handle data in the tile id
              let bitField = chunk.layers[layer][tile].toString(2).padStart(32,"0");
              let flipX = bitField[0]=="1";
              let flipY = bitField[1]=="1";
              let flipDiagonal = bitField[2]=="1";
              bitField = bitField.substring(0,0) + "0" + bitField.substring(1); // Set the first bit to 0
              bitField = bitField.substring(0,1) + "0" + bitField.substring(2); // Set the second bit to 0
              bitField = bitField.substring(0,2) + "0" + bitField.substring(3); // Set the third bit to 0
              chunk.layers[layer][tile] = parseInt(bitField, 2);
              modifiedRules.push({gid:chunk.layers[layer][tile],chunk:chunkNum,flipX:flipX,flipY:flipY,flipDiagonal:flipDiagonal,layer:layer,tile:tile});
            }
            if (usedTileIds.indexOf(chunk.layers[layer][tile])==-1) { // If not checked yet
              usedTileIds.push(chunk.layers[layer][tile]);
              if (chunk.layers[layer][tile]>highestTileId) {
                highestTileId = chunk.layers[layer][tile];
              }
            }
          }
        }
      }

      let gidMap = {};
      let TilesetsIndex = 0;
      let TilesetTileIndex = 0;
      for (let gid=1;gid<=highestTileId;gid++) {
        if (TilesetsIndex<data.tilesets.length-1&&gid==data.tilesets[TilesetsIndex+1].firstgid) {
          TilesetsIndex++;
          TilesetTileIndex = 0;
        }
        if (TilesetsIndex>=data.tilesets.length) { break; }

        let tileSetFilename = data.tilesets[TilesetsIndex].source;
        let tileSetName = ChoreoGraph.plugins.TiledConnector.tilesetNames[tileSetFilename];
        if (usedTileIds.indexOf(gid)!=-1) {
          TileMap.tiles.push(ChoreoGraph.plugins.TileMaps.Tiles["Tiled_" + tileSetName + "_" + TilesetTileIndex]);
          gidMap[gid] = ChoreoGraph.plugins.TileMaps.Tiles["Tiled_" + tileSetName + "_" + TilesetTileIndex];
        } else {
          TileMap.tiles.push(null);
        }
        TilesetTileIndex++;
      }
      for (let rule of modifiedRules) {
        let unmodifiedTile = gidMap[rule.gid];
        let newId = "Tiled_" + unmodifiedTile.TiledTileset + "_" + unmodifiedTile.TiledTilesetIndex + highestTileId;
        let tile;
        if (ChoreoGraph.plugins.TileMaps.Tiles[newId]==undefined) {
          tile = ChoreoGraph.plugins.TileMaps.createTile({
            image: unmodifiedTile.image,
            x: unmodifiedTile.x,
            y: unmodifiedTile.y,
            width: unmodifiedTile.width,
            height: unmodifiedTile.height,
            TiledTileset: unmodifiedTile.TiledTileset,
            TiledTilesetIndex: unmodifiedTile.TiledTilesetIndex,
            flipX: rule.flipX,
            flipY: rule.flipY,
            flipDiagonal: rule.flipDiagonal,
            id: unmodifiedTile.id + "_flipped"+rule.flipX+""+rule.flipY
          });
        } else {
          tile = ChoreoGraph.plugins.TileMaps.Tiles[newId];
        }
        TileMap.tiles.push(tile);
        TileMap.chunks[rule.chunk].layers[rule.layer][rule.tile] = TileMap.tiles.length;
      }
      if (callback) { callback(TileMap); }
    }
  }
});
// Willby - 2024