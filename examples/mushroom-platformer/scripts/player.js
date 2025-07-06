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