var cg0 = ChoreoGraph.instantiate(document.getElementsByTagName("canvas")[0],{
  // size : [1100,700],
  parentElementId : "full",
  levels : 5,
  canvasSpaceScale : 2,
  useCamera : true,
  animation : {
    consistentSpeedDefault : false,
    autoFacingDefault : true,
    persistentValuesDefault : true
  },
  preventDefault : ["space","mouseWheel"]
});
var cg1 = ChoreoGraph.instantiate(document.getElementsByTagName("canvas")[1],{
  background : "#2f605f",
  size : [1100,400]
});

// for (let i=0;i<1000;i++) {
//   let cnvs = document.createElement("canvas");
//   document.getElementById("more").appendChild(cnvs);
//   ChoreoGraph.instantiate(cnvs,{"size":[10,10]});
// }

let backgroundImage = cg0.createImage({
  "id" : "background",
  "file":"background.png"
});

cg0.settings.static_levels = [[cg0.createGraphic({type:"image",image:backgroundImage,"x":300,"y":550,"r":10,width:900,height:700})]];

let c0 = cg0.c;
let c1 = cg1.c;

// ANIMATIONS
let ImageIconA = cg0.createImage({
  "id" : "iconA",
  "file":"iconA.png"
});
let GraphicIconA = cg0.createGraphic({type:"image",image:ImageIconA,width:50,height:50});

let ImageIconB = cg0.createImage({
  "id" : "iconB",
  "file":"iconB.png"
});
let GraphicIconB = cg0.createGraphic({type:"image",image:ImageIconB,width:50,height:50});

let ImageIconC = cg0.createImage({
  "id" : "iconC",
  "file":"iconC.png"
});
let GraphicIconC = cg0.createGraphic({type:"image",image:ImageIconC,width:50,height:50});

let jttsoteTileSheet = cg0.createImage({
  "id" : "jttsoteTileSheet",
  "file":"jttsote.png"
});

for (let i=0;i<10;i++) {
  let topLeft = [64,0];
  let size = [16,16];
  let x = Math.floor(i/5);
  let y = i%5;
  let newImage = cg0.createImage({
    id : "redMushroom" + i,
    file :"jttsote.png",
    crop : [topLeft[0]+size[0]*x,topLeft[1]+size[1]*y,size[0],size[1]]
  });
  cg0.createGraphic({type:"image",id : "redMushroom" + i,image:newImage,width:100,height:100,imageSmoothingEnabled:false});
}

let RedMushroomAnim = cg0.createGraphicAnimation({
  frames : ["redMushroom0","redMushroom1","redMushroom2","redMushroom3","redMushroom4","redMushroom5","redMushroom6","redMushroom7","redMushroom8","redMushroom9"],
  GraphicKey : ["Graphic","graphic"],
  frameRate : 16
});

let AnimBlockTestA = cg0.createAnimation({
  data : [[110,657,275.19],["s",50],[89,658],[78,650],["b",0],[68,642],[62,627],[60,615],[60,599],[65,584],["b",1],[77,569],[92,561],[102,546],[104,532],[99,521],[88,513],[78,513],["b",2],[71,508],[65,486],[65,475],[69,436],[83,407],[114,392],[156,392],[195,411],[213,443],["b",3],[216,471],[206,500],[191,518],[177,543],[182,576],[195,587],[218,588],[231,575],[248,548],[253,525]],
  keys : [["Transform","x"],["Transform","y"],["Transform","r"],"time"],
  autoFacing : true,
  consistentSpeed : true
});
let AnimBlockTestB = cg0.createAnimation({
  data : [[253,525,12.26],["s",50],[257,504],[262,480],[268,462],[283,443],[304,437],["b",4],[322,445],[327,480],[318,507],[309,532],[298,560],[294,574],[287,592],[279,603],["b",5],[275,619],[264,648],[253,659],[232,662],[209,662],[197,661],[191,657],[182,641],[176,638],[163,638],[149,646],[144,650],[142,651],[132,656],["b",6],[121,658],[110,657]],
  keys : [["Transform","x"],["Transform","y"],["Transform","r"],"time"],
  autoFacing : true,
  consistentSpeed : true
});
AnimBlockTestA.endCallback = function(object,Animator) { Animator.anim = AnimBlockTestB; }
AnimBlockTestB.endCallback = function(object,Animator) { Animator.anim = AnimBlockTestA; }
cg0.createBlock({id:0});cg0.createBlock({id:1});cg0.createBlock({id:2});cg0.createBlock({id:3});cg0.createBlock({id:4});cg0.createBlock({id:5});cg0.createBlock({id:6});

