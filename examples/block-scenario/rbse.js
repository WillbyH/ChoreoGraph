const cg = ChoreoGraph.instantiate({
  core : {
    debugCGScale : 0.8,
    debugCanvasScale : 0.4,
    frustumCulling : false
  },
  animationeditor : {
    snapGridSize : 4,
    template : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:"
  },
  animation : {
    debug : {
      showDirectionalMarkings : false
    }
  },
  input : {
    preventDefaultKeys : ["up","down","tab"],
  }
});

// CREATE CAMERA, CANVAS, SCENE AND SCENE COLLECTIONS
cg.createCamera({
  x : 400/2,
  y : 300/2,
  scaleMode : "minimum",
  width : 400,
  height : 300,
},"railways")
.addScene(cg.createScene({},"railways"));

cg.createCanvas({
  element : document.getElementById("railways"),
  background : "#145a96"
},"railways")
.resizeWithSelf()
.setCamera(cg.cameras.railways);

cg.scenes.railways.createItem("collection",{},"background");
cg.scenes.railways.createItem("collection",{},"track");
cg.scenes.railways.createItem("collection",{},"low");
cg.scenes.railways.createItem("collection",{},"high");

let cr = cg.canvases.railways.c;

// GRID GRAPHIC TYPE
cg.graphicTypes.grid = new class grid {
  draw(c,ax,ay) {
    c.lineWidth = 0.25;
    c.beginPath();
    for (let i=1;i<100;i++) {
      c.moveTo(i*4,0);
      c.lineTo(i*4,300);
    }
    for (let i=1;i<75;i++) {
      c.moveTo(0,i*4);
      c.lineTo(400,i*4);
    }
    c.strokeStyle = "#206eb0";
    c.stroke();

    c.lineWidth = 0.5;
    c.beginPath();
    for (let i=0;i<=20;i++) {
      c.moveTo(i*4*5,0);
      c.lineTo(i*4*5,300);
    }

    for (let i=0;i<=15;i++) {
      c.moveTo(0,i*4*5);
      c.lineTo(400,i*4*5);
    }
    c.strokeStyle = "#2981cc";
    c.stroke();
  }
}
cg.createGraphic({type:"grid"},"grid");

// TRACK GRAPHIC TYPE
cg.graphicTypes.railwayVisualisation = new class railwayVisualisation {
  draw(c,ax,ay) {
    c.beginPath();
    let lastX = 0;
    let lastY = 0;
    for (let trackId in rwManager.trackData) {
      let track = rwManager.trackData[trackId];
      for (let part=0;part<track.animation.data.length;part++) {
        let data = track.animation.data[part];
        let distance = Math.sqrt(Math.pow(data[0]-lastX,2)+Math.pow(data[1]-lastY,2));
        if (distance>2&&part==0) {
          c.moveTo(data[0],data[1]);
        } else {
          c.lineTo(data[0],data[1]);
        }
        lastX = data[0];
        lastY = data[1];
      }
    }
    c.lineJoin = "round";
    c.strokeStyle = "#bcbbc9";
    c.lineWidth = 3;
    c.stroke();
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = 1.5;
    c.stroke();
    c.globalCompositeOperation = "source-over";
    c.strokeStyle = "#005993";
    c.lineWidth = 1.5;
    c.stroke();
  }
}
cg.createGraphic({type:"railwayVisualisation"},"railwayVisualisation");

// SIGNAL GRAPHIC TYPE
cg.graphicTypes.railwayVisualisation = new class railwayVisualisation {
  setup(init,cg) {
    this.block;
    this.armXO = 0;
    this.armYO = 0;
  };
  draw(c,ax,ay) {
    let clear = cg.BlockController.blocks[this.block].isOpen();
    c.beginPath();
    c.moveTo(this.armXO,this.armYO);
    c.lineTo(0,0);
    c.lineWidth = 1;
    c.strokeStyle = "#bcb6b3";
    c.stroke();
    c.beginPath();
    c.arc(0,0,1.5,0,Math.PI*2);
    if (clear) {
      c.fillStyle = "#53d04f";
    } else {
      c.fillStyle = "#8f0000";
    }
    c.fill();
    c.lineWidth = 0.7;
    c.strokeStyle = "#ffffff";
    c.stroke();
  }
}
cg.createGraphic({type:"railwayVisualisation"},"railwayVisualisation");

