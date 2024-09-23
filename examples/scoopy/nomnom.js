const cg = ChoreoGraph.instantiate(document.getElementsByTagName("canvas")[0],{
  parentElementId : "full",
  background : "#000000",
  levels : 4,
  canvasSpaceScale : 1,
  useCamera : true,
  animation : {
    consistentSpeedDefault : false,
    autoFacingDefault : true,
    persistentValuesDefault : true
  },
  preventDefault : ["space","up","down","left","right"],
});

// Levels
// 0 - Background Tilemap
// 1 - Scoopy, Spoon, Exit Sign, Cameras
// 2 - Foreground Tilemap, Lighting
// 3 - Interface

for (let i=0;i<4;i++) {
  let topLeft = [0,0];
  let size = [32,32];
  let width = 2;
  let x = i%width;
  let y = Math.floor(i/width);
  let newImage = cg.createImage({
    id : "scoopyIdle" + i,
    file :"scoopyIdle.png",
    crop : [topLeft[0]+size[0]*x,topLeft[1]+size[1]*y,size[0],size[1]]
  });
  cg.createGraphic({type:"image",id : "scoopyIdleLeft" + i,image:newImage,width:200,height:200,oy:-80,ox:10,imageSmoothingEnabled:false});
  cg.createGraphic({type:"image",id : "scoopyIdleRight" + i,image:newImage,width:200,height:200,oy:-80,ox:-10,imageSmoothingEnabled:false,flipX:true});
}
for (let i=0;i<8;i++) {
  let topLeft = [0,0];
  let size = [32,32];
  let width = 3;
  let x = i%width;
  let y = Math.floor(i/width);
  let newImage = cg.createImage({
    id : "scoopyRun" + i,
    file :"scoopyRun.png",
    crop : [topLeft[0]+size[0]*x,topLeft[1]+size[1]*y,size[0],size[1]]
  });
  cg.createGraphic({type:"image",id : "scoopyRunLeft" + i,image:newImage,width:200,height:200,oy:-80,ox:10,imageSmoothingEnabled:false});
  cg.createGraphic({type:"image",id : "scoopyRunRight" + i,image:newImage,width:200,height:200,oy:-80,ox:-10,imageSmoothingEnabled:false,flipX:true});
}

const scoopyIdleLeftAnim = cg.createGraphicAnimation({
  frames : ["scoopyIdleLeft0","scoopyIdleLeft1","scoopyIdleLeft2","scoopyIdleLeft3"],
  GraphicKey : ["Graphic","graphic"],
  id : "scoopyIdleLeft",
  frameRate : 6
});
const scoopyIdleRightAnim = cg.createGraphicAnimation({
  frames : ["scoopyIdleRight0","scoopyIdleRight1","scoopyIdleRight2","scoopyIdleRight3"],
  GraphicKey : ["Graphic","graphic"],
  id : "scoopyIdleRight",
  frameRate : 6
});

const scoopyRunLeftAnim = cg.createGraphicAnimation({
  frames : ["scoopyRunLeft0","scoopyRunLeft1","scoopyRunLeft2","scoopyRunLeft3","scoopyRunLeft4","scoopyRunLeft5","scoopyRunLeft6","scoopyRunLeft7"],
  GraphicKey : ["Graphic","graphic"],
  id : "scoopyRunLeft",
  frameRate : 10
});
const scoopyRunRightAnim = cg.createGraphicAnimation({
  frames : ["scoopyRunRight0","scoopyRunRight1","scoopyRunRight2","scoopyRunRight3","scoopyRunRight4","scoopyRunRight5","scoopyRunRight6","scoopyRunRight7"],
  GraphicKey : ["Graphic","graphic"],
  id : "scoopyRunRight",
  frameRate : 10
});

let allowTouchMovement = true;

