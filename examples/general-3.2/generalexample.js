const cg = ChoreoGraph.instantiate({
  core : {
    generateBasicEnvironment : true
  },
  input : {
    preventSingleTouch : true
  },
  audio : {
    // forceMode : "HTMLAudio"
  }
});
cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  height : 450,
  width : 600
});

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
cg.scenes.main.createItem("graphic",{graphic:cg.graphics.canvasCursorRectangle},"canvasCursorRectangle");

cg.Input.createButton({type:"rectangle",x:500,y:30,width:120},"egg");

cg.Audio.createSound({source:"magneticPlane.mp3"},"magneticPlane");
cg.Audio.sounds.magneticPlane.play({allowBuffer:true,loop:true});

cg.settings.core.callbacks.loopBefore = () => {
  cg.sceneItems.cursorRectangle.transform.x = cg.Input.cursor.x;
  cg.sceneItems.cursorRectangle.transform.y = cg.Input.cursor.y;

  cg.sceneItems.downRectangle.transform.x = cg.Input.cursor.down.any.x;
  cg.sceneItems.downRectangle.transform.y = cg.Input.cursor.down.any.y;

  cg.sceneItems.upRectangle.transform.x = cg.Input.cursor.up.any.x;
  cg.sceneItems.upRectangle.transform.y = cg.Input.cursor.up.any.y;

  cg.sceneItems.canvasCursorRectangle.transform.x = cg.Input.cursor.canvasX;
  cg.sceneItems.canvasCursorRectangle.transform.y = cg.Input.cursor.canvasY;
}
cg.settings.core.callbacks.loopAfter = () => {
  cg.c.strokeStyle = "white";
  ChoreoGraph.transformContext(cg.canvases.main.camera)
  cg.c.beginPath();
  cg.c.moveTo(cg.sceneItems.downRectangle.transform.x,cg.sceneItems.downRectangle.transform.y);
  if (cg.Input.cursor.hold.any) {
    cg.c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
  } else {
    cg.c.lineTo(cg.sceneItems.upRectangle.transform.x,cg.sceneItems.upRectangle.transform.y);
  }
  cg.c.stroke();

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