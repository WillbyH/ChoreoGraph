ChoreoGraph.plugin({
  name : "Tilemaps",
  key : "Tilemaps",
  version : "1.1",

  globalPackage : new class cgTilemaps {
    Tilemap = class Tilemap {
      width = 0;
      height = 0;
      tileWidth = 0;
      tileHeight = 0;
      chunks = [];
      layers = [];
      cache = true;

      createChunk(chunkInit={}) {
        let newChunk = new ChoreoGraph.Tilemaps.Chunk(this);
        ChoreoGraph.applyAttributes(newChunk,chunkInit);
        this.chunks.push(newChunk);
        return newChunk;
      };

      createLayer(layerInit={}) {
        let newLayer = new ChoreoGraph.Tilemaps.TilemapLayer();
        ChoreoGraph.applyAttributes(newLayer,layerInit);
        this.layers.push(newLayer);
        return newLayer;
      };
    };

    TilemapLayer = class TilemapLayer {
      name = "Unnamed Layer";
      visible = true;
    };

    Chunk = class Chunk {
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

      createLayer(layerInit={}) {
        let newLayer = new ChoreoGraph.Tilemaps.ChunkLayer(this);
        ChoreoGraph.applyAttributes(newLayer,layerInit);
        this.layers.push(newLayer);
        if (this.tilemap.cg.settings.tilemaps.autoCache&&this.tilemap.cache) {
          newLayer.createCache();
        }
        return newLayer;
      };
    };

    ChunkLayer = class ChunkLayer {
      index = 0;
      chunk = null;
      cache = null;
      tiles = [];

      constructor(chunk) {
        if (chunk==undefined) { console.warn("ChunkLayer requires a Chunk"); return; }
        this.chunk = chunk;
        this.index = chunk.layers.length;
      }

      createCache() {
        this.cache = new ChoreoGraph.Tilemaps.CachedChunkLayer(this);
      };
    };

    CachedChunkLayer = class CachedChunkLayer {
      canvas = null;
      c = null;
      animatedTiles = [];
      chunkLayer = null;
      awaitingImages = 0;

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
        this.c = this.canvas.getContext("2d");

        for (let i=0;i<this.chunkLayer.tiles.length;i++) {
          if (this.chunkLayer.tiles[i]==null) { continue; }
          let tile = cg.Tilemaps.tiles[this.chunkLayer.tiles[i]];
          if (!tile.image.ready) {
            this.awaitingImages++;
            tile.image.onLoad = () => {
              this.awaitingImages--;
              if (this.awaitingImages == 0) {
                this.draw();
              }
            }
          }
        }
      };

      draw() {
        let chunk = this.chunkLayer.chunk;
        let cg = chunk.tilemap.cg;
        for (let i=0;i<this.chunkLayer.tiles.length;i++) {
          if (this.chunkLayer.tiles[i]==null) { continue; }
          let tileX = i % chunk.width;
          let tileY = Math.floor(i / chunk.width);
          let tile = cg.Tilemaps.tiles[this.chunkLayer.tiles[i]];
          if (tile.animated) {
            let animatedTile = new ChoreoGraph.Tilemaps.AnimatedTile();
            animatedTile.tile = tile;
            animatedTile.x = tileX;
            animatedTile.y = tileY;
            animatedTile.chunkLayer = this.chunkLayer;
            this.animatedTiles.push(animatedTile);
          }
          this.c.resetTransform();
          this.c.translate(tileX * chunk.tilemap.tileWidth,tileY * chunk.tilemap.tileHeight);
          tile.draw(this.c);
        }
      }

      updateAnimatedTiles() {
        for (let i=0;i<this.animatedTiles.length;i++) {
          let animatedTile = this.animatedTiles[i];
          this.c.resetTransform();
          let tilemap = animatedTile.chunkLayer.chunk.tilemap;
          this.c.translate(tileX * tilemap.tileWidth,tileY * tilemap.tileHeight);
        }
      };
    };

    AnimatedTile = class AnimatedTile {
      tile = null;
      chunkLayer = null;
      x = 0;
      y = 0;
    };

    Tile = class Tile {
      animated = false;
      animationData = null;
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
        // let flipXOffset = 0;
        // let flipYOffset = 0;
        // if (this.flipX) {
        //   flipXOffset = this.width;
        //   c.scale(-1,1);
        // }
        // if (this.flipY) {
        //   flipYOffset = this.height;
        //   c.scale(1,-1);
        // }
        // if (this.flipDiagonal) {
        //   c.scale(-1,1);
        //   let savedY = y;
        //   y = x;
        //   x = savedY;
        //   let savedXOffset = flipXOffset;
        //   flipXOffset = flipYOffset;
        //   flipYOffset = savedXOffset;
        //   c.rotate(Math.PI*0.5);
        // }
        // c.drawImage(this.image.image,this.x+TileMap.tileSeamAllowance,this.y+TileMap.tileSeamAllowance,this.width-TileMap.tileSeamAllowance*2,this.height-TileMap.tileSeamAllowance*2,x-flipXOffset,y-flipYOffset,width,height);
        c.drawImage(this.image.image,this.imageX,this.imageY,this.width,this.height,0,0,this.width,this.height);
        c.restore();
      }
    };

    AnimatedTileData = class AnimatedTileData {
      frames = [];
      totalDuration = 0;

      addFrame(frame) {
        this.frames.push(frame);
        this.totalDuration += frame.duration;
      };
    };

    AnimatedTileFrame = class AnimatedTileFrame {
      image = null;
      duration = 0;
    };

    instanceObject = class cgInstanceTilemaps {
      tilemaps = {};
      tiles = {};

      constructor(cg) {
        this.cg = cg;
      }

      createTilemap(tileMapInit={},id=ChoreoGraph.id.get()) {
        let newTilemap = new ChoreoGraph.Tilemaps.Tilemap(tileMapInit);
        newTilemap.id = id;
        newTilemap.cg = this.cg;
        ChoreoGraph.applyAttributes(newTilemap,tileMapInit);
        this.tilemaps[id] = newTilemap;
        this.cg.keys.tilemaps.push(id);
        return newTilemap;
      };

      createTile(tileInit={},id=ChoreoGraph.id.get()) {
        let newTile = new ChoreoGraph.Tilemaps.Tile(tileInit);
        newTile.id = id;
        newTile.cg = this.cg;
        ChoreoGraph.applyAttributes(newTile,tileInit);
        this.tiles[id] = newTile;
        this.cg.keys.tiles.push(id);
        return newTile;
      };
    };
  },

  instanceConnect(cg) {
    cg.Tilemaps = new ChoreoGraph.Tilemaps.instanceObject(cg);
    cg.keys.tilemaps = [];
    cg.keys.tiles = [];

    cg.attachSettings("tilemaps",{
      autoCache : true,
      appendCanvases : false
    });

    cg.graphicTypes.tilemap = new class TilemapGraphic {
      setup(init,cg) {
        this.manualTransform = true;
        this.tilemap = null;
        this.visibleLayers = [];
        this.culling = true;
        this.debug = true;
        this.drawBuffer = document.createElement("canvas");
        this.drawBufferContext = this.drawBuffer.getContext("2d",{alpha:true});
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
        for (let chunk of tilemap.chunks) {
          let chunkX = chunk.x * tilemap.tileWidth;
          let chunkY = chunk.y * tilemap.tileHeight;
          let chunkWidth = chunk.width * tilemap.tileWidth;
          let chunkHeight = chunk.height * tilemap.tileHeight;

          let cull = false;

          if (cg.settings.core.frustumCulling) {
            let bx = gx;
            let by = gy;
            let bw = chunkWidth * gsx;
            let bh = chunkHeight * gsy;
            let camera = canvas.camera;
            if (camera.cullOverride!==null) { camera = camera.cullOverride; }
            let cw = canvas.width/camera.z;
            let ch = canvas.height/camera.z;
            let cx = camera.x - cw/2;
            let cy = camera.y - ch/2;

            if (!(cx+cw<bx||cx>bx+bw||cy+ch<by||cy>by+bh)) {
              cull = true;
            }
          }
          if (!cull) {
            // Uh, draw the tiles here
          }
          if (this.debug) {
            c.lineWidth = 3 * cg.settings.core.debugScale / canvas.camera.z;
            if (cull) {
              c.strokeStyle = "green";
            } else {
              c.strokeStyle = "red";
            }
            c.strokeRect(chunkX,chunkY,chunkWidth,chunkHeight);

            c.strokeStyle = "blue";
            for (let x=1;x<chunk.width;x++) {
              c.beginPath();
              c.moveTo(chunkX+x*tilemap.tileWidth,chunkY);
              c.lineTo(chunkX+x*tilemap.tileWidth,chunkY+chunkHeight);
              c.stroke();
            }
            for (let y=1;y<chunk.height;y++) {
              c.beginPath();
              c.moveTo(chunkX,chunkY+y*tilemap.tileHeight);
              c.lineTo(chunkX+chunkWidth,chunkY+y*tilemap.tileHeight);
              c.stroke();
            }
          }
        }
      };
    };
  }
});