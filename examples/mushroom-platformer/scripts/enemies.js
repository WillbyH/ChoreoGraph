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

function createEnemy(x,y,level) {
  const enemy = cg.createObject({
    transformInit : {x:x,y:y},
    right : true,
    movementSpeed : 30,
    level : level,
    startX : x,
    startY : y
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
    gravityScaleY : 1,
    deleteColliderWithObject : true,
    collider : cg.Physics.createCollider({
      type : "rectangle",
      width : 14,
      height : 12,
      groups : [2],
      scene : level.scene
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
    scene : level.scene,
    object : enemy,
    transformInit : {parent:enemy.transform},
    enter : (self, collider) => {
      if (collider.id === "playerKillDetector") {
        if (cg.objects.player.invincible) { return; }
        cg.objects.player.RigidBody.yv = -250;
        cg.graphics.gameInterface.poof(self.object.transform.x, self.object.transform.y);
        self.object.level.enemiesToRecreate.push([self.object.startX, self.object.startY]);
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
    scene : level.scene,
    object : enemy,
    transformInit : {parent:enemy.transform,ox:-9},
    enter : (self, collider) => {
      self.object.right = !self.object.right;
    }
  },"enemy-leftTrigger");

  enemy.rightTrigger = cg.Physics.createCollider({
    type : "rectangle",
    width : 2,
    height : 5,
    trigger : true,
    groups : [3],
    scene : level.scene,
    object : enemy,
    transformInit : {parent:enemy.transform,ox:9},
    enter : (self, collider) => {
      self.object.right = !self.object.right;
    }
  },"enemy-rightTrigger");

  return enemy;
}