function ScoopyMovement() {
  let rb = Scoopy.RigidBody;
  let movementVector = [0,0];
  if (ChoreoGraph.Input.keyStates["w"]||ChoreoGraph.Input.keyStates["up"]) { movementVector[1] -= 1; }
  if (ChoreoGraph.Input.keyStates["s"]||ChoreoGraph.Input.keyStates["down"]) { movementVector[1] += 1; }
  if (ChoreoGraph.Input.keyStates["a"]||ChoreoGraph.Input.keyStates["left"]) { movementVector[0] -= 1; }
  if (ChoreoGraph.Input.keyStates["d"]||ChoreoGraph.Input.keyStates["right"]) { movementVector[0] += 1; }
  if (movementVector[0]!=0||movementVector[1]!=0) { touchMode = false; }
  let wasMenuCloseTouch = false;
  if (ChoreoGraph.Input.lastInteraction.cursor-startTime<500) {
    wasMenuCloseTouch = true;
  }
  if (ChoreoGraph.Input.cursor.hold.any&&wasMenuCloseTouch==false&&allowTouchMovement) {
    movementVector[0] = ChoreoGraph.Input.cursor.x - cg.cw/2;
    movementVector[1] = ChoreoGraph.Input.cursor.y - cg.ch/2;
    touchMode = true;
  }
  let magnitude = Math.sqrt(movementVector[0]*movementVector[0]+movementVector[1]*movementVector[1]);
  if (magnitude>0) {
    let movementSpeed = 500;
    movementVector[0] = movementVector[0]/magnitude*movementSpeed;
    movementVector[1] = (movementVector[1]/magnitude)*movementSpeed;
    rb.xv = movementVector[0];
    rb.yv = movementVector[1];
    if (rb.xv==0) {
      if (Scoopy.Animator.anim.id==scoopyIdleLeftAnim.id) {
        Scoopy.Animator.anim = scoopyRunLeftAnim;
        Scoopy.Animator.reset();
      } else if (Scoopy.Animator.anim.id==scoopyIdleRightAnim.id) {
        Scoopy.Animator.anim = scoopyRunRightAnim;
        Scoopy.Animator.reset();
      }
    } else if (rb.xv>0) {
      if (Scoopy.Animator.anim.id!=scoopyRunLeftAnim.id) {
        Scoopy.Animator.anim = scoopyRunLeftAnim;
        Scoopy.Animator.reset();
      };
    } else if (rb.xv<0) {
      if (Scoopy.Animator.anim.id!=scoopyRunRightAnim.id) {
        Scoopy.Animator.anim = scoopyRunRightAnim;
        Scoopy.Animator.reset();
      };
    }
    if (audioInformation.instances.footsteps!==null) { audioInformation.instances.footsteps.paused = false; }
  } else {
    if (Scoopy.Animator.anim.id==scoopyRunLeftAnim.id) {
      Scoopy.Animator.anim = scoopyIdleLeftAnim;
      Scoopy.Animator.reset();
    } else if (Scoopy.Animator.anim.id==scoopyRunRightAnim.id) {
      Scoopy.Animator.anim = scoopyIdleRightAnim;
      Scoopy.Animator.reset();
    }
    rb.xv *= Math.min(Math.max(0.02*cg.timeDelta,0),1);
    rb.yv *= Math.min(Math.max(0.02*cg.timeDelta,0),1);
    if (audioInformation.instances.footsteps!==null) { audioInformation.instances.footsteps.paused = true; }
  }
}


cg.createGraphic({
  id:"cameraDown",type:"image",width:100,height:100,or:90,oay:-30,imageSmoothingEnabled:false,
  image:cg.createImage({id:"cameraDown",file:"cameras.png",crop:[0,0,16,16]})
});
cg.createGraphic({
  id:"cameraUp",type:"image",width:100,height:100,oay:30,or:270,imageSmoothingEnabled:false,
  image:cg.createImage({id:"cameraUp",file:"cameras.png",crop:[0,16,16,16]})
});
cg.createGraphic({
  id:"cameraLeft",type:"image",width:100,height:100,or:180,oax:-30,imageSmoothingEnabled:false,
  image:cg.createImage({id:"cameraLeft",file:"cameras.png",crop:[0,32,16,16]})
});
cg.createGraphic({
  id:"cameraRight",type:"image",width:100,height:100,oax:33,imageSmoothingEnabled:false,
  image:cg.createImage({id:"cameraRight",file:"cameras.png",crop:[0,48,16,16]})
});
cg.createGraphic({
  id:"frontEndLoader",type:"image",width:100,height:100,imageSmoothingEnabled:false,
  image:cg.createImage({id:"frontEndLoader",file:"BuffetSpriteSheet.png",crop:[80,96,16,16]})
});
cg.createGraphic({
  id:"exitLeft",type:"image",width:100,height:50,imageSmoothingEnabled:false,
  image:cg.createImage({id:"exitLeft",file:"ExitSigns.png",crop:[0,0,16,8]})
});

cg.createImage({id:"logo",file:"stst.png"});
cg.createImage({id:"bigSpoonColoured",file:"bigSpoon.png",crop:[0,0,16,32]});
cg.createImage({id:"bigSpoonOutline",file:"bigSpoon.png",crop:[0,32,16,32]});
cg.createImage({id:"cg",file:"cg.png"});

let buffetSheet = cg.createImage({
  id : "buffetSheet",
  file : "BuffetSpriteSheet.png"
});

