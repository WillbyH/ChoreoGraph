const cg = ChoreoGraph.instantiate({
  core : {
    debugCGScale : 0.8
  },
  animationeditor : {
    snapGridSize : 4,
    template : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:"
  },
  animation : {
    debug : {
      showDirectionalMarkings : false
    }
  }
});

cg.createCamera({
  x : 400/2,
  y : 300/2,
  scaleMode : "maximum",
  maximumSize : 400,
  WHRatio : 1
},"railways")
.addScene(cg.createScene({},"railways"));

cg.createCanvas({
  element : document.getElementById("railways"),
  background : "#145a96"
},"railways").resizeWithSelf()
.setCamera(cg.cameras.railways);

let cr = cg.canvases.railways.c;

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

cg.createGraphic({type:"rectangle",width:6,height:15,radius:2,colour:"#cfcfcf",fill:true},"train")
cg.createGraphic({type:"rectangle",width:6,height:15,radius:2,colour:"#fd0001",fill:true},"altTrain")

cg.scenes.railways.createItem("graphic",{
  graphic : cg.graphics.grid,
},"grid");
cg.scenes.railways.createItem("graphic",{
  graphic : cg.graphics.railwayVisualisation,
},"railwayVisualisation");

const rwManager = new class RailwayManager {
  nextTrainId = 0;
  trains = [];

  trackData = {
    "leftLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:128,112+84,72,68,56,48,64~48,80+48,84+48,108+48,200+48,252+48,256+48,252+48,240,48,224,40,216~40,200+40,196+40,84,40,68,48,56~64,56,80,56!~88,64+92,68_136,108&trigger=1.6:b:sL1|19.51:b:sL2|20.71:b:sL3|37.21:b:sL4|39.51:b:sL5|59.57:b:sL6",
      connections : ["leftLine-outerLoop"]
    },
    "leftLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:136,108!148,120~160,120_164,120&trigger=1.35:b:sO0",
      connections : ["outerLoop_top"]
    },
    "topLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:252,100,252,88,244,80~232,80+180,80,168,80,160,72~160,60,160,48,168,40~180,40+184,40+204,40+300,40+340,40,352,40,360,48~360,60+360,64+360,140+360,196+360,200+360,196+360,180,360,164,352,156~352,140+352,136+352,72,352,52,348,48~332,48+328,48+184,48,164,48,164,72~184,72+188,72+240,72,252,72,260,80~260,92_260,100&trigger=10.4:b:sT1|33.51:b:sT2|34.41:b:sT3|46.52:b:sT4|47.47:b:sT5|64.37:b:sT6|78.58:b:sT7|87.48:b:sT8|106.55:b:sO2",
      connections : ["topLine-outerLoop"]
    },
    "topLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=15:260,100+260,112_260,144",
      connections : ["outerLoop_right"]
    },
    "outerLoop_top" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=15:164,120+184,120_236,120&trigger=1.5:b:sO1",
      connections : ["outerLoop_topRight","outerLoop-topLine"]
    },
    "outerLoop-topLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:236,120+240,120,252,120,252,112~252,104_252,100&trigger=1.35:b:sT0",
      connections : ["topLine"]
    },
    "outerLoop_topRight" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:236,120+240,120,252,120,260,128~260,140_260,144&trigger=1.4:b:sO2",
      connections : ["outerLoop_right"]
    },
    "outerLoop_right" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=15:260,144_260,156",
      connections : ["outerLoop_bottomRight"]
    },
    "outerLoop_bottomRight" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:260,156+260,160,260,172,252,180~240,180+236,180_224,180&trigger=1.4:b:sO3",
      connections : ["outerLoop-lowerJunction","outerLoop-lowerJunction","outerLoop_bottom"]
    },
    "outerLoop_bottom" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:224,180+216,180_172,180&trigger=1.4:b:sO4",
      connections : ["outerLoop_bottomLeft"]
    },
    "outerLoop-lowerJunction" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:224,180,212,180,204,188~204,200+204,204_204,212&trigger=1.45:b:sJ0",
      connections : ["lowerJunction-rightLine","lowerJunction-bottomLine"]
    },
    "lowerJunction-rightLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:204,212+204,216,204,228,212,236~224,236_228,236&trigger=1.5:b:sR0",
      connections : ["rightLine"]
    },
    "lowerJunction-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:196,212+196,208+196,200,196,188,188,180~176,180_172,180&trigger=1.55:b:sO4",
      connections : ["outerLoop_bottomLeft"]
    },
    "lowerJunction-bottomLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:204,212+204,216+204,224,204,236,196,244~184,244_172,244&trigger=0.45:b:sJ1|4.45:b:sJ2|13:b:sB0",
      connections : ["bottomLine"]
    },
    "bottomLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:172,244+112,244,100,244,92,236~92,224+92,220+92,180+92,124+92,120+92,124+92,140,92,164,100,156~100,180+100,220,100,232,104,236~116,236+120,236_164,236^164,236_172,236&trigger=7.5:b:sB1|13.46:b:sB2|30.46:b:sB3|38.46:b:sB4|42.55:b:sJ3",
      connections : ["bottomLine-outerLoop"]
    },
    "bottomLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:172,236+176,236,188,236,196,228~196,216_196,212",
      connections : ["lowerJunction-outerLoop"]
    },
    "rightLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:228,236+244,236+280,236,292,236,300,228~300,216+300,212+300,140+300,84+300,80+300,84+300,100,300,120,308,120~308,140+308,220,308,236,300,244~288,244+284,244_228,244&trigger=1.25:b:sR1|13.16:b:sR2|14.46:b:sR3|31.41:b:sR4|42.52:b:sR5",
      connections : ["rightLine-outerLoop","rightLine-bottomLine"]
    },
    "rightLine-outerLoop" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:228,244+216,244,204,244,196,236~196,224_196,212&trigger=1.45:b:sJ1|6.61:b:sJ3",
      connections : ["lowerJunction-outerLoop"]
    },
    "rightLine-bottomLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:228,244+224,244_172,244&trigger=1.7:b:sJ2",
      connections : ["bottomLine"]
    },
    "outerLoop_bottomLeft" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:172,180+160,180,148,180,140,172~140,160+140,156_140,144&trigger=1.45:b:sO5",
      connections : ["outerLoop_topLeft","outerLoop-leftLine"]
    },
    "outerLoop-leftLine" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:140,144+140,140,140,124!~132,116_128,112&trigger=3.35:b:sL0",
      connections : ["leftLine"]
    },
    "outerLoop_topLeft" : {
      animation : "3:transform,x;0,x|transform,y;0,y|transform,r;0,r&path=3:140,144+140,140,140,128,148,120~160,120_164,120&trigger=4.35:b:sO0",
      connections : ["outerLoop_top"]
    }
  };

  constructor() {
    this.createTracks();
  };

  createTracks() {
    for (let trackId in this.trackData) {
      let track = this.trackData[trackId];
      let newAnimation = cg.Animation.createAnimationFromPacked(track.animation,{},trackId);
      newAnimation.connections = track.connections;
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

  findNextTrack(Animator) {
    let connections = Animator.animation.connections;
    if (connections.length > 0) {
      let outSwitchIndex = Animator.animation.switchIndex;
      // Move the switch to the next direction
      if (Animator.object.isBackOfTrain) {
        Animator.animation.switchIndex++;
        if (Animator.animation.switchIndex >= connections.length) {
          Animator.animation.switchIndex = 0;
        }
      }
      Animator.animation = cg.Animation.animations[connections[outSwitchIndex]];
    }
  };

  createTrain(animation, playhead, useAltGraphic=false) {
    function createCarriage(trainId,carriageIndex,isBack) {
      let newCarriage = cg.createObject({},"train_"+trainId+"_carriage_"+carriageIndex)
      .attach("Animator",{
        animation : cg.Animation.animations[animation],
        speed : 10,
        onEnd : rwManager.findNextTrack
      })
      .attach("Graphic",{
        graphic : useAltGraphic ? cg.graphics.altTrain : cg.graphics.train
      })
      .attach("BlockController");
    
      newCarriage.BlockController.group = "train_"+trainId;
      newCarriage.transform.ay = 2;
      newCarriage.Animator.playFrom(playhead-carriageIndex*18);
      if (isBack) {
        newCarriage.isBackOfTrain = true;
      }
      cg.scenes.railways.addObject(newCarriage);
    }
    for (let i=0;i<3;i++) {
      createCarriage(this.nextTrainId,i,i==2);
    }
    this.nextTrainId++;
  };
}

rwManager.createTrain("leftLine",550);
rwManager.createTrain("leftLine",50);
rwManager.createTrain("leftLine",150);
rwManager.createTrain("leftLine",300);
rwManager.createTrain("rightLine",80);
rwManager.createTrain("rightLine",200);
rwManager.createTrain("rightLine",350);
rwManager.createTrain("bottomLine",50);
rwManager.createTrain("bottomLine",150);
rwManager.createTrain("topLine",150);
rwManager.createTrain("topLine",250);
rwManager.createTrain("topLine",400);
rwManager.createTrain("outerLoop_bottomLeft",40);

cg.settings.core.callbacks.loopAfter = ()=>{
  ChoreoGraph.transformContext(cg.canvases.railways.camera);

  // VIEW THE DRIFT ON TRAIN 1
  // cr.fillStyle = "#ffffff";
  // cr.font = "8px Arial";
  // function roundToSomeDecimals(number) {
  //   return Math.round(number*1000)/1000;
  // }
  // cr.fillText(roundToSomeDecimals(((cg.objects.train_0_carriage_0.Animator.playhead-cg.objects.train_0_carriage_1.Animator.playhead)/18)-1),20,20);
  // cr.fillText(roundToSomeDecimals(((cg.objects.train_0_carriage_1.Animator.playhead-cg.objects.train_0_carriage_0.Animator.playhead)/18)+1),20,30);
  // cr.fillText(roundToSomeDecimals(((cg.objects.train_0_carriage_2.Animator.playhead-cg.objects.train_0_carriage_0.Animator.playhead)/18)+2),20,40);
}

ChoreoGraph.start();