const ChoreoGraph = new class ChoreoGraphEngine {
  VERSION = "3.2.0";
  instances = [];
  settings = {
    maxFPS : Infinity,
    pauseWhenUnfocused : false, // Pause when document.hasFocus() is false
    pauseWhenOffscreen : false, // Pause when any cgCanvas is offscreen
    pauseLoop : false, // Pause the loop
    storeProcessTime : false, // Saves the milliseconds it takes to process the frame
  };

  started = false;
  frame = 0;
  lastPerformanceTime = performance.now();
  now = new Date();
  nowint = new Date().getTime();
  timeDelta = 0;
  processTime = -1;

  plugins = {};
  globalBeforeLoops = [];
  globalAfterLoops = [];

  Instance = class ChoreoGraphInstance {
    settings = {};

    canvases = {};
    cameras = {};
    scenes = {};
    graphics = {};
    transforms = {};
    images = {};
    sequences = {};
    events = {};
    paths = {};
    objects = {};

    keys = {
      canvases : [],
      cameras : [],
      scenes : [],
      graphics : [],
      transforms : [],
      images : [],
      sequences : [],
      events : [],
      paths : [],
      objects : []
    };

    disabled = false;
    clock = 0;
    timeSinceLastFrame = 0;
    lastUpdate = ChoreoGraph.nowint;
    ready = false;
    loadChecks = [];

    graphicTypes = {};

    processLoops = [];
    predrawLoops = [];
    overlayLoops = [];
    debugLoops = [];

    get cw() {
      if (this.settings.core.defaultCanvas !== null) {
        return this.settings.core.defaultCanvas.width;
      }
      return null;
    };
    get ch() {
      if (this.settings.core.defaultCanvas !== null) {
        return this.settings.core.defaultCanvas.height;
      }
      return null;
    };
    get c() {
      if (this.settings.core.defaultCanvas !== null) {
        return this.settings.core.defaultCanvas.c;
      }
      return null;
    };

    get canvas() {
      if (this.settings.core.defaultCanvas !== null) {
        return this.settings.core.defaultCanvas;
      } else if (this.keys.canvases.length===1) {
        return this.canvases[this.keys.canvases[0]];
      } else {
        console.warn("No default canvas on instance:",this.id);
        return null;
      }
    };

    get camera() {
      if (this.settings.core.defaultCanvas !== null && this.settings.core.defaultCanvas.camera !== null) {
        return this.settings.core.defaultCanvas.camera;
      } else if (this.keys.cameras.length===1) {
        return this.cameras[this.keys.cameras[0]];
      } else {
        console.warn("No default canvas with a camera on instance:",this.id);
        return null;
      }
    }

    get scene() {
      if (this.settings.core.defaultCanvas !== null && this.settings.core.defaultCanvas.camera !== null) {
        return this.settings.core.defaultCanvas.camera.scenes[0];
      } else if (this.keys.scenes.length===1) {
        return this.scenes[this.keys.scenes[0]];
      } else {
        console.warn("No default canvas with a scene on instance:",this.id);
        return null;
      }
    }

    constructor(id=ChoreoGraph.id.get()) {
      this.id = id;
      this.setupCoreSettings();
    };

    setupCoreSettings() {
      this.attachSettings("core",{
        defaultCanvas : null,
        timeScale : 1,
        generateBasicEnvironment : false,
        includeCoreGraphicTypes : true,
        inactiveTime : 200,
        waitUntilReady : true,
        defaultCanvasSpaceScale : 1,
        debugCGScale : 1,
        debugCanvasScale : 1,
        frustumCulling : true,
        baseImagePath : "",
        defaultCursor : "default",
        assumptions : false,
        imageSmoothingEnabled : true,
        skipLoadChecks : false,

        callbacks : {
          loopBefore : null, // loopBefore(cg) runs before canvases are drawn
          loopAfter : null, // loopAfter(cg) runs after canvases are drawn
          resume : null, // resume(ms,cg) runs when the loop is resumed
          loadingLoop : null, // loadingLoop(checkData,cg) runs when the loop is loading
          start : null, // start() runs once when the loop starts
          resize : null // resize(cgCanvas) runs when a canvas is resized
        }
      });
    };

    attachSettings(category,settings) {
      if (this.settings[category]!==undefined) {
        console.warn("Settings category already exists:",category);
        return;
      }
      this.settings[category] = settings;
    };

    loop() {
      if (this.disabled) { return; }

      this.timeSinceLastFrame = ChoreoGraph.nowint-this.lastUpdate;
      this.lastUpdate = ChoreoGraph.nowint;

      if (this.ready==false) {
        this.handleLoading();
        if (this.settings.core.waitUntilReady) { return; }
      }

      if (this.timeSinceLastFrame < this.settings.core.inactiveTime) {
        this.clock += this.timeSinceLastFrame*this.settings.core.timeScale;
      } else if (this.settings.core.callbacks.resume!=null) {
        this.settings.core.callbacks.resume(this.timeSinceLastFrame*this.settings.core.timeScale,this);
      }

      for (let loop of this.processLoops) {
        loop(this);
      }

      for (let sceneId of this.keys.scenes) {
        let scene = this.scenes[sceneId];
        if (scene.cameras.length==0) { continue; }
        scene.update();
      }

      if (this.settings.core.callbacks.loopBefore!=null) { this.settings.core.callbacks.loopBefore(this); }

      for (let loop of this.predrawLoops) {
        loop(this);
      }

      for (let canvasId of this.keys.canvases) {
        let canvas = this.canvases[canvasId];
        canvas.draw();
      }

      if (this.settings.core.callbacks.loopAfter!=null) { this.settings.core.callbacks.loopAfter(this); }

      for (let loop of this.overlayLoops) {
        loop(this);
      }
      for (let loop of this.debugLoops) {
        loop(this);
      }
    };

    handleLoading() {
      if ((this.loadChecks.length===0||this.settings.core.skipLoadChecks)&&ChoreoGraph.frame>0) {
        this.ready = true;
        this.onReady();
        return;
      }
      let output = {};
      let fullPass = true;
      for (let check of this.loadChecks) {
        let [checkId,pass,loaded,total] = check(this);
        output[checkId] = {id:checkId,pass:pass,loaded:loaded,total:total};
        if (!pass) {
          fullPass = false;
        }
      }
      if (fullPass) {
        this.ready = true;
        this.onReady();
      }
      if (this.settings.core.callbacks.loadingLoop!=null) { this.settings.core.callbacks.loadingLoop(output,this); }
    };

    onReady() {
      for (let pluginKey in ChoreoGraph.plugins) {
        let plugin = ChoreoGraph.plugins[pluginKey];
        if (plugin.instanceStart!=null) {
          plugin.instanceStart(this);
        }
      }
      if (this.settings.core.callbacks.start!=null) { this.settings.core.callbacks.start(this); }
    };

    createCanvas(canvasInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.canvases.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newCanvas = new ChoreoGraph.Canvas(canvasInit,this);
      newCanvas.id = id;
      newCanvas.cg = this;
      if (this.settings.core.defaultCanvas == null) {
        this.settings.core.defaultCanvas = newCanvas;
      }
      if (this.settings.core.generateBasicEnvironment&&this.canvases.main===undefined) {
        ChoreoGraph.id.release(id);
        newCanvas.id = "main";
        newCanvas.setCamera(this.cameras.main);
        this.cameras.main.transform.x = newCanvas.width/2;
        this.cameras.main.transform.y = newCanvas.height/2;
      }
      this.canvases[newCanvas.id] = newCanvas;
      this.keys.canvases.push(newCanvas.id);
      return newCanvas;
    };

    createCamera(cameraInit={},id=ChoreoGraph.id.get()) {
      let newCamera = new ChoreoGraph.Camera(cameraInit,this);
      newCamera.id = id;
      newCamera.cg = this;
      this.cameras[id] = newCamera;
      this.keys.cameras.push(id);
      return newCamera;
    };

    createScene(sceneInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.scenes.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newScene = new ChoreoGraph.Scene();
      newScene.id = id;
      newScene.cg = this;
      ChoreoGraph.applyAttributes(newScene,sceneInit);
      this.scenes[id] = newScene;
      this.keys.scenes.push(id);
      return newScene;
    };

    createGraphic(graphicInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.graphics.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newGraphic = new ChoreoGraph.Graphic(graphicInit,this);
      newGraphic.id = id;
      newGraphic.cg = this;
      this.graphics[id] = newGraphic;
      this.keys.graphics.push(id);
      return newGraphic;
    };

    createTransform(transformInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.transforms.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newTransform = new ChoreoGraph.Transform(transformInit,this);
      newTransform.id = id;
      newTransform.cg = this;
      ChoreoGraph.applyAttributes(newTransform,transformInit);
      this.transforms[id] = newTransform;
      this.keys.transforms.push(id);
      return newTransform;
    };

    createImage(imageInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.images.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newImage = new ChoreoGraph.Image(imageInit,this);
      newImage.id = id;
      newImage.cg = this;
      this.images[id] = newImage;
      this.keys.images.push(id);
      return newImage;
    };

    createSequence(sequenceInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.sequences.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newSequence = new ChoreoGraph.Sequence(sequenceInit,this);
      newSequence.id = id;
      newSequence.cg = this;
      this.sequences[id] = newSequence;
      this.keys.sequences.push(id);
      if (this.sequenceManager.runningUpdateLoop==false) {
        this.sequenceManager.runningUpdateLoop = true;
        this.processLoops.push(this.sequenceManager.sequenceManagerUpdate);
      }
      return newSequence;
    };

    createEvent(eventInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.events.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newEvent = new ChoreoGraph.Event(eventInit,this);
      newEvent.id = id;
      newEvent.cg = this;
      this.events[id] = newEvent;
      this.keys.events.push(id);
      if (this.eventManager.runningUpdateLoop==false) {
        this.eventManager.runningUpdateLoop = true;
        this.processLoops.push(this.eventManager.eventManagerUpdate);
      }
      return newEvent;
    };

    createPath(path,id=ChoreoGraph.id.get()) {
      if (this.keys.paths.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      this.paths[id] = path;
      this.keys.paths.push(id);
      return path;
    };

    createObject(objectInit={},id=ChoreoGraph.id.get()) {
      if (this.keys.objects.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
      let newObject = new ChoreoGraph.Object(objectInit,this);
      newObject.id = id;
      newObject.cg = this;
      this.objects[id] = newObject;
      this.keys.objects.push(id);
      return newObject;
    };

    sequenceManager = new class SequenceManager {
      trackers = [];

      runningUpdateLoop = false;
      sequenceManagerUpdate(cg) {
        for (let i=0;i<cg.sequenceManager.trackers.length;i++) {
          let tracker = cg.sequenceManager.trackers[i];
          if (cg.clock>tracker.ent&&tracker.part<=tracker.sequence.data.length-1) {
            let part = tracker.sequence.data[tracker.part];
            if (typeof part == "string") {
              if (tracker.sequence.callbacks[part]!=null) { tracker.sequence.callbacks[part](tracker); }
            } else if (typeof part == "number") {
              tracker.ent = cg.clock+part;
            }
            tracker.part++;
          }
        }
        cg.sequenceManager.trackers = cg.sequenceManager.trackers.filter(function(tracker) { return tracker.part<tracker.sequence.data.length;});
      };
    };

    eventManager = new class EventManager {
      runningUpdateLoop = false;
      eventManagerUpdate(cg) {
        for (let id of cg.keys.events) {
          let event = cg.events[id];
          if (event.ent<cg.clock) {
            if (event.end!=null) { event.end(event); }
            if (event.loop) {
              event.stt = event.ent;
              event.ent = event.stt+event.duration;
            } else {
              ChoreoGraph.id.release(event.id);
              cg.keys.events.splice(cg.keys.events.indexOf(event.id),1);
              delete cg.events[id];
            }
          }
        }
      };
    };
  }
  Canvas = class cgCanvas {
    width = 600;
    height = 400;
    rawWidth = null;
    rawHeight = null;

    keepCursorHidden = false;
    hideDebugOverlays = false;

    #imageRendering = "pixelated"; // Remove anti-aliasing
    set imageRendering(value) {
      this.#imageRendering = value;
      if (this.element!=null) {
        this.element.style.imageRendering = value;
      }
    };
    get imageRendering() {
      return this.#imageRendering;
    };

    camera = null;
    parentElement = null;
    #pixelSize = 1;
    set pixelSize(value) {
      this.#pixelSize = value;
      if (this.rawWidth==null|| this.rawHeight==null) { return; }
      this.width = this.rawWidth / value;
      this.height = this.rawHeight / value;
      this.element.width = this.width;
      this.element.height = this.height;
      this.element.style.width = this.rawWidth + "px";
      this.element.style.height = this.rawHeight + "px";
    };
    get pixelSize() {
      return this.#pixelSize;
    };
    background = "#fba7b7";

    c;
    element;

    constructor(init,cg) {
      ChoreoGraph.applyAttributes(this,init);
      if (this.element.style.width != "") {
        this.width = this.element.width;
      } else {
        this.element.width = this.width;
      }
      if (this.element.style.height != "") {
        this.height = this.element.height;
      } else {
        this.element.height = this.height;
      }
      this.rawHeight = this.height;
      this.rawWidth = this.width;
      this.width /= this.pixelSize;
      this.height /= this.pixelSize;
      this.element.width = this.width;
      this.element.height = this.height;
      this.c = this.element.getContext("2d",{alpha:this.background==null});
      this.element.style.imageRendering = this.#imageRendering; // Remove anti-ailiasing
      this.element.cgCanvas = this;
    };

    setupParentElement(parentElement) {
      this.rawHeight = parentElement.offsetHeight;
      this.rawWidth = parentElement.offsetWidth;
      let width = this.rawWidth / this.pixelSize;
      let height = this.rawHeight / this.pixelSize;
      this.element.width = width;
      this.element.height = height;
      this.width = width;
      this.height = height;

      let ro = new ResizeObserver(entries => {
        for (let entry of entries) {
          let cr = entry.contentRect;
          let copyContent = document.createElement("canvas");
          this.rawWidth = cr.width;
          this.rawHeight = cr.height;
          let width = cr.width/this.pixelSize;
          let height = cr.height/this.pixelSize;
          copyContent.width = width;
          copyContent.height = height;
          let ccc = copyContent.getContext("2d");
          if (this.element.width!=0&&this.element.height!=0) {
            ccc.drawImage(this.element,0,0,width,height);
          }
          this.element.width = width;
          this.element.height = height
          this.width = width;
          this.height = height;
          if (copyContent.width!=0&&copyContent.height!=0) {
            this.c.drawImage(copyContent,0,0,width,height);
          }
          if (this.cg.settings.core.callbacks.resize!=null) {
            this.cg.settings.core.callbacks.resize(this);
          }
          ChoreoGraph.forceNextFrame();
        }
      });
      ro.observe(parentElement);
      return this;
    };

    resizeWithSelf() {
      this.setupParentElement(this.element);
      return this;
    };

    drawImage(image, x, y, width=image.width, height=image.height, rotation=0, ax=0, ay=0, flipX=false, flipY=false) {
      if (image==undefined) {
        console.warn("Image is undefined in cgCanvas.drawImage");
        return;
      }
      let c = this.c;
      c.save();
      c.translate(x, y);
      if (rotation!=0) {
        c.rotate(rotation*Math.PI/180);
      }
      if (flipX&&flipY) {
        c.scale(-1,-1);
        ax = -ax;
        ay = -ay;
      } else if (flipX) {
        c.scale(-1,1);
        ax = -ax;
      } else if (flipY) {
        c.scale(1,-1);
        ay = -ay;
      }
      if (image.canvasOnCanvas||image.disableCropping) {
        c.drawImage(image.image, -(width/2)+ax, -(height/2)+ay, width, height);
      } else {
        let crop = image.crop;
        c.drawImage(image.image, crop[0], crop[1], crop[2], crop[3], -(width/2)+ax, -(height/2)+ay, width, height);
      }
      c.restore();
    };

    setCamera(camera) {
      if (camera===undefined) { console.warn("Camera is undefined in cgCanvas.setCamera"); return; }
      if (this.camera !== null) {
        this.camera.canvas = null;
      }
      this.camera = camera;
      camera.canvas = this;
    };

    draw() {
      this.c.resetTransform();
      if (this.background === null) {
        this.c.clearRect(0,0,this.width,this.height);
      } else if (this.background !== false) {
        this.c.fillStyle = this.background;
        this.c.fillRect(0,0,this.width,this.height);
      }
      if (this.camera === null) { return; }
      for (let scene of this.camera.scenes) {
        this.drawCollection(scene.drawBuffer);
      }
    };

    drawCollection(collection) {
      for (let item of collection) {
        if (item.type=="graphic") {
          this.drawGraphic(item);
        } else if (item.type=="collection") {
          this.drawCollection(item.children);
        }
      }
    };

    drawGraphic(item) {
      this.c.imageSmoothingEnabled = item.graphic.imageSmoothingEnabled;
      if (item.graphic.manualTransform) {
        if (this.checkGraphicBoundCull(item)==false) { return; }
        this.c.resetTransform();
        item.graphic.draw(this,item.transform);
      } else {
        let go = item.transform.o;
        if (go==0) { return; }
        let gx = item.transform.x;
        let gy = item.transform.y;
        let gax = item.transform.ax;
        let gay = item.transform.ay;
        let gr = item.transform.r;
        let gsx = item.transform.sx;
        let gsy = item.transform.sy;
        let CGSpace = item.transform.CGSpace;
        let flipX = item.transform.flipX;
        let flipY = item.transform.flipY;
        let canvasSpaceXAnchor = item.transform.canvasSpaceXAnchor;
        let canvasSpaceYAnchor = item.transform.canvasSpaceYAnchor;

        if (this.checkGraphicBoundCull(item)==false) { return; }

        ChoreoGraph.transformContext(this.camera,gx,gy,gr,gsx,gsy,CGSpace,flipX,flipY,canvasSpaceXAnchor,canvasSpaceYAnchor);

        this.c.globalAlpha = go;
        item.graphic.draw(this.c,gax,gay,this);
      }
    };

    checkGraphicBoundCull(item) {
      if (this.cg.settings.core.frustumCulling&&item.graphic.getBounds!==undefined&&item.transform.CGSpace) {
        let [bw, bh, box, boy] = item.graphic.getBounds();

        let gx = item.transform.x;
        let gy = item.transform.y;
        let gax = item.transform.ax;
        let gay = item.transform.ay;
        if (item.transform.r!==0) {
          let r = -item.transform.r+90;
          let rad = r*Math.PI/180;
          let savedbh = bh;
          bh = Math.abs(bw*Math.cos(rad))+Math.abs(bh*Math.sin(rad));
          bw = Math.abs(bw*Math.sin(rad))+Math.abs(savedbh*Math.cos(rad));

          box += Math.sin(rad)*gax-Math.cos(rad)*gay;
          boy += Math.cos(rad)*gax+Math.sin(rad)*gay;
        } else {
          box += gax;
          boy += gay;
        }

        bw *= item.transform.sx;
        bh *= item.transform.sy;
        let bx = gx+box;
        let by = gy+boy;
        let camera = this.camera;
        if (camera.cullOverride!==null) { camera = camera.cullOverride; }
        let cx = camera.x;
        let cy = camera.y;
        let cw = this.width/camera.cz;
        let ch = this.height/camera.cz;

        if (bx+bw*0.5<cx-cw*0.5||bx-bw*0.5>cx+cw*0.5||by+bh*0.5<cy-ch*0.5||by-bh*0.5>cy+ch*0.5) { return false; }
        return true
      }
    };

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.keys.canvases = this.cg.keys.canvases.filter(id => id !== this.id);
      delete this.cg.canvases[this.id];
    };
  };

  Camera = class cgCamera {
    scenes = [];
    canvas = null;

    cullOverride = null; // A camera that will be used instead of the current for culling
    inactiveCanvas = null; // A canvas used as a fallback for transform calculations

    get x() { return this.transform.x+this.transform.ox; };
    get y() { return this.transform.y+this.transform.oy; };
    z = 1; // Zoom

    transform = null;
    canvasSpaceScale;

    // maximum/minimum - for dynamic aspect ratios and screen resolutions
    // pixels - for maintaining pixel ratios
    scaleMode = "pixels";
    pixelScale = 1; // Pixels per pixel
    size = 500;
    width = null;
    height = null;

    // RETURNS CG SPACE POSITION OF THE TOP LEFT OF THIS CAMERA
    get cx() {
      if (this.canvas==null&&this.inactiveCanvas!=null) {
        return -this.x+this.inactiveCanvas.width*0.5;
      } else if (this.canvas==null) {
        return -this.x+this.cg.settings.core.defaultCanvas.width*0.5;
      }
      return -this.x+this.canvas.width*0.5;
    };

    get cy() {
      if (this.canvas==null&&this.inactiveCanvas!=null) {
        return -this.y+this.inactiveCanvas.height*0.5;
      } else if (this.canvas==null) {
        return -this.y+this.cg.settings.core.defaultCanvas.height*0.5;
      }
      return -this.y+this.canvas.height*0.5;
    };

    // GET ZOOM SCALAR BASED ON SCALE MODE
    get cz() {
      let canvas = this.canvas;
      if (canvas==null&&this.inactiveCanvas!=null) { canvas = this.inactiveCanvas; }
      else if (canvas==null) { return this.z; }
      if (this.scaleMode=="pixels") {
        return (this.z*this.pixelScale) / canvas.pixelSize;
      } else {
        let width, height;
        let basedOnWidth = true;
        width = this.width == null ? this.size : this.width;
        height = this.height == null ? this.size : this.height;
        if (this.scaleMode=="maximum") {
          basedOnWidth = canvas.width > canvas.height * (width / height);
        } else if (this.scaleMode=="minimum") {
          basedOnWidth = canvas.width < canvas.height * (width / height);
        }
        if (basedOnWidth) {
          return this.z*(canvas.width/(width))*this.pixelScale;
        } else {
          return this.z*(canvas.height/(height))*this.pixelScale;
        }
      }
    };

    // TURN CANVAS SPACE POINTS INTO CG SPACE POINTS
    getCGSpaceX(x) {
      if (this.canvas==null) { return x; }
      return x / this.cz + this.x - this.canvas.width*0.5 / this.cz;
    };

    getCGSpaceY(y) {
      if (this.canvas==null) { return y; }
      return y / this.cz + this.y - this.canvas.height*0.5 / this.cz;
    };

    // TURN CG SPACE POINTS INTO CANVAS SPACE POINTS
    getCanvasSpaceX(x) {
      if (this.canvas==null) { return x; }
      return ((-this.x + x) * this.cz + this.canvas.width*0.5) / this.canvasSpaceScale;
    };

    getCanvasSpaceY(y) {
      if (this.canvas==null) { return y; }
      return ((-this.y + y) * this.cz + this.canvas.height*0.5) / this.canvasSpaceScale;
    };

    constructor(cameraInit,cg) {
      ChoreoGraph.initTransform(cg,this,cameraInit);
      this.canvasSpaceScale = cg.settings.core.defaultCanvasSpaceScale;
      if (cameraInit.x!=undefined) { this.transform.x = cameraInit.x; delete cameraInit.x; }
      if (cameraInit.y!=undefined) { this.transform.y = cameraInit.y; delete cameraInit.y; }
      ChoreoGraph.applyAttributes(this,cameraInit);
    };

    addScene(scene) {
      if (this.scenes.includes(scene)) { return; }
      this.scenes.push(scene);
      scene.cameras.push(this);
    };

    removeScene(scene) {
      if (this.scenes.includes(scene)==false) { return; }
      this.scenes.splice(this.scenes.indexOf(scene),1);
      scene.cameras.splice(scene.cameras.indexOf(this),1);
    };

    setScene(scene) {
      for (let scene of this.scenes) {
        scene.cameras.splice(scene.cameras.indexOf(this),1);
      }
      this.scenes = [scene];
      if (scene.cameras.includes(this)==false) {
        scene.cameras.push(this);
      }
    };

    isSceneOpen(scene) {
      return this.scenes.includes(scene);
    };

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.keys.cameras = this.cg.keys.cameras.filter(id => id !== this.id);
      delete this.cg.cameras[this.id];
      if (this.canvas!==null) {
        this.canvas.camera = null;
      }
      for (let scene of this.scenes) {
        scene.cameras.splice(scene.cameras.indexOf(this),1);
      }
    }
  }

  Scene = class cgScene {
    tree = {};
    structure = [];
    objects = [];
    collections = {};
    drawBuffer = [];
    drawBufferCollections = [];
    cameras = [];
    items = {};

    createItem(type,init={},id=ChoreoGraph.id.get(),collection=null) {
      if (collection!==null&&this.collections[collection]===undefined) {
        console.warn("Collection with id:",collection,"does not exist");
        return;
      }
      if (this.items[id]!==undefined) {
        console.warn("Scene Item with id:",id,"already exists on scene:",this.id);
        return;
      }
      let newItem;
      if (type=="graphic") {
        ChoreoGraph.initTransform(this.cg,init,init);
        newItem = new ChoreoGraph.SceneItem({
          type:"graphic",
          id:id,
          graphic:init.graphic,
          transform:init.transform
        });
      } else if (type=="collection") {
        let path = [];
        if (collection!==null) {
          path = Array.from(this.collections[collection].path);
          path.push(collection);
        }
        newItem = new ChoreoGraph.SceneItem({
          type:"collection",
          id:id,
          children:[],
          path:path
        });
        this.collections[id] = newItem;
      }
      this.items[id] = newItem;

      if (collection===null) {
        this.structure.push(newItem);
        if (type=="graphic") {
          this.tree[id] = newItem;
        } else if (type=="collection") {
          this.tree[id] = {};
        }
      } else {
        this.collections[collection].children.push(newItem);
        let path = Array.from(this.collections[collection].path);
        let pathObj = this.tree;
        for (let i=0;i<path.length;i++) {
          if (i==0) {
            pathObj = this.tree[path[i]];
          } else {
            pathObj = pathObj[path[i]];
          }
        }
        if (type=="graphic") {
          pathObj[collection][id] = newItem;
        } else if (type=="collection") {
          pathObj[collection][id] = {};
        }
      }
      return newItem;
    };

    addObject(object) {
      this.objects.push(object);
    };

    removeObject(object) {
      this.objects.splice(this.objects.indexOf(object),1);
    };

    remove(id) {
      for (let i=0;i<this.structure.length;i++) {
        if (this.structure[i].id==id) {
          this.structure.splice(i,1);
        }
      }
      return this;
    };

    update() {
      this.drawBuffer.length = 0;
      this.drawBufferCollections = {};
      this.processCollection(this.structure,this.drawBuffer);
      this.processObjects();
    };

    processCollection(collection,buffer) {
      for (let item of collection) {
        if (item.type=="graphic") {
          buffer.push({type:"graphic",transform:item.transform,graphic:item.graphic});
        } else if (item.type=="collection") {
          let newBufferCollection = {type:"collection",id:item.id,children:[]};
          buffer.push(newBufferCollection);
          this.drawBufferCollections[item.id] = newBufferCollection.children;
          if (item.children.length===0) { continue; }
          this.processCollection(item.children,newBufferCollection.children);
        }
      }
    };

    processObjects() {
      if (this.objects.length===0 && this.cg.keys.scenes.length===1 && this.cg.settings.core.assumptions) {
        for (let id of this.cg.keys.objects) {
          this.cg.objects[id].update(this);
        }
      } else {
        for (let object of this.objects) {
          object.update(this);
        }
      }
    };

    addToBuffer(graphic,transform,collection=null) {
      if (collection===null) {
        this.drawBuffer.push({type:"graphic",transform:transform,graphic:graphic});
      } else {
        this.drawBufferCollections[collection].push({type:"graphic",transform:transform,graphic:graphic});
      }
    };

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.keys.scenes = this.cg.keys.scenes.filter(id => id !== this.id);
      delete this.cg.scenes[this.id];
    };
  };

  SceneItem = class cgSceneItem {
    constructor(init) {
      this.id = init.id;
      this.type = init.type;
      if (this.type === "collection") {
        this.children = [];
        this.path = init.path;
      } else if (this.type === "graphic") {
        this.graphic = init.graphic;
        this.transform = init.transform;
      }
    }
  };

  Graphic = class cgGraphic {
    type = "";
    manualTransform = false;
    imageSmoothingEnabled;

    constructor(graphicInit,cg) {
      this.imageSmoothingEnabled = cg.settings.core.imageSmoothingEnabled;
      let graphicType = cg.graphicTypes[graphicInit.type];
      if (graphicType!==undefined) {
        this.setup = graphicType.setup;
        if (this.setup!==undefined) { this.setup(graphicInit,cg); }
      } else {
        console.error("Graphic type not found:",graphicInit.type);
        return;
      }
      ChoreoGraph.applyAttributes(this,graphicInit);
      this.draw = graphicType.draw;
      if (graphicType.getBounds!==undefined) {
        this.getBounds = graphicType.getBounds;
      }
    }

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.keys.graphics = this.cg.keys.graphics.filter(id => id !== this.id);
      delete this.cg.graphics[this.id];
    };
  };

  Transform = class cgTransform {
    _x = 0; // X
    _y = 0; // Y
    _sx = 1; // Scale X
    _sy = 1; // Scale Y
    _ax = 0; // Anchor X
    _ay = 0; // Anchor Y
    _r = 0; // Rotation
    _o = 1; // Opacity

    ox = 0; // Offset X
    oy = 0; // Offset Y
    or = 0; // Offset Rotation

    _flipX = false; // Flip X
    _flipY = false; // Flip Y

    _CGSpace = true; // CG Space or Canvas Space
    _canvasSpaceXAnchor = 0; // 0-1
    _canvasSpaceYAnchor = 0; // 0-1

    parent = null;

    get x() { if (this.parent===null) { return this._x+this.ox; } else { return this.parent.x+this._x+this.ox } }
    set x(value) { this._x = value; }
    get y() { if (this.parent===null) { return this._y+this.oy; } else { return this.parent.y+this._y+this.oy } }
    set y(value) { this._y = value; }
    get sx() { if (this.parent===null) { return this._sx; } else { return this.parent.sx*this._sx } }
    set sx(value) { this._sx = value; }
    get sy() { if (this.parent===null) { return this._sy; } else { return this.parent.sy*this._sy } }
    set sy(value) { this._sy = value; }
    get ax() { if (this.parent===null) { return this._ax; } else { return this.parent.ax+this._ax } }
    set ax(value) { this._ax = value; }
    get ay() { if (this.parent===null) { return this._ay; } else { return this.parent.ay+this._ay } }
    set ay(value) { this._ay = value; }
    get r() { if (this.parent===null) { return this._r+this.or; } else { return this.parent.r+this._r+this.or } }
    set r(value) { this._r = value; }
    get o() { if (this.parent===null) { return this._o; } else { return this.parent.o*this._o } }
    set o(value) { this._o = value; }
    get CGSpace() { if (this.parent===null) { return this._CGSpace; } else { return this.parent.CGSpace; } }
    set CGSpace(value) { this._CGSpace = value; }
    get canvasSpaceXAnchor() { return this._canvasSpaceXAnchor; }
    set canvasSpaceXAnchor(value) { this._canvasSpaceXAnchor = value; }
    get canvasSpaceYAnchor() { return this._canvasSpaceYAnchor; }
    set canvasSpaceYAnchor(value) { this._canvasSpaceYAnchor = value; }
    get flipX() { if (this.parent===null) { return this._flipX; } else { return this.parent.flipX ^ this._flipX; } }
    set flipX(value) { this._flipX = value; }
    get flipY() { if (this.parent===null) { return this._flipY; } else { return this.parent.flipY ^ this._flipY; } }
    set flipY(value) { this._flipY = value; }

    delete() {
      ChoreoGraph.id.release(this.id);
      ChoreoGraph.id.release(this.id);
      this.cg.keys.transforms.splice(this.cg.keys.transforms.indexOf(this.id),1);
      delete this.cg.transforms[this.id];
    };
  };

  Image = class cgImage {
    file = null;
    image = null;
    id = null;

    crop = [0,0,100,100];
    unsetCrop = true;

    rawWidth = 0;
    rawHeight = 0;

    width;
    height;

    scale = [1,1];
    ready = false;
    loadAttempts = 0;

    disableCropping;

    #onLoads = [];
    set onLoad(callback) {
      if (this.ready) {
        callback(this);
      } else {
        this.#onLoads.push(callback);
      }
    };

    constructor(imageInit,cg) {
      if (imageInit.crop!=undefined) { this.unsetCrop = false; }

      ChoreoGraph.applyAttributes(this,imageInit);

      if (this.file==null) { console.error("Image file not defined for " + this.id); return; };
      if (this.file.includes(".svg")&&this.disableCropping==undefined) { this.disableCropping = true; }

      if (this.image==null&&this.canvasOnCanvas) { // Creates a canvas and makes the image get drawn without cropping
        this.image = document.createElement("canvas");
        this.image.width = this.crop[2];
        this.image.height = this.crop[3];
        this.image.style.imageRendering = "pixelated";

        this.rawImage = document.createElement("IMG");
        this.rawImage.ctx = this.image.getContext("2d");
        this.rawImage.src = cg.settings.core.baseImagePath + this.file;
        this.rawImage.cgImage = this;

        this.rawImage.onload = function() {
          let image = this.cgImage;
          this.ctx.drawImage(this, image.crop[0], image.crop[1], image.crop[2], image.crop[3], 0, 0, image.crop[2], image.crop[3]);

          if (image.width==undefined) { image.width = image.crop[2]*image.scale[0]; }
          if (image.height==undefined) { image.height = image.crop[3]*image.scale[1]; }

          image.ready = true;
          if (image.onLoad!=null) { image.onLoad(image); }
        }
        document.body.appendChild(this.image);
      } else if (this.image==null) {
        this.image = document.createElement("IMG");
        this.image.engId = this.id;

        this.image.onload = () => {
          this.rawWidth = this.image.width;
          this.rawHeight = this.image.height;

          if (this.unsetCrop) {
            if (this.width==undefined) { this.width = this.rawWidth*this.scale[0]; }
            if (this.height==undefined) { this.height = this.rawHeight*this.scale[1]; }
            this.crop = [0,0,this.rawWidth,this.rawHeight]; delete this.unsetCrop;
          } else {
            if (this.width==undefined) { this.width = this.crop[2]*this.scale[0]; }
            if (this.height==undefined) { this.height = this.crop[3]*this.scale[1]; }
          }

          this.ready = true;
          for (let callback of this.#onLoads) {
            callback(this);
          }
        }

        this.image.onerror = () => { // Reload the image if it fails
          if (this.loadAttempts<3) {
            console.warn("Load failed for " + this.id);
            this.loadAttempts++;
            this.image.src = cg.settings.core.baseImagePath + this.file;
          } else { console.error("Image failed to load for " + this.id + " at " + this.image.src); return; }
        };

        this.image.src = cg.settings.core.baseImagePath + this.file;
      }

      if (this.disableCropping===undefined) {
        this.disableCropping = false;
      }
    }
  };

  Sequence = class cgSequence {
    data = [];
    callbacks = {};

    constructor(sequenceInit,cg) {
      ChoreoGraph.applyAttributes(this,sequenceInit);
      this.cg = cg;
    };

    run() {
      let tracker = {sequence:this,part:0,ent:0};
      this.cg.sequenceManager.trackers.push(tracker);
      return tracker;
    };

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.sequenceManager.trackers = this.cg.sequenceManager.trackers.filter(tracker => tracker.sequence.id !== this.id);
      this.cg.keys.sequences = this.cg.keys.sequences.filter(id => id !== this.id);
      delete this.cg.sequences[this.id];
    };
  };

  Event = class cgEvent {
    stt = 0;
    ent = 0;
    duration = 0;
    loop = false;
    end = null;

    get progress() {
      return (this.cg.clock - this.stt) / this.duration;
    }

    constructor(eventInit,cg) {
      ChoreoGraph.applyAttributes(this,eventInit);
      if (this.stt==0) { this.stt = cg.clock; }
      if (this.ent==0) { this.ent = this.stt+this.duration; }
    };

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.keys.events = this.cg.keys.events.filter(id => id !== this.id);
      delete this.cg.events[this.id];
    };
  };

  Object = class cgObject {
    objectData = {
      components : [],
      deleteTransformOnDelete : true
    };
    transform = null;

    constructor(objectInit,cg) {
      ChoreoGraph.initTransform(cg,this,objectInit);
      if (objectInit.deleteTransformOnDelete) {
        this.objectData.deleteTransformOnDelete = true;
        delete objectInit.deleteTransformOnDelete;
      }
      ChoreoGraph.applyAttributes(this,objectInit);
    };

    attach(componentName,componentInit={}) {
      if (ChoreoGraph.ObjectComponents[componentName]==undefined) { console.error('The component type: "'+componentName+'" does not exist.'); return; }
      let newComponent = new ChoreoGraph.ObjectComponents[componentName](componentInit,this);
      newComponent.object = this;
      newComponent.cg = this.cg;
      if (newComponent.manifest.master) {
        this[newComponent.manifest.key] = newComponent;
      }
      this.objectData.components.push(newComponent);
      return this;
    };

    update(scene) {
      for (let component of this.objectData.components) {
        if (component.manifest.functions.update) { component.update(scene); }
      }
    };

    delete() {
      for (let sceneId of this.cg.keys.scenes) {
        this.cg.scenes[sceneId].removeObject(this);
      }

      ChoreoGraph.id.release(this.id);

      if (this.objectData.deleteTransformOnDelete) {
        this.transform.delete();
      };
      for (let component of this.objectData.components) {
        if (component.delete!=undefined) { component.delete(); }
      }
      this.cg.keys.objects.splice(this.cg.keys.objects.indexOf(this.id),1);
      delete this.cg.objects[this.id];
    };
  };

  ObjectComponents = {
    Graphic : class cgObjectGraphic {
      manifest = {
        type : "Graphic",
        key : "Graphic",
        master : true,
        functions : {
          update : true,
          delete : true
        }
      }

      graphic = null;
      collection = null;
      transform = null;

      deleteTransformOnDelete = true;

      constructor(componentInit,object) {
        ChoreoGraph.initTransform(object.cg,this,componentInit);
        ChoreoGraph.initObjectComponent(this,componentInit);
        if (this.transform.parent==null) { this.transform.parent = object.transform; }
      };

      update(scene) {
        if (this.graphic===null) { return; }
        scene.addToBuffer(this.graphic,this.transform,this.collection);
      };

      delete() {
        if (this.deleteTransformOnDelete) {
          this.transform.delete();
        };
      };
    },
    Camera : class cgObjectCamera {
      manifest = {
        type : "Camera",
        key : "Camera",
        master : true,
        functions : {
          update : true
        }
      }
      camera = null;
      transform = null;
      active = true;
      jump = false;
      jumpDistance = 100;
      smoothing = 0.007;

      constructor(componentInit,object) {
        ChoreoGraph.initTransform(object.cg,this,componentInit);
        ChoreoGraph.initObjectComponent(this,componentInit);
        if (this.transform.parent==null) { this.transform.parent = object.transform; }
        if (this.camera==null) {
          console.error("Camera not defined for camera component",this,componentInit);
        }
      };

      update() {
        if (this.camera===null||!this.active) { return; }
        if (this.jump) {
          let distance = Math.sqrt((this.transform.x+this.camera.transform.x)**2+(this.transform.y+this.camera.transform.y)**2);
          if (distance > this.jumpDistance) {
            this.camera.transform.x = this.transform.x;
            this.camera.transform.y = this.transform.y;
          }
        }

        let smooth = this.cg.timeDelta * this.smoothing;

        this.camera.transform.x = this.camera.transform.x + (this.transform.x - this.camera.transform.x) * smooth;
        this.camera.transform.y = this.camera.transform.y + (this.transform.y - this.camera.transform.y) * smooth;
      };
    },
    Script : class cgObjectScript {
      manifest = {
        type : "Script",
        key : "Script",
        master : false,
        functions : {
          update : true,
          delete : true
        }
      }
      startScript = null;
      updateScript = null;
      collapseScript = null;

      constructor(componentInit,object) {
        ChoreoGraph.initObjectComponent(this,componentInit);
        if (this.startScript!==null) {
          this.startScript(object);
        }
      };
      update(scene) {
        if (this.updateScript!==null) {
          this.updateScript(this.object,scene);
        }
      };
      collapse(scene) {
        if (this.collapseScript!==null) {
          this.collapseScript(this.object,scene);
        }
      };
    }
  };

  initObjectComponent(component, componentInit={}) {
    if (componentInit.master!==undefined) {
      component.manifest.master = componentInit.master;
      delete componentInit.master;
    }
    if (componentInit.key!==undefined) {
      component.manifest.key = componentInit.key;
      delete componentInit.key;
    }
    ChoreoGraph.applyAttributes(component,componentInit);
  };

  id = new class IDManager {
    used = [];

    get(length=5) {
      let output = "";
      while (this.used.includes(output)||(output.length<length)) {
        let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
        output += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      this.used.push(output);
      return "!"+output;
    };

    release(id) {
      if (id[0]==="!") {
        this.used.splice(this.used.indexOf(id),1);
      }
    };
  };

  Plugin = class cgPlugin {
    constructor(pluginInit) {
      if (pluginInit.key==undefined) { console.error("Plugin key not defined",pluginInit); return; }

      for (let pluginKey in ChoreoGraph.plugins) {
        let plugin = ChoreoGraph.plugins[pluginKey];
        if (plugin.key==pluginInit.key) { console.error("Plugin key already exists",pluginInit.key); return; }
      }

      this.name = pluginInit.name;
      this.key = pluginInit.key;
      this.version = pluginInit.version;

      this.instanceConnect = null;
      this.instanceStart = null;
      this.globalStart = null;

      if (pluginInit.globalPackage!=undefined) {
        ChoreoGraph[this.key] = pluginInit.globalPackage;
      }
      if (pluginInit.instanceConnect!=undefined) {
        this.instanceConnect = pluginInit.instanceConnect;
        for (let cg of ChoreoGraph.instances) {
          this.instanceConnect(cg);
        }
      }
      if (pluginInit.instanceStart!=undefined) {
        this.instanceStart = pluginInit.instanceStart;
      }
      if (pluginInit.globalStart!=undefined) {
        this.globalStart = pluginInit.globalStart;
        if (ChoreoGraph.started) {
          this.globalStart();
        }
      }
    }
  };

  attachCoreGraphicTypes(cg) {
    cg.graphicTypes.rectangle = new class RectangleGraphic {
      setup(init,cg) {
        this.fill = true;
        this.lineWidth = 1;
        this.lineJoin = "round";
        this.miterLimit = 10;
        this.radius = 0;

        this.width = 50;
        this.height = 50;
        this.colour = "#ff0000";
      };
      draw(c,ax,ay) {
        c.beginPath();
        if (this.radius>0) {
          c.roundRect(-this.width/2+ax, -this.height/2+ay, this.width, this.height, this.radius);
        } else {
          c.rect(-this.width/2+ax, -this.height/2+ay, this.width, this.height);
        }
        if (this.fill) { c.fillStyle = this.colour; c.fill(); } else { c.lineWidth = this.lineWidth; c.strokeStyle = this.colour; c.stroke(); }
      };
      getBounds() {
        return [this.width,this.height, 0, 0];
      };
    };
    cg.graphicTypes.arc = new class ArcGraphic {
      setup(init,cg) {
        this.fill = true;
        this.closePath = false;
        this.lineWidth = 1;
        this.lineCap = "round";

        this.radius = 5;
        this.colour = "#ff0000";
        this.start = 0;
        this.end = 2*Math.PI;
        this.counterclockwise = false;
      };
      draw(c,ax,ay) {
        c.beginPath();
        cg.c.arc(ax, ay, this.radius,this.start,this.end,this.counterclockwise);
        if (this.closePath) { c.closePath(); }
        if (this.fill) { c.fillStyle = this.colour; c.fill(); } else { c.lineWidth = this.lineWidth; c.strokeStyle = this.colour; c.stroke(); }
      };
      getBounds() {
        return [this.radius*2, this.radius*2, 0, 0];
      };
    };
    cg.graphicTypes.polygon = new class PolygonGraphic {
      setup(init,cg) {
        this.fillBeforeStroke = true;
        this.fill = true;
        this.stroke = true;
        this.closePath = true;
        this.lineWidth = 1;
        this.lineCap = "round";

        this.path = [];

        this.fillColour = "#ff0000";
        this.strokeColour = "#00ff00";
      };
      draw(c,ax,ay) {
        c.beginPath();
        for (let i=0;i<this.path.length;i++) {
          let point = this.path[i];
          c.lineTo(point[0]+ax,point[1]+ay);
        }
        if (this.closePath) { c.closePath(); }
        if (this.fill&&this.fillBeforeStroke) { c.fillStyle = this.fillColour; c.fill(); }
        if (this.stroke) { c.lineWidth = this.lineWidth; c.strokeStyle = this.strokeColour; c.stroke(); }
        if (this.fill&&!this.fillBeforeStroke) { c.fillStyle = this.fillColour; c.fill(); }
      };
      getBounds() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let point of this.path) {
          if (point[0]<minX) { minX = point[0]; }
          if (point[0]>maxX) { maxX = point[0]; }
          if (point[1]<minY) { minY = point[1]; }
          if (point[1]>maxY) { maxY = point[1]; }
        }
        let width = maxX-minX;
        let height = maxY-minY;
        let offsetX = minX+width/2;
        let offsetY = minY+height/2;
        return [width, height, offsetX, offsetY];
      };
    };
    cg.graphicTypes.image = new class ImageGraphic {
      setup(init,cg) {
        if (init.image==undefined) { console.error("Image not defined in image graphic"); return; }
        this.image = init.image;
        if (this.image.width==undefined||this.image.height==undefined) {
          if (this.image.graphicsAwaitingImageLoad==undefined) {
            this.image.graphicsAwaitingImageLoad = [];
          }
          this.image.graphicsAwaitingImageLoad.push(this);
          this.image.onLoad = function(image) {
            for (let g=0;g<image.graphicsAwaitingImageLoad.length;g++) {
              let graphic = image.graphicsAwaitingImageLoad[g];
              if (graphic.width==undefined) { graphic.width = image.width; }
              if (graphic.height==undefined) { graphic.height = image.height; }
            }
            if (image.graphicsAwaitingImageLoad.length==0) {
              delete image.graphicsAwaitingImageLoad;
            }
          }
        }
        this.width = this.image.width;
        this.height = this.image.height;
        this.flipX = false;
        this.flipY = false;
      };
      draw(c,ax,ay) {
        if (this.flipX) {
          c.scale(-1, 1);
          ax = -ax;
        }
        if (this.flipY) {
          c.scale(1, -1);
          ay = -ay;
        }
        if (this.image.canvasOnCanvas||this.image.disableCropping) {
          c.drawImage(this.image.image, -(this.width/2)+ax, -(this.height/2)+ay, this.width, this.height);
        } else {
          let crop = this.image.crop;
          c.drawImage(this.image.image, crop[0], crop[1], crop[2], crop[3], -(this.width/2)+ax, -(this.height/2)+ay, this.width, this.height);
        }
      };
      getBounds() {
        return [this.width,this.height, 0, 0];
      };
    };
    cg.graphicTypes.pointText = new class PointTextGraphic {
      setup(init,cg) {
        this.text = "Point Text";
        this.fontFamily = "Arial";
        this.fontSize = 20;
        this.sizeType = "px";
        this.colour = "#000000";
        this.textAlign = "left";
        this.textBaseline = "alphabetic";
        this.miterLimit = 10;
        this.fill = true;
        this.lineWidth = 1;
        this.maxWidth = null;
      };
      draw(c,ax,ay) {
        c.font = this.fontSize + this.sizeType + " " + this.fontFamily;
        c.textAlign = this.textAlign;
        c.textBaseline = this.textBaseline;
        if (this.fill) {
          c.fillStyle = this.colour;
          if (this.maxWidth!=null) {
            c.fillText(this.text, ax, ay, this.maxWidth);
          } else {
            c.fillText(this.text, ax, ay);
          }
        } else {
          c.miterLimit = this.miterLimit;
          c.strokeStyle = this.colour;
          c.lineWidth = this.lineWidth;
          if (this.maxWidth!=null) {
            c.strokeText(this.text, ax, ay, this.maxWidth);
          } else {
            c.strokeText(this.text, ax, ay);
          }
        }
      };
      getBounds() {
        if (this.maxWidth!=null) {
          return [this.maxWidth, this.fontSize, 0, 0];
        } else {
          let width = this.cg.canvas.c.measureText(this.text).width;
          return [width, this.fontSize, 0, 0];
        }
      };
    };
  };

  applyAttributes(obj,attributes) {
    for (let key in attributes) {
      obj[key] = attributes[key];
    }
  };

  initTransform(cg,obj,init) {
    if (obj.transform!==undefined&&obj.transform!==null) { return; }
    if (init.transform!=undefined) {
      obj.transform = init.transform;
      delete init.transform;
    } else {
      let transformInit = init.transformInit;
      if (transformInit!=undefined) {
        delete init.transformInit;
      } else {
        transformInit = {};
      }
      if (init.transformId!=undefined) {
        obj.transform = cg.createTransform(transformInit,init.transformId);
        delete init.transformId;
      } else {
        obj.transform = cg.createTransform(transformInit);
      }
    }
  }

  colourLerp(colourFrom, colourTo, amount) {
    let splitcolourTo = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colourTo);
    if (splitcolourTo!=null) { colourTo = splitcolourTo ? splitcolourTo.map(i => parseInt(i, 16)).slice(1) : null; } else { return colourFrom; }
    let splitcolourFrom = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colourFrom);
    if (splitcolourFrom!=null) { colourFrom = splitcolourFrom ? splitcolourFrom.map(i => parseInt(i, 16)).slice(1) : null; } else { return colourFrom; }
    let r = colourTo[0] * amount + colourFrom[0] * (1 - amount);
    let g = colourTo[1] * amount + colourFrom[1] * (1 - amount);
    let b = colourTo[2] * amount + colourFrom[2] * (1 - amount);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).split(".")[0];
  };

  degreeToRadianStandard(degree) {
    if (degree>270) {
      return (-(degree-450)*Math.PI)/180;
    } else {
      return (-(degree-90)*Math.PI)/180;
    }
  };

  imageLoadCheck(cg) {
    let pass = true;
    let count = 0;
    let total = cg.keys.images.length;
    for (let imageId of cg.keys.images) {
      let image = cg.images[imageId];
      if (image.ready) {
        count++;
      } else {
        pass = false;
      }
    }
    return ["images",pass,count,total];
  };

  transformContext(camera,x=0,y=0,r=0,sx=1,sy=1,CGSpace=true,flipX=false,flipY=false,canvasSpaceXAnchor,canvasSpaceYAnchor,ctx=camera?.canvas.c,cx=camera?.cx,cy=camera?.cy,cz=camera?.cz,canvasSpaceScale=camera?.canvasSpaceScale,w=camera?.canvas.width,h=camera?.canvas.height,manualScaling=false) {
    if (camera===undefined&&ChoreoGraph.instances.length===1&&ChoreoGraph.instances[0].keys.cameras.length===1) {
      camera = ChoreoGraph.instances[0].cameras[ChoreoGraph.instances[0].keys.cameras[0]];
      if (camera.canvas==null) { return; }
      ctx = camera.canvas.c;
      cx = camera.cx;
      cy = camera.cy;
      cz = camera.cz;
      canvasSpaceScale = camera.canvasSpaceScale;
      w = camera.canvas.width;
      h = camera.canvas.height;
    }
    if (camera==undefined) { return; }
    let z = 1;
    if (CGSpace) {
      z = cz;
      x += cx;
      y += cy;
      x = x*z+((w-(w*z))*0.5);
      y = y*z+((h-(h*z))*0.5);
    } else {
      z = canvasSpaceScale;
      x *= z;
      y *= z;
      x += w*canvasSpaceXAnchor;
      y += h*canvasSpaceYAnchor;
    }
    if (manualScaling) {
      sx = 1; sy = 1;
    } else {
      sx = (sx)*z*((!flipX)*2-1);
      sy = (sy)*z*((!flipY)*2-1);
    }
    r = (r*(Math.PI/180)); // Convert to radian
    ctx.setTransform(sx*Math.cos(r),sx*Math.sin(r),-sy*Math.sin(r),sy*Math.cos(r),x,y);
  };

  plugin(pluginInit) {
    let plugin = new this.Plugin(pluginInit);
    ChoreoGraph.plugins[plugin.key] = plugin;
  };

  instantiate(init={}) {
    let cg = new ChoreoGraph.Instance(ChoreoGraph.instances.length);

    cg.loadChecks.push(ChoreoGraph.imageLoadCheck);

    for (let pluginKey in ChoreoGraph.plugins) {
      let plugin = ChoreoGraph.plugins[pluginKey];
      if (plugin.instanceConnect!=null) { plugin.instanceConnect(cg); }
    }

    let stack = [[init,[]]];
    while (stack?.length > 0) {
      let currentObj = stack.pop();
      let parentKey = currentObj[1];
      Object.keys(currentObj[0]).forEach(key => {
        let newKey = Array.from(parentKey);
        newKey.push(key);
        if (typeof currentObj[0][key] === 'object' && currentObj[0][key] !== null && !(currentObj[0][key] instanceof Array) && !(currentObj[0][key] instanceof Date)) {
          stack.push([currentObj[0][key],newKey]);
        } else {
          newKey.reduce((acc, key, index, array) => {
            if (index === array.length - 1) {
              acc[key] = currentObj[0][key];
            }
            if (acc[key] === undefined) { acc[key] = {}; } // Account for missing keys
            return acc[key];
          }, cg.settings);
        }
      });
    }

    if (cg.settings.core.generateBasicEnvironment) {
      cg.createScene({},"main");
      cg.createCamera({},"main")
      .addScene(cg.scenes.main);
    }
    if (cg.settings.core.includeCoreGraphicTypes) {
      ChoreoGraph.attachCoreGraphicTypes(cg);
    }

    ChoreoGraph.instances.push(cg);

    return cg;
  };

  start() {
    if (this.started) { console.warn("ChoreoGraph.start() ran more than once"); return; }
    this.started = true;
    for (let pluginKey in ChoreoGraph.plugins) {
      let plugin = ChoreoGraph.plugins[pluginKey];
      if (plugin.globalStart!=null) { plugin.globalStart(); }
    }
    this.loop();
  };

  forceNextFrame() {
    ChoreoGraph.loop(false);
  }

  loop(continuous=true) {
    ChoreoGraph.now = new Date();
    ChoreoGraph.nowint = ChoreoGraph.now.getTime();
    ChoreoGraph.timeDelta = performance.now() - ChoreoGraph.lastPerformanceTime;
    for (let loop of ChoreoGraph.globalBeforeLoops) { loop(this); }

    let pauseBecauseOffscreen = false;
    if (ChoreoGraph.settings.pauseWhenOffscreen) {
      pauseBecauseOffscreen = true;
      for (let cg of ChoreoGraph.instances) {
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          const rect = canvas.element.getBoundingClientRect();
          if (rect.top < window.innerHeight &&
              rect.left < window.innerWidth &&
              rect.bottom > 0 &&
              rect.right > 0) {
            pauseBecauseOffscreen = false;
            break;
          }
        }
      }
    }

    const skipFrame = (1000/ChoreoGraph.timeDelta>ChoreoGraph.settings.maxFPS
      || (!document.hasFocus()&&ChoreoGraph.settings.pauseWhenUnfocused)
      || ChoreoGraph.settings.pauseLoop
      || pauseBecauseOffscreen)
      && continuous;

    if (!skipFrame) {
      ChoreoGraph.lastPerformanceTime = performance.now();
      for (let cg of ChoreoGraph.instances) {
        cg.timeDelta = ChoreoGraph.timeDelta*cg.settings.core.timeScale;
        cg.loop();
      }
      for (let loop of ChoreoGraph.globalAfterLoops) { loop(this); }
    }

    if (ChoreoGraph.settings.storeProcessTime) {
      ChoreoGraph.processTime = performance.now() - ChoreoGraph.lastPerformanceTime;
    }

    if (continuous) { ChoreoGraph.frame = requestAnimationFrame(ChoreoGraph.loop); }
    else { this.frame++; }
  };
};