ChoreoGraph.plugins.Visualisation.v.blocks.animations[cg0.id] = [AnimBlockTestA,AnimBlockTestB];

let AnimSpirals = cg0.createAnimation({
  data : [[490,565,,100],["s",400],[483,564],[479,558],[481,545],[485,542],[490,538],[503,538],[508,544],[509,554],[507,565],[500,575],[491,578],[482,579],[474,577],[466,569],[458,554],[458,543],[459,531],[472,518],[487,512],[508,514],[521,525],[529,540],[529,560],[524,577],[513,590],[497,599],[483,599],[460,593],[446,577],[440,559],[439,539],[444,519],[459,500],[479,491],[514,492],[536,505],[547,523],[551,540],[550,573],[540,594],[533,602],[520,612],[496,616],[480,615],[464,610],[450,602],[440,593],[433,579],[430,567],[427,550],[426,539],[423,531],[417,524],[407,521],[397,520],[385,521],[376,525],[371,530],[368,540],[367,553],[367,565],[371,574],[378,586],[382,593],[391,601],[400,608],[415,615],[427,620],[444,626],[459,629],[489,635],[507,637],[519,635],[532,630],[544,625],[556,614],[563,599],[568,586],[572,567],[572,553],[572,540],[575,525],[581,516],[591,508],[609,505],[630,504],[648,510],[665,518],[676,530],[684,546],[685,564],[680,585],[670,603],[661,612],[644,619],[624,624],[607,619],[599,612],[592,601],[588,582],[588,564],[588,550],[594,537],[601,527],[613,521],[626,521],[641,524],[664,537],[669,549],[670,566],[664,580],[656,593],[642,600],[625,600],[613,588],[610,579],[610,562],[613,554],[620,549],[629,547],[646,551],[651,559],[653,568],[648,577],[641,583],[632,584],[628,581],[621,573],[621,567],[623,562],[631,558],[639,560],[641,564],[641,571],[639,573],[634,573],[628,572]],
  keys : [["Transform","x"],["Transform","y"],["Transform","r"],"time"],
  autoFacing : true,
  consistentSpeed : true
});

let AnimCircle = cg0.createAnimation({
  data : [[438,293,-90],["s",70],[420.59,295.2],[404.28,301.66],[390.08,311.97],[378.9,325.49],[371.43,341.37],[368.14,358.6],[369.24,376.12],[374.66,392.8],[384.06,407.62],[396.86,419.63],[412.23,428.08],[429.23,432.45],[446.77,432.45],[463.77,428.08],[479.14,419.63],[491.94,407.62],[501.34,392.8],[506.76,376.12],[507.86,358.6],[504.57,341.37],[497.1,325.49],[485.92,311.97],[471.72,301.66],[455.41,295.2],[438,293,-90]],
  keys : [["Transform","x"],["Transform","y"],["Transform","r"],"time"],
  autoFacing : true,
  consistentSpeed : true
});

let RedMushroom = cg0.createObject({"id":"RedMushroom",x:370,y:650})
.attach("Graphic",{level:1,graphic:cg0.graphics.redMushroom0,master:true})
.attach("Animator",{anim:RedMushroomAnim});

let IconObjectAA = cg0.createObject({"id":"IconObjectAA"})
.attach("Animator",{anim:AnimBlockTestA})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconA)})
.attach("BlockController");

let IconObjectAB = cg0.createObject({"id":"IconObjectAB"})
.attach("Animator",{anim:AnimBlockTestA})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconA)})
.attach("BlockController");

let IconObjectBA = cg0.createObject({"id":"IconObjectBA"})
.attach("Animator",{anim:AnimBlockTestA})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconB)})
.attach("BlockController");

let IconObjectBB = cg0.createObject({"id":"IconObjectBB"})
.attach("Animator",{anim:AnimBlockTestB})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconB)})
.attach("BlockController");

