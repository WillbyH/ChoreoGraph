ChoreoGraph.graphicTypes.tileMap = new class TileMapGraphic {
  setup(graphic,graphicInit,cg) {
    graphic.tileMap = null;
    graphic.addCacheToDocument = false;
    graphic.dontCull = false;

    graphic.debug = {
      outlineChunks: false,
      labelChunks: false,
      colour: "#ff0000"
    };
  }

  draw(graphic,cg,ax,ay) {
    let TileMap = graphic.tileMap;

    if (TileMap==null||TileMap==undefined) { return; }

    cg.c.resetTransform();

    let translateX = ((TileMap.width*TileMap.tileWidth*0.5)*cg.z);
    let translateY = ((TileMap.height*TileMap.tileHeight*0.5)*cg.z);
    if (TileMap.dontRound) {
      ax -= translateX;
      ay -= translateY;
    } else {
      ax -= Math.round(translateX);
      ay -= Math.round(translateY);
    }

    let layersToDraw = graphic.layersToDraw;
    if (layersToDraw==undefined||layersToDraw==null) {
      layersToDraw = [...Array(TileMap.layers.length).keys()]
    }
    let chunksToDraw = [];
    let debugChunks = [];
    for (let chunk of TileMap.chunks) {
      if (graphic.dontCull) {
        chunksToDraw.push(chunk);
        continue;
      }
      // This part of the code for checking which chunks are on screen
      let chunkX = chunk.x * TileMap.tileWidth + graphic.x + graphic.ox - translateX/cg.z;
      let chunkY = chunk.y * TileMap.tileHeight + graphic.y + graphic.oy - translateY/cg.z;
      let chunkWidth = chunk.width * TileMap.tileWidth * cg.z;
      let chunkHeight = chunk.height * TileMap.tileHeight * cg.z;
      let cameraWidth = cg.cw;
      let cameraHeight = cg.ch;
      let scaler = 1;
      if (cg.camera.scaleMode=="pixels") {
        scaler = cg.camera.z*cg.camera.scale;
      } else if (cg.camera.scaleMode=="maximum") {
        if (cg.cw*(cg.camera.WHRatio)>cg.ch*(1-cg.camera.WHRatio)) {
          scaler = cg.camera.z*(cg.cw/cg.camera.maximumSize);
        } else {
          scaler = cg.camera.z*(cg.ch/cg.camera.maximumSize);
        }
      }
      cameraWidth = cameraWidth/scaler*cg.z;
      cameraHeight = cameraHeight/scaler*cg.z;
      let cameraTopLeftX = cg.camera.x-cameraWidth/2/cg.z;
      let cameraTopLeftY = cg.camera.y-cameraHeight/2/cg.z;
      if (chunkX < cameraTopLeftX + cameraWidth/cg.z && chunkX + chunkWidth/cg.z > cameraTopLeftX && chunkY < cameraTopLeftY + cameraHeight/cg.z && chunkY + chunkHeight/cg.z > cameraTopLeftY) {
        chunksToDraw.push(chunk);
      }
      if (graphic.debug.outlineChunks||graphic.debug.labelChunks) {
        debugChunks.push([cg.getTransX(chunkX),cg.getTransY(chunkY),chunkWidth,chunkHeight,chunk]);
      }
    }

    cg.c.save();
    cg.c.imageSmoothingEnabled = false;

    // Tilemaps require very precise scaling to not look awful
    let gx = graphic.x+graphic.ox;
    let gy = graphic.y+graphic.oy;
    let gr = graphic.r+graphic.or;
    if (!TileMap.dontRound) {
      gx = Math.round(gx);
      gy = Math.round(gy);
    }
    ChoreoGraph.transformContext(cg,gx,gy,gr,1,1,graphic.CGSpace,false,false,0,0,cg.c,cg.x,cg.y,cg.z,cg.settings.canvasSpaceScale,cg.cw,cg.ch,true);

    let width = TileMap.tileWidth;
    let height = TileMap.tileHeight;
    if (TileMap.dontRound) {
      width = width * cg.z;
      height = height * cg.z;
    } else {
      width = Math.round(width * cg.z);
      height = Math.round(height * cg.z);
    }

    let missingTiles = [];
    
    for (let l of layersToDraw) {
      if (TileMap.layers[l].visible==false) { continue; }
      let chunkNum = 0;
      for (let chunk of chunksToDraw) {
        chunkNum++;
        if (TileMap.cache) {
          if (chunk.cachedData===undefined) { chunk.cachedData = {}; }
          if (chunk.cachedData[l]===undefined) {
            let cacheCanvas = document.createElement("canvas");
            if (graphic.addCacheToDocument) {
              cacheCanvas.style.margin = "5px";
              document.body.appendChild(cacheCanvas);
            }
            cacheCanvas.width = chunk.width * TileMap.tilePixelWidth;
            cacheCanvas.height = chunk.height * TileMap.tilePixelHeight;
            let cacheContext = cacheCanvas.getContext("2d");
            cacheContext.imageSmoothingEnabled = false;
            if (chunk.layers[l]==undefined) { chunk.cachedData[l] = null; continue; }
            for (let t=0; t<chunk.layers[l].length; t++) {
              let tileNum = chunk.layers[l][t];
              if (tileNum==0) { continue; }
              let col = t % chunk.width;
              let row = Math.floor(t / chunk.width);
              let x = col * TileMap.tilePixelWidth;
              let y = row * TileMap.tilePixelHeight;
              if (tileNum>TileMap.tiles.length) {
                if (!TileMap.hasWarnedAboutIndexOOR) {
                  console.warn("TileMap tile index out of range: " + tileNum);
                }
                TileMap.hasWarnedAboutIndexOOR = true;
              } else {
                let Tile = TileMap.tiles[tileNum-1];
                if (Tile===undefined) {
                  if (missingTiles.indexOf(tileNum)==-1) {
                    missingTiles.push(tileNum);
                  }
                  continue;
                }
                Tile.draw(cacheContext,x,y,TileMap.tilePixelWidth,TileMap.tilePixelHeight,TileMap);
              }
            }
            chunk.cachedData[l] = cacheCanvas;
          }
          if (chunk.cachedData[l]===null) { continue; }
          let chunkX = ax + (chunk.x * TileMap.tileWidth)*cg.z;
          let chunkY = ay + (chunk.y * TileMap.tileHeight)*cg.z;
          cg.c.drawImage(chunk.cachedData[l],chunkX,chunkY,chunk.width*width+TileMap.cachedChunkFudge,chunk.height*height+TileMap.cachedChunkFudge);
          continue;
        }
        for (let t=0; t<chunk.layers[l].length; t++) {
          let tileNum = chunk.layers[l][t];
          if (tileNum==0) { continue; }
          let col = t % chunk.width;
          let row = Math.floor(t / chunk.width);
          let x = ax + col * width + chunk.x * TileMap.tileWidth * cg.z;
          let y = ay + row * height + chunk.y * TileMap.tileHeight * cg.z;
          if (tileNum>TileMap.tiles.length) {
            if (!TileMap.hasWarnedAboutIndexOOR) {
              console.warn("TileMap tile index out of range: " + tileNum);
            }
            TileMap.hasWarnedAboutIndexOOR = true;
          } else {
            let Tile = TileMap.tiles[tileNum-1];
            if (Tile===undefined) {
              if (missingTiles.indexOf(tileNum)==-1) {
                missingTiles.push(tileNum);
              }
              continue;
            }
            Tile.draw(cg.c,x,y,width,height,TileMap);
          }
        }
      }
    }
    cg.c.resetTransform();
    for (let chunk of debugChunks) {
      cg.c.strokeStyle = graphic.debug.colour;
      cg.c.fillStyle = graphic.debug.colour;
      if (graphic.debug.outlineChunks) {
        cg.c.globalAlpha = 0.5;
        cg.c.lineWidth = 2;
        cg.c.strokeRect(chunk[0],chunk[1],chunk[2],chunk[3]);
        cg.c.globalAlpha = 1;
      }
      if (graphic.debug.labelChunks) {
        cg.c.textAlign = "center";
        cg.c.textBaseline = "middle";
        cg.c.font = "12px Arial";
        cg.c.fillText(chunk[4].x + "," + chunk[4].y,chunk[0]+chunk[2]/2,chunk[1]+chunk[3]/2);
      }
    }
    if (missingTiles.length>0&&!TileMap.hasWarnedAboutMissingTiles) {
      console.warn("Tiles: " + missingTiles.join(" ") + " do not exist on TileMap: " + TileMap.id);
    }
    TileMap.hasWarnedAboutMissingTiles = true;
    cg.c.restore();
  }
}

