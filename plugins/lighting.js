ChoreoGraph.graphicTypes.lighting = new class LightingGraphic {
  setup(graphic,graphicInit,cg) {
    graphic.width = 100;
    graphic.height = 100;

    graphic.shadowType = "full"; // full, ellipse, rectangle, image
    graphic.shadowX = 0;
    graphic.shadowY = 0;
    graphic.shadowHeight = 100;
    graphic.shadowWidth = 100;
    graphic.shadowRotation = 0;
    graphic.shadowImage = null;
    graphic.shadowCol = "#000000ee";

    graphic.compositeOperation = "soft-light"; // I tried all of them and this one felt the least bad
    graphic.lights = [];
    graphic.occluders = [];

    graphic.detects = [];

    graphic.cnvs = document.createElement("canvas");
    graphic.cnvs.width = cg.cw;
    graphic.cnvs.height = cg.ch;
    graphic.c = graphic.cnvs.getContext("2d",{alpha:true}); // Create the lighting buffer canvas context

    graphic.lastWidth = cg.cw;
    graphic.lastHeight = cg.ch;

    // document.body.appendChild(graphic.cnvs);
  }

  draw(graphic,cg) {
    let debug = { // defaults
      on : false, // false
      culling : true, // true
      raycasts : false, // false
      raycastInterceptions : false, // false
      raycastOrder : false, // false
      raycastCountDisplay : false // false
    };

    // The lighting buffer should be the same size as the instance canvas
    if (graphic.lastWidth!=cg.cw||graphic.lastHeight!=cg.ch) {
      graphic.cnvs.width = cg.cw;
      graphic.cnvs.height = cg.ch;
      graphic.lastWidth = cg.cw;
      graphic.lastHeight = cg.ch;
    }
    let osc = graphic.c; // Offscreen Canvas

    osc.resetTransform();
    osc.clearRect(0,0,cg.cw,cg.ch);
    osc.fillStyle = graphic.shadowCol;
    if (graphic.shadowType=="full") {
      osc.fillRect(0,0,cg.cw,cg.ch);
    } else if (graphic.shadowType=="ellipse") {
      ChoreoGraph.transformContext(cg,graphic.shadowX,graphic.shadowY,graphic.shadowRotation,1,1,true,false,false,0,0,osc);
      osc.beginPath();
      osc.ellipse(graphic.shadowX,graphic.shadowY,graphic.shadowWidth/2,graphic.shadowHeight/2,0,0,2*Math.PI);
      osc.fill();
    } else if (graphic.shadowType=="rectangle") {
      ChoreoGraph.transformContext(cg,graphic.shadowX,graphic.shadowY,graphic.shadowRotation,1,1,true,false,false,0,0,osc);
      osc.fillRect(graphic.shadowX-graphic.shadowWidth/2,graphic.shadowY-graphic.shadowHeight/2,graphic.shadowWidth,graphic.shadowHeight);
    } else if (graphic.shadowType=="image") {
      ChoreoGraph.transformContext(cg,graphic.shadowX,graphic.shadowY,graphic.shadowRotation,1,1,true,false,false,0,0,osc);
      if (graphic.shadowImage==null) {
        if (graphic.hasWarnedAboutMissingImage==undefined) {
          console.warn("Lighting Graphic missing shadowImage",graphic);
          graphic.hasWarnedAboutMissingImage = true;
        }
      } else {
        osc.drawImage(graphic.shadowImage.image,graphic.shadowX-graphic.shadowWidth/2,graphic.shadowY-graphic.shadowHeight/2,graphic.shadowWidth,graphic.shadowHeight);
      }
    }

    let raycastCount = 0;

    let raySideOffset = 0.000001*(1/cg.z);
    raySideOffset = 0.0001;
    raySideOffset = Math.PI/180*3;
    
    for (let light of graphic.lights) {
      if (light.type=="spot"&&(cg.settings.useCamera||(debug.on&&debug.culling))) { // Check if the light is even in view
        let radius = light.outerRadius;
        let dx = light.x - Math.max(cg.camera.x - cg.cw/2, Math.min(light.x, cg.camera.x + cg.cw/2));
        let dy = light.y - Math.max(cg.camera.y - cg.ch/2, Math.min(light.y, cg.camera.y + cg.ch/2));
        if (dx**2 + dy**2 > radius**2) {
          continue;
        }
      }

      osc.save();
      cg.c.save();

      osc.lineWidth = 0.1;
      osc.globalCompositeOperation = "destination-out";
      cg.c.globalCompositeOperation = graphic.compositeOperation;
      ChoreoGraph.transformContext(cg);
      ChoreoGraph.transformContext(cg,0,0,0,1,1,true,false,false,0,0,osc);

      if (light.occlude) {
        let occlusionPath = [];
        
        let tl;
        let tr;
        let bl;
        let br;

        let vectors = [];
        if (light.type=="spot") {
          tl = [light.x-light.outerRadius,light.y-light.outerRadius];
          tr = [light.x+light.outerRadius,light.y-light.outerRadius];
          bl = [light.x-light.outerRadius,light.y+light.outerRadius];
          br = [light.x+light.outerRadius,light.y+light.outerRadius];
        } else if (light.type=="image") {
          tl = [light.x-(light.width/2)*1.414,light.y-(light.height/2)*1.414];
          tr = [light.x+(light.width/2)*1.414,light.y-(light.height/2)*1.414];
          bl = [light.x-(light.width/2)*1.414,light.y+(light.height/2)*1.414];
          br = [light.x+(light.width/2)*1.414,light.y+(light.height/2)*1.414];
        }
        vectors.push(tl);
        vectors.push(tr);
        vectors.push(bl);
        vectors.push(br);

        // FULL RADIAL CONSISTENT RAYS
        // let num = 1000;
        // for (let i=0;i<num;i++) {
        //   let angle = i*Math.PI/(num/2);
        //   let radius = cg.cw*10;
        //   vectors.push([light.x+Math.cos(angle)*radius,light.y+Math.sin(angle)*radius]);
        // }

        let sidesToCheck = [];
        for (let occluder of graphic.occluders) {
          let raycastedIndexes = [];
          for (let side of occluder.sides) {
            let xMin = side[4];
            let xMax = side[5];
            let yMin = side[6];
            let yMax = side[7];
            if (xMax<tl[0]||xMin>tr[0]||yMax<tl[1]||yMin>bl[1]) { continue; }
            let addPoint = function(point) {
              // Direct to occluder point
              vectors.push(point)
              let radius = cg.cw*10;
              let baseAngle = Math.atan2(point[1]-light.y,point[0]-light.x);
              // A little bit to the left and right of each point
              vectors.push([point[0]+Math.cos(baseAngle + raySideOffset)*radius,point[1]+Math.sin(baseAngle + raySideOffset)*radius]);
              vectors.push([point[0]+Math.cos(baseAngle - raySideOffset)*radius,point[1]+Math.sin(baseAngle - raySideOffset)*radius]);
            }
            let pointA = side[0];
            let pointB = side[1];
            let pointAIndex = side[2];
            let pointBIndex = side[3];
            if (!raycastedIndexes.includes(pointAIndex)) { addPoint(pointA); raycastedIndexes.push(pointAIndex); }
            if (!raycastedIndexes.includes(pointBIndex)) { addPoint(pointB); raycastedIndexes.push(pointBIndex); }
            sidesToCheck.push(side);
          }
        }
        let detects = [];
        for (let vector of vectors) {
          let closest = 2;
          for (let side of sidesToCheck) {
            raycastCount++;
            let intercept = ChoreoGraph.plugins.Lighting.calculateInterception(side[0][0],side[0][1],side[1][0],side[1][1],light.x,light.y,vector[0],vector[1]);
            if (intercept[0]) { if (intercept[2]<closest) { closest = intercept[2]; } }
            if (debug.on&&debug.raycasts) {
              osc.beginPath();
              osc.lineTo(light.x,light.y);
              osc.lineTo(vector[0],vector[1]);
              osc.stroke();
            }
          }
          // Extra rays to the corners of the light
          let intercept = ChoreoGraph.plugins.Lighting.calculateInterception(tl[0],tl[1],tr[0],tr[1],light.x,light.y,vector[0],vector[1]);
          if (intercept[0]) { if (intercept[2]<closest) { closest = intercept[2]; } }
          intercept = ChoreoGraph.plugins.Lighting.calculateInterception(tl[0],tl[1],bl[0],bl[1],light.x,light.y,vector[0],vector[1]);
          if (intercept[0]) { if (intercept[2]<closest) { closest = intercept[2]; } }
          intercept = ChoreoGraph.plugins.Lighting.calculateInterception(bl[0],bl[1],br[0],br[1],light.x,light.y,vector[0],vector[1]);
          if (intercept[0]) { if (intercept[2]<closest) { closest = intercept[2]; } }
          intercept = ChoreoGraph.plugins.Lighting.calculateInterception(tr[0],tr[1],br[0],br[1],light.x,light.y,vector[0],vector[1]);
          if (intercept[0]) { if (intercept[2]<closest) { closest = intercept[2]; } }
          raycastCount+=4;
          if (closest<=1) {
            let x = light.x + (vector[0] - light.x) * closest;
            let y = light.y + (vector[1] - light.y) * closest;
            if (debug.on&&debug.raycastInterceptions) {
              osc.beginPath();
              osc.lineTo(light.x,light.y);
              osc.lineTo(x,y);
              osc.stroke();
            }
            detects.push([vector[0],vector[1],x,y,Math.atan2(y-light.y,x-light.x),closest]);
          }
        }
        graphic.detects = detects.sort((a,b) => a[4]-b[4]);
        for (let i=0;i<graphic.detects.length;i++) {
          let detect = graphic.detects[i];
          occlusionPath.push([detect[2],detect[3]]);
          if (debug.on&&debug.raycastOrder) {
            osc.fillText(i,detect[2],detect[3]);
          }
        }

        osc.beginPath();
        cg.c.beginPath();
        for (let point of occlusionPath) {
          let x = point[0];
          let y = point[1];
          osc.lineTo(x,y);
          cg.c.lineTo(x,y);
        }
        osc.closePath();
        cg.c.closePath();
        osc.clip();
        cg.c.clip();
      }
      
      ChoreoGraph.transformContext(cg,light.x,light.y,light.r);
      ChoreoGraph.transformContext(cg,light.x,light.y,light.r,1,1,true,false,false,0,0,osc);

      cg.c.filter = "blur(" + light.feather*cg.z + "px)";
      osc.filter = "blur(" + light.feather*cg.z + "px)";
      if (light.type=="spot") {
        let radialData = light.x+"-"+light.y+""+(light.innerRadius/light.outerRadius);
        if (light.lightGradient==undefined||light.lastRadialData!=radialData) {
          light.lightGradient = osc.createRadialGradient(0, 0, 1, 0, 0, light.outerRadius);
          light.lightGradient.addColorStop(0, 'rgba(0,0,0,1)');
          light.lightGradient.addColorStop(light.innerRadius/light.outerRadius, 'rgba(0,0,0,1)');
          light.lightGradient.addColorStop(1, 'rgba(0,0,0,0)');
          if (light.colour!=null) {
            light.colourGradient = osc.createRadialGradient(0, 0, 1, 0, 0, light.outerRadius);
            light.colourGradient.addColorStop(0, light.colour);
            light.colourGradient.addColorStop(1-(light.innerRadius/light.outerRadius), light.colour);
            light.colourGradient.addColorStop(1, 'rgba(0,0,0,0)');
          }
          light.lastRadialData = radialData;
        }
        osc.fillStyle = light.lightGradient;
        osc.globalAlpha = light.brightness;
        let penumbraRadian = light.penumbra * Math.PI;
        let start = penumbraRadian;
        let end = 2*Math.PI-penumbraRadian;
        osc.beginPath();
        osc.arc(0,0,light.outerRadius,start,end);
        osc.lineTo(0,0);
        osc.fill();
        if (light.colour!=null&&light.colour!=undefined) {
          cg.c.fillStyle = light.colourGradient;
          cg.c.globalAlpha = light.brightness;
          cg.c.beginPath();
          cg.c.arc(0,0,light.outerRadius,start,end);
          cg.c.lineTo(0,0);
          cg.c.fill();
        }
      } else if (light.type=="image") {
        osc.globalAlpha = light.brightness;

        if (light.image.canvasOnCanvas||light.image.disableCropping) {
          osc.drawImage(light.image.image, -(light.width/2), -(light.height/2), light.width, light.height);
          if (light.colour!=null) {
            cg.c.drawImage(light.image.image, -(light.width/2), -(light.height/2), light.width, light.height);
          }
        } else {
          let crop = light.image.crop;
          osc.drawImage(light.image.image, crop[0],crop[1],crop[2],crop[3], -(light.width/2), -(light.height/2), light.width, light.height);
          if (light.colour!=null) {
            cg.c.drawImage(light.image.image, crop[0],crop[1],crop[2],crop[3], -(light.width/2), -(light.height/2), light.width, light.height);
          }
        }
      }

      osc.restore();
      cg.c.restore();
    }

    cg.c.globalCompositeOperation = "source-over";
    cg.c.resetTransform();
    cg.c.globalAlpha = 1;
    cg.c.drawImage(graphic.cnvs,0,0);

    if (debug.on&&debug.raycastCountDisplay) {
      cg.c.fillStyle = "#ffffff";
      cg.c.globalAlpha = 1;
      cg.c.font = "20px Arial";
      cg.c.fillText(raycastCount,10,30);
    }

    if (ChoreoGraph.plugins.Lighting.drawOccluders) {
      ChoreoGraph.transformContext(cg);
      cg.c.strokeStyle = "#ffffff";
      cg.c.fillStyle = "#ffffff";
      cg.c.lineWidth = 5;
      for (let occluder of graphic.occluders) {
        cg.c.beginPath();
        for (let point of occluder.path) {
          cg.c.lineTo(point[0],point[1]);
        }
        cg.c.closePath();
        cg.c.globalAlpha = 0.5;
        cg.c.stroke();
        cg.c.beginPath();
        for (let point of occluder.path) {
          cg.c.moveTo(point[0],point[1]);
          cg.c.arc(point[0],point[1],5,0,2*Math.PI)
        }
        cg.c.globalAlpha = 1;
        cg.c.fill();
      }
    }
  }
}

