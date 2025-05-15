const cg = ChoreoGraph.instantiate({
  core : {
    generateBasicEnvironment : true
  },
  input : {
    preventSingleTouch : true
  },
  audio : {
    // forceMode : "HTMLAudio"
  },
  input : {
    controller : {
      emulatedCursor : {
        active : true
      }
    },
    debug : {
      active : true
    }
  }
});
cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  height : 450,
  width : 600
});

ChoreoGraph.FMOD.baseBankPath = "audio/";
ChoreoGraph.FMOD.registerBank("MasterStrings","Master.strings.bank");
ChoreoGraph.FMOD.registerBank("Master","Master.bank");
ChoreoGraph.FMOD.registerBank("Grouper","Grouper.bank");

cg.Audio.masterVolume = 0;

cg.scenes.main.createItem("collection",{},"stuff")

cg.createGraphic({type:"rectangle",width:25,height:25},"cursorRectangle")
cg.createGraphic({type:"rectangle"},"anotherOne")

cg.scenes.main.createItem("graphic",{graphic:cg.graphics.anotherOne},"another");

cg.createGraphic({type:"rectangle",colour:"blue"},"downRectangle");
cg.createGraphic({type:"rectangle",colour:"green"},"upRectangle");
cg.createGraphic({type:"rectangle",width:25,height:25,colour:"magenta"},"canvasCursorRectangle");
cg.scenes.main.createItem("graphic",{graphic:cg.graphics.downRectangle},"downRectangle","stuff");
cg.scenes.main.createItem("graphic",{graphic:cg.graphics.upRectangle},"upRectangle","stuff");
cg.scenes.main.createItem("graphic",{graphic:cg.graphics.cursorRectangle},"cursorRectangle");
// cg.scenes.main.createItem("graphic",{graphic:cg.graphics.canvasCursorRectangle},"canvasCursorRectangle");

cg.Input.createButton({type:"rectangle",CGSpace:true,x:500,y:30,width:120,down:function(){
  cg.Audio.masterVolume = cg.Audio.masterVolume==0 ? 1 : 0;
}},"toggleAudio");
cg.Input.createButton({type:"rectangle",CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:1,x:-120/2,y:-100/2,width:120},"dummy");
cg.Input.createButton({type:"circle",CGSpace:false,canvasSpaceXAnchor:0,canvasSpaceYAnchor:1,x:35,y:-35,radius:30},"plastic");
cg.Input.createButton({type:"polygon",CGSpace:true,x:-200,y:0,path:[[18,-62],[-49,-26],[-48,45],[13,65],[48,27],[30,-15]]},"grumble");

cg.Audio.createSound({source:"magneticPlane.mp3"},"magneticPlane");
cg.Audio.sounds.magneticPlane.play({allowBuffer:true,loop:true});

// cg.settings.input.callbacks.keyDown = function(key,event) {
//   console.log(key);
// }

let testAnim = cg.Animation.createAnimationFromPacked("4:transform,x;0,x|transform,y;0,y|transform,r;0,r|Graphic,graphic,width;1,v&path=15:154,369,102,315,116,202~169,157,222,112,315,91,349,141^424,309,452,363,359,383~296,356,233,329,220,271~255,234,290,197,410,154,498,196&value=,5+4!10+1,20+7!15+1,5+14!10+3,50+16!60+3,100",{},"testAnim");

cg.createObject({},"animatedObject")
.attach("Animator",{animation:testAnim,speed:300})
.attach("Graphic",{graphic:cg.createGraphic({type:"rectangle",colour:"red",height:20,width:20},"testAnimRect")})

cg.scenes.main.addObject(cg.objects.animatedObject);

let blockTestAnim = cg.Animation.createAnimationFromPacked("2:transform,x;0,x|transform,y;0,y&path=15:185,28,185,28,134,37~102,59,70,81,68,176~116,153,164,130,184,96~226,83,268,70,343,118~373,95,403,72,363,24~316,20,269,16,189,29,185,28&trigger=5.45:b:sA|18.51:b:sB|30.96:b:sC|43.77:b:sD",{},"blockTestAnim");

let simpleCircle = cg.createGraphic({type:"arc",radius:10,colour:"#88c35e"},"simpleCircle");

