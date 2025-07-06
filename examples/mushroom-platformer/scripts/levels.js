const levels = {};

class Level {
  id = "unnamed-level";

  startPosition = [0,0];
  fireflies = [];
  gemPositions = [];
  exitPosition = [];
  mushroomGlow = [];
  enemyPositions = [];
  enemiesToRecreate = [];

  scene;
  tilemap;
  lighting;
  gems = [];

  createScene() {
    this.scene = cg.createScene({},this.id);
    this.scene.addObject(cg.objects.player);

    this.scene.createItem("collection",{},"background");
    this.scene.createItem("collection",{},"entities");
    this.scene.createItem("collection",{},"foreground");
    this.scene.createItem("collection",{},"top");

    this.lighting = this.scene.createItem("graphic",{
      graphic : cg.createGraphic({type:"lighting",
        shadowType : ChoreoGraph.Lighting.SHADOW_FULL,
        shadowColour : "#060004dd"
      },"lighting-"+this.id),
    },"lighting","top");

    for (const [x,y,r,count] of this.fireflies) {
      createFireflies(x,y,r,count,this.scene);
    }

    for (const [x,y] of cg.createPath(this.gemPositions,"gems-"+this.id)) {
      const gem = createGem(x,y,this.scene);
      this.scene.addObject(gem);
      this.gems.push(gem);
    }

    for (const [x,y] of cg.createPath(this.enemyPositions,"enemies-"+this.id)) {
      const enemy = createEnemy(x,y,this);
      this.scene.addObject(enemy);
    }

    for (const position of cg.createPath(this.mushroomGlow,"mushroomGlow-"+this.id)) {
      this.lighting.graphic.lights.push(cg.Lighting.createLight({
        type : "spot",
        transformInit : {x:position[0],y:position[1]},
        outerRadius : 40,
        innerRadius : 3,
        brightness : 1,
        occlude : false,
        hexColour : "#7af2ff"
      }));
    }

    this.lighting.graphic.lights.push(cg.Lighting.createLight({
      type : "spot",
      transformInit : {parent:cg.objects.player.transform},
      outerRadius : 80,
      innerRadius : 1,
      brightness : 0.7,
      occlude : false,
      hexColour : "#ffdcbd"
    },"player-"+this.id));

    this.scene.createItem("graphic",{
      graphic:cg.createGraphic({
        type : "tilemap",
        tilemap : this.tilemap,
        debug : false,
        visibleLayers : ["Background","Midground","Foreground"]
      },"tilemapBackground-"+this.id)
    },"tilemapBackground","background");
    this.scene.createItem("graphic",{
      graphic:cg.createGraphic({
        type : "tilemap",
        tilemap : this.tilemap,
        debug : false,
        visibleLayers : ["Overlay"]
      },"tilemapForeground-"+this.id)
    },"tilemapForeground","foreground");

    cg.Physics.createCollidersFromTilemap(this.tilemap,4,null,this.scene,[0,2,3]);

    this.scene.createItem("graphic",{
      graphic : cg.graphics.exitDoor,
      transformInit : {
        x : this.exitPosition[0],
        y : this.exitPosition[1]
      }
    },"exitDoor","background");

    cg.Physics.createCollider({
      type : "rectangle",
      width : 32,
      height : 32,
      trigger : true,
      groups : [1],
      scene : this.scene,
      transformInit : {
        x : this.exitPosition[0],
        y : this.exitPosition[1]
      },
      enter : () => {
        if (!cg.graphics.exitDoor.open) { return; }
        cg.graphics.gameInterface.fadeOut();
      }
    },"exit-"+this.id);

    this.scene.createItem("graphic",{
      graphic : cg.graphics.gameInterface,
      transformInit : {
        CGSpace : false,
        canvasSpaceXAnchor : 0,
        canvasSpaceYAnchor : 0
      }
    },"gameInterface","top");
  };

  load() {
    cg.cameras.main.setScene(this.scene);
    cg.graphics.gameInterface.reset();
    cg.graphics.gameInterface.gemCount = this.gemPositions.length;
    cg.graphics.exitDoor.reset();
    cg.objects.player.transform.x = this.startPosition[0];
    cg.objects.player.transform.y = this.startPosition[1];
    cg.cameras.main.transform.x = this.startPosition[0];
    cg.cameras.main.transform.y = this.startPosition[1];
    for (const gem of this.gems) {
      gem.Graphic.transform.o = 1;
      gem.light.brightness = 1;
    }

    for (const [x,y] of this.enemiesToRecreate) {
      const enemy = createEnemy(x,y,this);
      this.scene.addObject(enemy);
    }
    this.enemiesToRecreate.length = 0;
  }
}

function createLevel(init={}) {
  const newLevel = new Level();
  ChoreoGraph.applyAttributes(newLevel,init);
  newLevel.createScene();
  levels[newLevel.id] = newLevel;
}

