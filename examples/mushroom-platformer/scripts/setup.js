const cg = ChoreoGraph.instantiate({
  core : {
    baseImagePath : "images/",
    debugCGScale : 0.3,
    imageSmoothingEnabled : false,
    inactiveTime : 100
  },
  physics : {
    gravity : 9.8*16
  },
  input : {
    preventDefaultKeys : ["up","down","left","right","space"]
  }
});

cg.createCamera({
  scaleMode : "maximum",
  size : 350,
  transformInit : {x:128,y:95}
},"main");

cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  background : "#110f0f"
},"main")
.resizeWithSelf()
.setCamera(cg.cameras.main);

cg.createImage({
  file : "sheet.png"
},"sheet");
cg.createImage({
  file : "waterfall.png"
},"waterfall");

cg.Tiled.importTileSetFromFile("tiled/mushroom-set.tsj",() => { loadTilemaps(); });
cg.Tiled.importTileSetFromFile("tiled/waterfall.tsj",() => { loadTilemaps(); });

function loadTilemaps() {
  if (Object.keys(cg.Tiled.tileSets).length !== cg.Tiled.totalExternalTileSets) { return; }
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/testmap.tmj",
    id : "testMap"
  });
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/level1.tmj",
    id : "level1"
  });
}