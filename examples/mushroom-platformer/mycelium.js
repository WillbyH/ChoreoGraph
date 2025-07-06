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
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/level1.tmj",
    id : "level1"
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
  const x = Math.floor(i/5) + 6;
  const y = i%5;
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
  bufferJump : false,
  lastMoveTime : 0,
  lastIdleTime : 0,
  invincible : false,
  transformInit : {x:85,y:125},
},"player")
.attach("Graphic",{
  graphic : cg.graphics.playerIdle,
  transformInit : {oy:-1.5},
  collection : "entities"
})
.attach("RigidBody",{
  gravityScale : 1.5,
  dragX : 20,
  collider : cg.Physics.createCollider({
    type : "rectangle",
    width : 14,
    height : 12,
    groups : [0,1]
  },"player"),
})
.attach("Animator")
.attach("Script",{
  updateScript : (object) => {
    if (object.invincible) {
      object.Graphic.transform.o = Math.min(Number(cg.clock % 200 > 100) + 0.5, 1);
    } else {
      object.Graphic.transform.o = 1;
    }
    if (object.bufferJump && cg.Physics.colliders.playerGroundDetector.collided && cg.Physics.colliders.player.collided) {
      if (cg.Input.actions.jump.get()!==0) {
        cg.objects.player.RigidBody.yv = -130;
        cg.objects.player.RigidBody.gravityScale = cg.objects.player.jumpGravity;
      }
      object.bufferJump = false;
    }
    if (cg.Input.actions.jump.get()==0) {
      object.RigidBody.gravityScale = object.fallGravity;
    }
    const dir = cg.Input.actions.right.get() - cg.Input.actions.left.get();
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
  if (dir === 0) { return; }
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
  transformInit : {parent:cg.objects.player.transform,oy:6}
},"playerGroundDetector");

cg.Physics.createCollider({
  type : "rectangle",
  width : 2,
  height : 10,
  trigger : true,
  groups : [4],
  transformInit : {parent:cg.objects.player.transform,oy:10},
},"playerKillDetector");

// ENEMIES
for (let i=0;i<10;i++) {
  const x = Math.floor(i/5) + 4;
  const y = i%5;
  cg.createGraphic({
    type : "image",
    image : cg.createImage({
      file : "sheet.png",
      crop : [x*16+1,y*16+1,16-2,16-1]
    },"enemyWalk" + i),
  },"enemyWalk" + i);
}

cg.Animation.createAnimationFromPacked("0&sprite=f:25:Graphic,graphic:enemyWalk0|enemyWalk1|enemyWalk2|enemyWalk3|enemyWalk4|enemyWalk5|enemyWalk6|enemyWalk7|enemyWalk8|enemyWalk9",{},"enemyWalk");

function createEnemy(x,y) {
  const enemy = cg.createObject({
    transformInit : {x:x,y:y},
    right : true,
    movementSpeed : 30
  },"enemy")
  .attach("Animator",{
    animation : cg.Animation.animations.enemyWalk,
    speed : 0.5
  })
  .attach("Graphic",{
    graphic : cg.graphics.enemyWalk0,
    transformInit : {oy:-1.5},
    collection : "entities"
  })
  .attach("RigidBody",{
    gravityScale : 1,
    collider : cg.Physics.createCollider({
      type : "rectangle",
      width : 14,
      height : 12,
      groups : [2]
    },"enemy-physics")
  })
  .attach("Script",{
    updateScript : (object) => {
      object.RigidBody.xv = object.movementSpeed * (object.right ? 1 : -1);
      object.Graphic.transform.flipX = !object.right;
    }
  });

  enemy.RigidBody.collider.object = enemy;

  enemy.playerTrigger = cg.Physics.createCollider({
    type : "rectangle",
    width : 10,
    height : 10,
    trigger : true,
    groups : [1,4],
    object : enemy,
    transformInit : {parent:enemy.transform},
    enter : (collider, self) => {
      if (collider.id === "playerKillDetector") {
        if (cg.objects.player.invincible) { return; }
        cg.objects.player.RigidBody.yv = -250;
        cg.graphics.gameInterface.poof(self.object.transform.x, self.object.transform.y);
        self.object.playerTrigger.delete();
        self.object.leftTrigger.delete();
        self.object.rightTrigger.delete();
        self.object.delete();
      } else if (collider.id === "player" && !cg.Physics.colliders.playerKillDetector.collided) {
        if (cg.objects.player.invincible) { return; }
        if (cg.objects.player.transform.x < self.object.transform.x) {
          cg.objects.player.RigidBody.xv = -300;
        } else {
          cg.objects.player.RigidBody.xv = 300;
        }
        cg.objects.player.RigidBody.yv = -100;
        cg.objects.player.RigidBody.dragX = 3;
        cg.objects.player.invincible = true;
        cg.createEvent({duration:1000,end:()=>{
          cg.objects.player.RigidBody.dragX = 20;
          cg.objects.player.invincible = false;
        }});
        cg.graphics.gameInterface.loseGem();
      }
    }
  },"enemy-trigger");

  enemy.leftTrigger = cg.Physics.createCollider({
    type : "rectangle",
    width : 2,
    height : 5,
    trigger : true,
    groups : [3],
    object : enemy,
    transformInit : {parent:enemy.transform,ox:-9},
    enter : (collider, self) => {
      self.object.right = !self.object.right;
    }
  },"enemy-leftTrigger");

  enemy.rightTrigger = cg.Physics.createCollider({
    type : "rectangle",
    width : 2,
    height : 5,
    trigger : true,
    groups : [3],
    object : enemy,
    transformInit : {parent:enemy.transform,ox:9},
    enter : (collider, self) => {
      self.object.right = !self.object.right;
    }
  },"enemy-rightTrigger");

  return enemy;
}

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
    const theta = Math.random()*2*Math.PI;
    const firefly = cg.createObject({
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
      updateScript : (object) => {
        const swarm = swarms[object.swarmIndex];
        if (swarm.lastCalculatedPDFH != ChoreoGraph.frame) {
          swarm.playerDistanceFromHome = Math.sqrt(
            (swarm.home[0] - cg.objects.player.transform.x) * (swarm.home[0] - cg.objects.player.transform.x) +
            (swarm.home[1] - cg.objects.player.transform.y) * (swarm.home[1] - cg.objects.player.transform.y)
          );
          swarm.lastCalculatedPDFH = ChoreoGraph.frame;
        }
        const distanceFromTarget = Math.sqrt(
          (object.target[0] - object.transform.x) * (object.target[0] - object.transform.x) +
          (object.target[1] - object.transform.y) * (object.target[1] - object.transform.y)
        );
        if (distanceFromTarget < 1) {
          const theta = Math.random()*2*Math.PI;
          object.target = [
            swarm.home[0] + Math.cos(theta)*(swarm.homeRadius*Math.random()-0.5),
            swarm.home[1] + Math.sin(theta)*(swarm.homeRadius*Math.random()-0.5),
          ];
        } else {
          let dir = [object.target[0] - object.transform.x, object.target[1] - object.transform.y];
          const mag = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
          if (mag == 0) { return; }
          dir[0] /= mag;
          dir[1] /= mag;

          if (cg.timeDelta > cg.settings.core.inactiveTime * 3) { return; }
          object.transform.x += dir[0] * 0.001 * cg.timeDelta;
          object.transform.y += dir[1] * 0.001 * cg.timeDelta;
        }
        const phase = (cg.clock % object.blinkRate) / object.blinkRate;
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

  swarms.push({
    playerDistanceFromHome : 0,
    lastCalculatedPDFH : -1,
    home : [x,y],
    homeRadius : r,
  });
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
  const gem = cg.createObject({
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
    gem : gem,
    transformInit : {parent:gem.transform},
    enter : (collider, self) =>{
      if (self.gem.Graphic.transform.o===0) { return; }
      cg.graphics.gameInterface.collectGem(self.gem);
      self.gem.Graphic.transform.o = 0;
    }
  },"gemCollider");

  return gem;
}

// EXIT DOOR
cg.createImage({
  file : "sheet.png",
  crop : [16,16*6,32,32]
},"doorBackground");
cg.createImage({
  file : "sheet.png",
  crop : [16*3,16*6,32,32]
},"doorRoots");
cg.createImage({
  file : "sheet.png",
  crop : [16*5+9,16*5+12,3,4]
},"doorGemEmpty");
cg.createImage({
  file : "sheet.png",
  crop : [16*5+13,16*5+12,3,4]
},"doorGemFull");

cg.graphicTypes.exitDoor = new class ExitDoor {
  setup() {
    this.open = false;

    this.reset = () => {
      this.open = false;
    }
  };
  draw(c,ax,ay,canvas) {
    canvas.drawImage(cg.images.doorBackground, 0, 0, 32, 32);
    if (!this.open) {
      canvas.drawImage(cg.images.doorRoots, 0, 0, 32, 32);
    }

    const gameInterface = cg.graphics.gameInterface;
    const gemSeparation = 5;
    const xOffset = -gameInterface.gemCount * 0.5 * gemSeparation + 3;
    const yOffset = -14;

    for (let i=0;i<gameInterface.gemCount;i++) {
      const image = (i >= gameInterface.gemOrder.length) ? cg.images.doorGemEmpty : cg.images.doorGemFull;

      const x = xOffset + i * gemSeparation;
      const y = yOffset;
      canvas.drawImage(image, x, y);
    }
  };
}
cg.createGraphic({type : "exitDoor"},"exitDoor");

// UI
cg.createImage({
  file : "sheet.png",
  crop : [5*16+1,6*16+6,6,9]
},"largeGemColour");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+9,6*16+6,6,9]
},"largeGemOutline");
cg.createImage({
  file : "sheet.png",
  crop : [5*16,6*16+1,4,4]
},"gemParticle0");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+5,6*16+1,4,4]
},"gemParticle1");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+9,6*16+1,4,4]
},"gemParticle2");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+12,6*16+1,4,4]
},"gemParticle3");

