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
  },
  audio : {
    baseAudioPath : "sounds/",
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

cg.createScene({},"levels");

cg.cameras.main.setScene(cg.scenes.levels);

cg.Audio.createSound({source:"music.mp3"},"music");
cg.Audio.sounds.music.play({
  allowBuffer : true,
  loop : true,
  fadeIn : 4,
  soundInstanceId : "music"
})

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
    dataUrl : "tiled/level1.tmj",
    id : "level1"
  });
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/level2.tmj",
    id : "level2"
  });
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/level3.tmj",
    id : "level3"
  });
}