// FULLSCREEN TOGGLE GRAPHIC TYPE
cg.graphicTypes.fullscreenToggle = new class fullscreenToggle {
  setup(init,cg) {
    this.isFullscreen = false;
  };
  draw(c,ax,ay) {
    if (cg.Input.buttons.fullscreenToggle.hovered) {
      c.strokeStyle = "#cfcfcf";
    } else {
      c.strokeStyle = "#969696";
    }
    c.lineWidth = 1;
    c.beginPath();
    if (this.isFullscreen) {
      c.moveTo(-5,-1);
      c.lineTo(-1,-1);
      c.lineTo(-1,-5);
      c.moveTo(5,1);
      c.lineTo(1,1);
      c.lineTo(1,5);
    } else {
      c.moveTo(-5,0);
      c.lineTo(-5,-5);
      c.lineTo(0,-5);
      c.moveTo(5,0);
      c.lineTo(5,5);
      c.lineTo(0,5);
    }
    c.stroke();
  }
}
cg.createGraphic({type:"fullscreenToggle"},"fullscreenToggle");
cg.Input.createButton({type:"rectangle",
  transform : cg.createTransform({x:390,y:290}),
  width : 20,
  height : 20,
  down : ()=> {
    cg.graphics.fullscreenToggle.isFullscreen = !cg.graphics.fullscreenToggle.isFullscreen;
    if (cg.graphics.fullscreenToggle.isFullscreen) {
      cg.cameras.railways.height = 320;
      cg.cameras.railways.width = 420;
      document.getElementById("railways").requestFullscreen().catch((e)=>{
        cg.cameras.railways.height = 300;
        cg.cameras.railways.width = 400;
        cg.Input.buttons.fullscreenToggle.transform.x = 100000000;
        cg.sceneItems.fullscreenToggle.transform.x = 100000000;
        alert("Your browser does not support fullscreen")
      });
    } else {
      document.exitFullscreen();
    }
  },
},"fullscreenToggle");

document.addEventListener("fullscreenchange", (event) => {
  if (!document.fullscreenElement) {
    cg.graphics.fullscreenToggle.isFullscreen = false;
    cg.cameras.railways.height = 300;
    cg.cameras.railways.width = 400;
  }
});

// CREATE TRAIN GRAPHICS
cg.createGraphic({type:"rectangle",width:6,height:15,radius:2,colour:"#cfcfcf",fill:true},"train");
cg.createGraphic({type:"rectangle",width:6,height:15,radius:2,colour:"#000000",fill:true},"trainShadow");
cg.createGraphic({type:"rectangle",width:12,height:19,radius:4,colour:"#0fba91",fill:true},"trainHover");

// CREATE GRID AND TRACK GRAPHICS
cg.scenes.railways.createItem("graphic",{
  graphic : cg.graphics.grid
},"grid","background");
cg.scenes.railways.createItem("graphic",{
  graphic : cg.graphics.railwayVisualisation
},"railwayVisualisation","track");
cg.scenes.railways.createItem("graphic",{
  graphic : cg.graphics.fullscreenToggle,
  transform : cg.createTransform({x:390,y:290}),
},"fullscreenToggle","high");

