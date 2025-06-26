// CREATE IDLE SPRITES
for (let i=0;i<4;i++) {
  let topLeft = [0,0];
  let size = [32,32];
  let width = 2;
  let x = i%width;
  let y = Math.floor(i/width);
  let newImage = cg.createImage({
    file :"scoopyIdle.png",
    crop : [topLeft[0]+size[0]*x,topLeft[1]+size[1]*y,size[0],size[1]]
  },"scoopyIdle" + i);
  cg.createGraphic({type:"image",image:newImage,imageSmoothingEnabled:false},"scoopyIdleLeft"+i);
  cg.createGraphic({type:"image",image:newImage,imageSmoothingEnabled:false,flipX:true},"scoopyIdleRight"+i);
}
// CREATE RUNNING SPRITES
for (let i=0;i<8;i++) {
  let topLeft = [0,0];
  let size = [32,32];
  let width = 3;
  let x = i%width;
  let y = Math.floor(i/width);
  let newImage = cg.createImage({
    file :"scoopyRun.png",
    crop : [topLeft[0]+size[0]*x,topLeft[1]+size[1]*y,size[0],size[1]]
  },"scoopyRun" + i);
  cg.createGraphic({type:"image",image:newImage,imageSmoothingEnabled:false},"scoopyRunLeft"+i);
  cg.createGraphic({type:"image",image:newImage,imageSmoothingEnabled:false,flipX:true},"scoopyRunRight"+i);
}

cg.Animation.createAnimationFromPacked("0&sprite=f:6:Graphic,graphic:scoopyIdleLeft0|scoopyIdleLeft1|scoopyIdleLeft2|scoopyIdleLeft3",{},"scoopyIdleLeft");
cg.Animation.createAnimationFromPacked("0&sprite=f:6:Graphic,graphic:scoopyIdleRight0|scoopyIdleRight1|scoopyIdleRight2|scoopyIdleRight3",{},"scoopyIdleRight");
cg.Animation.createAnimationFromPacked("0&sprite=f:10:Graphic,graphic:scoopyRunLeft0|scoopyRunLeft1|scoopyRunLeft2|scoopyRunLeft3|scoopyRunLeft4|scoopyRunLeft5|scoopyRunLeft6|scoopyRunLeft7",{},"scoopyRunLeft");
cg.Animation.createAnimationFromPacked("0&sprite=f:10:Graphic,graphic:scoopyRunRight0|scoopyRunRight1|scoopyRunRight2|scoopyRunRight3|scoopyRunRight4|scoopyRunRight5|scoopyRunRight6|scoopyRunRight7",{},"scoopyRunRight");

cg.Input.createAction({keys:["w","up","conleftup","condpadup","conrightup"]},"up");
cg.Input.createAction({keys:["s","down","conleftdown","condpaddown","conrightdown"]},"down");
cg.Input.createAction({keys:["a","left","conleftleft","condpadleft","conrightleft"]},"left");
cg.Input.createAction({keys:["d","right","conrightright","condpadright","conleftright"]},"right");

stst.scoopy = cg.createObject({
  transformInit : {x:-232,y:142}
},"scoopy")
.attach("Graphic",{graphic:cg.graphics.scoopyIdleLeft0,transformInit:{ox:1.5,oy:-13},collection:"entities"})
.attach("Animator",{animation:cg.Animation.animations.scoopyIdleLeft})
.attach("RigidBody",{
  collider : cg.Physics.createCollider({
    type:"rectangle",
    width:8,
    height:8,
    groups:[0,1],
  },"scoopy"),
})
.attach("Script",{
  updateScript : (object,scene) => {
    if (cg.Input.cursor.hold.any&&cg.Input.lastCursorType==ChoreoGraph.Input.TOUCH) { return; }
    let dir = cg.Input.getActionNormalisedVector("up","down","left","right");
    stst.animationManager(dir);
    stst.movementManager(dir);
  }
})

stst.animationManager = function(dir) {
  if (cg.settings.core.timeScale == 0) { return; }
  let Animator = stst.scoopy.Animator;
  if (dir[0]<0 && Animator.animation.id!="scoopyRunRight") {
    stst.scoopy.Graphic.transform.ox = -1.5;
    Animator.animation = cg.Animation.animations.scoopyRunRight;
    Animator.reset();
  } else if (dir[0]>0 && Animator.animation.id!="scoopyRunLeft") {
    stst.scoopy.Graphic.transform.ox = 1.5;
    Animator.animation = cg.Animation.animations.scoopyRunLeft;
    Animator.reset();
  } else if (dir[0]==0 && dir[1]==0) {
    if (Animator.animation.id=="scoopyRunRight") {
      Animator.animation = cg.Animation.animations.scoopyIdleRight;
      Animator.reset();
    } else if (Animator.animation.id=="scoopyRunLeft") {
      Animator.animation = cg.Animation.animations.scoopyIdleLeft;
      Animator.reset();
    }
  } else if (dir[1]!=0) {
    if (Animator.animation.id=="scoopyIdleRight") {
      Animator.animation = cg.Animation.animations.scoopyRunRight;
      Animator.playFrom(1);
    } else if (Animator.animation.id=="scoopyIdleLeft") {
      Animator.animation = cg.Animation.animations.scoopyRunLeft;
      Animator.playFrom(1);
    }
  }
}

stst.movementManager = function(dir) {
  let scoopy = stst.scoopy;
  let movementSpeed = 70;
  if (stst.cheatsActive&&ChoreoGraph.Input.keyStates.shift) {
    movementSpeed *= 2;
  }
  scoopy.RigidBody.xv = dir[0] * movementSpeed;
  scoopy.RigidBody.yv = dir[1] * movementSpeed;

  if (Math.abs(dir[0])+Math.abs(dir[1])>0 && cg.settings.core.timeScale > 0) {
    cg.Audio.playing.footsteps.paused = false;
  } else {
    cg.Audio.playing.footsteps.paused = true;
  }
}

cg.Lighting.createLight({type:"spot",
  hexColour:"#fac96b",
  outerRadius:30,
  innerRadius:1,
  brightness:0.2,
  occlude:false,
  transformInit : {parent:stst.scoopy.transform,oy:-8}
},"scoopy");

cg.scenes.main.addObject(stst.scoopy);

cg.cameras.main.transform.parent = stst.scoopy.transform;
cg.cameras.main.transform.oy = -3;

cg.processLoops.push(() => {
  let dir = [0,0];
  if (cg.Input.cursor.hold.any&&cg.Input.lastCursorType==ChoreoGraph.Input.TOUCH) {
    if (cg.Input.buttons.joystick.hovered) {
      let dx = (cg.Input.buttons.joystick.hoveredX-0.5)*5.5;
      let dy = (cg.Input.buttons.joystick.hoveredY-0.5)*5.5;
      if (dx>0) { dx = Math.min(dx,1); } else if (dx<0) { dx = Math.max(dx,-1); }
      if (dy>0) { dy = Math.min(dy,1); } else if (dy<0) { dy = Math.max(dy,-1); }
      dir = [dx, dy];
    }
    let magnitude = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
    if (magnitude > 1) {
      dir[0] /= magnitude;
      dir[1] /= magnitude;
    }
    stst.animationManager(dir);
    stst.movementManager(dir);
  }
  cg.graphics.joystick.dir = dir;
});

cg.Input.createButton({
  type : "circle",
  radius : 400,
  scene : cg.scenes.main,
  check : "touch",
  transformInit : {
    CGSpace : false,
    x : 260,
    y : -260,
    canvasSpaceYAnchor : 1
  }
},"joystick");