cg.processLoops.push(function canvasScaler() {
  cg.cameras.main.canvasSpaceScale = cg.canvases.main.width/1920;
});

cg.graphicTypes.gameInterface = new class GameInterface {
  setup() {
    this.gemCount = 3;
    this.displayedGems = 0;

    this.collections = [];
    this.losses = [];
    this.particles = [];
    this.gemOrder = [];

    this.reset = () => {
      this.gemOrder = [];
      this.collections = [];
      this.particles = [];
    }

    this.createParticle = (x,y) => {
      const dir = Math.random() * 2 * Math.PI;
      const speed = Math.random() * 0.4;
      const xv = Math.cos(dir) * speed;
      const yv = Math.sin(dir) * speed;

      this.particles.push({
        x : x + (Math.random()-0.5)*10,
        y : y + (Math.random()-0.5)*10,
        r : (Math.random()-0.5)*360,
        xv : xv,
        yv : yv,
        rv : (Math.random()-0.5),
        stt : cg.clock,
        lifetime : Math.random()*1000 + 700,
        image : cg.images["gemParticle" + Math.floor(Math.random()*4)]
      })
    }

    this.collectGem = (gem) => {
      const x = cg.cameras.main.getCanvasSpaceX(gem.transform.x);
      const y = cg.cameras.main.getCanvasSpaceY(gem.transform.y);
      this.collections.push({
        originX : x,
        originY : y,
        stt : cg.clock,
        targetIndex : this.gemOrder.length,
      });

      this.gemOrder.push(gem);

      gem.light.brightness = 0;

      for (let i=0;i<10;i++) {
        this.createParticle(x,y);
      }
    }

    this.loseGem = () => {
      if (this.gemOrder.length === 0) { return; }
      const gem = this.gemOrder.pop();
      this.displayedGems--;
      cg.graphics.exitDoor.open = false;
      this.losses.push({
        originIndex : this.gemOrder.length,
        gem : gem,
        stt : cg.clock,
        targetX : cg.cameras.main.getCanvasSpaceX(gem.transform.x),
        targetY : cg.cameras.main.getCanvasSpaceY(gem.transform.y)
      });
    }

    this.poof = (x,y) => {
      x = cg.cameras.main.getCanvasSpaceX(x);
      y = cg.cameras.main.getCanvasSpaceY(y);
      for (let i=0;i<40;i++) {
        this.createParticle(x,y);
      }
    }
  };
  draw(c,ax,ay,canvas) {
    const xOffset = 100;
    const yOffset = 100;
    const pixelScale = 8;
    const gemWidth = 6*pixelScale;
    const gemHeight = 9*pixelScale;
    const gemSeparation = 100;

    // Collection Paths
    const collectionDuration = 700;

    for (let i=0;i<this.collections.length;i++) {
      const collection = this.collections[i];
      let progress = (cg.clock - collection.stt) / collectionDuration;
      if (progress >= 1) {
        this.displayedGems++;
        if (this.displayedGems >= this.gemCount) {
          cg.graphics.exitDoor.open = true;
        }
        collection.collected = true;
        continue;
      }
      progress = cg.Animation.easeFunctions.inOutQuart(progress);
      const targetX = xOffset + collection.targetIndex * gemSeparation;
      const targetY = yOffset;
      const x = collection.originX + (targetX - collection.originX) * progress;
      const y = collection.originY + (targetY - collection.originY) * progress;

      this.createParticle(x,y);

      c.fillStyle = "#78ed87";
      c.globalAlpha = progress + 0.1;
      canvas.drawImage(cg.images.largeGemColour, x, y, gemWidth, gemHeight);
    }
    this.collections = this.collections.filter(c => !c.collected);

    // Loss Paths
    const lossDuration = 700;

    for (let i=0;i<this.losses.length;i++) {
      const loss = this.losses[i];
      let progress = (cg.clock - loss.stt) / lossDuration;
      if (progress >= 1) {
        loss.gem.Graphic.transform.o = 1;
        this.losses.splice(i,1);
        i--;
        continue;
      }
      progress = cg.Animation.easeFunctions.inOutQuart(progress);
      const originX = xOffset + loss.originIndex * gemSeparation;
      const originY = yOffset;
      const x = originX + (loss.targetX - originX) * progress;
      const y = originY + (loss.targetY - originY) * progress;

      this.createParticle(x,y);

      c.fillStyle = "#ff0000";
      c.globalAlpha = 1 - progress;
      canvas.drawImage(cg.images.largeGemOutline, x, y, gemWidth, gemHeight);
    }

    // Gems and Outlines

    c.globalAlpha = 1;
    for (let i=0;i<this.gemCount;i++) {
      const image = (i<this.displayedGems) ? cg.images.largeGemColour : cg.images.largeGemOutline;
      canvas.drawImage(image, xOffset + gemSeparation*i, yOffset, gemWidth, gemHeight);
    }

    // Particles
    const particleSize = 10 / cg.cameras.main.canvasSpaceScale;

    for (let i=0;i<this.particles.length;i++) {
      const particle = this.particles[i];
      const progress = (cg.clock - particle.stt) / particle.lifetime;
      if (progress >= 1) {
        this.particles.splice(i,1);
        i--;
        continue;
      }
      particle.x += particle.xv * cg.timeDelta;
      particle.y += particle.yv * cg.timeDelta;
      particle.r += particle.rv * cg.timeDelta;

      c.globalAlpha = 1 - progress;

      canvas.drawImage(particle.image, particle.x, particle.y, particleSize, particleSize, particle.r);
    }
  };
};
cg.createGraphic({type : "gameInterface"},"gameInterface");

