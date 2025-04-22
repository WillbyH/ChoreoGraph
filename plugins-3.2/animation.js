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
      createAnimationFromPacked(packedData,animationInit={}) {
        let newAnimation = new ChoreoGraph.Animation.Animation(this.cg);
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

      editor = {
        initInterface : false,
        animation : null,
        track : null,
        autobake : false,
        undoStack : [],
        redoStack : [],
        lastPack : null,

        ui : {
          dropdown : null,
          trackTypeDropdown : null,
          animationInformation : null,
          addPathTrackButton : null,
          trackContext : null,
          pathActionButtons : {},
          connectedToggle : null,
          tangentDropdown : null,
        },

        path : {
          actionType : "add",
          connectedMode : false,
          downPos : [0,0],
          selectedTangentType : "broken",
          grabbing : false,

          grabData : {
            type : null, // curve joint control disconnected linear

            // CURVE
            mainSegment : null, // The segment the curve belongs to
            savedMainControlA : [0,0],
            savedMainControlB : [0,0],
            beforeControlB : null, // The B control on the before segment
            afterControlA : null, // The A control on the after segment
            beforeDistance : 0, // The distance between the before control and the start joint
            afterDistance : 0, // The distance between the after control and the end joint

            // JOINT
            controlA : null, // The control point later in the spline
            savedControlA : [0,0],
            controlB : null, // The control point earlier in the spline
            savedControlB : [0,0],

            // CONTROL
            mainControl : null, // The control point that is being moved
            pairControl : null, // The control point that is connected to the same joint
            distance : 0, // The distance between the pair control point and the joint

            // DISCONNECTED
            control : null, // The singular control point connected to the joint
            savedControl : [0,0],

            // LINEAR & JOINT & CONTROL & DISCONNECTED
            joint : null, // The related joint
          },
          

          TANGENT_BROKEN : "broken",
          TANGENT_ALIGNED : "aligned",
          TANGENT_MIRRORED : "mirrored",

          GRAB_CURVE : "curve",
          GRAB_JOINT : "joint",
          GRAB_CONTROL : "control",
          GRAB_DISCONNECTED : "disconnected",
          GRAB_LINEAR : "linear",

          ACTION_ADD : "add",
          ACTION_GRAB : "grab",
          ACTION_DELETE : "delete",
          ACTION_INSERT : "insert"
        }
      };

      hasActivatedDebugLoop = false;
      animationDebugLoop(cg) {
        if (!cg.settings.animation.debug.active) { return; }
        if (cg.settings.animation.debug.showBakedPaths) {
          for (let canvasId of cg.keys.canvases) {
            let canvas = cg.canvases[canvasId];
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
        let newTrack = new ChoreoGraph.Animation.TrackTypes[trackType](this.cg.cg);
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
        for (let objectId in this.cg.cg.objects) {
          let object = this.cg.cg.objects[objectId];
          for (let component of object.objectData.components) {
            if (component.manifest.type=="Animator"&&component.animation.id==this.cg.cg.Animation.editor.animation.id) {
              component.playFrom(0);
            }
          }
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
        let output = this.id+"---";
        this.timeKey = this.keys.indexOf("time");
        output += this.timeKey+":";
        for (let i=0;i<this.keys.length;i++) {
          if (this.keys[i]=="time") { continue; }
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
        this.id = data.split("---")[0];
        let keyData = data.split("---")[1].split("&")[0];
        let timeKey = keyData.split(":")[0];
        this.keys[timeKey] = "time";
        this.timeKey = parseInt(timeKey);
        let keys = keyData.split(":")[1].split("|");
        for (let i=0;i<keys.length;i++) {
          if (i==timeKey) { continue; }
          let keyList = keys[i].split(",");
          this.keys[i] = [];
          for (let key of keyList) {
            this.keys[i].push(key);
          }
        }
        let tracksData = data.split("---")[1].split("&");
        tracksData.shift();
        for (let trackData of tracksData) {
          let trackType = trackData.split("=")[0];
          let track = new ChoreoGraph.Animation.TrackTypes[trackType](this.cg.cg);
          track.animation = this;
          track.unpack(trackData.split("=")[1]);
          this.tracks.push(track);
        }
        if (bake) {
          this.bake();
        }
        if (this.cg.cg.Animation.editor.initInterface) {
          ChoreoGraph.Animation.updateAnimationOverview(this.cg.cg,false);
        }
      };
    };

    TrackTypes = {
      path : class cgPathAnimationTrack {
        type = "path";
        segments = [];
        keys = {
          x : 0,
          y : 1
        }

        constructor(cg) {
          this.density = cg.settings.animation.editor.defaultPathDensity;
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
          output += this.keys.x+","+this.keys.y;
          output += ":";
          output += this.density
          output += ":";
          function chop(number,cg) {
            number = number.toString();
            let decimals = cg.settings.animation.editor.decimalRounding;
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
            let decimals = cg.settings.animation.editor.genericDecimalRounding;
            // x = Math.floor(x * (10**decimals)) * (1/(10**decimals));
            // y = Math.floor(y * (10**decimals)) * (1/(10**decimals));
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
            time = Number(time.toFixed(cg.settings.animation.editor.timeDecimalRounding));
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
        type = "sprite";
        
        pack() {
          return "frameeedata";
        };

        info() {
          return "mmm";
        };
      },
      value : class cgValueAnimationTrack {
        type = "value";
        
        pack() {
          return "numbersss";
        };

        info() {
          return "mmm";
        };
      },
      trigger : class cgTriggerAnimationTrack {
        type = "trigger";
        
        pack() {
          return "numbersss";
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

    processEditor(cg) {
      if (cg.Input===undefined) { console.warn("Animation editor requires Input plugin"); return; }
      let editor = cg.Animation.editor;
      let hotkeys = cg.settings.animation.editor.hotkeys;
      if (editor.initInterface==false) {
        editor.initInterface = true;
        ChoreoGraph.Animation.generateInterface(cg);
      }
      let track = editor.track;
      if (track==null) { return; }
      if (track.type=="path") {
        let actionType = editor.path.actionType;

        const snapX = function snapEditorPointX(x,cg,ignoreOffset=false) {
          let gridSize = cg.settings.animation.editor.snapGridSize;
          let offset = cg.settings.animation.editor.snapGridOffsetX;
          if (ignoreOffset) { offset = 0; }
          let snappedX = Math.round((x+offset)/gridSize)*gridSize - offset;
          return snappedX;
        };
        const snapY = function snapEditorPointY(y,cg,ignoreOffset=false) {
          let gridSize = cg.settings.animation.editor.snapGridSize;
          let offset = cg.settings.animation.editor.snapGridOffsetY;
          if (ignoreOffset) { offset = 0; }
          let snappedY = Math.round((y+offset)/gridSize)*gridSize - offset;
          return snappedY;
        };

        // GRABBING
        if (editor.path.grabbing) {
          let offset = [snapX(cg.Input.cursor.x-editor.path.downPos[0],cg,true),snapY(cg.Input.cursor.y-editor.path.downPos[1],cg,true)];
          let grabData = editor.path.grabData;

          function alignTangent(control,pair,joint,distance) {
            let angle = -Math.atan2(pair[0]-joint[0],pair[1]-joint[1]);
            angle -= Math.PI/2;
            control[0] = joint[0] + distance*Math.cos(angle);
            control[1] = joint[1] + distance*Math.sin(angle);
          };
          function mirrorTangent(control,pair,joint) {
            let distance = Math.sqrt((pair[0]-joint[0])**2+(pair[1]-joint[1])**2);
            let angle = -Math.atan2(pair[0]-joint[0],pair[1]-joint[1]);
            angle -= Math.PI/2;
            control[0] = joint[0] + distance*Math.cos(angle);
            control[1] = joint[1] + distance*Math.sin(angle);
          }

          if (grabData.type==editor.path.GRAB_CURVE) {
            let main = grabData.mainSegment;
            let update = false;
            if (main.controlAEnabled==false) {
              update = true;
              grabData.savedMainControlA[0] = main.start[0] + offset[0];
              grabData.savedMainControlA[1] = main.start[1] + offset[1];
              main.controlAEnabled = true;
            }
            if (main.controlBEnabled==false) {
              update = true;
              grabData.savedMainControlB[0] = main.end[0] + offset[0];
              grabData.savedMainControlB[1] = main.end[1] + offset[1];
              main.controlBEnabled = true;
            }
            main.controlA[0] = grabData.savedMainControlA[0] + offset[0]*1.328;
            main.controlA[1] = grabData.savedMainControlA[1] + offset[1]*1.328;
            main.controlB[0] = grabData.savedMainControlB[0] + offset[0]*1.328;
            main.controlB[1] = grabData.savedMainControlB[1] + offset[1]*1.328;
            if (editor.path.selectedTangentType==editor.path.TANGENT_ALIGNED) {
              if (grabData.beforeControlB!=null) {
                alignTangent(grabData.beforeControlB,main.controlA,main.start,grabData.beforeDistance);
              }
              if (grabData.afterControlA!=null) {
                alignTangent(grabData.afterControlA,main.controlB,main.end,grabData.afterDistance);
              }
            } else if (editor.path.selectedTangentType==editor.path.TANGENT_MIRRORED) {
              if (grabData.beforeControlB!=null) {
                mirrorTangent(grabData.beforeControlB,main.controlA,main.start);
              }
              if (grabData.afterControlA!=null) {
                mirrorTangent(grabData.afterControlA,main.controlB,main.end);
              }
            }
            if (update) { ChoreoGraph.Animation.updateAnimationOverview(cg); }

          } else if (grabData.type==editor.path.GRAB_JOINT) {
            grabData.joint[0] = snapX(cg.Input.cursor.x,cg);
            grabData.joint[1] = snapY(cg.Input.cursor.y,cg);
            grabData.controlA[0] = grabData.savedControlA[0] + offset[0];
            grabData.controlA[1] = grabData.savedControlA[1] + offset[1];
            grabData.controlB[0] = grabData.savedControlB[0] + offset[0];
            grabData.controlB[1] = grabData.savedControlB[1] + offset[1];


          } else if (grabData.type==editor.path.GRAB_CONTROL) {
            grabData.mainControl[0] = snapX(cg.Input.cursor.x,cg);
            grabData.mainControl[1] = snapY(cg.Input.cursor.y,cg);
            if (grabData.pairControl!=null) {
              if (editor.path.selectedTangentType==editor.path.TANGENT_ALIGNED) {
                alignTangent(grabData.pairControl,grabData.mainControl,grabData.joint,grabData.distance);
              } else if (editor.path.selectedTangentType==editor.path.TANGENT_MIRRORED) {
                mirrorTangent(grabData.pairControl,grabData.mainControl,grabData.joint);
              }
            }

          } else if (grabData.type==editor.path.GRAB_DISCONNECTED) {
            grabData.joint[0] = snapX(cg.Input.cursor.x,cg);
            grabData.joint[1] = snapY(cg.Input.cursor.y,cg);
            grabData.control[0] = grabData.savedControl[0] + offset[0];
            grabData.control[1] = grabData.savedControl[1] + offset[1];

          } else if (grabData.type==editor.path.GRAB_LINEAR) {
            grabData.joint[0] = snapX(cg.Input.cursor.x,cg);
            grabData.joint[1] = snapY(cg.Input.cursor.y,cg);
          }
        };
        // CURSOR DOWN
        if (cg.Input.cursor.impulseDown.any) {
          if (editor.animation==null) { return; }
          if ((editor.path.connectedMode==false||track.segments.length==0)&&actionType==editor.path.ACTION_ADD) {
            editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];

          // ADD NEW SEGMENT
          } else if (actionType==editor.path.ACTION_ADD&&editor.path.connectedMode&&track.segments.length>0) {
            let newSegment = new ChoreoGraph.Animation.SplineSegment();
            newSegment.start = track.segments[track.segments.length-1].end;
            newSegment.end = [snapX(cg.Input.cursor.x,cg),snapY(cg.Input.cursor.y,cg)];
            track.segments[track.segments.length-1].after = newSegment;
            newSegment.before = track.segments[track.segments.length-1];
            track.segments[track.segments.length-1].connected = true;
            track.segments.push(newSegment);
            ChoreoGraph.Animation.updateAnimationOverview(cg);

          // MODIFICATION
          } else if (actionType!=editor.path.ACTION_ADD) {
            let closestIndex = -1;
            let closestDistance = Infinity;
            let grabDistance = cg.settings.animation.editor.grabDistance*(1/cg.Input.cursor.canvas.camera.z);
            for (let i=0;i<editor.path.grabbablePoints.length;i++) {
              let grabbablePoint = editor.path.grabbablePoints[i];
              let point = grabbablePoint.point;
              let distance = Math.sqrt((cg.Input.cursor.x-point[0])**2+(cg.Input.cursor.y-point[1])**2);
              if (distance<closestDistance&&distance<grabDistance) {
                closestDistance = distance;
                closestIndex = i;
              }
            }
            if (closestIndex!=-1) {
              let grabbablePoint = editor.path.grabbablePoints[closestIndex];
              let segment = grabbablePoint.segment;
              // SET GRAB DATA
              if (actionType==editor.path.ACTION_GRAB) {
                editor.path.grabbing = true;
                let grabData = editor.path.grabData;

                // Find Grab Type
                if (grabbablePoint.type=="controlA"||grabbablePoint.type=="controlB") {
                  grabData.type = editor.path.GRAB_CONTROL;
                } else if (grabbablePoint.type=="end") {
                  grabData.type = editor.path.GRAB_DISCONNECTED;
                } else if (grabbablePoint.type=="curve") {
                  grabData.type = editor.path.GRAB_CURVE;
                } else if (grabbablePoint.type=="start") {
                  let before = grabbablePoint.segment.before;
                  if (grabbablePoint.pair==null) {
                    grabData.type = editor.path.GRAB_DISCONNECTED;
                  } else if (grabbablePoint.segment.controlAEnabled&&before.controlBEnabled) {
                    grabData.type = editor.path.GRAB_JOINT;
                  } else if (
                    (!grabbablePoint.segment.controlAEnabled&&before.controlBEnabled)||(grabbablePoint.segment.controlAEnabled&&!before.controlBEnabled)) {
                    grabData.type = editor.path.GRAB_DISCONNECTED;
                  } else {
                    grabData.type = editor.path.GRAB_LINEAR;
                  }
                }

                if (grabData.type=="curve") {
                  editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];
                } else {
                  editor.path.downPos = Array.from(segment[grabbablePoint.type]);
                }

                // Collect Grab Type Data
                if (grabData.type==editor.path.GRAB_CURVE) {
                  grabData.mainSegment = segment;
                  grabData.savedMainControlA = Array.from(segment.controlA);
                  grabData.savedMainControlB = Array.from(segment.controlB);
                  grabData.beforeControlB = null;
                  grabData.afterControlA = null;
                  if (segment.before!=null&&segment.before.controlBEnabled) {
                    grabData.beforeControlB = segment.before.controlB;
                    if (editor.path.selectedTangentType==editor.path.TANGENT_ALIGNED) {
                      grabData.beforeDistance = Math.sqrt((grabData.beforeControlB[0]-segment.start[0])**2+(grabData.beforeControlB[1]-segment.start[1])**2);
                    }
                  }
                  if (segment.after!=null&&segment.after.controlAEnabled) {
                    grabData.afterControlA = segment.after.controlA;
                    if (editor.path.selectedTangentType==editor.path.TANGENT_ALIGNED) {
                      grabData.afterDistance = Math.sqrt((grabData.afterControlA[0]-segment.end[0])**2+(grabData.afterControlA[1]-segment.end[1])**2);
                    }
                  }

                } else if (grabData.type==editor.path.GRAB_JOINT) {
                  // You can assume the point type is always a start
                  grabData.controlA = segment.controlA;
                  grabData.savedControlA = Array.from(segment.controlA);
                  grabData.controlB = grabbablePoint.pair.controlB;
                  grabData.savedControlB = Array.from(grabbablePoint.pair.controlB);
                  grabData.joint = segment.start;

                } else if (grabData.type==editor.path.GRAB_CONTROL) {
                  if (grabbablePoint.type=="controlA") {
                    grabData.joint = segment.start;
                  } else {
                    grabData.joint = segment.end;
                  }
                  grabData.mainControl = segment[grabbablePoint.type];
                  if (grabbablePoint.pair==null) {
                    grabData.pairControl = null;
                  } else {
                    grabData.pairControl = grabbablePoint.pair[grabbablePoint.type=="controlA"?"controlB":"controlA"];
                    grabData.distance = Math.sqrt((grabData.pairControl[0]-grabData.joint[0])**2+(grabData.pairControl[1]-grabData.joint[1])**2);
                  }

                } else if (grabData.type==editor.path.GRAB_DISCONNECTED) {
                  if (grabbablePoint.type=="start") {
                    if (segment.controlAEnabled) {
                      grabData.control = segment.controlA;
                      grabData.savedControl = Array.from(segment.controlA);
                    } else if (segment.before!=null&&segment.before.controlBEnabled) {
                      grabData.control = segment.before.controlB;
                      grabData.savedControl = Array.from(segment.before.controlB);
                    } else {
                      grabData.control = segment.controlA;
                      grabData.savedControl = Array.from(segment.controlA);
                    }
                    grabData.joint = segment.start;
                  } else {
                    grabData.control = segment.controlB;
                    grabData.savedControl = Array.from(segment.controlB);
                    grabData.joint = segment.end;
                  }

                } else if (grabData.type==editor.path.GRAB_LINEAR) {
                  if (grabbablePoint.type=="start") {
                    grabData.joint = segment.start;
                  } else {
                    grabData.joint = segment.end;
                  }
                }

              // DELETE
              } else if (actionType==editor.path.ACTION_DELETE) {
                console.log(grabbablePoint.type)
                if (grabbablePoint.type=="start"||grabbablePoint.type=="end") {
                  let index = track.segments.indexOf(segment);
                  let newSegments = [];
        
                  for (let i=0;i<track.segments.length;i++) {
                    if (i!=index) {
                      newSegments.push(track.segments[i]);
                    }
                  }
                  
                  if (grabbablePoint.type=="start") {
                    let before = segment.before;
                    let after = segment.after;

                    if (before!=null&&after!=null) {
                      segment.before.after = segment.after;
                      segment.after.before = segment.before;
                      segment.before.end = segment.after.start;
                      segment.after.start = segment.before.end;
                    } else if (before==null&&after!=null) {
                      segment.after.before = null;
                    } else if (before!=null&&after==null) {
                      segment.before.after = null;
                      segment.before.connected = false;
                      segment.before.end = segment.end;
                    }
                  } else if (grabbablePoint.type=="end"&&segment.before!=null) {
                    segment.before.after = segment.after;
                    segment.before.connected = false;
                  }
                  track.segments = newSegments;
                } else if (grabbablePoint.type=="controlA") {
                  segment.controlAEnabled = false;
                } else if (grabbablePoint.type=="controlB") {
                  segment.controlBEnabled = false;
                }
                ChoreoGraph.Animation.updateAnimationOverview(cg);

              // INSERT
              } else if (actionType==editor.path.ACTION_INSERT) {
                if (grabbablePoint.type=="curve") {
                  let newSegment = new ChoreoGraph.Animation.SplineSegment();
                  newSegment.connected = (segment.after!=null);
                  let middle = segment.getPoint(0.5);
                  newSegment.end = segment.end;
                  newSegment.before = segment;
                  newSegment.after = segment.after;
                  if (segment.after!=null) { segment.after.before = newSegment; }
                  segment.after = newSegment;
                  segment.end = middle;
                  newSegment.start = middle;

                  track.segments.splice(track.segments.indexOf(segment)+1,0,newSegment);

                  ChoreoGraph.Animation.updateAnimationOverview(cg);
                }
              }
            }
          }
        };
        // CURSOR UP
        if (cg.Input.cursor.impulseUp.any) {
          if (editor.animation==null) { return; }
          // ADD DISCONNECTED DRAGGED SEGMENT
          if (actionType==editor.path.ACTION_ADD&&(editor.path.connectedMode==false||track.segments.length==0)) {
            let segment = new ChoreoGraph.Animation.SplineSegment();
            segment.start = [snapX(editor.path.downPos[0],cg),snapY(editor.path.downPos[1],cg)];
            segment.end = [snapX(cg.Input.cursor.x,cg),snapY(cg.Input.cursor.y,cg)];
            track.segments.push(segment);
            cg.Animation.editor.ui.connectedToggle.activated = true;
            editor.path.connectedMode = true;
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          } else if (editor.path.grabbing) {
            editor.path.grabbing = false;
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          }
          cg.Animation.editor.ui.connectedToggle.setStylesAndText();
        };
        if (ChoreoGraph.Input.lastKeyDownFrame==ChoreoGraph.frame) {
          if (ChoreoGraph.Input.lastKeyDown==hotkeys.undo) {
            ChoreoGraph.Animation.undo(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.redo) {
            ChoreoGraph.Animation.redo(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathAdd) {
            editor.path.actionType = editor.path.ACTION_ADD;
            ChoreoGraph.Animation.updateTrackContext(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathGrab) {
            editor.path.actionType = editor.path.ACTION_GRAB;
            ChoreoGraph.Animation.updateTrackContext(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathDelete) {
            editor.path.actionType = editor.path.ACTION_DELETE;
            ChoreoGraph.Animation.updateTrackContext(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathInsert) {
            editor.path.actionType = editor.path.ACTION_INSERT;
            ChoreoGraph.Animation.updateTrackContext(cg);
          }
        };
      }
    };

    overlayEditor(cg) {
      if (cg.Input===undefined) { return; }
      let editor = cg.Animation.editor;
      let pathStyle = cg.settings.animation.editor.pathStyle;
      let c = cg.Input.cursor.canvas.c;
      let track = editor.track;
      if (track==null) { return; }
      let size = 1/cg.Input.cursor.canvas.camera.z;
      c.lineWidth = size*2;
      if (track.type=="path") {
        let actionType = editor.path.actionType;

        if (cg.Animation.editor.path.actionType==editor.path.ACTION_ADD) {
          c.strokeStyle = "white";
          if (cg.Input.cursor.hold.any&&(cg.Animation.editor.path.connectedMode==false||track.segments.length==0)) {
            c.beginPath();
            c.moveTo(editor.path.downPos[0],editor.path.downPos[1]);
            c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
            c.stroke();
          } else if (cg.Animation.editor.path.connectedMode&&track.segments.length>0) {
            let end = track.segments[track.segments.length-1].end;
            c.beginPath();
            c.moveTo(end[0],end[1]);
            c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
            c.stroke();
          }
        }
        editor.path.grabbablePoints = [];
        let lines = [];
        let currentLine = [];
        let joints = [];
        let controls = [];
        let curveGrabs = [];
        // Find all the points
        for (let segment of track.segments) {
          joints.push({point:segment.start});
          editor.path.grabbablePoints.push({type:"start",pair:segment.before,segment:segment,point:segment.start});

          if (segment.connected) {
            if (segment.controlBEnabled) { controls.push({joint:segment.after.start,point:segment.controlB}); }
          } else {
            joints.push({point:segment.end});
            if (segment.controlBEnabled) {controls.push({joint:segment.end,point:segment.controlB}); }
            if (segment.after==null) {
              editor.path.grabbablePoints.push({type:"end",pair:segment.after,segment:segment,point:segment.end});
            }
          }

          if (segment.controlAEnabled||segment.controlBEnabled) {
            let samples = segment.getScaledSampleSize(track.density);
            for (let i=0;i<=samples;i++) {
              currentLine.push(segment.getPoint(i/samples));
            }
            if (segment.controlAEnabled) {
              controls.push({joint:segment.start,point:segment.controlA});
              editor.path.grabbablePoints.push({type:"controlA",segment:segment,pair:segment.before,point:segment.controlA});
            }
            if (segment.controlBEnabled) {
              editor.path.grabbablePoints.push({type:"controlB",segment:segment,pair:segment.after,point:segment.controlB});
            }
          } else {
            currentLine.push(segment.start);
            if (segment.connected) {
              currentLine.push(segment.after.start);
            } else {
              currentLine.push(segment.end);
            }
          }

          curveGrabs.push(segment.getPoint(0.5));
          editor.path.grabbablePoints.push({type:"curve",segment:segment,point:segment.getPoint(0.5)});

          lines.push(currentLine);

          if (!segment.connected) {
            lines.push("gap");
          }

          currentLine = [];
        };

        if (actionType==editor.path.ACTION_GRAB||actionType==editor.path.ACTION_DELETE) {
          // CONTROL LINES
          c.strokeStyle = "cyan";
          c.lineWidth = size;
          c.beginPath();
          for (let control of controls) {
            let point = control.point;
            c.moveTo(control.joint[0],control.joint[1]);
            c.lineTo(point[0],point[1]);
          }
          c.stroke();
        }
        // LINES
        let ASections = [];
        let BSections = [];
        let disconnectedSections = [];
        let alternateAlternate = true;
        let lastPoint = [0,0];
        let addGap = false;
        let first = true;
        for (let line of lines) {
          if (line == "gap") {
            addGap = true;
            continue;
          }
          let alternate = alternateAlternate;
          alternateAlternate = !alternateAlternate;
          for (let i=0;i<line.length;i++) {
            let point = line[i];
            if (addGap) {
              disconnectedSections.push(lastPoint,point);
              addGap = false
            } else if (!first) {
              if (alternate) {
                ASections.push(lastPoint,point);
              } else {
                BSections.push(lastPoint,point);
              }
            } else {
              first = false;
            }
            alternate = !alternate;
            lastPoint = point;
          }
        }

        c.lineWidth = size*2;
        c.strokeStyle = pathStyle.lineA;
        c.beginPath();
        for (let i=0;i<ASections.length;i+=2) {
          let point = ASections[i];
          c.moveTo(point[0],point[1]);
          point = ASections[i+1];
          c.lineTo(point[0],point[1]);
        }
        c.stroke();

        c.strokeStyle = pathStyle.lineB;
        c.beginPath();
        for (let i=0;i<BSections.length;i+=2) {
          let point = BSections[i];
          c.moveTo(point[0],point[1]);
          point = BSections[i+1];
          c.lineTo(point[0],point[1]);
        }
        c.stroke();

        c.setLineDash([size*4, size*4]);
        c.strokeStyle = pathStyle.lineC;
        c.beginPath();
        for (let i=0;i<disconnectedSections.length;i+=2) {
          let point = disconnectedSections[i];
          c.moveTo(point[0],point[1]);
          point = disconnectedSections[i+1];
          c.lineTo(point[0],point[1]);
        }
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;

        // JOINTS
        for (let joint of joints) {
          let point = joint.point;
          c.fillStyle = pathStyle.joint;
          c.beginPath();
          c.moveTo(point[0]-6*size,point[1]);
          c.arc(point[0],point[1],6*size,0,2*Math.PI);
          c.fill();
        }
        if (actionType==editor.path.ACTION_GRAB||actionType==editor.path.ACTION_DELETE) {
          // CONTROL POINTS
          c.strokeStyle = pathStyle.control;
          c.beginPath();
          for (let control of controls) {
            let point = control.point;
            c.moveTo(point[0]+6*size,point[1]);
            c.arc(point[0],point[1],6*size,0,2*Math.PI);
          }
          c.stroke();
        }
        if (actionType==editor.path.ACTION_GRAB||actionType==editor.path.ACTION_INSERT) {
          // CURVE GRABS
          c.strokeStyle = pathStyle.curve;
          c.beginPath();
          for (let point of curveGrabs) {
            let radius = 6*size;
            c.moveTo(point[0]+radius,point[1]);
            c.arc(point[0],point[1],radius,0,2*Math.PI);
          }
          c.stroke();
        }

        for (let grabbablePoint of editor.path.grabbablePoints) {
          let point = grabbablePoint.point;
          let distance = Math.sqrt((cg.Input.cursor.x-point[0])**2+(cg.Input.cursor.y-point[1])**2);
          c.beginPath();
          if (distance<cg.settings.animation.editor.grabDistance*cg.Input.cursor.canvas.camera.z) {
            c.strokeStyle = "red";
          } else {
            c.strokeStyle = "green";
          }
          c.moveTo(point[0],point[1]);
          c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
          // c.stroke();
        }
      }
    };

    editorSelectAnimation(cg,animId) {
      let anim = cg.Animation.animations[animId];
      cg.Animation.editor.animation = anim;
      if (anim.tracks.length>0) {
        cg.Animation.editor.track = anim.tracks[0];
      } else {
        cg.Animation.editor.track = null;
      }
      this.updateAnimationOverview(cg,false);
    };

    generateInterface(cg) {
      let section = document.createElement("section");
      section.style.fontFamily = "sans-serif";
      section.id = "cg_animation_editor";
      ChoreoGraph.Develop.section.prepend(section);

      let header = document.createElement("header");
      header.innerHTML = "Animation Editor";
      header.style.fontWeight = "bold";
      section.append(header);

      // SELECTED ANIMATION DROPDOWN
      let dropdown = document.createElement("select");
      dropdown.cg = cg;
      cg.Animation.editor.ui.dropdown = dropdown;
      dropdown.className = "develop_button";
      section.appendChild(dropdown);

      for (let animId of cg.keys.animations) {
        let anim = cg.Animation.animations[animId];
        let option = document.createElement("option");
        option.text = anim.id;
        dropdown.add(option);
      }
      dropdown.onchange = (e) => {
        ChoreoGraph.Animation.editorSelectAnimation(e.target.cg,e.target.value);
      }

      if (dropdown.value!="") {
        ChoreoGraph.Animation.editorSelectAnimation(cg,dropdown.value);
      }

      // CREATE NEW ANIMATION BUTTON
      let createNewButton = document.createElement("button");
      createNewButton.innerHTML = "Create New Animation";
      createNewButton.classList.add("develop_button");
      createNewButton.classList.add("btn_action");
      createNewButton.cg = cg;
      createNewButton.onclick = (e) => {
        let newAnim = e.target.cg.Animation.createAnimation({});
        ChoreoGraph.Animation.editorSelectAnimation(e.target.cg,newAnim.id);
        let option = document.createElement("option");
        option.text = newAnim.id;
        e.target.cg.Animation.editor.ui.dropdown.add(option);
        e.target.cg.Animation.editor.ui.dropdown.value = newAnim.id;
        ChoreoGraph.Animation.updateAnimationOverview(cg);
      }
      section.appendChild(createNewButton);
      
      // SELECTED ANIMATION DROPDOWN
      let trackTypeDropdown = document.createElement("select");
      trackTypeDropdown.cg = cg;
      cg.Animation.editor.ui.trackTypeDropdown = trackTypeDropdown;
      trackTypeDropdown.className = "develop_button";
      section.appendChild(trackTypeDropdown);

      for (let type in ChoreoGraph.Animation.TrackTypes) {
        let option = document.createElement("option");
        option.text = type;
        trackTypeDropdown.add(option);
      }
      trackTypeDropdown.onchange = (e) => {
        e.target.cg.Animation.editor.ui.addPathTrackButton.innerHTML = "Add "+e.target.value+" Track";
      }

      // ADD TRACK BUTTON
      let addPathTrackButton = document.createElement("button");
      cg.Animation.editor.ui.addPathTrackButton = addPathTrackButton;
      addPathTrackButton.innerHTML = "Add "+trackTypeDropdown.value+" Track";;
      addPathTrackButton.classList.add("develop_button");
      addPathTrackButton.classList.add("btn_action");
      addPathTrackButton.cg = cg;
      addPathTrackButton.onclick = (e) => {
        let trackType = e.target.cg.Animation.editor.ui.trackTypeDropdown.value;
        let newTrack = e.target.cg.Animation.editor.animation.createTrack(trackType);
        if (e.target.cg.Animation.editor.track==null) { e.target.cg.Animation.editor.track = newTrack; }
        ChoreoGraph.Animation.updateAnimationOverview(e.target.cg);
        ChoreoGraph.Animation.updateTrackContext(e.target.cg);
      }
      section.appendChild(addPathTrackButton);

      // UNDO BUTTON
      let undoButton = document.createElement("button");
      undoButton.innerHTML = "Undo";
      undoButton.classList.add("develop_button");
      undoButton.classList.add("btn_action");
      undoButton.cg = cg;
      undoButton.onclick = (e) => {
        ChoreoGraph.Animation.undo(e.target.cg);
      }
      section.appendChild(undoButton);

      // REDO BUTTON
      let redoButton = document.createElement("button");
      redoButton.innerHTML = "Redo";
      redoButton.classList.add("develop_button");
      redoButton.classList.add("btn_action");
      redoButton.cg = cg;
      redoButton.onclick = (e) => {
        ChoreoGraph.Animation.redo(e.target.cg);
      }
      section.appendChild(redoButton);

      cg.Animation.editor.ui.autobakeToggle = new ChoreoGraph.Develop.UIToggleButton({
        activeText : "Autobake On",
        inactiveText : "Autobake Off",
        onActive : (cg) => { cg.Animation.editor.autobake = true; },
        onInactive : (cg) => { cg.Animation.editor.autobake = false; }
      },cg);

      // TRACK CONTEXT BUTTONS
      let trackContext = document.createElement("div");
      trackContext.style.display = "inline-block";
      cg.Animation.editor.ui.trackContext = trackContext;
      section.appendChild(trackContext);
      ChoreoGraph.Animation.updateTrackContext(cg);

      // ANIMATION INFORMATION
      let animationInformation = document.createElement("div");
      cg.Animation.editor.ui.animationInformation = animationInformation;
      section.appendChild(animationInformation);
      this.updateAnimationOverview(cg,false);

      section.appendChild(document.createElement("hr"));
    };

    setPathActionType(cg,type) {
      let editor = cg.Animation.editor;
      editor.path.actionType = type;
      ChoreoGraph.Animation.updateTrackContext(cg);
    };

    updateTrackContext(cg) {
      let div = cg.Animation.editor.ui.trackContext;
      div.innerHTML = "";
      if (cg.Animation.editor.track==null) { return; }
      if (cg.Animation.editor.track.type=="path") {
        // Separator
        let separator = document.createElement("div");
        separator.style.borderLeft = "1px solid white";
        separator.style.height = "10px";
        separator.style.display = "inline-block";
        separator.style.margin = "0px 2px";
        div.appendChild(separator);

        let actionType = cg.Animation.editor.path.actionType;

        function createPathTrackActionButton(name) {
          function makeTitleCase(str) {
            return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
          }
          let titleName = makeTitleCase(name);
          let lowerName = name.toLowerCase();
          let button = document.createElement("button");
          button.innerHTML = titleName;
          button.classList.add("develop_button");
          button.classList.add("btn_action");
          button.cg = cg;
          button.lowerName = lowerName;
          button.style.borderRadius = "50px";
          button.onclick = (e) => { ChoreoGraph.Animation.setPathActionType(e.target.cg,e.target.lowerName); };
          if (actionType==lowerName) { button.style.borderColor = "cyan"; } else { button.style.borderColor = ""; }
          div.appendChild(button);
          cg.Animation.editor.ui.pathActionButtons[lowerName] = button;
        }

        createPathTrackActionButton(cg.Animation.editor.path.ACTION_ADD);
        createPathTrackActionButton(cg.Animation.editor.path.ACTION_GRAB);
        createPathTrackActionButton(cg.Animation.editor.path.ACTION_DELETE);
        createPathTrackActionButton(cg.Animation.editor.path.ACTION_INSERT);

        let connectedToggle = new ChoreoGraph.Develop.UIToggleButton({
          activeText : "Connected Mode On",
          inactiveText : "Connected Mode Off",
          onActive : (cg) => { cg.Animation.editor.path.connectedMode = true; },
          onInactive : (cg) => { cg.Animation.editor.path.connectedMode = false; }
        },cg);
        div.appendChild(connectedToggle.element);
        cg.Animation.editor.ui.connectedToggle = connectedToggle;

        // SELECTED TANGENT TYPE DROPDOWN
        let dropdown = document.createElement("select");
        dropdown.cg = cg;
        cg.Animation.editor.ui.tangentDropdown = dropdown;
        dropdown.className = "develop_button";
        div.appendChild(dropdown);
  
        for (let type of [cg.Animation.editor.path.TANGENT_ALIGNED,cg.Animation.editor.path.TANGENT_MIRRORED,cg.Animation.editor.path.TANGENT_BROKEN]) {
          let option = document.createElement("option");
          option.text = type;
          option.cg = cg;
          dropdown.add(option);
        }
        dropdown.onchange = (e) => {
          e.target.cg.Animation.editor.path.selectedTangentType = e.target.value;
        }
        dropdown.value = cg.Animation.editor.path.selectedTangentType;
      
        let copyJointsButton = document.createElement("button");
        copyJointsButton.innerHTML = "Copy Joint Path";
        copyJointsButton.classList.add("develop_button");
        copyJointsButton.classList.add("btn_action");
        copyJointsButton.cg = cg;
        copyJointsButton.onclick = (e) => {
          let data = e.target.cg.Animation.editor.track.getJointPath();
          navigator.clipboard.writeText(data);
        };
        div.appendChild(copyJointsButton);
      }
    };

    updateAnimationOverview(cg,addToUndoQueue=true) {
      if (addToUndoQueue) {
        console.log("update")
      }
      let anim = cg.Animation.editor.animation;
      if (anim==null) { return; }
      
      let div = cg.Animation.editor.ui.animationInformation;
      if (div==null) { return; }
      div.innerHTML = "";

      div.appendChild(document.createElement("br"));

      let header = document.createElement("header");
      header.innerHTML = anim.id;
      header.style.fontWeight = "bold";
      div.appendChild(header);

      div.appendChild(document.createElement("br"));

      if (anim.tracks.length>0) {
        for (let track of anim.tracks) {
          let trackDiv = document.createElement("div");
          trackDiv.style.cursor = "pointer";
          if (cg.Animation.editor.track==track) {
            trackDiv.style.fontWeight = "bold";
            trackDiv.style.color = "green";
          }
          trackDiv.cg = cg;
          trackDiv.track = track;
          trackDiv.onclick = (e) => {
            e.target.cg.Animation.editor.track = e.target.track;
            ChoreoGraph.Animation.updateAnimationOverview(e.target.cg,false);
            ChoreoGraph.Animation.updateTrackContext(e.target.cg);
          }
          trackDiv.innerHTML = track.type + " - " + track.info();
          div.appendChild(trackDiv);
        }
      } else {
        let noTracks = document.createElement("div");
        noTracks.innerHTML = "No Tracks";
        div.appendChild(noTracks);
      }
      div.appendChild(document.createElement("hr"));

      let copyPackedButton = document.createElement("button");
      copyPackedButton.innerHTML = "Copy Packed Data";
      copyPackedButton.classList.add("develop_button");
      copyPackedButton.classList.add("btn_action");
      copyPackedButton.cg = cg;
      copyPackedButton.onclick = (e) => {
        let data = e.target.cg.Animation.editor.animation.pack();
        navigator.clipboard.writeText(data);
      };
      div.appendChild(copyPackedButton);

      let copyBakedButton = document.createElement("button");
      copyBakedButton.innerHTML = "Copy Baked Data";
      copyBakedButton.classList.add("develop_button");
      copyBakedButton.classList.add("btn_action");
      copyBakedButton.cg = cg;
      copyBakedButton.onclick = (e) => {
        let data = e.target.cg.Animation.editor.animation.bake();
        let output = "";
        for (var i in data) {
          output += "[" + data[i].join(",") + "],";
        }
        navigator.clipboard.writeText(output.slice(0, -1));
      };
      div.appendChild(copyBakedButton);

      let bakeButton = document.createElement("button");
      bakeButton.innerHTML = "Bake";
      bakeButton.classList.add("develop_button");
      bakeButton.classList.add("btn_action");
      bakeButton.cg = cg;
      bakeButton.onclick = (e) => {
        e.target.cg.Animation.editor.animation.bake();
      };
      div.appendChild(bakeButton);

      div.appendChild(cg.Animation.editor.ui.autobakeToggle.element);

      if (cg.Animation.editor.ui.autobakeToggle.activated) {
        cg.Animation.editor.animation.bake();
      }

      let packed = document.createElement("p");
      packed.style.overflowWrap = "break-word";
      let packedData = anim.pack();
      if (addToUndoQueue) {
        console.log("undoStackUpdate",ChoreoGraph.frame)
        cg.Animation.editor.redoStack.length = 0;
        cg.Animation.editor.undoStack.push(cg.Animation.editor.lastPack);
      }
      console.log("lastPackUpdate",ChoreoGraph.frame)
      cg.Animation.editor.lastPack = packedData;
      packed.innerText = packedData;
      div.appendChild(packed);
    };

    removeInterface(cg) {
      cg.Animation.editor.initInterface = false;
      document.getElementById("cg_animation_editor").remove();
    };

    selectFirstTrackByType(cg,type) {
      for (let track of cg.Animation.editor.animation.tracks) {
        if (track.type==type) {
          cg.Animation.editor.track = track;
          break;
        }
      }
    };

    undo(cg) {
      if (cg.Animation.editor.undoStack.length>0) {
        let selectedType = cg.Animation.editor.track.type;
        let packedData = cg.Animation.editor.undoStack.pop();
        cg.Animation.editor.redoStack.push(cg.Animation.editor.animation.pack());
        console.log("load",packedData)
        cg.Animation.editor.animation.unpack(packedData,cg.Animation.editor.autobake);

        this.selectFirstTrackByType(cg,selectedType);
      }
      this.updateAnimationOverview(cg,false);
    };

    redo(cg) {
      if (cg.Animation.editor.redoStack.length>0) {
        let selectedType = cg.Animation.editor.track.type;
        let packedData = cg.Animation.editor.redoStack.shift();
        cg.Animation.editor.undoStack.push(cg.Animation.editor.animation.pack());
        console.log("load",packedData)
        cg.Animation.editor.animation.unpack(packedData,cg.Animation.editor.autobake);

        this.selectFirstTrackByType(cg,selectedType);
      }
      this.updateAnimationOverview(cg,false);
    };
  },

  instanceConnect(cg) {
    cg.Animation = new ChoreoGraph.Animation.instanceObject();
    cg.Animation.cg = cg;
    cg.keys.animations = [];

    cg.attachSettings("animation",{
      editor : {
        active : false,
        grabDistance : 25,
        defaultPathDensity : 15,
        snapGridSize : 1,
        snapGridOffsetX : 0,
        snapGridOffsetY : 0,
        genericDecimalRounding : 3,
        timeDecimalRounding : 4,
        hotkeys : {
          undo : "z",
          redo : "y",
          pathAdd : "a",
          pathGrab : "g",
          pathDelete : "x",
          pathInsert : "i"
        },
        pathStyle : {
          lineA : "#ff0000",
          lineB : "#0000ff",
          lineC : "#ffffff",
          joint : "#00ff00",
          control : "#00ffff",
          curve : "#00ff00",
        }
      },
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
      ChoreoGraph.Develop.loops.process.push({activeCheck:cg.settings.animation.editor,func:ChoreoGraph.Animation.processEditor});
      ChoreoGraph.Develop.loops.overlay.push({activeCheck:cg.settings.animation.editor,func:ChoreoGraph.Animation.overlayEditor});

      ChoreoGraph.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Animation Editor",
        inactiveText : "Animation Editor",
        activated : cg.Animation.editor.active,
        onActive : (cg) => { cg.settings.animation.editor.active = true; },
        onInactive : (cg) => { cg.settings.animation.editor.active = false; ChoreoGraph.Animation.removeInterface(cg); },
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