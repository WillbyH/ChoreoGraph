const cg = ChoreoGraph.instantiate({
  core : {
    baseImagePath : "images/",
    frustumCulling : false,
    debugCGScale : 0.3,
    imageSmoothingEnabled : false
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
},"main")
.addScene(cg.createScene({},"main"));

cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  background : "peachpuff"
})
.resizeWithSelf()
.setCamera(cg.cameras.main);

cg.createImage({
  file : "sheet.png"
},"sheet");

cg.Tiled.importTileSetFromFile("tiled/mushroom-set.tsj",() => {
  cg.Tiled.importTileMapFromFile({
    dataUrl : "tiled/testmap.tmj",
    id : "testMap"
  },(tilemap) => {
    cg.createGraphic({
      type : "tilemap",
      tilemap : tilemap,
      debug : false,
      visibleLayers : ["Background"]
    },"tilemapBackground");
    cg.createGraphic({
      type : "tilemap",
      tilemap : tilemap,
      debug : false,
      visibleLayers : ["Foreground"]
    },"tilemapForeground");

    cg.scenes.main.createItem("graphic",{
      graphic:cg.graphics.tilemapBackground
    },"tilemapBackground");
    cg.scenes.main.createItem("graphic",{
      graphic:cg.graphics.tilemapForeground
    },"tilemapForeground");
    cg.Physics.createCollidersFromTilemap(tilemap,2,null,0,0,[0,2]);
  });
});

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [7*16,5*16,16,16]
  },"playerIdle"),
},"playerIdle");

cg.createGraphic({
  type : "image",
  image : cg.createImage({
    file : "sheet.png",
    crop : [6*16,5*16,16,16]
  },"playerJump"),
},"playerJump");

for (let i=0;i<10;i++) {
  let x = Math.floor(i/5) + 6;
  let y = i%5;
  cg.createGraphic({
    type : "image",
    image : cg.createImage({
      file : "sheet.png",
      crop : [x*16,y*16,16,16]
    },"playerRun" + i),
  },"playerRun" + i);
}

cg.Animation.createAnimationFromPacked("0&sprite=f:25:Graphic,graphic:playerRun0|playerRun1|playerRun2|playerRun3|playerRun4|playerRun5|playerRun6|playerRun7|playerRun8|playerRun9",{},"playerRun");

cg.Input.createAction({keys:["space","up","w","conactionbottom"],down:()=>{
  cg.objects.player.bufferJump = true;
}},"jump");

cg.Input.createAction({keys:["a","left","conleftleft","condpadleft","conrightleft"]},"left");
cg.Input.createAction({keys:["d","right","conrightright","condpadright","conleftright"]},"right");

cg.scenes.main.addObject(
  cg.createObject({
    fallGravity : 3.5,
    jumpGravity : 1,
    canJump : true,
    bufferJump : false,
    lastMoveTime : -Infinity,
    transformInit : {x:85,y:125},
  },"player")
  .attach("Graphic",{
    graphic : cg.graphics.playerIdle,
    transformInit : {oy:-2,flipX:true}
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
  })
);

cg.objects.player.movementManager = function(dir) {
  let speed = 4;
  if (cg.Physics.colliders.player.collided) {
    speed = 5;
  }
  this.RigidBody.xv = dir * speed * cg.timeDelta;
};

cg.objects.player.animationManager = function(dir) {
  if (dir<0) {
    this.transform.flipX = true;
  } else if (dir!==0) {
    this.transform.flipX = false;
  }
  if (cg.Physics.colliders.player.collided) {
    if (dir==0) {
      if (cg.clock - this.lastMoveTime > 50) {
        this.Animator.animation = null;
        this.Graphic.graphic = cg.graphics.playerIdle;
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
    this.Graphic.graphic = cg.graphics.playerJump;
  }
};

cg.Physics.createCollider({
  type : "rectangle",
  width : 14,
  height : 4,
  trigger : true,
  groups : [2],
  transformInit : {parent:cg.objects.player.transform,oy:6},
  enter : function(collider,other) {
    cg.objects.player.canJump = true;
  }
},"playerGroundDetector");

ChoreoGraph.start();