let buffetMapBackground;
let buffetMapForeground;
cg.importTileSetFromFile("Tiled/buffetSet.json",function(){
  buffetMapBackground = cg.createGraphic({type:"tileMap"});
  buffetMapForeground = cg.createGraphic({type:"tileMap"});
  cg.importTileMapFromFile("Tiled/buffetMap.json",function(TileMap) {
    TileMap.cache = true;
    buffetMapBackground.tileMap = TileMap;
    buffetMapForeground.tileMap = TileMap;
    cg.createCollidersFromTileMap(TileMap,buffetMapBackground.x,buffetMapBackground.y,3);
  });
  buffetMapBackground.y = 200;
  buffetMapForeground.y = 200;
  buffetMapBackground.layersToDraw = [0,1];
  buffetMapForeground.layersToDraw = [2];
});

let lightingGraphic = cg.createGraphic({type:"lighting"});
lightingGraphic.lights.push(cg.createLight({type:"spot",id:"scoopy",x:230,y:250,outerRadius:180,innerRadius:20,brightness:0.2,occlude:false,colour:"#a68c45"}));
lightingGraphic.lights.push(cg.createLight({type:"spot",id:"spoonLower",x:2050,y:-220,outerRadius:120,innerRadius:10,brightness:1,occlude:false}));
lightingGraphic.lights.push(cg.createLight({type:"spot",id:"spoonLower",x:2050,y:-700,r:-90,outerRadius:500,innerRadius:10,brightness:1,occlude:false,penumbra:0.925}));
let candlePositions = [[-500,800],[-500,1000],[-100,800],[-100,1000],[500,800],[500,1000],[900,800],[900,1000],[1600,600],[1600,1200],[-2000,-200],[-900,0],[-400,-100],[800,-100],[-500,1500],[-100,1500],[200,1500],[500,1500],[900,1500],[-500,1700],[-100,1700],[200,1700],[500,1700],[900,1700]];
for (let i=0;i<candlePositions.length;i++) {
  let point = candlePositions[i];
  lightingGraphic.lights.push(cg.createLight({type:"spot",id:"candle"+i,smoothQueue:[],lastSum:0,x:point[0],y:point[1],outerRadius:170,innerRadius:70,brightness:0.8,occlude:false,colour:"#ffbb00"}));
}

lightingGraphic.occluders.push(cg.createLightOccluder({path:[[-700,750],[-700,850],[-1000,850],[-1000,650],[-1600,650],[-1600,1150],[-1700,1150],[-1700,1450],[-1300,1450],[-1300,1150],[-1200,1150],[-1200,1350],[-700,1350],[-700,1850],[1100,1850],[1100,1350],[1800,1350],[1800,850],[1400,850],[1400,750],[1800,750],[1800,250],[1400,250],[1400,350],[1300,350],[1300,150],[500,150],[500,50],[1000,50],[1000,-450],[600,-450],[600,-350],[500,-350],[500,-450],[-100,-450],[-100,-350],[-200,-350],[-200,-450],[-600,-450],[-600,50],[-200,50],[-200,150],[-700,150],[-700,-850],[-600,-850],[-600,-550],[1100,-550],[1100,50],[2300,50],[2300,-650],[1800,-650],[1800,-450],[1400,-450],[1400,-550],[1700,-550],[1700,-1150],[1100,-1150],[1100,-750],[1000,-750],[1000,-1350],[800,-1350],[800,-1450],[100,-1450],[100,-1350],[0,-1350],[0,-750],[-100,-750],[-100,-1250],[-1000,-1250],[-1000,-550],[-2300,-550],[-2300,-50],[-1700,-50],[-1700,50],[-2300,50],[-2300,550],[-900,550],[-900,750]]}));
lightingGraphic.occluders.push(cg.createLightOccluder({path:[[100,250],[300,250],[300,350],[100,350]]}));
lightingGraphic.occluders.push(cg.createLightOccluder({path:[[100,750],[300,750],[300,950],[100,950]]}));
lightingGraphic.occluders.push(cg.createLightOccluder({path:[[-1500,-150],[-1300,-150],[-1300,250],[-1500,250]]}));

ChoreoGraph.AudioController.createSound("alarm","audio/alarm.mp3");
ChoreoGraph.AudioController.createSound("ambience","audio/ambience.mp3");
ChoreoGraph.AudioController.createSound("running","audio/running.mp3");
ChoreoGraph.AudioController.createSound("crickets","audio/crickets.mp3");
ChoreoGraph.AudioController.createSound("footsteps","audio/footsteps.mp3");

let audioInformation = {
  instances : {
    ambience : null,
    running : null,
    footsteps : null,
    crickets : null,
    alarm : null
  }
}

ChoreoGraph.AudioController.onReady = function() {
  audioInformation.instances.ambience = ChoreoGraph.AudioController.sounds.ambience.start(true);
  audioInformation.instances.crickets = ChoreoGraph.AudioController.sounds.crickets.start(true,0,0.5);
  audioInformation.instances.footsteps = ChoreoGraph.AudioController.sounds.footsteps.start(true);
  audioInformation.instances.footsteps.paused = true;
}