let IconObjectBC = cg0.createObject({"id":"IconObjectBC",x:370,y:123})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconB)})
// .attach("RigidBody");

let IconObjectCA = cg0.createObject({"id":"IconObjectCA"})
.attach("Animator",{anim:AnimBlockTestB})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconC)})
.attach("BlockController");

let IconObjectCB = cg0.createObject({"id":"IconObjectCB"})
.attach("Animator",{anim:AnimBlockTestB})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconC)})
.attach("BlockController");

let IconObjectCC = cg0.createObject({"id":"IconObjectCC"})
.attach("Animator",{anim:AnimSpirals})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconC)});

let FMODListnerObject = cg0.createObject({"id":"FMODListnerObject"})
.attach("Graphic",{level:1,graphic:cg0.createGraphic({type:"pointText",colour:"#ffffff",text:"LISTENER",textAlign:"center",textBaseline:"middle",font:"15px Arial"})})
.attach("FMODListener");

let FMODSourceObject = cg0.createObject({"id":"FMODSourceObject"})
.attach("Graphic",{level:1,graphic:cg0.createGraphic({type:"pointText",colour:"#ffffff",text:"MOWER SOURCE",textAlign:"center",textBaseline:"middle",font:"15px Arial"})});

let CompositeObject = cg0.createObject({"id":"CompositeObject"})
.attach("Animator",{anim:AnimCircle})
.attach("Graphic",{level:1,graphic:cg0.createGraphic(GraphicIconC)})
.attach("Graphic",{level:2,graphic:cg0.createGraphic({type:"arc",radius:20,colour:"#ffffff",fill:true,oay:25,end:Math.PI,or:90})})
.attach("Graphic",{level:2,graphic:cg0.createGraphic({type:"arc",radius:20,colour:"#ffffff",fill:true,oay:25,end:Math.PI,or:270})})
.attach("Camera");

let circle = cg0.createGraphic({type:"arc",radius:10,colour:"#ffffff",fill:true});

cg0.settings.callbacks.keyDown = function(key) {
  if (key=="space") {
    dotSequence.run();
  } else if (key=="l") {
    lightingGraphic.o = !lightingGraphic.o;
  } else if (key=="u") {
    RedMushroom.RigidBody.yv = -1000;
  } else if (key=="h") {
    for (let i=0;i<10;i++) { cg0.graphics["redMushroom" + i].flipX = true; }
  } else if (key=="k") {
    for (let i=0;i<10;i++) { cg0.graphics["redMushroom" + i].flipX = false; }
  }
}

cg0.settings.callbacks.keyUp = function(key) {
  if (key=="t") {
    console.log("I like marble runs.")
  }
}

let dotSequence = cg0.createSequence({id:"dotSequence",data:["dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot",0.05,"dot","con",1,"dot"],
  callbacks : {
    "dot" : function(tracker) {
      runDot();
    },
    "con" : function(tracker) { console.log("BEANS"); }
  }
});

function runDot() {
  let tempAnimObject = cg0.createObject()
  .attach("Animator",{level:2,selfDestructAnimation:true,selfDestructObject:true,anim:cg0.createAnimation({
    data : [[329,388],["s",50],[317,376],[312,368],[308,356],[303,340],[296,329],[288,322],[279,316],[270,316],[258,322],[250,338],[249,349],[249,358],[246,368],[236,371],[227,369],[221,358],[218,348],[215,338],[206,330],[196,325],[181,322],[168,322]],
    keys : [["Transform","x"],["Transform","y"],"time"],
    consistentSpeed : true
  })})
  .attach("Graphic",{level:2,deleteGraphicOnCollapse:true,graphic:cg0.createGraphic(circle)});
}

cg0.settings.callbacks.resume = runDot;

