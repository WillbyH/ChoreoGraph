const cg = ChoreoGraph.instantiate({
  core : {
    baseImagePath : "images/",
    debugCanvasScale : 1,
    debugCGScale : 0.2
  },
  input : {
    preventDefaultKeys : ["up","down","left","right"],
    preventSingleTouch : true
  },
  lighting : {
    appendCanvases : false
  },
  audio : {
    baseAudioPath : "audio/",
  }
});

cg.createCamera({
  scaleMode : "maximum",
  size : 270,
},"main")
.addScene(cg.createScene({},"title"));
cg.createScene({},"main");
cg.createScene({},"exit");
cg.createScene({},"fail");

cg.scenes.main.createItem("collection",{},"background");
cg.scenes.main.createItem("collection",{},"entities");
cg.scenes.main.createItem("collection",{},"foreground");
cg.scenes.main.createItem("collection",{},"cameras");
cg.scenes.main.createItem("collection",{},"top");

cg.scenes.title.createItem("collection",{},"underlay");
cg.scenes.title.createItem("collection",{},"overlay");

cg.createCanvas({
  element:document.getElementsByTagName("canvas")[0],
  background:"#000000"
},"main")
.resizeWithSelf()
.setCamera(cg.cameras.main);

const stst = {};

// TILEMAP
cg.createImage({
  file : "BuffetSpriteSheet.png"
},"buffetSheet");

cg.Tiled.importTileSetFromFile("tiled/buffetSet.json",() => {
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/buffetMap.json",
    autoChunk : true,
    chunkWidth : 6,
    chunkHeight : 6,
    chunkOffsetX : -6*4,
    chunkOffsetY : -6*3,
    id : "buffetMap"
  },(tilemap) => {
    cg.createGraphic({
      type : "tilemap",
      tilemap : tilemap,
      debug : false,
      visibleLayers : ["Background","Props"]
    },"tilemapBackground");
    cg.createGraphic({
      type : "tilemap",
      tilemap : tilemap,
      debug : false,
      visibleLayers : ["Foreground"],
    },"tilemapForeground");
    cg.scenes.main.createItem("graphic",{graphic:cg.graphics.tilemapBackground},"tilemapBackground","background");
    cg.scenes.main.createItem("graphic",{graphic:cg.graphics.tilemapForeground},"tilemapForeground","foreground");
    cg.Physics.createCollidersFromTilemap(tilemap,3,null,cg.scenes.main);
  });
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 32,
  height : 32,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:32,y:96}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 32,
  height : 4*16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:-224,y:-32}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 16,
  height : 6*16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:-40,y:-16}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 18*16,
  height : 16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:32,y:-120}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 16,
  height : 4*16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:-8,y:-192}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 16,
  height : 4*16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:168,y:-192}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 4*16,
  height : 16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:112,y:-24}
});

cg.Physics.createCollider({
  type : "rectangle",
  width : 4*16,
  height : 2*16,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  transformInit : {x:-240,y:176},
  enter : () => {
    if (stst.spoon.transform.o==0) {
      stst.openTitleScreen();
      stst.hasEscapedWithSpoon = true;
    } else {
      stst.openExitMenu();
    }
  }
});

// LIGHTING
cg.scenes.main.createItem("graphic",{
  graphic : cg.createGraphic({type:"lighting",
    shadowType : ChoreoGraph.Lighting.SHADOW_FULL,
    shadowColour : "#060004dc"
  },"lighting"),
},"lighting","top");

// OCCLUDERS
cg.Lighting.createOccluder({
  path:cg.createPath([[-208,192],[-272,192],[-272,144],[-256,144],[-256,64],[-160,64],[-160,96],[-112,96],[-112,80],[-144,80],[-144,48],[-368,48],[-368,-32],[-272,-32],[-272,-48],[-368,-48],[-368,-128],[-160,-128],[-160,-240],[-16,-240],[-16,-160],[0,-160],[0,-256],[16,-256],[16,-272],[128,-272],[128,-256],[160,-256],[160,-160],[176,-160],[176,-224],[272,-224],[272,-128],[224,-128],[224,-80],[288,-80],[288,-144],[368,-144],[368,-32],[176,-32],[176,-128],[-96,-128],[-96,-176],[-112,-176],[-112,-16],[-48,-16],[-48,0],[-32,0],[-32,-32],[-96,-32],[-96,-112],[-32,-112],[-32,-96],[-16,-96],[-16,-112],[80,-112],[80,-96],[96,-96],[96,-112],[160,-112],[160,-32],[80,-32],[80,-16],[208,-16],[208,16],[224,16],[224,0],[288,0],[288,80],[224,80],[224,96],[288,96],[288,176],[176,176],[176,256],[-112,256],[-112,176],[-192,176],[-192,144],[-208,144]],"outerWall"),
},"outerWall");
cg.graphics.lighting.occluders.push(cg.Lighting.occluders.outerWall);