cg.settings.callbacks.keyDown = function(key) {
  if (key=="l") {
    lightingGraphic.o = !lightingGraphic.o;
  } else if (key=="r") {
    if (!cg.paused) {
      interface.tryAgain = true;
      cg.pause();
    }
  } else if (key=="m") {
    ChoreoGraph.AudioController.masterVolume = !ChoreoGraph.AudioController.masterVolume;
  } else if (key=="escape") {
    interface.mainMenu = true;
    interface.tryAgain = false;
    if (audioInformation.instances.running!==null) { audioInformation.instances.running.stop(); }
    if (audioInformation.instances.alarm!==null) { audioInformation.instances.alarm.stop(); }
    if (audioInformation.instances.ambience!==null) { audioInformation.instances.ambience.stop(); }
    audioInformation.instances.ambience = null;
    audioInformation.instances.alarm = null;
    audioInformation.instances.running = null;
    cg.pause();
  }
}
cg.settings.callbacks.loopBefore = function(cg) {
  ScoopyMovement();
  if (buffetMapBackground!=undefined) {
    cg.addToLevel(0,buffetMapBackground);
    cg.addToLevel(2,buffetMapForeground);
  }
  cg.addToLevel(2,lightingGraphic);

  for (let i=0;i<candlePositions.length;i++) {
    let candle = cg.lights["candle"+i];
    let maxBrightness = 0.8;
    let minBrightness = 0.5;
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
  if (interface.topLeft) {
    cg.addToLevel(3,topLeftText);
  }
  if (interface.pressR) {
    cg.addToLevel(3,pressRText);
  }
}
cg.settings.callbacks.loopAfter = function(cg) {
  if (alarms) {
    let secondsLeft = Math.floor(35-(cg.clock-caughtTime)/1000);
    topLeftText.text = "Time to escape: " + (Math.max(secondsLeft,2)-2) + " seconds";
    if (secondsLeft>0&&secondsLeft<=2) {
      topLeftText.colour = "#ff0000";
    } else if (secondsLeft<=0) {
      if (!cg.paused) {
        interface.tryAgain = true;
        if (audioInformation.instances.footsteps!==null) { audioInformation.instances.footsteps.paused = true; }
        cg.pause();
      }
    } else {
      topLeftText.colour = "#ffffff";
    }
    if (touchMode) {
      pressRText.text = "(Click here to restart.)";
    } else {
      pressRText.text = "(Click R to restart.)";
    }
    let pulseSpeed = 1;
    let pingPong = Math.abs(cg.clock%(1000*(1/pulseSpeed))-(1000*(1/pulseSpeed))/2)/(1000*(1/pulseSpeed)/2);
    let colour = ChoreoGraph.colourLerp("090300","550000",pingPong);
    let upperBound = 0.8;
    let lowerBound = 0.9; // When off
    let brightness = lowerBound + (upperBound-lowerBound)*pingPong;
    lightingGraphic.shadowCol = colour + parseInt(brightness*255).toString(16);
  } else {
    lightingGraphic.shadowCol = "#060004dc";
  }
  cg.levels[3] = [];
  cg.settings.canvasSpaceScale = cg.cw/1920;
  if (interface.leave) {
    cg.addToLevel(3,leaveMenu);
  }
  if (interface.tryAgain) {
    cg.addToLevel(3,tryAgain);
  }
  if (interface.mainMenu) {
    cg.addToLevel(3,mainMenu);
  }
}

const Scoopy = cg.createObject({"id":"Scoopy",x:-1442,y:1160})
.attach("Graphic",{level:1,graphic:cg.graphics.scoopyIdleLeft0,master:true})
.attach("Animator",{anim:scoopyIdleLeftAnim})
.attach("Collider",{collider:cg.createCollider({type:"rectangle",id:"scoopy_Collider",width:50,height:50,groups:[0,1]}),master:true})
.attach("Camera",{offset:{x:0,y:-50},smoothing:0.7,jump:true})
.attach("Light",{light:cg.lights.scoopy,oy:-50,master:true})
.attach("RigidBody",{gravity:0,useColliderForPhysics:true});

let hasEscapedWithSpoon = false;
let alarms = false;
let caughtTime = 0;
let touchMode = false;

function createCameraObject(cameraInit={}) {
  let light = cg.createLight({type:"spot",id:cameraInit.id+"_Light",feather:5,x:170,y:400,r:270,penumbra:0.92,outerRadius:1300,innerRadius:200,brightness:0.9,colour:"#ff0000"});
  lightingGraphic.lights.push(light);
  let raycast = cg.createCollider({type:"raycast",id:cameraInit.id+"_Raycast",trigger:true,groups:[1]});
  let newCamera = cg.createObject({id:cameraInit.id})
  .attach("Script",{updateScript: function(camera) {
    if (camera.swing) {
      let angle = Math.sin((cg.clock/1000) * camera.pivotSpeed + camera.pivotOffset) * camera.pivotRange/2; //tweak this to change frequency
      camera.Transform.r = angle+camera.pivotCentre;
    } else {
      camera.Transform.r += camera.pivotSpeed * cg.timeDelta/1000;
      if (camera.Transform.r>360) { camera.Transform.r -= 360; }
    }

    if (camera.canSeePlayer()&&alarms==false) {
      caught();
    }
  }})
  .attach("Light",{light:light,master:true})
  .attach("Collider",{collider:raycast,keyOverride:"Raycast",master:true})
  
  newCamera.fov = 60;
  newCamera.pivotRange = 90;
  newCamera.pivotSpeed = 0.5;
  newCamera.pivotOffset = 0;
  newCamera.detectRange = 15;
  newCamera.pivotCentre = 0;
  newCamera.swing = true;

  newCamera.canSeePlayer = function() {
    let sx = Scoopy.Transform.x;
    let sy = Scoopy.Transform.y;
    let cx = this.Transform.x;
    let cy = this.Transform.y;

    let distance = Math.sqrt((sx-cx)*(sx-cx)+(sy-cy)*(sy-cy));
    if (distance > this.detectRange*100) { return false; }

    let dx = sx - cx;
    let dy = sy - cy;
    let playerAngle = Math.atan2(dy,dx) * 180 / Math.PI + 90;
    if (playerAngle<0) { playerAngle += 360; }
    let cameraAngle = this.Transform.r-90;
    if (cameraAngle<0) { cameraAngle += 360; }
    if (cameraAngle>360) { cameraAngle -= 360; }
    if (Math.abs(cameraAngle-playerAngle)<this.fov/2) {
      this.Raycast.collider.dx = dx;
      this.Raycast.collider.dy = dy;
    } else {
      this.Raycast.collider.dx = 0;
      this.Raycast.collider.dy = 10;
    }

    if (this.Raycast.collider.collisions.includes(Scoopy.Collider.collider)) {
      return true;
    }

    return false;
  }

  for (let key in cameraInit) {
    newCamera[key] = cameraInit[key];
  }

  let orientation = Math.floor((newCamera.pivotCentre+45)/(360/4));
  if (orientation==4) { orientation = 0; }
  if (orientation==0) {
    newCamera.attach("Graphic",{level:1,graphic:cg.createGraphic(cg.graphics.cameraRight),master:true});
  } else if (orientation==1) {
    newCamera.attach("Graphic",{level:1,graphic:cg.createGraphic(cg.graphics.cameraUp),master:true});
  } else if (orientation==2) {
    newCamera.attach("Graphic",{level:1,graphic:cg.createGraphic(cg.graphics.cameraLeft),master:true});
  } else if (orientation==3) {
    newCamera.attach("Graphic",{level:1,graphic:cg.createGraphic(cg.graphics.cameraDown),master:true});
  }

  light.penumbra = 1-newCamera.fov/360;
  newCamera.Transform.r = newCamera.pivotCentre;
  return newCamera;
}

function caught() {
  if (alarms) { return; }
  if (audioInformation.instances.ambience!==null) { audioInformation.instances.ambience.stop(); }
  audioInformation.instances.ambience = null;
  if (audioInformation.instances.running==null) { audioInformation.instances.running = ChoreoGraph.AudioController.sounds.running.start(true); }
  if (audioInformation.instances.alarm==null) { audioInformation.instances.alarm = ChoreoGraph.AudioController.sounds.alarm.start(true,0,0.5); }

  if (frontEndLoader.Graphic.graphic.o==1) {
    interface.pressR = true;
  }
  alarms = true;
  caughtTime = cg.clock;
  interface.topLeft = true;
}

createCameraObject({id:"cameraA",pivotRange:42.7,fov:29.2,detectRange:14,pivotCentre:270});
cg.objects.cameraA.Transform.x = 190;
cg.objects.cameraA.Transform.y = 400;

createCameraObject({id:"cameraB",pivotRange:96.3,fov:39.9,pivotSpeed:0.2,pivotCentre:0});
cg.objects.cameraB.Transform.x = 950;
cg.objects.cameraB.Transform.y = -100;

createCameraObject({id:"cameraC",pivotRange:70.06,fov:40.1,detectRange:11,pivotSpeed:1,pivotCentre:0});
cg.objects.cameraC.Transform.x = -750;
cg.objects.cameraC.Transform.y = -50;

createCameraObject({id:"cameraD",pivotRange:6000,fov:60,detectRange:7,pivotCentre:270,pivotSpeed:27,swing:false});
cg.objects.cameraD.Transform.x = 450;
cg.objects.cameraD.Transform.y = -1000;

createCameraObject({id:"cameraE",pivotRange:6000,fov:60,detectRange:7,pivotCentre:90,pivotSpeed:27,swing:false});
cg.objects.cameraE.Transform.x = 450;
cg.objects.cameraE.Transform.y = -1000;

createCameraObject({id:"cameraF",pivotRange:50,fov:60,detectRange:15,pivotCentre:90,pivotSpeed:0.5,pivotCentre:90});
cg.objects.cameraF.Transform.x = 1450;
cg.objects.cameraF.Transform.y = -570;

let frontEndLoader = cg.createObject({x:2056.25,y:-250})
.attach("Graphic",{level:1,graphic:cg.graphics.frontEndLoader,master:true})
.attach("Animator",{ease:"inoutA",anim:cg.createAnimation({
  data : [[-20,0],[20,1.5],[-20,1.5]],
  keys : [["Transform","oy"],"time"],
  id : "bob"
})})
.attach("Collider",{oy:53,ox:-6,collider:cg.createCollider({type:"circle",id:"frontEndLoader_Collider",radius:140,trigger:true,groups:[1],enter:function(collider) {
  if (collider.id=="scoopy_Collider") {
    frontEndLoader.Graphic.graphic.o = 0;
    caught();
  }
}}),master:true});

lightingGraphic.lights.push(cg.createLight({type:"spot",id:"exitLight",x:230,y:250,outerRadius:200,innerRadius:40,brightness:0.9,occlude:false,colour:"#00ff9a"}));

let exitSign = cg.createObject({x:-1653,y:1206.5})
.attach("Graphic",{level:1,graphic:cg.graphics.exitLeft,master:true})
.attach("Collider",{ox:150,oy:200,collider:cg.createCollider({type:"rectangle",id:"exitCollider",width:400,height:150,trigger:true,groups:[1],enter:function(collider) {
  if (frontEndLoader.Graphic.graphic.o==0) {
    hasEscapedWithSpoon = true;
    interface.mainMenu = true;
    if (audioInformation.instances.running!==null) { audioInformation.instances.running.stop(); }
    if (audioInformation.instances.alarm!==null) { audioInformation.instances.alarm.stop(); }
  } else {
    interface.leave = true;
  }
  if (audioInformation.instances.footsteps!==null) { audioInformation.instances.footsteps.paused = true; }
  cg.pause();
}}),master:true})
.attach("Light",{light:cg.lights.exitLight,master:true});

// These colliders are for stopping the raycast from cameras seeing the player through walls
cg.createCollider({type:"rectangle",id:"rayStop0",x:200,y:850,width:200,height:200,trigger:true,groups:[1]});
cg.createCollider({type:"rectangle",id:"rayStop1",x:750,y:100,width:500,height:100,trigger:true,groups:[1]});
cg.createCollider({type:"rectangle",id:"rayStop2",x:200,y:-500,width:1800,height:100,trigger:true,groups:[1]});
cg.createCollider({type:"rectangle",id:"rayStop3",x:-450,y:100,width:500,height:100,trigger:true,groups:[1]});
cg.createCollider({type:"rectangle",id:"rayStop4",x:-1400,y:50,width:200,height:400,trigger:true,groups:[1]});
cg.createCollider({type:"rectangle",id:"rayStop5",x:-50,y:-1000,width:100,height:500,trigger:true,groups:[1]});
cg.createCollider({type:"rectangle",id:"rayStop6",x:1050,y:-1000,width:100,height:500,trigger:true,groups:[1]});

let interface = {
  leave : false,
  tryAgain : false,
  topLeft : false,
  pressR : false,
  mainMenu : true
}

ChoreoGraph.graphicTypes.mainMenu = new class MainMenu {
  draw(g,cg,ax,ay) {
    let scale = cg.settings.canvasSpaceScale;
    cg.c.fillStyle = "#000000";
    cg.c.fillRect(ax-cg.cw/scale/2,ay-cg.ch/scale/2,cg.cw/scale,cg.ch/scale);

    cg.c.imageSmoothingEnabled = false;

    cg.c.globalAlpha = 0.1;
    let bigSpoonScale = 7;
    let image = cg.images.bigSpoonOutline;
    if (hasEscapedWithSpoon) {
      image = cg.images.bigSpoonColoured;
    }
    cg.drawImage(image,ax,ay,100*bigSpoonScale,200*bigSpoonScale,90,false);

    cg.c.globalAlpha = 1;
    let logoW = cg.images.logo.image.width;
    let logoH = cg.images.logo.image.height;
    let logoScale = 15;
    cg.drawImage(cg.images.logo,ax,ay-100,logoW*logoScale,logoH*logoScale,0,false);

    let cgSize = 150;
    cg.drawImage(cg.images.cg,ax-240,ay+200,cgSize,cgSize,20,false);
    cg.c.fillStyle = "#ffffff";
    cg.c.font = "40px PublicPixel";
    cg.c.textAlign = "left";
    cg.c.fillText("ChoreoGraph",ax-80,ay+200);
    cg.c.fillText("Edition",ax-80,ay+250);
    
    cg.c.font = "20px PublicPixel";
    cg.c.textAlign = "center";
    cg.c.fillText("Click anywhere to play",ax,ay+cg.ch/scale*0.45);

    let mutedText = "Unmute";
    if (ChoreoGraph.AudioController.masterVolume>0) {
      mutedText = "Mute";
    }
    cg.c.font = "30px PublicPixel";
    cg.c.textBaseline = "middle";
    cg.c.fillText(mutedText,ax+cg.cw/scale/2-177,ay+cg.ch/scale/2-102);

    let touchText = "Touch Off";
    if (allowTouchMovement) {
      touchText = "Touch On";
    }
    cg.c.fillText(touchText,ax+cg.cw/scale/2-177,ay+cg.ch/scale/2-192);
  }
}
let mainMenu = cg.createGraphic({type:"mainMenu",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5});

ChoreoGraph.graphicTypes.leaveMenu = new class LeaveMenu {
  draw(g,cg,ax,ay) {
    cg.c.globalAlpha = 0.2;
    let scale = cg.settings.canvasSpaceScale;
    cg.c.fillStyle = "#000000";
    cg.c.fillRect(ax-cg.cw/scale/2,ay-cg.ch/scale/2,cg.cw/scale,cg.ch/scale);

    cg.c.globalAlpha = 0.8;
    cg.c.beginPath();
    cg.c.roundRect(ax-400,ay-400,800,800,3);
    cg.c.fill();

    cg.c.globalAlpha = 1;
    cg.c.font = "50px PublicPixel";
    cg.c.fillStyle = "#ffffff";
    cg.c.textAlign = "center";
    cg.c.fillText("Leave the",ax,ay-225-75);
    cg.c.fillText("restaurant?",ax,ay-175-75);
    cg.c.font = "35px PublicPixel";
    cg.c.fillText("You have not yet",ax,ay-130);
    cg.c.fillText("successfully",ax,ay-95);
    cg.c.fillText("harvested the spoon",ax,ay-60);

    // Button boxes
    let changeTime = 100;
    if (cg.buttons.leaveMenuYes.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.buttons.leaveMenuYes.enterTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#bfbfbf";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.buttons.leaveMenuYes.exitTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#ffffff";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    cg.c.fillRect(ax-300,ay+44.5,600,100);
    if (cg.buttons.leaveMenuNo.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.buttons.leaveMenuNo.enterTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#bfbfbf";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.buttons.leaveMenuNo.exitTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#ffffff";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    cg.c.fillRect(ax-300,ay+188,600,100);

    cg.c.fillStyle = "#333333";
    cg.c.font = "30px PublicPixel";
    cg.c.fillText("Yes, go home",ax,ay+107);
    cg.c.fillText("No, I want to stay",ax,ay+250);
  }
}
let leaveMenu = cg.createGraphic({type:"leaveMenu",x:0,r:0,colour:"#000000",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5});

cg.createButton({x:0,y:94.5,width:600,height:100,id:"leaveMenuYes",check:"leaveMenu",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5,down:function(){
  interface.mainMenu = true;
  interface.leave = false;
  if (audioInformation.instances.running!==null) { audioInformation.instances.running.stop(); }
  if (audioInformation.instances.alarm!==null) { audioInformation.instances.alarm.stop(); }
  if (audioInformation.instances.ambience!==null) { audioInformation.instances.ambience.stop(); }
  audioInformation.instances.ambience = null;
  audioInformation.instances.alarm = null;
  audioInformation.instances.running = null;
}});
cg.createButton({x:0,y:238.6,width:600,height:100,id:"leaveMenuNo",check:"leaveMenu",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5,down:function(){
  interface.leaveMenu = false;
  interface.leave = false;
  cg.unpause();
}});

ChoreoGraph.graphicTypes.tryAgain = new class TryAgain {
  draw(g,cg,ax,ay) {
    cg.c.globalAlpha = 0.2;
    let scale = cg.settings.canvasSpaceScale;
    cg.c.fillStyle = "#000000";
    cg.c.fillRect(ax-cg.cw/scale/2,ay-cg.ch/scale/2,cg.cw/scale,cg.ch/scale);

    cg.c.globalAlpha = 0.8;
    cg.c.beginPath();
    cg.c.roundRect(ax-400,ay-400,800,800,3);
    cg.c.fill();

    cg.c.globalAlpha = 1;
    cg.c.font = "50px PublicPixel";
    cg.c.fillStyle = "#ffffff";
    cg.c.textAlign = "center";
    cg.c.fillText("You were",ax,ay-225);
    cg.c.fillText("caught!",ax,ay-175);
    cg.c.font = "35px PublicPixel";
    cg.c.fillText("Try again?",ax,ay-55);

    // Button boxes
    let changeTime = 100;
    if (cg.buttons.tryAgainYes.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.buttons.tryAgainYes.enterTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#bfbfbf";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.buttons.tryAgainYes.exitTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#ffffff";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    cg.c.fillRect(ax-300,ay+44.5,600,100);
    if (cg.buttons.tryAgainNo.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.buttons.tryAgainNo.enterTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#bfbfbf";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.buttons.tryAgainNo.exitTime;
      if (timeSince>changeTime) {
        cg.c.fillStyle = "#ffffff";
      } else {
        cg.c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    cg.c.fillRect(ax-300,ay+188,600,100);

    cg.c.fillStyle = "#333333";
    cg.c.font = "30px PublicPixel";
    cg.c.fillText("Yes",ax,ay+107);
    cg.c.fillText("No, go home",ax,ay+250);
  }
}
let tryAgain = cg.createGraphic({type:"tryAgain",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5});

cg.createButton({x:0,y:94.5,width:600,height:100,id:"tryAgainYes",check:"tryAgain",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5,down:function(){
  interface.tryAgain = false;
  restart();
}});
cg.createButton({x:0,y:238.6,width:600,height:100,id:"tryAgainNo",check:"tryAgain",CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5,down:function(){
  interface.mainMenu = true;
  interface.tryAgain = false;
  if (audioInformation.instances.running!==null) { audioInformation.instances.running.stop(); }
  if (audioInformation.instances.alarm!==null) { audioInformation.instances.alarm.stop(); }
  if (audioInformation.instances.ambience!==null) { audioInformation.instances.ambience.stop(); }
  audioInformation.instances.ambience = null;
  audioInformation.instances.alarm = null;
  audioInformation.instances.running = null;
  cg.pause();
}});

cg.createButton({x:400,y:80,width:800,height:160,id:"openRestartMenu",check:"pressR",CGSpace:false,canvasSpaceXAnchor:0,canvasSpaceYAnchor:0,down:function(){
  interface.tryAgain = true;
  cg.pause();
}});

cg.createButton({x:-175,y:-100,width:250,height:80,id:"toggleAudio",check:"mainMenu",CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:1,down:function(){
  ChoreoGraph.AudioController.masterVolume = !ChoreoGraph.AudioController.masterVolume;
}});

cg.createButton({x:-175,y:-190,width:250,height:80,id:"toggleTouch",check:"mainMenu",CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:1,down:function(){
  allowTouchMovement = !allowTouchMovement;
}});

cg.settings.callbacks.updateButtonChecks = function(cg) {
  return {
    "tryAgain" : interface.tryAgain,
    "leaveMenu" : interface.leave,
    "pressR" : interface.pressR&&!cg.paused,
    "mainMenu" : interface.mainMenu
  }
}

let startTime = 0;

cg.settings.callbacks.cursorDown = function() {
  if (interface.mainMenu&&cg.buttons.toggleAudio.hovered==false&&cg.buttons.toggleTouch.hovered==false) {
    startTime = ChoreoGraph.nowint;
    interface.mainMenu = false;
    restart();
    cg.unpause();
  }
}

let topLeftText = cg.createGraphic({type:"pointText",CGSpace:false,x:30,y:30,canvasSpaceXAnchor:0,canvasSpaceYAnchor:0,colour:"#ffffff",text:"Time to escape: 30 seconds",textBaseline:"top",textAlign:"left",font:"40px PublicPixel"});

let pressRText = cg.createGraphic({type:"pointText",CGSpace:false,x:30,y:85,canvasSpaceXAnchor:0,canvasSpaceYAnchor:0,colour:"#ffffff",text:"(Click R to restart.)",textBaseline:"top",textAlign:"left",font:"30px PublicPixel"});

function restart() {
  interface.topLeft = false;
  interface.pressR = false;
  alarms = false;
  Scoopy.Transform.x = -1442;
  Scoopy.Transform.y = 1160;
  frontEndLoader.Graphic.graphic.o = 1;

  if (audioInformation.instances.running!==null) { audioInformation.instances.running.stop(); }
  if (audioInformation.instances.alarm!==null) { audioInformation.instances.alarm.stop(); }
  audioInformation.instances.running = null;
  audioInformation.instances.alarm = null;
  if (audioInformation.instances.ambience===null) { audioInformation.instances.ambience = ChoreoGraph.AudioController.sounds.ambience.start(true); }

  Scoopy.Animator.anim = scoopyIdleLeftAnim;
  Scoopy.Animator.reset();
  cg.unpause();
}

cg.settings.callbacks.start = function(cg) {
  cg.camera.scaleMode = "maximum";
  cg.camera.maximumSize = 1400;
  cg.preventSingleTouch = true;
  cg.pause();
}
ChoreoGraph.start();