// RAILWAY MANAGER (dont wanna put much in the global scope)
const rwManager = new class RailwayManager {
  nextTrainId = 0;
  trains = [];
  selectedTrain = -1;
  cascadeConnectionCount = 2;

  // PACKED ANIMATIONS AND CONNECTED OUTPUT ANIMATION IDS
  trackData = {
    "leftLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:128,112+84,72,68,56,48,64~48,80+48,84+48,108+48,160+48,244+48,256+48,244+48,200,48,184,40,176~40,160+40,156+40,84,40,68,48,56~64,56,80,56!~88,64+92,68_136,108&trigger=1.6:b:sL1|19.51:b:sL2|20.71:b:sL3|21.56:j:n64|37.21:b:sL4|39.51:b:sL5|59.57:b:sL6",
      connections : ["leftLine-outerLoop"]
    },
    "leftLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:136,108!148,120~160,120_164,120&trigger=1.35:b:sO0",
      connections : ["outerLoop_top"]
    },
    "topLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:252,100,252,88,244,80~232,80+180,80,168,80,160,72~160,60,160,48,168,40~180,40+184,40+204,40+300,40+340,40,352,40,360,48~360,60+360,64+360,140+360,228+360,240+360,228+360,180,360,164,352,156~352,140+352,136+352,72,352,52,348,48~332,48+328,48+300,48+204,48+184,48,164,48,164,72~184,72+188,72+240,72,252,72,260,80~260,92_260,100&trigger=11.71:b:sT1|33.51:b:sT2|34.41:b:sT3|47.47:b:sT4|48.68:j:n64|64.37:b:sT5|80.44:b:sT6|81.44:b:sT7|95.45:b:sT8",
      connections : ["topLine-outerLoop"]
    },
    "topLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=15:260,100+260,116_260,144&trigger=1.4:b:sO2",
      connections : ["outerLoop_right"]
    },
    "outerLoop_top" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=15:164,120+196,120_236,120&trigger=1.5:b:sO1",
      connections : ["outerLoop_topRight","outerLoop-topLine"],
      cascadeIndex : 0
    },
    "outerLoop-topLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:236,120+240,120,252,120,252,112~252,104_252,100&trigger=5.35:b:sT0",
      connections : ["topLine"]
    },
    "outerLoop_topRight" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:236,120+240,120,252,120,260,128~260,140_260,144&trigger=4.4:b:sO2",
      connections : ["outerLoop_right"]
    },
    "outerLoop_right" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=15:260,144_260,156",
      connections : ["outerLoop_bottomRight"]
    },
    "outerLoop_bottomRight" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:260,156+260,160,260,172,252,180~240,180+236,180_224,180&trigger=5.4:b:sO3",
      connections : ["outerLoop-lowerJunction","outerLoop-lowerJunction","outerLoop_bottom"],
      cascadeIndex : 2
    },
    "outerLoop_bottom" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:224,180+200,180_172,180&trigger=1.4:b:sO4",
      connections : ["outerLoop_bottomLeft"]
    },
    "outerLoop-lowerJunction" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:224,180,212,180,204,188~204,200+204,204_204,212",
      connections : ["lowerJunction-rightLine","lowerJunction-bottomLine"]
    },
    "lowerJunction-rightLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:204,212+204,216,204,228,212,236~224,236_228,236&trigger=1.5:b:sR0",
      connections : ["rightLine"]
    },
    "lowerJunction-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:196,212+196,206+196,200,196,188,188,180~176,180_172,180&trigger=1.55:b:sO4",
      connections : ["outerLoop_bottomLeft"]
    },
    "lowerJunction-bottomLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:204,212+204,216+204,220+204,224,204,236,196,244~184,244_172,244&trigger=1.55:b:sJ0|13.51:b:sB0",
      connections : ["bottomLine"]
    },
    "bottomLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:172,244+124,244+112,244,100,244,92,236~92,224+92,220+92,212+92,120+92,108+92,120+92,180,92,204,100,196~100,220,100,232,104,236~116,236+120,236+132,236_172,236&trigger=1.35:b:sB1|14.53:b:sB2|15.29:j:n64|25.46:b:sB3|41.44:b:sB4",
      connections : ["bottomLine-outerLoop"]
    },
    "bottomLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:172,236+176,236,188,236,196,228~196,216_196,212&trigger=5.55:b:sJ1",
      connections : ["lowerJunction-outerLoop"]
    },
    "rightLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:228,236+272,236+280,236,292,236,300,228~300,216+300,212+300,180+300,92+300,80+300,92+300,140,300,160,308,160~308,180+308,220,308,236,300,244~288,244+284,244_228,244&trigger=1.25:b:sR1|14.46:b:sR2|15.56:j:n64|31.41:b:sR3|43.47:b:sR4",
      connections : ["rightLine-outerLoop","rightLine-bottomLine"]
    },
    "rightLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:228,244+216,244,204,244,196,236~196,224_196,212&trigger=1.5:b:sJ0|7.16:b:sJ1",
      connections : ["lowerJunction-outerLoop"]
    },
    "rightLine-bottomLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:228,244+224,244+180,244_172,244&trigger=1.35:b:sJ0|2.45:b:sB0",
      connections : ["bottomLine"]
    },
    "outerLoop_bottomLeft" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:172,180+160,180,148,180,140,172~140,160+140,156_140,144&trigger=4.45:b:sO5",
      connections : ["outerLoop_topLeft","outerLoop-leftLine"],
      cascadeIndex : 0
    },
    "outerLoop-leftLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:140,144+140,140,140,124!~132,116_128,112&trigger=7.46:b:sL0",
      connections : ["leftLine"]
    },
    "outerLoop_topLeft" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:140,144+140,140,140,128,148,120~160,120_164,120&trigger=5.35:b:sO0",
      connections : ["outerLoop_top"]
    }
  };

  constructor() {
    this.createTracks();
  };

  // CREATES ALL THE ANIMATIONS FROM THE DATA ABOVE
  createTracks() {
    for (let trackId in this.trackData) {
      let track = this.trackData[trackId];
      let newAnimation = cg.Animation.createAnimationFromPacked(track.animation,{},trackId);
      newAnimation.connections = track.connections;
      newAnimation.cascadeIndex = track.cascadeIndex !== undefined ? track.cascadeIndex : -1;
      newAnimation.switchIndex = 0;
      track.animation = newAnimation;

      cg.settings.blockcontroller.debug.animations.push(newAnimation);
      for (let part=0;part<newAnimation.data.length;part++) {
        let data = newAnimation.data[part];
        if (typeof data[0]=="string" && data[0].toLowerCase()=="b") {
          cg.BlockController.createBlock({},data[1]);
        }
      }
    }
  };

  // TRANSITIONS THE ANIMATION OF A TRAIN TO THE NEXT
  findNextTrack(Animator) {
    let cascadeIndex = Animator.animation.cascadeIndex;
    let connections = Animator.animation.connections;
    if (connections.length > 0) {
      let outSwitchIndex = Animator.animation.switchIndex;

      function removePreviousCascade() {
        if (Animator.animation.switchIndex == cascadeIndex) {
          rwManager.cascadeConnectionCount--;
        }
      }
      function increment() {
        Animator.animation.switchIndex++;
        if (Animator.animation.switchIndex >= connections.length) {
          Animator.animation.switchIndex = 0;
        }
      }
      function addNextCascade() {
        if (Animator.animation.switchIndex == cascadeIndex) {
          rwManager.cascadeConnectionCount++;
        }
      }

      // Move the switch to the next direction
      if (Animator.object.isBackOfTrain) {
        removePreviousCascade();
        increment();
        addNextCascade();
        if (rwManager.cascadeConnectionCount==3) {
          rwManager.cascadeConnectionCount--;
          increment();
          addNextCascade();
        }
      }
      Animator.animation = cg.Animation.animations[connections[outSwitchIndex]];
    }
  };

  // CREATES EVERYTHING REQUIRED FOR A TRAIN
  createTrain(animation, playhead, useAltGraphic=false) {
    function createCarriage(trainId,carriageIndex,isBack) {
      let newCarriage = cg.createObject({},"train_"+trainId+"_carriage_"+carriageIndex)
      .attach("Animator",{
        animation : cg.Animation.animations[animation],
        speed : 10,
        onEnd : rwManager.findNextTrack
      })
      .attach("Graphic",{
        key : "Shadow",
        graphic : cg.graphics.trainShadow,
        transform : cg.createTransform({ox:1.5,oy:1.5,sx:1.2,sy:1.1,o:0.3}),
        collection : "low"
      })
      .attach("Graphic",{
        graphic : cg.graphics.train,
        collection : "high"
      })
      .attach("Graphic",{
        key : "Hover",
        graphic : cg.graphics.trainHover,
        transform : cg.createTransform({o:0.3}),
        collection : "high"
      })
      .attach("BlockController");

      if (carriageIndex==0) {
        newCarriage.Animator.triggerTypes.j = (trigger,object,animator) => {
          let train = cg.BlockController.blockGroups[object.BlockController.group];
          for (let i=0;i<train.length;i++) {
            let carriageAnimator = train[i].Animator;
            carriageAnimator.playhead += trigger[1];
          }
          return true;
        }
      }

      newCarriage.BlockController.group = "train_"+trainId;
      newCarriage.transform.ay = 2;
      newCarriage.Animator.playFrom(playhead-carriageIndex*18);
      if (isBack) {
        newCarriage.isBackOfTrain = true;
      }

      let carriageButton = cg.Input.createButton({type:"circle",transformInit:{parent:newCarriage.transform},radius:12},"train_"+trainId+"_carriage_"+carriageIndex+"_button");
      carriageButton.trainId = trainId;

      cg.scenes.railways.addObject(newCarriage);
    }
    for (let i=0;i<3;i++) {
      createCarriage(this.nextTrainId,i,i==2);
    }
    this.nextTrainId++;
  };

  createSignal(block, x, y, armX, armY, idAddition) {
    let armXO = armX - x;
    let armYO = armY - y;
    let newSignal = cg.createObject({
      transform : cg.createTransform({x:x,y:y}),
    },"signal_"+block + (idAddition == undefined ? "" : "-" + idAddition));
    newSignal.attach("Graphic",{
      graphic : cg.createGraphic({type:"railwayVisualisation",
        block:block,
        armXO : armXO,
        armYO : armYO
      }),
      collection : "background"
    });
    cg.scenes.railways.addObject(newSignal);
  };
}

