const cg = ChoreoGraph.instantiate({
  core : {
    baseImagePath : "images/",
    frustumCulling : false,
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
  size : 180,
  transformInit : {x:128,y:95}
},"main");

cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  background : "peachpuff"
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
}

// PLAYER
cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [6*16+1,7*16+1,16-2,16-1]
  },"playerIdle"),
},"playerIdle");

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [7*16+1,6*16+1,16-2,16-1]
  },"playerIdleLookUp"),
},"playerIdleLookUp");

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [7*16+1,7*16+1,16-2,16-1]
  },"playerIdleFear"),
},"playerIdleFear");

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [6*16+1,5*16+1,16-2,16-1]
  },"playerJumpLookDown"),
},"playerJumpLookDown");

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [7*16+1,5*16+1,16-2,16-1]
  },"playerJumpLookUp"),
},"playerJumpLookUp");

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [6*16+1,6*16+1,16-2,16-1]
  },"playerJumpLookForward"),
},"playerJumpLookForward");

for (let i=0;i<10;i++) {
  let x = Math.floor(i/5) + 6;
  let y = i%5;
  cg.createGraphic({
    type : "image",
    image : cg.createImage({
      file : "sheet.png",
      crop : [x*16+1,y*16+1,16-2,16-1]
    },"playerRun" + i),
  },"playerRun" + i);
}

cg.Animation.createAnimationFromPacked("0&sprite=f:25:Graphic,graphic:playerRun0|playerRun1|playerRun2|playerRun3|playerRun4|playerRun5|playerRun6|playerRun7|playerRun8|playerRun9",{},"playerRun");

cg.Input.createAction({keys:["space","up","w","conactionbottom","condpadup"],down:()=>{
  cg.objects.player.bufferJump = true;
}},"jump");

cg.Input.createAction({keys:["a","left","conleftleft","condpadleft","conrightleft"]},"left");
cg.Input.createAction({keys:["d","right","conrightright","condpadright","conleftright"]},"right");

cg.createObject({
  fallGravity : 3.5,
  jumpGravity : 1,
  canJump : true,
  bufferJump : false,
  lastMoveTime : 0,
  lastIdleTime : 0,
  transformInit : {x:85,y:125},
},"player")
.attach("Graphic",{
  graphic : cg.graphics.playerIdle,
  transformInit : {oy:-1.5},
  collection : "entities"
})
.attach("RigidBody",{
  gravityScale : 1.5,
  collider : cg.Physics.createCollider({
    type : "rectangle",
    width : 14,
    height : 12,
    groups : [0,1]
  },"player"),
})
.attach("Animator")
.attach("Script",{
  updateScript : function(object) {
    if (object.bufferJump && cg.objects.player.canJump && cg.Physics.colliders.player.collided) {
      if (cg.Input.actions.jump.get()!==0) {
        cg.objects.player.RigidBody.yv = -130;
        cg.objects.player.RigidBody.gravityScale = cg.objects.player.jumpGravity;
        cg.objects.player.canJump = false;
      }
      object.bufferJump = false;
    }
    if (cg.Input.actions.jump.get()==0) {
      object.RigidBody.gravityScale = object.fallGravity;
    }
    let dir = cg.Input.actions.right.get() - cg.Input.actions.left.get();
    object.movementManager(dir);
    object.animationManager(dir);
  }
});

cg.objects.player.movementManager = function(dir) {
  let speed = 4;
  if (cg.Physics.colliders.player.collided) {
    speed = 5;
  }
  let multiplier = 1;
  if (cg.clock-this.lastIdleTime > 500) {
    multiplier = ((cg.clock-this.lastIdleTime-500)/1000)*0.5+1;
    multiplier = Math.min(multiplier,1.5);
  }
  this.RigidBody.xv = dir * speed * multiplier * cg.timeDelta;
};

cg.objects.player.animationManager = function(dir) {
  if (dir<0) {
    this.transform.flipX = true;
  } else if (dir!==0) {
    this.transform.flipX = false;
  }
  if (cg.Physics.colliders.player.collided) {
    if (dir==0) {
      if (cg.clock - this.lastMoveTime > 70) {
        this.lastIdleTime = cg.clock;
        this.Animator.animation = null;
        if (cg.clock - this.lastMoveTime > 3000 && cg.clock - this.lastMoveTime < 4500) {
          this.Graphic.graphic = cg.graphics.playerIdleLookUp;
        } else if (cg.clock - this.lastMoveTime > 60000) {
          this.Graphic.graphic = cg.graphics.playerIdleFear;
          this.Graphic.transform.ox = (Math.random()-0.5)*0.3;
        } else {
          this.Graphic.graphic = cg.graphics.playerIdle;
        }
      }
    } else {
      this.lastMoveTime = cg.clock;
      if (this.Animator.animation == null) {
        this.Animator.animation = cg.Animation.animations.playerRun;
        this.Animator.restart();
      }
    }
  } else {
    this.Animator.animation = null;
    if (this.RigidBody.yv < 0) {
      this.lastMoveTime = cg.clock;
      if (Math.abs(this.RigidBody.yv) > 60) {
        this.Graphic.graphic = cg.graphics.playerJumpLookUp;
      } else {
        this.Graphic.graphic = cg.graphics.playerJumpLookForward;
      }
    } else {
      this.lastMoveTime = cg.clock;
      if (cg.Input.actions.jump.get() == 0) {
        this.Graphic.graphic = cg.graphics.playerJumpLookDown;
      } else {
        this.Graphic.graphic = cg.graphics.playerJumpLookForward;
      }
    }
  }
};

