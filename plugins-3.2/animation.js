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
        inSine : function(t) { return 1 - Math.cos((t * Math.PI) / 2); },
        outSine : function(t) { return Math.sin((t * Math.PI) / 2); },
        inOutSine : function(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
        inQuad : function(t) { return t * t; },
        outQuad : function(t) { return 1 - (1 - t) * (1 - t); },
        inOutQuad : function(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
        inCubic : function(t) { return t * t * t; },
        outCubic : function(t) { return 1 - Math.pow(1 - t, 3); },
        inOutCubic : function(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        inQuart : function(t) { return t * t * t * t; },
        outQuart : function(t) { return 1 - Math.pow(1 - t, 4); },
        inOutQuart : function(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; },
        inQuint : function(t) { return t * t * t * t * t; },
        outQuint : function(t) { return 1 - Math.pow(1 - t, 5); },
        inOutQuint : function(t) { return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2; },
        inExpo : function(t) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
        outExpo : function(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
        inOutExpo : function(t) { return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; },
        inCirc : function(t) { return 1 - Math.sqrt(1 - t * t); },
        outCirc : function(t) { return Math.sqrt(1 - Math.pow(t - 1, 2)); },
        inOutCirc : function(t) { return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2; },
        inBack : function(t, s = 1.70158) { return t * t * ((s + 1) * t - s); },
        outBack : function(t, s = 1.70158) { return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
        inOutBack : function(t, s = 1.70158) { return t < 0.5 ? (Math.pow(2 * t, 2) * ((s *= 1.525) + 1) * t - s) / 2 : (Math.pow(2 * t - 2, 2) * ((s *= 1.525) + 1) * (t - 1) + s + 2) / 2; },
        inElastic : function(t, s = 1.70158) { return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / s); },
        outElastic : function(t, s = 1.70158) { return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / s) + 1; },
        inOutElastic : function(t, s = 1.70158) { return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / s)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / s)) / 2 + 1; },
        inBounce : function(t) { return 1 - cg.Animation.easeFunctions.outBounce(1 - t); },
        outBounce : function(t) { return t < 4 / 11 ? (121 * t * t) / 16 : t < 8 / 11 ? (363 / 40) * t * t - (99 / 10) * t + 1 : (4356 / 361) * t * t - (35442 / 1805) * t + (16061 / 1805); },
        inOutBounce : function(t) { return t < 0.5 ? cg.Animation.easeFunctions.inBounce(t * 2) / 2 : cg.Animation.easeFunctions.outBounce(t * 2 - 1) / 2 + 0.5; }
      };

      hasActivatedDebugLoop = false;
      animationDebugLoop(cg) {
        let debugSettings = cg.settings.animation.debug;
        if (!debugSettings.active) { return; }
        if (debugSettings.showBakedPaths) {
          for (let canvasId of cg.keys.canvases) {
            let canvas = cg.canvases[canvasId];
            if (canvas.camera===null) { continue; }
            canvas.c.save();

            let markers = [];
            let paths = [];
            let keyFrames = [];
            let lastPosition = [0,0];

            for (let animationId of cg.keys.animations) {
              let animation = cg.Animation.animations[animationId];
              let xKey = -1;
              let yKey = -1;
              let rKey = -1;
              for (let k=0;k<animation.keys.length;k++) {
                if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(debugSettings.pathXKey)) { xKey = k; }
                if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(debugSettings.pathYKey)) { yKey = k; }
                if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(debugSettings.pathRKey)) { rKey = k; }
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
                  let markerColours = debugSettings.markerColours;
                  let colour = markerColours.unknown;
                  let triggerType = frame[0].toUpperCase();
                  if (markerColours[triggerType]!=undefined) {
                    colour = markerColours[triggerType];
                  }
                  markers.push({x:lastPosition[0],y:lastPosition[1],c:colour,t:frame[1]});
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

            let size = debugSettings.width/canvas.camera.z;
        
            c.lineWidth = size; // Odd lerps
            c.strokeStyle = debugSettings.pathColours[0];
            c.beginPath();
            for (let p = 0; p < oddLerps.length; p++) {
              c.moveTo(oddLerps[p][0][0], oddLerps[p][0][1]);
              c.lineTo(oddLerps[p][1][0], oddLerps[p][1][1]);
            }
            c.stroke();
        
            c.strokeStyle = debugSettings.pathColours[1]; // Even lerps
            c.beginPath();
            for (let p = 0; p < evenLerps.length; p++) {
              c.moveTo(evenLerps[p][0][0], evenLerps[p][0][1]);
              c.lineTo(evenLerps[p][1][0], evenLerps[p][1][1]);
            }
            c.stroke();

            c.strokeStyle = debugSettings.pathColours[2];
            c.fillStyle = debugSettings.pathColours[2]; // Keyframe dots
            for (let k = 0; k < keyFrames.length; k++) {
              c.fillRect(keyFrames[k][0]-size/2,keyFrames[k][1]-size/2,size,size);
              if (debugSettings.showDirectionalMarkings) { // Directional markings
                let rotation = keyFrames[k][2];
                c.beginPath();
                let directionalMarkingLength = debugSettings.directionalMarkingLength/canvas.camera.z;
                c.moveTo(keyFrames[k][0],keyFrames[k][1]);
                c.lineTo(parseFloat((keyFrames[k][0]+(directionalMarkingLength)*Math.cos(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)), parseFloat((keyFrames[k][1]-(directionalMarkingLength)*Math.sin(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)));
                c.stroke();
                c.beginPath();
                c.arc(parseFloat((keyFrames[k][0]+(directionalMarkingLength)*Math.cos(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)), parseFloat((keyFrames[k][1]-(directionalMarkingLength)*Math.sin(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)),size,0,2*Math.PI);
                c.fill();
              }
            }

            c.textAlign = "center";
            c.font = debugSettings.markerStyle.fontSize + "px " + debugSettings.markerStyle.font;
            c.textBaseline = "middle";
            if (debugSettings.showMarkers) {
              for (let m = 0; m < markers.length; m++) {
                c.fillStyle = markers[m].c;
                c.globalAlpha = debugSettings.markerStyle.opacity;
                c.beginPath();
                c.arc(markers[m].x,markers[m].y,debugSettings.markerStyle.size,0,2*Math.PI);
                c.fill();
                c.globalAlpha = 1;
                let split = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(markers[m].c); // Decide if marker text colour is white or black by background
                if (split!=null) {
                  let rbg = split ? split.map(i => parseInt(i, 16)).slice(1) : null;
                  if (rbg[0]*0.299+rbg[1]*0.587+rbg[2]*0.114<186) { c.fillStyle = "#ffffff"; } 
                  else { c.fillStyle = "#000000"; }
                } else { c.fillStyle = "#ffffff"; }
                c.textBaseline = "middle";
                c.fillText(markers[m].t, markers[m].x+debugSettings.markerStyle.offset[0], markers[m].y+debugSettings.markerStyle.offset[1],debugSettings.markerStyle.size*4);
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
        let trackTypes = ChoreoGraph.Animation.PrimaryTrackTypes;
        if (this.tracks.length>0) { trackTypes = ChoreoGraph.Animation.SupplementaryTrackTypes; }
        let newTrack = new trackTypes[trackType](this.cg.cg,this.tracks.length==0);
        newTrack.animation = this;
        this.tracks.push(newTrack);
        return newTrack;
      };

      bake() {
        // GET BAKE DATA FOR EACH TRACK
        let trackData = [];
        for (let i=0;i<this.tracks.length;i++) {
          let track = this.tracks[i];
          let data;
          if (trackData.length>0) { data = track.getBakeData(trackData[0]); }
          else { data = track.getBakeData(); }
          data.track = track;
          trackData.push(data);
        }

        // COMBINE VALUES
        this.data = [];
        for (let keyIndex=0;keyIndex<this.keys.length;keyIndex++) {
          let key = this.keys[keyIndex];
          if (key.keySet==="time") {
            for (let i=0;i<trackData[0].values.length;i++) {
              if (this.data[i]===undefined) { this.data[i] = []; }
              let keyFrame = trackData[0].values[i];
              if (keyFrame[0]!==undefined) {
                this.data[i][keyIndex] = keyFrame[0];
              }
            }
          }
          for (let source of key.sources) {
            let trackIndex = source[0];
            let track = this.tracks[trackIndex];
            let streamIndex = track.streams.indexOf(source[1]);
            if (trackIndex==0) { streamIndex++; }
            if (trackData[trackIndex].values!==undefined) {
              for (let i=0;i<trackData[trackIndex].values.length;i++) {
                if (this.data[i]===undefined) { this.data[i] = []; }
                let keyFrame = trackData[trackIndex].values[i];
                if (keyFrame[streamIndex]!==undefined) {
                  this.data[i][keyIndex] = keyFrame[streamIndex];
                }
              }
            }
          }
        }

        // COLLECT INSERTS
        let inserts = [];
        for (let i=0;i<trackData.length;i++) {
          if (trackData[i].inserts!==undefined) {
            for (let j=0;j<trackData[i].inserts.length;j++) {
              let insert = trackData[i].inserts[j];
              let part = Math.floor(insert.part);
              if (inserts[part]===undefined) { inserts[part] = []; }
              inserts[part].push({data:insert.data,sort:insert.part-part});
            }
          }
        }

        // SET PERSISTENT VALUES AND ZEROING
        let previousKeyFrame = null;
        for (let i=0;i<this.data.length;i++) {
          let frame = this.data[i];
          if (typeof frame[0] === "string") { continue; }
          for (let j=0;j<this.keys.length;j++) {
            if (frame[j]===undefined && previousKeyFrame!==null) {
              frame[j] = previousKeyFrame[j];
            } else if (frame[j]===undefined && previousKeyFrame === null) {
              frame[j] = 0;
            }
          }
          previousKeyFrame = frame;
        }

        // INSERT INSERTS
        for (let part in inserts) {
          inserts[part].sort((a,b) => { return a.sort-b.sort; });
        }
        let insertOffset = 1;
        for (let part in inserts) {
          for (let i=0;i<inserts[part].length;i++) {
            this.data.splice(parseInt(part)+insertOffset,0,inserts[part][i].data);
            insertOffset++;
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
        this.timeKey = this.getTimeKey();
        if (this.timeKey==-1) { this.timeKey = "!"; }

        // timeKeyData : regularKeyData | regularKeyData
        // timeKeyData = timeKeyIndex ; timeKeyOverrideTrackIndex ; timeKeyOverrideStream
        // regularKeyData = keySet ; keyTrackIndex ; keyStream ; keyOverrideTrackIndex ; keyOverrideStream
        // keySet = objectKey , objectKey , objectKey

        output += this.timeKey;
        output += ";";
        if (this.timeKey!=="!") {
          for (let source of this.keys[this.timeKey].sources) {
            output += source[0]+","+source[1]+";";
          }
        }
        output = output.slice(0,-1);
        if (this.keys.length>0&&!(this.keys.length===1&&this.keys[0].keySet=="time")) { output += ":"; }
        for (let i=0;i<this.keys.length;i++) {
          if (this.keys[i].keySet==="time") { continue; }
          for (let key of this.keys[i].keySet) {
            output += key+",";
          }
          output = output.slice(0,-1);
          output += ";";
          for (let source of this.keys[i].sources) {
            output += source[0]+","+source[1]+";";
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
        let timeKeyData = keyData.split(":")[0].split(";");
        this.timeKey = parseInt(timeKeyData[0]);
        this.keys[this.timeKey] = {keySet:"time",sources:[]};
        timeKeyData.shift();
        for (let source of timeKeyData) {
          let trackIndex = parseInt(source.split(",")[0]);
          let sourceStream = source.split(",")[1];
          this.keys[this.timeKey].sources.push([trackIndex,sourceStream]);
        }

        if (keyData.includes(":")) {
          let keys = keyData.split(":")[1].split("|");
          let keySetIndex = 0;
          for (let i=0;i<keys.length;i++) {
            if (keySetIndex==this.timeKey) { keySetIndex++; }
            let keyList = keys[i].split(";")[0].split(",");
            let sourceList = keys[i].split(";");
            sourceList.shift();
            this.keys[keySetIndex] = {keySet:[],sources:[]};
            for (let key of keyList) {
              this.keys[keySetIndex].keySet.push(key);
            }
            for (let source of sourceList) {
              let trackIndex = parseInt(source.split(",")[0]);
              let sourceStream = source.split(",")[1];
              this.keys[keySetIndex].sources.push([trackIndex,sourceStream]);
            }
            keySetIndex++;
          }
        }

        let tracksData = data.split("&");
        tracksData.shift();
        for (let trackData of tracksData) {
          if (trackData=="") { continue; }
          let trackType = trackData.split("=")[0];
          let trackTypes = ChoreoGraph.Animation.PrimaryTrackTypes;
          if (this.tracks.length>0) { trackTypes = ChoreoGraph.Animation.SupplementaryTrackTypes; }
          if (trackTypes[trackType]===undefined) {
            continue;
          }
          let track = new trackTypes[trackType](this.cg.cg);
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

      getTimeKey() {
        this.timeKey = -1;
        for (let i=0;i<this.keys.length;i++) {
          if (this.keys[i].keySet=="time") {
            this.timeKey = i;
            break;
          }
        }
        return this.timeKey;
      };
    };

    PrimaryTrackTypes = {
      path : class cgPathAnimationTrack {
        type = "path";

        segments = [];
        streams = ["x","y","r"];
        keys = {x:-1,y:-1,r:-1};

        constructor(cg) {
          this.density = cg.settings.animation.defaultPathDensity;
          this.cg = cg;
        };

        pack() {
          // density:trackData
          // trackData -> startX,startY,controlAX,controlAY,controlBX,controlBY,endX,endY

          // ! means no control point (comes after startY/controlAY)
          // _ means !!
          // ^ disconnected (comes after endY)
          // ~ means connected (comes after controlBY)
          // + means _~ / !!~ (comes after startY)

          let output = "";
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
          this.density = parseInt(data.split(":")[0]);
          let segments = data.split(":")[1];
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

        getBakeData() {
          let timeStreamIndex = 0;
          let xStreamIndex = this.streams.indexOf("x") + 1;
          let yStreamIndex = this.streams.indexOf("y") + 1;
          let rStreamIndex = this.streams.indexOf("r") + 1;
          let data = [];
          let previousPoint = null;
          let previousDisconnected = false;
          let track = this;
          let cg = this.cg;
          let applyRotationNext = false;
          let previousRotation = 0;
          let overrotationOffset = 0;
          function twoPointsToAngle(p1=[0,0], p2=[1,1]) {
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

            let r = 0;
            if (previousPoint!=null) {
              r = twoPointsToAngle(previousPoint,[x,y]);
              let rawChange = Math.abs(previousRotation-r);
              let positiveChange = Math.abs(previousRotation-(r+360));
              let negativeChange = Math.abs(previousRotation-(r-360));
              previousRotation = r;
              if (positiveChange<rawChange) {
                overrotationOffset += 360;
              } else if (negativeChange<rawChange) {
                overrotationOffset -= 360;
              }
              r = r + overrotationOffset;

              if (applyRotationNext) {
                data[data.length-1][rStreamIndex] = r;
              }
              applyRotationNext = false;
            } else {
              applyRotationNext = true;
            }
            r = Number(r.toFixed(decimals));

            previousPoint = [x,y];
            let keyframe = [];
            keyframe[timeStreamIndex] = time;
            keyframe[xStreamIndex] = x;
            keyframe[yStreamIndex] = y;
            keyframe[rStreamIndex] = r;
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
          return {values:data};
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
        type = "sprite";

        mode = "framerate"; // framerate or time
        fps = 60;
        time = "1/60";
        frames = [];

        graphicKey = ["Graphic","graphic"];

        constructor(cg) {
          this.cg = cg;
        }
        
        pack() {
          // mode:duration:graphicKey:frames
          // mode = f (framerate) or t (time)
          // duration = fps (framerate) or time (time)
          // graphicKey = key , key , key
          // frames = frame | frame | frame
          // frame = graphicId , durationMultiplier

          let output = this.mode=="framerate" ? "f" : "t";
          output += ":";
          if (this.mode=="framerate") {
            output += this.fps;
          } else {
            output += this.time;
          }
          output += ":";
          for (let key of this.graphicKey) {
            output += key+",";
          }
          if (this.graphicKey.length>0) { output = output.slice(0,-1); }
          output += ":";
          for (let frame of this.frames) {
            if (frame.durationMultiplier!=1) {
              output += frame.graphicId+","+frame.durationMultiplier+"|";
            } else {
              output += frame.graphicId+"|";
            }
          }
          if (this.frames.length>0) { output = output.slice(0,-1); }
          return output;
        };

        unpack(data) {
          this.mode = data.split(":")[0]=="f" ? "framerate" : "time";
          if (this.mode=="framerate") {
            this.fps = Number(data.split(":")[1]);
          } else {
            this.time = data.split(":")[1];
          }
          let graphicKeyData = data.split(":")[2].split(",");
          this.graphicKey = [];
          for (let i=0;i<graphicKeyData.length;i++) {
            this.graphicKey[i] = graphicKeyData[i];
          }
          let framesData = data.split(":")[3].split("|");
          this.frames = [];
          for (let i=0;i<framesData.length;i++) {
            let frameData = framesData[i].split(",");
            let graphicId = frameData[0];
            let durationMultiplier = 1;
            if (frameData.length>1) {
              durationMultiplier = Number(frameData[1]);
            }
            let frame = new ChoreoGraph.Animation.SpriteFrame();
            frame.graphicId = graphicId;
            frame.durationMultiplier = durationMultiplier;
            this.frames.push(frame);
          }
        };

        getBakeData() {
          let values = [[0]];
          let inserts = [];
          for (let frameNumber=0;frameNumber<this.frames.length;frameNumber++) {
            let time = 0;
            if (this.mode=="framerate") {
              time = 1/this.fps;
            } else if (this.mode=="time") {
              if (this.time.includes("/")) {
                let split = this.time.split("/");
                let numerator = parseInt(split[0]);
                let denominator = parseInt(split[1]);
                time = numerator/denominator;
              } else {
                time = Number(this.time);
              }
            }
            values.push([time]);

            let frame = this.frames[frameNumber];
            let graphicId = frame.graphicId;
            let graphic = this.cg.graphics[graphicId];
            if (graphic==undefined) {
              console.warn("Sprite Track on animation:",this.animation.id,"uses a graphic that does not exist:",graphicId);
              continue;
            }
            let insert = {part:frameNumber+0.5,data:["v",this.graphicKey,graphic]};
            inserts.push(insert);
          }
          return {values:values,inserts:inserts};
        };

        getPartCount() {
          return this.frames.length+1;
        };

        info() {
          return "mmm";
        };
      },
      fixedtime : class cgFixedTimeAnimationTrack {
        type = "fixedtime";

        mode = "framerate"; // framerate or time
        fps = 60;
        time = "1/60";
        frames = 1;

        constructor(cg) {
          this.density = cg.settings.animation.defaultPathDensity;
          this.cg = cg;
        };

        pack() {
          // mode:frames:duration
          // mode = f (framerate) or t (time)
          // duration = fps (framerate) or time (time)

          let output = this.mode=="framerate" ? "f" : "t";
          output += ":"+this.frames+":";
          if (this.mode=="framerate") {
            output += this.fps;
          } else {
            output += this.time;
          }
          
          return output;
        };

        unpack(data) {
          this.mode = data.split(":")[0]=="f" ? "framerate" : "time";
          this.frames = parseInt(data.split(":")[1]);
          if (this.mode=="framerate") {
            this.fps = Number(data.split(":")[2]);
          } else {
            this.time = data.split(":")[2];
          }
        };

        getBakeData() {
          let data = [];
          for (let frameNumber=0;frameNumber<this.frames;frameNumber++) {
            let frame = [];
            if (this.mode=="framerate") {
              frame[0] = 1/this.fps;
            } else if (this.mode=="time") {
              if (this.time.includes("/")) {
                let split = this.time.split("/");
                let numerator = parseInt(split[0]);
                let denominator = parseInt(split[1]);
                frame[0] = numerator/denominator;
              } else {
                frame[0] = Number(this.time);
              }
            }
            data.push(frame);
          }
          return {values:data};
        };

        getPartCount() {
          return this.frames;
        };

        info() {
          let output = this.frames;
          if (this.frames>1) { output += " frames "; } else { output += " frame "; }
          if (this.mode=="framerate") {
            output += this.fps + " fps";
          } else {
            output += this.time + " seconds";
          }
          return output;
        };
      },
      variabletime : class cgVariableTimeAnimationTrack {
        type = "variabletime";
        
        times = [];

        pack() {
          // time,time,time
          return this.times.join(",");
        };

        unpack(data) {
          this.times = [];
          let timesData = data.split(",");
          for (let i=0;i<timesData.length;i++) {
            this.times.push(Number(timesData[i]));
          }
        };

        getBakeData() {
          let data = [];
          for (let frameNumber=0;frameNumber<this.times.length;frameNumber++) {
            data.push([this.times[frameNumber]]);
          }
          return {values:data};
        };

        getPartCount() {
          return this.times.length;
        };

        info() {
          let totalDuration = 0;
          for (let i=0;i<this.times.length;i++) {
            totalDuration += this.times[i];
          }
          let output = totalDuration + " seconds over " + this.times.length + " frames";
          return output;
        };
      }
    };
    SupplementaryTrackTypes = {
      value : class cgValueAnimationTrack {
        type = "value";

        streams = ["v"];

        values = [];

        constructor(cg) {
          this.cg = cg;
        }

        pack() {
          // values
          // values -> + empties , disconnected value ! connected value

          let output = "";
          let valuesData = "";
          let empties = 0;
          for (let i=0;i<this.values.length;i++) {
            if (this.values[i]===undefined) { empties++; continue; }
            if (empties>0) {
              valuesData += "+" + empties;
              empties = 0;
            }
            if (this.values[i].interpolate) {
              valuesData += "!";
            } else {
              valuesData += ",";
            }
            valuesData += this.values[i].v;
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
          this.values = [];
          let pointer = 0;
          while (pointer<data.length) {
            let value = 0;
            if (data[pointer]=="+") {
              pointer++;
              [value, pointer] = getNumber(data,pointer);
              for (let i=0;i<value;i++) {
                this.values.push(undefined);
              }
            } else if (data[pointer]==",") {
              pointer++;
              [value, pointer] = getNumber(data,pointer);
              this.values.push({v:value,interpolate:false});
            } else if (data[pointer]=="!") {
              pointer++;
              [value, pointer] = getNumber(data,pointer);
              this.values.push({v:value,interpolate:true});
            }
          }
        };

        getBakeData(primaryBake) {
          let data = [];
          let lastValue = 0;
          let interpolationBuffer = [];
          let interpolate = false;
          let interpolationBufferTime = 0;
          let partCount = this.animation.tracks[0].getPartCount();
          for (let i=0;i<partCount;i++) {
            if (this.values[i]===undefined) {
              let keyframe = [];
              if (interpolate) {
                interpolationBufferTime += primaryBake.values[i][0];
                interpolationBuffer.push({from:lastValue,time:interpolationBufferTime,keyframe:keyframe});
              } else {
                keyframe[0] = undefined;
              }
              data.push(keyframe);
            } else {
              if (interpolate) {
                for (let j=0;j<interpolationBuffer.length;j++) {
                  let bufferItem = interpolationBuffer[j];
                  let to = this.values[i].v;
                  let from = bufferItem.from;
                  let time = bufferItem.time;
                  let keyframe = bufferItem.keyframe;
                  let totalTime = interpolationBufferTime+primaryBake.values[i][0];
                  keyframe[0] = from + (to-from)*(time/totalTime);
                }
                interpolate = false;
                interpolationBufferTime = 0;
                interpolationBuffer = [];
              }
              let keyframe = [];
              keyframe[0] = this.values[i].v;
              lastValue = this.values[i].v;
              interpolate = this.values[i].interpolate;
              data.push(keyframe);
            }
          }
          return {values:data};
        };

        info() {
          let count = 0;
          for (let i=0;i<this.values.length;i++) {
            if (this.values[i]!==undefined) { count++; }
          }
          return count + " keyframes";
        };
      },
      trigger : class cgTriggerAnimationTrack {
        type = "trigger";

        triggers = [];

        constructor(cg) {
          this.cg = cg;
        };

        encode(string) {
          if (typeof string !== "string") { return string; }
          let encodeCharacters = [" ","!",'"',"'","`","#","$","%","&","(",")","[","]","{","}","<",">","/","\\","|","~","^","*","+","-","=","_",".",",",";",":","?","@"];
          let rawEncode = {
            "-" : "%2D",
            "_" : "%5F",
            "." : "%2E",
            "!" : "%21",
            "~" : "%7E",
            "*" : "%2A",
            "'" : "%27",
            "(" : "%28",
            ")" : "%29",
            "#" : "%23"
          }
          let output = "";
          for (let char of string) {
            if (encodeCharacters.includes(char)) {
              if (encodeURIComponent(char)==char) {
                if (rawEncode[char]===undefined) {
                  output += char;
                } else {
                  output += rawEncode[char];
                }
              } else {
                output += encodeURIComponent(char);
              }
            } else {
              output += char;
            }
          }
          return output;
        };
        
        pack() {
          let typeIdentifiers = {
            "string" : "s",
            "number" : "n",
            "boolean" : "b",
            "undefined" : "u"
          }
          this.triggers.sort((a,b) => { return a.part-b.part; });
          let output = "";
          for (let i=0;i<this.triggers.length;i++) {
            if (i!=0) { output += "|"; }
            let trigger = this.triggers[i];
            output += trigger.part+":"+trigger.type+":";
            for (let j=0;j<trigger.data.length;j++) {
              if (j!=0) { output += ","; }
              let type = typeof trigger.data[j].value;
              if (typeIdentifiers[type]==undefined||trigger.data[j].evaluate) {
                output += "e"; // Evaluate
              } else {
                output += typeIdentifiers[type];
              }
              if (type==="boolean") {
                output += trigger.data[j].value ? "1" : "0";
              } else if (type==="number") {
                output += trigger.data[j].value;
              } else if (type!=="undefined") {
                output += this.encode(trigger.data[j].value);
              }
            }
          }
          return output;
        };

        unpack(data) {
          this.triggers = [];
          let triggers = data.split("|");
          for (let trigger of triggers) {
            let part = parseFloat(trigger.split(":")[0]);
            let type = trigger.split(":")[1];
            let rawData = trigger.split(":")[2].split(",");
            let evaluate = false;
            let data = [];
            for (let value of rawData) {
              let valueType = value[0];
              let valueData = value.slice(1);
              if (valueType==="s") {
                valueData = decodeURIComponent(valueData);
              } else if (valueType==="n") {
                valueData = parseFloat(valueData);
              } else if (valueType==="b") {
                valueData = valueData==="1" ? true : false;
              } else if (valueType==="u") {
                valueData = undefined;
              } else if (valueType==="e") {
                evaluate = true;
                valueData = decodeURIComponent(valueData);
              }
              data.push({evaluate:evaluate,value:valueData});
            }
            this.triggers.push({part:part,type:type,data:data});
          }
        };

        getBakeData() {
          let data = [];
          for (let trigger of this.triggers) {
            let outputTrigger = {part:trigger.part,data:[trigger.type]};
            for (let value of trigger.data) {
              if (value.evaluate) {
                outputTrigger.data.push(eval(value.value));
              } else {
                outputTrigger.data.push(value.value);
              }
            }
            data.push(outputTrigger);
          }
          return {inserts:data};
        };

        info() {
          let output = this.triggers.length + " trigger";
          if (this.triggers.length>1) { output += "s"; }
          output += " ";
          for (let trigger of this.triggers) {
            output += trigger.type+" ";
          }
          return output;
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

    SpriteFrame = class cgSpriteFrame {
      graphicId = "";
      durationMultiplier = 1;
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
        directionalMarkingLength = 10;
        pathXKey = ["transform","x"];
        pathYKey = ["transform","y"];
        pathRKey = ["transform","r"];
        pathColours = ["#0000ff","#ff0000","#00ff00"]; // Odd Lerps, Even Lerps, Keyframes

        showMarkers = true; // Symbols relating to triggers
        markerColours = {S:"#ff00ff",E:"#00ff00",C:"#0000ff",B:"#ff0000",V:"#00ffff",unknown:"#00ff00"}; // Colours for each type of trigger
        markerStyle = {size:10,fontSize:10,font:"Arial",offset:[0,0],opacity:0.7};
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
  runTriggers = true;
  loop = true;
  paused = false;
  playing = false;
  processingTrigger = false;

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
    },
    "p" : (trigger,object,animator) => {
      let output = Array.from(trigger);
      output.shift();
      if (output.length==1) { output = output[0]; }
      console.info(output);
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

    if (this.processingTrigger) {
      if (this.processTriggersAndFindTo()===false) { return }
    }

    this.advancePlayhead(scene);

    // PLAYHEAD > DURATION
    if (this.playhead>this.animation.duration) {
      this.setFinalValues();
      this.playing = false;
      if (this.loop) {
        this.rewind();
      } else {
        this.paused = true;
      }
      return;
    }
    
    // PLAYHEAD > ENT
    else if (this.playhead>this.ent) {
      this.from = this.to;
      this.part++;
      if (this.processTriggersAndFindTo()===false) { return; }
    }

    this.setValues();
  };

  // Moves the playhead forwards
  advancePlayhead(scene) {
    let cg = scene.cg;
    this.playhead += (cg.timeSinceLastFrame*cg.settings.core.timeScale*this.speed)/1000;
  };

  // Sets the playhead back by the duration of the animation
  rewind() {
    this.playhead = this.playhead - this.animation.duration;
    this.nextPlayfromAllowTriggers = true;
  };

  // Combines passAllTriggers and findTo, returns false if a trigger interupt happens
  processTriggersAndFindTo() {
    let pass = this.passAllTriggers();
    if (pass===false) {
      this.playhead = this.ent;
      this.setValues();
      return false;
    } else {
      if (this.findTo()===false) { return false; }
    }
    return true;
  };

  // Passes all triggers until the next keyframe, returns false if a trigger interupt happens
  passAllTriggers() {
    let data = this.animation.data;
    while (this.part<data.length && typeof data[this.part][0] === "string") {
      if (this.triggerTypes[data[this.part][0]]!==undefined && this.runTriggers) {
        let pass = this.triggerTypes[data[this.part][0]](data[this.part],this.object,this);
        if (pass===false) {
          if (!this.processingTrigger) {
            this.playhead = this.ent;
            this.setValues();
          }
          this.processingTrigger = true;
          return false;
        } else {
          this.processingTrigger = false;
        }
      }
      this.part++;
    }
    return true;
  };

  // Sets the TO value then checks if it needs to do it again, returns false if a trigger interupt happens
  findTo() {
    this.to = this.animation.data[this.part];
    this.stt = this.ent;
    this.ent += this.to[this.animation.timeKey];
    if (this.playhead > this.ent) {
      this.from = this.to;
      this.part++;
      if (this.processTriggersAndFindTo()===false) { return false; }
    }
    return true;
  };

  // Sets object values by keys using FROM and TO
  setValues() {
    for (let i=0;i<this.connectionData.keys.length;i++) {
      let fromVal = this.from[i];
      let toVal = this.to[i];
      
      let t = 1-((this.ent-this.playhead)/(this.ent-this.stt));
      if (this.ease!=="linear") { t = this.cg.Animation.easeFunctions[this.ease](t); }

      let lerpVal = t * (toVal-fromVal) + fromVal;
      let keyData = this.connectionData.keys[i];

      keyData.object[keyData.key] = lerpVal;
    }
  };

  // Set object values to the to values
  setFinalValues() {
    for (let i=0;i<this.connectionData.keys.length;i++) {
      let keyData = this.connectionData.keys[i];
      keyData.object[keyData.key] = this.to[i];
    }
  };

  // Sets animation values based on a given playhead
  playFrom(playhead) {
    this.playhead = playhead;
    if (this.animation==null) { return; }
    if (this.animation.ready==false) { return; }
    if (this.playhead>this.animation.duration) { this.playhead = this.animation.duration; }

    this.paused = false;
    this.playing = true;
    this.processingTrigger = false;
    this.part = 1;
    this.stt = 0;
    this.ent = 0;

    this.from = this.animation.data[0];

    if (!this.nextPlayfromAllowTriggers) {
      this.runTriggers = false;
    }

    this.processTriggersAndFindTo();

    this.nextPlayfromAllowTriggers = false;
    this.runTriggers = true;
  };

  initConnection() {
    this.connectionData.initialisedAnimation = this.animation.id;
    this.connectionData.keys = [];

    for (let key of this.animation.keys) {
      let keySet = key.keySet;
      if (keySet=="time") { continue; }
      let keyData = {
        key : keySet[keySet.length-1],
        object : this.object
      };
      if (keySet.length>1) {
        for (let i=0;i<keySet.length-1;i++) {
          keyData.object = keyData.object[keySet[i]];
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