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
        if (this.cg.keys.lights.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
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
        if (this.cg.keys.occluders.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
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

          // LIGHT BOUNDS DEBUG
          if (cg.settings.lighting.debug.lightBounds) {
            for (let lightId of cg.keys.lights) {
              let light = cg.Lighting.lights[lightId];
              let bounds = light.getBounds();
              if (light.occlude) {
                c.strokeStyle = "green";
              } else {
                c.strokeStyle = "paleturquoise";
              }
              c.lineWidth = 2 * scale;
              c.beginPath();
              c.rect(light.transform.x - bounds[0] * 0.5 + bounds[2], light.transform.y - bounds[1] * 0.5 + bounds[3], bounds[0], bounds[1]);
              c.stroke();
            }
          }

          // OCCLUDER DEBUG
          if (cg.settings.lighting.debug.occluders) {
            for (let occluderId of cg.keys.occluders) {
              let occluder = cg.Lighting.occluders[occluderId];
              ChoreoGraph.transformContext(canvas.camera,occluder.transform.x,occluder.transform.y);
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
            }
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
      colourR = null;
      colourG = null;
      colourB = null;
      innerRadius = 20;
      outerRadius = 150;

      lightGradient = null;
      colourGradient = null;
      lastRadialData = null;

      angleStart = 0;
      angleEnd = 0;

      draw(bc, cc) {
        let radialData = this.transform.x+"-"+this.transform.y+""+this.innerRadius+""+this.outerRadius+""+this.colourR+""+this.colourG+""+this.colourB;
        if (this.lightGradient==undefined||this.lastRadialData!=radialData) {
          this.lightGradient = bc.createRadialGradient(this.transform.x, this.transform.y, 1, this.transform.x, this.transform.y, this.outerRadius*0.9);
          this.lightGradient.addColorStop(0, 'rgba(0,0,0,1)');
          this.lightGradient.addColorStop(this.innerRadius/this.outerRadius, 'rgba(0,0,0,1)');
          this.lightGradient.addColorStop(1, 'rgba(0,0,0,0)');
          this.lastRadialData = radialData;
          if (this.colourR!=null) {
            this.colourGradient = bc.createRadialGradient(this.transform.x, this.transform.y, 1, this.transform.x, this.transform.y, this.outerRadius*0.96);
            this.colourGradient.addColorStop(0.9, `rgba(${this.colourR},${this.colourG},${this.colourB},1)`);
            this.colourGradient.addColorStop(1, `rgba(${this.colourR},${this.colourG},${this.colourB},0)`);
          }
        }
        bc.globalCompositeOperation = "destination-out";
        bc.fillStyle = this.lightGradient;
        // bc.fillStyle = "white";
        bc.globalAlpha = this.brightness;
        bc.beginPath();
        bc.arc(this.transform.x,this.transform.y,this.outerRadius,this.angleStart,this.angleEnd);
        bc.lineTo(this.transform.x,this.transform.y);
        bc.fill();
        if (this.colourR!=null) {
          cc.globalCompositeOperation = "lighten";
          cc.fillStyle = this.colourGradient;
          // bc.fillStyle = this.colour;
          cc.globalAlpha = this.brightness;
          cc.beginPath();
          cc.arc(this.transform.x,this.transform.y,this.outerRadius,this.angleStart,this.angleEnd);
          cc.lineTo(this.transform.x,this.transform.y);
          cc.fill();
        }
      };

      getBounds() {
        let rotationRadian = this.transform.r%360 * Math.PI / 180;
        let penumbraRadian = this.penumbra * Math.PI;
        let tau = 2 * Math.PI;
        let hpi = Math.PI * 0.5;
        this.angleStart = penumbraRadian + rotationRadian;
        this.angleEnd = tau-penumbraRadian + rotationRadian;
        let start = this.angleStart;
        let end = this.angleEnd;
        if (start < 0) { start += tau; }
        if (start >= tau) { start -= tau; }
        if (end < 0) { end += tau; }
        if (end >= tau) { end -= tau; }

        let minX = 0;
        let minY = 0;
        let maxX = 0;
        let maxY = 0;
        if (this.penumbra==0) {
          minX = -this.outerRadius;
          minY = -this.outerRadius;
          maxX = this.outerRadius;
          maxY = this.outerRadius;
        } else {
          if (end < start) {
            maxX = this.outerRadius;
          }
          if (start <= hpi && end >= hpi) {
            maxY = this.outerRadius;
          }
          if (start <= Math.PI && end >= Math.PI) {
            minX = -this.outerRadius;
          }
          if (start <= hpi * 3 && end >= hpi * 3) {
            minY = -this.outerRadius;
          }
          let startX = this.outerRadius * Math.cos(start);
          let startY = this.outerRadius * Math.sin(start);
          let endX = this.outerRadius * Math.cos(end);
          let endY = this.outerRadius * Math.sin(end);
          maxX = Math.max(maxX, startX, endX);
          maxY = Math.max(maxY, startY, endY);
          minX = Math.min(minX, startX, endX);
          minY = Math.min(minY, startY, endY);
          maxX += 1;
          maxY += 1;
          minX -= 1;
          minY -= 1;
        }
        let width = maxX - minX;
        let height = maxY - minY;
        let xo = minX + width * 0.5;
        let yo = minY + height * 0.5;
        if (this.feather>0) {
          width += this.feather ** 1.5;
          height += this.feather ** 1.5;
        }

        return [width, height, xo, yo];
      };
    };

    ImageLight = class extends this.Light {
      type = "image";
      image = null;
      width = null;
      height = null;

      draw(bc, cc) {
        cc.save();
        cc.globalCompositeOperation = "source-over";
        cc.translate(this.transform.x, this.transform.y);
        if (this.transform.r!=0) {
          cc.rotate(this.transform.r*Math.PI/180);
        }
        let width = this.width || this.image.width;
        let height = this.height || this.image.height;
        cc.drawImage(this.image.image, -width*0.5, -height*0.5, width, height);
        cc.restore();
      };

      getBounds() {
        if (this.image==null) {
          if (this.hasWarnedAboutMissingImage===undefined) {
            console.warn("ImageLight missing image",this.id);
            this.hasWarnedAboutMissingImage = true;
          }
          return;
        }
        let width = this.width || this.image.width;
        let height = this.height || this.image.height;
        if (this.transform.r!=0) {
          let rad = (-this.transform.r+90)*Math.PI/180;
          let savedHeight = height;
          height = Math.abs(width*Math.cos(rad))+Math.abs(height*Math.sin(rad));
          width = Math.abs(width*Math.sin(rad))+Math.abs(savedHeight*Math.cos(rad));
        }
        if (this.feather>0) {
          width += this.feather ** 1.5;
          height += this.feather ** 1.5;
        }
        return [width, height, 0, 0];
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

    SHADOW_FULL = "full";
    SHADOW_PATH = "path";
    SHADOW_RECTANGLE = "rectangle";
    SHADOW_IMAGE = "image";
  },

  instanceConnect(cg) {
    cg.Lighting = new ChoreoGraph.Lighting.instanceObject(cg);
    cg.Lighting.cg = cg;
    cg.keys.lights = [];
    cg.keys.occluders = [];

    cg.attachSettings("lighting",{
      appendCanvases : false,

      debug : new class {
        clipShape = true;
        raycasts = true;
        raycastCount = true;
        interceptions = true;
        lightBounds = true;
        occluders = true;
        activeSides = true;

        #cg = cg;
        #active = false;
        set active(value) {
          this.#active = value;
          if (value&&!this.#cg.Lighting.hasActivatedDebugLoop) {
            this.#cg.Lighting.hasActivatedDebugLoop = true;
            this.#cg.debugLoops.push(this.#cg.Lighting.lightingDebugLoop);
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

    cg.graphicTypes.lighting = new class LightingGraphic {
      setup(init,cg) {
        this.manualTransform = true;

        this.brightnessBufferCanvas = document.createElement("canvas");
        this.bbc = this.brightnessBufferCanvas.getContext("2d",{alpha:true});

        this.colourBufferCanvas = document.createElement("canvas");
        this.cbc = this.colourBufferCanvas.getContext("2d",{alpha:true});

        if (cg.settings.lighting.appendCanvases) {
          document.body.appendChild(this.brightnessBufferCanvas);
          this.brightnessBufferCanvas.style.backgroundColor = "white";
          document.body.appendChild(this.colourBufferCanvas);
          this.colourBufferCanvas.style.backgroundColor = "white";
        }


        this.lights = [];
        this.occluders = [];
        this.shadowType = ChoreoGraph.Lighting.SHADOW_FULL;
        this.shadowColour = "#000000ff"
        this.shadowPath = [];
        this.image = null;
        this.shadowWidth = 1000;
        this.shadowHeight = 1000;

        this.detections = [];
        this.raycastCount = 0; // For debugging
        this.culledRayCount = 0;
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

          let points = [];
          let sidesToCheck = [];
          let halfWidth = width * 0.5;
          let halfHeight = height * 0.5;
          let lxMin = x-halfWidth+boundXOffset;
          let lxMax = x+halfWidth+boundXOffset;
          let lyMin = y-halfHeight+boundYOffset;
          let lyMax = y+halfHeight+boundYOffset;

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
              let oox = occluder.transform.x;
              let ooy = occluder.transform.y;
              sidesToCheck.push([side[0]+oox,side[1]+ooy,side[2]+oox,side[3]+ooy,side[4],side[5],xMin+oox,xMax+oox,yMin+ooy,yMax+ooy]);
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
          if (points.length===0) { return; }
          points.push([sxMin,syMin]);
          points.push([sxMax,syMin]);
          points.push([sxMax,syMax]);
          points.push([sxMin,syMax]);
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
              if (x1Min>x2Max||x1Max<x2Min||y1Min>y2Max||y1Max<y2Min) { this.culledRayCount++; continue; }

              // RAYCAST INTERCEPTION TEST
              let intercept = ChoreoGraph.Lighting.calculateInterception(side[0],side[1],side[2],side[3],x,y,point[0],point[1]);
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
          detects = detects.sort((a,b) => a[4]-b[4]);
          this.detections.push(detects);
          this.bbc.beginPath();
          this.cbc.beginPath();
          for (let detect of detects) {
            this.bbc.lineTo(detect[2], detect[3]);
            this.cbc.lineTo(detect[2], detect[3]);
          }
          this.bbc.clip();
          this.cbc.clip();
        };

        this.aabbLightGraphic = function(lightBounds, graphicBounds, light, transform) {
          let lx = light.transform.x + lightBounds[2];
          let ly = light.transform.y + lightBounds[3];
          let gxmin = transform.x - graphicBounds[0] * 0.5 + graphicBounds[2];
          let gxmax = transform.x + graphicBounds[0] * 0.5 + graphicBounds[2];
          let gymin = transform.y - graphicBounds[1] * 0.5 + graphicBounds[3];
          let gymax = transform.y + graphicBounds[1] * 0.5 + graphicBounds[3];
          return !(lx < gxmin || lx > gxmax || ly < gymin || ly > gymax);
        };

        this.drawDebug = function(canvas,lights) {
          let c = canvas.c;
          let cg = canvas.cg;
          let scale = canvas.cg.settings.core.debugCGScale / canvas.camera.cz;

          // RAYCAST COUNT DEBUG
          if (cg.settings.lighting.debug.raycastCount&&cg.Develop!=undefined) {
            let text = this.raycastCount + " raycasts" + (this.culledRayCount>0 ? " (" + this.culledRayCount + " culled)" : "");
            cg.Develop.drawTopLeftText(cg,canvas,text);
          }
          c.globalAlpha = 1;

          // ACTIVE SIDES DEBUG
          if (cg.settings.lighting.debug.activeSides) {
            c.lineWidth = 6 * scale;
            let occluders = this.occluders;
            if (this.occluders.length === 0) {
              let occludersIds = this.cg.keys.occluders;
              for (let i=0;i<occludersIds.length;i++) {
                occluders[i] = this.cg.Lighting.occluders[this.cg.keys.occluders[i]];
              }
            }
            for (let light of lights) {
              if (!light.occlude) { continue; }
              let x = light.transform.x;
              let y = light.transform.y;
              let bounds = light.getBounds();
              let halfWidth = bounds[0] * 0.5;
              let halfHeight = bounds[1] * 0.5;
              let lxMin = x-halfWidth+bounds[2];
              let lxMax = x+halfWidth+bounds[2];
              let lyMin = y-halfHeight+bounds[3];
              let lyMax = y+halfHeight+bounds[3];
              c.beginPath();
              for (let occluder of occluders) {
                ChoreoGraph.transformContext(canvas.camera,occluder.transform.x,occluder.transform.y);
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
          }

          ChoreoGraph.transformContext(canvas.camera);

          for (let detects of this.detections) {
            // CLIP SHAPE DEBUG
            if (cg.settings.lighting.debug.clipShape) {
              c.strokeStyle = "yellow";
              c.lineWidth = 2.5 * scale;
              c.beginPath();
              for (let detect of detects) {
                c.lineTo(detect[2], detect[3]);
              }
              c.closePath();
              c.stroke();
            }

            // RAYCASTS DEBUG
            if (cg.settings.lighting.debug.raycasts) {
              c.lineWidth = 1 * scale;
              c.strokeStyle = "red";
              c.beginPath();
              for (let detect of detects) {
                c.moveTo(detect[5], detect[6]);
                c.lineTo(detect[2], detect[3]);
              }
              c.stroke();
            }

            // INTERCEPTIONS DEBUG
            if (cg.settings.lighting.debug.interceptions) {
              let i=0;
              for (let detect of detects) {
                c.lineWidth = 3 * scale;
                let size = 10 * scale;
                c.beginPath();
                c.moveTo(detect[2]-size, detect[3]);
                c.lineTo(detect[2]+size, detect[3]);
                c.moveTo(detect[2], detect[3]-size);
                c.lineTo(detect[2], detect[3]+size);
                c.strokeStyle = ["red","orange","yellow","green","blue","indigo","violet"][i%7];
                c.stroke();
                i++;
              }
            }
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
        let graphicBounds = this.getBounds();

        // SET BUFFER SIZE
        this.brightnessBufferCanvas.width = canvas.width;
        this.brightnessBufferCanvas.height = canvas.height;
        this.colourBufferCanvas.width = canvas.width;
        this.colourBufferCanvas.height = canvas.height;

        // DRAW SHADOW
        this.bbc.fillStyle = this.shadowColour;
        if (this.shadowType === ChoreoGraph.Lighting.SHADOW_FULL) {
          this.bbc.resetTransform();
          this.bbc.fillRect(0,0,this.brightnessBufferCanvas.width,this.brightnessBufferCanvas.height);
        } else if (this.shadowType === ChoreoGraph.Lighting.SHADOW_PATH) {
          ChoreoGraph.transformContext(canvas.camera,gx,gy,0,gsx,gsy,true,false,false,0,0,this.bbc);
          this.bbc.clearRect(0,0,this.brightnessBufferCanvas.width,this.brightnessBufferCanvas.height);
          this.bbc.beginPath();
          for (let point of this.path) {
            this.bbc.lineTo(point[0], point[1]);
          }
          this.bbc.fill();
        } else if (this.shadowType === ChoreoGraph.Lighting.SHADOW_RECTANGLE) {
          ChoreoGraph.transformContext(canvas.camera,gx,gy,transform.r,gsx,gsy,true,false,false,0,0,this.bbc);
          this.bbc.clearRect(0,0,this.brightnessBufferCanvas.width,this.brightnessBufferCanvas.height);
          this.bbc.fillRect(-this.shadowWidth*0.5,-this.shadowHeight*0.5,this.shadowWidth,this.shadowHeight);
        } else if (this.shadowType === ChoreoGraph.Lighting.SHADOW_IMAGE) {
          ChoreoGraph.transformContext(canvas.camera,gx,gy,transform.r,gsx,gsy,true,false,false,0,0,this.bbc);
          this.bbc.clearRect(0,0,this.brightnessBufferCanvas.width,this.brightnessBufferCanvas.height);
          this.bbc.drawImage(this.image.image,-this.shadowWidth*0.5,-this.shadowHeight*0.5,this.shadowWidth,this.shadowHeight);
        }

        ChoreoGraph.transformContext(canvas.camera,gx,gy,0,gsx,gsy,true,false,false,0,0,this.bbc);
        ChoreoGraph.transformContext(canvas.camera,gx,gy,0,gsx,gsy,true,false,false,0,0,this.cbc);

        // DRAW OCCLUDED LIGHTS
        this.raycastCount = 0;
        this.culledRayCount = 0;
        this.detections.length = 0;
        let lights = this.lights;
        if (this.lights.length === 0) {
          let lightsIds = this.cg.keys.lights;
          for (let i=0;i<lightsIds.length;i++) {
            lights[i] = this.cg.Lighting.lights[this.cg.keys.lights[i]];
          }
        }
        for (let light of lights) {
          let lightBounds = light.getBounds();
          if (this.aabbLightGraphic(lightBounds, graphicBounds, light, transform)==false) { continue; }
          this.bbc.save();
          this.cbc.save();
          if (light.occlude) { this.occlude(light.transform.x,light.transform.y,lightBounds[0],lightBounds[1],lightBounds[2],lightBounds[3]); }
          if (light.feather==0) {
            this.bbc.filter = "none";
          } else {
            this.bbc.filter = "blur(" + light.feather*canvas.camera.z + "px)";
          }
          light.draw(this.bbc,this.cbc);
          this.bbc.restore();
          this.cbc.restore();
        }

        let c = canvas.c;
        c.globalAlpha = 1;
        c.resetTransform();

        c.globalCompositeOperation = "source-over";
        c.drawImage(this.colourBufferCanvas,0,0);
        c.globalCompositeOperation = "multiply";
        c.drawImage(this.brightnessBufferCanvas,0,0);
        c.globalCompositeOperation = "source-over";

        if (cg.settings.lighting.debug.active) { this.drawDebug(canvas,lights); }
      };

      getBounds() {
        if (this.shadowType === ChoreoGraph.Lighting.SHADOW_FULL) {
          return [Infinity,Infinity, 0, 0];
        } else if (this.shadowType === ChoreoGraph.Lighting.SHADOW_RECTANGLE) {
          return [this.shadowWidth, this.shadowHeight, 0, 0];
        } else if (this.shadowType === ChoreoGraph.Lighting.SHADOW_PATH) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (let point of this.path) {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
          }
          let xo = (minX + maxX) * 0.5;
          let yo = (minY + maxY) * 0.5;
          return [maxX - minX, maxY - minY, xo, yo];
        } else if (this.shadowType === ChoreoGraph.Lighting.SHADOW_IMAGE) {
          if (this.image==null) {
            console.warn("Lighting graphic of type SHADOW_IMAGE missing image");
            return [0,0];
          }
          return [this.shadowWidth, this.shadowHeight, 0, 0];
        }
      };
    };
  }
});