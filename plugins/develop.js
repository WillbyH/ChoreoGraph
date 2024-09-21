ChoreoGraph.Develop = new class Develop {
  constructor() {
    this.cg = null;
    document.addEventListener("mousedown", this.mouseDown, false);
    document.addEventListener("touchstart", this.mouseDown, false);
    document.addEventListener("mouseup", this.mouseUp, false);
    document.addEventListener("touchend", this.mouseUp, false);
    document.addEventListener("keydown", this.keyDown, false);
    document.addEventListener("wheel", this.wheel, {passive: false});

    // FEATURES
    // FPS, Animation Creator, Console Overlay, Visualisation Toggles, Evaluate, Live Evaluation, Closest Frame Locator
    this.features = {
      fps: false,
      animationCreator: false,
      consoleOverlay: false,
      liveEvaluation: false,
      closestFrameLocator: false,
      cameraController: false,
      objectGizmo: false,
      animationEditor: false,
      objectPlacer: false
    };
    this.fps = {
      start: 0,
      frames: 0,
      fps: 0
    };
    this.animationCreator = {
      path: [],
      previousPaths: [],
      pathString: "",
      moving: false,
      movingIndex: 0,
      moveHotkey : "d",
      insertHotkey : "a",
      deleteHotkey : "x",
      saveHotkey : "s",
      undoHotkey : "z",
      roundOutputDecimals : 0,
      translationSnap : 0.5,
      style: {
        colourKey: "#ffffff",
        colourA: "#0000ff",
        colourB: "#ff0000",
        colourC: "#00ff00",
        sizeA: 10,
        sizeB: 14,
        sizeC: 18,
        font: "Arial"
      }
    };
    this.closestFrameLocator = {
      style: {
        colourKey: "#86acff",
        size: 20,
        font: "Arial"
      }
    };
    this.cameraController = {
      hotkey : "shift",
      offsetting : false,
      last : [0,0],
      wasUsingCamera : false
    }
    this.consoleOverlay = {
      connected: false,
      showSource: false,
      history: [],
      size: 20,
      font: "Arial",
      typeColours: {
        "debug" : "#4c88ff", // Blue
        "error" : "#ff0000", // Red
        "info" : "#2fd4c7", // Turquoise
        "warn" : "#e8b300", // Yellow
        "log" : "#2adb59" // Green
      }
    };
    this.objectGizmo = {
      mode: "translate", // translate, rotate, scale
      selected: null,
      downPos: [0,0],
      originalObjectPosition: [0,0],
      originalObjectScale: [1,1],
      originalObjectRotation: 0,
      lastObjectRotation: 0,
      biAxisMove: false,
      xAxisMove: false,
      yAxisMove: false,
      rotationMove: false,
      undoHotkey: "z",
      swapModeHotkey: "x",
      snapHotkey: "shift",
      modifiedObjects: [],
      rotationSnap: 30,
      style: {
        x: "#ff0000",
        y: "#00ff00",
        other: "#0000ff"
      }
    }
    this.animationEditor = {
      ctx: null,
      cnvs: null,
      selectedAnimation: null,
      controlPoints: [],
      selected: [false], // [selected,animationPart,key,isTimeConstrained]
      startTime: -10,
      timeScale: 4, // pixels per second
      yMax: 700,
      yMin: -300,
      modifiedAnimations: [],
      cursorPos: [0,0],
      scrollSpeed: 0.2,
      panning: false,
      panningStart: [0,0],
      panningStartTimeLast: 0,
      panningYMinLast: 0,
      panningYMaxLast: 0,
      swapZoomHotkey: "shift"
    }
    this.objectPlacer = {
      prototypes: {},
      registerPrototype: function(name,createFunction,image=null) {
        if (this.prototypes[name]===undefined) {
          this.prototypes[name] = {name:name,createFunction:createFunction,image:image};
        } else {
          console.warn("Prototype already exists:",name);
        }
      },
      selectedButton: null,
      newObject: null,
      grabbed: false,
      createdObjects: {}
    }
    this.interface = {
      styles: document.createElement("style"),
      section: document.createElement("section"),
      interactives: {},
      style: {
        "off": "#ff0000",
        "on": "#008000",
        "action": "#ffc0cb"
      }
    };
    this.frameLClick = false;
    this.frameRClick = false;
    this.frameKeyPress = false;

    ChoreoGraph.plugin({
      name: "Develop",
      key: "Develop",
      version: "1.1",
      externalContentLoops: [this.loop]
    })
  }
  array2DToString(arr) {
    var output = "";
    for (var i in arr) {
      output += "[" + arr[i].join(",") + "],";
    }
    return output.slice(0, -1);
  }
  bezierPath(points, quality=10) {
    var output = [];
    for (var i = 0; i <= quality; i++) {
      var per = i/quality;
      var cpoints = Array.from(points);
      while (cpoints.length > 2) {
        var lastloc = Array.from(cpoints[0]);
        var nextpoints = [];
        for (var p = 1; p < cpoints.length; p++) {
          nextpoints.push([(lastloc[0]-per*(lastloc[0]-cpoints[p][0])),(lastloc[1]-per*(lastloc[1]-cpoints[p][1]))]);
          lastloc = Array.from(cpoints[p]);
        }
        cpoints = Array.from(nextpoints);
      }
      output.push([parseFloat((cpoints[0][0]-per*(cpoints[0][0]-cpoints[1][0])).toFixed(2)),parseFloat((cpoints[0][1]-per*(cpoints[0][1]-cpoints[1][1])).toFixed(2))]);
    }
    return output;
  }
  arcPath(middle,radius=20,quality=15,start=0,end=360,add_rotation=false) {
    var total_rotation = end-start;
    var output = [];
    var start = start+90;
    var end = end+90;
    for (var i = 0; i <= quality; i++) {
      var current_angle = (i/quality)*total_rotation+start;
      var frame = [
        parseFloat((middle[0]+radius*Math.cos(current_angle*Math.PI/180)).toFixed(2)),
        parseFloat((middle[1]-radius*Math.sin(current_angle*Math.PI/180)).toFixed(2))
      ];
      if (add_rotation) {
        frame[simsets.anim_format.r] = -current_angle
      }
      output.push(frame);
    }
    return output;
  }
  viewOutsideCanvas() {
    if (this.cg===null) { console.warn("No cg selected"); return; }
    this.cg.c.scale(0.5,0.5);
    this.cg.c.translate(this.cg.cw/2,this.cg.ch/2);
    this.cg.c.clearRect(-this.cg.cw/2,-this.cg.ch/2,this.cg.cw*2,this.cg.ch*2);
  }
  rescaleCanvas(scale) {
    if (this.cg===null) { console.warn("No cg selected"); return; }
    cnvs.height = this.cg.ch*scale;
    cnvs.width = this.cg.cw*scale;
    this.cg.c.scale(scale,scale);
  }
  mouseDown(event) {
    if (ChoreoGraph.Develop==undefined) { return; }
    if (event.target.ChoreoGraph!==undefined) {
      if (ChoreoGraph.Develop.cg===null) {
        ChoreoGraph.Develop.cg = event.target.ChoreoGraph;
        ChoreoGraph.Develop.createInterface();
      }
      ChoreoGraph.Develop.cg = event.target.ChoreoGraph;
    }
    if (event.button==0) {
      ChoreoGraph.Develop.frameLClick = true;
    } else if (event.button==2) {
      ChoreoGraph.Develop.frameRClick = true;
    }
    if (ChoreoGraph.Input.keyStates[ChoreoGraph.Develop.cameraController.hotkey]) {
      ChoreoGraph.Develop.cameraController.offsetting = true;
      ChoreoGraph.Develop.cameraController.last = [ChoreoGraph.Develop.cg.x,ChoreoGraph.Develop.cg.y];
    }
  }
  mouseUp(event) {
    if (ChoreoGraph.Develop==undefined) { return; }
    if (ChoreoGraph.Input.keyStates[ChoreoGraph.Develop.cameraController.hotkey]) {
      ChoreoGraph.Develop.cameraController.offsetting = false;
    }
    ChoreoGraph.Develop.animationCreator.moving = false;
    
    ChoreoGraph.Develop.objectGizmo.biAxisMove = false;
    ChoreoGraph.Develop.objectGizmo.xAxisMove = false;
    ChoreoGraph.Develop.objectGizmo.yAxisMove = false;
    ChoreoGraph.Develop.objectGizmo.rotationMove = false;
  }
  wheel(event) {
    if (ChoreoGraph.Develop==undefined) { return; }
    if (ChoreoGraph.Develop.features.cameraController) {
      function zoom(magnitude) {
        let cg = ChoreoGraph.Develop.cg;
        let scrollSpeed = 1/2;
        if (magnitude<0) { cg.z*=1+Math.abs(magnitude)/scrollSpeed; } else { cg.z*=1-Math.abs(magnitude)/scrollSpeed; }
      }
      if (ChoreoGraph.Input.keyStates[ChoreoGraph.Develop.cameraController.hotkey]) {
        if (event.deltaY<0) {
          zoom(-0.1);
        } else {
          zoom(0.1);
        }
      }
    }
  }
  keyDown() {
    if (ChoreoGraph.Develop==undefined) { return; }
    ChoreoGraph.Develop.frameKeyPress = true;
  }
  loop() {
    let dev = ChoreoGraph.Develop;
    let cg = dev.cg;
    if (cg===null) { return; }
    if (dev.features.fps) { dev.fpsLoop(dev,cg); }
    if (dev.features.animationCreator) { dev.animationCreatorLoop(dev,cg); }
    if (dev.features.closestFrameLocator) { dev.closestFrameLocatorLoop(dev,cg); }
    if (dev.features.cameraController) { dev.cameraControllerLoop(dev,cg); }
    if (dev.features.consoleOverlay) { dev.connectConsole(dev); dev.consoleOverlayLoop(dev,cg); }
    if (dev.features.objectGizmo) { dev.objectGizmoLoop(dev,cg); }
    if (dev.features.animationEditor) { dev.animationEditorLoop(dev,cg); }
    if (dev.features.objectPlacer) { dev.objectPlacerLoop(dev,cg); }
    dev.frameLClick = false;
    dev.frameRClick = false;
    dev.frameKeyPress = false;
  }
  fpsLoop(dev,cg) {
    dev.fps.frames++;
    if (performance.now() - dev.fps.start >= 1000) {
      dev.fps.fps = dev.fps.frames;
      dev.fps.frames = 0;
      dev.fps.start = performance.now();
    }
    cg.c.fillStyle = "black";
    cg.c.globalAlpha = 0.3;
    cg.c.font = "18px Arial";
    cg.c.textAlign = "center";
    cg.c.textBaseline = "bottom";
    cg.c.fillRect(0,0,70,35);
    cg.c.globalAlpha = 1;
    cg.c.fillStyle = "white";
    cg.c.fillText(dev.fps.fps+"fps",35,25);
  }
  animationCreatorLoop(dev,cg) {
    let cursorCGx = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    let cursorCGy = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
    cursorCGx = Math.round((cursorCGx)/dev.animationCreator.translationSnap)*dev.animationCreator.translationSnap;
    cursorCGy = Math.round((cursorCGy)/dev.animationCreator.translationSnap)*dev.animationCreator.translationSnap;
    cg.c.lineWidth = 0.8;
    cg.c.fillStyle = "magenta";
    cg.c.fillRect(cg.getTransX(cursorCGx),cg.getTransY(cursorCGy),1,1);
    cg.c.fillStyle = dev.animationCreator.style.colourKey;
    cg.c.strokeStyle = dev.animationCreator.style.colourKey;
    if (dev.animationCreator.path.length==0) { // Draw start animation detail
      cg.c.font = dev.animationCreator.style.sizeA + "px " + dev.animationCreator.style.font;
      cg.c.textAlign = "center";
      cg.c.fillText("Start Animation",cg.getTransX(cursorCGx),cg.getTransY(cursorCGy)-1);
    } else { // Draw path and control details
      let keyStates = ChoreoGraph.Input.keyStates;
      let moveHotkey = dev.animationCreator.moveHotkey;
      let insertHotkey = dev.animationCreator.insertHotkey;
      let deleteHotkey = dev.animationCreator.deleteHotkey;
      if (!keyStates[moveHotkey]&&!keyStates[insertHotkey]&&!keyStates[deleteHotkey]&&!keyStates[dev.cameraController.hotkey]) { // Line for new point
        cg.c.strokeStyle = dev.animationCreator.style.colourC;
        cg.c.beginPath();
        cg.c.moveTo(cg.getTransX(dev.animationCreator.path[dev.animationCreator.path.length-1][0]), cg.getTransY(dev.animationCreator.path[dev.animationCreator.path.length-1][1]));
        cg.c.lineTo(cg.getTransX(cursorCGx),cg.getTransY(cursorCGy));
        cg.c.stroke();
      }
      // Draw existing path
      let colourToggle = false;
      cg.c.strokeStyle = dev.animationCreator.style.colourA;
      for (let i=0;i<dev.animationCreator.path.length;i++) {
        if (i==0) {
          cg.c.beginPath();
          cg.c.moveTo(cg.getTransX(dev.animationCreator.path[i][0]), cg.getTransY(dev.animationCreator.path[i][1]));
          continue;
        }
        cg.c.lineTo(cg.getTransX(dev.animationCreator.path[i][0]), cg.getTransY(dev.animationCreator.path[i][1]));
        cg.c.stroke();
        if (colourToggle) { cg.c.strokeStyle = dev.animationCreator.style.colourA; }
        else { cg.c.strokeStyle = dev.animationCreator.style.colourB; }
        colourToggle = !(colourToggle);
        cg.c.beginPath();
        cg.c.moveTo(cg.getTransX(dev.animationCreator.path[i][0]), cg.getTransY(dev.animationCreator.path[i][1]));
      }
      if (keyStates[moveHotkey]||keyStates[deleteHotkey]) { // Draw circles around the points
        cg.c.beginPath();
        let closestDistance = Infinity;
        let closestPoint = [0,0];
        for (let point of dev.animationCreator.path) {
          cg.c.strokeStyle = dev.animationCreator.style.colourC;
          cg.c.moveTo(cg.getTransX(point[0])+10, cg.getTransY(point[1]));
          cg.c.arc(cg.getTransX(point[0]), cg.getTransY(point[1]),10,0,Math.PI*2);

          let distance = Math.sqrt(((cursorCGx-point[0])**2)+((cursorCGy-point[1])**2));
          if (distance<closestDistance) {
            closestPoint = point;
            closestDistance = distance;
          }
        }
        cg.c.moveTo(cg.getTransX(closestPoint[0]),cg.getTransY(closestPoint[1]));
        cg.c.lineTo(cg.getTransX(cursorCGx),cg.getTransY(cursorCGy));
        cg.c.stroke();
      } else if (keyStates[insertHotkey]) { // Draw circles ihe the middle of paths
        let middles = {};
        for (let i=0;i<dev.animationCreator.path.length-1;i++) {
          let point0 = dev.animationCreator.path[i];
          let point1 = dev.animationCreator.path[i+1];
          let middle = [(point0[0]+point1[0])/2,(point0[1]+point1[1])/2];
          middles[i] = middle;
        }
        cg.c.strokeStyle = dev.animationCreator.style.colourC;
        let closestDistance = Infinity;
        let closestPoint = [0,0];
        cg.c.beginPath();
        for (let i in middles) {
          let point = middles[i];
          cg.c.moveTo(cg.getTransX(point[0])+10, cg.getTransY(point[1]));
          cg.c.arc(cg.getTransX(point[0]), cg.getTransY(point[1]),10,0,Math.PI*2);

          let distance = Math.sqrt(((cursorCGx-point[0])**2)+((cursorCGy-point[1])**2));
          if (distance<closestDistance) {
            closestPoint = point;
            closestDistance = distance;
          }
        }
        cg.c.moveTo(cg.getTransX(closestPoint[0]),cg.getTransY(closestPoint[1]));
        cg.c.lineTo(cg.getTransX(cursorCGx),cg.getTransY(cursorCGy));
        cg.c.stroke();
      }
    }
    if (dev.frameLClick) {
      if (!(dev.animationCreator.path.length==0&&cg.getTransX(cursorCGx)>cg.cw||cg.getTransY(cursorCGy)>cg.ch||cg.getTransX(cursorCGx)<0||cg.getTransY(cursorCGy)<0)) { // Clicked on the canvas
        if (ChoreoGraph.Input.keyStates[dev.animationCreator.moveHotkey]) { // Begin moving
          dev.animationCreator.previousPaths.push(Array.from(dev.animationCreator.path));
          dev.animationCreator.moving = true;
          let closestIndex = 0;
          let closestDistance = Infinity;
          for (let i=0;i<dev.animationCreator.path.length;i++) {
            let point = dev.animationCreator.path[i];
            let distance = Math.sqrt(((cursorCGx-point[0])**2)+((cursorCGy-point[1])**2));
            if (distance<closestDistance) {
              closestIndex = i;
              closestDistance = distance;
            }
          }
          dev.animationCreator.movingIndex = closestIndex;
        } else if (ChoreoGraph.Input.keyStates[dev.animationCreator.deleteHotkey]) { // Delete point
          dev.animationCreator.previousPaths.push(Array.from(dev.animationCreator.path));
          let closestIndex = 0;
          let closestDistance = Infinity;
          for (let i=0;i<dev.animationCreator.path.length;i++) {
            let point = dev.animationCreator.path[i];
            let distance = Math.sqrt(((cursorCGx-point[0])**2)+((cursorCGy-point[1])**2));
            if (distance<closestDistance) {
              closestIndex = i;
              closestDistance = distance;
            }
          }
          dev.animationCreator.path.splice(closestIndex,1);
        } else if (ChoreoGraph.Input.keyStates[dev.animationCreator.insertHotkey]) { // Insert point
          if (dev.animationCreator.path.length<2) { return; }
          dev.animationCreator.previousPaths.push(Array.from(dev.animationCreator.path));
          let closestIndex = 0;
          let closestDistance = Infinity;
          let middles = {};
          for (let i=0;i<dev.animationCreator.path.length-1;i++) {
            let point0 = dev.animationCreator.path[i];
            let point1 = dev.animationCreator.path[i+1];
            let middle = [(point0[0]+point1[0])/2,(point0[1]+point1[1])/2];
            middles[i] = middle;
          }
          for (let i in middles) {
            let point = middles[i];
            let distance = Math.sqrt(((cursorCGx-point[0])**2)+((cursorCGy-point[1])**2));
            if (distance<closestDistance) {
              closestIndex = parseInt(i);
              closestDistance = distance;
            }
          }
          dev.animationCreator.path.splice(closestIndex+1,0,[cursorCGx,cursorCGy])
        } else if (!ChoreoGraph.Input.keyStates[dev.cameraController.hotkey]) { // Add point
          dev.animationCreator.previousPaths.push(Array.from(dev.animationCreator.path));
          dev.animationCreator.path.push([cursorCGx,cursorCGy]);
        }
      }
    }
    if (dev.animationCreator.moving) {
      dev.animationCreator.path[dev.animationCreator.movingIndex] = [cursorCGx,cursorCGy]
    }
    if (dev.frameKeyPress) {
      if (ChoreoGraph.Input.lastKey==dev.animationCreator.undoHotkey&&dev.animationCreator.previousPaths.length>0) {
        dev.animationCreator.path = dev.animationCreator.previousPaths.pop();
      }
      if (ChoreoGraph.Input.lastKey==dev.animationCreator.saveHotkey) {
        dev.animationCreator.pathString = "";
        let rnd = 10**dev.animationCreator.roundOutputDecimals;
        for (let i=0;i<dev.animationCreator.path.length;i++) {
          if (dev.animationCreator.pathString!="") { dev.animationCreator.pathString = dev.animationCreator.pathString + ","; }
          dev.animationCreator.pathString = dev.animationCreator.pathString + "[" + (dev.animationCreator.path[i][0]*rnd)/rnd + "," + (dev.animationCreator.path[i][1]*rnd)/rnd + "]";
        }
        let pathStringNode = document.createTextNode(dev.animationCreator.pathString);
        this.interface.interactives.animationCreatorOutput.appendChild(pathStringNode);
        this.interface.interactives.animationCreatorOutput.appendChild(document.createElement("br"));
        this.interface.interactives.animationCreatorOutput.appendChild(document.createElement("br"));
        navigator.clipboard.writeText(dev.animationCreator.pathString); // Copy to clipboard
        dev.animationCreator.path = [];
      }
    }
    cg.c.strokeStyle = dev.animationCreator.style.colourKey;
    cg.c.fillStyle = "black";
    cg.c.globalAlpha = 0.3;
    cg.c.font = dev.animationCreator.style.sizeC + "px " + dev.animationCreator.style.font;
    cg.c.textBaseline = "bottom";
    let text = "Z - Undo | S - Save | " + dev.animationCreator.moveHotkey.toUpperCase() + " - Move | " + dev.animationCreator.insertHotkey.toUpperCase() + " - Insert | " + dev.animationCreator.deleteHotkey.toUpperCase() + " - Delete";
    let generalWidth = cg.c.measureText(text).width+40;
    text += " | " + cursorCGx + "," + cursorCGy
    let width = cg.c.measureText(text).width+40;
    let scale = (cg.cw/2.5)/generalWidth;
    cg.c.fillRect(0,0,width*scale,35*scale);
    cg.c.globalAlpha = 1;
    cg.c.textAlign = "left";
    cg.c.font = dev.animationCreator.style.sizeC*scale + "px " + dev.animationCreator.style.font;
    cg.c.fillStyle = dev.animationCreator.style.colourKey;
    cg.c.fillText(text,20*scale,27*scale);
  }
  closestFrameLocatorLoop(dev, cg) {
    let cursorCGx = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    let cursorCGy = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
    let closestFoundAnimationIndex = 0;
    let closestFoundAnimationPart = 0;
    let closestFoundDistance = 10000;
    let closestFoundCords = [0,0];
    let closestFoundKeyframe = [];
    let closestFoundTitle = "";

    for (let animIndex in cg.animations) {
      let animation = cg.animations[animIndex];
      let xKey = null;
      let yKey = null;
      for (let k=0;k<animation.keys.length;k++) {
        if (JSON.stringify(animation.keys[k])==JSON.stringify(cg.settings.animation.animationLinks.x)) { xKey = k; }
        if (JSON.stringify(animation.keys[k])==JSON.stringify(cg.settings.animation.animationLinks.y)) { yKey = k; }
      }
      if (xKey==null||yKey==null) { continue; }
      for (let part in animation.data) {
        let partCords = [animation.data[part][xKey],animation.data[part][yKey]];
        let currentDistance = Math.sqrt(Math.pow(partCords[0]-cursorCGx,2)+Math.pow(partCords[1]-cursorCGy,2));
        if (currentDistance<closestFoundDistance) {
          closestFoundDistance = currentDistance;
          closestFoundCords = Array.from(partCords);
          closestFoundAnimationPart = part;
          closestFoundAnimationIndex = animIndex;
          closestFoundKeyframe = Array.from(animation.data[part]);
          closestFoundTitle = animation.title;
        }
      }
    }

    cg.c.lineWidth = 2;
    cg.c.fillStyle = dev.closestFrameLocator.style.colourKey;
    cg.c.strokeStyle = dev.closestFrameLocator.style.colourKey;

    cg.c.beginPath();
    cg.c.moveTo(cg.getTransX(closestFoundCords[0]),cg.getTransY(closestFoundCords[1]));
    cg.c.lineTo(ChoreoGraph.Input.cursor.x,ChoreoGraph.Input.cursor.y);
    cg.c.stroke();

    cg.c.font = dev.closestFrameLocator.style.size + "px " + dev.closestFrameLocator.style.font;
    cg.c.textAlign = "left";
    let topText = closestFoundTitle + " | " + closestFoundAnimationIndex + " | " + closestFoundAnimationPart + " | [ " + closestFoundKeyframe + " ]";
    let bottomText = closestFoundDistance + " | " + closestFoundCords + " | " + closestFoundAnimationPart + " | " + closestFoundAnimationIndex;
    if (cg.boundBox.left<0||cg.boundBox.top<0) { // If zoomed in and top left of screen is not visible
      cg.c.fillText(topText,Math.max(5,-cg.boundBox.left+5),Math.max(dev.closestFrameLocator.style.size,-cg.boundBox.top+dev.closestFrameLocator.style.size), cg.cw-40);
      cg.c.fillText(bottomText,Math.max(5,-cg.boundBox.left+5),Math.max(dev.closestFrameLocator.style.size*2,-cg.boundBox.top+dev.closestFrameLocator.style.size*2)+3, cg.cw-40);
    } else {
      cg.c.fillText(topText,20,20+dev.closestFrameLocator.style.size,cg.cw-40);
      cg.c.fillText(bottomText,20,20+dev.closestFrameLocator.style.size*2+3,cg.cw-40);
    }
    cg.c.fillStyle = "#3d9f52";
    cg.c.textAlign = "center";
    cg.c.font = dev.closestFrameLocator.style.size/2 + "px " + dev.closestFrameLocator.style.font;
    cg.c.fillText(closestFoundCords[0]+","+closestFoundCords[1],ChoreoGraph.Input.cursor.x,ChoreoGraph.Input.cursor.y);
  }
  cameraControllerLoop(dev, cg) {
    if (ChoreoGraph.Develop.cameraController.offsetting) {
      cg.x = ChoreoGraph.Develop.cameraController.last[0] - (ChoreoGraph.Input.cursor.down.any[0]-ChoreoGraph.Input.cursor.x)/cg.z;
      cg.y = ChoreoGraph.Develop.cameraController.last[1] - (ChoreoGraph.Input.cursor.down.any[1]-ChoreoGraph.Input.cursor.y)/cg.z;
    }
    if (ChoreoGraph.Input.keyStates[ChoreoGraph.Develop.cameraController.hotkey]) {
      cg.c.fillStyle = "black";
      cg.c.globalAlpha = 0.3;
      cg.c.font = "18px Arial";
      cg.c.textAlign = "left";
      cg.c.textBaseline = "bottom";
      let text = "x: " + cg.x.toFixed(2) + " y: " + cg.y.toFixed(2) + " z: " + cg.z.toFixed(2);
      cg.c.fillRect(0,0,40+cg.c.measureText(text).width,38);
      cg.c.globalAlpha = 1;
      cg.c.fillStyle = "white";
      cg.c.fillText(text,20,28);
    }
  }
  consoleOverlayLoop(dev, cg) {
    if (dev.consoleOverlay.history.length>1000) {
      dev.consoleOverlay.history = dev.consoleOverlay.history.slice(dev.consoleOverlay.history.length-1000,dev.consoleOverlay.history.length);;
    }
    let line = 0;
    let lineSize = dev.consoleOverlay.size+5;
    cg.c.textAlign = "left";
    cg.c.textBaseline = "bottom";
    let startLine = 0;
    if (dev.consoleOverlay.history.length>(cg.ch-40-lineSize)/lineSize) { startLine = Math.floor(dev.consoleOverlay.history.length-(cg.ch-40-lineSize)/lineSize); }

    for (let eli=startLine;eli<dev.consoleOverlay.history.length&&line<(cg.ch-40-lineSize)/lineSize;eli++) {
      let conEle = dev.consoleOverlay.history[eli]; // Console Element
      let text = conEle.args.join(" ");
      if (dev.consoleOverlay.showSource) { text = text + "    " + conEle.source[1] }
      let eleColour = "#ffffff";
      if (Object.keys(dev.consoleOverlay.typeColours).includes(conEle.type)) { eleColour = dev.consoleOverlay.typeColours[conEle.type]; }
      cg.c.fillStyle = eleColour;
      cg.c.fillRect(20,20+line*lineSize,lineSize,lineSize);
      cg.c.fillStyle = "#000000";
      cg.c.globalAlpha = 0.6;
      cg.c.font = dev.consoleOverlay.size + "px " + dev.consoleOverlay.font;
      cg.c.fillRect(20+lineSize,20+line*lineSize,cg.c.measureText(text).width+10,lineSize);
      cg.c.fillStyle = "#ffffff";
      cg.c.fillText(text,20+lineSize+5,22+line*lineSize+dev.consoleOverlay.size);
      cg.c.globalAlpha = 1;
      line++;
    }
  }
  connectConsole(dev) {
    if (dev.consoleOverlay.connected) { return; }
    let oldConsole = {};

    ['log', 'warn', 'error', 'info'].forEach(function (method) {
      oldConsole[method] = console[method];
      console[method] = function () {
        let args = Array.from(arguments);
        let stackTrace = new Error().stack.split('\n');
        let callerInfo = stackTrace[2].split('/').pop().split(')')[0];
        dev.consoleOverlay.history.push({ type: method, args: args, source: [callerInfo.split(':')[0], callerInfo.split(':')[1]+":"+callerInfo.split(':')[2]] });
        oldConsole[method].apply(console, args);
      };
    });

    window.onerror = function (event, source, linenum, column) {
      dev.consoleOverlay.history.push({ type: 'error', args: [event], source: [source.split('/').pop(), linenum + ':' + column] });
    };

    dev.consoleOverlay.connected = true;
  }
  objectGizmoLoop(dev,cg) {
    let curX = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
    let curY = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
    let armLength = Math.max(cg.ch,cg.cw)*0.05;
    let handSize = Math.max(cg.ch,cg.cw)*0.015;
    let selectionDistance = Math.max(cg.ch,cg.cw)*0.02;
    cg.c.lineWidth = handSize/3;
    cg.c.lineCap = "square";

    // DRAW SELECTED OBJECT GIZMO (by mode)
    if (dev.objectGizmo.selected!==null) {
      let selected = dev.objectGizmo.selected;
      let x = selected.Transform.x+selected.Transform.ox+selected.Transform.ax;
      let y = selected.Transform.y+selected.Transform.oy+selected.Transform.ay;
      x = cg.getTransX(x);
      y = cg.getTransY(y);
      if (dev.objectGizmo.mode=="translate") {
        cg.c.strokeStyle = dev.objectGizmo.style.other;
        cg.c.lineWidth = handSize/4;
        cg.c.beginPath();
        cg.c.rect(x+1,y-handSize-1,handSize,handSize);
        cg.c.stroke();
        cg.c.lineWidth = handSize/3;
        cg.c.fillStyle = dev.objectGizmo.style.x;
        cg.c.strokeStyle = dev.objectGizmo.style.x;
        cg.c.beginPath();
        cg.c.moveTo(x,y);
        cg.c.lineTo(x+armLength,y);
        cg.c.lineTo(x+armLength,y-(handSize/3));
        cg.c.lineTo(x+armLength+(handSize/2),y);
        cg.c.lineTo(x+armLength,y+(handSize/3));
        cg.c.lineTo(x+armLength,y);
        cg.c.stroke();
        cg.c.fillStyle = dev.objectGizmo.style.y;
        cg.c.strokeStyle = dev.objectGizmo.style.y;
        cg.c.beginPath();
        cg.c.moveTo(x,y);
        cg.c.lineTo(x,y-armLength);
        cg.c.lineTo(x-(handSize/3),y-armLength);
        cg.c.lineTo(x,y-armLength-(handSize/2));
        cg.c.lineTo(x+(handSize/3),y-armLength);
        cg.c.lineTo(x,y-armLength);
        cg.c.stroke();
      } else if (dev.objectGizmo.mode=="scale") {
        cg.c.strokeStyle = dev.objectGizmo.style.other;
        cg.c.lineWidth = handSize/4;
        cg.c.beginPath();
        cg.c.rect(x+1,y-handSize-1,handSize,handSize);
        cg.c.stroke();
        cg.c.lineWidth = handSize/3;
        cg.c.fillStyle = dev.objectGizmo.style.x;
        cg.c.strokeStyle = dev.objectGizmo.style.x;
        cg.c.beginPath();
        cg.c.moveTo(x,y);
        cg.c.lineTo(x+armLength,y);
        cg.c.stroke();
        cg.c.fillRect(x+armLength-(handSize/2),y-(handSize/2),handSize,handSize);
        cg.c.fillStyle = dev.objectGizmo.style.y;
        cg.c.strokeStyle = dev.objectGizmo.style.y;
        cg.c.beginPath();
        cg.c.moveTo(x,y);
        cg.c.lineTo(x,y-armLength);
        cg.c.stroke();
        cg.c.fillRect(x-(handSize/2),y-armLength-(handSize/2),handSize,handSize);
      } else if (dev.objectGizmo.mode=="rotate") {
        cg.c.strokeStyle = dev.objectGizmo.style.other;
        cg.c.lineWidth = handSize;
        cg.c.globalAlpha = 0.6;
        cg.c.beginPath();
        cg.c.arc(x,y,armLength,0,Math.PI*2);
        cg.c.stroke();
        cg.c.globalAlpha = 1;
      }
    }

    // BEGIN GIZMO TRANSFORMATIONS
    if (dev.frameLClick&&dev.objectGizmo.selected!==null) {
      let selected = dev.objectGizmo.selected;
      let x = selected.Transform.x+selected.Transform.ox+selected.Transform.ax;
      let y = selected.Transform.y+selected.Transform.oy+selected.Transform.ay;
      if (dev.objectGizmo.mode=="translate"||dev.objectGizmo.mode=="scale") {
        let biAxisRect = {left:x,top:y-handSize/cg.z,width:handSize/cg.z+2,height:handSize/cg.z+2};
        if (curX>biAxisRect.left && curX<biAxisRect.left+biAxisRect.width && curY>biAxisRect.top && curY<biAxisRect.top+biAxisRect.height) {
          dev.objectGizmo.biAxisMove = true;
        } else if (curX>x-2 && curX<x+(armLength+handSize)/cg.z+2 && curY>y-4 && curY<y+4) {
          dev.objectGizmo.xAxisMove = true;
        } else if (curY<y-2 && curY>y-(armLength+handSize)/cg.z-2 && curX>x-4 && curX<x+4) {
          dev.objectGizmo.yAxisMove = true;
        }
        if (dev.objectGizmo.biAxisMove||dev.objectGizmo.xAxisMove||dev.objectGizmo.yAxisMove) {
          dev.objectGizmo.downPos = [curX,curY];
          dev.objectGizmo.originalObjectPosition = [selected.Transform.x,selected.Transform.y];
          dev.objectGizmo.originalObjectScale = [selected.Transform.sx,selected.Transform.sy];
        }
      } else if (dev.objectGizmo.mode=="rotate") {
        let distance = Math.sqrt((curX-x)**2+(curY-y)**2)*cg.z;
        if (distance<armLength+handSize/2&&distance>armLength-handSize/2) {
          dev.objectGizmo.rotationMove = true;
          dev.objectGizmo.downPos = [curX,curY];
          dev.objectGizmo.originalObjectRotation = selected.Transform.r;
        }
      }
    }

    // UPDATE OBJECT VALUES (by transformation)
    if (dev.objectGizmo.selected!==null) {
      let selected = dev.objectGizmo.selected;
      let oos = dev.objectGizmo.originalObjectScale;
      let oop = dev.objectGizmo.originalObjectPosition;
      let x = selected.Transform.x+selected.Transform.ox+selected.Transform.ax;
      let y = selected.Transform.y+selected.Transform.oy+selected.Transform.ay;

      let text = "";

      if (dev.objectGizmo.mode=="translate"&&dev.objectGizmo.biAxisMove) {
        selected.Transform.x = oop[0]+(curX-dev.objectGizmo.downPos[0]);
        selected.Transform.y = oop[1]+(curY-dev.objectGizmo.downPos[1]);
        text = "x: " + selected.Transform.x.toFixed(2) + " y: " + selected.Transform.y.toFixed(2);
      } else if (dev.objectGizmo.mode=="translate"&&dev.objectGizmo.xAxisMove) {
        let selected = dev.objectGizmo.selected;
        selected.Transform.x = oop[0]+(curX-dev.objectGizmo.downPos[0]);
        text = "x: " + selected.Transform.x.toFixed(2) + " moved: " + (curX-dev.objectGizmo.downPos[0]).toFixed(2);
      } else if (dev.objectGizmo.mode=="translate"&&dev.objectGizmo.yAxisMove) {
        let selected = dev.objectGizmo.selected;
        selected.Transform.y = oop[1]+(curY-dev.objectGizmo.downPos[1]);
        text = "y: " + selected.Transform.y.toFixed(2) + " moved: " + (curY-dev.objectGizmo.downPos[1]).toFixed(2);
      }

      if (dev.objectGizmo.mode=="translate"&&(dev.objectGizmo.biAxisMove||dev.objectGizmo.xAxisMove||dev.objectGizmo.yAxisMove)) {
        if (selected.RigidBody!==undefined) {
          selected.RigidBody.xv = 0;
          selected.RigidBody.yv = 0;
        }
      }

      if (dev.objectGizmo.mode=="scale"&&dev.objectGizmo.biAxisMove) {
        selected.Transform.sx = oos[0]*(((curX-dev.objectGizmo.downPos[0])/handSize)+1);
        selected.Transform.sy = oos[1]*(((-(curY-dev.objectGizmo.downPos[1]))/handSize)+1);
        text = "sx: " + selected.Transform.sx.toFixed(2) + " sy: " + selected.Transform.sy.toFixed(2);
      } else if (dev.objectGizmo.mode=="scale"&&dev.objectGizmo.xAxisMove) {
        let selected = dev.objectGizmo.selected;
        selected.Transform.sx = oos[0]*(((curX-dev.objectGizmo.downPos[0])/handSize)+1);
        text = "sx: " + selected.Transform.sx.toFixed(2);
      } else if (dev.objectGizmo.mode=="scale"&&dev.objectGizmo.yAxisMove) {
        let selected = dev.objectGizmo.selected;
        selected.Transform.sy = oos[1]*(((-(curY-dev.objectGizmo.downPos[1]))/handSize)+1);
        text = "sy: " + selected.Transform.sy.toFixed(2);
      }

      if (dev.objectGizmo.biAxisMove||dev.objectGizmo.xAxisMove||dev.objectGizmo.yAxisMove) {
        if (dev.objectGizmo.modifiedObjects.indexOf(selected.id)==-1) { dev.objectGizmo.modifiedObjects.push(selected.id) }
      }

      if (dev.objectGizmo.rotationMove) {
        let angle = Math.atan2(curY-y,curX-x);
        let startAngle = Math.atan2(dev.objectGizmo.downPos[1]-y,dev.objectGizmo.downPos[0]-x);
        let offset = (angle-startAngle)*180/Math.PI;
        // console.log(startAngle,angle,dev.objectGizmo.downPos,[curX,curY])
        dev.objectGizmo.lastObjectRotation = offset;
        let rotation = dev.objectGizmo.originalObjectRotation+offset
        if (ChoreoGraph.Input.keyStates[dev.objectGizmo.snapHotkey]) {
          rotation = Math.round(rotation/dev.objectGizmo.rotationSnap)*dev.objectGizmo.rotationSnap;
        }
        if (rotation<0) {
          rotation += 360;
        }
        selected.Transform.r = rotation;
        text = "r: " + selected.Transform.r.toFixed(2);
        
        if (dev.objectGizmo.modifiedObjects.indexOf(selected.id)==-1) { dev.objectGizmo.modifiedObjects.push(selected.id) }
      }

      if (text!="") {
        cg.c.fillStyle = "black";
        cg.c.globalAlpha = 0.3;
        cg.c.font = "18px Arial";
        cg.c.textAlign = "left";
        cg.c.textBaseline = "bottom";
        cg.c.fillRect(0,0,40+cg.c.measureText(text).width,38);
        cg.c.globalAlpha = 1;
        cg.c.fillStyle = "white";
        cg.c.fillText(text,20,28);
      
        if (dev.objectGizmo.modifiedObjects.length>0) {
          let edits = "";
          for (let objectId of dev.objectGizmo.modifiedObjects) {
            let objT = cg.objects[objectId].Transform;
            let edit = objectId + " ";
            if (objT.x!=0) { edit += "x:" + Math.round(objT.x*100)/100 + ","; }
            if (objT.y!=0) { edit += "y:" + Math.round(objT.y*100)/100 + ","; }
            if (objT.r!=0) { edit += "r:" + Math.round(objT.r*100)/100 + ","; }
            if (objT.sx!=1) { edit += "sx:" + Math.round(objT.sx*100)/100 + ","; }
            if (objT.sy!=1) { edit += "sy:" + Math.round(objT.sy*100)/100 + ","; }
            if (edit!=objectId + " ") {
              edit = edit.substring(0, edit.length-1);
            }
            edit += "<br>";
            edits += edit;
          }
          ChoreoGraph.Develop.interface.interactives.objectGizmoEdits.innerHTML = edits;
        }
      }
      if (dev.frameKeyPress) {
        if (ChoreoGraph.Input.lastKey==dev.objectGizmo.undoHotkey) {
          if (dev.objectGizmo.mode=="translate") {
            selected.Transform.x = oop[0];
            selected.Transform.y = oop[1];
          } else if (dev.objectGizmo.mode=="scale") {
            selected.Transform.sx = oos[0];
            selected.Transform.sy = oos[1];
          }
        } else if (ChoreoGraph.Input.lastKey==dev.objectGizmo.swapModeHotkey) {
          if (dev.objectGizmo.mode=="translate") {
            dev.objectGizmo.mode = "rotate";
          } else if (dev.objectGizmo.mode=="rotate") {
            dev.objectGizmo.mode = "scale";
          } else if (dev.objectGizmo.mode=="scale") {
            dev.objectGizmo.mode = "translate";
          }
        }
      }
    }

    cg.c.lineWidth = 1;
    cg.c.strokeStyle = dev.objectGizmo.style.other;
    let closestDistance = Infinity;
    let closestObject = null;
    cg.c.beginPath();
    for (let objectId in cg.objects) {
      if (dev.objectGizmo.selected!==null&&objectId==dev.objectGizmo.selected.id) { continue; }
      let object = cg.objects[objectId];
      let screenX = cg.getTransX(object.Transform.x);
      let screenY = cg.getTransY(object.Transform.y);
      cg.c.moveTo(screenX+selectionDistance,screenY);
      cg.c.arc(screenX,screenY,selectionDistance,0,Math.PI*2);
      let distance = Math.sqrt(((object.Transform.x-curX)**2)+((object.Transform.y-curY)**2));
      if (distance<closestDistance) {
        closestDistance = distance;
        closestObject = object;
      }
    }
    cg.c.stroke();
    if (closestDistance*cg.z<selectionDistance) {
      cg.c.beginPath();
      let screenX = cg.getTransX(closestObject.Transform.x);
      let screenY = cg.getTransY(closestObject.Transform.y);
      cg.c.moveTo(screenX,screenY);
      cg.c.lineTo(ChoreoGraph.Input.cursor.x,ChoreoGraph.Input.cursor.y);
      cg.c.strokeStyle = dev.objectGizmo.style.other;
      cg.c.stroke();
      if (dev.frameLClick) {
        dev.objectGizmo.selected = closestObject;
      }
    }
  }
  setupAnimationGraph(dev) {
    if (dev.animationEditor.cnvs!==null) { return; }
    dev.interface.interactives.animationGraph.style = "display:block;";
    dev.interface.interactives.animationGraph.width = document.body.clientWidth-40;
    dev.interface.interactives.animationGraph.height = 500;
    dev.animationEditor.ctx = dev.interface.interactives.animationGraph.getContext("2d");
    dev.interface.interactives.animationGraph.addEventListener("mousemove", this.animationGraphMouseMove, false);
    dev.interface.interactives.animationGraph.addEventListener("mousedown", this.animationGraphMouseDown, false);
    dev.interface.interactives.animationGraph.addEventListener("mouseup", this.animationGraphMouseUp, false);
    dev.interface.interactives.animationGraph.addEventListener("wheel", this.animationGraphWheel, false);
    dev.interface.interactives.animationEditorDropdown.innerHTML = "";
    for (let anim in cg.animations) {
      let option = document.createElement("option");
      option.text = cg.animations[anim].id;
      dev.interface.interactives.animationEditorDropdown.add(option);
    }
    dev.interface.interactives.animationEditorDropdown.onchange = (e) => {
      dev.animationEditor.selectedAnimation = cg.animations[e.target.value];
    }
  }
  animationGraphMouseMove(e) {
    let dev = ChoreoGraph.Develop;
    let cw = dev.interface.interactives.animationGraph.width;
    let ch = dev.interface.interactives.animationGraph.height;
    let boundBox = dev.interface.interactives.animationGraph.getBoundingClientRect();
    dev.animationEditor.cursorPos[0] = Math.floor(((e.clientX-boundBox.left)/boundBox.width)*cw);
    dev.animationEditor.cursorPos[1] = Math.floor(((e.clientY-boundBox.top)/boundBox.height)*ch);
    
    if (dev.animationEditor.panning) {
      let valuesPerPixel = (dev.animationEditor.yMax-dev.animationEditor.yMin)/ch;
      let distanceX = dev.animationEditor.panningStart[0]-dev.animationEditor.cursorPos[0];
      let distanceY = dev.animationEditor.panningStart[1]-dev.animationEditor.cursorPos[1];
      dev.animationEditor.yMin = Math.round(dev.animationEditor.panningYMinLast - distanceY*valuesPerPixel);
      dev.animationEditor.yMax = Math.round(dev.animationEditor.panningYMaxLast - distanceY*valuesPerPixel);
      dev.animationEditor.startTime = Math.round(dev.animationEditor.panningStartTimeLast + (distanceX/dev.animationEditor.timeScale));
    }

    if (dev.animationEditor.selectedAnimation==null) { return; }
    if (dev.animationEditor.selected[0]) {
      let cp = dev.animationEditor.selected;
      let bakedKeyframe = dev.animationEditor.selectedAnimation.data[cp[1]];
      let rawKeyframe = dev.animationEditor.selectedAnimation.rawData[cp[1]];

      let cw = dev.interface.interactives.animationGraph.width;
      let ch = dev.interface.interactives.animationGraph.height;
      // The location of the mouse cursor scaled to be within yMax and yMin where yMax is at 0 on the cursor Y value
      let newYvalue = dev.animationEditor.yMax-((e.offsetY/ch)*(dev.animationEditor.yMax-dev.animationEditor.yMin));
      newYvalue = Math.round(newYvalue*100)/100;
      rawKeyframe[cp[2]] = newYvalue;
      bakedKeyframe[cp[2]] = newYvalue;

      if (dev.animationEditor.modifiedAnimations.indexOf(dev.animationEditor.selectedAnimation.id)==-1) { dev.animationEditor.modifiedAnimations.push(dev.animationEditor.selectedAnimation.id); }

      if (cp[3]) { // Is Time Constrained
        let durationBefore = 0;
        for (let part in dev.animationEditor.selectedAnimation.data) {
          if (part==cp[1]) { break; }
          let keyframe = dev.animationEditor.selectedAnimation.data[part];
          durationBefore += keyframe[dev.animationEditor.selectedAnimation.timeKey];
        }
        let timeKey = dev.animationEditor.selectedAnimation.timeKey;
        let newTimeValue = (e.offsetX/dev.animationEditor.timeScale)+dev.animationEditor.startTime;
        timeKey = Math.round(timeKey*100)/100;
        newTimeValue -= durationBefore;
        newTimeValue = Math.max(0,newTimeValue);
        rawKeyframe[timeKey] = newTimeValue;
        bakedKeyframe[timeKey] = newTimeValue;
      }
    }
  }
  animationGraphMouseDown(e) {
    let dev = ChoreoGraph.Develop;
    if (!dev.animationEditor.selected[0]) {
      dev.animationEditor.panning = true;
      dev.animationEditor.panningStart = [dev.animationEditor.cursorPos[0],dev.animationEditor.cursorPos[1]];
      dev.animationEditor.panningStartTimeLast = dev.animationEditor.startTime;
      dev.animationEditor.panningYMinLast = dev.animationEditor.yMin;
      dev.animationEditor.panningYMaxLast = dev.animationEditor.yMax;
    }
    if (dev.animationEditor.selectedAnimation==null) { return; }
    for (let i=0;i<dev.animationEditor.controlPoints.length;i++) {
      let cp = dev.animationEditor.controlPoints[i];
      let distance = Math.sqrt((cp[0]-e.offsetX)**2+(cp[1]-e.offsetY)**2);
      if (distance<8) {
        dev.animationEditor.selected = [true,cp[2],cp[3],cp[4]];
        dev.animationEditor.panning = false;
        break;
      }
    }
  }
  animationGraphMouseUp(e) {
    let dev = ChoreoGraph.Develop;
    dev.animationEditor.panning = false;
    dev.animationEditor.selected = [false];
    if (dev.animationEditor.selectedAnimation==null) { return; }
    dev.animationEditor.selectedAnimation.setUp();
    let edits = "";
    for (let i=0;i<dev.animationEditor.modifiedAnimations.length;i++) {
      let anim = cg.animations[dev.animationEditor.modifiedAnimations[i]];
      edits += anim.id + " ["
      for (let part in anim.rawData) {
        let keyframe = Array.from(anim.rawData[part]);
        edits += "[" + keyframe.join(",") + "],";
      }
      edits = edits.slice(0, -1);
      edits+="]<br>";
    }
    ChoreoGraph.Develop.interface.interactives.animationGraphEdits.innerHTML = edits;
  }
  animationGraphWheel(e) {
    let dev = ChoreoGraph.Develop;
    e.preventDefault();
    let showedValues = dev.animationEditor.yMax-dev.animationEditor.yMin;
    let magnitude = e.deltaY*dev.animationEditor.scrollSpeed*(showedValues/dev.interface.interactives.animationGraph.height);
    if (ChoreoGraph.Input.keyStates[dev.animationEditor.swapZoomHotkey]) {
      dev.animationEditor.timeScale += magnitude/100;
      dev.animationEditor.timeScale = Math.max(0.5,dev.animationEditor.timeScale);
    } else {
      let topToBottom = dev.animationEditor.cursorPos[1]/dev.interface.interactives.animationGraph.height;
      dev.animationEditor.yMax += magnitude*topToBottom;
      dev.animationEditor.yMin -= magnitude*(1-topToBottom);
    }
  }
  animationEditorLoop(dev,cg) {
    if (dev.animationEditor.ctx==null) { dev.setupAnimationGraph(dev); }
    let c = dev.animationEditor.ctx;
    let cw = dev.interface.interactives.animationGraph.width;
    let ch = dev.interface.interactives.animationGraph.height;
    c.fillStyle = "#111111";
    c.fillRect(0,0,cw,ch);

    let startTime = dev.animationEditor.startTime;
    let timeScale = dev.animationEditor.timeScale; // pixels per second
    let yMax = dev.animationEditor.yMax;
    let yMin = dev.animationEditor.yMin;

    let verticalQuality = 100;
    if (yMax-yMin<50000*3) { verticalQuality = 500; }
    if (yMax-yMin<1000*3) { verticalQuality = 100; }
    if (yMax-yMin<500*3) { verticalQuality = 50; }
    if (yMax-yMin<100*3) { verticalQuality = 10; }
    if (yMax-yMin<10*3) { verticalQuality = 5; }
    if (yMax-yMin<5*3) { verticalQuality = 1; }

    let horizontalQuality = 1;
    if (timeScale<cw/5) { horizontalQuality = 1; }
    if (timeScale<cw/10) { horizontalQuality = 5; }
    if (timeScale<cw/50) { horizontalQuality = 10; }
    if (timeScale<cw/100) { horizontalQuality = 50; }
    if (timeScale<cw/500) { horizontalQuality = 100; }
    if (timeScale<cw/1000) { horizontalQuality = 500; }

    c.fillStyle = "#ffffff";
    c.strokeStyle = "#ffffff";
    c.font = "10px Arial";
    c.textAlign = "left";
    c.textBaseline = "middle";
    let roundedYMin = Math.round(yMin);
    let roundedYMax = Math.round(yMax);
    for (let i=roundedYMin;i<=roundedYMax;i++) {
      if (i%verticalQuality!=0||i==0) { continue; }
      let y = ch-((i-yMin)/(yMax-yMin)*ch);
      c.beginPath();
      c.moveTo(0,y);
      c.lineTo(5,y);
      c.stroke();
      c.fillText(i,7,y);
    }

    // The Y value that represents 0 if yMax is at 0 and yMin is at ch
    let zeroHeight = ch/(yMax-yMin)*yMax;

    c.strokeStyle = "#cccccc";
    let shownSeconds = Math.floor(cw/timeScale)+horizontalQuality;
    for (let i=startTime;i<shownSeconds;i++) {
      if (i%horizontalQuality!=0) { continue; }
      let x = i*timeScale;
      c.beginPath();
      c.moveTo(x-startTime*timeScale,zeroHeight);
      c.lineTo(x-startTime*timeScale,zeroHeight-5);
      c.stroke();
      c.textBaseline = "top";
      c.textAlign = "center";
      c.fillText(i,x-startTime*timeScale,zeroHeight+3);
    }

    c.beginPath();
    c.moveTo(0,zeroHeight);
    c.lineTo(cw,zeroHeight);
    c.strokeStyle = "#ffffff";
    c.stroke();

    let selAnim = dev.animationEditor.selectedAnimation;
    if (selAnim==null) { return; }
    dev.animationEditor.controlPoints = [];
    let colours = ["#deffb8","#ffedb3","#ffa599","#9cffe3","#d4a6ff","#ffb5dd"]
    let coloursUsed = 0;
    for (let key in selAnim.keys) {
      let collectiveTime = 0;
      if (key==selAnim.timeKey) { continue; }
      c.strokeStyle = colours[coloursUsed%colours.length];
      coloursUsed++;
      c.beginPath();
      for (let part in selAnim.data) {
        if (typeof selAnim.data[part][0]!="number") { continue; }
        let bakedKeyframe = selAnim.data[part];
        let rawKeyframe;
        if (selAnim.rawData.length==1&&part==1) {
          rawKeyframe = selAnim.rawData[0];
        } else {
          rawKeyframe = selAnim.rawData[part];
        }
        let time = selAnim.data[part][selAnim.timeKey];
        let isTimeConstrained = rawKeyframe[selAnim.timeKey]!=undefined;
        collectiveTime += time;
        let bakedValue = bakedKeyframe[key];
        let rawValue = rawKeyframe[key];
        let yValue = zeroHeight;
        if (typeof bakedValue=="number") {
          yValue = zeroHeight-(bakedValue/(yMax-yMin)*ch);
        }
        let isValueConstrained = rawValue!=undefined;
        dev.animationEditor.controlPoints.push([(collectiveTime-startTime)*timeScale,yValue,part,key,isTimeConstrained,isValueConstrained]); // x,y,part,key
        if (part==0) {
          c.moveTo((collectiveTime-startTime)*timeScale,yValue);
        } else {
          c.lineTo((collectiveTime-startTime)*timeScale,yValue);
        }
      }
      c.stroke();
    }

    for (let cp of dev.animationEditor.controlPoints) {
      if (!cp[5]) {
        c.strokeStyle = "#00ffff"; // Unconstrained
      } else if (cp[4]) {
        c.strokeStyle = "#00ff00"; // Dual Constrained
      } else {
        c.strokeStyle = "#ff0000"; // Value Constrained
      }
      c.beginPath();
      let radius = 6;
      if (!cp[5]) { radius = 4; } // Not value constrained
      c.arc(cp[0],cp[1],radius,0,Math.PI*2);
      if (c.strokeStyle=="#00ff00") {
        c.moveTo(cp[0]-radius-3,cp[1]);
        c.lineTo(cp[0]+radius+3,cp[1]);
        c.moveTo(cp[0],cp[1]-radius-3);
        c.lineTo(cp[0],cp[1]+radius+3);
      } else if (c.strokeStyle=="#ff0000") {
        c.moveTo(cp[0],cp[1]-radius-3);
        c.lineTo(cp[0],cp[1]+radius+3);
      }
      c.stroke();
    }
  }
  objectPlacerLoop(dev,cg) {
    if (dev.objectPlacer.newObject!=null) {
      dev.objectPlacer.newObject.Transform.x = cg.getTransXreverse(ChoreoGraph.Input.cursor.x);
      dev.objectPlacer.newObject.Transform.y = cg.getTransYreverse(ChoreoGraph.Input.cursor.y);
    }
    let cursorOnCanvas = ChoreoGraph.Input.cursor.x>0&&ChoreoGraph.Input.cursor.x<cg.cw&&ChoreoGraph.Input.cursor.y>0&&ChoreoGraph.Input.cursor.y<cg.ch;
    if (dev.frameLClick&&!ChoreoGraph.Input.keyStates[dev.cameraController.hotkey]&&cursorOnCanvas) {
      if (dev.objectPlacer.selectedButton==null) {
        dev.objectPlacer.newObject = null;
      } else {
        let objectType = dev.objectPlacer.selectedButton.CGObjectPrototype.name;
        if (dev.objectPlacer.createdObjects[objectType]===undefined) { dev.objectPlacer.createdObjects[objectType] = []; }
        dev.objectPlacer.createdObjects[objectType].push(dev.objectPlacer.newObject);

        // Create Info Dump
        let info = "";
        for (let objectType in dev.objectPlacer.createdObjects) {
          info += objectType + ": ";
          for (let object of dev.objectPlacer.createdObjects[objectType]) {
            info += "["+Math.floor(object.Transform.x) + "," + Math.floor(object.Transform.y) + "],";
          }
          info = info.slice(0,-1);
          info += "<br>";
        }
        dev.interface.interactives.objectPlacerCreations.innerHTML = info;

        dev.objectPlacer.newObject = dev.objectPlacer.selectedButton.CGObjectPrototype.createFunction(cg.getTransXreverse(ChoreoGraph.Input.cursor.x),cg.getTransYreverse(ChoreoGraph.Input.cursor.y));
      }
    }
  }
  createObjectPlacerPrototypeButtons() {
    ChoreoGraph.Develop.interface.interactives.objectPlacer.innerHTML = "";
    for (let proto of Object.entries(ChoreoGraph.Develop.objectPlacer.prototypes)) {
      let button = document.createElement("button");
      let baseStyle = "width:100px;height:100px;background:none;padding:0;cursor:pointer;display:inline-block;position:relative;margin:5px;border-radius:6px;";
      button.style = baseStyle+"border:2px solid white;";
      button.type = "button";
      button.CGObjectPrototype = proto[1];
      button.onclick = function(){
        this.style = baseStyle+"border:2px solid green;";
        if (ChoreoGraph.Develop.objectPlacer.selectedButton!==null) {
          ChoreoGraph.Develop.objectPlacer.selectedButton.style = baseStyle+"border:2px solid white;";
        }
        ChoreoGraph.Develop.objectPlacer.selectedButton = this;
        let selectedPrototype = this.CGObjectPrototype;
        if (ChoreoGraph.Develop.objectPlacer.newObject!=null) {
          ChoreoGraph.Develop.objectPlacer.newObject.delete = true;
        }
        ChoreoGraph.Develop.objectPlacer.newObject = selectedPrototype.createFunction(0,0);
      }
      let image = document.createElement("img");
      image.src = proto[1].image.ChoreoGraph.settings.imageDirectory+proto[1].image.file;
      let imagedX = proto[1].image.crop[0];
      let imagedY = proto[1].image.crop[1];
      let imagedW = proto[1].image.crop[2];
      let imagedH = proto[1].image.crop[3];
      let imagerW = proto[1].image.rawWidth;
      let imagerH = proto[1].image.rawHeight;
      let scale = 1;
      if (imagedW>imagedH) {
        scale = imagerW/imagedW;
      } else {
        scale = imagerH/imagedH;
      }
      let aspectW = imagerW/imagerH;
      let aspectH = imagerH/imagerW;
      // Crops the image to fill the 100x100 button
      let imageMargin = 10;
      image.style = "clip-path:inset("+((imagedY/imagerH)*100)+"% "+(((imagerW-imagedX-imagedW)/imagerW)*100)+"% "+(((imagerH-imagedY-imagedH)/imagerH)*100)+"% "+((imagedX/imagerW)*100)+"%);margin:-"+(imagedY*scale)+"px 0 0 -"+(imagedX*scale)+"px;width:"+((100-imageMargin)*aspectW)*scale+"px;height:"+((100-imageMargin)*aspectH)*scale+"px;image-rendering:pixelated;pointer-events:none;position:absolute;top:"+imageMargin/2+";left:"+imageMargin/2+";";
      button.appendChild(image);
      ChoreoGraph.Develop.interface.interactives.objectPlacer.appendChild(button);
    }
  }
  createButton(name,classes,onclick) {
    let button = document.createElement("button");
    button.innerText = name;
    button.className = "develop_button " + classes;
    button.type = "button";
    button.onclick = onclick
    this.interface.section.appendChild(button);
  
    return button;
  }
  runLiveEvaluation() {
    if (ChoreoGraph.Develop.cg===null) { return; }
    try {
      eval(this.interface.interactives.liveEvalInputSpan.innerText);
      if (this.interface.interactives.liveEvalInputSpan.style.display!="none") { this.interface.interactives.liveEvalInputSpan.style = ""; }
      this.interface.interactives.liveEvalError.innerHTML = "";
    } catch (e) {
      this.interface.interactives.liveEvalError.innerHTML = "<br>"+e+"<br>";
      this.interface.interactives.liveEvalInputSpan.style = "outline:3px solid red;";
    }
  }
  createInterface() {
    let sec = this.interface.section;
    sec.appendChild(document.createElement("br"));
    sec.className = "develop_section";
    document.body.appendChild(sec);

    let colOff = this.interface.style.off;
    let colOn = this.interface.style.on;
    let colAction = this.interface.style.action;

    this.interface.styles.innerHTML = ".develop_section { color:white; margin-left: 20px; } .develop_button { background: black; color: white; margin:5px; border: 3px solid white; padding:10px; border-radius:10px; cursor: pointer; } .develop_button:hover { background: #111; } .btn_off { border-color: " + colOff + "; } .btn_on { border-color: " + colOn + "; } .btn_action { border-color: " + colAction + "; } .develop_input { margin:5px; border:0; padding:10px; } .single_input { background: black; color: white; padding: 10px; border: 3px solid " + colAction + "; border-radius: 10px; } .develop_textarea { display: block; margin-left: 20px; width: 50%; overflow: hidden; resize: both; min-height: 40px; padding:10px; background-color: #1f1f1f; font-family: monospace; } .code_keyword { color: #dc98ff; } .code_comment { color: #a3a3a3; font-style: italic; } .code_string { color: #ce9178; } .code_global { color: #ffff00; } .code_number { color: #78ff7f; } .code_function { color: #ff744a; } .live_eval_error { color: red; margin: 10px; } ";
    document.body.appendChild(this.interface.styles);

    
    this.interface.interactives.animationCreatorOutput = document.createElement("div");
    this.interface.section.appendChild(this.interface.interactives.animationCreatorOutput);
    this.interface.interactives.liveEvalInputSpan = document.createElement("span");
    this.interface.interactives.liveEvalInputSpan.setAttribute("contenteditable", "plaintext-only");
    this.interface.interactives.liveEvalInputSpan.role = "textarea";
    this.interface.interactives.liveEvalInputSpan.onblur = function () {    
      var code = ChoreoGraph.Develop.interface.interactives.liveEvalInputSpan.innerText;
      var stringRegex1 = /"(.*?)"/g
      var stringRegex2 = /'(.*?)'/g
      var numberRegex = /\b\d+(\.\d+)?\b/g;
      var keywordRegex = /\b(let|const|var|function|if|else|for|while|return|break|continue)\b/g;
      var jsGlobalRegex = /\b(ChoreoGraph|document|window|Array|String|Object|Number|undefined|this|\$)(?=[^\w])/g;
      var commentRegex = /\/\/.*|\/\*[\s\S]*?\*\//g;
      var functionRegex = /\b\w+\s*(?=\()/g;
      let highlightedCode = code.replace(stringRegex1, '<span class="code_string">$&</span>');
      highlightedCode = highlightedCode.replace(stringRegex2, '<span class="code_string">$&</span>');
      highlightedCode = highlightedCode.replace(numberRegex, '<span class="code_number">$&</span>');
      highlightedCode = highlightedCode.replace(keywordRegex, '<span class="code_keyword">$&</span>');
      highlightedCode = highlightedCode.replace(jsGlobalRegex, '<span class="code_global">$&</span>');
      highlightedCode = highlightedCode.replace(commentRegex, '<span class="code_comment">$&</span>');
      highlightedCode = highlightedCode.replace(functionRegex, '<span class="code_function">$&</span>');
      ChoreoGraph.Develop.interface.interactives.liveEvalInputSpan.innerHTML = highlightedCode;
    }
    this.interface.interactives.liveEvalInputSpan.className = "develop_textarea";
    this.interface.interactives.liveEvalInputSpan.style = "display:none;";
    this.interface.interactives.liveEvalError = document.createElement("span");
    this.interface.interactives.liveEvalError.style = "display:none;";
    this.interface.interactives.liveEvalError.className = "live_eval_error";
    this.interface.section.appendChild(this.interface.interactives.liveEvalInputSpan);
    this.interface.section.appendChild(this.interface.interactives.liveEvalError);
    this.interface.interactives.animationGraph = document.createElement("canvas");
    this.interface.interactives.animationGraph.style = "display:none;";
    this.interface.section.appendChild(this.interface.interactives.animationGraph);
    this.interface.interactives.animationGraphEdits = document.createElement("div");
    this.interface.interactives.animationGraphEdits.style = "font-family:Consolas;";
    this.interface.section.appendChild(this.interface.interactives.animationGraphEdits);
    this.interface.interactives.objectPlacer = document.createElement("div");
    this.interface.interactives.objectPlacer.style = "font-family:Consolas;";
    this.interface.section.appendChild(this.interface.interactives.objectPlacer);
    this.interface.interactives.objectPlacerCreations = document.createElement("div");
    this.interface.interactives.objectPlacerCreations.style = "font-family:Consolas;";
    this.interface.section.appendChild(this.interface.interactives.objectPlacerCreations);
    this.interface.interactives.objectGizmoEdits = document.createElement("div");
    this.interface.interactives.objectGizmoEdits.style = "font-family:Consolas;";
    this.interface.section.appendChild(this.interface.interactives.objectGizmoEdits);
    this.interface.section.appendChild(document.createElement("br"));

    if (ChoreoGraph.plugins.Visualisation!==undefined) {
      this.interface.interactives.showAnimations = this.createButton(ChoreoGraph.plugins.Visualisation.v.animations.active ? "Hide Animations" : "Show Animations",ChoreoGraph.plugins.Visualisation.v.animations.active ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Visualisation.v.animations.active=(!(ChoreoGraph.plugins.Visualisation.v.animations.active));
        this.className = "develop_button " + (ChoreoGraph.plugins.Visualisation.v.animations.active ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Visualisation.v.animations.active ? "Hide Animations" : "Show Animations";
      });
      this.interface.interactives.showButtons = this.createButton(ChoreoGraph.plugins.Visualisation.v.buttons.active ? "Hide Buttons" : "Show Buttons",ChoreoGraph.plugins.Visualisation.v.buttons.active ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Visualisation.v.buttons.active=(!(ChoreoGraph.plugins.Visualisation.v.buttons.active));
        this.className = "develop_button " + (ChoreoGraph.plugins.Visualisation.v.buttons.active ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Visualisation.v.buttons.active ? "Hide Buttons" : "Show Buttons";
      });
      this.interface.interactives.showObjectAnnotation = this.createButton(ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active ? "Hide Object Annotation" : "Show Object Annotation",ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active=(!(ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active));
        this.className = "develop_button " + (ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active ? "Hide Object Annotation" : "Show Object Annotation";
      });
      this.interface.interactives.showBlocks = this.createButton(ChoreoGraph.plugins.Visualisation.v.blocks.active ? "Hide Blocks" : "Show Blocks",ChoreoGraph.plugins.Visualisation.v.blocks.active ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Visualisation.v.blocks.active=(!(ChoreoGraph.plugins.Visualisation.v.blocks.active));
        this.className = "develop_button " + (ChoreoGraph.plugins.Visualisation.v.blocks.active ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Visualisation.v.blocks.active ? "Hide Blocks" : "Show Blocks";
      });
      this.interface.interactives.showCamera = this.createButton(ChoreoGraph.plugins.Visualisation.v.camera.active ? "Hide Camera" : "Show Camera",ChoreoGraph.plugins.Visualisation.v.camera.active ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Visualisation.v.camera.active=(!(ChoreoGraph.plugins.Visualisation.v.camera.active));
        this.className = "develop_button " + (ChoreoGraph.plugins.Visualisation.v.camera.active ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Visualisation.v.camera.active ? "Hide Camera" : "Show Camera";
      });
    }
    if (ChoreoGraph.plugins.Physics!==undefined) {
      this.interface.interactives.showColliders = this.createButton(ChoreoGraph.plugins.Physics.settings.showColliders ? "Hide Colliders" : "Show Colliders",ChoreoGraph.plugins.Physics.settings.showColliders ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Physics.settings.showColliders=(!(ChoreoGraph.plugins.Physics.settings.showColliders));
        this.className = "develop_button " + (ChoreoGraph.plugins.Physics.settings.showColliders ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Physics.settings.showColliders ? "Hide Colliders" : "Show Colliders";
      });
    }
    if (ChoreoGraph.plugins.Lighting!==undefined) {
      this.interface.interactives.showOccluders = this.createButton(ChoreoGraph.plugins.Physics.settings.showColliders ? "Hide Occluders" : "Show Occluders",ChoreoGraph.plugins.Physics.settings.showColliders ? "btn_on" : "btn_off",
      function(){
        ChoreoGraph.plugins.Lighting.drawOccluders=(!(ChoreoGraph.plugins.Lighting.drawOccluders));
        this.className = "develop_button " + (ChoreoGraph.plugins.Lighting.drawOccluders ? "btn_on" : "btn_off");
        this.innerText = ChoreoGraph.plugins.Lighting.drawOccluders ? "Hide Occluders" : "Show Occluders";
      });
    }
    this.interface.interactives.realtimeToggle = this.createButton("Realtime",ChoreoGraph.settings.realtime ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.settings.realtime=(!(ChoreoGraph.settings.realtime));
      this.className = "develop_button " + (ChoreoGraph.settings.realtime ? "btn_on" : "btn_off");
      ChoreoGraph.Develop.interface.interactives.nextFrame.style = ChoreoGraph.realtime ? "display:none;" : "";
    });
    this.interface.interactives.nextFrame = this.createButton("Next Frame","btn_action",
    function(){
      ChoreoGraph.settings.nextFrame = true;
    });
    ChoreoGraph.Develop.interface.interactives.nextFrame.style = ChoreoGraph.settings.realtime ? "display:none;" : "";
    this.interface.interactives.showLiveEvaluation = this.createButton("Show Live Evaluation","btn_action",
    function(){
      ChoreoGraph.Develop.interface.interactives.liveEvalInputSpan.style = "";
      ChoreoGraph.Develop.interface.interactives.liveEvalError.style = "";
      ChoreoGraph.Develop.interface.interactives.showLiveEvaluation.style = "display:none;";
    });
    this.interface.interactives.animationEditor = this.createButton("Animation Editor",this.features.animationEditor ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.animationEditor=(!(ChoreoGraph.Develop.features.animationEditor));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.animationEditor ? "btn_on" : "btn_off");

      if (ChoreoGraph.Develop.features.animationEditor==false) {
        ChoreoGraph.Develop.animationEditor.ctx = null;
        ChoreoGraph.Develop.interface.interactives.animationGraph.style = "display:none;";
      }
    });
    this.interface.interactives.animationEditorDropdown = document.createElement("select");
    this.interface.interactives.animationEditorDropdown.className = "develop_button";
    this.interface.section.appendChild(this.interface.interactives.animationEditorDropdown);
    this.interface.section.appendChild(document.createElement("br"));
    this.interface.interactives.animationCreator = this.createButton("Animation Creator",this.features.animationCreator ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.animationCreator=(!(ChoreoGraph.Develop.features.animationCreator));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.animationCreator ? "btn_on" : "btn_off");
    });
    this.interface.interactives.closestFrameLocator = this.createButton("Closest Frame Locator",this.features.closestFrameLocator ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.closestFrameLocator=(!(ChoreoGraph.Develop.features.closestFrameLocator));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.closestFrameLocator ? "btn_on" : "btn_off");
    });
    this.interface.interactives.cameraController = this.createButton("Camera Controller",this.features.cameraController ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.cameraController=(!(ChoreoGraph.Develop.features.cameraController));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.cameraController ? "btn_on" : "btn_off");
      
      if (ChoreoGraph.Develop.features.cameraController) {
        ChoreoGraph.Develop.cameraController.wasUsingCamera = ChoreoGraph.Develop.cg.settings.useCamera;
        ChoreoGraph.Develop.cg.settings.useCamera = false;
      } else {
        ChoreoGraph.Develop.cg.settings.useCamera = ChoreoGraph.Develop.cameraController.wasUsingCamera;
      }
    });
    this.interface.interactives.resetCamera = this.createButton("Reset Camera","btn_action",
    function(){
      ChoreoGraph.Develop.cg.x = 0;
      ChoreoGraph.Develop.cg.y = 0;
      ChoreoGraph.Develop.cg.z = 1;
    });
    this.interface.interactives.objectGizmo = this.createButton("Object Gizmo",this.features.objectGizmo ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.objectGizmo=(!(ChoreoGraph.Develop.features.objectGizmo));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.objectGizmo ? "btn_on" : "btn_off");
    });
    this.interface.interactives.objectGizmo = this.createButton("Object Placer",this.features.objectGizmo ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.objectPlacer=(!(ChoreoGraph.Develop.features.objectPlacer));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.objectPlacer ? "btn_on" : "btn_off");
      if (ChoreoGraph.Develop.features.objectPlacer) {
        ChoreoGraph.Develop.interface.interactives.objectPlacer.style = "display:block;";
        ChoreoGraph.Develop.createObjectPlacerPrototypeButtons();
      } else {
        ChoreoGraph.Develop.interface.interactives.objectPlacer.style = "display:none;";
        ChoreoGraph.Develop.objectPlacer.selectedButton = null;
      }
    });
    this.interface.interactives.showConsoleOverlay = this.createButton("Console Overlay",this.features.consoleOverlay ? "btn_on" : "btn_off",
    function(){
      if (!ChoreoGraph.Develop.consoleOverlay.connected) { ChoreoGraph.Develop.connectConsole(ChoreoGraph.Develop); }
      ChoreoGraph.Develop.features.consoleOverlay=(!(ChoreoGraph.Develop.features.consoleOverlay));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.consoleOverlay ? "btn_on" : "btn_off");
    });
    this.interface.interactives.showConsoleOverlaySource = this.createButton("Console Sources",this.consoleOverlay.showSource ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.consoleOverlay.showSource=(!(ChoreoGraph.Develop.consoleOverlay.showSource));
      this.className = "develop_button " + (ChoreoGraph.Develop.consoleOverlay.showSource ? "btn_on" : "btn_off");
    });
    this.interface.interactives.showFPS = this.createButton(ChoreoGraph.Develop.features.fps ? "Hide FPS" : "Show FPS",this.features.fps ? "btn_on" : "btn_off",
    function(){
      ChoreoGraph.Develop.features.fps=(!(ChoreoGraph.Develop.features.fps));
      this.className = "develop_button " + (ChoreoGraph.Develop.features.fps ? "btn_on" : "btn_off");
      this.innerText = ChoreoGraph.Develop.features.fps ? "Hide FPS" : "Show FPS";
    });
    this.interface.interactives.evalButton = this.createButton("Evaluate","btn_action",
    function(){
      console.info(ChoreoGraph.Develop.interface.interactives.evalInput.value); console.log(eval(ChoreoGraph.Develop.interface.interactives.evalInput.value));
    });
    this.interface.interactives.evalInput = document.createElement("input");
    this.interface.interactives.evalInput.type = "input";
    this.interface.interactives.evalInput.placeholder = "evaluation code here";
    this.interface.interactives.evalInput.className = "develop_input";
    this.interface.interactives.evalInput.className = "single_input";
    this.interface.section.appendChild(this.interface.interactives.evalInput);

    this.interface.section.appendChild(document.createElement("br"));
    this.interface.section.appendChild(document.createElement("br"));
    this.interface.section.appendChild(document.createElement("br"));
  }
}
// Willby - 2024