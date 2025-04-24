ChoreoGraph.plugin({
  name : "Animation",
  key : "Animation",
  version : "1.0",

  globalPackage : new class cgAnimationPackage {
    instanceObject = class cgAnimationInstancePackage {
      createAnimation(animationInit={},id=ChoreoGraph.id.get()) {
        let newAnimation = new ChoreoGraph.Animation.Animation(animationInit);
        newAnimation.id = id;
        newAnimation.cg = this;
        ChoreoGraph.applyAttributes(newAnimation,animationInit);
        this.animations[id] = newAnimation;
        this.cg.keys.animations.push(id);
        return newAnimation;
      };
      createAnimationFromPacked(packedData,animationInit={},id=ChoreoGraph.id.get()) {
        let newAnimation = new ChoreoGraph.Animation.Animation(this.cg);
        newAnimation.id = id;
        newAnimation.cg = this;
        newAnimation.unpack(packedData);
        ChoreoGraph.applyAttributes(newAnimation,animationInit);
        this.animations[newAnimation.id] = newAnimation;
        this.cg.keys.animations.push(newAnimation.id);
        return newAnimation;
      };

      animations = {};

      easeFunctions = {
        linear : function(t) { return t; },
      };

      hasActivatedDebugLoop = false;
      animationDebugLoop(cg) {
        if (!cg.settings.animation.debug.active) { return; }
        if (cg.settings.animation.debug.showBakedPaths) {
          for (let canvasId of cg.keys.canvases) {
            let canvas = cg.canvases[canvasId];
            if (canvas.camera===null) { continue; }
            canvas.c.save();

            // let markers = [];
            let paths = [];
            let keyFrames = [];
            let lastPosition = [0,0];
            
            for (let animationId of cg.keys.animations) {
              let animation = cg.Animation.animations[animationId];
              let xKey = -1;
              let yKey = -1;
              let rKey = -1;
              for (let k=0;k<animation.keys.length;k++) {
                if (JSON.stringify(animation.keys[k])==JSON.stringify(cg.settings.animation.debug.pathXKey)) { xKey = k; }
                if (JSON.stringify(animation.keys[k])==JSON.stringify(cg.settings.animation.debug.pathYKey)) { yKey = k; }
                if (JSON.stringify(animation.keys[k])==JSON.stringify(cg.settings.animation.debug.pathRKey)) { rKey = k; }
              }
              if (xKey==-1||yKey==-1) { continue; }

              let path = [];
              for (let f=0;f<animation.data.length;f++) {
                let frame = animation.data[f];
                if (frame.length==0) { continue; }
                if ((typeof(frame[0])=="number")) {
                  let x = frame[xKey];
                  let y = frame[yKey];
                  let r = 0;
                  if (rKey!=undefined) { r = frame[rKey]; }
                  keyFrames.push([x,y,r]);
                  path.push([x,y,r]);
                  lastPosition = [x,y,r];
                } else if (typeof(frame[0])=="string") {
                  // let colour = this.animations.markerColours.unknown;
                  // if (this.animations.markerColours[frame[0].toUpperCase()]!=undefined) { colour = this.animations.markerColours[frame[0].toUpperCase()]; }
                  // markers.push({x:lastPosition[0],y:lastPosition[1],c:colour,t:frame[1]});
                }
              }
              paths.push(path);
            }

            let oddLerps = [];
            let evenLerps = [];
        
            for (let p = 0; p < paths.length; p++) { // Find lerp paths
              for (let f = 0; f < paths[p].length; f++) {
                if (f!=0) {
                  if (f%2) {
                    oddLerps.push([lastPosition,paths[p][f]]);
                  } else {
                    evenLerps.push([lastPosition,paths[p][f]]);
                  }
                }
                lastPosition = paths[p][f];
              }
            }

            ChoreoGraph.transformContext(canvas.camera);

            let c = canvas.c;

            let size = cg.settings.animation.debug.width/canvas.camera.z;
        
            c.lineWidth = size; // Odd lerps
            c.strokeStyle = cg.settings.animation.debug.pathColours[0];
            c.beginPath();
            for (let p = 0; p < oddLerps.length; p++) {
              c.moveTo(oddLerps[p][0][0], oddLerps[p][0][1]);
              c.lineTo(oddLerps[p][1][0], oddLerps[p][1][1]);
            }
            c.stroke();
        
            c.strokeStyle = cg.settings.animation.debug.pathColours[1]; // Even lerps
            c.beginPath();
            for (let p = 0; p < evenLerps.length; p++) {
              c.moveTo(evenLerps[p][0][0], evenLerps[p][0][1]);
              c.lineTo(evenLerps[p][1][0], evenLerps[p][1][1]);
            }
            c.stroke();

            c.strokeStyle = cg.settings.animation.debug.pathColours[2];
            c.fillStyle = cg.settings.animation.debug.pathColours[2]; // Keyframe dots
            for (let k = 0; k < keyFrames.length; k++) {
              c.fillRect(keyFrames[k][0]-size/2,keyFrames[k][1]-size/2,size,size);
              if (cg.settings.animation.debug.showDirectionalMarkings) { // Directional markings
                let rotation = keyFrames[k][2];
                c.beginPath();
                let directionalMarkingLength = cg.settings.animation.debug.directionalMarkingLength/canvas.camera.z;
                c.moveTo(keyFrames[k][0],keyFrames[k][1]);
                c.lineTo(parseFloat((keyFrames[k][0]+(directionalMarkingLength)*Math.cos(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)), parseFloat((keyFrames[k][1]-(directionalMarkingLength)*Math.sin(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)));
                c.stroke();
                c.beginPath();
                c.arc(parseFloat((keyFrames[k][0]+(directionalMarkingLength)*Math.cos(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)), parseFloat((keyFrames[k][1]-(directionalMarkingLength)*Math.sin(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)),size,0,2*Math.PI);
                c.fill();
              }
            }

            c.restore();
          }
        }
      };
    };

    Animation = class cgAnimation {
      data = [];
      keys = [];
      tracks = [];
      duration = null;
      timeKey = null;
      ready = false;

      loadRaw(data,keys) {
        this.data = data;
        this.keys = keys;
        this.timeKey = keys.indexOf("time");
        this.calculateDuration();
        if (this.data.length<2) {
          console.warn("Animation:",this.id,"must be at least 2 keyframes long");
          this.ready = false;
        } else {
          this.ready = true;
        }
      };

      createTrack(trackType) {
        let newTrack = new ChoreoGraph.Animation.TrackTypes[trackType](this.cg.cg,this.tracks.length==0);
        newTrack.animation = this;
        this.tracks.push(newTrack);
        return newTrack;
      };

      bake() {
        let trackData = [];
        for (let i=0;i<this.tracks.length;i++) {
          let track = this.tracks[i];
          let data = track.getBakeData(i===0);
          trackData.push(data);
        }
        this.data = [];
        for (let i=0;i<trackData.length;i++) {
          for (let j=0;j<trackData[i].length;j++) {
            this.data.push(trackData[i][j]);
          }
        }
        this.calculateDuration();
        if (this.data.length<2) {
          console.warn("Animation:",this.id,"must be at least 2 keyframes long");
          this.ready = false;
        } else {
          this.ready = true;
        }
        return this.data;
      };

      calculateDuration() {
        this.duration = 0;
        for (let i=0;i<this.data.length;i++) {
          if (typeof this.data[i][0] === "string") { continue }
          if (this.data[i][this.timeKey]===undefined) { continue }
          this.duration += this.data[i][this.timeKey];
        }
        return this.duration;
      };

      pack() {
        let output = "";
        this.timeKey = this.keys.indexOf("time");
        if (this.timeKey==-1) { this.timeKey = "!"; }
        output += this.timeKey+":";
        for (let i=0;i<this.keys.length;i++) {
          if (this.keys[i]==="time") { continue; }
          for (let key of this.keys[i]) {
            output += key+",";
          }
          output = output.slice(0,-1);
          if (i!=this.keys.length-1) { output += "|"; }
        }
        if (output[output.length-1]=="|") { output = output.slice(0,-1); }
        output += "&";
        let first = true;
        for (let track of this.tracks) {
          if (first) { first = false; } else { output += "&"; }
          output += track.type+"=";
          output += track.pack();
        }
        return output;
      };

      unpack(data,bake=true) {
        this.tracks = [];
        this.keys = [];
        let keyData = data.split("&")[0];
        let timeKey = keyData.split(":")[0];
        this.keys[timeKey] = "time";
        this.timeKey = parseInt(timeKey);
        let keys = keyData.split(":")[1].split("|");
        let keySetIndex = 0;
        for (let i=0;i<keys.length;i++) {
          if (keySetIndex==timeKey) {
            this.keys[keySetIndex] = "time";
            keySetIndex++;
          }
          let keyList = keys[i].split(",");
          this.keys[keySetIndex] = [];
          for (let key of keyList) {
            this.keys[keySetIndex].push(key);
          }
          keySetIndex++;
        }
        let tracksData = data.split("&");
        tracksData.shift();
        for (let trackData of tracksData) {
          if (trackData=="") { continue; }
          let trackType = trackData.split("=")[0];
          if (ChoreoGraph.Animation.TrackTypes[trackType]===undefined) {
            continue;
          }
          let track = new ChoreoGraph.Animation.TrackTypes[trackType](this.cg.cg);
          track.animation = this;
          track.unpack(trackData.split("=")[1]);
          this.tracks.push(track);
        }
        if (bake) {
          this.bake();
        }
        if (this.cg.cg.AnimationEditor!==undefined&&this.cg.cg.AnimationEditor.initInterface) {
          ChoreoGraph.AnimationEditor.updateAnimationOverview(this.cg.cg,false);
        }
      };
    };

    TrackTypes = {
      path : class cgPathAnimationTrack {
        canBePrimary = true;
        canBeSupplementary = false;
        type = "path";

        segments = [];
        keys = {
          x : -1,
          y : -1,
          r : -1
        }

        constructor(cg) {
          this.density = cg.settings.animation.defaultPathDensity;
          this.cg = cg;
        };

        pack() {
          // xIndex,yIndex:density:trackData
          // trackData -> startX,startY,controlAX,controlAY,controlBX,controlBY,endX,endY

          // ! means no control point (comes after startY/controlAY)
          // _ means !!
          // ^ disconnected (comes after endY)
          // ~ means connected (comes after controlBY)
          // + means _~ / !!~ (comes after startY)

          let output = "";
          output += this.keys.x+","+this.keys.y+","+this.keys.r;
          output += ":";
          output += this.density
          output += ":";
          function chop(number,cg) {
            number = number.toString();
            let decimals = cg.settings.animation.genericDecimalRounding;
            if (number.includes(".")) {
              let split = number.split(".");
              let integer = split[0];
              let decimal = split[1];
              if (decimal.length>decimals) {
                decimal = decimal.slice(0,decimals);
                return integer+"."+decimal;
              } else {
                return number;
              }
            } else {
              return number;
            }
          }
          for (let i=0;i<this.segments.length;i++) {
            let segment = this.segments[i];
            output += chop(segment.start[0],this.cg)+","+chop(segment.start[1],this.cg);
            let trailingSymbol = false;
            if (!segment.controlAEnabled&&!segment.controlAEnabled) {
              output += "_";
              trailingSymbol = true;
            } else {
              if (segment.controlAEnabled) {
                output += ","+chop(segment.controlA[0],this.cg)+","+chop(segment.controlA[1],this.cg);
              } else {
                trailingSymbol = true;
                output += "!";
              }
              if (segment.controlBEnabled) {
                if (!trailingSymbol) { output += ","; }
                output += chop(segment.controlB[0],this.cg)+","+chop(segment.controlB[1],this.cg);
                trailingSymbol = false;
              } else {
                trailingSymbol = true;
                output += "!";
              }
            }
            if (!segment.connected) {
              if (!trailingSymbol) { output += ","; }
              output += chop(segment.end[0],this.cg)+","+chop(segment.end[1],this.cg);
              if (i!=this.segments.length-1) { output += "^"; }
            } else {
              output += "~";
            }

            if (output[output.length-2]=="_"&&output[output.length-1]=="~") {
              output = output.slice(0,-2);
              output += "+";
            }
          }
          return output;
        };

        unpack(data) {
          this.keys.x = parseInt(data.split(":")[0].split(",")[0]);
          this.keys.y = parseInt(data.split(":")[0].split(",")[1]);
          this.density = parseInt(data.split(":")[1]);
          let segments = data.split(":")[2];
          let pointer = 0;
          let previousSegment = null;
          let numberChars = "0123456789.-";
          function getNumber(data,pointer) {
            let number = "";
            while (numberChars.includes(data[pointer])) {
              number += data[pointer];
              pointer++;
            }
            number = Number(number);
            return [number,pointer]
          }
          function set(part,segment,data,pointer) {
            let x, y = 0;
            [x, pointer] = getNumber(data,pointer);
            pointer++;
            [y, pointer] = getNumber(data,pointer);
            segment[part] = [x,y];
            if (part=="controlA") {
              segment.controlAEnabled = true;
            } else if (part=="controlB") {
              segment.controlBEnabled = true;
            }
            return pointer;
          }
          function setFromControlB(segment,data,pointer) {
            if (data[pointer]=="!") {
              pointer++;
            } else if (data[pointer]==",") {
              pointer = set("controlB",segment,data,++pointer);
            }
            if (data[pointer]=="~") {
              segment.connected = true;
            } else if (data[pointer]==",") {
              pointer = set("end",segment,data,++pointer);
            } else if (numberChars.includes(data[pointer])) {
              pointer = set("end",segment,data,pointer);
            }
            return pointer;
          }

          while (pointer<segments.length) {
            let newSegment = new ChoreoGraph.Animation.SplineSegment();

            pointer = set("start",newSegment,segments,pointer);

            if (previousSegment?.connected) {
              previousSegment.end = newSegment.start;
              newSegment.before = previousSegment;
              previousSegment.after = newSegment;
            }
            previousSegment = newSegment;

            if (segments[pointer]=="+") {
              newSegment.connected = true;
            } else if (segments[pointer]=="_") {
              pointer = set("end",newSegment,segments,++pointer);
            } else if (segments[pointer]==",") {
              pointer = set("controlA",newSegment,segments,++pointer);
              pointer = setFromControlB(newSegment,segments,pointer);
            } else if (segments[pointer]=="!") {
              pointer = setFromControlB(newSegment,segments,++pointer);
            }

            this.segments.push(newSegment);
            pointer++;
          }
        };

        getJointPath() {
          let output = "";
          for (let i=0;i<this.segments.length;i++) {
            let segment = this.segments[i];
            output += "["+segment.start[0]+","+segment.start[1]+"],";
            if (!segment.connected) {
              output += "["+segment.end[0]+","+segment.end[1]+"],";
            }
          }
          output = output.slice(0,-1);
          return output;
        };

        getBakeData(isPrimaryTrack) {
          if (!isPrimaryTrack) { console.warn("Path track must be primary"); }
          let data = [];
          let previousPoint = null;
          let previousDisconnected = false;
          let track = this;
          let cg = this.cg;
          function append(x,y) {
            let decimals = cg.settings.animation.genericDecimalRounding;
            x = Number(x.toFixed(decimals));
            y = Number(y.toFixed(decimals));
            let time = 0;
            if (previousPoint!=null) {
              let distance = Math.sqrt((x-previousPoint[0])**2+(y-previousPoint[1])**2);
              time = distance;
            }
            if (previousDisconnected) {
              time = 0;
              previousDisconnected = false;
            }
            time = Number(time.toFixed(cg.settings.animation.timeDecimalRounding));
            previousPoint = [x,y];
            let keyframe = [];
            keyframe[track.keys.x] = x;
            keyframe[track.keys.y] = y;
            keyframe[track.animation.keys.indexOf("time")] = time;
            data.push(keyframe);
          }
          for (let i=0;i<this.segments.length;i++) {
            let segment = this.segments[i];
            if (segment.controlAEnabled||segment.controlBEnabled) {
              let samples = segment.getScaledSampleSize(this.density);
              for (let i=0;i<samples;i++) {
                let point = segment.getPoint(i/samples);
                append(point[0],point[1]);
              }
              if (!segment.connected) {
                append(segment.end[0],segment.end[1]);
                previousDisconnected = true;
              }
            } else {
              append(segment.start[0],segment.start[1]);
              if (!segment.connected) {
                append(segment.end[0],segment.end[1]);
                previousDisconnected = true;
              }
            }
          }
          return data;
        };

        getPartCount() {
          let count = 0;
          for (let i=0;i<this.segments.length;i++) {
            let segment = this.segments[i];
            if (segment.controlAEnabled||segment.controlBEnabled) {
              count += segment.getScaledSampleSize(this.density);
              if (!segment.connected) { count++; }
            } else {
              count++;
              if (!segment.connected) { count++; }
            }
          }
          return count;
        };

        info() {
          let info = this.segments.length+" segments ";
          for (let segment of this.segments) {
            if (segment.controlAEnabled==false&&segment.controlBEnabled==false) {
              info += "-"
            } else {
              info += "("
            }
            if (segment.connected==false) {
              info += " ";
            }
          };
          return info;
        };
      },
      sprite : class cgSpriteAnimationTrack {
        canBePrimary = true;
        canBeSupplementary = false;
        type = "sprite";

        constructor(cg) {
          this.cg = cg;
        }
        
        pack() {
          return "frameeedata";
        };

        unpack(data) {

        };

        getBakeData(isPrimaryTrack) {
          if (!isPrimaryTrack) { console.warn("Sprite track must be primary"); }
          let data = [];
          return data;
        };

        getPartCount() {
          let count = 0;
          return count;
        };

        info() {
          return "mmm";
        };
      },
      value : class cgValueAnimationTrack {
        canBePrimary = true;
        canBeSupplementary = true;
        type = "value";

        keys = {
          v : -1
        }

        values = [10,,,,50];

        constructor(cg,isPrimaryTrack) {
          this.primary = isPrimaryTrack;
          this.cg = cg;
        }

        pack() {
          let output = "";
          output += this.keys.v+",";
          output += this.primary ? "p" : "s";
          output += ":";
          let valuesData = "";
          if (this.primary) {

          } else {
            let empties = 0;
            for (let i=0;i<this.values.length;i++) {
              if (this.values[i]===undefined) { empties++; continue; }
              if (empties>0) {
                valuesData += "+" + empties;
                empties = 0;
              }
              valuesData += "," + this.values[i];
            }
          }
          output += valuesData;
          return output;
        };

        unpack(data) {
          let numberChars = "0123456789.-";
          function getNumber(data,pointer) {
            let number = "";
            while (numberChars.includes(data[pointer])) {
              number += data[pointer];
              pointer++;
            }
            number = Number(number);
            return [number,pointer]
          }
          this.keys.v = parseInt(data.split(":")[0].split(",")[0]);
          this.primary = data.split(":")[0].split(",")[1]=="p";
          this.values = [];
          let valuesData = data.split(":")[1];
          if (this.primary) {

          } else {
            let pointer = 0;
            while (pointer<valuesData.length) {
              let value = 0;
              if (valuesData[pointer]=="+") {
                pointer++;
                [value, pointer] = getNumber(valuesData,pointer);
                for (let i=0;i<value;i++) {
                  this.values.push(undefined);
                }
              } else if (valuesData[pointer]==",") {
                pointer++;
                [value, pointer] = getNumber(valuesData,pointer);
                this.values.push(value);
              }
            }
          }
        };

        getBakeData(isPrimaryTrack) {
          let data = [];
          return data;
        };

        getPartCount() {
          let count = 0;
          return count;
        };

        info() {
          return "mmm";
        };
      },
      trigger : class cgTriggerAnimationTrack {
        canBePrimary = false;
        canBeSupplementary = true;
        type = "trigger";

        constructor(cg) {
          this.cg = cg;
        }
        
        pack() {
          return "triggerrrrs";
        };

        unpack(data) {

        };

        getBakeData(isPrimaryTrack) {
          if (isPrimaryTrack) { console.warn("Trigger track must NOT be primary"); }
          let data = [];
          return data;
        };

        getPartCount() {
          let count = 0;
          return count;
        };

        info() {
          return "mmm";
        };
      }
    };

    SplineSegment = class SplineSegment {
      start = [0,0];
      controlAEnabled = false;
      controlBEnabled = false;
      controlA = [0,0];
      controlB = [0,0];
      end = [0,0];
      before = null;
      after = null;
      connected = false;
  
      getPoint(t) {
        let sX = this.start[0];
        let sY = this.start[1];
        let eX = this.end[0];
        let eY = this.end[1];
        if (this.connected) {
          eX = this.after.start[0];
          eY = this.after.start[1];
        }
        if (this.controlAEnabled==false&&this.controlBEnabled==false) {
          let x = (1-t)*sX + t*eX;
          let y = (1-t)*sY + t*eY;
          return [x,y];
        }
        let cAX = this.controlA[0];
        let cAY = this.controlA[1];
        if (this.controlAEnabled==false) {
          cAX = sX;
          cAY = sY;
        }
        let cBX = this.controlB[0];
        let cBY = this.controlB[1];
        if (this.controlBEnabled==false) {
          cBX = eX;
          cBY = eY;
        }
        let x = (1-t)**3*sX + 3*(1-t)**2*t*cAX + 3*(1-t)*t**2*cBX + t**3*eX;
        let y = (1-t)**3*sY + 3*(1-t)**2*t*cAY + 3*(1-t)*t**2*cBY + t**3*eY;
        return [x,y];
      };

      getLength(samples) {
        let length = 0;
        if (this.controlAEnabled==false&&this.controlBEnabled==false) {
          length = Math.sqrt((this.end[0]-this.start[0])**2+(this.end[1]-this.start[1])**2);
        } else {
          let lastX = this.start[0];
          let lastY = this.start[1];
          for (let i=1;i<=samples;i++) {
            let point = this.getPoint(i/samples);
            length += Math.sqrt((point[0]-lastX)**2+(point[1]-lastY)**2);
            lastX = point[0];
            lastY = point[1];
          }
        }
        return length;
      };

      getScaledSampleSize(density) {
        return Math.floor(this.getLength(30)/density);
      };
    };
  },

  instanceConnect(cg) {
    cg.Animation = new ChoreoGraph.Animation.instanceObject();
    cg.Animation.cg = cg;
    cg.keys.animations = [];

    cg.attachSettings("animation",{
      defaultPathDensity : 15,
      genericDecimalRounding : 3,
      timeDecimalRounding : 4,
      
      debug : new class {
        showBakedPaths = true;
        showDirectionalMarkings = true;
        directionalMarkingLength = 6;
        pathXKey = ["transform","x"];
        pathYKey = ["transform","y"];
        pathRKey = ["transform","r"];
        pathColours = ["#0000ff","#ff0000","#00ff00"]; // Odd Lerps, Even Lerps, Keyframes

        markers = true; // Symbols relating to triggers
        markerColours = {S:"#ff00ff",E:"#00ff00",C:"#0000ff",B:"#ff0000",V:"#00ffff",unknown:"#00ff00"}; // Colours for each type of trigger
        markerStyle = {size:20,fontSize:25,font:"Arial",offset:[0,0],opacity:0.7};
        width = 2;
        #cg = cg;
        #active = false;
        set active(value) {
          this.#active = value;
          if (value&&!this.#cg.Animation.hasActivatedDebugLoop) {
            this.#cg.Animation.hasActivatedDebugLoop = true;
            this.#cg.overlayLoops.push(this.#cg.Animation.animationDebugLoop);
          }
        }
        get active() { return this.#active; }
      }
    });

    if (ChoreoGraph.Develop!==undefined) {
      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Animation Debug",
        inactiveText : "Animation Debug",
        activated : cg.settings.animation.debug,
        onActive : (cg) => { cg.settings.animation.debug.active = true; },
        onInactive : (cg) => { cg.settings.animation.debug.active = false; },
      });
    };
  },

  instanceStart(cg) {
    if (ChoreoGraph.Animation.initiated===false) {
      ChoreoGraph.Animation.init();
    }
  }
});

ChoreoGraph.ObjectComponents.Animator = class cgObjectAnimator {
  manifest = {
    type : "Animator",
    key : "Animator",
    master : true,
    functions : {
      update : true,
      delete : true
    }
  }

  animation = null;
  connectionData = {
    initialisedAnimation : null,
    keys : []
  }
  speed = 1;
  playhead = 0;
  stt = 0; // Start Time
  ent = 0; // End TIme
  part = 0;
  from = [];
  to = [];
  ease = "linear";
  nextPlayfromAllowTriggers = false;
  loop = true;
  paused = false;
  playing = false;

  triggerTypes = {
    "s" : (trigger,object,animator) => { animator.speed = trigger[1]; },
    "e" : (trigger,object,animator) => { animator.ease = trigger[1]; },
    "c" : (trigger,object,animator) => { eval(trigger[1]) },
    "v" : (trigger,object,animator) => {
      trigger[1].reduce((acc, key, index, array) => {
        if (index === array.length - 1) {
          acc[key] = trigger[2];
        }
        return acc[key];
      }, object);
    }
  }

  deleteAnimationOnDelete = false;

  constructor(componentInit,object) {
    ChoreoGraph.initObjectComponent(this,componentInit);
  };

  update(scene) {
    if (this.animation==null) { return; }
    if (this.animation.ready==false) { return; }
    if (this.paused) { return; }
    if (scene.cg.timeSinceLastFrame > scene.cg.settings.core.inactiveTime) { return; }
    if (this.connectionData.initialisedAnimation!=this.animation.id) {
      this.initConnection();
    }

    if (this.playing==false) {
      this.playFrom(this.playhead);
    }

    let cg = scene.cg;

    this.playhead += (cg.timeSinceLastFrame*cg.settings.core.timeScale*this.speed)/1000;

    if (this.playhead>this.animation.duration) {
      this.setFinalValues();
      this.playing = false;
      if (!this.loop) {
        this.paused = true;
      } else {
        this.playhead = this.playhead - this.animation.duration;
        this.nextPlayfromAllowTriggers = true;
      }
    } else if (this.playhead>this.ent) {
      this.from = this.to;
      this.findNextKeyframe();
    }

    if (!this.playing) { return; }

    this.setValues();
  };

  // Sets object values by keys using FROM and TO
  setValues() {
    for (let i=0;i<this.connectionData.keys.length;i++) {
      let fromVal = this.from[i];
      let toVal = this.to[i];
      
      let t = 1-((this.ent-this.playhead)/(this.ent-this.stt));
      if (this.ease!=="linear") { t = cg.easeFunctions[this.ease](t); }

      let lerpVal = t * (toVal-fromVal) + fromVal;
      let keyData = this.connectionData.keys[i];

      keyData.object[keyData.key] = lerpVal;
    }
  };

  setFinalValues() {
    for (let i=0;i<this.connectionData.keys.length;i++) {
      let keyData = this.connectionData.keys[i];
      keyData.object[keyData.key] = this.to[i];
    }
  };

  // Sets STT ENT FROM AND TO relative to a playhead value
  playFrom(playhead) {
    if (this.animation==null) { return; }
    if (this.animation.ready==false) { return; }
    if (playhead>this.animation.duration) { playhead = this.animation.duration; }
    this.playhead = playhead;
    this.part = 0;
    this.stt = 0;
    this.ent = 0;
    let cumulativeTime = 0;
    let previousI = 0;
    let data = this.animation.data;
    for (let i=0;i<data.length;i++) {
      if (typeof data[i][0] === "string") {
        if (this.nextPlayfromAllowTriggers&&this.triggerTypes[data[i][0]]!==undefined) {
          this.triggerTypes[data[i][0]](data[i],this.object,this);
        }
      }
      let addition = 0;
      if (data[i][this.animation.timeKey]!==undefined) { addition = data[i][this.animation.timeKey]; }
      if (cumulativeTime+addition>=this.playhead) {
        this.part = Math.max(previousI,0);
        this.stt = cumulativeTime;
        this.ent = cumulativeTime;
        this.from = data[previousI];
        break;
      } else {
        cumulativeTime += addition;
      }
      previousI = i;
    }
    this.findNextKeyframe();
    this.playing = true;
    this.nextPlayfromAllowTriggers = false;
  };

  // Given the current part and playhead, find the next keyframe then set STT ENT FROM AND TO
  findNextKeyframe() {
    this.part++;
    this.passAllTriggers();
    this.to = this.animation.data[this.part];
    this.stt = this.ent;
    this.ent += this.to[this.animation.timeKey];

    if (this.playhead > this.ent) {
      this.from = this.to;
      this.findNextKeyframe();
    }
  };

  passAllTriggers() {
    let data = this.animation.data;
    while (this.part<data.length && typeof data[this.part][0] === "string") {
      if (this.triggerTypes[data[this.part][0]]!==undefined) {
        this.triggerTypes[data[this.part][0]](data[this.part],this.object,this);
      }
      this.part++;
    }
  };

  initConnection() {
    this.connectionData.initialisedAnimation = this.animation.id;
    this.connectionData.keys = [];

    for (let key of this.animation.keys) {
      if (key=="time") { continue; }
      let keyData = {
        key : key[key.length-1],
        object : this.object
      };
      if (key.length>1) {
        for (let i=0;i<key.length-1;i++) {
          keyData.object = keyData.object[key[i]];
        }
      }
      this.connectionData.keys.push(keyData);
    }
  };

  delete() {
    if (this.deleteTransformOnDelete) {
      this.transform.delete();
    };
  };
};