cg.createObject({},"blockObjectA")
.attach("Animator",{animation:blockTestAnim,playhead:0,speed:150})
.attach("Graphic",{graphic:simpleCircle})
.attach("BlockController",{group:"testGroupA"})
cg.createObject({},"blockObjectB")
.attach("Animator",{animation:blockTestAnim,playhead:20,speed:150})
.attach("Graphic",{graphic:simpleCircle})
.attach("BlockController",{group:"testGroupA"})
cg.createObject({},"blockObjectC")
.attach("Animator",{animation:blockTestAnim,playhead:40,speed:150})
.attach("Graphic",{graphic:simpleCircle})
.attach("BlockController",{group:"testGroupA"})

cg.scenes.main.addObject(cg.objects.blockObjectA);
cg.scenes.main.addObject(cg.objects.blockObjectB);
cg.scenes.main.addObject(cg.objects.blockObjectC);

for (let blockId of ["A","B","C","D"]) {
  cg.BlockController.createBlock({},blockId);
}

cg.Input.createAction({keys:["w","up","conleftup","condpadup","conrightup",cg.Input.buttons.dummy]},"forward");
cg.Input.createAction({keys:["s","down","conleftdown","condpaddown","conrightdown"]},"backward");
cg.Input.createAction({keys:["a","left","conleftleft","condpadleft","conrightleft"]},"left");
cg.Input.createAction({keys:["d","right","conrightright","condpadright","conleftright"]},"right");

cg.settings.core.callbacks.loopBefore = () => {
  cg.sceneItems.cursorRectangle.transform.x = cg.Input.cursor.x;
  cg.sceneItems.cursorRectangle.transform.y = cg.Input.cursor.y;
  if (cg.Input.lastCursorType=="controller") {
    cg.sceneItems.cursorRectangle.transform.o = 1;
  } else {
    cg.sceneItems.cursorRectangle.transform.o = 0;
  }

  // cg.sceneItems.downRectangle.transform.x = cg.Input.cursor.down.any.x;
  // cg.sceneItems.downRectangle.transform.y = cg.Input.cursor.down.any.y;

  // cg.sceneItems.upRectangle.transform.x = cg.Input.cursor.up.any.x;
  // cg.sceneItems.upRectangle.transform.y = cg.Input.cursor.up.any.y;

  // cg.sceneItems.canvasCursorRectangle.transform.x = cg.Input.cursor.canvasX;
  // cg.sceneItems.canvasCursorRectangle.transform.y = cg.Input.cursor.canvasY;
}
cg.settings.core.callbacks.loopAfter = () => {
  ChoreoGraph.transformContext(cg.canvases.main.camera);
  cg.c.strokeStyle = "white";
  cg.c.font = "20px Arial";
  cg.c.fillStyle = "white";
  // cg.c.fillText(cg.Input.lastInputType,10,50);

  cg.c.fillText(cg.objects.animatedObject.Animator.playhead.toFixed(3),10,330);

  cg.c.fillStyle = "white";
  cg.c.fillText(cg.Input.actions.forward.get().toFixed(2),40,80);
  cg.c.fillText(cg.Input.actions.backward.get().toFixed(2),40,120);
  cg.c.fillText(cg.Input.actions.left.get().toFixed(2),15,100);
  cg.c.fillText(cg.Input.actions.right.get().toFixed(2),65,100);

  let dir = cg.Input.getActionNormalisedVector("forward","backward","left","right");
  cg.c.fillText(dir[0],40,160);
  cg.c.fillText(dir[1],40,200);
  cg.sceneItems.another.transform.x += dir[0]*0.2*cg.timeDelta;
  cg.sceneItems.another.transform.y += dir[1]*0.2*cg.timeDelta;

  // cg.c.beginPath();
  // cg.c.moveTo(cg.sceneItems.downRectangle.transform.x,cg.sceneItems.downRectangle.transform.y);
  // if (cg.Input.cursor.hold.any) {
  //   cg.c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
  // } else {
  //   cg.c.lineTo(cg.sceneItems.upRectangle.transform.x,cg.sceneItems.upRectangle.transform.y);
  // }
  // cg.c.stroke();

  if (cg.Input.cursor.activeTouches.length>1) {
    for (let id of cg.Input.cursor.activeTouches) {
      cg.c.fillStyle = "cyan";
      cg.c.fillRect(cg.Input.cursor.touches[id].x-50,cg.Input.cursor.touches[id].y-50,100,100);
    }
  }

  // if (ChoreoGraph.frame%10==0) {
  //   let keys = "";
  //   for (let key of Object.keys(ChoreoGraph.Input.keyStates)) {
  //     if (ChoreoGraph.Input.keyStates[key]) {
  //       keys += key + " ";
  //     }
  //   }
  //   console.log(keys)
  // }
}

ChoreoGraph.start();