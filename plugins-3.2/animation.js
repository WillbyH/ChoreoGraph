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
        },

        path : {
          downPos : [0,0],
          savedControlA : [0,0],
          savedControlB : [0,0],
          savedPairControlA : [0,0],
          savedPairControlB : [0,0],
          grabbing : false,
          grabData : {
            type : null, // curve joint control disconnected linear

            // CURVE
            mainSegment : null, // The segment the curve belongs to
            savedMainControlA : [0,0],
            savedMainControlB : [0,0],
            beforeControlB : null, // The B control on the before segment
            savedBeforeControlB : [0,0],
            afterControlA : null, // The A control on the after segment
            savedAfterControlA : [0,0],
            startTangent : null, // The tangent relating to the start
            endTangent : null, // The tangent relating to the end

            // JOINT
            controlA : null, // The control point later in the spline
            savedControlA : [0,0],
            controlB : null, // The control point earlier in the spline
            savedControlB : [0,0],

            // CONTROL
            mainControl : null, // The control point that is being moved
            pairControl : null, // The control point that is connected to the same joint
            distance : 0, // The distance between the pair control point and the joint

            // JOINT & CONTROL
            tangent : null, // The tangent type of the joint or connected joint

            // DISCONNECTED
            control : null, // The singular control point connected to the joint
            savedControl : [0,0],

            // LINEAR & JOINT & CONTROL & DISCONNECTED
            joint : null, // The related joint
          },
          grabbedType : null,
          grabbedSegment : null,
          grabbablePoints : [],
          grabbedPair : null,
          grabbedPairDistance : 0
        }
      };
    };

    Animation = class cgAnimation {
      data = [];
      tracks = [];
      createTrack(trackType) {
        let newTrack = new ChoreoGraph.Animation.TrackTypes[trackType]();
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
        
        pack() {
          return "spliiiinedata";
        };

        info() {
          return this.segments.length+" segments";
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

    TANGENT_BROKEN = "broken";
    TANGENT_ALIGNED = "aligned";
    TANGENT_MIRRORED = "mirrored";

    SplineSegment = class SplineSegment {
      start = [0,0];
      tangent = ChoreoGraph.Animation.TANGENT_BROKEN;
      linear = true;
      controlA = [0,0];
      controlB = [0,0];
      end = [0,0];
      before = null;
      after = null;
      connected = false;
      triggers = {};
  
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
      }
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
        // GRABBING
        if (editor.path.grabbing) {
          let segment = editor.path.grabbedSegment;
          if (["start","end","controlA","controlB"].includes(editor.path.grabbedType)) {
            segment[editor.path.grabbedType][0] = cg.Input.cursor.x;
            segment[editor.path.grabbedType][1] = cg.Input.cursor.y;
            if ((editor.path.grabbedType=="controlA"||editor.path.grabbedType=="controlB")&&editor.path.grabbedPair!=null) {
              let tangentPair, tangentType, joint, control;
              if (editor.path.grabbedType=="controlA") {
                tangentPair = editor.path.grabbedPair.controlB;
                tangentType = editor.path.grabbedSegment.tangent;
                joint = editor.path.grabbedSegment.start;
                control = editor.path.grabbedSegment.controlA;
              } else if (editor.path.grabbedType=="controlB") {
                tangentPair = editor.path.grabbedPair.controlA;
                tangentType = editor.path.grabbedPair.tangent;
                joint = editor.path.grabbedSegment.end;
                control = editor.path.grabbedSegment.controlB;
              }
              let distance = 0;
              if (tangentType==ChoreoGraph.Animation.TANGENT_ALIGNED) {
                distance = editor.path.grabbedPairDistance;
              } else if (tangentType==ChoreoGraph.Animation.TANGENT_MIRRORED) {
                distance = Math.sqrt((control[0]-joint[0])**2+(control[1]-joint[1])**2);;
              }
              if (tangentType!=ChoreoGraph.Animation.TANGENT_BROKEN) {
                let angle = -Math.atan2(control[0]-joint[0],control[1]-joint[1]);
                angle -= Math.PI/2;
                tangentPair[0] = joint[0] + distance*Math.cos(angle);
                tangentPair[1] = joint[1] + distance*Math.sin(angle);
              }
            } else if (editor.path.grabbedPair!=null) {
              let controlA, controlB;
              if (editor.path.grabbedType=="start") {
                controlA = editor.path.grabbedSegment.controlA;
                controlB = editor.path.grabbedPair.controlB;
              } else if (editor.path.grabbedType=="end") {
                controlA = editor.path.grabbedPair.controlA;
                controlB = editor.path.grabbedSegment.controlB;
              };
              controlA[0] = editor.path.savedControlA[0] + cg.Input.cursor.x - editor.path.downPos[0];
              controlA[1] = editor.path.savedControlA[1] + cg.Input.cursor.y - editor.path.downPos[1];
              controlB[0] = editor.path.savedControlB[0] + cg.Input.cursor.x - editor.path.downPos[0];
              controlB[1] = editor.path.savedControlB[1] + cg.Input.cursor.y - editor.path.downPos[1];
            } else if (editor.path.grabbedType=="start"||editor.path.grabbedType=="end") {
              // Unconnected start or end
              let control, saved;
              if (editor.path.grabbedType=="start") {
                control = editor.path.grabbedSegment.controlA;
                saved = editor.path.savedControlA;
              } else if (editor.path.grabbedType=="end") {
                control = editor.path.grabbedSegment.controlB;
                saved = editor.path.savedControlB;
              }
              control[0] = saved[0] + cg.Input.cursor.x - editor.path.downPos[0];
              control[1] = saved[1] + cg.Input.cursor.y - editor.path.downPos[1];
            };
          } else if (editor.path.grabbedType=="curve") {
            let offset = [cg.Input.cursor.x-editor.path.downPos[0],cg.Input.cursor.y-editor.path.downPos[1]];
            let savedA = editor.path.savedControlA;
            let savedB = editor.path.savedControlB;
            segment.linear = false;
            segment.controlA = [savedA[0]+offset[0]*1.32,savedA[1]+offset[1]*1.32];
            segment.controlB = [savedB[0]+offset[0]*1.32,savedB[1]+offset[1]*1.32];
            let pairControlB, pairControlA;
            if (segment.before!=null&&segment.after!=null) {
              pairControlB = segment.after.controlA;
              pairControlA = segment.before.controlB;
            } else if (segment.before!=null) {
              pairControlB = segment.before.controlB;
              pairControlA = [0,0];
            } else if (segment.after!=null) {
              pairControlB = [0,0];
              pairControlA = segment.after.controlA;
            }
            pairControlA[0] = editor.path.savedPairControlA[0] + offset[0];
            pairControlA[1] = editor.path.savedPairControlA[1] + offset[1];
            pairControlB[0] = editor.path.savedPairControlB[0] + offset[0];
            pairControlB[1] = editor.path.savedPairControlB[1] + offset[1];
          }
        };
        // CURSOR DOWN
        if (cg.Input.cursor.impulseDown.any) {
          if (editor.animation==null) { return; }
          if (track.segments.length==0) {
            editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];
          } else if (ChoreoGraph.Input.keyStates[hotkeys.pathAdd]) {
            let segment = new ChoreoGraph.Animation.SplineSegment();
            segment.start = track.segments[track.segments.length-1].end;
            segment.end = [cg.Input.cursor.x,cg.Input.cursor.y];
            track.segments[track.segments.length-1].after = segment;
            segment.before = track.segments[track.segments.length-1];
            track.segments[track.segments.length-1].connected = true;
            track.segments.push(segment);
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          } else if (ChoreoGraph.Input.keyStates[hotkeys.pathGrab]||ChoreoGraph.Input.keyStates[hotkeys.pathChangeTangentType]) {
            let closestIndex = -1;
            let closestDistance = Infinity;
            for (let i=0;i<editor.path.grabbablePoints.length;i++) {
              let grabbablePoint = editor.path.grabbablePoints[i];
              let point = grabbablePoint.point;
              let distance = Math.sqrt((cg.Input.cursor.x-point[0])**2+(cg.Input.cursor.y-point[1])**2);
              if (distance<closestDistance&&distance<cg.settings.animation.editor.grabDistance) {
                closestDistance = distance;
                closestIndex = i;
              }
            }
            if (closestIndex!=-1) {
              let grabbablePoint = editor.path.grabbablePoints[closestIndex];
              let segment = grabbablePoint.segment;
              // SET GRAB DATA
              if (ChoreoGraph.Input.keyStates[hotkeys.pathGrab]) {
                editor.path.grabbing = true;
                let grabData = editor.path.grabData;

                if (grabbablePoint.type=="controlA"||grabbablePoint.type=="controlB") {
                  grabData.type = "control";
                } else if (grabbablePoint.type=="start"||grabbablePoint.type=="end") {
                  if (grabbablePoint.segment.linear) {
                    grabData.type = "linear";
                  } else {
                    grabData.type = "joint";
                  }
                } else if (grabbablePoint.type=="curve") {
                  grabData.type = "curve";
                }

                if (grabData.type=="curve") {
                  grabData.mainSegment = segment;
                  grabData.savedMainControlA = Array.from(segment.controlA);
                  grabData.savedMainControlB = Array.from(segment.controlB);
                  grabData.startTangent = null;
                  grabData.endTangent = null;
                  if (segment.before!=null) {
                    grabData.beforeControlB = segment.before.controlB;
                    grabData.savedBeforeControlB = Array.from(segment.before.controlB);
                    grabData.startTangent = segment.tangent;
                  }
                  if (segment.after!=null) {
                    grabData.afterControlA = segment.after.controlA;
                    grabData.savedAfterControlA = Array.from(segment.after.controlA);
                    grabData.endTangent = segment.after.tangent;
                  }
                } else if (grabData.type=="joint") {
                  
                }

                editor.path.grabbedType = grabbablePoint.type;
                editor.path.grabbedSegment = segment;
                editor.path.grabbedPair = grabbablePoint.pair || null;
                if (editor.path.grabbedType=="controlA"&&editor.path.grabbedPair!=null) {
                  let pairControl = editor.path.grabbedPair.controlB;
                  let pairJoint = editor.path.grabbedPair.end;
                  let distance = Math.sqrt((pairControl[0]-pairJoint[0])**2+(pairControl[1]-pairJoint[1])**2);
                  if (editor.path.grabbedPair.linear) { distance = 0; }
                  editor.path.grabbedPairDistance = distance;
                } else if (editor.path.grabbedType=="controlB"&&editor.path.grabbedPair!=null) {
                  let pairControl = editor.path.grabbedPair.controlA;
                  let pairJoint = editor.path.grabbedPair.start;
                  let distance = Math.sqrt((pairControl[0]-pairJoint[0])**2+(pairControl[1]-pairJoint[1])**2);
                  if (editor.path.grabbedPair.linear) { distance = 0; }
                  editor.path.grabbedPairDistance = distance;
                }
                if (grabbablePoint.type=="curve") {
                  editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];
                } else {
                  editor.path.downPos = Array.from(segment[grabbablePoint.type]);
                }
                if (grabbablePoint.type=="controlA"||grabbablePoint.type=="controlB") {
                  editor.path.savedControlA = Array.from(segment.controlA);
                  editor.path.savedControlB = Array.from(segment.controlB);
                } else if (grabbablePoint.type=="start") {
                  editor.path.savedControlA = Array.from(segment.controlA);
                  if (grabbablePoint.pair==null) {
                    editor.path.savedControlB = [0,0];
                  } else {
                    editor.path.savedControlB = Array.from(grabbablePoint.pair.controlB);
                  }
                } else if (grabbablePoint.type=="end") {
                  if (grabbablePoint.pair==null) {
                    editor.path.savedControlB = [0,0];
                  } else {
                    editor.path.savedControlA = Array.from(grabbablePoint.pair.controlA);
                  }
                  editor.path.savedControlB = Array.from(segment.controlB);
                } else if (grabbablePoint.type=="curve") {
                  editor.path.savedControlA = Array.from(segment.controlA);
                  editor.path.savedControlB = Array.from(segment.controlB);
                  if (segment.before!=null&&segment.after!=null) {
                    editor.path.savedPairControlA = Array.from(segment.after.controlA);
                    editor.path.savedPairControlB = Array.from(segment.before.controlB);
                  } else if (segment.before!=null) {
                    editor.path.savedPairControlB = Array.from(segment.before.controlB);
                    editor.path.savedPairControlA = [0,0];
                  } else if (segment.after!=null) {
                    editor.path.savedPairControlB = [0,0];
                    editor.path.savedPairControlA = Array.from(segment.after.controlA);
                  }
                }
                if (segment.linear) {
                  editor.path.savedControlA = Array.from(segment.start);
                  editor.path.savedControlB = Array.from(segment.end); 
                }
                // CHANGE TANGENT TYPE
              } else if (ChoreoGraph.Input.keyStates[hotkeys.pathChangeTangentType]) {
                if (grabbablePoint.type=="start"||grabbablePoint.type=="end") {
                  if (segment.tangent==ChoreoGraph.Animation.TANGENT_BROKEN) {
                    segment.tangent = ChoreoGraph.Animation.TANGENT_ALIGNED;
                  } else if (segment.tangent==ChoreoGraph.Animation.TANGENT_ALIGNED) {
                    segment.tangent = ChoreoGraph.Animation.TANGENT_MIRRORED;
                  } else if (segment.tangent==ChoreoGraph.Animation.TANGENT_MIRRORED) {
                    segment.tangent = ChoreoGraph.Animation.TANGENT_BROKEN;
                  }
                }
              }
            }
          }
        };
        // CURSOR UP
        if (cg.Input.cursor.impulseUp.any) {
          if (editor.animation==null) { return; }
          if (track.segments.length==0&&ChoreoGraph.Input.keyStates[hotkeys.pathAdd]) {
            let segment = new ChoreoGraph.Animation.SplineSegment();
            segment.start = editor.path.downPos;
            segment.end = [cg.Input.cursor.x,cg.Input.cursor.y];
            track.segments.push(segment);
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          }
          if (editor.path.grabbing) {
            editor.path.grabbing = false;
          }
        };
        if (ChoreoGraph.Input.lastKeyDownFrame==ChoreoGraph.frame) {
          if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathUndo) {
            track.segments.pop();
            // This needs to be replaced because simply popping is not the same as an undo
            ChoreoGraph.Animation.updateAnimationOverview(cg);
          }
        };
      }
    };

    overlayEditor(cg) {
      if (cg.Input===undefined) { return; }
      let editor = cg.Animation.editor;
      let c = cg.Input.cursor.canvas.c;
      // if (editor.animation!=null) {
      //   c.fillStyle = "white";
      //   c.font = "12px sans-serif";
      //   c.fillText(editor.animation.id, 100, 100);
      // }
      let track = editor.track;
      if (track==null) { return; }
      let lineWidth = 2;
      c.lineWidth = lineWidth;
      if (track.type=="path") {
        editor.path.grabbablePoints = [];
        let line = [];
        let joints = [];
        let controls = [];
        let curveGrabs = [];
        for (let segment of track.segments) {
          let tangent = segment.tangent;
          if (segment.before==null) {
            tangent = ChoreoGraph.Animation.TANGENT_BROKEN;
          }
          joints.push({tangent:tangent,point:segment.start});
          editor.path.grabbablePoints.push({type:"start",pair:segment.before,segment:segment,point:segment.start});

          if (segment.connected) {
            if (segment.linear==false) { controls.push({joint:segment.after.start,point:segment.controlB}); }
          } else {
            let tangent = segment.tangent;
            if (segment.after==null) {
              tangent = ChoreoGraph.Animation.TANGENT_BROKEN;
            } else {
              tangent = segment.after.tangent;
            }
            joints.push({tangent:tangent,point:segment.end});
            if (segment.linear==false) {controls.push({joint:segment.end,point:segment.controlB}); }
            if (segment.after==null) {
              editor.path.grabbablePoints.push({type:"end",pair:segment.after,segment:segment,point:segment.end});
            }
          }

          if (segment.linear==false) {
            for (let i=0;i<50;i++) {
              line.push(segment.getPoint(i/50));
            }
            controls.push({joint:segment.start,point:segment.controlA});
            editor.path.grabbablePoints.push({type:"controlA",segment:segment,pair:segment.before,point:segment.controlA});
            editor.path.grabbablePoints.push({type:"controlB",segment:segment,pair:segment.after,point:segment.controlB});
          } else {
            line.push(segment.start);
            if (segment.connected) {
              line.push(segment.after.start);
            } else {
              line.push(segment.end);
            }
          }

          curveGrabs.push(segment.getPoint(0.5));
          editor.path.grabbablePoints.push({type:"curve",segment:segment,point:segment.getPoint(0.5)});
        };
        // CONTROL LINES
        c.strokeStyle = "cyan";
        c.lineWidth = lineWidth/2;
        c.beginPath();
        for (let control of controls) {
          let point = control.point;
          c.moveTo(control.joint[0],control.joint[1]);
          c.lineTo(point[0],point[1]);
        }
        c.stroke();
        // LINE
        c.lineWidth = lineWidth;
        c.strokeStyle = "white";
        c.beginPath();
        for (let point of line) {
          c.lineTo(point[0],point[1]);
        }
        c.stroke();
        // JOINTS
        for (let joint of joints) {
          let point = joint.point;
          let tangent = joint.tangent;
          if (tangent==ChoreoGraph.Animation.TANGENT_BROKEN) {
            c.fillStyle = "magenta";
          } else if (tangent==ChoreoGraph.Animation.TANGENT_ALIGNED) {
            c.fillStyle = "cyan";
          } else if (tangent==ChoreoGraph.Animation.TANGENT_MIRRORED) {
            c.fillStyle = "black";
          }
          c.beginPath();
          c.moveTo(point[0]-5,point[1]);
          c.arc(point[0],point[1],5,0,2*Math.PI);
          c.fill();
        }
        // CONTROL POINTS
        c.strokeStyle = "blue";
        c.beginPath();
        for (let control of controls) {
          let point = control.point;
          c.moveTo(point[0]+5,point[1]);
          c.arc(point[0],point[1],5,0,2*Math.PI);
        }
        c.stroke();
        c.strokeStyle = "green";
        c.beginPath();
        for (let point of curveGrabs) {
          c.moveTo(point[0]+5,point[1]);
          c.arc(point[0],point[1],5,0,2*Math.PI);
        }
        c.stroke();

        for (let grabbablePoint of editor.path.grabbablePoints) {
          let point = grabbablePoint.point;
          let distance = Math.sqrt((cg.Input.cursor.x-point[0])**2+(cg.Input.cursor.y-point[1])**2);
          c.beginPath();
          if (distance<cg.settings.animation.editor.grabDistance) {
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

      // ADD PATH TRACK BUTTON
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
        ChoreoGraph.Animation.updateAnimationOverview(cg);
      }
      section.appendChild(addPathTrackButton);

      // ANIMATION INFORMATION
      let animationInformation = document.createElement("div");
      cg.Animation.editor.ui.animationInformation = animationInformation;
      section.appendChild(animationInformation);
      this.updateAnimationOverview(cg);

      section.appendChild(document.createElement("hr"));
    };

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
        grabDistance : 30,
        hotkeys : {
          pathUndo : "z",
          pathAdd : "a",
          pathGrab : "g",
          pathDelete : "x",
          pathInsert : "q",
          pathChangeTangentType : "t"
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