ChoreoGraph.plugin({
  name: "TileMaps",
  key: "TileMaps",
  version: "1.0",
  Tiles: {},
  Tile: class Tile {
    image = null;
    x = 0;
    y = 0;
    width = 16;
    height = 16;
    flipX = false;
    flipY = false;
    flipDiagonal = false;

    constructor(tileInit) {
      if (tileInit!=undefined) {
        for (let key in tileInit) {
          this[key] = tileInit[key];
        }
      }
      if (this.id===undefined) { this.id = "tile_" + ChoreoGraph.createId(5); }
    }
    draw(ctx,x,y,width,height,TileMap) {
      width = width+TileMap.tileFudge;
      height = height+TileMap.tileFudge;
      ctx.save();
      let flipXOffset = 0;
      let flipYOffset = 0;
      if (this.flipX) {
        flipXOffset = 2*x+width;
        ctx.scale(-1,1);
      }
      if (this.flipY) {
        flipYOffset = 2*y+height;
        ctx.scale(1,-1);
      }
      if (this.flipDiagonal) {
        ctx.scale(-1,1);
        let savedY = y;
        y = x;
        x = savedY;
        let savedXOffset = flipXOffset;
        flipXOffset = flipYOffset;
        flipYOffset = savedXOffset;
        ctx.rotate(Math.PI*0.5);
      }
      ctx.drawImage(this.image.image,this.x+TileMap.tileSeamAllowance,this.y+TileMap.tileSeamAllowance,this.width-TileMap.tileSeamAllowance*2,this.height-TileMap.tileSeamAllowance*2,x-flipXOffset,y-flipYOffset,width,height);
      ctx.restore();
    }
  },
  createTile: function(tileInit) {
    let newTile = new ChoreoGraph.plugins.TileMaps.Tile(tileInit);
    ChoreoGraph.plugins.TileMaps.Tiles[newTile.id] = newTile;
    return newTile;
  },
  TileMaps: {},
  TileMap: class TileMap {
    chunks = [];
    layers = [];
    width = 0;
    height = 0;
    tiles = [];
    tileWidth = 100;
    tileHeight = 100;
    tileFudge = 0;
    tileSeamAllowance = 0;
    cachedChunkFudge = 0;
    dontRound = false;
    layersToDraw = null;

    cache = false;

    constructor(tileInit) {
      if (tileInit!=undefined) {
        for (let key in tileInit) {
          this[key] = tileInit[key];
        }
      }
      if (this.id===undefined) { this.id = "tileMap_" + ChoreoGraph.createId(5); }
    }
  },
  createTileMap: function(tileMapInit) {
    let newTileMap = new ChoreoGraph.plugins.TileMaps.TileMap(tileMapInit);
    ChoreoGraph.plugins.TileMaps.TileMaps[newTileMap.id] = newTileMap;
    return newTileMap;
  }
});
// Willby - 2024