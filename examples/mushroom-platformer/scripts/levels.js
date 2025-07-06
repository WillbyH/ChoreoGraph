const levels = {};

class Level {
  id = "unnamed-level";

  startPosition = [0,0];
  fireflies = [];
  gemPositions = [];
  exitPosition = [];
  mushroomGlow = [];
  enemyPositions = [];

  scene;
  tilemap;
  lighting;
  gems = [];
  enemies = [];

  createScene() {
    this.scene = cg.createScene({},this.id);
    this.scene.createItem("collection",{},"background");
    this.scene.createItem("collection",{},"entities");
    this.scene.createItem("collection",{},"foreground");
    this.scene.createItem("collection",{},"top");

    this.lighting = this.scene.createItem("graphic",{
      graphic : cg.createGraphic({type:"lighting",
        shadowType : ChoreoGraph.Lighting.SHADOW_FULL,
        shadowColour : "#060004aa"
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
      const enemy = createEnemy(x,y,this.scene);
      this.scene.addObject(enemy);
      this.enemies.push(enemy);
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

    this.scene.addObject(cg.objects.player);

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
        visibleLayers : ["Background","Foreground"]
      },"tilemapBackground")
    },"tilemapBackground","background");
    this.scene.createItem("graphic",{
      graphic:cg.createGraphic({
        type : "tilemap",
        tilemap : this.tilemap,
        debug : false,
        visibleLayers : ["Overlay"]
      },"tilemapForeground")
    },"tilemapForeground","foreground");

    cg.Physics.createCollidersFromTilemap(this.tilemap,3,null,this.scene,[0,2,3]);

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
        // DO EXIT TRANSITION
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
    for (const gem of this.gems) {
      gem.Graphic.transform.o = 1;
      gem.light.brightness = 1;
    }
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
    id : "test",
    startPosition : [85,125],
    exitPosition : [81,128],
    fireflies : [[100,75,30,10]],
    mushroomGlow : [[104,141],[136,93],[168,138]],
    gemPositions : [[170,79],[117,66],[80,102]],
    enemyPositions : [[124,127]],
    tilemap : cg.Tilemaps.tilemaps.testMap
  });

  createLevel({
    id : "level1",
    startPosition : [85,50],
    exitPosition : [81,128],
    fireflies : [],
    mushroomGlow : [],
    gemPositions : [],
    enemiesPositions : [],
    tilemap : cg.Tilemaps.tilemaps.level1
  });

  // levels.test.load();
  levels.level1.load();
}

ChoreoGraph.start();