// BUTTONS
let pauseButton = cg0.createButton({x:-70,y:-60,width:100,height:80,id:"pause",check:"unpaused",CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:1});
pauseButton.down = function() {
  cg0.pause();
}
let unpauseButton = cg0.createButton({x:-70,y:-80,width:100,height:80,id:"unpause",check:"paused",CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:1});
unpauseButton.down = function() {
  cg0.unpause();
}
let muteButton = cg0.createButton({x:180,y:60,width:100,height:80,id:"mute",check:"unmuted"});
muteButton.down = function() {
  ChoreoGraph.AudioController.masterVolume = 0;
}
let unmuteButton = cg0.createButton({x:180,y:80,width:100,height:80,id:"unmute",check:"muted"});
unmuteButton.down = function() {
  ChoreoGraph.AudioController.masterVolume = 1;
}
let zoomOutButton = cg0.createButton({x:420,y:70,width:100,height:100,id:"zoomOut",check:null});
zoomOutButton.down = function() {
  zoom(0.1);
}
let zoomInButton = cg0.createButton({x:540,y:70,width:100,height:100,id:"zoomIn",check:null});
zoomInButton.down = function() {
  zoom(-0.1);
}
function zoom(magnitude) {
  let scrollSpeed = 1/2;
  if (magnitude<0) { cg0.z*=1+Math.abs(magnitude)/scrollSpeed; } else { cg0.z*=1-Math.abs(magnitude)/scrollSpeed; }
}
cg0.settings.callbacks.wheel = function(event) {
  // if (ChoreoGraph.Input.keyStates["shift"]) {
  //   if (event.deltaY<0) {
  //     zoom(-0.1);
  //   } else {
  //     zoom(0.1);
  //   }
  // }
}
let offsetButton = cg0.createButton({x:300,y:70,width:100,height:100,id:"offset",check:null});
let offsetting = false;
let lastOffset = [0,0];
offsetButton.down = function() {
  offsetting = true;
  lastOffset = [cg0.x,cg0.y];
}
let polygonButton = cg0.createButton({type:"polygon",path:[[-24,-49],[-63,-34],[-66,8],[-18,58],[17,40],[52,48],[68,0],[35,-28],[8,-53]],x:757,y:130,id:"polygon",check:null});
polygonButton.down = function() {
  console.log("Polygon button!")
}

cg0.settings.callbacks.cursorDown = function() {
  // if (ChoreoGraph.Input.keyStates["shift"]) {
  //   offsetting = true;
  //   lastOffset = [cg0.x,cg0.y];
  // }
}

cg0.settings.callbacks.cursorUp = function() {
  offsetting = false;
}

cg0.settings.callbacks.cursorMove = function() {
  if (offsetting) {
    cg0.x = lastOffset[0] + (ChoreoGraph.Input.cursor.x - ChoreoGraph.Input.cursor.down.any[0])*(1/cg0.z);
    cg0.y = lastOffset[1] + (ChoreoGraph.Input.cursor.y - ChoreoGraph.Input.cursor.down.any[1])*(1/cg0.z);
  }
}

cg0.settings.callbacks.updateButtonChecks = function(cg) {
  return {
    "paused" : cg.paused,
    "unpaused" : !cg.paused,
    "muted" : ChoreoGraph.AudioController.masterVolume==0,
    "unmuted" : ChoreoGraph.AudioController.masterVolume!=0,
    "fmod" : ChoreoGraph.plugins.FMODConnector.f.ready,
    "switchy" : cg.clock%2000>1000
  }
}
let topRightBackground = cg0.createGraphic({type:"rectangle",x:-50,r:0,width:100,height:130,colour:"#000000",CGSpace:false,canvasSpaceXAnchor:1,canvasSpaceYAnchor:0});
let clockText = cg0.createGraphic({type:"pointText",CGSpace:false,x:-50,y:36,canvasSpaceXAnchor:1,canvasSpaceYAnchor:0,colour:"#ffffff",text:"",textAlign:"center",font:"15px Arial"});

let pressSpaceText = cg0.createGraphic({type:"pointText",x:260,y:390,colour:"#ffffff",text:"Press Space",textAlign:"center",font:"15px Arial"});
cg0.settings.callbacks.loopBefore = function(cg) {
  clockText.text = cg0.clock;
  cg.addToLevel(4,topRightBackground);
  cg.addToLevel(4,clockText);
  cg.addToLevel(2,pressSpaceText);
  cg0.preventDefaultMouse[3] = ChoreoGraph.Input.hoveredCGActive&&ChoreoGraph.Input.keyStates["shift"];
  if (jttsoteTileMap!=undefined) {
    cg.addToLevel(0,jttsoteTileMap);
  }
  cg.addToLevel(3,lightingGraphic)
}
let areaTextHiddenGraphic = cg0.createGraphic({"type":"areaText",width:250,textAlign:"center",colour:"#000000","text":":o you found me, far off in the void of content. Hellooooooo",x:-2000,y:1200});