cg.Physics.createCollider({
  type : "rectangle",
  width : 13,
  height : 4,
  trigger : true,
  groups : [2],
  transformInit : {parent:cg.objects.player.transform,oy:6},
  enter : function(collider,other) {
    cg.objects.player.canJump = true;
  }
},"playerGroundDetector");

// FIREFLIES
let totalFireflies = 0;
const swarms = [];

cg.createGraphic({
  type : "arc",
  radius : 0.3,
  colour : "#ebff54",
  fill : true
},"firefly");

function createFireflies(x,y,r,count,scene) {
  for (let i=0;i<count;i++) {
    let theta = Math.random()*2*Math.PI;
    let firefly = cg.createObject({
      transformInit : {
        x : x + Math.cos(theta)*(r*Math.random()-0.5),
        y : y + Math.sin(theta)*(r*Math.random()-0.5),
      },
      target : [x + (Math.random()-0.5)*r, y + (Math.random()-0.5)*r],
      blinkRate : Math.random()*3000 + 2000,
      swarmIndex : swarms.length
    },"firefly" + totalFireflies)
    .attach("Graphic",{
      graphic : cg.graphics.firefly,
      collection : "entities",
      transformInit : {o:0.3}
    })
    .attach("Script",{
      updateScript : function(object) {
        let swarm = swarms[object.swarmIndex];
        if (swarm.lastCalculatedPDFH != ChoreoGraph.frame) {
          swarm.playerDistanceFromHome = Math.sqrt(
            (swarm.home[0] - cg.objects.player.transform.x) * (swarm.home[0] - cg.objects.player.transform.x) +
            (swarm.home[1] - cg.objects.player.transform.y) * (swarm.home[1] - cg.objects.player.transform.y)
          );
          swarm.lastCalculatedPDFH = ChoreoGraph.frame;
        }
        let distanceFromTarget = Math.sqrt(
          (object.target[0] - object.transform.x) * (object.target[0] - object.transform.x) +
          (object.target[1] - object.transform.y) * (object.target[1] - object.transform.y)
        );
        if (distanceFromTarget < 1) {
          let theta = Math.random()*2*Math.PI;
          object.target = [
            swarm.home[0] + Math.cos(theta)*(swarm.homeRadius*Math.random()-0.5),
            swarm.home[1] + Math.sin(theta)*(swarm.homeRadius*Math.random()-0.5),
          ];
        } else {
          let dir = [object.target[0] - object.transform.x, object.target[1] - object.transform.y];
          let mag = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
          if (mag == 0) { return; }
          dir[0] /= mag;
          dir[1] /= mag;

          if (cg.timeDelta > cg.settings.core.inactiveTime * 3) { return; }
          object.transform.x += dir[0] * 0.001 * cg.timeDelta;
          object.transform.y += dir[1] * 0.001 * cg.timeDelta;
        }
        let phase = (cg.clock % object.blinkRate) / object.blinkRate;
        let brightness;
        if (phase < 0.5) {
          brightness = phase * 2;
        } else {
          brightness = (1 - phase) * 2;
        }
        if (swarm.playerDistanceFromHome < swarm.homeRadius * 2) {
          brightness *= (swarm.playerDistanceFromHome / swarm.homeRadius * 2) * 0.25;
        }
        object.Graphic.transform.o = brightness;
        object.light.brightness = brightness;
      }
    });

    firefly.light = cg.Lighting.createLight({
      type : "spot",
      transformInit : {parent:firefly.transform},
      outerRadius : 3,
      innerRadius : 2,
      brightness : 1,
      occlude : false,
      hexColour : "#ebff54"
    },"fireflyLight");

    scene.addObject(firefly);
    totalFireflies++;
  }

  let swarm = {
    playerDistanceFromHome : 0,
    lastCalculatedPDFH : -1,
    home : [x,y],
    homeRadius : r,
  }
  swarms.push(swarm);
}

