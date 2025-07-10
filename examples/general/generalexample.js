const cg = ChoreoGraph.instantiate({
  core : {
    generateBasicEnvironment : true,
    baseImagePath : "images/",
    areaTextDebug : true
  },
  input : {
    preventSingleTouch : true
  },
  audio : {
    // forceMode : "HTMLAudio",
    baseAudioPath : "audio/",
  },
  input : {
    preventDefaultKeys : ["space","up","down"],
    controller : {
      emulatedCursor : {
        active : true
      }
    },
    debug : {
      active : true
    }
  },
  shaders : {
    debug : true
  },
  tilemaps : {
    // appendCanvases : true
  }
});
cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  height : 450,
  width : 600
});

// cg.Shaders.createCanvas({element:document.getElementsByTagName("canvas")[1],
//   height : 450,
//   width : 600,
//   clearColor : {r:0,g:0,b:0,a:1}
// },"shaderCanvas");

// cg.Shaders.shaderCanvases.shaderCanvas.addSource({
//   source : cg.canvases.main.element,
//   fragmentShaderCode : `
//     precision mediump float;

//     varying vec2 texCoords;
//     uniform sampler2D textureSampler;

//     void main() {
//       vec4 color = texture2D(textureSampler, texCoords);

//       // Invert Colours
//       color.r = 1.0 - color.r;
//       color.g = 1.0 - color.g;
//       color.b = 1.0 - color.b;

//       gl_FragColor = color;
//     }
//   `
// });

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

cg.Input.createButton({type:"rectangle",transformInit:{CGSpace:true,x:500,y:30},width:120,down:function(){
  cg.Audio.masterVolume = cg.Audio.masterVolume==0 ? 1 : 0;
}},"toggleAudio");
cg.Input.createButton({type:"rectangle",transformInit:{CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:1,x:-120/2,y:-100/2},width:120},"dummy");
cg.Input.createButton({type:"circle",transformInit:{CGSpace:false,canvasSpaceXAnchor:0,canvasSpaceYAnchor:1,x:35,y:-35},radius:30},"plastic");
cg.Input.createButton({type:"polygon",transformInit:{CGSpace:true,x:-200,y:0},path:[[18,-62],[-49,-26],[-48,45],[13,65],[48,27],[30,-15]]},"grumble");

cg.Audio.createSound({source:"magneticPlane.mp3"},"magneticPlane");
cg.Audio.sounds.magneticPlane.play({allowBuffer:true,loop:true});

// cg.settings.input.callbacks.keyDown = function(key,event) {
//   console.log(key);
// }

let testAnim = cg.Animation.createAnimationFromPacked("4:transform,x;0,x|transform,y;0,y|transform,r;0,r|Graphic,graphic,width;1,v&path=15:154,369,102,315,116,202~169,157,222,112,315,91,349,141^424,309,452,363,359,383~296,356,233,329,220,271~255,234,290,197,410,154,498,196&value=,5+4!10+1,20+7!15+1,5+14!10+3,50+16!60+3,100",{},"testAnim");

cg.createObject({},"animatedObject")
.attach("Animator",{animation:testAnim,speed:50})
.attach("Graphic",{graphic:cg.createGraphic({type:"rectangle",colour:"red",height:20,width:20},"testAnimRect"),collection:"stuff"})

cg.scenes.main.addObject(cg.objects.animatedObject);

let blockTestAnim = cg.Animation.createAnimationFromPacked("2:transform,x;0,x|transform,y;0,y&path=15:185,28,185,28,134,37~102,59,70,81,68,176~116,153,164,130,184,96~226,83,268,70,343,118~373,95,403,72,363,24~316,20,269,16,189,29,185,28&trigger=5.35:b:sA|23.7:b:sB|30.96:b:sC|43.77:b:sD",{},"blockTestAnim");

cg.settings.blockcontroller.debug.animations.push("D",blockTestAnim);

let simpleCircle = cg.createGraphic({type:"arc",radius:10,colour:"#88c35e"},"simpleCircle");

cg.scenes.main.addObject(cg.createObject({},"blockObjectA")
.attach("Animator",{animation:blockTestAnim,playhead:0,speed:150})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"testGroupC"}));

cg.scenes.main.addObject(cg.createObject({},"blockObjectB")
.attach("Animator",{animation:blockTestAnim,playhead:60,speed:150})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"testGroupB"}));

