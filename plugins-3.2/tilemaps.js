ChoreoGraph.plugin({
  name : "Tilemaps",
  key : "Tilemaps",
  version : "1.1",

  globalPackage : new class cgTilemaps {
    Tilemap = class Tilemap {
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
    };

    Tile = class Tile {
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
  }
});