const ChoreoGraph = new class ChoreoGraphEngine {
  VERSION = "3.2.0";
  instances = [];
  settings = {
    maxFPS : Infinity
  };

  frame = 0;
  lastPerformanceTime = performance.now();
  now = new Date();
  nowint = new Date().getTime();

  plugins = {};
  globalLoops = [];

  ChoreoGraphInstance = class ChoreoGraphInstance {
    settings = {};

    canvases = {};
    cameras = {};
    scenes = {};
    graphics = {};
    sceneItems = {};
    transforms = {};
    images = {};
    objects = {};

    keys = {
      canvases : [],
      cameras : [],
      scenes : [],
      graphics : [],
      sceneItems : [],
      transforms : [],
      images : [],
      objects : []
    };

    disabled = false;
    clock = 0;
    timeSinceLastFrame = 0;
    lastUpdate = ChoreoGraph.nowint;
    ready = false;

    graphicTypes = {};
    processLoops = [];
    overlayLoops = [];

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

    constructor(id=ChoreoGraph.id.get()) {
      this.id = id;
      this.setupCoreSettings();
    };
    setupCoreSettings() {
      this.attachSettings("core",{
        defaultCanvas : null,
        timeScale : 1,
        generateBasicEnvironment : true,
        includeCoreGraphicTypes : true,
        inactiveTime : 200,
        loadChecks : [],
        waitUntilReady : true,
        canvasSpaceScale : 1,
        frustumCulling : true,
        baseImagePath : "images/",
        defaultCursor : "default",

        callbacks : {
          loopBefore : null, // loopBefore(cg) runs before canvases are drawn
          loopAfter : null, // loopAfter(cg) runs after canvases are drawn
          resume : null, // resume(ms,cg) runs when the loop is resumed
          loadingLoop : null, // loadingLoop(checkData,cg) runs when the loop is loading
          start : null, // start() runs once when the loop starts
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
        scene.update();
      }

      if (this.settings.core.callbacks.loopBefore!=null) { this.settings.core.callbacks.loopBefore(this); }

      for (let canvasId of this.keys.canvases) {
        let canvas = this.canvases[canvasId];
        canvas.draw();
      }

      if (this.settings.core.callbacks.loopAfter!=null) { this.settings.core.callbacks.loopAfter(this); }

      for (let loop of this.overlayLoops) {
        loop(this);
      }
    };
    handleLoading() {
      if (this.settings.core.loadChecks.length==0&&ChoreoGraph.frame>0) {
        this.ready = true;
        this.onReady();
        return;
      }
      let output = [];
      for (let check of this.settings.core.loadChecks) {
        let result = check();
        if (result.pass) {
          this.ready = true;
          this.onReady();
        }
        output.push(result);
      }
      if (this.settings.core.callbacks.loadingLoop!=null) { this.settings.core.callbacks.loadingLoop(output,this); }
    };
    onReady() {
      if (this.settings.core.callbacks.start!=null) { this.settings.core.callbacks.start(this); }
      for (let pluginKey in ChoreoGraph.plugins) {
        let plugin = ChoreoGraph.plugins[pluginKey];
        if (plugin.instanceStart!=null) {
          plugin.instanceStart(this);
        }
      }
    }

    createCanvas(canvasInit={},id=ChoreoGraph.id.get()) {
      let newCanvas = new ChoreoGraph.Canvas(canvasInit,this);
      newCanvas.id = id;
      newCanvas.cg = this;
      if (this.settings.core.defaultCanvas == null) {
        this.settings.core.defaultCanvas = newCanvas;
      }
      if (this.settings.core.generateBasicEnvironment) {
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
      let newScene = new ChoreoGraph.Scene();
      newScene.id = id;
      newScene.cg = this;
      ChoreoGraph.applyAttributes(newScene,sceneInit);
      this.scenes[id] = newScene;
      this.keys.scenes.push(id);
      return newScene;
    };
    createGraphic(graphicInit={},id=ChoreoGraph.id.get()) {
      let newGraphic = new ChoreoGraph.Graphic(graphicInit,this);
      newGraphic.id = id;
      newGraphic.cg = this;
      this.graphics[id] = newGraphic;
      this.keys.graphics.push(id);
      return newGraphic;
    };
    createTransform(transformInit={},id=ChoreoGraph.id.get()) {
      let newTransform = new ChoreoGraph.Transform(transformInit,this);
      newTransform.id = id;
      newTransform.cg = this;
      ChoreoGraph.applyAttributes(newTransform,transformInit);
      this.transforms[id] = newTransform;
      this.keys.transforms.push(id);
      return newTransform;
    };
    createImage(imageInit={},id=ChoreoGraph.id.get()) {
      let newImage = new ChoreoGraph.Image(imageInit,this);
      newImage.id = id;
      newImage.cg = this;
      this.images[id] = newImage;
      this.keys.images.push(id);
      return newImage;
    };
    createObject(objectInit={},id=ChoreoGraph.id.get()) {
      let newObject = new ChoreoGraph.Object(objectInit,this);
      newObject.id = id;
      newObject.cg = this;
      this.objects[id] = newObject;
      this.keys.objects.push(id);
      return newObject;
    };
  }
  Canvas = class cgCanvas {
    width = 600;
    height = 400;

    keepCursorHidden = false;

    camera = null;
    parentElement = null;
    background = "#fba7b7";

    constructor(init,cg) {
      ChoreoGraph.applyAttributes(this,init);
      if (document.getElementsByTagName("canvas")[0].style.width != "") {
        this.width = element.width;
      } else {
        this.element.width = this.width;
      }
      if (document.getElementsByTagName("canvas")[0].style.height != "") {
        this.height = element.height;
      } else {
        this.element.height = this.height;
      }
      this.c = this.element.getContext("2d",{alpha:this.background==null});
      this.element.style.imageRendering = "pixelated"; // Remove anti-ailiasing
      this.element.cgCanvas = this;
    };

    setupParentElement(parentElement) {
      let ro = new ResizeObserver(entries => {
        for (let entry of entries) {
          let cr = entry.contentRect;
          this.element.width = cr.width;
          this.element.height = cr.height
          this.width = cr.width;
          this.height = cr.height;
        }
      });
      ro.observe(parentElement);
    };
    setCamera(camera) {
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
      } else {
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
      
      let box = 0;
      let boy = 0;

      if (this.cg.settings.core.frustumCulling&&item.graphic.getBounds!==undefined) {
        let [bw, bh] = item.graphic.getBounds();

        if (item.transform.r!==0) {
          let r = -item.transform.r+90;
          let rad = r*Math.PI/180;
          let savedbw = bw;
          bw = Math.abs(bw*Math.cos(rad))+Math.abs(bh*Math.sin(rad));
          bh = Math.abs(savedbw*Math.sin(rad))+Math.abs(bh*Math.cos(rad));

          let rox = Math.sin(rad)*gax-Math.cos(rad)*gay;
          let roy = Math.cos(rad)*gax+Math.sin(rad)*gay;
          box += rox;
          boy += roy;
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
        let cw = this.width/camera.z;
        let ch = this.height/camera.z;

        ChoreoGraph.transformContext(this.camera,bx,by);
        
        if (bx+bw*0.5<cx-cw*0.5||bx-bw*0.5>cx+cw*0.5||by+bh*0.5<cy-ch*0.5||by-bh*0.5>cy+ch*0.5) { return; }
      }

      ChoreoGraph.transformContext(this.camera,gx,gy,gr,gsx,gsy,CGSpace,flipX,flipY,canvasSpaceXAnchor,canvasSpaceYAnchor);

      this.c.globalAlpha = go;
      item.graphic.draw(this.c,gax,gay);
    }
  };

  Camera = class cgCamera {
    scenes = [];
    canvas = null;

    cullOverride = null; // A camera that will be used instead of the current for culling

    get x() { return this.transform.x+this.transform.ox; };
    get y() { return this.transform.y+this.transform.oy; };
    z = 1; // Zoom

    transform = null;

    scaleMode = "pixels";

    // pixels - for maintaining pixel ratios
    pixelScale = 1; // Pixels per pixel

    // maximum - for dynamic aspect ratios and screen resolutions
    maximumSize = 500; // The amount of units to be the maximum
    WHRatio = 0.5; // Width:Height Ratio

    // Values used for the transformation
    get cx() {
      return -this.x+this.canvas.width*0.5;
    };

    get cy() {
      return -this.y+this.canvas.height*0.5;
    };

    get cz() {
      if (this.scaleMode=="pixels") {
        return this.z*this.pixelScale;
      } else if (this.scaleMode=="maximum") {
        if (this.canvas.width*(this.WHRatio)>this.canvas.height*(1-this.WHRatio)) {
          return this.z*(this.canvas.width/this.maximumSize);
        } else {
          return this.z*(this.canvas.height/this.maximumSize);
        }
      }
    };

    constructor(cameraInit,cg) {
      if (cameraInit.transform===undefined) {
        if (cameraInit.transformId!=undefined) {
          this.transform = cg.createTransform();
        } else {
          this.transform = cg.createTransform({},cameraInit.transformId);
          delete cameraInit.transformId;
        }
      }
      if (cameraInit.x!=undefined) { this.transform.x = cameraInit.x; delete cameraInit.x; }
      if (cameraInit.y!=undefined) { this.transform.y = cameraInit.y; delete cameraInit.y; }
      ChoreoGraph.applyAttributes(this,cameraInit);
    };

    addScene(scene) {
      this.scenes.push(scene);
      scene.cameras.push(this);
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

    createItem(type,init={},id=ChoreoGraph.id.get(),collection=null) {
      if (collection!==null&&this.collections[collection]===undefined) {
        console.warn("Collection with id:",collection,"does not exist");
        return;
      }
      let newItem;
      if (type=="graphic") {
        if (init.transform===undefined) { init.transform = this.cg.createTransform(); }
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
      this.cg.sceneItems[id] = newItem;
      this.cg.keys.sceneItems.push(id);

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
          let newBufferCollection = {type:"collection",children:[]};
          buffer.push(newBufferCollection);
          if (item.children.length===0) { continue; }
          this.drawBufferCollections[item.id] = newBufferCollection.children;
          this.processCollection(item.children,newBufferCollection.children);
        }
      }
    };
    processObjects() {
      for (let object of this.objects) {
        object.update(this);
      }
    };
    addToBuffer(graphic,transform,collection=null) {
      if (collection===null) {
        this.drawBuffer.push({type:"graphic",transform:transform,graphic:graphic});
      } else {
        if (this.drawBufferCollections[collection]===undefined) {
          this.drawBufferCollections[collection] = [];
        }
        this.drawBufferCollections[collection].push({type:"graphic",transform:transform,graphic:graphic});
      }
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

    constructor(graphicInit,cg) {
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

    flipX = false; // Flip X
    flipY = false; // Flip Y

    CGSpace = true; // CG Space or Canvas Space
    canvasSpaceXAnchor = 0; // 0-1
    canvasSpaceYAnchor = 0; // 0-1

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

    delete() {
      ChoreoGraph.id.release(this.id);
      this.cg.keys.transforms.splice(this.cg.keys.transforms.indexOf(this.id),1);
      delete this.cg.transforms[this.id];
    }
  };

  Image = class cgImage {
    file = null;
    image = null;
    id = null;

    crop = [0,0,100,100];
    unsetCrop = true;

    rawWidth = 0;
    rawHeight = 0;

    width = 100;
    height = 100;

    scale = [1,1];
    ready = false;
    loadAttempts = 0;

    onLoad = null;

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
        this.rawImage.DrawableImage = this;
  
        this.rawImage.onload = function() {
          let image = this.DrawableImage;
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
          if (this.onLoad!=null) { this.onLoad(this); }
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
    }
  };

  Object = class cgObject {
    objectData = {
      components : [],
      deleteTransformOnDelete : true
    };
    transform = null;

    constructor(objectInit,cg) {
      if (objectInit.transform==undefined) {
        if (objectInit.transformId!=undefined) {
          this.transform = cg.createTransform();
        } else {
          this.transform = cg.createTransform({},objectInit.transformId);
          delete objectInit.transformId;
        }
      }
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
        if (component.update!=undefined) { component.update(scene); }
      }
    };

    delete() {
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
        if (componentInit.transform==undefined) {
          if (componentInit.transformId!=undefined) {
            this.transform = object.cg.createTransform();
          } else {
            this.transform = object.cg.createTransform({},componentInit.transformId);
            delete componentInit.transformId;
          }
        }
        ChoreoGraph.initObjectComponent(this,componentInit);
        if (this.transform.parent==null) { this.transform.parent = object.transform; }
        if (this.graphic==null) {
          console.error("Graphic not defined for graphic component",this,componentInit);
        }
      };

      update(scene) {
        scene.addToBuffer(this.graphic,this.transform,this.collection);
      };

      delete() {
        if (this.deleteTransformOnDelete) {
          this.transform.delete();
        };
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
    }
    release(id) {
      if (id[0]==="!") {
        this.used.splice(this.used.indexOf(id),1);
      }
    }
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
    }
  };

  attachCoreGraphicTypes(cg) {
    cg.graphicTypes.rectangle = new class RectangleGraphic {
      setup(init,cg) {
        this.fill = true;
        this.lineWidth = 1;
        this.lineJoin = "round";
        this.miterLimit = 10;
  
        this.width = 50;
        this.height = 50;
        this.colour = "#ff0000";
      };
      draw(c,ax,ay) {
        c.beginPath();
        c.rect(-this.width/2+ax, -this.height/2+ay, this.width, this.height);
        if (this.fill) { c.fillStyle = this.colour; c.fill(); } else { c.lineWidth = this.lineWidth; c.strokeStyle = this.colour; c.stroke(); }
      };
      getBounds() {
        return [this.width,this.height];
      };
    };
    cg.graphicTypes.image = new class ImageGraphic {
      setup(init,cg) {
        if (init.image==undefined) { console.error("Image not defined in image graphic"); return; }
        this.image = init.image;
        if (this.image.width==undefined||this.image.height==undefined) {
          if (this.image.graphicsAwaitingImageLoad==undefined) { this.image.graphicsAwaitingImageLoad = []; }
          this.image.graphicsAwaitingImageLoad.push(g);
          this.image.onLoad = function(image) {
            for (let g=0; g<image.graphicsAwaitingImageLoad.length; g++) {
              let g = image.graphicsAwaitingImageLoad[g];
              if (this.width==undefined) { this.width = image.width; }
              if (this.height==undefined) { this.height = image.height; }
            }
            delete image.graphicsAwaitingImageLoad;
          }
        }
        this.width = this.image.width;
        this.height = this.image.height;
      };
      draw(c,ax,ay) {
        if (this.image.canvasOnCanvas||this.image.disableCropping) {
          c.drawImage(this.image.image, -(this.width/2)+ax, -(this.height/2)+ay, this.width, this.height);
        } else {
          let crop = this.image.crop;
          c.drawImage(this.image.image, crop[0], crop[1], crop[2], crop[3], -(this.width/2)+ax, -(this.height/2)+ay, this.width, this.height);
        }
      };
      getBounds() {
        return [this.width,this.height];
      };
    };
  };

  applyAttributes(obj,attributes) {
    for (let key in attributes) {
      obj[key] = attributes[key];
    }
  };

  colourLerp(colourFrom, colourTo, amount) {
    let splitcolourTo = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colourTo);
    if (splitcolourTo!=null) { colourTo = splitcolourTo ? splitcolourTo.map(i => parseInt(i, 16)).slice(1) : null; } else { return colourFrom; }
    let splitcolourFrom = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colourFrom);
    if (splitcolourFrom!=null) { colourFrom = splitcolourFrom ? splitcolourFrom.map(i => parseInt(i, 16)).slice(1) : null; } else { return colourFrom; }  
    let r = colourTo[0] * amount + colourFrom[0] * (1 - amount);
    let g = colourTo[1] * amount + colourFrom[1] * (1 - amount);
    let b = colourTo[2] * amount + colourFrom[2] * (1 - amount);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).split(".")[0];
  }
  
  transformContext(camera,x=0,y=0,r=0,sx=1,sy=1,CGSpace=true,flipX=false,flipY=false,canvasSpaceXAnchor,canvasSpaceYAnchor,ctx=camera.canvas.c,cx=camera.cx,cy=camera.cy,cz=camera.cz,canvasSpaceScale=cg.settings.core.canvasSpaceScale,w=camera.canvas.width,h=camera.canvas.height,manualScaling=false) {
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
    let cg = new ChoreoGraph.ChoreoGraphInstance(ChoreoGraph.instances.length);

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
    this.loop();
  };

  loop() {
    ChoreoGraph.now = new Date();
    ChoreoGraph.nowint = ChoreoGraph.now.getTime();
    ChoreoGraph.timeDelta = performance.now() - ChoreoGraph.lastPerformanceTime;
    for (let loop of ChoreoGraph.globalLoops) {
      loop(this);
    }
    const skipFrame = ((1000/ChoreoGraph.timeDelta>ChoreoGraph.settings.maxFPS||(!document.hasFocus()&&ChoreoGraph.settings.pauseWhenUnfocused)));
    if (!skipFrame) {
      ChoreoGraph.lastPerformanceTime = performance.now();
      for (let cg of ChoreoGraph.instances) {
        cg.timeDelta = ChoreoGraph.timeDelta*cg.settings.core.timeScale;
        cg.loop();
      }
    }
    ChoreoGraph.frame = requestAnimationFrame(ChoreoGraph.loop);
  };
};