let areaTextGraphic = cg0.createGraphic({"type":"areaText",width:250,textAlign:"center",colour:"#000000","text":"SPACE - Dot\nT - Console Log (up)\nL - Light Switch\nC - Move Collider\nO - Move FMOD Listner\nP - Move FMOD Source",x:922,y:557});

let getObjectText = cg0.createGraphic({"type":"pointText",font:"15px Arial",textAlign:"center",x:106,y:230,colour:"#ffffff","text":"Point text!"});

let loopEvent = cg0.createEvent({id:"loop",duration:2,loop:true});
loopEvent.end = function() {
  let object = cg0.getObject(["id"],"IconObjectAA");
  getObjectText.text = object.Transform.x;
}

cg0.settings.callbacks.loopAfter = function(cg) {
  cg.drawGraphic(areaTextHiddenGraphic);
  cg.drawGraphic(areaTextGraphic);
  // cg.drawGraphic(getObjectText);
  // cg.drawImage(backgroundImage,921,134,150,100,-20);
  if (ChoreoGraph.Input.keyStates["c"]) {
    col8.x = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    col8.y = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
  }
  if (ChoreoGraph.Input.keyStates["d"]) {
    col9.x = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    col9.y = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
  }
  if (ChoreoGraph.Input.keyStates["o"]) {
    FMODListnerObject.Transform.x = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    FMODListnerObject.Transform.y = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
  }
  if (ChoreoGraph.Input.keyStates["p"]) {
    FMODSourceObject.Transform.x = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    FMODSourceObject.Transform.y = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
  }
  if (ChoreoGraph.Input.keyStates["h"]) {
    RedMushroom.RigidBody.xv = -500;
  } else if (ChoreoGraph.Input.keyStates["k"]) {
    RedMushroom.RigidBody.xv = 500;
  } else {
    RedMushroom.RigidBody.xv *= Math.min(Math.max(0.05*cg0.timeDelta,0),1);
  }

  // cg.lights.imageLight.x = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
  // cg.lights.imageLight.y = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);

  // for (let mi=0;mi<cg.colliderCount;mi++) { // Main Key
  //   let mid = cg.colliderIds[mi];
  //   let collider = cg.colliders[mid];
  //   // if (collider.static) { continue; }
  //   for (let ci=mi+1;ci<cg.colliderCount;ci++) { // Comparison Key
  //     let cid = cg.colliderIds[ci];
  //     let comparison = cg.colliders[cid];
  //     cg.c.beginPath();
  //     cg.c.moveTo(cg.getTransX(collider.x),cg.getTransY(collider.y));
  //     cg.c.lineTo(cg.getTransX(comparison.x),cg.getTransY(comparison.y));
  //     cg.c.strokeStyle = "#ff0000";
  //     cg.c.lineWidth = 2;
  //     cg.c.stroke();
  //   }
  // }

  if (ChoreoGraph.Develop.animationCreator.path.length==4) {
    let p = ChoreoGraph.Develop.animationCreator.path;
    let output = ChoreoGraph.plugins.Lighting.calculateInterception(p[0][0],p[0][1],p[1][0],p[1][1],p[2][0],p[2][1],p[3][0],p[3][1]);
    cg.c.fillStyle = "white";
    cg.c.fillText(output,100,100)
    cg.c.fillText(output[0],100,100)
    cg.c.fillText(output[1],100,120)
    cg.c.fillText(output[2],100,140)
    cg.c.fillText(output[3],100,160)
    cg.c.fillText(output[4],100,180)
    cg.c.fillText(output[5],100,200)
    cg.c.fillRect(cg.getTransX(output[2])-5,cg.getTransY(output[3])-5,10,10);
    cg.c.fillRect(cg.getTransX(output[4])-5,cg.getTransY(output[5])-5,10,10);
    // cg.c.fillStyle = "#ff0000";
    // cg.c.fillRect(cg.getTransX(output[6])-5,cg.getTransY(output[7])-5,10,10);
    // cg.c.fillRect(cg.getTransX(output[8])-5,cg.getTransY(output[9])-5,10,10);
  }
}