cg.scenes.main.addObject(cg.createObject({},"blockObjectC")
.attach("Animator",{animation:blockTestAnim,playhead:160,speed:150})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"testGroupA"}));

cg.scenes.main.addObject(cg.createObject({},"blockObjectD")
.attach("Animator",{animation:blockTestAnim,playhead:140,speed:150})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"testGroupA"}));

for (let blockId of ["A","B","C","D"]) {
  cg.BlockController.createBlock({},blockId);
}

let generatedData = [];
for (let i=0;i<50;i++) {
  let startX = 35;
  let startY = 415;
  let gap = 10;
  let x = startX + i*gap;
  let y = startY;
  let time = Number(i!=0);
  generatedData.push([x,y,time]);
}

generatedData.splice(10,0,["b","L"]);
generatedData.splice(20,0,["b","K"]);
generatedData.splice(30,0,["b","P"]);

for (let blockId of ["K","P","L"]) {
  cg.BlockController.createBlock({},blockId);
}

let simplifiedBlockAnim = cg.Animation.createAnimation({},"simplifiedBlockAnim").loadRaw(generatedData,[
  {keySet:["transform","x"]},
  {keySet:["transform","y"]},
  {keySet:"time"}
]);

cg.settings.blockcontroller.debug.animations.push("P",simplifiedBlockAnim);

cg.scenes.main.addObject(cg.createObject({},"GA_0")
.attach("Animator",{animation:simplifiedBlockAnim,playhead:2,speed:3})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"blockGroupA"}));

cg.scenes.main.addObject(cg.createObject({},"GA_1")
.attach("Animator",{animation:simplifiedBlockAnim,playhead:0,speed:3})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"blockGroupA"}));

cg.scenes.main.addObject(cg.createObject({},"GB_0")
.attach("Animator",{animation:simplifiedBlockAnim,playhead:24,speed:3})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"blockGroupB"}));

cg.scenes.main.addObject(cg.createObject({},"GB_1")
.attach("Animator",{animation:simplifiedBlockAnim,playhead:20,speed:3})
.attach("Graphic",{graphic:simpleCircle,collection:"stuff"})
.attach("BlockController",{group:"blockGroupB"}));

cg.createPath([[100,200],[400,350]],"pathId");

cg.Input.createAction({keys:["w","up","conleftup","condpadup","conrightup",cg.Input.buttons.dummy]},"forward");
cg.Input.createAction({keys:["s","down","conleftdown","condpaddown","conrightdown"]},"backward");
cg.Input.createAction({keys:["a","left","conleftleft","condpadleft","conrightleft"]},"left");
cg.Input.createAction({keys:["d","right","conrightright","condpadright","conleftright"]},"right");

cg.Input.createAction({keys:["i"]},"secondaryForward");
cg.Input.createAction({keys:["k"]},"secondaryBackward");
cg.Input.createAction({keys:["j"]},"secondaryLeft");
cg.Input.createAction({keys:["l"]},"secondaryRight");

cg.createImage({
  file : "waveyTiles.png"
},"waveyTiles")

cg.Tilemaps.createTile({
  image : cg.images.waveyTiles,
  imageX : 0,
  imageY : 0,
  width : 100,
  height : 100
},0);

cg.Tilemaps.createTile({
  image : cg.images.waveyTiles,
  imageX : 100,
  imageY : 0,
  width : 100,
  height : 100
},1);

let testTilemap = cg.Tilemaps.createTilemap({
  tileHeight : 100,
  tileWidth : 100
},"testTilemap");

testTilemap.createLayer({
  name : "theLayer"
})

testTilemap.createChunk({
  x : 0,
  y : 0,
  width : 5,
  height : 5
}).createLayer({
  tiles : [
    0,0,0,0,0,
    0,1,1,1,null,
    0,1,0,1,0,
    0,1,1,1,0,
    0,0,0,0,1
  ]
});

testTilemap.createChunk({
  x : 5,
  y : 0,
  width : 5,
  height : 5
}).createLayer({
  tiles : [
    1,1,1,1,1,
    1,0,0,0,0,
    1,0,0,0,0,
    1,0,1,0,0,
    1,null,null,null,0
  ]
});

let tilemapGraphic = cg.createGraphic({
  type : "tilemap",
  tilemap : testTilemap
},"tilemapGraphic");