ChoreoGraph.plugin({
  name: "Lighting",
  key: "Lighting",
  version: "1.0",
  drawOccluders: false,
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
      // let f1x = x1 + (x2-x1) * t1;
      // let f1y = y1 + (y2-y1) * t1;
      // let f2x = x3 + (x4-x3) * t2;
      // let f2y = y3 + (y4-y3) * t2;
      return [(t1>=0&&t1<=1&&t2>=0),t1,t2]
      // return [(t1>=0&&t1<=1&&t2>=0&&t2<=1),t1,t2] // This is for two line segments, the above is for one endless ray and a segment
      // return [t1,t2,f1x,f1y,f2x,f2y,(t1>=0&&t1<=1&&t2>=0&&t2<=1)];
      // return (t>=0&&t<=1);
    }
  },
  SpotLight: class SpotLight {
    type = "spot";
    id = null;
    x = 0;
    y = 0;
    r = 0; // rotation
    penumbra = 0; // 0-1
    colour = null;
    brightness = 1;
    occlude = true; // If true the light will calculate occlusion with the occluders
    feather = 0;

    innerRadius = 50;
    outerRadius = 100;
  },
  ImageLight: class ImageLight {
    type = "image";
    id = null;
    x = 0;
    y = 0;
    r = 0; // rotation
    image = null;
    brightness = 1;
    occlude = true;
    feather = 0;

    width = null;
    height = null;
  },
  Occluder: class Occluder {
    id = null;
    x = 0;
    y = 0;
    path = [];
    sides = [];
    constructor(occluderInit={}) {
      for (let key in occluderInit) {
        this[key] = occluderInit[key];
      }
      if (this.id==null) { this.id = "light_" + ChoreoGraph.createId(5); }

      if (this.path.length>2) {
        this.calculateSides();
      }
    }
    calculateSides() {
      for (let i=0;i<this.path.length-1;i++) {
        let xMin = Math.min(this.path[i][0],this.path[i+1][0]);
        let xMax = Math.max(this.path[i][0],this.path[i+1][0]);
        let yMin = Math.min(this.path[i][1],this.path[i+1][1]);
        let yMax = Math.max(this.path[i][1],this.path[i+1][1]);
        this.sides.push([Array.from(this.path[i]),Array.from(this.path[i+1]),i,i+1,xMin,xMax,yMin,yMax]);
      }
      let xMin = Math.min(this.path[0][0],this.path[this.path.length-1][0]);
      let xMax = Math.max(this.path[0][0],this.path[this.path.length-1][0]);
      let yMin = Math.min(this.path[0][1],this.path[this.path.length-1][1]);
      let yMax = Math.max(this.path[0][1],this.path[this.path.length-1][1]);
      this.sides.push([Array.from(this.path[0]),Array.from(this.path[this.path.length-1]),0,this.path.length-1,xMin,xMax,yMin,yMax]);
    }
  },
  instanceConnect: function(cg) {
    cg.lights = {};
    cg.createLight = function(lightInit) {
      let newLight = null;
      if (lightInit!==undefined) {
        if (lightInit.type=="spot") {
          newLight = new ChoreoGraph.plugins.Lighting.SpotLight();
        } else if (lightInit.type=="image") {
          newLight = new ChoreoGraph.plugins.Lighting.ImageLight();
        }
        for (let key in lightInit) {
          newLight[key] = lightInit[key];
        }
        if (newLight.type=="image") {
          if (newLight.image==null) {
            console.error("ImageLight created without an image",newLight);
          } else if (newLight.width==null) {
            newLight.width = newLight.image.width;
            newLight.height = newLight.image.height;
          }
        }
        if (newLight.id==null) { newLight.id = "light_" + ChoreoGraph.createId(5); }
        newLight.ChoreoGraph = this;
        cg.lights[newLight.id] = newLight;
      }
      return newLight;
    }
    cg.lightOccluders = {};
    cg.createLightOccluder = function(occluderInit) {
      let newOccluder = new ChoreoGraph.plugins.Lighting.Occluder(occluderInit);
      if (occluderInit!==undefined) {
        newOccluder.ChoreoGraph = this;
        cg.lightOccluders[newOccluder.id] = newOccluder;
      }
      return newOccluder;
    }
  }
});
ChoreoGraph.ObjectComponents.Light = class Light {
  manifest = {
    title : "Light",
    master : false,
    keyOverride : "",
    update : true
  }
  light = null;
  ox = 0; // Offset X
  oy = 0; // Offset Y
  or = 0; // Offset Rotation

  constructor(componentInit, object) {
    ChoreoGraph.initObjectComponent(this, componentInit);
  }
  update(object) {
    if (this.light==null) { return; }
    this.light.x = object.Transform.x + object.Transform.ox + this.ox;
    this.light.y = object.Transform.y + object.Transform.oy + this.oy;
    this.light.r = object.Transform.r + object.Transform.or + this.or;
  }
}
// Willby - 2024