cg0.settings.callbacks.loadingLoop = function(cg) {
  cg.c.strokeStyle = "#ff0003";
  cg.c.lineWidth = 100;
  cg.c.strokeRect(0,0,cg.cw,cg.ch);
  cg.c.fillStyle = "white";
  cg.c.font = "30px Arial";
  cg.c.fillText("LOADING",cg.cw/2,cg.ch/2);
}

cg0.settings.callbacks.pausedLoop = function(cg) {
  cg.c.fillStyle = "white";
  cg.c.font = "30px Arial";
  cg.c.fillText("PAUSED",cg.cw/2,cg.ch/2);
}

ChoreoGraph.plugins.Visualisation.v.animations.active = true;
ChoreoGraph.plugins.Visualisation.v.animations.directionalMarkings = true;
ChoreoGraph.plugins.Visualisation.v.animations.style.width = 2;
ChoreoGraph.plugins.Visualisation.v.buttons.active = true;

let inAudio = ChoreoGraph.AudioController.createSound("in","audio/in.mp3");
let outAudio = ChoreoGraph.AudioController.createSound("out","audio/out.mp3");

cg0.settings.callbacks.cursorLeave = function(cg) {
  outAudio.start();
}
cg0.settings.callbacks.cursorEnter = function(cg) {
  inAudio.start();
}

// SECOND CANVAS

let panelE = cg0.createImage({
  "id" : "panelE",
  "file":"panel.png",
  "crop" : [400,0,100,100]
});
let panelF = cg0.createImage({
  "id" : "panelF",
  "file":"panel.png",
  "crop" : [500,0,100,100]
});

let panelEGraphic = cg1.createGraphic({type:"image",x:900,y:305,image:panelE,width:100,height:100});
let panelFGraphic = cg1.createGraphic({type:"image",x:1015,y:300,image:panelF,width:100,height:100});

let displayTextArea = cg1.createGraphic({"type":"areaText",width:250,textAlign:"center",colour:"#ffffff","text":"I am a text area, around me, are a bunch of other graphics that are available in this version!\n\nIt's a pretty powerful tool, I think...",x:155,y:190});

let displayRectangle = cg0.createGraphic({type:"rectangle",x:368,y:300,r:0,width:150,height:50,ax:10});

let displayPolygon = cg0.createGraphic({type:"polygon",path:[[1,2],[7,31],[-44,50],[-64,23],[-64,-41],[-3,-69],[65,-47],[92,-2],[57,29],[30,1]],x:480,y:140,colour:"#28a03e",lineWidth:10,fill:false});

let displayPointText = cg0.createGraphic({"type":"pointText",font:"40px Arial",textAlign:"center",x:918,y:100,colour:"#ffffff","text":"Point text!"});

let displayArc = cg0.createGraphic({type:"arc",x:737,y:245,radius:60,end:Math.PI*1.25,colour:"#ffffff",fill:false,lineWidth:10});

cg1.settings.callbacks.loopAfter = function(cg) {
  cg.drawGraphic(displayTextArea);
  displayTextArea.r+=0.11;
  cg.drawGraphic(displayRectangle);
  displayRectangle.r-=0.12;
  cg.drawGraphic(displayPolygon);
  displayPolygon.r+=0.13;
  // cg.drawGraphic(displayPointText);
  // displayPointText.r-=0.14;
  cg.drawGraphic(displayArc);
  displayArc.r+=0.15;
  cg.drawGraphic(panelEGraphic);
  cg.drawGraphic(panelFGraphic);

  // if (cg0.clock%2000>1000) { cg0.c.fillStyle = "#00ff00"; } else { cg0.c.fillStyle = "#ff0000";}
  // cg0.c.fillRect(cg0.getTransX(700)-50*cg0.z,cg0.getTransY(400)-50*cg0.z,100*cg0.z,40*cg0.z);
}

ChoreoGraph.FMODConnector.logging = true;
ChoreoGraph.FMODConnector.baseBankPath = "audio/";
ChoreoGraph.FMODConnector.registerBank("MasterStrings","","Master.strings.bank",true);
ChoreoGraph.FMODConnector.registerBank("Master","","Master.bank",true);
ChoreoGraph.FMODConnector.registerBank("Vehicles","","Vehicles.bank",true);
ChoreoGraph.FMODConnector.setup3D();
ChoreoGraph.FMODConnector.setUp();