// CREATE THE 13 TRAINS
rwManager.createTrain("leftLine",50);
rwManager.createTrain("leftLine",150);
rwManager.createTrain("leftLine",400);
rwManager.createTrain("leftLine",550);
rwManager.createTrain("rightLine",50);
rwManager.createTrain("rightLine",300);
rwManager.createTrain("rightLine",400);
rwManager.createTrain("bottomLine",50);
rwManager.createTrain("bottomLine",350);
rwManager.createTrain("topLine",150);
rwManager.createTrain("topLine",250);
rwManager.createTrain("topLine",480);
rwManager.createTrain("outerLoop_bottomLeft",40);

// CREATE THE SIGNALS
rwManager.createSignal("O0", 151, 132, 144, 127, "1");
rwManager.createSignal("O0", 142, 103, 137, 109, "2");
rwManager.createSignal("O1", 196, 110, 196, 120);
rwManager.createSignal("O2", 248, 130, 252, 123, "1");
rwManager.createSignal("O2", 268, 116, 260, 116, "2");
rwManager.createSignal("O3", 267, 170, 258, 167);
rwManager.createSignal("O4", 200, 172, 200, 180, "1");
rwManager.createSignal("O4", 188, 206, 196, 206, "2");
rwManager.createSignal("O5", 154, 170, 149, 177);
rwManager.createSignal("J0", 212, 214, 204, 214, "1");
rwManager.createSignal("J0", 220, 252, 220, 244, "2");
rwManager.createSignal("J1", 208, 236, 204, 240, "1");
rwManager.createSignal("J1", 184, 227, 188, 233, "2");
rwManager.createSignal("R0", 212, 218, 204, 218);
rwManager.createSignal("R1", 272, 228, 272, 236);
rwManager.createSignal("R2", 292, 180, 300, 180);
rwManager.createSignal("R3", 316, 180, 308, 180);
rwManager.createSignal("R4", 288, 252, 288, 244);
rwManager.createSignal("T0", 243, 110, 249, 115);
rwManager.createSignal("T1", 180, 88, 180, 80);
rwManager.createSignal("T2", 204, 32, 204, 40);
rwManager.createSignal("T3", 300, 32, 300, 40);
rwManager.createSignal("T4", 368, 140, 360, 140);
rwManager.createSignal("T5", 344, 140, 352, 140);
rwManager.createSignal("T6", 300, 56, 300, 48);
rwManager.createSignal("T7", 204, 56, 204, 48);
rwManager.createSignal("T8", 181, 63, 180, 71);
rwManager.createSignal("L0", 126, 122, 133, 117);
rwManager.createSignal("L1", 78, 78, 84, 72);
rwManager.createSignal("L2", 56, 108, 48, 108);
rwManager.createSignal("L3", 56, 160, 48, 160);
rwManager.createSignal("L4", 32, 160, 40, 160);
rwManager.createSignal("L5", 32, 84, 40, 84);
rwManager.createSignal("L6", 93, 59, 88, 64);
rwManager.createSignal("B0", 182, 252, 182, 244);
rwManager.createSignal("B1", 124, 252, 124, 244);
rwManager.createSignal("B2", 84, 212, 92, 212);
rwManager.createSignal("B3", 104, 197, 97, 202);
rwManager.createSignal("B4", 132, 228, 132, 236);

