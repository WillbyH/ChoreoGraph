ChoreoGraph.plugin({
  name : "Lighting",
  key : "Lighting",
  version : "1.1",

  globalPackage : new class cgLighting {
    instanceObject = class cgInstanceLighiting {
      lights = [];
      occluders = [];

      lightTypes = {
        spot : "SpotLight",
        image : "ImageLight"
      };

      createLight(lightInit={},id=ChoreoGraph.id.get()) {
        let type = lightInit.type;
        if (type === undefined) { console.warn("createLight requires a light type"); return; }
        delete lightInit.type;
        let newLight = new ChoreoGraph.Lighting[this.lightTypes[type]](lightInit,this.cg);
        newLight.id = id;
        newLight.cg = this.cg;
        ChoreoGraph.applyAttributes(newLight,lightInit);
        this.lights[id] = newLight;
        this.cg.keys.lights.push(id);
        return newLight;
      };

      createOccluder(occluderInit={},id=ChoreoGraph.id.get()) {
        let newOccluder = new ChoreoGraph.Lighting.Occluder(occluderInit,this.cg);
        newOccluder.id = id;
        newOccluder.cg = this.cg;
        this.occluders[id] = newOccluder;
        this.cg.keys.occluders.push(id);
        return newOccluder;
      };
    };

    Light = class cgLight {
      transform = null;
      brightness = 1; // 0-1
      occlude = true; // If true the light will calculate occlusion with occluders
      feather = 0;

      constructor(lightInit,cg) {
        if (lightInit.transform==undefined) {
          if (lightInit.transformId==undefined) {
            this.transform = cg.createTransform();
          } else {
            this.transform = cg.createTransform({},lightInit.transformId);
            delete lightInit.transformId;
          }
        }
      }
    };

    SpotLight = class extends this.Light {
      type = "spot";
      penumbra = 0; // 0-1
      colour = null;
      innerRadius = 20;
      outerRadius = 150;

      lightGradient = null;
      colourGradient = null;
      lastRadialData = null;

      draw(c) {
        let radialData = this.x+"-"+this.y+""+this.innerRadius+""+this.outerRadius;
        if (this.gradient==undefined||this.lastRadialData!=radialData) {
          this.lightGradient = c.createRadialGradient(this.transform.x, this.transform.y, 1, this.transform.x, this.transform.y, this.outerRadius);
          this.lightGradient.addColorStop(0, 'rgba(0,0,0,1)');
          this.lightGradient.addColorStop(this.innerRadius/this.outerRadius, 'rgba(0,0,0,1)');
          this.lightGradient.addColorStop(1, 'rgba(0,0,0,0)');
          if (this.colour!=null) {
            this.colourGradient = c.createRadialGradient(this.transform.x, this.transform.y, 1, this.transform.x, this.transform.y, this.outerRadius);
            this.colourGradient.addColorStop(0, this.colour);
            this.colourGradient.addColorStop(1-(this.innerRadius/this.outerRadius), this.colour);
            this.colourGradient.addColorStop(1, 'rgba(0,0,0,0)');
          }
          this.lastRadialData = radialData;
        }
        c.fillStyle = this.lightGradient;
        c.globalAlpha = this.brightness;
        let penumbraRadian = this.penumbra * Math.PI;
        let start = penumbraRadian;
        let end = 2*Math.PI-penumbraRadian;
        c.beginPath();
        c.arc(this.transform.x,this.transform.y,this.outerRadius,start,end);
        c.lineTo(this.transform.x,this.transform.y);
        c.fill();
        if (this.colour!=null) {
          c.fillStyle = this.colourGradient;
          c.globalAlpha = this.brightness;
          c.beginPath();
          c.arc(this.transform.x,this.transform.y,this.outerRadius,start,end);
          c.lineTo(this.transform.x,this.transform.y);
          c.fill();
        }
      };

      getBounds() {
        return [this.outerRadius*2, this.outerRadius*2];
      };
    };

    ImageLight = class extends this.Light {
      type = "image";
      image = null;
      width = null;
      height = null;

      draw(c) {
        c.save();
        c.translate(this.transform.x, this.transform.y);
        if (this.transform.r!=0) {
          c.rotate(this.transform.r*Math.PI/180);
        }
        c.drawImage(this.image.image, 0, 0, this.width, this.height);
        c.restore();
      };

      getBounds() {
        return [this.width || this.image.width,this.height || this.image.height];
      };
    };

    Occluder = class cgOccluder {
      transform = null;
      path = [];
      sidesBuffer = [];

      constructor(occluderInit,cg) {
        if (occluderInit.transform==undefined) {
          if (occluderInit.transformId==undefined) {
            this.transform = cg.createTransform();
          } else {
            this.transform = cg.createTransform({},occluderInit.transformId);
            delete occluderInit.transformId;
          }
        }
        ChoreoGraph.applyAttributes(this,occluderInit);
        if (this.path.length>2) {
          this.calculateSides();
        }
      };

      calculateSides() {
        this.sidesBuffer = [];
        for (let i=0;i<this.path.length-1;i++) {
          let xMin = Math.min(this.path[i][0],this.path[i+1][0]);
          let xMax = Math.max(this.path[i][0],this.path[i+1][0]);
          let yMin = Math.min(this.path[i][1],this.path[i+1][1]);
          let yMax = Math.max(this.path[i][1],this.path[i+1][1]);
          // p1x p1y p2x p2y p1i p2i xMin xMax yMin yMax
          this.sidesBuffer.push([this.path[i][0],this.path[i][1],this.path[i+1][0],this.path[i+1][1],i,i+1,xMin,xMax,yMin,yMax]);
        }
        let xMin = Math.min(this.path[0][0],this.path[this.path.length-1][0]);
        let xMax = Math.max(this.path[0][0],this.path[this.path.length-1][0]);
        let yMin = Math.min(this.path[0][1],this.path[this.path.length-1][1]);
        let yMax = Math.max(this.path[0][1],this.path[this.path.length-1][1]);
        this.sidesBuffer.push([this.path[0][0],this.path[0][1],this.path[this.path.length-1][0],this.path[this.path.length-1][1],0,this.path.length-1,xMin,xMax,yMin,yMax]);
      };
    };
    
    calculateInterception(x1,y1,x2,y2,x3,y3,x4,y4) {
      let bottomA = (x4 - x3) * (y2 - y1) - (y4 - y3) * (x2 - x1);
      let bottomB = (x4 - x3) * (y2 - y1) - (y4 - y3) * (x2 - x1);
      if (bottomA==0||bottomB==0) {
        return false;
      } else {
        let topA = (x4 - x3) * (y3 - y1) - (y4 - y3) * (x3 - x1);
        let topB = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
        let t1 = topA/bottomA;
        let t2 = topB/bottomB;
        return [(t1>=0&&t1<=1&&t2>=0),t1,t2]
      }
    };
  },

  instanceConnect(cg) {
    cg.Lighting = new ChoreoGraph.Lighting.instanceObject(cg);
    cg.Lighting.cg = cg;
    cg.keys.lights = [];
    cg.keys.occluders = [];

    cg.attachSettings("lighting",{
      
    });

    cg.graphicTypes.lighting = new class lighting {
      setup(init,cg) {
        this.manualTransform = true;

        this.bufferCanvas = document.createElement("canvas");
        document.body.appendChild(this.bufferCanvas);
        this.bc = this.bufferCanvas.getContext("2d",{alpha:true});

        this.lights = [];
        this.occluders = [];

        this.occlude = function(x,y,width,height) {
          let occluders = this.occluders;
          if (this.occluders.length === 0) {
            let occludersIds = this.cg.keys.occluders;
            for (let i=0;i<occludersIds.length;i++) {
              occluders[i] = this.cg.Lighting.occluders[this.cg.keys.occluders[i]];
            }
          }

          let vectors = [];

          this.bc.beginPath();
          for (let occluder of occluders) {
            for (let point of occluder.path) {
              let occluderX = occluder.transform.x + point[0];
              let occluderY = occluder.transform.y + point[1];
              this.bc.lineTo(occluderX, occluderY);
            }
          }

          this.bc.clip();
        };
      };
      draw(canvas,transform) {
        let go = transform.o;
        if (go==0) { return; }
        let gx = transform.x+transform.ax;
        let gy = transform.y+transform.ay;
        let gsx = transform.sx;
        let gsy = transform.sy;

        // SET BUFFER SIZE
        this.bufferCanvas.width = canvas.width;
        this.bufferCanvas.height = canvas.height;

        // CLEAR BUFFER
        this.bc.resetTransform();
        this.bc.clearRect(0,0,this.bufferCanvas.width,this.bufferCanvas.height);
        this.bc.fillStyle = "#000000";
        this.bc.fillRect(0,0,this.bufferCanvas.width,this.bufferCanvas.height);

        // PUT BUFFER IN CG SPACE
        ChoreoGraph.transformContext(canvas.camera,gx,gy,0,gsx,gsy,true,false,false,0,0,this.bc);

        // DRAW LIGHTS
        this.bc.globalCompositeOperation = "destination-out";

        // DRAW OCCLUDED LIGHTS
        let lights = this.lights;
        if (this.lights.length === 0) {
          let lightsIds = this.cg.keys.lights;
          for (let i=0;i<lightsIds.length;i++) {
            lights[i] = this.cg.Lighting.lights[this.cg.keys.lights[i]];
          }
        }
        for (let light of lights) {
          let bounds = light.getBounds();
          if (light.occlude) { this.occlude(light.transform.x,light.transform.y,bounds[0],bounds[1]); }
          light.draw(this.bc);
        }

        let c = canvas.c;
        c.globalCompositeOperation = "source-over";
        c.globalAlpha = 1;
        c.resetTransform();

        c.drawImage(this.bufferCanvas,0,0);
      };
    }
  }
});