// GEMS
for (let i=0;i<4;i++) {
  let x = (i%2)*5 + 81;
  let y = Math.floor(i/2)*6 + 113;
  cg.createGraphic({
    type : "image",
    image : cg.createImage({
      file : "sheet.png",
      crop : [x,y,4,5]
    },"gem" + i),
  },"gem" + i);
}

cg.Animation.createAnimationFromPacked("0&sprite=f:7:Graphic,graphic:gem0|gem1|gem2|gem3",{},"gem");

function createGem(x,y) {
  let gem = cg.createObject({
    transformInit : {x:x,y:y}
  },"gem")
  .attach("Graphic",{
    graphic : cg.graphics.gem0,
    collection : "entities"
  })
  .attach("Animator",{
    animation : cg.Animation.animations.gem
  });

  gem.light = cg.Lighting.createLight({
    type : "spot",
    transformInit : {parent:gem.transform},
    outerRadius : 20,
    innerRadius : 2,
    brightness : 1,
    occlude : false,
    hexColour : "#78ed87"
  },"gemLight");

  gem.collider = cg.Physics.createCollider({
    type : "circle",
    radius : 10,
    trigger : true,
    groups : [1],
    transformInit : {parent:gem.transform},
    enter : function() {
      console.log("collect")
    }
  },"gemCollider");

  return gem;
}

// UI

cg.graphicTypes.gameInterface = new class GameInterface {
  setup() {
    this.gemCount = 3;
    this.collectedGems = 0;
  };
  draw(c,ax,ay) {
    // c.fillStyle = "red";
    // c.fillRect(100,100,100,100)
  };
};
cg.createGraphic({type : "gameInterface"},"gameInterface")

// LEVELS
const levels = {};

class Level {
  id = "unnamed-level";

  startPosition = [0,0];
  fireflies = [];
  gemPositions = [];

  scene;
  tilemap;
  lighting;

  createScene() {
    this.scene = cg.createScene({},this.id);
    this.scene.createItem("collection",{},"background");
    this.scene.createItem("collection",{},"entities");
    this.scene.createItem("collection",{},"foreground");
    this.scene.createItem("collection",{},"top");

    for (let [x,y,r,count] of this.fireflies) {
      createFireflies(x,y,r,count,this.scene);
    }

    for (let [x,y] of this.gemPositions) {
      this.scene.addObject(createGem(x,y));
    }

    for (let position of cg.createPath(this.mushroomGlow,"mushroomGlow-"+this.id)) {
      cg.Lighting.createLight({
        type : "spot",
        transformInit : {x:position[0],y:position[1]},
        outerRadius : 40,
        innerRadius : 3,
        brightness : 1,
        occlude : false,
        hexColour : "#7af2ff"
      });
    }

    this.scene.addObject(cg.objects.player);

    this.scene.createItem("graphic",{
      graphic : cg.createGraphic({type:"lighting",
        shadowType : ChoreoGraph.Lighting.SHADOW_FULL,
        shadowColour : "#060004aa"
      },"lighting-"+this.id),
    },"lighting-"+this.id,"top");

    cg.Lighting.createLight({
      type : "spot",
      transformInit : {parent:cg.objects.player.transform},
      outerRadius : 80,
      innerRadius : 1,
      brightness : 0.7,
      occlude : false,
      hexColour : "#ffdcbd"
    },"player-"+this.id);

    cg.createGraphic({
      type : "tilemap",
      tilemap : this.tilemap,
      debug : false,
      visibleLayers : ["Background","Foreground"]
    },"tilemapBackground");
    cg.createGraphic({
      type : "tilemap",
      tilemap : this.tilemap,
      debug : false,
      visibleLayers : ["Overlay"]
    },"tilemapForeground");

    this.scene.createItem("graphic",{
      graphic:cg.graphics.tilemapBackground
    },"tilemapBackground","background");
    this.scene.createItem("graphic",{
      graphic:cg.graphics.tilemapForeground
    },"tilemapForeground","foreground");

    cg.Physics.createCollidersFromTilemap(this.tilemap,3,null,this.scene,[0,2]);

    this.scene.createItem("graphic",{
      graphic : cg.graphics.gameInterface,
      transformInit : {
        CGSpace : false,
        canvasSpaceXAnchor : 0,
        canvasSpaceYAnchor : 0
      }
    },"gameInterface-"+this.id,"top");
  };

  load() {
    cg.cameras.main.setScene(this.scene);
    cg.graphics.gameInterface.gemCount = this.gemPositions.length;
    cg.graphics.gameInterface.collectedGems = 0;
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
    tilemap : "testMap",
    startPosition : [85,125],
    fireflies : [[100,75,30,10]],
    mushroomGlow : [[104,141],[136,93],[168,138]],
    gemPositions : [[170,79]],
    tilemap : cg.Tilemaps.tilemaps.testMap
  });

  levels.test.load();
}

ChoreoGraph.start();