// A button that prevents deselection of trains where the speed slider is
cg.Input.createButton({type:"rectangle",width:110,height:30,transformInit:{x:90,y:34}},"noDeselectionZone");

cg.settings.core.callbacks.loopBefore = ()=>{
  // SET TRAIN HOVER GRAPHIC OPACITY
  for (let trainId=0;trainId<13;trainId++) {
    let train = cg.BlockController.blockGroups["train_"+trainId];
    for (let carriage of train) {
      carriage.object.Hover.transform.o = 0;
    }
  }
  let hoveredTrain = -1;
  for (let buttonId of cg.keys.buttons) {
    let button = cg.Input.buttons[buttonId];
    if (button.trainId==undefined) { continue; }
    if (button.pressed) {
      rwManager.selectedTrain = button.trainId;
    }
    if (button.hovered) {
      hoveredTrain = button.trainId;
      break;
    }
  }
  if (hoveredTrain>=0) {
    let train = cg.BlockController.blockGroups["train_"+hoveredTrain];
    for (let carriage of train) {
      carriage.object.Hover.transform.o = 0.3;
    }
  }
};

cg.settings.core.callbacks.loopAfter = ()=>{
  ChoreoGraph.transformContext(cg.canvases.railways.camera);
  let c = cg.canvases.railways.c;

  // DRAW THE TRAIN SPEED INFORMATION
  c.font = "bold 7px Consolas";
  c.fillStyle = "#cfcfcf";
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  if (rwManager.selectedTrain>=0) {
    c.globalAlpha = 1;
    c.fillText("Selected: Train " + (rwManager.selectedTrain+1), 22, 27);
    let train = cg.BlockController.blockGroups["train_"+rwManager.selectedTrain];
    let speed = train[0].Animator.speed;
    let notches = [0,1,2,3,4,5,10,15,20,25,30,40,50,60];
    let notch = notches.findIndex((n)=>{return n>=speed;});
    c.fillText("Speed", 22, 37);
    c.fillStyle = "#cfcfcf";
    let notchesX = 45;
    let notchesY = 32.2;
    let spacing = 7;
    for (let i=0;i<13;i++) {
      if (i<notch) {
        c.fillStyle = "#cfcfcf";
      } else {
        c.fillStyle = "#808080";
      }
      c.beginPath();
      c.roundRect(notchesX + i*spacing, notchesY, 6, 5, 5);
      c.fill();
      let buttonId = "setSelectedSpeed_"+i;

      // CREATE A BUTTON FOR EACH NOTCH
      if (cg.Input.buttons[buttonId]==undefined) {
        cg.Input.createButton({type:"rectangle",width:spacing,height:20,speed:notches[i+1],transformInit:{x:notchesX + i*spacing + 3,y:notchesY + 2},down:(button)=>{
          if (rwManager.selectedTrain==-1) { return; }
          button.setTrainSpeed(button);
        },enter:(button)=>{
          if (!cg.Input.cursor.hold.any||rwManager.selectedTrain==-1) { return; }
          button.setTrainSpeed(button);
        },setTrainSpeed:(button)=>{
          let train = cg.BlockController.blockGroups["train_"+rwManager.selectedTrain];
          for (let carriage of train) {
            if (carriage.Animator.speed==1&&button.speed==1) {
              carriage.Animator.speed = 0;
            } else {
              carriage.Animator.speed = button.speed;
            }
          }
        }},buttonId);
      }
    }
  }
};

