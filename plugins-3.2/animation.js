ChoreoGraph.plugin({
  name : "Animation",
  key : "Animation",
  version : "1.0",

  globalPackage : new class cgAnimationPackage {
    instanceObject = class cgAnimationInstancePackage {
      createAnimation(animationInit,id=ChoreoGraph.id.get()) {
        let newAnimation = new ChoreoGraph.Animation.Animation(animationInit);
        newAnimation.id = id;
        newAnimation.cg = this;
        ChoreoGraph.applyAttributes(newAnimation,animationInit);
        this.animations[id] = newAnimation;
        this.cg.keys.animations.push(id);
        return newAnimation;
      };

      animations = {};

      editor = {
        initInterface : false,
        animation : null,
        track : null,

        ui : {
          dropdown : null,
          trackTypeDropdown : null,
          animationInformation : null,
          addPathTrackButton : null,
          trackContext : null,
          pathActionButtons : {},
          connectedToggle : null
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
          ACTION_INSERT : "insert",
          ACTION_LINEARIFY : "linearify"
        }
      };
    };

    Animation = class cgAnimation {
      data = [];
      tracks = [];
      packDecimals = 2;

      createTrack(trackType) {
        let newTrack = new ChoreoGraph.Animation.TrackTypes[trackType](this.cg.cg);
        newTrack.cg = this.cg.cg;
        newTrack.animation = this;
        this.tracks.push(newTrack);
        return newTrack;
      };
      bake() {
        
      };
      pack() {
        let output = this.id+"---";
        let first = true;
        for (let track of this.tracks) {
          if (first) { first = false; } else { output += "&"; }
          output += track.type+"-";
          output += track.pack();
        }
        return output;
      };
    };

    TrackTypes = {
      path : class cgPathAnimation {
        type = "path";
        segments = [];
        triggers = {};

        constructor(cg) {
          this.density = cg.settings.animation.editor.defaultPathDensity;
        }
        
        pack() {
          return "spliiiinedata";
        };

        info() {
          let info = this.segments.length+" segments ";
          for (let segment of this.segments) {
            if (segment.linear) {
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
      sprite : class cgSpriteAnimation {
        type = "sprite";
        
        pack() {
          return "frameeedata";
        };

        info() {
          return "mmm";
        };
      },
      value : class cgValueAnimation {
        type = "value";
        
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
      linear = true;
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
        if (this.linear) {
          let x = (1-t)*sX + t*eX;
          let y = (1-t)*sY + t*eY;
          return [x,y];
        }
        let cAX = this.controlA[0];
        let cAY = this.controlA[1];
        let cBX = this.controlB[0];
        let cBY = this.controlB[1];
        let x = (1-t)**3*sX + 3*(1-t)**2*t*cAX + 3*(1-t)*t**2*cBX + t**3*eX;
        let y = (1-t)**3*sY + 3*(1-t)**2*t*cAY + 3*(1-t)*t**2*cBY + t**3*eY;
        return [x,y];
      };

      getLength(samples) {
        let length = 0;
        if (this.linear) {
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
      }

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

        // GRABBING
        if (editor.path.grabbing) {
          let offset = [cg.Input.cursor.x-editor.path.downPos[0],cg.Input.cursor.y-editor.path.downPos[1]];
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
            if (main.linear) {
              update = true;
              grabData.savedMainControlA[0] = main.start[0] + offset[0];
              grabData.savedMainControlA[1] = main.start[1] + offset[1];
              grabData.savedMainControlB[0] = main.end[0] + offset[0];
              grabData.savedMainControlB[1] = main.end[1] + offset[1];
            }
            main.linear = false;
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
            grabData.joint[0] = cg.Input.cursor.x;
            grabData.joint[1] = cg.Input.cursor.y;
            grabData.controlA[0] = grabData.savedControlA[0] + offset[0];
            grabData.controlA[1] = grabData.savedControlA[1] + offset[1];
            grabData.controlB[0] = grabData.savedControlB[0] + offset[0];
            grabData.controlB[1] = grabData.savedControlB[1] + offset[1];


          } else if (grabData.type==editor.path.GRAB_CONTROL) {
            grabData.mainControl[0] = cg.Input.cursor.x;
            grabData.mainControl[1] = cg.Input.cursor.y;
            if (grabData.pairControl!=null) {
              if (editor.path.selectedTangentType==editor.path.TANGENT_ALIGNED) {
                alignTangent(grabData.pairControl,grabData.mainControl,grabData.joint,grabData.distance);
              } else if (editor.path.selectedTangentType==editor.path.TANGENT_MIRRORED) {
                mirrorTangent(grabData.pairControl,grabData.mainControl,grabData.joint);
              }
            }

          } else if (grabData.type==editor.path.GRAB_DISCONNECTED) {
            grabData.joint[0] = cg.Input.cursor.x;
            grabData.joint[1] = cg.Input.cursor.y;
            grabData.control[0] = grabData.savedControl[0] + offset[0];
            grabData.control[1] = grabData.savedControl[1] + offset[1];

          } else if (grabData.type==editor.path.GRAB_LINEAR) {
            grabData.joint[0] = cg.Input.cursor.x;
            grabData.joint[1] = cg.Input.cursor.y;
          }
        };
        // CURSOR DOWN
        if (cg.Input.cursor.impulseDown.any) {
          if (editor.animation==null) { return; }
          if (editor.path.connectedMode==false||track.segments.length==0) {
            editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];

          // ADD NEW SEGMENT
          } else if (actionType==editor.path.ACTION_ADD&&editor.path.connectedMode&&track.segments.length>0) {
            let newSegment = new ChoreoGraph.Animation.SplineSegment();
            newSegment.start = track.segments[track.segments.length-1].end;
            newSegment.end = [cg.Input.cursor.x,cg.Input.cursor.y];
            track.segments[track.segments.length-1].after = newSegment;
            newSegment.before = track.segments[track.segments.length-1];
            track.segments[track.segments.length-1].connected = true;
            track.segments.push(newSegment);
            ChoreoGraph.Animation.updateAnimationOverview(cg);

          // MODIFICATION
          } else if (actionType!=editor.path.ACTION_ADD) {
            let closestIndex = -1;
            let closestDistance = Infinity;
            let grabDistance = cg.settings.animation.editor.grabDistance*cg.Input.cursor.canvas.camera.z;
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
                  grabData.type = "control";
                } else if (grabbablePoint.type=="start"||grabbablePoint.type=="end") {
                  if (grabbablePoint.pair==null) {
                    grabData.type = "disconnected";
                  } else {
                    if (grabbablePoint.segment.linear) {
                      grabData.type = "linear";
                    } else {
                      grabData.type = "joint";
                    }
                  }
                } else if (grabbablePoint.type=="curve") {
                  grabData.type = "curve";
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
                  if (segment.before!=null&&!segment.before.linear) {
                    grabData.beforeControlB = segment.before.controlB;
                    if (editor.path.selectedTangentType==ChoreoGraph.Animation.TANGENT_ALIGNED) {
                      grabData.beforeDistance = Math.sqrt((grabData.beforeControlB[0]-segment.start[0])**2+(grabData.beforeControlB[1]-segment.start[1])**2);
                    }
                  }
                  if (segment.after!=null&&!segment.after.linear) {
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
                    grabData.control = segment.controlA;
                    grabData.savedControl = Array.from(segment.controlA);
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

              // LINEARIFY
              } else if (actionType==editor.path.ACTION_LINEARIFY) {
                if (grabbablePoint.type=="curve") {
                  segment.linear = true;
                  ChoreoGraph.Animation.updateAnimationOverview(cg);
                }

              // DELETE
              } else if (actionType==editor.path.ACTION_DELETE) {
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
                  ChoreoGraph.Animation.updateAnimationOverview(cg);
                }

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
            segment.start = editor.path.downPos;
            segment.end = [cg.Input.cursor.x,cg.Input.cursor.y];
            track.segments.push(segment);
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          }
          editor.path.grabbing = false;
          cg.Animation.editor.ui.connectedToggle.activated = true;
          editor.path.connectedMode = true;
          cg.Animation.editor.ui.connectedToggle.setStylesAndText();
        };
        if (ChoreoGraph.Input.lastKeyDownFrame==ChoreoGraph.frame) {
          if (ChoreoGraph.Input.lastKeyDown==hotkeys.undo) {
            track.segments.pop();
            // This needs to be replaced because simply popping is not the same as an undo
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.redo) {
            
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
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathLinearify) {
            editor.path.actionType = editor.path.ACTION_LINEARIFY;
            ChoreoGraph.Animation.updateTrackContext(cg);
          }
        };
      }
    };

    overlayEditor(cg) {
      if (cg.Input===undefined) { return; }
      let editor = cg.Animation.editor;
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
            if (segment.linear==false) { controls.push({joint:segment.after.start,point:segment.controlB}); }
          } else {
            joints.push({point:segment.end});
            if (segment.linear==false) {controls.push({joint:segment.end,point:segment.controlB}); }
            if (segment.after==null) {
              editor.path.grabbablePoints.push({type:"end",pair:segment.after,segment:segment,point:segment.end});
            }
          }

          if (segment.linear==false) {
            let samples = segment.getScaledSampleSize(track.density);
            for (let i=0;i<samples;i++) {
              currentLine.push(segment.getPoint(i/samples));
            }
            controls.push({joint:segment.start,point:segment.controlA});
            editor.path.grabbablePoints.push({type:"controlA",segment:segment,pair:segment.before,point:segment.controlA});
            editor.path.grabbablePoints.push({type:"controlB",segment:segment,pair:segment.after,point:segment.controlB});
          } else {
            currentLine.push(segment.start);
            if (segment.connected) {
              currentLine.push(segment.after.start);
            } else {
              currentLine.push(segment.end);
            }
          }

          if (!segment.connected) {
            lines.push(currentLine);
            currentLine = [];
          };

          curveGrabs.push(segment.getPoint(0.5));
          editor.path.grabbablePoints.push({type:"curve",segment:segment,point:segment.getPoint(0.5)});
        };
        lines.push(currentLine);

        if (actionType==editor.path.ACTION_GRAB||actionType==editor.path.ACTION_LINEARIFY) {
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
        c.lineWidth = size*2;
        c.strokeStyle = "white";
        let lastPoint = [0,0];
        let first = true;
        let alternate = true;
        for (let line of lines) {
          if (!first&&line.length>0) {
            c.lineTo(line[0][0],line[0][1]);
            c.stroke();
          }
          c.globalAlpha = 1;
          c.setLineDash([]);
          for (let point of line) {
            c.strokeStyle = alternate ? "white" : "black";
            alternate = !alternate;
            c.beginPath();
            c.moveTo(lastPoint[0],lastPoint[1]);
            c.lineTo(point[0],point[1]);
            c.stroke();
            lastPoint = point;
          }
          c.globalAlpha = 0.3;
          c.setLineDash([size*4, size*4]);
          c.beginPath();
          c.moveTo(lastPoint[0],lastPoint[1]);
          first = false;
        }
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
        // JOINTS
        for (let joint of joints) {
          let point = joint.point;
          c.fillStyle = "magenta";
          c.beginPath();
          c.moveTo(point[0]-6*size,point[1]);
          c.arc(point[0],point[1],6*size,0,2*Math.PI);
          c.fill();
        }
        if (actionType==editor.path.ACTION_GRAB||actionType==editor.path.ACTION_LINEARIFY) {
          // CONTROL POINTS
          c.strokeStyle = "blue";
          c.beginPath();
          for (let control of controls) {
            let point = control.point;
            c.moveTo(point[0]+6*size,point[1]);
            c.arc(point[0],point[1],6*size,0,2*Math.PI);
          }
          c.stroke();
        }
        if (actionType==editor.path.ACTION_GRAB||actionType==editor.path.ACTION_LINEARIFY||actionType==editor.path.ACTION_INSERT) {
          // CURVE GRABS
          c.strokeStyle = "green";
          c.beginPath();
          for (let point of curveGrabs) {
            let radius = 6*size;
            if (actionType==editor.path.ACTION_LINEARIFY) { radius = 10; }
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
      this.updateAnimationOverview(cg);
    }

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
        console.log("undo")
      }
      section.appendChild(undoButton);

      // REDO BUTTON
      let redoButton = document.createElement("button");
      redoButton.innerHTML = "Redo";
      redoButton.classList.add("develop_button");
      redoButton.classList.add("btn_action");
      redoButton.cg = cg;
      redoButton.onclick = (e) => {
        console.log("redo")
      }
      section.appendChild(redoButton);

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
      this.updateAnimationOverview(cg);

      section.appendChild(document.createElement("hr"));
    };

    setPathActionType(cg,type) {
      let editor = cg.Animation.editor;
      editor.path.actionType = type;
      ChoreoGraph.Animation.updateTrackContext(cg);
    }

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
        createPathTrackActionButton(cg.Animation.editor.path.ACTION_LINEARIFY);

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
        cg.Animation.editor.ui.dropdown = dropdown;
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
      }
    }

    updateAnimationOverview(cg) {
      let div = cg.Animation.editor.ui.animationInformation;
      div.innerHTML = "";
      let anim = cg.Animation.editor.animation;
      if (anim==null) { return; }

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
            ChoreoGraph.Animation.updateAnimationOverview(e.target.cg);
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

      let copyButton = document.createElement("button");
      copyButton.innerHTML = "Copy";
      copyButton.classList.add("develop_button");
      copyButton.classList.add("btn_action");
      copyButton.cg = cg;
      copyButton.onclick = (e) => {
        let data = e.target.cg.Animation.editor.animation.pack();
        navigator.clipboard.writeText(data);
      };
      div.appendChild(copyButton);

      let packedDiv = document.createElement("div");
      packedDiv.innerHTML = anim.pack();
      div.appendChild(packedDiv);
    };

    removeInterface(cg) {
      cg.Animation.editor.initInterface = false;
      document.getElementById("cg_animation_editor").remove();
    }
  },

  instanceConnect(cg) {
    cg.Animation = new ChoreoGraph.Animation.instanceObject();
    cg.Animation.cg = cg;
    cg.keys.animations = [];

    cg.attachSettings("animation",{
      editor : {
        active : false,
        grabDistance : 25,
        defaultPathDensity : 20,
        hotkeys : {
          undo : "z",
          redo : "y",
          pathAdd : "a",
          pathGrab : "g",
          pathDelete : "x",
          pathInsert : "i",
          pathLinearify : "l"
        }
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

// ChoreoGraph.ObjectComponents.Animator = class cgObjectAnimator {
//   manifest = {
//     key : "Graphic",
//     master : true,
//     functions : {
//       update : true,
//       delete : true
//     }
//   }
//   anim = null; // Animation that is to be running (required)
//   part = 0; // Index in the Animation data
//   fprog = 0; // 0 - 1 frame progress for lerp
//   stt = 0; // Start time
//   ent = 0; // End time
//   timeDebt = 0; // Time Debt (because time)
//   locked = false; // If true, free will be false (this is for manual changes)
//   freeChecks = []; // A list of key lists to check on the object
//   free = true; // If false, Animator will be static
//   ease = "linear"; // Easing function (linear, inoutA, inoutB, inA, inB, inC, outA, outB, outC)
//   selfDestructAnimation = false; // Deletes the Animatation entirely after reaching the end of the Animation
//   selfDestructAnimator = false; // Deletes the Animator component entirely after reaching the end of the Animation
//   selfDestructObject = false; // Deletes the Object entirely after reaching the end of the Animation
//   to = null; // The next positional keyframe
//   from = null; // The last positional keyframe
//   speed = 1; // A multiplier on the animations time values
//   lastUpdate = 0; // Last time the object was updated
//   triggerCallbacks = { // Callbacks for when a trigger is passed
//     "S" : this.defaultTriggerCallbacks,
//     "E" : this.defaultTriggerCallbacks,
//     "C" : this.defaultTriggerCallbacks,
//     "V" : this.defaultTriggerCallbacks,
//   }

//   deleteAnimationOnCollapse = false; // Deletes the Animation when the Object is deleted through an Object Collapse

//   constructor(componentInit, object) {
//     ChoreoGraph.initObjectComponent(this, componentInit);
//     if (this.anim!=null) { this.anim.inUse = true; }
//   }
//   update(object) {
//     let cg = object.ChoreoGraph;
//     this.free = !this.locked;
//     for (let i=0; i<this.freeChecks.length; i++) {
//       if (this.freeChecks[i].reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object)) {
//         this.free = false;
//         break;
//       }
//     }

//     if (this.anim==null) { this.free = false; }

//     if (this.free) { // Update last update time
//       if (cg.clock-this.lastUpdate>object.ChoreoGraph.settings.inactiveTime) {
//         this.stt = this.stt + (cg.clock-this.lastUpdate);
//         this.ent = this.ent + (cg.clock-this.lastUpdate);
//       }
//       this.lastUpdate = cg.clock;
//     } else if (this.anim!=null&&typeof(this.anim.data[this.part][0])!="number") {
//       this.passAllTriggers(object,0);
//     }

//     if (cg.clock<this.ent&&this.free) { // If animation is running
//       this.fprog = 1-((this.ent-cg.clock)/(this.ent-this.stt));
//       if (this.ease!="linear") { // A to Z = Least Intense to Most Intense
//         if (this.ease=="inoutA") {
//           this.fprog = (this.fprog**2)*(3-2*this.fprog);
//         } else if (this.ease=="inoutB") {
//           this.fprog = (this.fprog**2)/(2*((this.fprog**2)-this.fprog)+1);
//         } else if (this.ease=="inA") {
//           this.fprog = -Math.sin(this.fprog*(Math.PI/2)-1.5*Math.PI)+1;
//         } else if (this.ease=="inB") {
//           this.fprog = this.fprog**3;
//         } else if (this.ease=="inC") {
//           this.fprog = this.fprog**4;
//         } else if (this.ease=="outA") {
//           this.fprog = Math.sin(this.fprog*(Math.PI/2));
//         } else if (this.ease=="outB") {
//           this.fprog = -((1-this.fprog)**3)+1;
//         } else if (this.ease=="outC") {
//           this.fprog = -((1-this.fprog)**5)+1;
//         }
//       }
//       this.updateValues(object);
//     } else if (this.free) {
//       if (this.part>=this.anim.data.length-1) { // if part is last of animation
//         let lastAnimid = this.anim.id;
//         let lastAnimKeys = JSON.stringify(this.anim.keys);
//         this.anim.inUse = false;
//         if (this.anim.endCallback) { this.anim.endCallback(object,this); }
//         if (this.selfDestructObject||this.selfDestructAnimator||this.selfDestructAnimation) {
//           if (this.selfDestructAnimation) {
//             ChoreoGraph.releaseId(lastAnimid.replace("anim_",""));
//             delete object.ChoreoGraph.animations[lastAnimid];
//           }
//           if (this.selfDestructObject) {
//             object.delete = true;
//           } else if (this.selfDestructAnimator) {
//             if (this.manifest.keyOverride == "") {
//               delete object[this.manifest.title];
//             } else {
//               delete object[this.manifest.keyOverride];
//             }
//             delete object.components[this.id];
//             ChoreoGraph.releaseId(this.id.replace("comp_",""));
//           }
//           return;
//         }
//         this.part = 0;
//         if (this.anim!=null) {
//           this.anim.inUse = true;
//           if (JSON.stringify(this.anim.keys)!=lastAnimKeys) { this.to = null; }
//           if (this.anim.startCallback) { this.anim.startCallback(object,this); }
//         } else {
//           return;
//         }
//       } else {
//         this.part++;
//       }
//       if (this.to==null) { // if this is the first time the animation is running
//         this.from = this.anim.data[0];
//         this.part = 1;
//       } else {
//         this.from = this.to;
//         this.timeDebt = cg.clock-this.ent;
//       }
//       if (this.anim.duration==0) { this.timeDebt = 0; }
//       // if (this.timeDebt>200) { this.timeDebt = 0; } // Pay off time debt for stuck objects
//       let passTrigger = this.passAllTriggers(object,1);
//       if (this.part<this.anim.data.length&&passTrigger) {
//         this.to = this.anim.data[this.part];
//         this.stt = cg.clock;
//         this.ent = this.stt + (this.anim.data[this.part][this.anim.timeKey]*1000)/this.speed - this.timeDebt;
//         this.fprog = 0;
//       }
//       this.updateValues(object);
//     }
//   }
//   updateValues(object) {
//     for (let i=0; i<this.anim.keys.length; i++) {
//       if (this.anim.keys[i]=="time"||this.anim.keys[i]==null) { continue; }
//       let lerpedValue;
//       if (typeof this.from[i] == "number") {
//         lerpedValue = this.from[i] + this.fprog*(this.to[i]-this.from[i]);
//       } else {
//         lerpedValue = this.from[i];
//       }
//       this.anim.keys[i].reduce((acc, key, index, array) => {
//         if (index === array.length - 1) {
//           acc[key] = lerpedValue;
//         }
//         return acc[key];
//       }, object);
//     }
//   }
//   passAllTriggers(object,triggerSequence) {
//     while (typeof(this.anim.data[this.part][0])!="number") {
//       let triggerType = this.anim.data[this.part][0].toUpperCase();
//       let passTrigger = false;
//       if (triggerType in this.triggerCallbacks) {
//         passTrigger = this.triggerCallbacks[triggerType](object,this,this.anim.data[this.part]);
//       } else {
//         console.warn(`Trigger type: ${triggerType} is not a valid trigger`);
//         passTrigger = true;
//       }
//       if (passTrigger) {
//         this.part++;
//       } else {
//         return false;
//       }
//     }
//     if (triggerSequence==0) { this.part--; }
//     return true;
//   }
//   defaultTriggerCallbacks(object,Animator,trigger) {
//     let triggerType = trigger[0].toUpperCase();
//     let triggerValue = trigger[1];
//     if (triggerType=="S") { // S - Set Speed
//       Animator.speed = triggerValue;
//     } else if (triggerType=="E") { // E - Change Ease
//       Animator.ease = triggerValue;
//     } else if (triggerType=="C") { // C - Evaluate Code
//       eval(triggerValue);
//     } else if (triggerType=="V") { // V - Set Object Value
//       triggerValue.reduce((acc, key, index, array) => {
//         if (index === array.length - 1) {
//           acc[key] = trigger[2];
//         }
//         return acc[key];
//       }, object);
//     }
//     return true;
//   }
//   reset() {
//     this.part = 0;
//     this.stt = 0;
//     this.ent = 0;
//     this.timeDebt = 0;
//     this.to = null;
//     this.from = null;
//   }
//   collapse() {
//     if (this.deleteAnimationOnCollapse&&this.anim!=undefined) {
//       ChoreoGraph.releaseId(this.anim.id.replace("anim_",""));
//       delete this.anim.ChoreoGraph.graphics[this.anim.id];
//     }
//   }
// };