// LEVELS
const levels = {};

class Level {
  id = "unnamed-level";

  startPosition = [0,0];
  fireflies = [];
  gemPositions = [];
  exitPosition = [];
  mushroomGlow = [];
  enemiesPositions = [];

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

    for (const [x,y,r,count] of this.fireflies) {
      createFireflies(x,y,r,count,this.scene);
    }

    for (const [x,y] of cg.createPath(this.gemPositions,"gems-"+this.id)) {
      const gem = createGem(x,y);
      this.scene.addObject(gem);
      this.gems.push(gem);
    }

    for (const [x,y] of cg.createPath(this.enemiesPositions,"enemies-"+this.id)) {
      const enemy = createEnemy(x,y);
      this.scene.addObject(enemy);
      this.enemies.push(enemy);
    }

    for (const position of cg.createPath(this.mushroomGlow,"mushroomGlow-"+this.id)) {
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

    cg.Physics.createCollidersFromTilemap(this.tilemap,3,null,this.scene,[0,2,3]);

    this.scene.createItem("graphic",{
      graphic : cg.graphics.exitDoor,
      transformInit : {
        x : this.exitPosition[0],
        y : this.exitPosition[1]
      }
    },"exitDoor-"+this.id,"background");

    cg.Physics.createCollider({
      type : "rectangle",
      width : 32,
      height : 32,
      trigger : true,
      groups : [1],
      transformInit : {
        x : this.exitPosition[0],
        y : this.exitPosition[1]
      },
      enter : () => {
        if (!cg.graphics.exitDoor.open) { return; }
        // DO EXIT TRANSITION
      }
    },"exit-"+this.id)

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
    cg.graphics.gameInterface.reset();
    cg.graphics.gameInterface.gemCount = this.gemPositions.length;
    cg.graphics.exitDoor.reset();
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
    enemiesPositions : [[124,127]],
    tilemap : cg.Tilemaps.tilemaps.testMap
  });

  levels.test.load();
}

ChoreoGraph.start();