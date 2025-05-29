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

      hasActivatedDebugLoop = false;
      lightingDebugLoop(cg) {
        if (!cg.settings.lighting.debug.active) { return; }
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.camera==undefined) { continue; }
          let c = canvas.c;
          let scale = cg.settings.core.debugCGScale / canvas.camera.cz;
          if (canvas.hideDebugOverlays) { continue; }
          ChoreoGraph.transformContext(canvas.camera);

          for (let lightId of cg.keys.lights) {
            let light = cg.Lighting.lights[lightId];
            let bounds = light.getBounds();
            c.globalAlpha = 1;
            c.strokeStyle = "green";
            c.lineWidth = 2 * scale;
            c.beginPath();
            c.rect(light.transform.x - bounds[0] * 0.5, light.transform.y - bounds[1] * 0.5, bounds[0], bounds[1]);
            c.stroke();
          }

          for (let occluderId of cg.keys.occluders) {
            let occluder = cg.Lighting.occluders[occluderId];
            c.strokeStyle = "grey";
            c.lineWidth = 2 * scale;
            c.beginPath();
            c.moveTo(occluder.path[0][0], occluder.path[0][1]);
            for (let i=1;i<occluder.path.length;i++) {
              c.lineTo(occluder.path[i][0], occluder.path[i][1]);
            }
            c.closePath();
            c.stroke();
            c.beginPath();
            for (let i=0;i<occluder.path.length;i++) {
              c.moveTo(occluder.path[i][0], occluder.path[i][1]);
              c.arc(occluder.path[i][0], occluder.path[i][1], 5, 0, 2 * Math.PI);
            }
            c.fillStyle = "white";
            c.fill();

            // for (let side of occluder.sidesBuffer) {
            //   c.globalAlpha = 1;
            //   c.strokeStyle = "white";
            //   c.beginPath();
            //   c.moveTo(occluder.transform.x + side[0], occluder.transform.y + side[1]);
            //   c.lineTo(occluder.transform.x + side[2], occluder.transform.y + side[3]);
            //   c.stroke();
            //   c.fillStyle = ["red","green","blue","magenta","yellow","cyan","purple"][Math.floor(Math.random()*8)];
            //   c.globalAlpha = 0.5;
            //   c.fillRect(occluder.transform.x+side[6], occluder.transform.y+side[8], side[7]-side[6], side[9]-side[8]);
            // }
          }
        }
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
      lastRadialData = null;

      angleStart = 0;
      angleEnd = 0;

      draw(c) {
        c.globalCompositeOperation = "destination-out";
        let radialData = this.transform.x+"-"+this.transform.y+""+this.innerRadius+""+this.outerRadius;
        if (this.lightGradient==undefined||this.lastRadialData!=radialData) {
          this.lightGradient = c.createRadialGradient(this.transform.x, this.transform.y, 1, this.transform.x, this.transform.y, this.outerRadius);
          this.lightGradient.addColorStop(0, 'rgba(0,0,0,1)');
          this.lightGradient.addColorStop(this.innerRadius/this.outerRadius, 'rgba(0,0,0,1)');
          this.lightGradient.addColorStop(1, 'rgba(0,0,0,0)');
          this.lastRadialData = radialData;
        }
        c.fillStyle = this.lightGradient;
        c.globalAlpha = this.brightness;
        c.beginPath();
        c.arc(this.transform.x,this.transform.y,this.outerRadius,this.angleStart,this.angleEnd);
        c.lineTo(this.transform.x,this.transform.y);
        c.fill();
        c.globalCompositeOperation = "soft-light";
        if (this.colour!=null) {
          c.fillStyle = this.colour;
          c.globalAlpha = this.brightness;
          c.beginPath();
          c.arc(this.transform.x,this.transform.y,this.outerRadius,this.angleStart,this.angleEnd);
          c.lineTo(this.transform.x,this.transform.y);
          c.fill();
        }
      };

      getBounds() {
        let rotationRadian = this.transform.r%360 * Math.PI / 180;
        let penumbraRadian = this.penumbra * Math.PI;
        let tau = 2 * Math.PI;
        let hpi = Math.PI * 0.5;
        this.angleStart = penumbraRadian + rotationRadian;
        this.angleEnd = tau-penumbraRadian + rotationRadian;
        if (this.angleStart < 0) { this.angleStart += tau; }
        if (this.angleStart >= tau) { this.angleStart -= tau; }
        if (this.angleEnd < 0) { this.angleEnd += tau; }
        if (this.angleEnd >= tau) { this.angleEnd -= tau; }

        let minX = 0;
        let minY = 0;
        let maxX = 0;
        let maxY = 0;
        if (this.angleStart < 0 && this.angleEnd > 0) {
          maxX = this.outerRadius;
          console.log("1")
        }
        if (this.angleStart < hpi && this.angleEnd > hpi) {
          maxY = this.outerRadius;
          console.log("2")
        }
        if (this.angleStart < Math.PI && this.angleEnd > Math.PI) {
          minX = -this.outerRadius;
          console.log("3")
        }
        if (this.angleStart < hpi * 3 && this.angleEnd > hpi * 3) {
          minY = -this.outerRadius;
          console.log("4")
        }
        let width = maxX - minX;
        let height = maxY - minY;

        // return [width, height, 0, 0];
        return [this.outerRadius * 2, this.outerRadius * 2, 0, 0];
      };
    };

    ImageLight = class extends this.Light {
      type = "image";
      image = null;
      width = null;
      height = null;

      draw(c) {
        c.save();
        c.globalCompositeOperation = "destination-out";
        c.translate(this.transform.x, this.transform.y);
        if (this.transform.r!=0) {
          c.rotate(this.transform.r*Math.PI/180);
        }
        c.drawImage(this.image.image, 0, 0, this.width, this.height);
        c.restore();
      };

      getBounds() {
        return [this.width || this.image.width, this.height || this.image.height];
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
        if (this.path.length>=2) {
          this.calculateSides();
        }
      };

      calculateSides() {
        this.sidesBuffer = [];
        if (this.path.length>2) {
          for (let i=0;i<this.path.length-1;i++) {
            let xMin = Math.min(this.path[i][0],this.path[i+1][0]);
            let xMax = Math.max(this.path[i][0],this.path[i+1][0]);
            let yMin = Math.min(this.path[i][1],this.path[i+1][1]);
            let yMax = Math.max(this.path[i][1],this.path[i+1][1]);
            // p1x p1y p2x p2y p1i p2i xMin xMax yMin yMax
            this.sidesBuffer.push([this.path[i][0],this.path[i][1],this.path[i+1][0],this.path[i+1][1],i,i+1,xMin,xMax,yMin,yMax]);
          }
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
        let t1 = topA/bottomA; // Intersection ratio on line x1,y1 to x2,y2
        let t2 = topB/bottomB; // Intersection ratio on line x3,y3 to x4,y4
        return [(t1>=0&&t1<=1&&t2>=0),t1,t2];
      }
    };
  },

  instanceConnect(cg) {
    cg.Lighting = new ChoreoGraph.Lighting.instanceObject(cg);
    cg.Lighting.cg = cg;
    cg.keys.lights = [];
    cg.keys.occluders = [];

    cg.attachSettings("lighting",{
      debug : new class {
        #cg = cg;
        #active = false;
        set active(value) {
          this.#active = value;
          if (value&&!this.#cg.Lighting.hasActivatedDebugLoop) {
            this.#cg.Lighting.hasActivatedDebugLoop = true;
            this.#cg.overlayLoops.push(this.#cg.Lighting.lightingDebugLoop);
          }
        }
        get active() { return this.#active; }
      }
    });

    if (cg.Develop!==undefined) {
      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Lighting Debug",
        inactiveText : "Lighting Debug",
        activated : cg.settings.lighting.debug,
        onActive : (cg) => { cg.settings.lighting.debug.active = true; },
        onInactive : (cg) => { cg.settings.lighting.debug.active = false; },
      });
    };

    cg.graphicTypes.lighting = new class lighting {
      setup(init,cg) {
        this.manualTransform = true;

        this.bufferCanvas = document.createElement("canvas");
        document.body.appendChild(this.bufferCanvas);
        this.bufferCanvas.style.backgroundColor = "white";
        this.bc = this.bufferCanvas.getContext("2d",{alpha:true});

        this.lights = [];
        this.occluders = [];

        this.detects = [];
        this.raycastCount = 0; // For debugging
        this.sideRayPrecision = 0.0001;

        this.occlude = function(x,y,width,height,boundXOffset,boundYOffset) {
          let maxSize = Math.max(width,height)*10;
          // GET OCCLUDERS
          let occluders = this.occluders;
          if (this.occluders.length === 0) {
            let occludersIds = this.cg.keys.occluders;
            for (let i=0;i<occludersIds.length;i++) {
              occluders[i] = this.cg.Lighting.occluders[this.cg.keys.occluders[i]];
            }
          }

          this.raycastCount = 0;
          let points = [];
          let sidesToCheck = [];
          let halfWidth = width * 0.5;
          let halfHeight = height * 0.5;
          let lxMin = x-halfWidth+boundXOffset;
          let lxMax = x+halfWidth+boundXOffset;
          let lyMin = y-halfHeight+boundYOffset;
          let lyMax = y+halfHeight+boundYOffset;
          points.push([lxMin,lyMin]);
          points.push([lxMax,lyMin]);
          points.push([lxMax,lyMax]);
          points.push([lxMin,lyMax]);

          // GET POINTS AND SIDES FROM ALL OCCLUDERS
          let sxMin = lxMin;
          let sxMax = lxMax;
          let syMin = lyMin;
          let syMax = lyMax;
          for (let occluder of occluders) {
            let addedIndices = [];
            for (let i=0;i<occluder.sidesBuffer.length;i++) {
              let side = occluder.sidesBuffer[i];
              let xMin = occluder.transform.x + side[6];
              let xMax = occluder.transform.x + side[7];
              let yMin = occluder.transform.y + side[8];
              let yMax = occluder.transform.y + side[9];
              if (xMin>lxMax||xMax<lxMin||yMin>lyMax||yMax<lyMin) { continue; }
              sxMin = Math.min(xMin,sxMin);
              sxMax = Math.max(xMax,sxMax);
              syMin = Math.min(yMin,syMin);
              syMax = Math.max(yMax,syMax);
              sidesToCheck.push(side);
              let sideRayPrecision = this.sideRayPrecision;
              function addPoint(point) {
                points.push(point);
                let baseAngle = Math.atan2(point[1]-y,point[0]-x);
                // A little bit to the left and right of each point
                points.push([point[0]+Math.cos(baseAngle + sideRayPrecision)*maxSize,point[1]+Math.sin(baseAngle + sideRayPrecision)*maxSize]);
                points.push([point[0]+Math.cos(baseAngle - sideRayPrecision)*maxSize,point[1]+Math.sin(baseAngle - sideRayPrecision)*maxSize]);
              }
              if (!addedIndices.includes(side[4])) {
                addPoint([side[0] + occluder.transform.x,side[1] + occluder.transform.y]);
                addedIndices.push(side[4]);
              }
              if (!addedIndices.includes(side[5])) {
                addPoint([side[2] + occluder.transform.x,side[3] + occluder.transform.y]);
                addedIndices.push(side[5]);
              }
            }
          };
          sidesToCheck.push([sxMin,syMin,sxMax,syMin]);
          sidesToCheck.push([sxMax,syMin,sxMax,syMax]);
          sidesToCheck.push([sxMax,syMax,sxMin,syMax]);
          sidesToCheck.push([sxMin,syMax,sxMin,syMin]);

          // FIND ALL INTERCEPTIONS
          let detects = [];
          for (let point of points) {
            let closest = 2; // 2 because the range is 0-1
            for (let side of sidesToCheck) {
              // AABB INTERCEPTION TEST
              let x1Min = Math.min(side[0],side[2]);
              let x1Max = Math.max(side[0],side[2]);
              let y1Min = Math.min(side[1],side[3]);
              let y1Max = Math.max(side[1],side[3]);
              let x2Min = Math.min(x,point[0]);
              let x2Max = Math.max(x,point[0]);
              let y2Min = Math.min(y,point[1]);
              let y2Max = Math.max(y,point[1]);
              if (x1Min>x2Max||x1Max<x2Min||y1Min>y2Max||y1Max<y2Min) { continue; }

              // RAYCAST INTERCEPTION TEST
              let intercept = ChoreoGraph.Lighting.calculateInterception(side[0],side[1],side[2],side[3],x,y,point[0],point[1]);
              // console.log(side[0],side[1],side[2],side[3],x,y,point[0],point[1], intercept[0])
              this.raycastCount++;
              if (intercept[0]) { if (intercept[2]<closest) { closest = intercept[2]; } }
            }
            if (closest<=1) {
              let interceptX = x + (point[0] - x) * closest;
              let interceptY = y + (point[1] - y) * closest;
              let angle = Math.atan2(interceptY-y,interceptX-x);
              detects.push([point[0],point[1],interceptX,interceptY,angle,x,y]);
            }
          }

          // FIND PATH AND CLIP
          this.detects = detects.sort((a,b) => a[4]-b[4]);
          this.bc.beginPath();
          for (let detect of this.detects) {
            this.bc.lineTo(detect[2], detect[3]);
          }
          this.bc.clip();
        };

        this.drawDebug = function(canvas,lights) {
          let c = canvas.c;
          let scale = canvas.cg.settings.core.debugCGScale / canvas.camera.cz;
          c.resetTransform();
          c.fillStyle = "white";
          c.textBaseline = "top";
          c.fillText(this.raycastCount,10,20);
          ChoreoGraph.transformContext(canvas.camera);
          c.globalAlpha = 1;
          c.strokeStyle = "yellow";
          c.lineWidth = 4 * scale;
          c.beginPath();
          for (let detect of this.detects) {
            c.lineTo(detect[2], detect[3]);
          }
          c.closePath();
          c.stroke();
          // let i=0;
          // for (let detect of this.detects) {
          //   c.beginPath();
          //   c.moveTo(detect[2], detect[3]);
          //   c.arc(detect[2], detect[3], 10 * scale, 0, 2 * Math.PI);
          //   c.fillStyle = ["red","orange","yellow","green","blue","indigo","violet"][i%7];
          //   c.fill();
          //   i++;
          // }
          c.lineWidth = 1 * scale;
          c.strokeStyle = "red";
          c.beginPath();
          for (let detect of this.detects) {
            c.moveTo(detect[5], detect[6]);
            c.lineTo(detect[2], detect[3]);
          }
          c.stroke();

          c.lineWidth = 10 * scale;
          let occluders = this.occluders;
          if (this.occluders.length === 0) {
            let occludersIds = this.cg.keys.occluders;
            for (let i=0;i<occludersIds.length;i++) {
              occluders[i] = this.cg.Lighting.occluders[this.cg.keys.occluders[i]];
            }
          }
          for (let light of lights) {
            let x = light.transform.x;
            let y = light.transform.y;
            let bounds = light.getBounds();
            let halfWidth = bounds[0] * 0.5;
            let halfHeight = bounds[1] * 0.5;
            let lxMin = x-halfWidth;
            let lxMax = x+halfWidth;
            let lyMin = y-halfHeight;
            let lyMax = y+halfHeight;
            c.beginPath();
            for (let occluder of occluders) {
              for (let i=0;i<occluder.sidesBuffer.length;i++) {
                let side = occluder.sidesBuffer[i];
                let xMin = occluder.transform.x + side[6];
                let xMax = occluder.transform.x + side[7];
                let yMin = occluder.transform.y + side[8];
                let yMax = occluder.transform.y + side[9];
                if (xMin>lxMax||xMax<lxMin||yMin>lyMax||yMax<lyMin) {
                  continue;
                }
                c.moveTo(side[0],side[1]);
                c.lineTo(side[2],side[3]);
              }
            }
            c.strokeStyle = "lightgreen";
            c.stroke();
          }
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
          if (light.occlude) { this.occlude(light.transform.x,light.transform.y,bounds[0],bounds[1],bounds[2],bounds[3]); }
          light.draw(this.bc);
        }

        let c = canvas.c;
        c.globalAlpha = 1;
        c.resetTransform();

        c.globalCompositeOperation = "multiply";
        c.drawImage(this.bufferCanvas,0,0);
        c.globalCompositeOperation = "source-over";

        if (cg.settings.lighting.debug.active) { this.drawDebug(canvas,lights); }
      };
    }
  }
});