cg.Lighting.createOccluder({
  path:cg.createPath([[16,80],[48,80],[48,144],[16,144]],"pillarA")
},"pillarA");
cg.graphics.lighting.occluders.push(cg.Lighting.occluders.pillarA);

cg.Lighting.createOccluder({
  path:cg.createPath([[-208,-64],[-208,0],[-240,0],[-240,-64]],"pillarB")
},"pillarB");
cg.graphics.lighting.occluders.push(cg.Lighting.occluders.pillarB);

// LIGHTS
cg.createPath([[-80,118],[-16,118],[80,118],[144,118],[144,86],[80,86],[-16,86],[-80,86],[-320,-74],[-144,-42],[-64,-58],[128,-58],[256,54],[256,150],[144,198],[144,230],[80,230],[80,198],[32,198],[32,230],[-16,230],[-16,198],[-80,198],[-80,230]],"candlePositions");
stst.candles = [];

for (let i=0;i<cg.paths.candlePositions.length;i++) {
  let point = cg.paths.candlePositions[i];
  cg.Lighting.createLight({
    type : "spot",
    smoothQueue : [],
    lastSum : 0,
    transformInit : {x:point[0],y:point[1]},
    outerRadius : 30,
    innerRadius : 3,
    brightness : 0.46,
    occlude : false,
    hexColour : "#ffd21f"
  },"candle"+i);
};

cg.Lighting.createLight({
  type : "spot",
  smoothQueue : [],
  lastSum : 0,
  transformInit : {x:-261,y:157},
  outerRadius : 26,
  innerRadius : 0,
  brightness : 1,
  occlude : false,
  hexColour : "#66ffc2"
},"exit");

cg.callbacks.listen("core","process",() => {
  for (let i=0;i<cg.paths.candlePositions.length;i++) {
    if (cg.Lighting.lights["candle"+i] == undefined) { continue; }
    let candle = cg.Lighting.lights["candle"+i];
    let maxBrightness = 0.9;
    let minBrightness = 0.6;
    let smoothing = 3;
    let smoothQueue = candle.smoothQueue;
    while (smoothQueue.length >= smoothing) {
      candle.lastSum = smoothQueue.shift();
    }
    let newVal = minBrightness + Math.random() * (maxBrightness-minBrightness);
    smoothQueue.push(newVal);
    candle.lastSum += newVal;
    candle.brightness = candle.lastSum / smoothQueue.length;
  }

  if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected && cg.camera.isSceneOpen(cg.scenes.title)) {
    let change = -cg.Input.actions.sliderLeft.get() + cg.Input.actions.sliderRight.get();
    if (cg.graphics.title.controllerHover==0) {
      cg.Audio.masterVolume = Math.max(0,Math.min(1,cg.Audio.masterVolume + change * ChoreoGraph.timeDelta * 0.002));
    } else if (cg.graphics.title.controllerHover==1) {
      cg.Audio.buses.music.volume = Math.max(0,Math.min(1,cg.Audio.buses.music.volume + change * ChoreoGraph.timeDelta * 0.002));
    } else if (cg.graphics.title.controllerHover==2) {
      cg.Audio.buses.sfx.volume = Math.max(0,Math.min(1,cg.Audio.buses.sfx.volume + change * ChoreoGraph.timeDelta * 0.002));
    }
  }
});

stst.cheatCode = "scoopy";
stst.cheatsProgress = "";
stst.cheatsActive = false;

cg.Input.createAction({keys:["conleftleft","conrightleft"]},"sliderLeft");
cg.Input.createAction({keys:["conleftright","conrightright"]},"sliderRight");

