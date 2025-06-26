const cg = ChoreoGraph.instantiate({
  core : {
    generateBasicEnvironment : true
  },
  lighting : {
    appendCanvases : false
  },
  input : {
    preventDefaultKeys : ["space","up","down"],
    preventSingleTouch : true,
    controller : {
      emulatedCursor : {
        active : true
      }
    }
  }
});

// ChoreoGraph.Develop.createInterfaces = false;

cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  width : 700,
  height : 500,
  background : "mistyrose"
}).resizeWithSelf();

cg.cameras.main.scaleMode = "maximum";
cg.cameras.main.maximumSize = 1400;
cg.cameras.main.transform.x = 0;
cg.cameras.main.transform.y = 0;

cg.scenes.main.createItem("graphic",{
  graphic : cg.createGraphic({type:"lighting",
    shadowType : ChoreoGraph.Lighting.SHADOW_RECTANGLE,
    shadowColour : "#0d0a1ffe",
    shadowWidth : 1400,
    shadowHeight : 1400
  },"middleLighting"),
},"middleLighting");

cg.scenes.main.createItem("graphic",{
  graphic : cg.createGraphic({type:"lighting",
    shadowType : ChoreoGraph.Lighting.SHADOW_PATH,
    shadowColour : "#0d0a1ffe",
    path : [[-2415.5,-717.5],[-1444,-551.5],[-977.5,-80.5],[-989.5,478.5],[-1414.5,-53.5],[-1744,85.5],[-1197,449.5],[-1231.5,552],[-1060.5,610.5],[-1544,925.5],[-2518,469],[-2147,-205]]
  },"leftLighting"),
},"leftLighting");

let dragging = false;
let draggedObject = null;

function createLight(id,r,g,b) {
  let newObject = cg.createObject({},id);

  cg.Input.createButton({type:"circle",object:newObject,transform:newObject.transform,radius:80,down:function(button){
    button.object.downX = button.object.transform.x;
    button.object.downY = button.object.transform.y;
    draggedObject = button.object;
    dragging = true;
  }},id);

  cg.Lighting.createLight({type:"spot",
    colourR:r,
    colourG:g,
    colourB:b,
    outerRadius:250,
    innerRadius:5,
    transform:newObject.transform,
  },id);
}

function createOccluder(id,path) {
  let newObject = cg.createObject({},id);

  let newOccluder = cg.Lighting.createOccluder({path:path,transform:newObject.transform},id);
  cg.graphics.middleLighting.occluders.push(newOccluder);

  let newGraphic = cg.createGraphic({type:"polygon",path:path,fill:false,lineWidth:2,strokeColour:"white"},id);
  cg.scenes.main.createItem("graphic",{
    graphic : newGraphic,
    transform : newObject.transform
  },id);

  cg.Input.createButton({type:"polygon",object:newObject,graphic:newGraphic,path:path,transform:newObject.transform,down:function(button){
    button.object.downX = button.object.transform.x;
    button.object.downY = button.object.transform.y;
    draggedObject = button.object;
    dragging = true;
  },enter:function(button){
    button.graphic.strokeColour = "yellow";
  },exit:function(button){
    button.graphic.strokeColour = "white";
  }},id);
}

createLight("athena",255,0,0);
createLight("linkley",0,255,0);
createLight("magna",0,0,255);
createOccluder("cormac",[[259,297],[175,282],[194,206],[273,157],[332,248]]);
createOccluder("partridge",[[-532,161],[-662,256],[-470,443],[-318,267],[-420,202],[-450,368],[-595,238],[-436,184]]);

cg.Input.createAction({keys:["w","up","condpadup","conrightup"]},"moveUp");
cg.Input.createAction({keys:["s","down","condpaddown","conrightdown"]},"moveDown");
cg.Input.createAction({keys:["a","left","condpadleft","conrightleft"]},"moveLeft");
cg.Input.createAction({keys:["d","right","condpadright","conrightright"]},"moveRight");

cg.settings.core.callbacks.loopBefore=()=> {
  if (dragging) {
    let dx = cg.Input.cursor.x - cg.Input.cursor.down.left.x;
    let dy = cg.Input.cursor.y - cg.Input.cursor.down.left.y;
    draggedObject.transform.x = draggedObject.downX + dx;
    draggedObject.transform.y = draggedObject.downY + dy;
  }
}

cg.settings.core.callbacks.loopAfter=()=> {
  let dir = cg.Input.getActionNormalisedVector("moveUp","moveDown","moveLeft","moveRight");
  cg.cameras.main.transform.x += dir[0] * cg.timeDelta;
  cg.cameras.main.transform.y += dir[1] * cg.timeDelta;

  if (cg.Input.lastCursorType=="controller") {
    ChoreoGraph.transformContext(cg.canvases.main.camera);
    let c = cg.canvases.main.c;
    c.beginPath();
    c.arc(cg.Input.cursor.x,cg.Input.cursor.y,30,0,Math.PI*2);
    if (cg.Input.cursor.hold.any) {
      c.fillStyle = "#1b3856";
    } else {
      c.fillStyle = "#86acff";
    }
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = "#ffffff";
    c.stroke();
  }
}

cg.settings.input.callbacks.cursorUp=()=> {
  dragging = false;
  draggedObject = null;
}

ChoreoGraph.start();