let mower;
let mowerSetup = false;
let forest;

let toggleFMODForestButton = cg0.createButton({x:900,y:250,width:100,height:50,id:"toggleFMODForest",check:"fmod"});
toggleFMODForestButton.down = function() {
  let state = {};
  if (forest!=undefined) {
    forest.getPlaybackState(state);
    state = state.val;
  }
  if (forest != undefined && state == ChoreoGraph.FMODConnector.FMOD.STUDIO_PLAYBACK_PLAYING) {
    forest.stop(ChoreoGraph.FMODConnector.FMOD.STUDIO_STOP_ALLOWFADEOUT);
  } else {
    forest = ChoreoGraph.FMODConnector.createEventInstance("event:/Ambience/Forest");
    forest.start();
  }
};
let ForestFullButton = cg0.createButton({x:900,y:300,width:100,height:50,id:"RainFull",check:"fmod"});
ForestFullButton.down = function(){if (forest) { forest.setParameterByName("Rain",1,false); } };
let ForestMiddleButton = cg0.createButton({x:900,y:350,width:100,height:50,id:"RainMiddle",check:"fmod"});
ForestMiddleButton.down = function(){if (forest) { forest.setParameterByName("Rain",0.5,false); } };
let ForestOffButton = cg0.createButton({x:900,y:400,width:100,height:50,id:"RainOff",check:"fmod"});
ForestOffButton.down = function(){if (forest) { forest.setParameterByName("Rain",0,false); } };
;
let toggleFMODMowerButton = cg0.createButton({x:1020,y:250,width:100,height:50,id:"toggleFMODMower",check:"fmod"});
toggleFMODMowerButton.down = function() {
  let state = {};
  if (mower!=undefined) {
    mower.getPlaybackState(state);
    state = state.val;
  }
  if (mower != undefined && state == ChoreoGraph.FMODConnector.FMOD.STUDIO_PLAYBACK_PLAYING) {
    mower.stop(ChoreoGraph.FMODConnector.FMOD.STUDIO_STOP_ALLOWFADEOUT);
  } else {
    if (mowerSetup) {
      mower.start();
    } else {
      mower = ChoreoGraph.FMODConnector.createEventInstance("event:/Vehicles/Ride-on Mower");
      mower.start();
      mower.setParameterByName("RPM", 1000.0, false);
      FMODSourceObject.attach("FMODSource",{events:[mower]});
      mowerSetup = true;
    }
  }
};

let switchyButton = cg0.createButton({x:700,y:300,width:100,height:100,id:"switchyButton",check:"switchy"});
switchyButton.down = function() {
  console.log("Switchy button!");
}

let circleButton = cg0.createButton({type:"circle",x:542,y:158,radius:30,id:"circle"});
IconObjectAA.attach("Button",{button:circleButton});

// ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active=true;
// ChoreoGraph.plugins.Visualisation.v.objectAnnotation.key = ["id"]

// let col6 = cg0.createCollider({type:"rectangle",x:400,y:400,width:50,height:100});
let col3 = cg0.createCollider({type:"rectangle",id:"chad",x:400,y:400,width:70,height:80});
// let col0 = cg0.createCollider({type:"circle",x:400,y:400,radius:50,moveable:false});
// let col1 = cg0.createCollider({type:"circle",x:542,y:285,radius:50});
// let col2 = cg0.createCollider({type:"circle",x:476,y:268,radius:60,trigger:true});
// let col3 = cg0.createCollider({type:"circle",x:476,y:268,radius:60});
// let col3 = cg0.createCollider({type:"point",x:601,y:247});
// let col5 = cg0.createCollider({type:"circle",x:573,y:121,radius:45});
// let col6 = cg0.createCollider({type:"circle",x:464,y:167,radius:55});
// let col7 = cg0.createCollider({type:"circle",x:513,y:223,radius:20});
let col7 = cg0.createCollider({type:"rectangle",id:"dave",x:350,y:550,width:300,height:100,trigger:true});
let col8 = cg0.createCollider({type:"rectangle",id:"mark",x:373,y:890,width:300,height:100,trigger:false});
let col9 = cg0.createCollider({type:"rectangle",id:"john",x:73,y:790,width:300,height:100,trigger:false});
let col10 = cg0.createCollider({type:"raycast",x:1200,y:300,dx:100,dy:300});
RedMushroom.attach("Collider",{collider:col3,oy:10})
.attach("RigidBody",{gravity:2000,useColliderForPhysics:true});
// IconObjectCC.attach("Collider",{collider:col1});
// IconObjectBC.attach("Collider",{collider:col7});

