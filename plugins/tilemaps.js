ChoreoGraph.plugin({
  name : "Tilemaps",
  key : "Tilemaps",
  version : "1.1",

  globalPackage : new class cgTilemaps {
    Tilemap = class cgTilemap {
      tileWidth = 0;
      tileHeight = 0;
      cache = true;

      awaitedImages = [];
      loadedImages = 0;
      imagesReady = false;
      hasDrawBufferedWithAllImagesReady = false;
      chunks = [];
      layers = [];

      createChunk(chunkInit={}) {
        let newChunk = new ChoreoGraph.Tilemaps.Chunk(this);
        ChoreoGraph.applyAttributes(newChunk,chunkInit);
        this.chunks.push(newChunk);
        return newChunk;
      };

      createLayer(layerInit={}) {
        if (layerInit.name===undefined) { delete layerInit.name; }
        let newLayer = new ChoreoGraph.Tilemaps.TilemapLayer();
        ChoreoGraph.applyAttributes(newLayer,layerInit);
        this.layers.push(newLayer);
        return this;
      };

      createChunkedLayer(chunksInit={}) {
        let requiredKeys = ["tiles","chunkWidth","chunkHeight","totalWidth"];
        let missing = false;
        for (let key of requiredKeys) {
          if (chunksInit[key]==undefined) {
            console.warn("createChunkedLayer requires " + key + " to be set");
            missing = true;
          }
        }
        if (missing) { return; }
        const chunksOffsetX = chunksInit.chunksOffsetX || 0;
        const chunksOffsetY = chunksInit.chunksOffsetY || 0;
        const tiles = chunksInit.tiles;
        const chunkWidth = chunksInit.chunkWidth;
        const chunkHeight = chunksInit.chunkHeight;
        const totalWidth = chunksInit.totalWidth;
        const layerName = chunksInit.layerName || undefined;
        const layerVisible = chunksInit.layerVisible == undefined ? true : chunksInit.layerVisible;

        if (Math.abs((totalWidth/chunkWidth)%1)>0) {
          console.warn("totalWidth must be a multiple of chunkWidth");
          return;
        }

        this.createLayer({
          name : layerName,
          visible : layerVisible
        });

        let totalHeight = Math.ceil(tiles.length / totalWidth);

        for (let chunkSpaceX=0;chunkSpaceX<Math.ceil(totalWidth/chunkWidth);chunkSpaceX++) {
          for (let chunkSpaceY=0;chunkSpaceY<Math.ceil(totalHeight/chunkHeight);chunkSpaceY++) {
            let chunkTiles = [];
            for (let y=0;y<chunkHeight;y++) {
              for (let x=0;x<chunkWidth;x++) {
                let tileIndex = (chunkSpaceX * chunkWidth + x) + (chunkSpaceY * chunkHeight + y) * totalWidth;
                let tile = tiles[tileIndex];
                if (tile==undefined) { tile = null; }
                chunkTiles.push(tile);
              }
            }
            let chunk = null;
            for (let chunkIndex=0;chunkIndex<this.chunks.length;chunkIndex++) {
              let chunkCheck = this.chunks[chunkIndex];
              if (chunkCheck.x == chunkSpaceX * chunkWidth + chunksOffsetX
                  && chunkCheck.y == chunkSpaceY * chunkHeight + chunksOffsetY
                  && chunkCheck.width == chunkWidth
                  && chunkCheck.height == chunkHeight) {
                chunk = chunkCheck;
              }
            }
            if (chunk==null) {
              chunk = this.createChunk({
                x : chunkSpaceX * chunkWidth + chunksOffsetX,
                y : chunkSpaceY * chunkHeight + chunksOffsetY,
                width : chunkWidth,
                height : chunkHeight
              })
            }
            chunk.createLayer({
              tiles : chunkTiles
            });
          }
        }
      };
    };

    TilemapLayer = class cgTilemapLayer {
      name = "Unnamed Layer";
      visible = true;
    };

    Chunk = class cgTilemapChunk {
      tilemap = null;
      x = 0;
      y = 0;
      width = 16;
      height = 16;
      layers = [];

      constructor(tilemap) {
        if (tilemap==undefined) { console.warn("Chunk requires a Tilemap"); return; }
        this.tilemap = tilemap;
      };

      createLayer(layerInit={},layerIndex=null) {
        let newLayer = new ChoreoGraph.Tilemaps.ChunkLayer(this,layerIndex);
        ChoreoGraph.applyAttributes(newLayer,layerInit);
        if (newLayer.tiles==undefined) { newLayer.tiles = []; }
        for (let tileId of newLayer.tiles) {
          if (tileId==null) { continue; }
          let tile = this.tilemap.cg.Tilemaps.tiles[tileId];
          if (tile==undefined) {
            console.warn("Tile with id " + tileId + " not found in createLayer:",this.tilemap.id);
            continue;
          }
          function awaitImage(chunk,image) {
            if (chunk.tilemap.awaitedImages.includes(image)) { return; }
            chunk.tilemap.awaitedImages.push(image);
            image.onLoad = () => {
              chunk.tilemap.loadedImages++;
              if (chunk.tilemap.loadedImages == chunk.tilemap.awaitedImages.length) {
                chunk.tilemap.imagesReady = true;
              }
            };
          }
          if (tile.animated) {
            for (let frame of tile.frames) {
              awaitImage(this,frame.image);
            }
          } else {
            awaitImage(this,tile.image);
          }
        }
        if (layerIndex!==null) {
          this.layers[layerIndex] = newLayer;
        } else {
          this.layers.push(newLayer);
        }
        if (this.tilemap.cg.settings.tilemaps.preCacheChunkLayers&&this.tilemap.cache) {
          newLayer.createCache();
        }
        return newLayer;
      };
    };

    ChunkLayer = class cgTilemapChunkLayer {
      tilemap = null;
      index = 0;
      chunk = null;
      cache = null;
      tiles = [];

      constructor(chunk,layerOverride=null) {
        if (chunk==undefined) { console.warn("ChunkLayer requires a Chunk"); return; }
        this.chunk = chunk;
        this.tilemap = chunk.tilemap;
        this.index = layerOverride || chunk.layers.length;
      }

      createCache() {
        if (!this.tilemap.layers[this.index].visible) { return; }
        this.cache = new ChoreoGraph.Tilemaps.CachedChunkLayer(this);
      };

      draw(c) {
        if (this.cache!==null) {
          this.drawFromCache(c);
        } else {
          if (this.tilemap.cache) {
            this.createCache();
            if (this.cache!==null) { this.drawFromCache(c); }
          } else {
            this.drawFromTiles(c);
          }
        }
      };

      drawFromCache(c) {
        if (this.cache.animatedTiles.length>0) {
          this.cache.updateAnimatedTiles();
        }
        c.drawImage(this.cache.canvas,0,0,this.chunk.tilemap.tileWidth*this.chunk.width,this.chunk.tilemap.tileHeight*this.chunk.height);
      };

      drawFromTiles(c) {
        let chunk = this.chunk;
        let cg = chunk.tilemap.cg;
        for (let i=0;i<this.tiles.length;i++) {
          if (this.tiles[i]==null) { continue; }
          let tileX = i % chunk.width;
          let tileY = Math.floor(i / chunk.width);
          let tile = cg.Tilemaps.tiles[this.tiles[i]];
          c.save();
          c.translate(tileX * chunk.tilemap.tileWidth,tileY * chunk.tilemap.tileHeight);
          tile.draw(c);
          c.restore();
        }
      };
    };

    CachedChunkLayer = class cgTilemapCachedChunkLayer {
      canvas = null;
      c = null;
      animatedTiles = [];
      chunkLayer = null;
      awaitingImages = 0;
      cached = false;

      constructor(chunkLayer) {
        if (chunkLayer==undefined) { console.warn("CachedChunkLayer requires a ChunkLayer"); return; }
        this.chunkLayer = chunkLayer;
        let chunk = chunkLayer.chunk;
        let cg = chunk.tilemap.cg;
        this.canvas = document.createElement("canvas");
        this.canvas.width = chunk.width * chunk.tilemap.tileWidth;
        this.canvas.height = chunk.height * chunk.tilemap.tileHeight;
        if (cg.settings.tilemaps.appendCanvases) {
          document.body.appendChild(this.canvas);
        }
        this.c = this.canvas.getContext("2d",{alpha:true});

        for (let i=0;i<this.chunkLayer.tiles.length;i++) {
          if (this.chunkLayer.tiles[i]==null) { continue; }
          let tile = cg.Tilemaps.tiles[this.chunkLayer.tiles[i]];
          if (tile.animated) {
            this.animatedTiles.push({
              tile : tile,
              x : i % chunk.width,
              y : Math.floor(i / chunk.width)
            });
            continue;
          }
          if (!tile.image.ready) {
            this.awaitingImages++;
            tile.image.onLoad = () => {
              this.awaitingImages--;
              if (this.awaitingImages == 0) {
                if (this.cached) { return; }
                this.draw();
              }
            }
          } else {
            if (this.cached) { return; }
            this.draw();
          }
        }
      };

      draw() {
        this.cached = true;
        let chunk = this.chunkLayer.chunk;
        let cg = chunk.tilemap.cg;
        for (let i=0;i<this.chunkLayer.tiles.length;i++) {
          if (this.chunkLayer.tiles[i]==null) { continue; }
          let tileX = i % chunk.width;
          let tileY = Math.floor(i / chunk.width);
          let tile = cg.Tilemaps.tiles[this.chunkLayer.tiles[i]];
          this.c.resetTransform();
          this.c.translate(tileX * chunk.tilemap.tileWidth,tileY * chunk.tilemap.tileHeight);
          tile.draw(this.c);
        }
      }

      updateAnimatedTiles() {
        for (let i=0;i<this.animatedTiles.length;i++) {
          let animatedTileData = this.animatedTiles[i];
          this.c.resetTransform();
          let tilemap = this.chunkLayer.chunk.tilemap;
          this.c.translate(animatedTileData.x * tilemap.tileWidth,animatedTileData.y * tilemap.tileHeight);
          animatedTileData.tile.draw(this.c);
        }
      };
    };

    Tile = class cgTilemapTile {
      image = null;
      flipX = false;
      flipY = false;
      flipDiagonal = false;
      imageX = 0;
      imageY = 0;
      width = 0;
      height = 0;

      draw(c) {
        c.save();
        let flipXOffset = 0;
        let flipYOffset = 0;
        if (this.flipX) {
          flipXOffset = -this.width;
          c.scale(-1,1);
        }
        if (this.flipY) {
          flipYOffset = -this.height;
          c.scale(1,-1);
        }
        if (this.flipDiagonal) {
          c.scale(-1,1);
          let savedXOffset = flipXOffset;
          flipXOffset = flipYOffset;
          flipYOffset = savedXOffset;
          c.rotate(Math.PI*0.5);
        }
        c.drawImage(this.image.image,this.imageX,this.imageY,this.width,this.height,flipXOffset,flipYOffset,this.width,this.height);
        c.restore();
      }
    };

    AnimatedTile = class cgTilemapAnimatedTile {
      frames = [];
      totalDuration = 0;

      draw(c) {
        c.save();
        let playhead = (this.cg.clock/1000)%(this.totalDuration);
        let currentFrame = null;
        for (let frame of this.frames) {
          playhead -= frame.duration;
          if (playhead<0) {
            currentFrame = frame;
            break;
          }
        }
        let flipXOffset = 0;
        let flipYOffset = 0;
        if (currentFrame.flipX) {
          flipXOffset = -currentFrame.width;
          c.scale(-1,1);
        }
        if (currentFrame.flipY) {
          flipYOffset = -currentFrame.height;
          c.scale(1,-1);
        }
        if (currentFrame.flipDiagonal) {
          c.scale(-1,1);
          let savedXOffset = flipXOffset;
          flipXOffset = flipYOffset;
          flipYOffset = savedXOffset;
          c.rotate(Math.PI*0.5);
        }
        c.clearRect(flipXOffset,flipYOffset,currentFrame.width,currentFrame.height);
        c.drawImage(currentFrame.image.image,currentFrame.imageX,currentFrame.imageY,currentFrame.width,currentFrame.height,flipXOffset,flipYOffset,currentFrame.width,currentFrame.height);
        c.restore();
      }

      addFrame(animatedTileFrameInit={}) {
        let newFrame = new ChoreoGraph.Tilemaps.AnimatedTileFrame();
        ChoreoGraph.applyAttributes(newFrame,animatedTileFrameInit);
        if (newFrame.image==undefined) {
          console.warn("AnimatedTileFrame image undefined for tile:", this.id);
          return;
        }
        newFrame.index = this.frames.length;
        this.frames.push(newFrame);
        this.totalDuration += newFrame.duration || 0.1;
        return this;
      };
    };

    AnimatedTileFrame = class cgTilemapAnimatedTileFrame {
      image = null;
      duration = 0;
      flipX = false;
      flipY = false;
      flipDiagonal = false;
      imageX = 0;
      imageY = 0;
      width = 0;
      height = 0;
    };

    InstanceObject = class cgInstanceTilemaps {
      tilemaps = {};
      tiles = {};

      constructor(cg) {
        this.cg = cg;
      }

      createTilemap(tileMapInit={},id=ChoreoGraph.id.get()) {
        if (this.cg.keys.tilemaps.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
        let newTilemap = new ChoreoGraph.Tilemaps.Tilemap(tileMapInit);
        newTilemap.id = id;
        newTilemap.cg = this.cg;
        ChoreoGraph.applyAttributes(newTilemap,tileMapInit);
        this.tilemaps[id] = newTilemap;
        this.cg.keys.tilemaps.push(id);
        return newTilemap;
      };

      createTile(tileInit={},id=ChoreoGraph.id.get()) {
        if (this.cg.keys.tiles.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
        let newTile = new ChoreoGraph.Tilemaps.Tile(tileInit);
        newTile.id = id;
        newTile.cg = this.cg;
        ChoreoGraph.applyAttributes(newTile,tileInit);
        newTile.animated = false;
        if (newTile.image==undefined) {
          console.warn("Tile image undefined for tile:", id);
        }
        this.tiles[id] = newTile;
        this.cg.keys.tiles.push(id);
        return newTile;
      };

      createAnimatedTile(id=ChoreoGraph.id.get()) {
        if (this.cg.keys.tiles.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
        let newTile = new ChoreoGraph.Tilemaps.AnimatedTile();
        newTile.id = id;
        newTile.cg = this.cg;
        newTile.animated = true;
        this.tiles[id] = newTile;
        this.cg.keys.tiles.push(id);
        return newTile;
      };
    };
  },

  instanceConnect(cg) {
    cg.Tilemaps = new ChoreoGraph.Tilemaps.InstanceObject(cg);
    cg.keys.tilemaps = [];
    cg.keys.tiles = [];

    cg.attachSettings("tilemaps",{
      preCacheChunkLayers : true,
      appendCanvases : false
    });

    cg.graphicTypes.tilemap = new class TilemapGraphic {
      setup(init,cg) {
        this.manualTransform = true;
        this.tilemap = null;
        this.visibleLayers = [];
        this.culling = true;
        this.debug = false;
        this.useDrawBuffer = true;

        this.drawBuffer = document.createElement("canvas");
        this.drawBufferContext = this.drawBuffer.getContext("2d",{alpha:true});
        this.previousBufferWidth = 0;
        this.previousBufferHeight = 0;

        if (cg.settings.tilemaps.appendCanvases) {
          document.body.appendChild(this.drawBuffer);
        }

        if (init.imageSmoothingEnabled===undefined) { init.imageSmoothingEnabled = false; }
      };
      draw(canvas,transform) {
        let go = transform.o;
        if (go==0) { return; }
        let gx = transform.x+transform.ax;
        let gy = transform.y+transform.ay;
        let gsx = transform.sx;
        let gsy = transform.sy;
        let CGSpace = transform.CGSpace;
        let flipX = transform.flipX;
        let flipY = transform.flipY;
        let canvasSpaceXAnchor = transform.canvasSpaceXAnchor;
        let canvasSpaceYAnchor = transform.canvasSpaceYAnchor;

        ChoreoGraph.transformContext(canvas.camera,gx,gy,0,gsx,gsy,CGSpace,flipX,flipY,canvasSpaceXAnchor,canvasSpaceYAnchor);

        let c = canvas.c;
        let cg = canvas.cg;
        c.globalAlpha = go;
        let tilemap = this.tilemap;

        let chunksToBuffer = [];
        let xMin = 0;
        let yMin = 0;
        let xMax = 0;
        let yMax = 0;

        let debugChunks = [];

        for (let chunk of tilemap.chunks) {
          let chunkX = chunk.x * tilemap.tileWidth;
          let chunkY = chunk.y * tilemap.tileHeight;
          let chunkWidth = chunk.width * tilemap.tileWidth;
          let chunkHeight = chunk.height * tilemap.tileHeight;

          let cull = false;

          if (cg.settings.core.frustumCulling&&CGSpace) {
            let bw = chunkWidth * gsx;
            let bh = chunkHeight * gsy;
            let bx = chunkX * gsx + gx;
            let by = chunkY * gsy + gy;
            let camera = canvas.camera;
            if (camera.cullOverride!==null) { camera = camera.cullOverride; }
            let cw = canvas.width / camera.cz;
            let ch = canvas.height / camera.cz;
            let cx = camera.x - cw/2;
            let cy = camera.y - ch/2;

            if (cx+cw<bx||cx>bx+bw||cy+ch<by||cy>by+bh) {
              cull = true;
            }
          }
          if (!cull) {
            if (this.useDrawBuffer) {
              for (let layerIndex=0;layerIndex<tilemap.layers.length;layerIndex++) {
                let layer = tilemap.layers[layerIndex];
                let chunkLayer = chunk.layers[layerIndex];
                if (chunkLayer==undefined||layer.visible==false||((this.visibleLayers.length>0&&!this.visibleLayers.includes(layer.name))&&(this.visibleLayers.length!==0))) {
                  continue;
                }
                xMin = Math.min(xMin,chunkX);
                yMin = Math.min(yMin,chunkY);
                xMax = Math.max(xMax,chunkX + chunkWidth);
                yMax = Math.max(yMax,chunkY + chunkHeight);

                if (chunksToBuffer[layerIndex]==undefined) {
                  chunksToBuffer[layerIndex] = [];
                }

                if (chunkLayer.cache!==null&&chunkLayer.cache.animatedTiles.length>0) {
                  bufferRequiresUpdate = true;
                }

                chunksToBuffer[layerIndex].push(chunkLayer);
              }
            } else {
              c.save();
              c.translate(chunkX,chunkY);
              for (let chunkLayer of chunk.layers) {
                if (tilemap.layers==0) {
                  if (this.visibleLayers.length==0||this.visibleLayers.includes(chunkLayer.index)) {
                    chunkLayer.draw(c);
                  }
                } else {
                  let layer = tilemap.layers[chunkLayer.index];
                  if (layer.visible&&(this.visibleLayers.length==0||this.visibleLayers.includes(layer.name)||this.visibleLayers.includes(chunkLayer.index))) {
                    chunkLayer.draw(c);
                  }
                }
              }
              c.restore();
            }
          }
          if (this.debug) {
            debugChunks.push({
              chunk : chunk,
              chunkX : chunkX,
              chunkY : chunkY,
              chunkWidth : chunkWidth,
              chunkHeight : chunkHeight,
              cull : cull
            });
          }
        }
        if (!tilemap.hasDrawBufferedWithAllImagesReady&&tilemap.imagesReady) {
          tilemap.hasDrawBufferedWithAllImagesReady = true;
          bufferRequiresUpdate = true;
        }
        if (this.useDrawBuffer) {
          let bufferWidth = xMax - xMin;
          let bufferHeight = yMax - yMin;
          let newSize = this.previousBufferWidth!=bufferWidth || this.previousBufferHeight!=bufferHeight;
          if ((bufferWidth>0||bufferHeight>0) && (bufferRequiresUpdate || newSize)) {
            this.previousBufferWidth = bufferWidth;
            this.previousBufferHeight = bufferHeight;
            this.drawBuffer.width = bufferWidth;
            this.drawBuffer.height = bufferHeight;
            this.drawBufferContext.clearRect(0,0,bufferWidth,bufferHeight);
            let lc = this.drawBufferContext;

            for (let visibleChunksByLayer of chunksToBuffer) {
              if (visibleChunksByLayer==undefined) { continue; }
              for (let chunkLayer of visibleChunksByLayer) {
                let chunk = chunkLayer.chunk;
                lc.save();
                lc.translate(chunk.x * tilemap.tileWidth - xMin, chunk.y * tilemap.tileHeight - yMin);
                chunkLayer.draw(lc);
                lc.restore();
              }
            }

            c.drawImage(this.drawBuffer,xMin,yMin,bufferWidth,bufferHeight)
          }
        }

        for (let debugChunk of debugChunks) {
          c.lineWidth = 3 * cg.settings.core.debugCanvasScale / canvas.camera.cz;
          if (debugChunk.cull) {
            c.strokeStyle = "red";
          } else {
            c.strokeStyle = "green";
          }
          c.strokeRect(debugChunk.chunkX,debugChunk.chunkY,debugChunk.chunkWidth,debugChunk.chunkHeight);

          c.strokeStyle = "blue";
          for (let x=1;x<debugChunk.chunk.width;x++) {
            c.beginPath();
            c.moveTo(debugChunk.chunkX+x*tilemap.tileWidth,debugChunk.chunkY);
            c.lineTo(debugChunk.chunkX+x*tilemap.tileWidth,debugChunk.chunkY+debugChunk.chunkHeight);
            c.stroke();
          }
          for (let y=1;y<debugChunk.chunk.height;y++) {
            c.beginPath();
            c.moveTo(debugChunk.chunkX,debugChunk.chunkY+y*tilemap.tileHeight);
            c.lineTo(debugChunk.chunkX+debugChunk.chunkWidth,debugChunk.chunkY+y*tilemap.tileHeight);
            c.stroke();
          }
        }
      };
    };
  }
});