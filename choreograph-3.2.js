const ChoreoGraph = new class ChoreoGraphEngine {
  VERSION = "3.2.0";
  instances = [];
  settings = {
    maxFPS : Infinity
  };

  frame = 0;
  lastPerformanceTime = performance.now();
  nowint = new Date().getTime();

  plugins = {};

  ChoreoGraphInstance = class ChoreoGraphInstance {
    settings = {};
    canvases = {};
    cameras = {};
    scenes = {};
    graphics = {};
    sceneItems = {};
    objects = {};
    transforms = {};

    keys = {
      canvases : [],
      cameras : [],
      scenes : [],
      graphics : [],
      sceneItems : [],
      objects : [],
      transforms : []
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

      // // OBJECTS
      // for (let id in this.objects) {
      //   let object = this.objects[id];
      //   object.update();
      //   if (object.delete) {
      //     ChoreoGraph.releaseId(object.id.replace("obj_",""));
      //     for (let key in object.components) {
      //       ChoreoGraph.releaseId(object.components[key].id.replace("comp_",""));
      //       if (object.components[key].manifest.collapse) {
      //         object.components[key].collapse();
      //       }
      //     }
      //   }
      // }
      // this.objects = Object.fromEntries(Object.entries(this.objects).filter(([key, value]) => !value.delete));
    
      // if (this.settings.useCamera) {
      //   this.x = -this.camera.x+this.cw/2;
      //   this.y = -this.camera.y+this.ch/2;
      //   if (this.camera.scaleMode=="pixels") {
      //     this.z = this.camera.z*this.camera.scale;
      //   } else if (this.camera.scaleMode=="maximum") {
      //     if (this.cw*(this.camera.WHRatio)>this.ch*(1-this.camera.WHRatio)) {
      //       this.z = this.camera.z*(this.cw/this.camera.maximumSize);
      //     } else {
      //       this.z = this.camera.z*(this.ch/this.camera.maximumSize);
      //     }
      //   }
      // }
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

    createCanvas(canvasInit,id=ChoreoGraph.id.get()) {
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
        this.cameras.main.x = newCanvas.width/2;
        this.cameras.main.y = newCanvas.height/2;
      }
      this.canvases[newCanvas.id] = newCanvas;
      this.keys.canvases.push(newCanvas.id);
      return newCanvas;
    };
    createCamera(cameraInit,id=ChoreoGraph.id.get()) {
      let newCamera = new ChoreoGraph.Camera(id,this);
      newCamera.id = id;
      newCamera.cg = this;
      ChoreoGraph.applyAttributes(newCamera,cameraInit);
      this.cameras[id] = newCamera;
      this.keys.cameras.push(id);
      return newCamera;
    };
    createScene(sceneInit,id=ChoreoGraph.id.get()) {
      let newScene = new ChoreoGraph.Scene(id,this);
      newScene.id = id;
      newScene.cg = this;
      ChoreoGraph.applyAttributes(newScene,sceneInit);
      this.scenes[id] = newScene;
      this.keys.scenes.push(id);
      return newScene;
    };
    createGraphic(graphicInit,id=ChoreoGraph.id.get()) {
      let newGraphic = new ChoreoGraph.Graphic(graphicInit,this);
      newGraphic.id = id;
      newGraphic.cg = this;
      ChoreoGraph.applyAttributes(newGraphic,graphicInit);
      this.graphics[id] = newGraphic;
      this.keys.graphics.push(id);
      return newGraphic;
    };
    createTransform(transformInit,id=ChoreoGraph.id.get()) {
      let newTransform = new ChoreoGraph.Transform(transformInit,this);
      newTransform.id = id;
      newTransform.cg = this;
      ChoreoGraph.applyAttributes(newTransform,transformInit);
      this.transforms[id] = newTransform;
      this.keys.transforms.push(id);
      return newTransform;
    }
  }
  Canvas = class cgCanvas {
    width = 600;
    height = 400;

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
    }

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
    }
    setCamera(camera) {
      if (this.camera !== null) {
        this.camera.canvas = null;
      }
      this.camera = camera;
      camera.canvas = this;
    }
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
    }
    drawCollection(collection) {
      for (let item of collection) {
        if (item.type=="graphic") {
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

          ChoreoGraph.transformContext(this.camera,gx,gy,gr,gsx,gsy,CGSpace,flipX,flipY,canvasSpaceXAnchor,canvasSpaceYAnchor);

          item.graphic.draw(this.c,gax,gay);
        } else if (item.type=="collection") {
          this.drawCollection(item.children);
        }
      }
    }
  };

  Camera = class cgCamera {
    scenes = [];
    canvas = null;

    x = 0;
    y = 0;
    z = 1; // Zoom

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
    }
    remove(id) {
      for (let i=0;i<this.structure.length;i++) {
        if (this.structure[i].id==id) {
          this.structure.splice(i,1);
        }
      }
      return this;
    }
    update() {
      this.drawBuffer.length = 0;
      this.drawBufferCollections = {};
      this.processCollection(this.structure,this.drawBuffer);
      this.processObjects();
    }
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
    }
    processObjects() {
      for (let object of this.objects) {
        let graphics = object.update();
        for (let graphic of graphics) {
          if (graphic.collection===null) {
            this.drawBuffer.push(graphic);
          } else {
            this.drawBufferCollections[graphic.collection].push(graphic);
          }
        }
      }
    }
    addToBuffer(graphic,transform,collection=null) {
      if (collection===null) {
        this.drawBuffer.push({type:"graphic",transform:transform,graphic:graphic});
      } else {
        if (this.drawBufferCollections[collection]===undefined) {
          this.drawBufferCollections[collection] = [];
        }
        this.drawBufferCollections[collection].push({type:"graphic",transform:transform,graphic:graphic});
      }
    }
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
        if (graphicType.setup!==undefined) { graphicType.setup(this,graphicInit,cg); }
      } else {
        console.error("Graphic type not found:",graphicInit.type);
        return;
      }
      ChoreoGraph.applyAttributes(this,graphicInit);
      this.draw = graphicType.draw;
    }
  };

  Transform = class cgTransform {
    x = 0; // X
    y = 0; // Y
    sx = 1; // Scale X
    sy = 1; // Scale Y
    ax = 0; // Anchor X
    ay = 0; // Anchor Y
    r = 0; // Rotation
    o = 1; // Opacity

    ox = 0; // Offset X
    oy = 0; // Offset Y
    osx = 0; // Offset Scale X
    osy = 0; // Offset Scale Y
    oax = 0; // Offset Anchor X
    oay = 0; // Offset Anchor Y
    or = 0; // Offset Rotation
    oo = 0; // Offset Opacity

    flipX = false; // Flip X
    flipY = false; // Flip Y

    CGSpace = true; // CG Space or Canvas Space
    canvasSpaceXAnchor = 0; // 0-1
    canvasSpaceYAnchor = 0; // 0-1
  }

  Object = class cgObject {
    components = {};
    delete = false;

    constructor(objectInit={}) {
      this.attach("Transform");

      for (let key in this.Transform) {
        if (["manifest","id"].includes(key)) { continue; }
        if (objectInit[key]!==undefined) {
          this.Transform[key] = objectInit[key];
          delete objectInit[key];
        }
      }

      if (objectInit!=undefined) {
        for (let key in objectInit) {
          this[key] = objectInit[key];
        }
      }
      if (this.id==undefined) { this.id = "obj_" + ChoreoGraph.createId(5); }
    }
    update() {
      if (this.delete) { return; }
      let output = [];
      for (let compId in this.components) {
        let component = this.components[compId];
        if (component.manifest.update) {
          if (component.graphical) {
            output.push(component.update(this));
          } else {
            component.update(this);
          }
        }
      }
      return output;
    }
    attach(componentName, componentInit={}) {
      if (ChoreoGraph.ObjectComponents[componentName]==undefined) { console.error('The component: "'+componentName+'" does not exist.'); return; }
      let newComponent = new ChoreoGraph.ObjectComponents[componentName](componentInit,this);
      if (newComponent.manifest.master) {
        let componentKey = newComponent.manifest.title;
        if (newComponent.manifest.keyOverride!="") {
          componentKey = newComponent.manifest.keyOverride;
        }
        this[componentKey] = newComponent;
      }
      this.components[newComponent.id] = newComponent;
      return this;
    }
    getComponent(componentName) {
      for (let compId in this.components) {
        let component = this.components[compId];
        let componentKey = component.manifest.title;
        if (component.manifest.keyOverride!="") { componentKey = component.manifest.keyOverride; }
        if (componentKey==componentName) {
          return component;
        }
      }
      return null;
    }
  };
  
  ObjectComponents = {
    Transform: class Transform {
      manifest = {
        title : "Transform",
        master : true,
        keyOverride : "",
        update : false,
        collapse : false,
        graphical : false
      }
      x = 0; // X
      y = 0; // Y
      ox = 0; // Offset X
      oy = 0; // Offset Y
      sx = 1; // Scale X
      sy = 1; // Scale Y
      ax = 0; // Anchor X
      ay = 0; // Anchor Y
      r = 0; // Rotation
      or = 0; // Offset Rotation

      constructor(componentInit, object) {
        ChoreoGraph.initObjectComponent(this, componentInit);
      }
    },
    Graphic: class Graphic {
      manifest = {
        title : "Graphic",
        master : false,
        keyOverride : "",
        update : true,
        collapse : true,
        graphical : true
      }
      collection = null;
      graphic = null;
      deleteGraphicOnCollapse = false;

      transform = {};

      constructor(componentInit, object) {
        ChoreoGraph.initObjectComponent(this, componentInit);
        if (this.graphic==null) {
          console.error("Graphic not defined for graphic component " + this.id + " on " + object.id);
        }
      }
      update(object) {
        this.transform.x  = object.Transform.x + object.Transform.ox;
        this.transform.y  = object.Transform.y + object.Transform.oy;
        this.transform.sx = object.Transform.sx;
        this.transform.sy = object.Transform.sy;
        this.transform.ax = object.Transform.ax;
        this.transform.ay = object.Transform.ay;
        this.transform.r  = object.Transform.r + object.Transform.or;

        return {callback:this.graphic.draw,transform:transform,collection:this.collection};
      }
      collapse() {
        if (this.deleteGraphicOnCollapse&&this.graphic!=null) {
          ChoreoGraph.releaseId(this.graphic.id.replace("graphic_",""));
          delete this.graphic.ChoreoGraph.graphics[this.graphic.id];
        }
      }
    }
  };

  initObjectComponent(component, componentInit) {
    if (componentInit!=undefined) {
      for (let key in componentInit) {
        if (key=="master"||key=="keyOverride") {
          component.manifest[key] = componentInit[key]; 
        } else {
          component[key] = componentInit[key];
        }
      }
    }
    if (component.id===undefined) { component.id = "comp_" + ChoreoGraph.createId(5); }
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
      this.used.splice(this.used.indexOf(id),1);
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
      setup(g,init,cg) {
        g.fill = true;
        g.lineWidth = 1;
        g.lineJoin = "round";
        g.miterLimit = 10;
  
        g.width = 50;
        g.height = 50;
        g.colour = "#ff0000";
      }
      draw(c,ax,ay) {
        c.beginPath();
        c.rect(-this.width/2+ax, -this.height/2+ay, this.width, this.height);
        if (this.fill) { c.fillStyle = this.colour; c.fill(); } else { c.lineWidth = this.lineWidth; c.strokeStyle = this.colour; c.stroke(); }
      }
      getBounds() {
        return [this.width,this.height];
      }
    }
  };

  applyAttributes(obj,attributes) {
    for (let key in attributes) {
      obj[key] = attributes[key];
    }
  };
  
  transformContext(camera,x=0,y=0,r=0,sx=1,sy=1,CGSpace=true,flipX=false,flipY=false,canvasSpaceXAnchor,canvasSpaceYAnchor,ctx=camera.canvas.c,cx=camera.cx,cy=camera.cy,cz=camera.cz,canvasSpaceScale=cg.settings.canvasSpaceScale,w=camera.canvas.width,h=camera.canvas.height,manualScaling=false) {
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
    // for (let i=0; i<ChoreoGraph.instances.length; i++) {
    //   let instance = ChoreoGraph.instances[i];
    //   for (let j=0;j<plugin.instanceExternalLoops.length;j++) {
    //     instance.externalLoops.push(plugin.instanceExternalLoops[j]);
    //   }
    //   if (plugin.instanceConnect!=null) { plugin.instanceConnect(instance); }
    // }
    // for (let j=0;j<plugin.externalContentLoops.length;j++) {
    //   this.externalContentLoops.push(plugin.externalContentLoops[j]);
    // }
    // for (let j=0;j<plugin.externalMainLoops.length;j++) {
    //   this.externalMainLoops.push(plugin.externalMainLoops[j]);
    // }
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
    let skipFrame = ((1000/ChoreoGraph.timeDelta>ChoreoGraph.settings.maxFPS||(!document.hasFocus()&&ChoreoGraph.settings.pauseWhenUnfocused)));
    if (skipFrame) {
      ChoreoGraph.frame = requestAnimationFrame(ChoreoGraph.loop);
    } else {
      ChoreoGraph.lastPerformanceTime = performance.now();
      for (let cg of ChoreoGraph.instances) {
        cg.timeDelta = ChoreoGraph.timeDelta*cg.settings.core.timeScale;
        cg.loop();
      }
      ChoreoGraph.frame = requestAnimationFrame(ChoreoGraph.loop);
    }
  };
};