cg.settings.core.callbacks.start = () => {
  createLevel({
    id : "level1",
    startPosition : [70,105],
    exitPosition : [32,96],
    fireflies : [[381,37,40,10],[172,67,50,20]],
    mushroomGlow : [[7,108],[56,104],[104,110],[152,156],[232,103],[294,61],[343,75],[422,72],[487,61]],
    gemPositions : [[548,43]],
    enemyPositions : [[383,64]],
    tilemap : cg.Tilemaps.tilemaps.level1
  });

  createLevel({
    id : "level2",
    startPosition : [32,170],
    exitPosition : [64,48],
    fireflies : [],
    mushroomGlow : [[-137,12],[-41,8],[121,-4],[151,-8],[202,-2],[281,104],[232,125],[183,125],[120,108],[102,105],[55,139],[-25,109],[-58,107],[41,61],[88,60]],
    gemPositions : [[258,90],[-126,-14],[183,-29]],
    enemyPositions : [[251,114]],
    tilemap : cg.Tilemaps.tilemaps.level2
  });

  createLevel({
    id : "level3",
    startPosition : [55,105],
    exitPosition : [543,240],
    fireflies : [[97,53,50,40],[143,233,50,40],[299,376,50,30],[454,206,50,40],[117,-57,50,30],[573,42,50,30],[839,12,50,50],[1089,-29,50,20],[1068,139,50,30],[778,404,50,40],[711,402,20,5],[753,381,20,5],[754,330,20,5],[698,357,20,5],[652,340,20,5],[619,381,20,5],[584,364,20,5],[612,420,20,5],[543,406,20,5],[547,344,20,5],[508,347,20,5],[507,409,20,5],[454,341,20,5]],
    mushroomGlow : [[24,108],[120,109],[199,107],[153,-4],[22,-56],[231,-57],[263,-50],[345,-2],[376,73],[712,77],[842,56],[952,24],[984,-19],[1032,28],[1094,77],[1128,125],[1096,169],[1016,188],[919,136],[743,427],[679,376],[566,430],[550,426],[470,376],[375,411],[120,269],[104,268],[55,263],[231,236],[328,172],[422,251],[520,252],[569,252],[599,249],[630,252]],
    gemPositions : [[41,-72],[216,91],[56,252],[663,360],[1000,-39]],
    enemyPositions : [[405,53],[576,429],[1026,175]],
    tilemap : cg.Tilemaps.tilemaps.level3
  });
}

// LEVELS SCREEN
cg.createImage({
  file : "sheet.png",
  crop : [2*16+2,5*16+2,38,11]
},"title");
cg.createImage({
  file : "sheet.png",
  crop : [4*16+10,5*16+1,4,10]
},"numberOne");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+1,5*16+1,5,10]
},"numberTwo");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+9,5*16+1,5,10]
},"numberThree");

cg.graphicTypes.levels = new class Levels {
  draw(c,ax,ay,canvas) {
    const pixelScale = 18;
    canvas.drawImage(cg.images.title,0,-150,cg.images.title.width*pixelScale,cg.images.title.height*pixelScale);

    const separation = 200;
    const height = 120;

    canvas.drawImage(cg.images.numberOne,-separation,height,cg.images.numberOne.width*pixelScale,cg.images.numberOne.height*pixelScale);
    canvas.drawImage(cg.images.numberTwo,0,height,cg.images.numberTwo.width*pixelScale,cg.images.numberTwo.height*pixelScale);
    canvas.drawImage(cg.images.numberThree,separation,height,cg.images.numberThree.width*pixelScale,cg.images.numberThree.height*pixelScale);
  }
}

cg.scenes.levels.createItem("graphic",{
  graphic : cg.createGraphic({
    type : "levels"
  },"levels"),
  transformInit : {
    CGSpace : false,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5
  }
}, "levels");

cg.Input.createAction({
  keys : ["escape","conactiontop"],
  down : () => {
    cg.graphics.gameInterface.fadeOut();
  }
},"exitToLevels");

cg.Input.createAction({
  keys : ["condpadleft"],
  down : () => {
    if (cg.cameras.main.isSceneOpen(cg.scenes.levels)) {
      levels.level1.load();
    }
  }
},"exitToLevels");

cg.Input.createAction({
  keys : ["condpaddown"],
  down : () => {
    if (cg.cameras.main.isSceneOpen(cg.scenes.levels)) {
      levels.level2.load();
    }
  }
},"exitToLevels");

cg.Input.createAction({
  keys : ["condpadright"],
  down : () => {
    if (cg.cameras.main.isSceneOpen(cg.scenes.levels)) {
      levels.level3.load();
    }
  }
},"exitToLevels");

cg.Input.createButton({
  type : "rectangle",
  width : 120,
  height : 200,
  scene : cg.scenes.levels,
  transformInit : {
    CGSpace : false,
    x : -200,
    y : 120,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5,
  },
  down : () => {
    levels.level1.load();
  }
},"loadLevel1");

cg.Input.createButton({
  type : "rectangle",
  width : 120,
  height : 200,
  scene : cg.scenes.levels,
  transformInit : {
    CGSpace : false,
    x : 0,
    y : 120,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5,
  },
  down : () => {
    levels.level2.load();
  }
},"loadLevel2");

cg.Input.createButton({
  type : "rectangle",
  width : 120,
  height : 200,
  scene : cg.scenes.levels,
  transformInit : {
    CGSpace : false,
    x : 200,
    y : 120,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5,
  },
  down : () => {
    levels.level3.load();
  }
},"loadLevel3");

ChoreoGraph.start();