cg.scenes.main.createItem("graphic",{graphic:tilemapGraphic},"tilemapGraphic");
cg.scenes.main.tree.tilemapGraphic.transform.sx = 0.5;
cg.scenes.main.tree.tilemapGraphic.transform.sy = 0.5;
cg.scenes.main.tree.tilemapGraphic.transform.x = 200;
cg.scenes.main.tree.tilemapGraphic.transform.y = 100;

let shaderGraphic = cg.createGraphic({type:"shader",width:250,height:250,drawCallback:function(gl,graphic){
  gl.uniform1f(graphic.timeLocation, cg.clock/1000);
}},"shader")
.createShader(`
  precision mediump float;

  attribute vec2 position;
  varying vec2 texCoords;

  void main() {
    texCoords = (position + 1.0) / 2.0;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`,
`
  precision mediump float;

  uniform float time;
  varying vec2 texCoords;

  void main() {
    float red = sin(texCoords.x * 3.14 + time) * 0.5 + 0.5;
    float green = sin(texCoords.y * 3.14 + time) * 0.2 + 0.5;
    float alpha = 1.0;

    float disFromCentre = length(texCoords - vec2(0.5, 0.5));

    if (disFromCentre < 0.2 || disFromCentre > 0.4) {
      alpha = 0.0;
    }

    vec3 colour = vec3(red, green, 0.5);

    gl_FragColor = vec4(colour * alpha, alpha);
  }
`,function(gl,graphic){
  graphic.timeLocation = gl.getUniformLocation(graphic.program, "time");
});

cg.scenes.main.createItem("graphic",{graphic:shaderGraphic,transform:cg.createTransform({x:200,y:200})},"shaderGraphic");

cg.Physics.createCollider({type:"rectangle",transformInit:{x:500,y:60}},"rectCollider");
// cg.Physics.createCollider({type:"rectangle",static:true,transformInit:{x:500,y:60}},"rectCollider");
cg.Physics.createCollider({type:"circle",transformInit:{x:500,y:200}},"circleCollider");
cg.Physics.createCollider({type:"circle",trigger:true,transformInit:{x:301,y:300}},"circleCollider");
// cg.Physics.createCollider({type:"circle",transformInit:{x:502,y:200}},"circleCollider");
// cg.Physics.createCollider({type:"circle",transformInit:{x:503,y:200}},"circleCollider");
// cg.Physics.createCollider({type:"point",transformInit:{x:503,y:200}},"circleCollider");
cg.Physics.createCollider({type:"raycast",dx:100,dy:50,transformInit:{x:203,y:200}},"raycastCollider");

cg.settings.core.callbacks.loopBefore = () => {
  cg.scenes.main.items.cursorRectangle.transform.x = cg.Input.cursor.x;
  cg.scenes.main.items.cursorRectangle.transform.y = cg.Input.cursor.y;
  if (cg.Input.lastCursorType=="controller") {
    cg.scenes.main.items.cursorRectangle.transform.o = 1;
  } else {
    cg.scenes.main.items.cursorRectangle.transform.o = 0;
  }

  // cg.scenes.main.items.downRectangle.transform.x = cg.Input.cursor.down.any.x;
  // cg.scenes.main.items.downRectangle.transform.y = cg.Input.cursor.down.any.y;

  // cg.scenes.main.items.upRectangle.transform.x = cg.Input.cursor.up.any.x;
  // cg.scenes.main.items.upRectangle.transform.y = cg.Input.cursor.up.any.y;

  // cg.scenes.main.items.canvasCursorRectangle.transform.x = cg.Input.cursor.canvasX;
  // cg.scenes.main.items.canvasCursorRectangle.transform.y = cg.Input.cursor.canvasY;

  if (ChoreoGraph.Input.keyStates.g) {
    cg.Physics.colliders.rectCollider.transform.x = cg.Input.cursor.x;
    cg.Physics.colliders.rectCollider.transform.y = cg.Input.cursor.y;
  }
}

cg.createGraphic({
  type:"areaText",
  text:"This area text is in a graphic which saves data about it so it doesnt need to recalibrate every single frame",
  maxWidth:150,
  minWidth:100,
  textAlign:"center"
},"areaText");

cg.scenes.main.createItem("graphic",{
  graphic:cg.graphics.areaText,
  transformInit:{x:-100,y:250},
},"areaTextItem");

