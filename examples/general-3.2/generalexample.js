const cg = ChoreoGraph.instantiate({
  core : {
    generateBasicEnvironment : true,
    baseImagePath : "images/"
  },
  input : {
    preventSingleTouch : true
  },
  audio : {
    // forceMode : "HTMLAudio"
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

// cg.Shaders.canvases.shaderCanvas.addSource({
//   source : cg.canvases.main.element,
//   fragmentShader : `
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

let testChunk0 = testTilemap.createChunk({
  x : 0,
  y : 0,
  width : 5,
  height : 5
});

testChunk0.createLayer({
  tiles : [
    0,0,0,0,0,
    0,1,1,1,null,
    0,1,0,1,0,
    0,1,1,1,0,
    0,0,0,0,1
  ]
});

let testChunk1 = testTilemap.createChunk({
  x : 5,
  y : 0,
  width : 5,
  height : 5
});

testChunk1.createLayer({
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
  tilemap : testTilemap,
},"tilemapGraphic");

cg.scenes.main.createItem("graphic",{graphic:tilemapGraphic},"tilemapGraphic");
cg.scenes.main.tree.tilemapGraphic.transform.sx = 0.5;
cg.scenes.main.tree.tilemapGraphic.transform.sy = 0.5;
cg.scenes.main.tree.tilemapGraphic.transform.x = 200;
cg.scenes.main.tree.tilemapGraphic.transform.y = 100;

cg.createGraphic({type:"lighting"},"lighting");
cg.scenes.main.createItem("graphic",{graphic:cg.graphics.lighting},"lighting");

let testLight = cg.Lighting.createLight({type:"spot"});
// testLight.transform.parent = cg.objects.animatedObject.transform;
let testOccluder = cg.Lighting.createOccluder({path:[[259,297],[175,282],[194,206],[273,157],[332,248]]});
// let testOccluder = cg.Lighting.createOccluder({path:[[432,174],[401,187],[400,224],[381,199],[406,157],[431,114],[387,99],[374,129],[337,127],[350,159],[314,161],[342,192],[366,160],[378,170],[365,189],[358,219],[363,249],[378,276],[400,267],[422,272],[439,250],[428,224],[467,267],[444,321],[368,309],[326,348],[337,287],[283,352],[338,388],[375,338],[406,342],[384,420],[361,415],[373,439],[429,432],[449,369],[485,350],[528,244],[465,229],[491,190],[435,205],[495,170],[531,177],[545,151],[504,123],[481,160],[471,121],[444,138],[447,164]]});
// let testOccluder = cg.Lighting.createOccluder({path:[[289,351],[317,301],[346,254],[414,199],[447,309],[374,309],[421,355],[397,367],[395,403],[474,403],[482,370],[520,304],[505,220],[497,178],[454,215],[494,268],[446,308],[452,349],[513,360],[562,268],[536,197],[549,153],[458,149],[411,170],[364,139],[353,210],[417,223],[337,240],[419,288],[368,318],[449,350],[372,354],[407,393],[342,394],[325,334],[395,284],[307,258],[376,348],[284,346],[395,226],[435,169],[387,160],[418,168],[391,188],[418,260],[337,267],[332,128],[322,158],[282,173],[367,238],[307,256],[254,316],[279,225],[313,187],[278,160],[356,135],[430,120],[487,192],[538,128],[444,90],[396,91],[483,127],[553,216],[546,270],[597,342],[610,420],[446,443],[483,434],[576,417],[531,367],[534,377],[435,364],[522,422],[497,393],[505,386],[540,396],[563,351],[537,325],[492,340],[436,346],[404,255],[394,214],[384,269],[449,349],[410,370],[371,374],[376,409],[333,413],[295,382],[253,374],[235,342],[311,332],[257,344],[325,349],[294,275],[337,254],[269,278],[229,285],[245,226],[235,177],[267,191],[222,233],[299,158],[280,138],[316,161],[385,214],[372,155],[417,113],[392,89],[451,75],[469,65],[571,71],[608,90],[614,113],[631,149],[614,184],[645,228],[636,264],[644,288],[660,315],[640,347],[659,388],[614,398],[593,329],[576,275],[573,247],[603,223],[597,183],[584,147],[539,88],[510,84],[504,156],[483,209],[460,231],[473,264],[479,288],[529,310],[461,325],[449,284],[379,285],[369,324],[342,335],[307,280],[352,233],[314,221],[295,239],[293,268],[278,296],[247,255],[316,208],[453,203],[501,285],[522,309],[564,242],[536,224],[605,190],[596,135],[568,98],[485,89],[571,146],[559,154],[546,182],[576,222],[613,253],[608,272],[607,288],[616,312],[631,327],[620,341],[613,366],[580,352],[582,313],[566,298],[557,341],[462,346],[415,291],[507,227],[447,187],[432,119],[372,111],[373,154],[353,92],[331,113],[295,133],[346,101],[299,153],[306,180],[281,212],[251,237],[258,151],[378,130],[482,87],[453,79],[586,85],[572,150],[491,153],[580,224],[572,242],[543,279],[594,315],[633,206],[566,111],[645,89],[618,58],[552,85],[476,42],[461,50],[488,201],[456,56],[460,58],[375,193],[345,208],[472,128],[477,43],[461,214],[396,238],[436,316],[518,242],[514,237],[557,342],[527,368],[465,420],[400,417],[389,422],[375,399],[310,339],[383,261],[289,254],[335,362],[336,396],[384,428],[341,426],[262,316],[372,279],[302,217],[426,269],[477,367],[503,391],[544,355],[538,336],[572,416],[591,343],[581,333],[609,415],[302,100],[262,170],[228,237],[241,274],[248,325],[250,352],[288,392],[307,448],[595,101],[604,120],[617,177],[591,218],[670,267],[614,296],[625,316]]});
// let testOccluder = cg.Lighting.createOccluder({path:[[202,371],[202,371],[490,346],[199,326],[522,320],[522,327],[522,341],[521,353],[521,369]]});

cg.settings.core.callbacks.loopBefore = () => {
  cg.sceneItems.cursorRectangle.transform.x = cg.Input.cursor.x;
  cg.sceneItems.cursorRectangle.transform.y = cg.Input.cursor.y;
  if (cg.Input.lastCursorType=="controller") {
    cg.sceneItems.cursorRectangle.transform.o = 1;
  } else {
    cg.sceneItems.cursorRectangle.transform.o = 0;
  }

  testLight.transform.x = cg.Input.cursor.x;
  testLight.transform.y = cg.Input.cursor.y;

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
  // cg.sceneItems.another.transform.x += dir[0]*0.2*cg.timeDelta;
  // cg.sceneItems.another.transform.y += dir[1]*0.2*cg.timeDelta;

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