cg0.settings.useCamera = false;

let jttsoteTileMap;
cg0.importTileSetFromFile("Tiled/jttsoteTileSet.json",function(){
  jttsoteTileMap = cg0.createGraphic({type:"tileMap"});
  cg0.importTileMapFromFile("Tiled/jttsoteTileMap.json",function(TileMap) {
    jttsoteTileMap.tileMap = TileMap;
    TileMap.cache = true;
    cg0.createCollidersFromTileMap(TileMap,jttsoteTileMap.x,jttsoteTileMap.y,2)
  });
  jttsoteTileMap.x = -800;
});

function generateTileMapColliders(TileMap) {
  let l = 2; // The collisions layer
  for (let t=0; t<TileMap.layers[l].length; t++) {
    let tileNum = TileMap.layers[l][t];
    if (tileNum!=0) {
      let topLeftX = jttsoteTileMap.x - (TileMap.tileWidth*TileMap.width)/2;
      let topLeftY = jttsoteTileMap.y - (TileMap.tileHeight*TileMap.height)/2;
      let x = topLeftX + (t%TileMap.width)*TileMap.tileWidth + TileMap.tileWidth/2;
      let y = topLeftY + Math.floor(t/TileMap.width)*TileMap.tileHeight + TileMap.tileHeight/2;
      cg0.createCollider({type:"rectangle",x:x,y:y,width:TileMap.tileWidth,height:TileMap.tileHeight,trigger:false});
    }
  }
}

let lightingGraphic = cg0.createGraphic({type:"lighting",o:0,shadowType:"rectangle",shadowX:200,shadowY:100,shadowWidth:1200,shadowHeight:1200,shadowRotation:10});
lightingGraphic.lights.push(cg0.createLight({type:"spot",id:"bigLight",x:230,y:250,outerRadius:200,innerRadius:30,colour:"#fa9352"}));
lightingGraphic.lights.push(cg0.createLight({type:"spot",id:"jttsoteLight",x:-660,y:61,outerRadius:500,innerRadius:10,colour:"#fa9352"}));
lightingGraphic.lights.push(cg0.createLight({type:"spot",id:"smallLight",x:200,y:400,outerRadius:100,innerRadius:10}));
lightingGraphic.lights.push(cg0.createLight({type:"image",id:"imageLight",feather:5,x:700,y:200,width:600,height:600,r:130,image:cg0.images.iconC}));
lightingGraphic.occluders.push(cg0.createLightOccluder({path:[[-245,120],[-284,276],[177,311],[171,215]]}));
lightingGraphic.occluders.push(cg0.createLightOccluder({path:[[100,-196],[93,149],[134,149],[181,-2],[118,-20],[149,-128],[301,-79],[255,23],[201,5],[154,160],[197,192],[224,145],[179,131],[237,32],[362,81],[362,160],[251,151],[206,208],[274,309],[264,332],[226,327],[228,472],[382,454],[429,251],[402,226],[323,397],[269,208],[375,214],[368,-34],[310,-156]]}));
RedMushroom.attach("Light",{light:cg0.lights.jttsoteLight});
// ChoreoGraph.plugins.Visualisation.v.animations.active = false;
// ChoreoGraph.plugins.Visualisation.v.buttons.active = false;
ChoreoGraph.Develop.features.cameraController = true;
ChoreoGraph.plugins.Physics.settings.showColliders = true;
ChoreoGraph.plugins.Visualisation.v.animations.active = false;
// ChoreoGraph.plugins.Visualisation.v.buttons.active = false;

ChoreoGraph.AudioController.masterVolume = 0;
ChoreoGraph.start();
// Willby - 2024