const ChoreoGraph = new class ChoreoGraphEngine {
  VERSION = "3.1.0";
  instances = [];
  now = new Date();
  nowint = this.now.getTime();
  run = 0; // The number of times the ChoreoGraph loop has run
  timeDelta = 0;
  lastPerformanceTime = 0;
  usedUids = []; // A list of used ids to prevent them from being reused
  playtime = 0; // The interactive time by the user
  settings = {
    maxFPS : 70, // If the time timeDelta is too short it will skip the frame
    pauseWhenUnfocused : false, // Stops the main look when document.hasFocus() is false
    realtime : true, // If true, the timeDelta is based on real time, if false, it can be manually controlled
    nextFrame : false // Moves time by the timeDelta by one frame if realtime is false
  }
  graphicTypes = {
    image : new class ImageGraphic {
      setup(graphic,graphicInit,cg) {
        if (graphicInit.image==undefined) { console.error("Image not defined in image graphic"); return; }
        graphic.image = graphicInit.image;
        if (graphic.image.width==undefined||graphic.image.height==undefined) {
          if (graphic.image.graphicsAwaitingImageLoad==undefined) { graphic.image.graphicsAwaitingImageLoad = []; }
          graphic.image.graphicsAwaitingImageLoad.push(graphic);
          graphic.image.onLoad = function(image) {
            for (let g=0; g<image.graphicsAwaitingImageLoad.length; g++) {
              let graphic = image.graphicsAwaitingImageLoad[g];
              if (graphic.width==undefined) { graphic.width = image.width; }
              if (graphic.height==undefined) { graphic.height = image.height; }
            }
            delete image.graphicsAwaitingImageLoad;
          }
        }
        graphic.width = graphic.image.width;
        graphic.height = graphic.image.height;
      }
      draw(graphic,cg,ax,ay) {
        if (graphic.image.canvasOnCanvas||graphic.image.disableCropping) {
          cg.c.drawImage(graphic.image.image, -(graphic.width/2)+ax, -(graphic.height/2)+ay, graphic.width, graphic.height);
        } else {
          let crop = graphic.image.crop;
          cg.c.drawImage(graphic.image.image, crop[0], crop[1], crop[2], crop[3], -(graphic.width/2)+ax, -(graphic.height/2)+ay, graphic.width, graphic.height);
        }
      }
    },
    arc : new class ArcGraphic {
      setup(graphic,graphicInit,cg) {
        if (graphicInit.radius==undefined) { console.error("Radius not defined in arc graphic"); return; }
        graphic.fill = true;
        graphic.lineWidth = 1;
        graphic.lineCap = "round";

        graphic.radius = 5;
        graphic.colour = "#ff0000";
        graphic.start = 0;
        graphic.end = 2*Math.PI;
        graphic.counterclockwise = false;
      }
      draw(graphic,cg,ax,ay) {
        cg.c.beginPath();
        cg.c.arc(ax, ay, graphic.radius,graphic.start,graphic.end,graphic.counterclockwise);
        if (graphic.fill) { cg.c.fillStyle = graphic.colour; cg.c.fill(); } else { cg.c.lineWidth = graphic.lineWidth; cg.c.strokeStyle = graphic.colour; cg.c.stroke(); }
      }
    },
    polygon : new class PolygonGraphic {
      setup(graphic,graphicInit,cg) {
        graphic.fill = true;
        graphic.lineWidth = 1;
        graphic.lineJoin = "round";
        graphic.miterLimit = 10;
        graphic.lineCap = "round";

        graphic.closePath = true;
        graphic.path = [];
        graphic.colour = "#ff0000";
      }
      draw(graphic,cg,ax,ay) {
        cg.c.beginPath();
        cg.c.moveTo(graphic.path[0][0]+ax, graphic.path[0][1]+ay);
        for (let i=1; i<graphic.path.length; i++) { cg.c.lineTo(graphic.path[i][0]+ax, graphic.path[i][1]+ay); }
        if (graphic.closePath) { cg.c.closePath(); }
        if (graphic.fill) { cg.c.fillStyle = graphic.colour; cg.c.fill(); } else { cg.c.lineWidth = graphic.lineWidth; cg.c.strokeStyle = graphic.colour; cg.c.stroke(); }
      }
    },
    rectangle : new class RectangleGraphic {
      setup(graphic,graphicInit,cg) {
        graphic.fill = true;
        graphic.lineWidth = 1;
        graphic.lineJoin = "round";
        graphic.miterLimit = 10;
  
        graphic.width = 50;
        graphic.height = 50;
        graphic.colour = "#ff0000";
      }
      draw(graphic,cg,ax,ay) {
        cg.c.beginPath();
        cg.c.rect(-graphic.width/2+ax, -graphic.height/2+ay, graphic.width, graphic.height);
        if (graphic.fill) { cg.c.fillStyle = graphic.colour; cg.c.fill(); } else { cg.c.lineWidth = graphic.lineWidth; cg.c.strokeStyle = graphic.colour; cg.c.stroke(); }
      }
    },
    pointText : new class PointTextGraphic {
      setup(graphic,graphicInit,cg) {
        graphic.text = "Point Text";
        graphic.font = "20px Arial";
        graphic.colour = "#ff0000";
        graphic.textAlign = "left";
        graphic.textBaseline = "alphabetic";
        graphic.fill = true;
        graphic.lineWidth = 1;
        graphic.maxWidth = null;
      }
      draw(graphic,cg,ax,ay) {
        cg.c.font = graphic.font;
        cg.c.textAlign = graphic.textAlign;
        cg.c.textBaseline = graphic.textBaseline;
        if (graphic.fill) {
          cg.c.fillStyle = graphic.colour;
          cg.c.fillText(graphic.text,0,0);
        } else {
          cg.c.strokeStyle = graphic.colour;
          cg.c.lineWidth = graphic.lineWidth;
          cg.c.strokeText(graphic.text,0,0);
        }
      }
    },
    areaText : new class AreaTextGraphic {
      setup(graphic,graphicInit,cg) {
        graphic.text = graphicInit.text || "Area Text";
        graphic.font = graphicInit.font || "20px Arial";
        graphic.width = graphicInit.width || 150;
  
        graphic.leading = 20;
        graphic.area = "middle";
        graphic.textAlign = "left";
        graphic.textBaseline = "alphabetic";
        graphic.colour = "#ff0000";
        graphic.fill = true;
        graphic.lineWidth = 1;
  
        graphic.textLines = [];
        
        let manualSplits = (graphic.text).toString().split("\n");
        let words = [];
        for (let msI=0; msI < manualSplits.length; msI++) {
          words = words.concat(manualSplits[msI].split(" "));
          if (msI!=manualSplits.length-1) { words.push("\n"); }
        }
  
        cg.c.font = graphic.font;
        let line = "";
        for (let wordIndex=0; wordIndex < words.length; wordIndex++) {
          if ((cg.c.measureText(line + words[wordIndex]).width > graphic.width && wordIndex > 0)||words[wordIndex]=="\n") { 
            if (line[line.length-1]==" ") {
              graphic.textLines.push(line.slice(0,-1));
            } else {
              graphic.textLines.push(line);
            }
            if (words[wordIndex]=="\n") {
              line = "";
            } else {
              line = words[wordIndex] + " ";
            }
          } else {
            line = line + words[wordIndex] + " ";
          }
        }
        if (line[line.length-1]==" ") {
          graphic.textLines.push(line.slice(0,-1));
        } else {
          graphic.textLines.push(line);
        }
      }
      draw(graphic,cg,ax,ay) {
        cg.c.font = graphic.font;
        cg.c.textAlign = graphic.textAlign;
        cg.c.textBaseline = graphic.textBaseline;
        let areaOffset = 0;
        if (graphic.area=="middle") { areaOffset = -graphic.leading*(graphic.textLines.length-1.5)/2; }
        else if (graphic.area=="bottom") { areaOffset = -graphic.leading*(graphic.textLines.length-1); }
        
        for (let lineIndex=0;lineIndex<graphic.textLines.length;lineIndex++) {
          if (graphic.fill) {
            cg.c.fillStyle = graphic.colour;
            cg.c.fillText(graphic.textLines[lineIndex],0,areaOffset+graphic.leading*lineIndex);
          } else {
            cg.c.strokeStyle = graphic.colour;
            cg.c.lineWidth = graphic.lineWidth;
            cg.c.strokeText(graphic.textLines[lineIndex],0,areaOffset+graphic.leading*lineIndex);
          }
        }
      }
    }
  }
  externalMainLoops = [];
  externalContentLoops = [];
  plugins = [];

  ChoreoGraphInstance = class ChoreoGraphInstance {
    lastUpdate = ChoreoGraph.nowint;
    lastUnpausedUpdate = ChoreoGraph.nowint;

    cnvs;
    c;

    clock = 0; // The time in milliseconds, accounts for pausing and any time lost, starts at 0
    timeDelta = 0;

    timeSinceLastFrame = 0;
    ready = false;
    paused = false;
    disabled = false;
    externalLoops = [this.sequenceController,this.eventController]; // Functions that should be run every frame added by other code

    objects = {}; // Objects that can have varied components attached
    animations = {}; // Animations that can be used by Animator components
    images = {}; // Images that are loaded and used in varied ways
    graphics = {}; // Graphics that are drawn to the canvas
    buttons = {}; // On screen buttons that work with mouse or touch
    buttonNames = []; // A list of the button ids
    buttonCount = 0; // A count of the buttons
    buttonChecks = {null:true}; // A list of checks that can be used to filter buttons
    sequences = {}; // Sequences and all their associated data
    sequenceTrackers = []; // Instances of sequences that are currently running
    events = {}; // Timed Events that are currently running

    // Instance Transformation
    x = 0;
    y = 0;
    z = 1; // Zoom (Pixel Scale)

    camera = {
      x : 0,
      y : 0,
      z : 1,

      scaleMode : "pixels",
      // pixels - for maintaining pixel ratios
      scale : 1,
      // maximum - for dynamic aspect ratios and screen resolutions
      maximumSize : 500, // The amount of units to be the maximum
      WHRatio : 0.5 // Width:Height Ratio
    }

    // preventDefault() settings
    preventSingleTouch = false; // Prevents default when only one touch is detected
    preventDefaultKeys = [];
    preventDefaultMouse = [false,false,false,false]; // Left Middle Right Wheel

    constructor(cnvs, settings, id) {
      this.id = id;
      this.cnvs = cnvs;
      this.settings = settings;
      this.cw = settings.size[0];
      this.ch = settings.size[1];
      this.cnvs.height = this.ch;
      this.cnvs.width = this.cw;
      this.cnvs.style.imageRendering = "pixelated"; // Remove anti-ailiasing

      this.cnvs.ChoreoGraph = this;
      this.boundBox = this.cnvs.getBoundingClientRect();

      this.cnvs.addEventListener("mouseenter", this.mouseEnter, false);
      this.cnvs.addEventListener("mouseleave", this.mouseLeave, false);

      this.c = this.cnvs.getContext("2d",{alpha:settings.background==null}); // Create the canvas context
      this.c.font = "bold 10px Arial";
      this.c.lineWidth = 1;
      this.c.fillStyle = "#000000";
      this.c.strokeStyle = "#000000";
      this.c.imageSmoothingEnabled = true;
      this.c.imageSmoothingQuality =  "high";
      this.c.lineJoin = "round";

      if (settings.parentElementId!=null) {
        settings.newObservedSize = true;
        settings.observedNewWidth = document.getElementById(settings.parentElementId).offsetWidth;
        settings.observedNewHeight = document.getElementById(settings.parentElementId).offsetHeight;
        let ro = new ResizeObserver(entries => {
          for (let entry of entries) {
            let cr = entry.contentRect;
            settings.observedNewWidth = cr.width;
            settings.observedNewHeight = cr.height;
            settings.newObservedSize = true;
          }
        });
        ro.observe(document.getElementById(settings.parentElementId));
      }
      
      for (let key in settings.preventDefault) {
        key = settings.preventDefault[key];
        if (key=="mouseLeft") { this.preventDefaultMouse[0] = true; }
        else if (key=="mouseMiddle") { this.preventDefaultMouse[1] = true; }
        else if (key=="mouseRight") { this.preventDefaultMouse[2] = true; }
        else if (key=="mouseWheel") { this.preventDefaultMouse[3] = true; }
        else { this.preventDefaultKeys.push(ChoreoGraph.Input.keysByName[key]); }
      }

      this.levels = Array.from(Array(this.settings.levels), () => new Array(0));
    }
    sequenceController(cg) { // Process each sequence tracker each frame, process callbacks and culling
      if (cg.paused) { return; }
      for (let efnum = 0; efnum < cg.sequenceTrackers.length; efnum++) {
        let sequenceTracker = cg.sequenceTrackers[efnum];
        if (cg.clock>sequenceTracker.ent&&sequenceTracker.part<=sequenceTracker.sequence.data.length-1) {
          let part = sequenceTracker.sequence.data[sequenceTracker.part];
          if (typeof part == "string") {
            if (sequenceTracker.sequence.callbacks[part]!=null) { sequenceTracker.sequence.callbacks[part](sequenceTracker); }
          } else if (typeof part == "number") {
            sequenceTracker.ent = cg.clock+(part*1000);
          }
          sequenceTracker.part++;
        }
      }
      cg.sequenceTrackers = cg.sequenceTrackers.filter(function(sequenceTracker) { return sequenceTracker.part<sequenceTracker.sequence.data.length;});
    }
    eventController(cg) { // Process each event each frame, process callbacks, culling and looping
      if (cg.paused) { return; }
      for (let id in cg.events) {
        let event = cg.events[id];
        if (event.ent<cg.clock) {
          if (event.end!=null) { event.end(event); }
          if (event.loop) {
            event.timeDebt = cg.clock-event.ent;
            event.stt = cg.clock;
            event.ent = cg.clock+(event.duration*1000)-event.timeDebt;
          } else {
            ChoreoGraph.releaseId(event.id.replace("event_",""));
            delete cg.events[id];
          }
        }
      }
    }
    mouseEnter() {
      ChoreoGraph.Input.hoveredCG = this.ChoreoGraph;
      ChoreoGraph.Input.hoveredCGActive = true;
      if (ChoreoGraph.Input.hoveredCG.settings.callbacks.cursorEnter!=null) { ChoreoGraph.Input.hoveredCG.settings.callbacks.cursorEnter(ChoreoGraph.Input.hoveredCG); }
    }
    mouseLeave() {
      ChoreoGraph.Input.hoveredCGActive = false;
      if (ChoreoGraph.Input.hoveredCG.settings.callbacks.cursorLeave!=null) { ChoreoGraph.Input.hoveredCG.settings.callbacks.cursorLeave(ChoreoGraph.Input.hoveredCG); }
    }
    pause() {
      this.paused = true;
    }
    unpause() {
      this.paused = false;
    }
    createObject(objectInit) {
      let newObject = new ChoreoGraph.Object(objectInit,this);
      newObject.ChoreoGraph = this;
      this.objects[newObject.id] = newObject;
      return newObject;
    }
    createAnimation(animationInit) {
      let newAnimation = new ChoreoGraph.Animation(animationInit,this);
      newAnimation.ChoreoGraph = this;
      this.animations[newAnimation.id] = newAnimation;
      return newAnimation;
    }
    createGraphicAnimation(animationInit) {
      if (animationInit.graphics==undefined) { animationInit.graphics = []; }
      if (animationInit.frames==undefined) { animationInit.frames = []; }
      if (animationInit.GraphicKey==undefined) { animationInit.GraphicKey = null; } else { animationInit.keys = ["time",animationInit.GraphicKey];}
      if (animationInit.frameRate==undefined) { animationInit.frameRate = 25; }
      let newAnimation = this.createAnimation(animationInit);
      newAnimation.ChoreoGraph = this;
      newAnimation.bake = function() {
        let cg = this.ChoreoGraph;
        this.data = [];
        if (this.GraphicKey!=null) {
          this.keys = ["time",this.GraphicKey];
        }
        for (let f=0;f<this.frames.length;f++) {
          let frame = this.frames[f];
          let graphic = cg.graphics[frame];
          if (graphic==undefined) { console.error("Graphic not found in Graphic Animation",this); return; }
          let frameTime = 1/this.frameRate;
          this.data.push([frameTime,graphic]);
        }
        if (this.data.length==1) {
          this.data = [this.data[0],this.data[0]];
        }
        this.timeKey = parseInt(Object.keys(this.keys).find(key => this.keys[key] === "time"));
      }
      if (animationInit.graphics.length+animationInit.frames.length>0) {
        newAnimation.bake();
      }
      return newAnimation;
    }
    createImage(imageInit) {
      let newImage = new ChoreoGraph.Image(imageInit,this);
      newImage.ChoreoGraph = this;
      this.images[newImage.id] = newImage;
      return newImage;
    }
    createGraphic(graphicInit,idOverride=null,save=true) {
      if (graphicInit.id==undefined&&save==false) { graphicInit.id = null; }
      else if (this.graphics[graphicInit.id]!=undefined) { graphicInit.id = undefined; }
      if (idOverride!=null) { graphicInit.id = idOverride; }
      let newGraphic = new ChoreoGraph.Graphic(graphicInit,this);
      newGraphic.ChoreoGraph = this;
      if (save) { this.graphics[newGraphic.id] = newGraphic; }
      return newGraphic;
    }
    createButton(buttonInit) {
      let newButton = new ChoreoGraph.Button(buttonInit,this);
      newButton.ChoreoGraph = this;
      this.buttons[newButton.id] = newButton;
      this.buttonNames.push(newButton.id);
      this.buttonCount++;
      return newButton;
    }
    createSequence(sequenceInit) {
      let newSequence = new ChoreoGraph.Sequence(sequenceInit,this);
      newSequence.ChoreoGraph = this;
      this.sequences[newSequence.id] = newSequence;
      return newSequence;
    }
    createEvent(eventInit) {
      let newEvent = new ChoreoGraph.Event(eventInit,this);
      newEvent.ChoreoGraph = this;
      this.events[newEvent.id] = newEvent;
      return newEvent;
    }
    getObject(link,value) {
      let object = null;
      for (let id in this.objects) {
        if (link.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), this.objects[id])==value) {
          object = this.objects[id];
          break;
        }
      }
      return object;
    }
    // Take a point and return it's position on the canvas with all instance transformations applied
    getTransX(x) { return (x+this.x)*this.z+((this.cw-(this.cw*this.z))*0.5) }
    getTransY(y) { return (y+this.y)*this.z+((this.ch-(this.ch*this.z))*0.5) }
    // Take a point and return it's untransformed position based on the transformed canvas
    getTransXreverse(x) { return (x-((this.cw-(this.cw*this.z))*0.5))/this.z-this.x }
    getTransYreverse(y) { return (y-((this.ch-(this.ch*this.z))*0.5))/this.z-this.y }
    addToLevel(level,graphic) {
      this.levels[level].push(graphic);
    }
    drawLevels() { // Draw all level based graphics
      for (let l=0; l < this.levels.length; l++) {
        for (let graphicNum=0; graphicNum < this.levels[l].length; graphicNum++) {
          let graphic = this.levels[l][graphicNum]; // Graphic
          this.drawGraphic(graphic,this);
        }
      }
    }
    drawGraphic(graphic) {
      if (graphic.o+graphic.oo==0) { return; }
      let start;
      if (graphic.averageDrawDuration==undefined) { start = performance.now(); }
      this.c.save();
      this.c.imageSmoothingEnabled = graphic.imageSmoothingEnabled;
      this.c.globalAlpha = graphic.o+graphic.oo;
      let gx = graphic.x+graphic.ox;
      let gy = graphic.y+graphic.oy;
      let gr = graphic.r+graphic.or;
      let gsx = graphic.sx+graphic.osx;
      let gsy = graphic.sy+graphic.osy;
      let CGSpace = graphic.CGSpace;
      let flipX = graphic.flipX;
      let flipY = graphic.flipY;
      let canvasSpaceXAnchor = graphic.canvasSpaceXAnchor;
      let canvasSpaceYAnchor = graphic.canvasSpaceYAnchor;
      ChoreoGraph.transformContext(this,gx,gy,gr,gsx,gsy,CGSpace,flipX,flipY,canvasSpaceXAnchor,canvasSpaceYAnchor);
      if (ChoreoGraph.graphicTypes[graphic.type].draw!==undefined) {
        ChoreoGraph.graphicTypes[graphic.type].draw(graphic,this,graphic.ax+graphic.oax,graphic.ay+graphic.oay);
      } else { console.warn("Unknown graphic type " + graphic.type) }
      this.c.restore();
      if (graphic.averageDrawDuration==undefined) {
        let timeTaken = performance.now()-start;
        if (graphic.totalDrawDuration==undefined) { graphic.totalDrawDuration = 0; graphic.totalDrawCount = 0; }
        graphic.totalDrawDuration += timeTaken;
        graphic.totalDrawCount++;
        if (graphic.averageDrawDuration==undefined&&ChoreoGraph.run>400) {
          let averageTime = graphic.totalDrawDuration/graphic.totalDrawCount;
          graphic.averageDrawDuration = averageTime;
        }
      }
    }
    drawImage(image, xloc, yloc, width=image.width, height=image.height, rotation=0, CGSpace=true, context) {
      let c = context || this.c;
      if (CGSpace) {
        xloc += this.x;
        yloc += this.y;
        xloc = xloc*this.z+((this.cw-(this.cw*this.z))*0.5)
        yloc = yloc*this.z+((this.ch-(this.ch*this.z))*0.5)
        width = width*this.z;
        height = height*this.z;
      }
      if (image.canvasOnCanvas||image.disableCropping) {
        if (rotation!=0) {
          c.save();
          c.translate(xloc, yloc);
          c.rotate(rotation*Math.PI/180);
          c.drawImage(image.image, -(width/2), -(height/2), width, height);
          c.restore();
        } else { c.drawImage(image.image, xloc-(width/2), yloc-(height/2), width, height); }
      } else {
        let crop = image.crop;
        if (rotation!=0) {
          c.save();
          c.translate(xloc, yloc);
          c.rotate(rotation*Math.PI/180);
          c.drawImage(image.image, crop[0],crop[1],crop[2],crop[3], -(width/2), -(height/2), width, height);
          c.restore();
        } else { c.drawImage(image.image, crop[0],crop[1],crop[2],crop[3], xloc-(width/2), yloc-(height/2), width, height); }
      }
    }
    loop() {
      if (this.disabled) { return; }
      if (this.settings.newObservedSize) {
        this.cnvs.width = this.settings.observedNewWidth;
        this.cnvs.height = this.settings.observedNewHeight;
        this.cw = this.settings.observedNewWidth;
        this.ch = this.settings.observedNewHeight;
      }
      if (this.settings.background==null) {
        this.c.clearRect(0,0,this.cw,this.ch);
      } else if (this.settings.background!=false) {
        this.c.fillStyle = this.settings.background; this.c.fillRect(0,0,this.cw,this.ch);
      }

      if (ChoreoGraph.nowint-this.lastUpdate>this.settings.inactiveTime) {
        if (this.settings.callbacks.resume!=null) { this.settings.callbacks.resume(ChoreoGraph.nowint-this.lastUpdate,this); }
      }
      this.lastUpdate = ChoreoGraph.nowint;

      if (!this.paused) {
        this.timeSinceLastFrame = ChoreoGraph.nowint-this.lastUnpausedUpdate;
        this.lastUnpausedUpdate = ChoreoGraph.nowint;

        if (this.timeSinceLastFrame < this.settings.inactiveTime) {
          this.clock += this.timeSinceLastFrame*this.settings.timeScale;
        }

        // LEVELS CLEARING
        this.levels = Array.from(Array(this.settings.levels), () => new Array(0));

        // STATIC LEVEL GRAPHICS
        for (let li=0; li<this.settings.staticLevels.length; li++) {
          for (let gi=0; gi<this.settings.staticLevels[li].length; gi++) {
            let graphic = this.settings.staticLevels[li][gi];
            this.levels[li].push(graphic);
          }
        }

        // OBJECTS
        for (let id in this.objects) {
          let object = this.objects[id];
          object.update();
          if (object.delete) {
            ChoreoGraph.releaseId(object.id.replace("obj_",""));
            for (let key in object.components) {
              ChoreoGraph.releaseId(object.components[key].id.replace("comp_",""));
              if (object.components[key].manifest.collapse) {
                object.components[key].collapse();
              }
            }
          }
        }
        this.objects = Object.fromEntries(Object.entries(this.objects).filter(([key, value]) => !value.delete));
      
        // LOOPS
        if (this.settings.callbacks.loopBefore!=null) { this.settings.callbacks.loopBefore(this); }
      }

      if (this.settings.useCamera) {
        this.x = -this.camera.x+this.cw/2;
        this.y = -this.camera.y+this.ch/2;
        if (this.camera.scaleMode=="pixels") {
          this.z = this.camera.z*this.camera.scale;
        } else if (this.camera.scaleMode=="maximum") {
          if (this.cw*(this.camera.WHRatio)>this.ch*(1-this.camera.WHRatio)) {
            this.z = this.camera.z*(this.cw/this.camera.maximumSize);
          } else {
            this.z = this.camera.z*(this.ch/this.camera.maximumSize);
          }
        }
      }

      this.drawLevels();
      if (this.settings.callbacks.loopAfter!=null) { this.settings.callbacks.loopAfter(this); }

      for (let i=0; i<this.externalLoops.length; i++) { this.externalLoops[i](this); }

      if (this.paused&&this.settings.callbacks.pausedLoop!=null) { this.settings.callbacks.pausedLoop(this); }

      if (this.ready==false) { // Handle Loading
        this.ready = true;
        let loadedImages = 0;
        for (let img in this.images) {
          if (this.images[img].ready==false) {
            this.ready = false;
          } else {
            loadedImages++;
          }
        }
        if (this.ready) {
          if (this.settings.callbacks.start!=null) { this.settings.callbacks.start(this); }
        } else {
          if (this.settings.callbacks.loadingLoop!=null) { this.settings.callbacks.loadingLoop(this,loadedImages); }
        }
      }
    }
  };

  instantiate(cnvs, sInit={}) {
    let settings = {
      background : "#fba7b7", // Colour or null for transparent or false for no clearing
      size : [500,400], // Width and Height of the canvas
      parentElementId: null,
      levels : 1,
      inactiveTime : 200,
      imageDirectory : "images/",
      preventDefault : [],
      defaultButtonMouseButton : [true,false,false],
      simulateTouchUnhover : true, // Resets the cursor on a touch end event
      useCamera : false, // If cg.camera should control the view
      canvasSpaceScale : 1, // A scale transform for non-CGSpace Graphics and Buttons (its basically ui scale)
      timeScale : 1, // How many miliseconds per minisecond the clock travels at.
      animation : {
        consistentSpeedDefault : false,
        autoFacingDefault : false,
        persistentValuesDefault : false,
        animationLinks : {
            x : ["Transform","x"],
            y : ["Transform","y"],
            r : ["Transform","r"]
          }
      },
      callbacks : {
        updateButtonChecks : null, // updateButtonChecks(cg) set variables relating to if a button should activate
        keyDown : null, // keyDown(keyName) when any known key is pressed it will activate this function
        keyUp : null, // keyUp(keyName) when any known key is released it will activate this function
        cursorUp : null, // cursorUp(event,cg)
        cursorDown : null, // cursorDown(event,cg)
        cursorMove : null, // cursorMove(event,cg)
        cursorLeave : null, // cursorLeave(cg) when the cursor exits the canvas
        cursorEnter : null, // cursorEnter(cg) when the cursor enters the canvas
        wheel : null, // wheel(event) when the mouse wheel is used
        loopBefore : null, // loopBefore(cg) runs before the loop() function
        loopAfter : null, // loopAfter(cg) runs after the loop() function
        resume : null, // resume(ms,cg) runs when the loop is resumed
        pausedLoop : null, // pausedLoop() runs every paused frame
        loadingLoop : null, // loadingLoop() runs when the loop is loading
        start : null, // start() runs once when the loop starts
      },
      staticLevels : []
    };
    let stack = [[sInit,[]]];
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
          }, settings);
        }
      });
    }
  
    let instance = new ChoreoGraph.ChoreoGraphInstance(cnvs, settings, ChoreoGraph.instances.length);
    
    for (let key in ChoreoGraph.plugins) {
      let plugin = ChoreoGraph.plugins[key];
      for (let j=0;j<plugin.instanceExternalLoops.length;j++) {
        instance.externalLoops.push(plugin.instanceExternalLoops[j]);
      }
      if (plugin.instanceConnect!=null) { plugin.instanceConnect(instance); }
    }
    ChoreoGraph.instances.push(instance);
    return instance;
  };

  Image = class cgImage {
    file = null;
    image = null;
    id = null;

    crop = [0,0,100,100];
    unsetCrop = true;

    rawWidth = 0;
    rawHeight = 0;

    width = undefined;
    height = undefined;

    scale = [1,1];
    ready = false;
    loadAttempts = 0;

    onLoad = null;

    constructor(imageInit,cg) {
      if (imageInit.crop!=undefined) { this.unsetCrop = false; }
  
      for (let key in imageInit) { this[key] = imageInit[key]; }
  
      if (this.id==null) { this.id = "img_" + ChoreoGraph.createId(5); }
      if (this.file==null) { console.error("Image file not defined for " + this.id); return; };
      if (this.file.includes(".svg")&&this.disableCropping==undefined) { this.disableCropping = true; }
  
      if (this.image==null&&this.canvasOnCanvas) { // Creates a canvas and makes the image get drawn without cropping
        this.image = document.createElement("canvas");
        this.image.width = this.crop[2];
        this.image.height = this.crop[3];
        this.image.style.imageRendering = "pixelated";
  
        this.rawImage = document.createElement("IMG");
        this.rawImage.ctx = this.image.getContext("2d");
        this.rawImage.src = cg.settings.imageDirectory + this.file;
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
            this.image.src = cg.settings.imageDirectory + this.file;
          } else { console.error("Image failed to load for " + this.id + " at " + this.image.src); return; }
        };
  
        this.image.src = cg.settings.imageDirectory + this.file;
      }
    }
  }
  Animation = class cgAnimation {
    data = [];
    rawData = [];
    inUse = false;
    keys = [];
    startCallback = null;
    endCallback = null;
    id = null;

    duration = 0;

    consistentSpeed = false;
    autoFacing = false;
    persistentValues = false;

    constructor(animationInit,cg) {
      this.ChoreoGraph = cg;
      this.consistentSpeed = cg.settings.animation.consistentSpeedDefault;
      this.autoFacing = cg.settings.animation.autoFacingDefault;
      this.persistentValues = cg.settings.animation.persistentValuesDefault;

      if (animationInit!=undefined) {
        for (let key in animationInit) {
          this[key] = animationInit[key];
        }
      }
      if (this.id==null) { this.id = "anim_" + ChoreoGraph.createId(5); }
      
      this.setUp();
    }
    setUp() {
      let cg = this.ChoreoGraph;
      this.timeKey = parseInt(Object.keys(this.keys).find(key => this.keys[key] === "time"));
      if (isNaN(this.timeKey)||this.timeKey===undefined) { console.error("No time key defined for Animation: " + this.id); return; }

      let xKey = null;
      let yKey = null;
      let rKey = null;
      for (let k=0;k<this.keys.length;k++) {
        if (JSON.stringify(this.keys[k])==JSON.stringify(cg.settings.animation.animationLinks.x)) { xKey = k; }
        if (JSON.stringify(this.keys[k])==JSON.stringify(cg.settings.animation.animationLinks.y)) { yKey = k; }
        if (JSON.stringify(this.keys[k])==JSON.stringify(cg.settings.animation.animationLinks.r)) { rKey = k; }
      }

      // SAVE RAW DATA (if it was defined in the data field)
      if (this.rawData.length==0) {
        for (let part in this.data) {
          this.rawData.push(this.data[part].slice());
        }
      }

      // LOAD RAW DATA INTO BAKED DATA
      this.data = [];
      for (let part in this.rawData) {
        this.data.push(this.rawData[part].slice());
      }

       // Fill all empty values in first keyframe with 0
      if (this.data.length>0&&typeof this.data[0][0] == "number") {
        for (let value in this.keys) {
          if (this.data[0][value]==undefined) { this.data[0][value] = 0; }
        }
      }

      // CONSISTENT SPEED
      // Make each time equivilant to a 1 pixel per 1 second speed
      if (this.consistentSpeed&&xKey!=null&&yKey!=null) {
        let lastPos = [0,0];
        for (let part in this.data) {
          let frame = this.data[part];
          if ((typeof(frame[0])=="number")&&((frame[this.timeKey]===undefined)||(frame[this.timeKey]===""))) { // Excluding Events, Not already defined
            if (part!=0) { // Not the first frame
              this.data[part][this.timeKey] = parseFloat(((Math.sqrt(Math.pow((lastPos[0]-frame[xKey]),2)+Math.pow((lastPos[1]-frame[yKey]),2)))).toFixed(5)) // 1 Pixel:1 Second
            } else {
              this.data[part][this.timeKey] = 0;
            }
            lastPos = [frame[xKey],frame[yKey]];
          } else {
            if (typeof(frame[0])=="number") {
              lastPos = [frame[xKey],frame[yKey]];
            }
          }
        }
      }

      // AUTO FACING
      // Automatically set the facing of the object based on the direction of movement
      if (this.autoFacing&&xKey!=null&&yKey!=null&&rKey!=null) {
        let lastPos = [null,null];
        for (let part in this.data) {
          if (typeof this.data[part][0]=="number") {
            lastPos = [this.data[part][xKey], this.data[part][yKey]];
            break;
          }
        }
        let oldAngle = 0;
        let angleoffset = 0;
        for (let part in this.data) {
          let frame = this.data[part];
          if ((typeof(frame[0])=="number")&&(((frame[rKey]===undefined)||(frame[rKey]==="")))) {
            if (lastPos[0]==null) { // Start the path
              lastPos = [frame[xKey], frame[yKey]];
              oldAngle = frame[rKey];
              continue;
            }

            let newangle = parseFloat(ChoreoGraph.twoPointsToAngle(lastPos, [frame[0],frame[1]]).toFixed(2));
            newangle = newangle + angleoffset;
            if ((Math.abs(oldAngle-(newangle+360)))<Math.abs(oldAngle-newangle)) {
              newangle = newangle+360;
              angleoffset = angleoffset+360;
            } else if (Math.abs(oldAngle-(newangle-360))<Math.abs(oldAngle-newangle)) {
              newangle = newangle-360;
              angleoffset = angleoffset-360;
            }
            frame[rKey] = newangle;
            oldAngle = newangle;
            lastPos = [frame[xKey], frame[yKey]];
          }
        }
      }

      // PERSISTENT VALUES
      // Empty/undefined values will be filled with the last known value
      if (this.persistentValues) {
        let lastValues = [];
        for (let part in this.data) {
          let frame = this.data[part];
          for (let value in this.keys) {
            if (frame[value]===undefined||frame[value]==="") {
              frame[value] = lastValues[value];
            }
            lastValues[value] = frame[value];
          }
        }
      }

      // DOUBLE SINGLE KEYFRAMES
      // If there is only one keyframe, double it to make it a 2 frame animation
      if (this.data.length==1) {
        this.data.push(this.data[0].slice());
      }

      // DURATION
      // Calculate the duration of the animation
      for (let part in this.data) {
        let frame = this.data[part];
        if (typeof(frame[0])=="number"&&frame[this.timeKey]!=undefined&&frame[this.timeKey]!="") {
          this.duration += frame[this.timeKey];
        }
      }
    }
  }
  Button = class cgButton {
    type = "rect"; // TYPES - rect, circle, polygon
    downTime = 0;
    upTime = 0;
    enterTime = 0;
    exitTime = 0;
    hovered = false;
    pressed = false;
    check = null;
    cursor = "pointer";
    buttons = []; // Left Middle Right (true if allowed)
    
    // Callbacks
    down = null;
    up = null;
    enter = null;
    exit = null;

    CGSpace = true; // If true, the x and y values are based on ChoreoGraph space
    canvasSpaceXAnchor = 0; // 0-1
    canvasSpaceYAnchor = 0; // 0-1

    x = 0;
    y = 0;

    constructor(buttonInit,cg) {
      this.buttons = Array.from(cg.settings.defaultButtonMouseButton); // Left Middle Right (true if allowed)
    
      if (buttonInit!=undefined) {
        for (let key in buttonInit) {
          this[key] = buttonInit[key];
        }
      }
  
      if (this.id==undefined) { this.id = "btn_" + ChoreoGraph.createId(5); }
  
      if (this.type=="rect") { // x y width height
        if (this.width===undefined||this.height===undefined) {
          console.warn(`Button: ${this.id} is not a valid rect`); return;
        }
      } else if (this.type=="circle") { // x y radius
        if (this.radius===undefined) {
          console.warn(`Button: ${this.id} is not a valid circle`); return;
        }
      } else if (this.type=="polygon") { // x y polygon
        if (this.path===undefined) {
          console.warn(`Button: ${this.id} is not a valid polygon`); return;
        }
      } else {
        console.warn(`Button: ${this.id} is not a valid type`); return;
      }
    }
    cursorInside(x, y) {
      if (x<0||y<0||x>this.ChoreoGraph.cw||y>this.ChoreoGraph.ch) { return false; } // Check if inside canvas
      let bx = this.x;
      let by = this.y;
      if (this.CGSpace) {
        x = this.ChoreoGraph.getTransXreverse(x);
        y = this.ChoreoGraph.getTransYreverse(y);
      } else {
        bx *= this.ChoreoGraph.settings.canvasSpaceScale;
        by *= this.ChoreoGraph.settings.canvasSpaceScale;
        bx += this.ChoreoGraph.cw*this.canvasSpaceXAnchor;
        by += this.ChoreoGraph.ch*this.canvasSpaceYAnchor;
      }
      if (this.type=="rect") {
        let width = this.width;
        let height = this.height;
        if (!this.CGSpace) {
          width *= this.ChoreoGraph.settings.canvasSpaceScale;
          height *= this.ChoreoGraph.settings.canvasSpaceScale;
        }
        return x>bx-width/2&&x<bx+width/2&&y<by+height/2&&y>by-height/2;
      } else if (this.type=="circle") {
        let radius = this.radius;
        if (!this.CGSpace) {
          radius *= this.ChoreoGraph.settings.canvasSpaceScale;
        }
        return Math.sqrt((x-bx)**2+(y-by)**2)<radius;
      } else if (this.type=="polygon") {
        let i, j;
        let inside = false;
        for (i = 0, j = this.path.length - 1; i < this.path.length; j = i++) {
          let ip = [this.path[i][0],this.path[i][1]];
          let jp = [this.path[j][0],this.path[j][1]];
          if (!this.CGSpace) {
            ip[0] *= this.ChoreoGraph.settings.canvasSpaceScale;
            ip[1] *= this.ChoreoGraph.settings.canvasSpaceScale;
            jp[0] *= this.ChoreoGraph.settings.canvasSpaceScale;
            jp[1] *= this.ChoreoGraph.settings.canvasSpaceScale;
          }
          ip[0] += bx;
          ip[1] += by;
          jp[0] += bx;
          jp[1] += by;
          if (((ip[1] > y) != (jp[1] > y))&&(x < (jp[0]-ip[0]) * (y-ip[1]) / (jp[1]-ip[1]) + ip[0])) inside = !inside;
        }
        return inside;
      }
    }
    downHandle(event) {
      this.downTime = ChoreoGraph.nowint;
      this.pressed = true;
      if (this.down) { this.down(this,event); }
    }
    upHandle(event) {
      this.upTime = ChoreoGraph.nowint;
      this.pressed = false;
      if (this.up) { this.up(this,event); }
    }
    enterHandle(event) {
      this.enterTime = ChoreoGraph.nowint; 
      this.hovered = true;
      ChoreoGraph.Input.activeButtons++;
      ChoreoGraph.Input.hoveredCG.cnvs.style.cursor = this.cursor;
      if (this.enter) { this.enter(this,event); }
    }
    exitHandle(event) {
      this.exitTime = ChoreoGraph.nowint; 
      if (this.pressed) { this.upTime = ChoreoGraph.nowint; }
      this.pressed = false;
      this.hovered = false;
      ChoreoGraph.Input.activeButtons--;
      if (ChoreoGraph.Input.activeButtons==0) {
        ChoreoGraph.Input.hoveredCG.cnvs.style.cursor = "default";
      } else {
        for (let i=0;i<ChoreoGraph.Input.hoveredCG.buttons.length;i++) {
          if (ChoreoGraph.Input.hoveredCG.buttons[i].hovered) {
            ChoreoGraph.Input.hoveredCG.cnvs.style.cursor = ChoreoGraph.Input.hoveredCG.buttons[i].cursor;
            break;
          }
        }
      }
      if (this.exit) { this.exit(this,event); }
    }
  }
  Sequence = class cgSequence {
    id = null;
    data = [];
    callbacks = {};

    constructor(sequenceInit) {      
      if (sequenceInit!=undefined) {
        for (let key in sequenceInit) {
          this[key] = sequenceInit[key];
        }
      }
    }
    run() {
      let sequenceTracker = {"sequence":this,"part":0,"ent":0};
      this.ChoreoGraph.sequenceTrackers.push(sequenceTracker);
      return sequenceTracker;
    }
  }
  Event = class cgEvent {
    stt = 0;
    ent = 0;
    duration = 0;
    loop = false;
    timeDebt = 0;
    end = null;
    
    id = null;

    constructor(eventInit, cg) {
      if (eventInit!=undefined) {
        for (let key in eventInit) {
          this[key] = eventInit[key];
        }
      }
      if (this.id==null) { this.id = "event_" + ChoreoGraph.createId(5); }
      if (this.stt==0) { this.stt = cg.clock; }
      if (this.ent==0) { this.ent = this.stt+this.duration*1000; }
    }
  }
  Graphic = class cgGraphic {
    type = "";
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

    CGSpace = true; // If true, the graphic will be drawn in ChoreoGraph space
    canvasSpaceXAnchor = 0; // 0-1
    canvasSpaceYAnchor = 0; // 0-1
    imageSmoothingEnabled = true;

    id = null;

    constructor(graphicInit,cg) {
      this.calibrate(graphicInit, cg);
      if (graphicInit!=undefined) {
        for (let key in graphicInit) {
          if (Object.keys(this).includes(key)) {
            this[key] = graphicInit[key];
          }
        }
      }
      if (this.id==null) { this.id = "graphic_" + ChoreoGraph.createId(5); }
    }
    calibrate(graphicInit, cg) {
      let graphicType = ChoreoGraph.graphicTypes[graphicInit.type];
      if (graphicType!==undefined) {
        this.type = graphicInit.type;
        if (graphicType.setup!==undefined) { graphicType.setup(this,graphicInit,cg); }
      } else {
        console.error("Graphic type not found:",graphicInit.type);
        return;
      }
    }
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
      for (let compId in this.components) {
        let component = this.components[compId];
        if (component.manifest.update) {
          component.update(this);
        }
      }
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
  }
  Plugin = class cgPlugin {
    name = "Unnamed Plugin";
    key = "";
    version = "unknown";

    instanceExternalLoops = []; // (cg) Runs for each instance after draw call
    externalContentLoops = []; // () Runs once per ChoreoGraph loop before the draw call
    externalMainLoops = []; // () Runs once per ChoreoGraph loop before anything
    instanceConnect = null; // (cg) Run every time a new instance is created
    
    constructor(pluginInit) {
      if (pluginInit.key==undefined) { console.error("Plugin key not defined",pluginInit); return; }

      if (pluginInit!=undefined) {
        for (let key in pluginInit) {
          this[key] = pluginInit[key];
        }
      }
    }
  }
  ObjectComponents = {
    Transform: class Transform {
      manifest = {
        title : "Transform",
        master : true,
        keyOverride : "",
        update : false,
        collapse : false
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
    Animator: class Animator {
      manifest = {
        title : "Animator",
        master : true,
        keyOverride : "",
        update : true,
        collapse : true
      }
      anim = null; // Animation that is to be running (required)
      part = 0; // Index in the Animation data
      fprog = 0; // 0 - 1 frame progress for lerp
      stt = 0; // Start time
      ent = 0; // End time
      timeDebt = 0; // Time Debt (because time)
      locked = false; // If true, free will be false (this is for manual changes)
      freeChecks = []; // A list of key lists to check on the object
      free = true; // If false, Animator will be static
      ease = "linear"; // Easing function (linear, inoutA, inoutB, inA, inB, inC, outA, outB, outC)
      selfDestructAnimation = false; // Deletes the Animatation entirely after reaching the end of the Animation
      selfDestructAnimator = false; // Deletes the Animator component entirely after reaching the end of the Animation
      selfDestructObject = false; // Deletes the Object entirely after reaching the end of the Animation
      to = null; // The next positional keyframe
      from = null; // The last positional keyframe
      speed = 1; // A multiplier on the animations time values
      lastUpdate = 0; // Last time the object was updated
      triggerCallbacks = { // Callbacks for when a trigger is passed
        "S" : this.defaultTriggerCallbacks,
        "E" : this.defaultTriggerCallbacks,
        "C" : this.defaultTriggerCallbacks,
        "V" : this.defaultTriggerCallbacks,
      }

      deleteAnimationOnCollapse = false; // Deletes the Animation when the Object is deleted through an Object Collapse

      constructor(componentInit, object) {
        ChoreoGraph.initObjectComponent(this, componentInit);
        if (this.anim!=null) { this.anim.inUse = true; }
      }
      update(object) {
        let cg = object.ChoreoGraph;
        this.free = !this.locked;
        for (let i=0; i<this.freeChecks.length; i++) {
          if (this.freeChecks[i].reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object)) {
            this.free = false;
            break;
          }
        }

        if (this.anim==null) { this.free = false; }

        if (this.free) { // Update last update time
          if (cg.clock-this.lastUpdate>object.ChoreoGraph.settings.inactiveTime) {
            this.stt = this.stt + (cg.clock-this.lastUpdate);
            this.ent = this.ent + (cg.clock-this.lastUpdate);
          }
          this.lastUpdate = cg.clock;
        } else if (this.anim!=null&&typeof(this.anim.data[this.part][0])!="number") {
          this.passAllTriggers(object,0);
        }

        if (cg.clock<this.ent&&this.free) { // If animation is running
          this.fprog = 1-((this.ent-cg.clock)/(this.ent-this.stt));
          if (this.ease!="linear") { // A to Z = Least Intense to Most Intense
            if (this.ease=="inoutA") {
              this.fprog = (this.fprog**2)*(3-2*this.fprog);
            } else if (this.ease=="inoutB") {
              this.fprog = (this.fprog**2)/(2*((this.fprog**2)-this.fprog)+1);
            } else if (this.ease=="inA") {
              this.fprog = -Math.sin(this.fprog*(Math.PI/2)-1.5*Math.PI)+1;
            } else if (this.ease=="inB") {
              this.fprog = this.fprog**3;
            } else if (this.ease=="inC") {
              this.fprog = this.fprog**4;
            } else if (this.ease=="outA") {
              this.fprog = Math.sin(this.fprog*(Math.PI/2));
            } else if (this.ease=="outB") {
              this.fprog = -((1-this.fprog)**3)+1;
            } else if (this.ease=="outC") {
              this.fprog = -((1-this.fprog)**5)+1;
            }
          }
          this.updateValues(object);
        } else if (this.free) {
          if (this.part>=this.anim.data.length-1) { // if part is last of animation
            let lastAnimid = this.anim.id;
            let lastAnimKeys = JSON.stringify(this.anim.keys);
            this.anim.inUse = false;
            if (this.anim.endCallback) { this.anim.endCallback(object,this); }
            if (this.selfDestructObject||this.selfDestructAnimator||this.selfDestructAnimation) {
              if (this.selfDestructAnimation) {
                ChoreoGraph.releaseId(lastAnimid.replace("anim_",""));
                delete object.ChoreoGraph.animations[lastAnimid];
              }
              if (this.selfDestructObject) {
                object.delete = true;
              } else if (this.selfDestructAnimator) {
                if (this.manifest.keyOverride == "") {
                  delete object[this.manifest.title];
                } else {
                  delete object[this.manifest.keyOverride];
                }
                delete object.components[this.id];
                ChoreoGraph.releaseId(this.id.replace("comp_",""));
              }
              return;
            }
            this.part = 0;
            if (this.anim!=null) {
              this.anim.inUse = true;
              if (JSON.stringify(this.anim.keys)!=lastAnimKeys) { this.to = null; }
              if (this.anim.startCallback) { this.anim.startCallback(object,this); }
            } else {
              return;
            }
          } else {
            this.part++;
          }
          if (this.to==null) { // if this is the first time the animation is running
            this.from = this.anim.data[0];
            this.part = 1;
          } else {
            this.from = this.to;
            this.timeDebt = cg.clock-this.ent;
          }
          if (this.anim.duration==0) { this.timeDebt = 0; }
          // if (this.timeDebt>200) { this.timeDebt = 0; } // Pay off time debt for stuck objects
          let passTrigger = this.passAllTriggers(object,1);
          if (this.part<this.anim.data.length&&passTrigger) {
            this.to = this.anim.data[this.part];
            this.stt = cg.clock;
            this.ent = this.stt + (this.anim.data[this.part][this.anim.timeKey]*1000)/this.speed - this.timeDebt;
            this.fprog = 0;
          }
          this.updateValues(object);
        }
      }
      updateValues(object) {
        for (let i=0; i<this.anim.keys.length; i++) {
          if (this.anim.keys[i]=="time"||this.anim.keys[i]==null) { continue; }
          let lerpedValue;
          if (typeof this.from[i] == "number") {
            lerpedValue = this.from[i] + this.fprog*(this.to[i]-this.from[i]);
          } else {
            lerpedValue = this.from[i];
          }
          this.anim.keys[i].reduce((acc, key, index, array) => {
            if (index === array.length - 1) {
              acc[key] = lerpedValue;
            }
            return acc[key];
          }, object);
        }
      }
      passAllTriggers(object,triggerSequence) {
        while (typeof(this.anim.data[this.part][0])!="number") {
          let triggerType = this.anim.data[this.part][0].toUpperCase();
          let passTrigger = false;
          if (triggerType in this.triggerCallbacks) {
            passTrigger = this.triggerCallbacks[triggerType](object,this,this.anim.data[this.part]);
          } else {
            console.warn(`Trigger type: ${triggerType} is not a valid trigger`);
            passTrigger = true;
          }
          if (passTrigger) {
            this.part++;
          } else {
            return false;
          }
        }
        if (triggerSequence==0) { this.part--; }
        return true;
      }
      defaultTriggerCallbacks(object,Animator,trigger) {
        let triggerType = trigger[0].toUpperCase();
        let triggerValue = trigger[1];
        if (triggerType=="S") { // S - Set Speed
          Animator.speed = triggerValue;
        } else if (triggerType=="E") { // E - Change Ease
          Animator.ease = triggerValue;
        } else if (triggerType=="C") { // C - Evaluate Code
          eval(triggerValue);
        } else if (triggerType=="V") { // V - Set Object Value
          triggerValue.reduce((acc, key, index, array) => {
            if (index === array.length - 1) {
              acc[key] = trigger[2];
            }
            return acc[key];
          }, object);
        }
        return true;
      }
      reset() {
        this.part = 0;
        this.stt = 0;
        this.ent = 0;
        this.timeDebt = 0;
        this.to = null;
        this.from = null;
      }
      collapse() {
        if (this.deleteAnimationOnCollapse&&this.anim!=undefined) {
          ChoreoGraph.releaseId(this.anim.id.replace("anim_",""));
          delete this.anim.ChoreoGraph.graphics[this.anim.id];
        }
      }
    },
    Graphic: class Graphic {
      manifest = {
        title : "Graphic",
        master : false,
        keyOverride : "",
        update : true,
        collapse : true
      }
      level = 0;
      graphic = null;
      deleteGraphicOnCollapse = false;

      constructor(componentInit, object) {
        ChoreoGraph.initObjectComponent(this, componentInit);
        if (this.graphic==null) {
          console.error("Graphic not defined for graphic component " + this.id + " on " + object.id);
        }
      }
      update(object) {
        this.graphic.x = object.Transform.x+object.Transform.ox;
        this.graphic.y = object.Transform.y+object.Transform.oy;
        this.graphic.sx = object.Transform.sx;
        this.graphic.sy = object.Transform.sy;
        this.graphic.ax = object.Transform.ax;
        this.graphic.ay = object.Transform.ay;
        this.graphic.r = object.Transform.r+object.Transform.or;
        object.ChoreoGraph.levels[this.level].push(this.graphic);
      }
      collapse() {
        if (this.deleteGraphicOnCollapse&&this.graphic!=null) {
          ChoreoGraph.releaseId(this.graphic.id.replace("graphic_",""));
          delete this.graphic.ChoreoGraph.graphics[this.graphic.id];
        }
      }
    },
    Camera: class Camera {
      manifest = {
        title : "Camera",
        master : true,
        keyOverride : "",
        update : true,
        collapse : false
      }
      useTimeDelta = false; // If true, the smoothing value will be multiplied by timeDelta

      jump = false; // If true, the camera will jump to the target
      jumpDistance = 100; // The minimum distance for the camera to jump
      smoothing = 0; // Try 0.95 for smoothness, not with timeDelta
      offset = { // An offset for the target from the position
        x : 0,
        y : 0
      };
      target = { // The location the camera is trying to reach
        x : 0,
        y : 0
      };
      position = { // The current position of the camera
        x : 0,
        y : 0
      }

      active = true; // If true, this camera will set the instance camera values

      constructor(componentInit, object) {
        this.target = {
          x : object.Transform.x + this.offset.x,
          y : object.Transform.y + this.offset.y
        };
        this.position = {
          x : object.Transform.x + this.offset.x,
          y : object.Transform.y + this.offset.y
        }

        ChoreoGraph.initObjectComponent(this, componentInit);
      }
      update(object) {
        let frameSmooth = this.smoothing;
        if (this.useTimeDelta) { frameSmooth = Math.min(this.smoothing*ChoreoGraph.timeDelta,0.9995); }

        if (this.jump) {
          let distance = Math.sqrt((this.target.x-this.position.x)**2+(this.target.y-this.position.y)**2);
          if (distance>this.jumpDistance) {
            this.position.x = this.target.x;
            this.position.y = this.target.y;
            if (this.active) {
              object.ChoreoGraph.camera.x = this.position.x;
              object.ChoreoGraph.camera.y = this.position.y;
            }
            return;
          }
        }

        this.target.x = object.Transform.x+object.Transform.ox+this.offset.x;
        this.target.y = object.Transform.y+object.Transform.oy+this.offset.y;
        this.position.x = this.target.x+(this.position.x-this.target.x)*frameSmooth;
        this.position.y = this.target.y+(this.position.y-this.target.y)*frameSmooth;
        if (this.active) {
          object.ChoreoGraph.camera.x = this.position.x;
          object.ChoreoGraph.camera.y = this.position.y;
        }
      }
    },
    Button: class Button {
      manifest = {
        title : "Button",
        master : false,
        keyOverride : "",
        update : true,
        collapse : false
      }
      button = null;
      ox = 0; // Offset X
      oy = 0; // Offset Y
      deleteButtonOnCollapse = false;
    
      constructor(componentInit, object) {
        ChoreoGraph.initObjectComponent(this, componentInit);
      }
      update(object) {
        this.button.x = object.Transform.x + this.ox;
        this.button.y = object.Transform.y + this.oy;
        let Input = ChoreoGraph.Input;
        if (Input.hoveredCG==null) { return; }
        if (Input.hoveredCG.buttonChecks[this.button.check]&&this.button.hovered==false) {
          if (this.button.cursorInside(Input.cursor.x,Input.cursor.y)) {
            this.button.enterHandle();
          }
        } else if (this.button.hovered) {
          if (!this.button.cursorInside(Input.cursor.x,Input.cursor.y)||Input.hoveredCG.buttonChecks[this.button.check]==false) {
            this.button.exitHandle();
          }
        }
      }
      collapse() {
        if (this.deleteButtonOnCollapse&&this.button!=null) {
          ChoreoGraph.releaseId(this.button.id.replace("button_",""));
          delete this.button.ChoreoGraph.buttons[this.button.id];
        }
      }
    },
    Script: class Script {
      manifest = {
        title : "Script",
        master : false,
        keyOverride : "",
        update : true,
        collapse : true
      }
      startScript = null;
      updateScript = null;
      collapseScript = null;

      constructor(componentInit, object) {
        ChoreoGraph.initObjectComponent(this, componentInit);
        if (this.startScript!==null) {
          this.startScript(object);
        }
      }
      update(object) {
        if (this.updateScript!==null) {
          this.updateScript(object);
        }
      }
      collapse(object) {
        if (this.collapseScript!==null) {
          this.collapseScript(object);
        }
      }
    }
  }
  Input = new class Input {
    constructor() {
      document.addEventListener("keydown", this.keyDown, false);
      document.addEventListener("keyup", this.keyUp, false);
      document.addEventListener("mousedown", this.mouseDown, false);
      document.addEventListener("mouseup", this.mouseUp, false);
      document.addEventListener("mousemove", this.mouseMove, false);
      document.addEventListener("touchmove", this.touchMove, {passive: false});
      document.addEventListener("touchstart", this.touchStart, false);
      document.addEventListener("touchend", this.touchEnd, false);
      document.addEventListener("wheel", this.wheel, {passive: false});

      this.cursor = new class Cursor {
        constructor() {
          this.x = 0;
          this.y = 0;
          this.screenX = 0;
          this.screenY = 0;
          this.pageX = 0;
          this.pageY = 0;
          this.hold = {"left":false,"middle":false,"right":false,"any":false};
          this.impulse = {"left":false,"middle":false,"right":false,"any":false};
          this.down = {"left":[0,0],"middle":[0,0],"right":[0,0],"any":[0,0]};
          this.up = {"left":[0,0],"middle":[0,0],"right":[0,0],"any":[0,0]};
        }
      }
      this.keys = {3:"cancel",8:"backspace",9:"tab",12:"clear",13:"enter",16:"shift",17:"ctrl",18:"alt",19:"pause",20:"capslock",27:"escape",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down",41:"select",42:"print",43:"execute",44:"printscreen",45:"insert",46:"delete",47:"help",48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",59:";",60:"<",61:"=",62:">",63:"-",64:"@",65:"a",66:"b",67:"c",68:"d",69:"e",70:"f",71:"g",72:"h",73:"i",74:"j",75:"k",76:"l",77:"m",78:"n",79:"o",80:"p",81:"q",82:"r",83:"s",84:"t",85:"u",86:"v",87:"w",88:"x",89:"y",90:"z",91:"metaleft",92:"metaright",93:"select",95:"sleep",96:"numpad0",97:"numpad1",98:"numpad2",99:"numpad3",100:"numpad4",101:"numpad5",102:"numpad6",103:"numpad7",104:"numpad8",105:"numpad9",106:"numpad*",107:"numpad+",108:"numpad.",109:"numpad-",110:"numpad.",111:"numpad/",112:"f1",113:"f2",114:"f3",115:"f4",116:"f5",117:"f6",118:"f7",119:"f8",120:"f9",121:"f10",122:"f11",123:"f12",124:"f13",125:"f14",126:"f15",127:"f16",128:"f17",129:"f18",130:"f19",131:"f20",132:"f21",133:"f22",134:"f23",135:"f24",136:"f25",137:"f26",138:"f27",139:"f28",140:"f29",141:"f30",142:"f31",143:"f32",144:"numlock",145:"scrolllock",151:"airplane",160:"^",161:"dead",163:"#",164:"$",166:"browserback",167:"browserforward",168:"browserrefresh",169:")",170:"*",171:"+",172:"|",173:"-",174:"audiodown",175:"audioup",176:"medianext",177:"mediaprevious",178:"mediastop",179:"mediaplaypause",180:"mail",181:"audiomute",182:"audiodown",183:"audioup",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",193:"/",194:"numpad,",219:"[",220:"backslash",221:"]",222:"'",223:"`",224:"metaleft",225:"altright",226:"backslash",229:"dead",231:"ime",242:"hiraganakatakana",243:"zenkakuhankaku",244:"kanji",255:"wakeup"};
      this.keysByName = {};
      this.keyStates = {};
      for (let keyNum in this.keys) {
        this.keyStates[this.keys[keyNum]] = false;
        this.keysByName[this.keys[keyNum]] = parseInt(keyNum);
      }
      this.lastInteraction = {any:0,cursor:0,keyboard:0,playtime:0};
      this.capsLock = false;
      this.lastKey = "";
      this.activeButtons = 0;
      
      this.hoveredCG = null; // The ChoreoGraphInstance that the cursor is currently over
      this.hoveredCGActive = false; // If the cursor is currently over a ChoreoGraphInstance
      this.clickedCG = null; // The ChoreoGraphInstance that the cursor was last clicked on
    }
    keyDown(event) {
      let Input = ChoreoGraph.Input;
      if (Input.clickedCG==null||Input.clickedCG?.disabled) { return; }
      if(Input.clickedCG!=null&&Input.clickedCG.preventDefaultKeys.indexOf(event.which) > -1&&event.target == document.body) { event.preventDefault(); }
      Input.capsLock = event.getModifierState('CapsLock');
      if (Input.keyStates[Input.keys[event.which.toString()]]!=true) {
        Input.lastInteraction.any = ChoreoGraph.nowint;
        Input.lastInteraction.keyboard = ChoreoGraph.nowint;
        if (Input.keyStates[Input.keys[event.which.toString()]]!==undefined) {
          Input.keyStates[Input.keys[event.which.toString()]] = true;
          Input.lastKey = Input.keys[event.which];
        }
      }
      if (ChoreoGraph.nowint-Input.lastInteraction.playtime<60000) {
        ChoreoGraph.playtime += ChoreoGraph.nowint-Input.lastInteraction.playtime;
      }
      Input.lastInteraction.playtime = ChoreoGraph.nowint;
      if (Input.clickedCG!=null) {
        if (Input.clickedCG.settings.callbacks.keyDown!=null) { Input.clickedCG.settings.callbacks.keyDown(Input.keys[event.which]); }
      }
    }
    keyUp(event) {
      let Input = ChoreoGraph.Input;
      if (Input.clickedCG==null||Input.clickedCG?.disabled) { return; }
      Input.capsLock = event.getModifierState('CapsLock');
      if (Input.keyStates[Input.keys[event.which.toString()]]!==undefined) {
        Input.keyStates[Input.keys[event.which.toString()]] = false;
        Input.lastKey = Input.keys[event.which];
      }
      if (Input.clickedCG!=null) {
        if (Input.clickedCG.settings.callbacks.keyUp!=null) { Input.clickedCG.settings.callbacks.keyUp(Input.keys[event.which]); }
      }
    }
    mouseDown(event) {
      let Input = ChoreoGraph.Input;
      if (event.srcElement.ChoreoGraph!=undefined) {
        Input.clickedCG = event.srcElement.ChoreoGraph;
      }
      if (Input.clickedCG==null||Input.clickedCG?.disabled) { return; }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      let cursor = Input.cursor;
      cursor.hold.left = event.button==0;
      cursor.impulse.left = event.button==0;
      cursor.hold.middle = event.button==1;
      cursor.impulse.middle = event.button==1;
      cursor.hold.right = event.button==2;
      cursor.impulse.right = event.button==2;
      cursor.hold.any = true;
      cursor.impulse.any = true;
      if (cursor.hold.left) { cursor.down.left = [Input.cursor.x,Input.cursor.y]; }
      if (cursor.hold.middle) { cursor.down.middle = [Input.cursor.x,Input.cursor.y]; }
      if (cursor.hold.right) { cursor.down.right = [Input.cursor.x,Input.cursor.y]; }
      cursor.down.any = [Input.cursor.x,Input.cursor.y];

      Input.cursorDownChecks(event);
    }
    mouseUp(event) {
      let Input = ChoreoGraph.Input;
      if (Input.clickedCG==null||Input.clickedCG?.disabled) { return; }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      let cursor = ChoreoGraph.Input.cursor;
      if (cursor.hold.left) { cursor.up.left = [Input.cursor.x,Input.cursor.y]; }
      if (cursor.hold.middle) { cursor.up.middle = [Input.cursor.x,Input.cursor.y]; }
      if (cursor.hold.right) { cursor.up.right = [Input.cursor.x,Input.cursor.y]; }
      cursor.up.any = [Input.cursor.x,Input.cursor.y];
      cursor.hold.left = false;
      cursor.hold.middle = false;
      cursor.hold.right = false;
      cursor.hold.any = false;

      Input.cursorUpChecks(event);
    }
    cursorDownChecks(event) {
      let Input = ChoreoGraph.Input;

      for (let i=0; i<ChoreoGraph.instances.length; i++) {
        let instance = ChoreoGraph.instances[i];
        if (instance.settings.callbacks.cursorDown!=null) { instance.settings.callbacks.cursorDown(event,instance); }
      }
      if (Input.hoveredCG!=null) {
        if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }
        for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
          let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
          if (Input.hoveredCG.buttonChecks[button.check]&&button.hovered&&button.buttons[event.button]) {
            button.downHandle(event);
          }
        }
        if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }
        for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
          let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
          Input.checkButtonHover(button,event);
        }
      }
      if (ChoreoGraph.nowint-Input.lastInteraction.playtime<60000) {
        ChoreoGraph.playtime += ChoreoGraph.nowint-Input.lastInteraction.playtime;
      }
      Input.lastInteraction.playtime = ChoreoGraph.nowint;
    }
    cursorUpChecks(event) {
      let Input = ChoreoGraph.Input;

      for (let i=0; i<ChoreoGraph.instances.length; i++) {
        let instance = ChoreoGraph.instances[i];
        if (instance.settings.callbacks.cursorUp!=null) { instance.settings.callbacks.cursorUp(event,instance); }
      }
      if (Input.hoveredCG!=null) {
        if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }
        for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
          let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
          if (Input.hoveredCG.buttonChecks[button.check]&&button.hovered&&button.buttons[event.button]) {
            button.upHandle(event);
          }
        }
        if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }
        for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
          let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
          Input.checkButtonHover(button,event);
        }
      }
    }
    mouseMove(event) {
      let Input = ChoreoGraph.Input;
      if (event.srcElement.ChoreoGraph!=undefined) {
        Input.hoveredCG = event.srcElement.ChoreoGraph;
      }
      if (Input.hoveredCG==null||Input.hoveredCG?.disabled) { return; }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      Input.hoveredCG.boundBox = Input.hoveredCG.cnvs.getBoundingClientRect();
      Input.cursor.screenX = event.screenX;
      Input.cursor.screenY = event.screenY;
      Input.cursor.pageX = event.pageX;
      Input.cursor.pageY = event.pageY;

      Input.cursor.x = Math.floor(((event.clientX-Input.hoveredCG.boundBox.left)/Input.hoveredCG.boundBox.width)*Input.hoveredCG.cw);

      Input.cursor.y = Math.floor(((event.clientY-Input.hoveredCG.boundBox.top)/Input.hoveredCG.boundBox.height)*Input.hoveredCG.ch);

      if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }

      if (Input.hoveredCG.settings.callbacks.cursorMove!=null) { Input.hoveredCG.settings.callbacks.cursorMove(event,Input.hoveredCG); }

      for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
        let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
        Input.checkButtonHover(button,event);
      }
    }
    checkButtonHover(button,event) {
      let Input = ChoreoGraph.Input;
      if (Input.hoveredCG.buttonChecks[button.check]&&button.hovered==false) {
        if (button.cursorInside(Input.cursor.x,Input.cursor.y)) {
          button.enterHandle(event);
        }
      } else if (button.hovered) {
        if (!button.cursorInside(Input.cursor.x,Input.cursor.y)||Input.hoveredCG.buttonChecks[button.check]==false) {
          button.exitHandle(event);
        }
      }
    }
    touchMove(event) {
      let Input = ChoreoGraph.Input;
      if (event.srcElement.ChoreoGraph!=undefined) {
        Input.hoveredCG = event.srcElement.ChoreoGraph;
      }
      if (Input.hoveredCG==null||Input.hoveredCG?.disabled) { return; }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      if (Input.hoveredCG!=null&&event.target.nodeName=='CANVAS'&&event.touches.length==1&&Input.hoveredCG.preventSingleTouch) {
        event.preventDefault();
      };
      Input.hoveredCG.boundBox = Input.hoveredCG.cnvs.getBoundingClientRect();
      Input.cursor.screenX = event.touches[0].screenX;
      Input.cursor.screenY = event.touches[0].screenY;
      Input.cursor.pageX = event.touches[0].pageX;
      Input.cursor.pageY = event.touches[0].pageY;

      Input.cursor.x = Math.floor(((event.touches[0].clientX-Input.hoveredCG.boundBox.left)/Input.hoveredCG.boundBox.width)*Input.hoveredCG.cw);

      Input.cursor.y = Math.floor(((event.touches[0].clientY-Input.hoveredCG.boundBox.top)/Input.hoveredCG.boundBox.height)*Input.hoveredCG.ch);

      if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }

      if (Input.hoveredCG.settings.callbacks.cursorMove!=null) { Input.hoveredCG.settings.callbacks.cursorMove(); }

      for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
        let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
        Input.checkButtonHover(button,event);
      }
    }
    touchStart(event) {
      let Input = ChoreoGraph.Input;
      if (Input.hoveredCG==null||Input.hoveredCG?.disabled) { return; }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      let cursor = ChoreoGraph.Input.cursor;
      cursor.hold.left = true;
      cursor.impulse.left = true;
      cursor.hold.any = true;
      cursor.impulse.any = true;

      if (event.target.ChoreoGraph!=undefined) {
        Input.hoveredCG = event.srcElement.ChoreoGraph;
      }
      if (Input.hoveredCG==null) { return; }
      event.button = 0;
      Input.hoveredCG.boundBox = Input.hoveredCG.cnvs.getBoundingClientRect();

      Input.cursor.x = Math.floor(((event.touches[0].clientX-Input.hoveredCG.boundBox.left)/Input.hoveredCG.boundBox.width)*Input.hoveredCG.cw);

      Input.cursor.y = Math.floor(((event.touches[0].clientY-Input.hoveredCG.boundBox.top)/Input.hoveredCG.boundBox.height)*Input.hoveredCG.ch);

      cursor.down.left = [Input.cursor.x,Input.cursor.y];
      cursor.down.any = [Input.cursor.x,Input.cursor.y];

      if (Input.hoveredCG.settings.callbacks.updateButtonChecks!=null) { Input.hoveredCG.buttonChecks = Input.hoveredCG.settings.callbacks.updateButtonChecks(Input.hoveredCG); Input.hoveredCG.buttonChecks[null] = true; }

      for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
        let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
        Input.checkButtonHover(button,event);
      }

      Input.cursorDownChecks(event);

      for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
        let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
        Input.checkButtonHover(button,event);
      }
    }
    touchEnd(event) {
      let Input = ChoreoGraph.Input;
      if (Input.hoveredCG==null||Input.hoveredCG?.disabled) { return; }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      let cursor = ChoreoGraph.Input.cursor;
      if (cursor.hold.left) { cursor.up.left = [Input.cursor.x,Input.cursor.y]; }
      if (cursor.hold.middle) { cursor.up.middle = [Input.cursor.x,Input.cursor.y]; }
      if (cursor.hold.right) { cursor.up.right = [Input.cursor.x,Input.cursor.y]; }
      cursor.up.any = [Input.cursor.x,Input.cursor.y];
      cursor.hold.left = false;
      cursor.hold.any = false;

      if (Input.hoveredCG==null) { return; }
      event.button = 0;
      Input.hoveredCG.boundBox = Input.hoveredCG.cnvs.getBoundingClientRect();

      if (event.target.ChoreoGraph!=undefined&&event.cancelable) {
        event.preventDefault();
      }

      for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
        let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
        Input.checkButtonHover(button,event);
      }

      Input.cursorUpChecks(event);
      
      if (Input.hoveredCG.settings.simulateTouchUnhover) {
        cursor.x = 0;
        cursor.y = 0;
        cursor.screenX = 0;
        cursor.screenY = 0;
        cursor.pageX = 0;
        cursor.pageY = 0;

        for (let i=0;i<Input.hoveredCG.buttonCount;i++) {
          let button = Input.hoveredCG.buttons[Input.hoveredCG.buttonNames[i]];
          Input.checkButtonHover(button,event);
        }
      }
    }
    wheel(event) {
      let Input = ChoreoGraph.Input;
      if (Input.hoveredCG==null||Input.hoveredCG?.disabled) { return; }
      if(Input.hoveredCG!=null&&Input.hoveredCG.preventDefaultMouse[3]) { event.preventDefault(); }
      Input.lastInteraction.any = ChoreoGraph.nowint;
      Input.lastInteraction.cursor = ChoreoGraph.nowint;
      if (Input.hoveredCG!=null&&Input.hoveredCG.settings.callbacks.wheel!=null) {
        Input.hoveredCG.settings.callbacks.wheel(event);
      }
    }
  }

  transformContext(cg,x=0,y=0,r=0,sx=1,sy=1,CGSpace=true,flipX=false,flipY=false,canvasSpaceXAnchor,canvasSpaceYAnchor,ctx=cg.c,cgx=cg.x,cgy=cg.y,cgz=cg.z,canvasSpaceScale=cg.settings.canvasSpaceScale,w=cg.cw,h=cg.ch,manualScaling=false) {
    let z = 1;
    if (CGSpace) {
      z = cgz;
      x += cgx;
      y += cgy;
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
  }
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
  }
  createId(length=5) { // The length will actually get longer if it does not find an unused one
    let result = "";
    while (this.usedUids.includes(result)||(result.length<length)) {
      let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.usedUids.push(result);
    return result;
  }
  releaseId(id) {
    this.usedUids.splice(this.usedUids.indexOf(id), 1);
  }
  randInt(min,max) { // Inclusive
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  twoPointsToAngle(p1=[0,0], p2=[1,1]) {
    let deltaY = (p1[1] - p2[1]);
    let deltaX = (p2[0] - p1[0]);
    let baseangle = Math.atan2(deltaY,deltaX)*180/Math.PI
    // P1 IS FROM WHICH IS THE POINT THAT THE PATH STARTS ON
    // P2 IS TO WHICH IS THE POINT THAT THE PATH ENDS ON
    if (p1[1]<p2[1]) { // Top
      return -baseangle+90;
    } else if (p1[1]>p2[1]) { // Bottom
      return 90-baseangle;
    } else if (p1[1]==p2[1]) { // Intercept
      return baseangle+90;
    }
  }
  degreeToRadianStandard(degree) {
    if (degree>270) {
      return (-(degree-450)*Math.PI)/180;
    } else {
      return (-(degree-90)*Math.PI)/180;
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
  }
  createGradient(colourFrom, colourTo, parts) {
    let gradient = [];
    for (let i=0;i<parts;i++) {
      gradient.push(this.colourLerp(colourFrom, colourTo, i/(parts-1)));
    }
    return gradient;
  }
  plugin(pluginInit) {
    let plugin = new this.Plugin(pluginInit);
    this.plugins[plugin.key] = plugin;
    for (let i=0; i<ChoreoGraph.instances.length; i++) {
      let instance = ChoreoGraph.instances[i];
      for (let j=0;j<plugin.instanceExternalLoops.length;j++) {
        instance.externalLoops.push(plugin.instanceExternalLoops[j]);
      }
      if (plugin.instanceConnect!=null) { plugin.instanceConnect(instance); }
    }
    for (let j=0;j<plugin.externalContentLoops.length;j++) {
      this.externalContentLoops.push(plugin.externalContentLoops[j]);
    }
    for (let j=0;j<plugin.externalMainLoops.length;j++) {
      this.externalMainLoops.push(plugin.externalMainLoops[j]);
    }
  }
  start() {
    this.loop();
    if (ChoreoGraph.settings.pauseWhenUnfocused) {
      setTimeout(function () { // Waits to confirm (hopefully) that everything is ready before drawing everything
        for (let i=0; i<ChoreoGraph.instances.length; i++) {
          let instance = ChoreoGraph.instances[i];
          instance.loop();
        }
      }, 100);
    }
  }
  loop() {
    for (let i=0; i<ChoreoGraph.externalMainLoops.length; i++) { ChoreoGraph.externalMainLoops[i](); }
    ChoreoGraph.now = new Date();
    if (ChoreoGraph.settings.realtime) {
      ChoreoGraph.nowint = ChoreoGraph.now.getTime();
      ChoreoGraph.timeDelta = performance.now() - ChoreoGraph.lastPerformanceTime;
    } else if (ChoreoGraph.settings.nextFrame) {
      ChoreoGraph.nowint += ChoreoGraph.timeDelta;
      ChoreoGraph.settings.nextFrame = false;
    }
    let skipFrame = ((1000/ChoreoGraph.timeDelta>ChoreoGraph.settings.maxFPS||(!document.hasFocus()&&ChoreoGraph.settings.pauseWhenUnfocused)));
    if (skipFrame) {
      ChoreoGraph.run = requestAnimationFrame(ChoreoGraph.loop);
    } else {
      ChoreoGraph.lastPerformanceTime = performance.now();
      for (let i=0; i<ChoreoGraph.instances.length; i++) {
        let instance = ChoreoGraph.instances[i];
        instance.timeDelta = ChoreoGraph.timeDelta*instance.settings.timeScale;
        instance.loop();
      }
      for (let i=0; i<ChoreoGraph.externalContentLoops.length; i++) { ChoreoGraph.externalContentLoops[i](); }
      ChoreoGraph.Input.cursor.impulse = {"left":false,"middle":false,"right":false,"any":false};
      ChoreoGraph.run = requestAnimationFrame(ChoreoGraph.loop);
    }
  }
}
// Willby - 2024