cg.callbacks.listen("input","keyDown",(key) => {
  if (key==stst.cheatCode[stst.cheatsProgress.length]) {
    stst.cheatsProgress += key;
    if (stst.cheatsProgress==stst.cheatCode) {
      stst.cheatsActive = true;
    }
  } else {
    stst.cheatsProgress = "";
  }

  if (ChoreoGraph.Input.keyStates.shift&&key=="r") {
    stst.reset();
  } else if (key=="r"||key=="conactiontop") {
    stst.openFailMenu();
  } else if (key=="m") {
    cg.Audio.masterVolume = cg.Audio.masterVolume > 0 ? 0 : 1;
  } else if (key=="conleftstickup"||key=="conrightstickup"||key=="condpadup") {
    if (stst.failMenuIsOpen) {
      cg.graphics.fail.controllerHover = 0;
    } else if (stst.exitMenuIsOpen) {
      cg.graphics.exit.controllerHover = 0;
    } else if (cg.camera.isSceneOpen(cg.scenes.title)) {
      cg.graphics.title.controllerHover = Math.max(0,cg.graphics.title.controllerHover-1);
    }
  } else if (key=="conleftstickdown"||key=="conrightstickdown"||key=="condpaddown") {
    if (stst.failMenuIsOpen) {
      cg.graphics.fail.controllerHover = 1;
    } else if (stst.exitMenuIsOpen) {
      cg.graphics.exit.controllerHover = 1;
    } else if (cg.camera.isSceneOpen(cg.scenes.title)) {
      cg.graphics.title.controllerHover = Math.min(2,cg.graphics.title.controllerHover+1);
    }
  } else if (key=="conactionbottom") {
    if (stst.failMenuIsOpen) {
      if (cg.graphics.fail.controllerHover==0) {
        cg.Input.buttons.tryAgainYes.down();
      } else if (cg.graphics.fail.controllerHover==1) {
        cg.Input.buttons.tryAgainNo.down();
      }
    } else if (stst.exitMenuIsOpen) {
      if (cg.graphics.exit.controllerHover==0) {
        cg.Input.buttons.leaveMenuYes.down();
      } else if (cg.graphics.exit.controllerHover==1) {
        cg.Input.buttons.leaveMenuNo.down();
      }
    } else if (cg.camera.isSceneOpen(cg.scenes.title)) {
      stst.start()
    }
  }
  if (stst.cheatsActive) {
    if (key=="l") {
      cg.scenes.main.items.lighting.transform.o = !cg.scenes.main.items.lighting.transform.o;
    } else if (key=="p") {
      cg.settings.physics.debug.active = !cg.settings.physics.debug.active;
    } else if (key=="o") {
      cg.settings.lighting.debug.active = !cg.settings.lighting.debug.active;
    } else if (key=="k") {
      if (stst.scoopy.RigidBody.collider.groups.length==2) {
        stst.scoopy.RigidBody.collider.groups = [];
      } else {
        stst.scoopy.RigidBody.collider.groups = [0,1];
      }
      cg.Physics.calibrateCollisionOrder();
    } else if (key=="i") {
      cg.canvas.camera.z = cg.canvas.camera.z == 1 ? 0.2 : 1;
    }
  }
});

stst.caught = () => {
  if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected) {
    ChoreoGraph.Input.controller.gamepad.vibrationActuator.playEffect("dual-rumble", {
      duration: 200,
      weakMagnitude: 0.5,
      strongMagnitude: 0.5
    });
  }
  if (stst.alarm) { return; }
  stst.alarm = true;
  cg.objects.topLeftText.transform.o = 1;
  stst.alarmEndTime = cg.clock + 35000;
  cg.Audio.playing.ambience.stop(1);
  cg.Audio.sounds.running.play({bus:"music",allowBuffer:true,loop:true,soundInstanceId:"running"});
  cg.Audio.sounds.alarm.play({bus:"sfx",allowBuffer:true,loop:true,volume:0.5,fadeIn:0.5,soundInstanceId:"alarm"});
};

stst.reset = (resetScoopy) => {
  cg.objects.topLeftText.transform.o = 0;
  stst.alarm = false;
  stst.hasEscapedWithSpoon = false;
  cg.graphics.lighting.shadowColour = "#060004dc";
  stst.spoon.transform.o = 1;
  if (cg.Audio.playing.running!=undefined) {
    cg.Audio.playing.running.stop();
    cg.Audio.sounds.ambience.play({bus:"music",allowBuffer:true,loop:true,fadeIn:1,soundInstanceId:"ambience"});
  }
  if (cg.Audio.playing.alarm!=undefined) {
    cg.Audio.playing.alarm.stop();
  }
  if (resetScoopy) {
    stst.scoopy.transform.x = -232;
    stst.scoopy.transform.y = 142;
    stst.scoopy.Animator.animation = cg.Animation.animations.scoopyIdleLeft;
    stst.scoopy.Animator.reset();
  }
};

cg.callbacks.listen("core","loading",(checkData) => {
  cg.canvas.c.resetTransform();
  cg.canvas.c.clearRect(0, 0, cg.canvas.width, cg.canvas.height);
  cg.canvas.c.font = "16px Arial";
  cg.canvas.c.textAlign = "left";
  for (let i=0;i<Object.keys(checkData).length;i++) {
    let key = Object.keys(checkData)[i];
    if (checkData[key].pass) {
      cg.canvas.c.fillStyle = "#00ff00";
    } else {
      cg.canvas.c.fillStyle = "#ff0000";
    }
    const text = `${key} ${checkData[key].loaded}/${checkData[key].total}`;
    cg.canvas.c.fillText(text, 10, 30 + i * 30);
  }
})