cg.settings.input.callbacks.keyDown = (key)=>{
  // CHANGE THE SELECTED TRAIN SPEED
  if (rwManager.selectedTrain>=0) {
    let train = cg.BlockController.blockGroups["train_"+rwManager.selectedTrain];
    let currentSpeed = train[0].Animator.speed;
    let offset = 0;

    if (key=="up") {
      if (currentSpeed>=30) {
        offset = 10;
      } else if (currentSpeed>=5) {
        offset = 5;
      } else {
        offset = 1;
      }
    } else if (key=="down") {
      if (currentSpeed>30) {
        offset = -10;
      } else if (currentSpeed>5) {
        offset = -5;
      } else {
        offset = -1;
      }
    }
    for (let carriage of train) {
      carriage.Animator.speed += offset;
      carriage.Animator.speed = Math.max(0,Math.min(60,carriage.Animator.speed));
    }
    let buttonSettings = {
      "`" : 0,
      "1" : 1,
      "2" : 2,
      "3" : 3,
      "4" : 4,
      "5" : 5,
      "6" : 10,
      "7" : 15,
      "8" : 20,
      "9" : 25,
      "0" : 30,
      "-" : 40,
      "=" : 50,
      "backspace" : 60
    }

    if (buttonSettings[key]!==undefined) {
      for (let carriage of train) {
        carriage.Animator.speed = buttonSettings[key];
      }
    }
  }
  // SWITCH BETWEEN TRAINS
  if (key=="tab") {
    if (rwManager.selectedTrain>=0) {
      rwManager.selectedTrain += ChoreoGraph.Input.keyStates.shift ? -1 : 1;
      if (rwManager.selectedTrain<0) {
        rwManager.selectedTrain = 12;
      } else if (rwManager.selectedTrain>12) {
        rwManager.selectedTrain = 0;
      }
    } else {
      rwManager.selectedTrain = 0;
    }
  // DESELECT THE TRAIN
  } else if (key=="escape") {
    rwManager.selectedTrain = -1;
  }
};

cg.settings.input.callbacks.cursorDown = (key)=>{
  // DESELECT TRAIN IF NO BUTTONS ARE HOVERED
  let isHoveringButton = false;
  for (let buttonId of cg.keys.buttons) {
    let button = cg.Input.buttons[buttonId];
    if (button.hovered||button.pressed||ChoreoGraph.nowint-button.downTime<100) {
      isHoveringButton = true;
      break;
    }
  }
  if (isHoveringButton==false) {
    rwManager.selectedTrain = -1;
  }
};

ChoreoGraph.start();