cg.settings.core.callbacks.loopAfter = () => {
  ChoreoGraph.transformContext(cg.canvases.main.camera);
  cg.c.strokeStyle = "white";
  cg.c.font = "20px Arial";
  cg.c.fillStyle = "white";
  cg.c.textAlign = "left";
  // cg.c.fillText(cg.Input.lastInputType,10,50);

  // cg.c.fillText(cg.objects.animatedObject.Animator.playhead.toFixed(3),10,330);

  // cg.c.fillStyle = "white";
  // cg.c.fillText(cg.Input.actions.forward.get().toFixed(2),40,80);
  // cg.c.fillText(cg.Input.actions.backward.get().toFixed(2),40,120);
  // cg.c.fillText(cg.Input.actions.left.get().toFixed(2),15,100);
  // cg.c.fillText(cg.Input.actions.right.get().toFixed(2),65,100);

  // cg.c.fillText(cg.objects.GA_0.Animator.playhead-cg.objects.GA_1.Animator.playhead,10,370);

  // let dir = cg.Input.getActionNormalisedVector("forward","backward","left","right");
  // cg.c.fillText(dir[0],40,160);
  // cg.c.fillText(dir[1],40,200);
  // cg.scenes.main.items.another.transform.x += dir[0]*0.2*cg.timeDelta;
  // cg.scenes.main.items.another.transform.y += dir[1]*0.2*cg.timeDelta;

  dir = cg.Input.getActionNormalisedVector("secondaryForward","secondaryBackward","secondaryLeft","secondaryRight");
  cg.cameras.main.transform.x += dir[0]*0.4*cg.timeDelta;
  cg.cameras.main.transform.y += dir[1]*0.4*cg.timeDelta;

  // cg.c.resetTransform();
  // let transX = cg.canvases.main.camera.getCanvasSpaceX(cg.Input.cursor.x);
  // let transY = cg.canvases.main.camera.getCanvasSpaceY(cg.Input.cursor.y);
  // cg.c.fillStyle = "green";
  // cg.c.fillRect(transX,transY,100,100);
  // cg.c.fillStyle = "white";
  // cg.c.font = "15px Arial";
  // cg.c.fillText(cg.Input.cursor.x.toFixed(0),transX+10,transY+15);
  // cg.c.fillText(cg.Input.cursor.y.toFixed(0),transX+10,transY+30);
  // cg.c.fillText(cg.Input.cursor.canvasX.toFixed(0),transX+10,transY+45);
  // cg.c.fillText(cg.Input.cursor.canvasY.toFixed(0),transX+10,transY+60);
  // cg.c.fillText(transX.toFixed(0),transX+10,transY+75);
  // cg.c.fillText(transY.toFixed(0),transX+10,transY+90);

  // transX = cg.canvases.main.camera.getCanvasSpaceX(0);
  // transY = cg.canvases.main.camera.getCanvasSpaceY(0);
  // cg.c.fillStyle = "cyan";
  // cg.c.fillRect(transX,transY,10,10);

  // ChoreoGraph.transformContext(cg.canvases.main.camera);
  // transX = cg.canvases.main.camera.getCGSpaceX(100);
  // transY = cg.canvases.main.camera.getCGSpaceY(100);
  // cg.c.fillStyle = "black";
  // cg.c.fillRect(transX,transY,10,10);

  // cg.canvas.drawImage(cg.images.waveyTiles,100,100,600,100,cg.clock%(360*10)/10,300,0,true,false)

  // cg.c.beginPath();
  // cg.c.moveTo(cg.scenes.main.items.downRectangle.transform.x,cg.scenes.main.items.downRectangle.transform.y);
  // if (cg.Input.cursor.hold.any) {
  //   cg.c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
  // } else {
  //   cg.c.lineTo(cg.scenes.main.items.upRectangle.transform.x,cg.scenes.main.items.upRectangle.transform.y);
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

  cg.canvas.c.resetTransform();
  const minWidth = 100;
  const maxWidth = 150;
  const text = "You can do area text like this now! Which is pretty neat if I dooooooo say so my seeeeelllllllfffffff";
  let options = new ChoreoGraph.AreaTextOptions(text,cg.canvas.c,{
    minWidth : minWidth,
    maxWidth : maxWidth,
    textAlign : "center",
    area : "middle",
    colour : "#0d559d",
    fontWeight : "bold"
  });
  cg.canvas.drawAreaText(text,500,370,options);
}

ChoreoGraph.start();