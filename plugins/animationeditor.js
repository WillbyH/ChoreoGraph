ChoreoGraph.plugin({
  name : "AnimationEditor",
  key : "AnimationEditor",
  version : "1.0",

  globalPackage : new class cgAnimationEditorPackage {
    InstanceObject = class cgAnimationEditorInstancePackage {

      initInterface = false;
      animation = null;
      track = null;
      autobake = false;
      preventUndoRedo = false;
      undoStack = [];
      redoStack = [];
      lastPack = null;

      ui = {
        section : null,
        dropdown : null,
        trackTypeDropdown : null,
        animationInformation : null,
        addTrackButton : null,
        trackContext : null,
        pathActionButtons : {},
        connectedToggle : null,
        tangentDropdown : null,
        dopeSheetCanvasContainer : null,
        keyEditing : null,
        dopeSheetUI : null
      };

      path = {
        actionType : "grab",
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
        }
      };

      TANGENT_BROKEN = "broken";
      TANGENT_ALIGNED = "aligned";
      TANGENT_MIRRORED = "mirrored";

      GRAB_CURVE = "curve";
      GRAB_JOINT = "joint";
      GRAB_CONTROL = "control";
      GRAB_DISCONNECTED = "disconnected";
      GRAB_LINEAR = "linear";

      ACTION_ADD = "add";
      ACTION_GRAB = "grab";
      ACTION_DELETE = "delete";
      ACTION_INSERT = "insert";
    };

    processEditor(cg) {
      if (ChoreoGraph.Develop.cg.id!==cg.id) { return; }
      if (cg.Input===undefined) { console.warn("Animation editor requires Input plugin"); return; }
      if (!cg.settings.animationeditor.active) { return; }
      let editor = cg.AnimationEditor;
      let hotkeys = cg.settings.animationeditor.hotkeys;
      if (editor.initInterface==false) {
        editor.initInterface = true;
        ChoreoGraph.AnimationEditor.generateInterface(cg);
      }
      let track = editor.track;
      if (track==null) { return; }
      if (track.type=="path") {
        let actionType = editor.path.actionType;

        const snapX = function snapEditorPointX(x,cg,ignoreOffset=false) {
          let gridSize = cg.settings.animationeditor.snapGridSize;
          let offset = cg.settings.animationeditor.snapGridOffsetX;
          if (ignoreOffset) { offset = 0; }
          let snappedX = Math.round((x+offset)/gridSize)*gridSize - offset;
          return snappedX;
        };
        const snapY = function snapEditorPointY(y,cg,ignoreOffset=false) {
          let gridSize = cg.settings.animationeditor.snapGridSize;
          let offset = cg.settings.animationeditor.snapGridOffsetY;
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

          if (grabData.type==editor.GRAB_CURVE) {
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
            main.controlA[0] = snapX(grabData.savedMainControlA[0] + offset[0]*1.328,cg);
            main.controlA[1] = snapY(grabData.savedMainControlA[1] + offset[1]*1.328,cg);
            main.controlB[0] = snapX(grabData.savedMainControlB[0] + offset[0]*1.328,cg);
            main.controlB[1] = snapY(grabData.savedMainControlB[1] + offset[1]*1.328,cg);
            if (editor.path.selectedTangentType==editor.TANGENT_ALIGNED) {
              if (grabData.beforeControlB!=null) {
                alignTangent(grabData.beforeControlB,main.controlA,main.start,grabData.beforeDistance);
              }
              if (grabData.afterControlA!=null) {
                alignTangent(grabData.afterControlA,main.controlB,main.end,grabData.afterDistance);
              }
            } else if (editor.path.selectedTangentType==editor.TANGENT_MIRRORED) {
              if (grabData.beforeControlB!=null) {
                mirrorTangent(grabData.beforeControlB,main.controlA,main.start);
              }
              if (grabData.afterControlA!=null) {
                mirrorTangent(grabData.afterControlA,main.controlB,main.end);
              }
            }
            if (update) { ChoreoGraph.AnimationEditor.updateAnimationOverview(cg); }

          } else if (grabData.type==editor.GRAB_JOINT) {
            grabData.joint[0] = snapX(cg.Input.cursor.x,cg);
            grabData.joint[1] = snapY(cg.Input.cursor.y,cg);
            grabData.controlA[0] = grabData.savedControlA[0] + offset[0];
            grabData.controlA[1] = grabData.savedControlA[1] + offset[1];
            grabData.controlB[0] = grabData.savedControlB[0] + offset[0];
            grabData.controlB[1] = grabData.savedControlB[1] + offset[1];

          } else if (grabData.type==editor.GRAB_CONTROL) {
            grabData.mainControl[0] = snapX(cg.Input.cursor.x,cg);
            grabData.mainControl[1] = snapY(cg.Input.cursor.y,cg);
            if (grabData.pairControl!=null) {
              if (editor.path.selectedTangentType==editor.TANGENT_ALIGNED) {
                alignTangent(grabData.pairControl,grabData.mainControl,grabData.joint,grabData.distance);
              } else if (editor.path.selectedTangentType==editor.TANGENT_MIRRORED) {
                mirrorTangent(grabData.pairControl,grabData.mainControl,grabData.joint);
              }
            }

          } else if (grabData.type==editor.GRAB_DISCONNECTED) {
            grabData.joint[0] = snapX(cg.Input.cursor.x,cg);
            grabData.joint[1] = snapY(cg.Input.cursor.y,cg);
            grabData.control[0] = grabData.savedControl[0] + offset[0];
            grabData.control[1] = grabData.savedControl[1] + offset[1];

          } else if (grabData.type==editor.GRAB_LINEAR) {
            grabData.joint[0] = snapX(cg.Input.cursor.x,cg);
            grabData.joint[1] = snapY(cg.Input.cursor.y,cg);
          }
        };
        // CURSOR DOWN
        if (cg.Input.cursor.impulseDown.any) {
          if (editor.animation==null) { return; }
          if ((editor.path.connectedMode==false||track.segments.length==0)&&actionType==editor.ACTION_ADD) {
            editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];

          // ADD NEW SEGMENT
          } else if (actionType==editor.ACTION_ADD&&editor.path.connectedMode&&track.segments.length>0&&ChoreoGraph.Input.keyStates.shift==false) {
            let newSegment = new ChoreoGraph.Animation.SplineSegment();
            newSegment.start = track.segments[track.segments.length-1].end;
            newSegment.end = [snapX(cg.Input.cursor.x,cg),snapY(cg.Input.cursor.y,cg)];
            track.segments[track.segments.length-1].after = newSegment;
            newSegment.before = track.segments[track.segments.length-1];
            track.segments[track.segments.length-1].connected = true;
            track.segments.push(newSegment);
            ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);

          // MODIFICATION
          } else if (actionType!=editor.ACTION_ADD) {
            let closestIndex = -1;
            let closestDistance = Infinity;
            let grabDistance = cg.settings.animationeditor.grabDistance * cg.settings.core.debugCGScale / cg.Input.cursor.canvas.camera.z;
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
              if (actionType==editor.ACTION_GRAB) {
                editor.path.grabbing = true;
                let grabData = editor.path.grabData;

                // Find Grab Type
                if (grabbablePoint.type=="controlA"||grabbablePoint.type=="controlB") {
                  grabData.type = editor.GRAB_CONTROL;
                } else if (grabbablePoint.type=="end") {
                  grabData.type = editor.GRAB_DISCONNECTED;
                } else if (grabbablePoint.type=="curve") {
                  grabData.type = editor.GRAB_CURVE;
                } else if (grabbablePoint.type=="start") {
                  let before = grabbablePoint.segment.before;
                  if (grabbablePoint.pair==null) {
                    grabData.type = editor.GRAB_DISCONNECTED;
                  } else if (grabbablePoint.segment.controlAEnabled&&before.controlBEnabled) {
                    grabData.type = editor.GRAB_JOINT;
                  } else if (
                    (!grabbablePoint.segment.controlAEnabled&&before.controlBEnabled)||(grabbablePoint.segment.controlAEnabled&&!before.controlBEnabled)) {
                    grabData.type = editor.GRAB_DISCONNECTED;
                  } else {
                    grabData.type = editor.GRAB_LINEAR;
                  }
                }

                if (grabData.type=="curve") {
                  editor.path.downPos = [cg.Input.cursor.x,cg.Input.cursor.y];
                } else {
                  editor.path.downPos = Array.from(segment[grabbablePoint.type]);
                }

                // Collect Grab Type Data
                if (grabData.type==editor.GRAB_CURVE) {
                  grabData.mainSegment = segment;
                  grabData.savedMainControlA = Array.from(segment.controlA);
                  grabData.savedMainControlB = Array.from(segment.controlB);
                  grabData.beforeControlB = null;
                  grabData.afterControlA = null;
                  if (segment.before!=null&&segment.before.controlBEnabled) {
                    grabData.beforeControlB = segment.before.controlB;
                    if (editor.path.selectedTangentType==editor.TANGENT_ALIGNED) {
                      grabData.beforeDistance = Math.sqrt((grabData.beforeControlB[0]-segment.start[0])**2+(grabData.beforeControlB[1]-segment.start[1])**2);
                    }
                  }
                  if (segment.after!=null&&segment.after.controlAEnabled) {
                    grabData.afterControlA = segment.after.controlA;
                    if (editor.path.selectedTangentType==editor.TANGENT_ALIGNED) {
                      grabData.afterDistance = Math.sqrt((grabData.afterControlA[0]-segment.end[0])**2+(grabData.afterControlA[1]-segment.end[1])**2);
                    }
                  }

                } else if (grabData.type==editor.GRAB_JOINT) {
                  // You can assume the point type is always a start
                  grabData.controlA = segment.controlA;
                  grabData.savedControlA = Array.from(segment.controlA);
                  grabData.controlB = grabbablePoint.pair.controlB;
                  grabData.savedControlB = Array.from(grabbablePoint.pair.controlB);
                  grabData.joint = segment.start;

                } else if (grabData.type==editor.GRAB_CONTROL) {
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

                } else if (grabData.type==editor.GRAB_DISCONNECTED) {
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

                } else if (grabData.type==editor.GRAB_LINEAR) {
                  if (grabbablePoint.type=="start") {
                    grabData.joint = segment.start;
                  } else {
                    grabData.joint = segment.end;
                  }
                }

              // DELETE
              } else if (actionType==editor.ACTION_DELETE) {
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
                ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);

              // INSERT
              } else if (actionType==editor.ACTION_INSERT) {
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

                  ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
                }
              }
            }
          }
        };
        // CURSOR UP
        if (cg.Input.cursor.impulseUp.any) {
          if (editor.animation==null) { return; }
          // ADD DISCONNECTED DRAGGED SEGMENT
          if (actionType==editor.ACTION_ADD&&(editor.path.connectedMode==false||track.segments.length==0)) {
            let segment = new ChoreoGraph.Animation.SplineSegment();
            segment.start = [snapX(editor.path.downPos[0],cg),snapY(editor.path.downPos[1],cg)];
            segment.end = [snapX(cg.Input.cursor.x,cg),snapY(cg.Input.cursor.y,cg)];
            track.segments.push(segment);
            cg.AnimationEditor.ui.connectedToggle.activated = true;
            editor.path.connectedMode = true;
            ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
          } else if (editor.path.grabbing) {
            editor.path.grabbing = false;
            ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
          }
          cg.AnimationEditor.ui.connectedToggle.setStylesAndText();
        };
        if (ChoreoGraph.Input.lastKeyDownFrame==ChoreoGraph.frame) {
          if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathAdd) {
            editor.path.actionType = editor.ACTION_ADD;
            ChoreoGraph.AnimationEditor.updateTrackContext(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathGrab) {
            editor.path.actionType = editor.ACTION_GRAB;
            ChoreoGraph.AnimationEditor.updateTrackContext(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathDelete) {
            editor.path.actionType = editor.ACTION_DELETE;
            ChoreoGraph.AnimationEditor.updateTrackContext(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathInsert) {
            editor.path.actionType = editor.ACTION_INSERT;
            ChoreoGraph.AnimationEditor.updateTrackContext(cg);
          }
        };
      }
      if (ChoreoGraph.Input.lastKeyDownFrame==ChoreoGraph.frame) {
        if (ChoreoGraph.Input.lastKeyDown==hotkeys.undo) {
          ChoreoGraph.AnimationEditor.undo(cg);
        } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.redo) {
          ChoreoGraph.AnimationEditor.redo(cg);
        }
      }
    };

    overlayEditor(cg) {
      if (ChoreoGraph.Develop.cg.id!==cg.id) { return; }
      if (cg.Input===undefined) { return; }
      if (cg.Input.cursor.canvas.camera==null) { return; }
      ChoreoGraph.transformContext(cg.Input.cursor.canvas.camera);
      let editor = cg.AnimationEditor;
      let pathStyle = cg.settings.animationeditor.pathStyle;
      let c = cg.Input.cursor.canvas.c;
      let track = editor.track;
      if (track==null) { return; }
      let size = cg.settings.core.debugCGScale / cg.Input.cursor.canvas.camera.z;
      c.lineWidth = size*2;
      if (track.type=="path") {
        let actionType = editor.path.actionType;

        if (cg.AnimationEditor.path.actionType==editor.ACTION_ADD) {
          c.strokeStyle = "white";
          if (cg.Input.cursor.hold.any&&(cg.AnimationEditor.path.connectedMode==false||track.segments.length==0)) {
            c.beginPath();
            c.moveTo(editor.path.downPos[0],editor.path.downPos[1]);
            c.lineTo(cg.Input.cursor.x,cg.Input.cursor.y);
            c.stroke();
          } else if (cg.AnimationEditor.path.connectedMode&&track.segments.length>0) {
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

        if (actionType==editor.ACTION_GRAB||actionType==editor.ACTION_DELETE) {
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
        if (actionType==editor.ACTION_GRAB||actionType==editor.ACTION_DELETE) {
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
        if (actionType==editor.ACTION_GRAB||actionType==editor.ACTION_INSERT) {
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
      }
    };

    editorSelectAnimation(cg,animId,updateKeys=true) {
      let anim = cg.Animation.animations[animId];
      cg.AnimationEditor.animation = anim;
      if (anim.tracks.length>0) {
        cg.AnimationEditor.track = anim.tracks[0];
      } else {
        cg.AnimationEditor.track = null;
      }
      if (updateKeys) { this.updateKeyEditing(cg); }
      this.updateAnimationOverview(cg,false);
      this.updateTrackTypeAdding(cg);
      this.deselectDopeSheet(cg);
      this.updateDopeSheetUI(cg);
      this.updateTrackContext(cg);
    };

    generateInterface(cg) {
      let section = document.createElement("section");
      section.style.fontFamily = "sans-serif";
      ChoreoGraph.Develop.section.prepend(section);
      cg.AnimationEditor.ui.section = section;

      let header = document.createElement("header");
      header.innerHTML = "Animation Editor";
      header.style.fontWeight = "bold";
      section.append(header);

      // SELECTED ANIMATION DROPDOWN
      let dropdown = document.createElement("select");
      dropdown.cg = cg;
      cg.AnimationEditor.ui.dropdown = dropdown;
      dropdown.className = "develop_button";
      section.appendChild(dropdown);

      for (let animId of cg.keys.animations) {
        let anim = cg.Animation.animations[animId];
        let option = document.createElement("option");
        option.text = anim.id;
        dropdown.add(option);
      }
      dropdown.onchange = (e) => {
        ChoreoGraph.AnimationEditor.editorSelectAnimation(e.target.cg,e.target.value);
      }

      if (dropdown.value!="") {
        ChoreoGraph.AnimationEditor.editorSelectAnimation(cg,dropdown.value,false);
      }

      // CREATE NEW ANIMATION BUTTON
      let createNewButton = document.createElement("button");
      createNewButton.innerHTML = "Create New Animation";
      createNewButton.classList.add("develop_button");
      createNewButton.classList.add("btn_action");
      createNewButton.cg = cg;
      createNewButton.onclick = (e) => {
        let newAnim = e.target.cg.Animation.createAnimation({});
        ChoreoGraph.AnimationEditor.editorSelectAnimation(e.target.cg,newAnim.id);
        let option = document.createElement("option");
        option.text = newAnim.id;
        e.target.cg.AnimationEditor.ui.dropdown.add(option);
        e.target.cg.AnimationEditor.ui.dropdown.value = newAnim.id;

        if (cg.settings.animationeditor.template!=null) {
          newAnim.unpack(cg.settings.animationeditor.template,false);
        }

        ChoreoGraph.AnimationEditor.updateTrackTypeAdding(e.target.cg);
        ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        ChoreoGraph.AnimationEditor.updateDopeSheetUI(e.target.cg);
        ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
      }
      section.appendChild(createNewButton);

      let trackTypeAdding = document.createElement("div");
      trackTypeAdding.style.display = "inline-block";
      cg.AnimationEditor.ui.trackTypeAdding = trackTypeAdding;
      section.appendChild(trackTypeAdding);

      if (cg.AnimationEditor.animation!==null) {
        ChoreoGraph.AnimationEditor.updateTrackTypeAdding(cg);
      }

      // UNDO BUTTON
      let undoButton = document.createElement("button");
      undoButton.innerHTML = "Undo";
      undoButton.classList.add("develop_button");
      undoButton.classList.add("btn_action");
      undoButton.cg = cg;
      undoButton.onclick = (e) => {
        ChoreoGraph.AnimationEditor.undo(e.target.cg);
      }
      section.appendChild(undoButton);

      // REDO BUTTON
      let redoButton = document.createElement("button");
      redoButton.innerHTML = "Redo";
      redoButton.classList.add("develop_button");
      redoButton.classList.add("btn_action");
      redoButton.cg = cg;
      redoButton.onclick = (e) => {
        ChoreoGraph.AnimationEditor.redo(e.target.cg);
      }
      section.appendChild(redoButton);

      cg.AnimationEditor.ui.autobakeToggle = new ChoreoGraph.Develop.UIToggleButton({
        activeText : "Autobake On",
        inactiveText : "Autobake Off",
        onActive : (cg) => { cg.AnimationEditor.autobake = true; },
        onInactive : (cg) => { cg.AnimationEditor.autobake = false; }
      },cg);

      // TRACK CONTEXT BUTTONS
      let trackContext = document.createElement("div");
      trackContext.style.display = "inline-block";
      cg.AnimationEditor.ui.trackContext = trackContext;
      section.appendChild(trackContext);
      ChoreoGraph.AnimationEditor.updateTrackContext(cg);

      // TRACK SELECTION
      let trackSelection = document.createElement("div");
      cg.AnimationEditor.ui.trackSelection = trackSelection;
      section.appendChild(trackSelection);

      // DOPESHEET UI
      let dopeSheetUI = document.createElement("div");
      section.appendChild(dopeSheetUI);
      cg.AnimationEditor.ui.dopeSheetUI = dopeSheetUI;

      // DOPESHEET
      let dopesheet = ChoreoGraph.AnimationEditor.createDopeSheet(cg);
      section.appendChild(dopesheet);

      // KEY EDITITNG
      let keys = document.createElement("div");
      cg.AnimationEditor.ui.keyEditing = keys;
      section.appendChild(keys);
      ChoreoGraph.AnimationEditor.updateKeyEditing(cg);

      // ANIMATION INFORMATION
      let animationInformation = document.createElement("div");
      cg.AnimationEditor.ui.animationInformation = animationInformation;
      section.appendChild(animationInformation);
      this.updateAnimationOverview(cg,false);

      section.appendChild(document.createElement("hr"));
    };

    updateTrackTypeAdding(cg) {
      if (cg.AnimationEditor.ui.trackTypeAdding==undefined) { return; }
      let div = cg.AnimationEditor.ui.trackTypeAdding;
      div.innerHTML = "";

      // TRACK TYPE DROPDOWN
      let trackTypeDropdown = document.createElement("select");
      trackTypeDropdown.cg = cg;
      cg.AnimationEditor.ui.trackTypeDropdown = trackTypeDropdown;
      trackTypeDropdown.className = "develop_button";
      div.appendChild(trackTypeDropdown);

      let trackTypes = ChoreoGraph.Animation.PrimaryTrackTypes;
      if (cg.AnimationEditor.animation.tracks.length>0) { trackTypes = ChoreoGraph.Animation.SupplementaryTrackTypes; }
      for (let type in trackTypes) {
        let option = document.createElement("option");
        option.text = type;
        trackTypeDropdown.add(option);
      }
      trackTypeDropdown.onchange = (e) => {
        e.target.cg.AnimationEditor.ui.addTrackButton.innerHTML = "Add "+e.target.value+" Track";
      }

      // ADD TRACK BUTTON
      let addTrackButton = document.createElement("button");
      cg.AnimationEditor.ui.addTrackButton = addTrackButton;
      addTrackButton.innerHTML = "Add "+trackTypeDropdown.value+" Track";;
      addTrackButton.classList.add("develop_button");
      addTrackButton.classList.add("btn_action");
      addTrackButton.cg = cg;
      addTrackButton.onclick = (e) => {
        let trackType = e.target.cg.AnimationEditor.ui.trackTypeDropdown.value;
        let newTrack = e.target.cg.AnimationEditor.animation.createTrack(trackType);
        if (e.target.cg.AnimationEditor.track==null) { e.target.cg.AnimationEditor.track = newTrack; }
        ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
        ChoreoGraph.AnimationEditor.updateTrackTypeAdding(e.target.cg);
      }
      div.appendChild(addTrackButton);
    };

    updateTrackSelection(cg) {
      let div = cg.AnimationEditor.ui.trackSelection;
      div.innerHTML = "";
      div.style.marginTop = "15px";
      div.style.marginBottom = "10px";
      let anim = cg.AnimationEditor.animation;
      if (anim.tracks.length>0) {
        for (let track of anim.tracks) {
          let trackDiv = document.createElement("div");
          trackDiv.style.cursor = "pointer";
          if (cg.AnimationEditor.track==track) {
            trackDiv.style.fontWeight = "bold";
            trackDiv.style.color = "green";
          }
          trackDiv.cg = cg;
          trackDiv.track = track;
          trackDiv.onclick = (e) => {
            e.target.cg.AnimationEditor.track = e.target.track;
            ChoreoGraph.AnimationEditor.updateTrackSelection(e.target.cg);
            ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
          }
          trackDiv.innerHTML = track.type + " - " + track.info();
          div.appendChild(trackDiv);
        }
      } else {
        let noTracks = document.createElement("div");
        noTracks.innerHTML = "No Tracks";
        div.appendChild(noTracks);
      }
    }

    DopeSheetTrackData = class DopeSheetTrackData {
      track = null;
      trackIndex = -1;

      modifiable = false;
      moveable = false;
      lockToParts = true;
      deleteable = false;
      addable = false;

      strictFloatTypeModify = false;

      add = null;

      keyFrames = [];

      constructor(trackData) {
        this.trackData = trackData;
      }
    };

    DopeSheetKeyFrame = class DopeSheetKeyFrame {
      link = false;

      modify = null;
      move = null;

      text = "";

      part = 0;
      modifiableValues = [];
      toggleButtons = [];
      callbackGenerators = [];
    };

    getTrackDopeSheetData(cg,trackIndex) {
      let track = cg.AnimationEditor.animation.tracks[trackIndex];
      let trackData = new ChoreoGraph.AnimationEditor.DopeSheetTrackData();
      trackData.track = track;
      trackData.trackIndex = trackIndex;

      if (track.type==="path") {
        trackData.modifiable = true;
        trackData.strictFloatTypeModify = true;

        function modify(cg,keyFrame,dataIndex,value) {
          keyFrame.modifiableValues[dataIndex] = value;
        }
        let part = 0;
        for (let i=0;i<track.segments.length;i++) {
          let segment = track.segments[i];

          let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
          keyFrame.modifiableValues = segment.start;
          keyFrame.part = part;
          keyFrame.modify = modify;
          trackData.keyFrames.push(keyFrame);

          if (segment.controlAEnabled==false&&segment.controlBEnabled==false) {
            part++;
          } else {
            let empties = segment.getScaledSampleSize(track.density);
            part += empties;
          }
          if (!segment.connected) {
            let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
            keyFrame.modifiableValues = segment.end;
            keyFrame.part = part;
            keyFrame.modify = modify;
            trackData.keyFrames.push(keyFrame);
            part++;
          }
        }
      }

      else if (track.type==="value") {
        trackData.modifiable = true;
        trackData.moveable = true;
        trackData.deleteable = true;
        trackData.addable = true;
        trackData.strictFloatTypeModify = true;

        trackData.values = track.values;

        trackData.add = function(cg,part) {
          if (this.values[part]!==undefined) { return; }
          if (part>this.values.length) {
            let i = this.values.length;
            while (i<part) {
              i++;
              this.values.push(undefined);
            }
            this.values.push({v:0,interpolate:false});
          } else {
            this.values[part] = {v:0,interpolate:false};
          }
          let graphic = cg.graphics.animation_editor_dopesheet;
          graphic.selectedDopeSheetTrackData = ChoreoGraph.AnimationEditor.getTrackDopeSheetData(cg,this.trackIndex);
          let selectedIndex = 0;
          for (let keyIndex=0;keyIndex<this.values.length&&keyIndex<part;keyIndex++) {
            let value = this.values[keyIndex]?.v;
            if (value!==undefined) {
              selectedIndex++;
            }
          }
          graphic.selectedKeyFrame = selectedIndex;
          graphic.selectedTrack = this.trackIndex;
          graphic.selectedKeyFrameData = graphic.selectedDopeSheetTrackData.keyFrames[selectedIndex];

          ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
        }

        for (let i=0;i<track.values.length;i++) {
          let value = track.values[i];
          if (value!==undefined) {
            let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
            keyFrame.modifiableValues = [value.v];
            keyFrame.part = i;
            keyFrame.values = track.values;
            keyFrame.value = track.values[i];
            keyFrame.link = track.values[i].interpolate;
            keyFrame.text = track.values[i].v;

            keyFrame.modify = function(cg,keyFrame,dataIndex,value) {
              if (dataIndex==0) {
                keyFrame.values[keyFrame.part].v = value;
              } else if (dataIndex==1) {
                keyFrame.values[keyFrame.part].t = value;
              }
            };

            keyFrame.delete = function(cg,keyFrame) {
              keyFrame.values[keyFrame.part] = undefined;
              let graphic = cg.graphics.animation_editor_dopesheet;
              graphic.selectedKeyFrame = -1;
              ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
              ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
            };

            keyFrame.move = function(cg,keyFrame,part) {
              keyFrame.values[keyFrame.part] = undefined;
              keyFrame.values[part] = keyFrame.value;
              keyFrame.part = part;
              ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
              ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
            };

            let interpolateToggle = new ChoreoGraph.Develop.UIToggleButton({
              activeText : "Interpolate On",
              inactiveText : "Interpolate Off",
              onActive : (cg,devButton) => {
                let keyFrame = devButton.keyFrame;
                keyFrame.values[keyFrame.part].interpolate = true;
                keyFrame.link = true;
              },
              onInactive : (cg,devButton) => {
                let keyFrame = devButton.keyFrame;
                keyFrame.values[keyFrame.part].interpolate = false;
                keyFrame.link = false;
              }
            },cg);
            interpolateToggle.activated = track.values[i].interpolate;
            interpolateToggle.setStylesAndText();
            interpolateToggle.keyFrame = keyFrame;

            keyFrame.toggleButtons.push(interpolateToggle);

            trackData.keyFrames.push(keyFrame);
          }
        };
      }

      else if (track.type==="fixedtime") {
        for (let i=0;i<track.frames;i++) {
          let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
          keyFrame.part = i;
          keyFrame.link = true;
          trackData.keyFrames.push(keyFrame);
        }
      }

      else if (track.type==="variabletime") {
        trackData.modifiable = true;

        for (let i=0;i<track.times.length;i++) {
          let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
          keyFrame.part = i;
          keyFrame.modifiableValues = [track.times[i]];
          keyFrame.link = true;
          keyFrame.times = track.times;

          keyFrame.modify = function(cg,keyFrame,dataIndex,value) {
            keyFrame.times[keyFrame.part] = value;
          }

          trackData.keyFrames.push(keyFrame);
        }
      }

      else if (track.type==="trigger") {
        trackData.modifiable = true;
        trackData.moveable = true;
        trackData.lockToParts = false;
        trackData.deleteable = true;
        trackData.addable = true;

        trackData.triggers = track.triggers;

        trackData.add = function(cg,part) {
          part = parseFloat(part.toFixed(2));
          for (let trigger of this.triggers) {
            if (trigger.part==part) { return; }
          }
          let trigger = {part:part,type:"",data:[]};
          this.triggers.push(trigger);
          let graphic = cg.graphics.animation_editor_dopesheet;
          let countLower = 0;
          for (let trigger of this.track.triggers) {
            if (trigger.part<part) {
              countLower++;
            }
          }
          this.triggers.sort((a,b) => { return a.part-b.part; });

          graphic.selectedDopeSheetTrackData = ChoreoGraph.AnimationEditor.getTrackDopeSheetData(cg,this.trackIndex);
          graphic.selectedKeyFrameData = graphic.selectedDopeSheetTrackData.keyFrames[countLower];
          graphic.selectedKeyFrame = countLower;
          graphic.selectedTrack = this.trackIndex;

          ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
          ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
        };

        for (let i=0;i<track.triggers.length;i++) {
          let trigger = track.triggers[i];
          let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
          keyFrame.part = trigger.part;
          keyFrame.modifiableValues = [trigger.part,trigger.type];
          keyFrame.triggers = track.triggers;
          keyFrame.trigger = trigger;
          let text = "";
          for (let data of trigger.data) {
            text += data.value + ", ";
          }
          text = text.substring(0,text.length-2);
          keyFrame.text = text;

          keyFrame.modify = function(cg,keyFrame,dataIndex,value) {
            if (dataIndex==0) {
              keyFrame.trigger.part = Number(value);
            } else if (dataIndex==1) {
              keyFrame.trigger.type = value;
            }
          }

          keyFrame.move = function(cg,keyFrame,part) {
            part = parseFloat(part.toFixed(2));
            keyFrame.trigger.part = part;
          }

          keyFrame.delete = function(cg,keyFrame) {
            let index = keyFrame.triggers.indexOf(keyFrame.trigger);
            if (index>-1) {
              keyFrame.triggers.splice(index,1);
            }
            let graphic = cg.graphics.animation_editor_dopesheet;
            graphic.selectedKeyFrame = -1;
            graphic.selectedTrack = -1;
            ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
            ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
          }

          keyFrame.callbackGenerators.push((cg,div,keyFrame)=>{
            for (let i=0;i<keyFrame.trigger.data.length;i++) {
              let data = keyFrame.trigger.data[i];
              let value = data.value;
              let dropdown = document.createElement("select");
              dropdown.cg = cg;
              dropdown.keyFrame = keyFrame;
              dropdown.dataIndex = i;
              dropdown.style.marginRight = "5px";
              dropdown.style.fontSize = "15px";
              dropdown.style.padding = "6px";
              dropdown.style.border = "2px solid grey";
              dropdown.style.borderRadius = "5px";
              dropdown.style.background = "black";
              dropdown.style.color = "white";
              dropdown.style.fontFamily = "consolas";

              for (let type of ["number","string","boolean","undefined","evaluate"]) {
                let option = document.createElement("option");
                option.text = type;
                dropdown.add(option);
              }
              if (data.evaluate) {
                dropdown.value = "evaluate";
              } else {
                dropdown.value = typeof value;
              }

              dropdown.onchange = (e) => {
                let type = e.target.value;
                let data = keyFrame.trigger.data[e.target.dataIndex];
                data.evaluate = false;
                if (type=="number") {
                  if (typeof data.value==="string") {
                    data.value = Number(data.value);
                    if (isNaN(data.value)) {
                      data.value = 0;
                    }
                  } else {
                    data.value = 0;
                  }
                } else if (type=="string") {
                  if (typeof data.value==="number" || typeof data.value==="evaluate") {
                    data.value = String(data.value);
                  } else {
                    data.value = "";
                  }
                } else if (type=="boolean") {
                  data.value = true;
                } else if (type=="undefined") {
                  data.value = undefined;
                } else if (type=="evaluate") {
                  data.evaluate = true;
                  data.value = String(data.value);
                }
                ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
                ChoreoGraph.AnimationEditor.updateDopeSheetUI(e.target.cg,false);
              }
              div.appendChild(dropdown);

              if (typeof value === "number" || typeof value === "string") {
                let input = document.createElement("input");
                input.type = "text";
                input.value = value;
                input.classList.add("develop_input");
                input.style.marginRight = "5px";
                input.cg = cg;
                input.keyFrame = keyFrame;
                input.dataIndex = i;
                input.originalValue = value;
                input.previousValue = value;
                input.oninput = (e) => {
                  let value = e.target.value;
                  let keyFrame = e.target.keyFrame;
                  let existingValue = keyFrame.trigger.data[e.target.dataIndex].value;
                  if (typeof existingValue === "number") {
                    keyFrame.trigger.data[e.target.dataIndex].value = Number(value);
                  } else if (typeof existingValue === "string") {
                    keyFrame.trigger.data[e.target.dataIndex].value = String(value);
                  }
                  e.target.previousValue = e.target.value;
                }
                input.onblur = (e) => {
                  cg.AnimationEditor.preventUndoRedo = false;
                  let original = parseFloat(e.target.originalValue);
                  let value = parseFloat(e.target.value);
                  if (original!==value) {
                    ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
                  }
                }
                input.onfocus = (e) => {
                  cg.AnimationEditor.preventUndoRedo = true;
                }
                div.appendChild(input);
              } else if (typeof value === "boolean") {
                let checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = value;
                checkbox.style.marginRight = "5px";
                checkbox.cg = cg;
                checkbox.keyFrame = keyFrame;
                checkbox.dataIndex = i;
                checkbox.onchange = (e) => {
                  let keyFrame = e.target.keyFrame;
                  keyFrame.trigger.data[e.target.dataIndex].value = e.target.checked;
                  ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
                }
                div.appendChild(checkbox);
              }
            }

            function styleAddRemove(button) {
              button.classList.add("develop_button");
              button.classList.add("btn_action");
              button.style.margin = "0px";
              button.style.marginRight = "5px";
              button.style.padding = "6px";
              button.style.fontSize = "15px";
              button.style.border = "2px solid grey";
              button.style.borderRadius = "50px";
              button.style.color = "white";
              button.style.fontFamily = "consolas";
              button.style.width = "34px";
              button.style.verticalAlign = "top";
            }

            let removeButton = document.createElement("button");
            removeButton.innerHTML = "-";
            styleAddRemove(removeButton);
            removeButton.trigger = keyFrame.trigger;
            removeButton.cg = cg;
            removeButton.onclick = (e) => {
              e.target.trigger.data.pop();
              ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
              ChoreoGraph.AnimationEditor.updateDopeSheetUI(e.target.cg,false);
            }
            div.appendChild(removeButton);

            let addButton = document.createElement("button");
            addButton.innerHTML = "+";
            styleAddRemove(addButton);
            addButton.trigger = keyFrame.trigger;
            addButton.cg = cg;
            addButton.onclick = (e) => {
              let trigger = e.target.trigger;
              trigger.data.push({value:"",evaluate:false});
              ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
              ChoreoGraph.AnimationEditor.updateDopeSheetUI(e.target.cg,false);
            }
            div.appendChild(addButton);
          });

          trackData.keyFrames.push(keyFrame);
        }

      } else if (track.type==="sprite") {
        let frameIndex = 0;
        for (let frame of track.frames) {
          let keyFrame = new ChoreoGraph.AnimationEditor.DopeSheetKeyFrame(trackData);
          keyFrame.part = frameIndex+0.5;
          keyFrame.text = frame.graphicId;
          trackData.keyFrames.push(keyFrame);
          frameIndex++;
        }
      }
      return trackData;
    };

    updateDopeSheetUI(cg,selectModify=true) {
      let div = cg.AnimationEditor.ui.dopeSheetUI;
      if (div==undefined) { return; }
      div.innerHTML = "";
      div.style.marginTop = "10px";
      let graphic = cg.graphics.animation_editor_dopesheet;

      let trackData = graphic.selectedDopeSheetTrackData;

      if (graphic.selectedKeyFrame==-1||graphic.selectedTrack==-1) {
        let noneSelectedSpan = document.createElement("span");
        noneSelectedSpan.innerHTML = "No Keyframe Selected";
        noneSelectedSpan.style.color = "white";
        noneSelectedSpan.style.fontSize = "15px";
        div.appendChild(noneSelectedSpan);
        div.style.marginTop = "27px";
        return;
      }

      let keyFrame = graphic.selectedKeyFrameData;
      if (keyFrame==undefined) { return; }

      // DELETE KEYFRAME BUTTON
      if (trackData.deleteable) {
        let deleteButton = document.createElement("button");
        deleteButton.classList.add("develop_button");
        deleteButton.classList.add("btn_action");
        deleteButton.style.margin = "0px";
        deleteButton.style.marginRight = "5px";
        deleteButton.style.padding = "6px";
        deleteButton.innerHTML = "Delete";
        deleteButton.cg = cg;
        deleteButton.keyFrame = keyFrame;
        deleteButton.onclick = (e) => {
          e.target.keyFrame.delete(e.target.cg,e.target.keyFrame);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          ChoreoGraph.AnimationEditor.updateDopeSheetUI(e.target.cg);
        }
        div.appendChild(deleteButton);
      };

      // MODIFY VALUES INPUTS
      if (trackData.modifiable) {
        for (let dataIndex=0;dataIndex<keyFrame.modifiableValues.length;dataIndex++) {
          let value = keyFrame.modifiableValues[dataIndex];
          let input = document.createElement("input");
          input.type = "text";
          input.value = value;
          input.classList.add("develop_input");
          input.style.marginRight = "5px";
          input.cg = cg;
          input.keyFrame = keyFrame;
          input.dataIndex = dataIndex;
          input.originalValue = value;
          input.previousValue = value;
          input.strictFloatTypeModify = trackData.strictFloatTypeModify;

          input.oninput = (e) => {
            if (e.target.strictFloatTypeModify) {
              if (!(["0","1","2","3","4","5","6","7","8","9",".",null].includes(e.data))) {
                e.target.value = e.target.previousValue;
                e.target.blur();
                return;
              }
              let value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                keyFrame.modifiableValues[e.target.dataIndex] = e.target.value;
                e.target.keyFrame.modify(e.target.cg,e.target.keyFrame,e.target.dataIndex,value);
              }
              e.target.previousValue = e.target.value;
            } else {
              keyFrame.modifiableValues[e.target.dataIndex] = e.target.value;
              e.target.keyFrame.modify(e.target.cg,e.target.keyFrame,e.target.dataIndex,e.target.value);
            }
          }
          input.onblur = (e) => {
            cg.AnimationEditor.preventUndoRedo = false;
            let original = e.target.originalValue;
            let value = e.target.value;
            if (e.target.strictFloatTypeModify) {
              original = parseFloat(original);
              value = parseFloat(value);
            }
            if (original!==value) {
              ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
            }
          }
          input.onfocus = (e) => {
            cg.AnimationEditor.preventUndoRedo = true;
          }
          div.appendChild(input);
          if (selectModify&&dataIndex==0) {
            cg.AnimationEditor.preventUndoRedo = true;
            input.focus();
            input.select();
          }
        }
      }

      for (let button of keyFrame.toggleButtons) {
        button.element.style.margin = "0px";
        button.element.style.marginRight = "5px";
        button.element.style.padding = "6px";
        div.appendChild(button.element);
      }

      for (let callback of keyFrame.callbackGenerators) {
        callback(cg,div,keyFrame);
      }
    };

    deselectDopeSheet(cg) {
      let graphic = cg.graphics.animation_editor_dopesheet;
      if (graphic==undefined) { return; }
      graphic.selectedKeyFrame = -1;
      graphic.selectedTrack = -1;
    };

    createDopeSheet(cg) {
      if (cg.AnimationEditor.ui.dopeSheetCanvasContainer!=null) { return cg.AnimationEditor.ui.dopeSheetCanvasContainer; }
      let canvasElement = document.createElement("canvas");
      canvasElement.style.borderRadius = "12px";
      canvasElement.oncontextmenu = function(e) { e.preventDefault(); };
      canvasElement.onpointerdown = function(e) { if (e.button==1) { e.preventDefault(); } };
      let canvasParent = document.createElement("div");
      canvasParent.style.width = "90%";
      canvasParent.style.height = "150px";
      canvasParent.style.marginTop = "10px";
      canvasParent.appendChild(canvasElement);
      cg.AnimationEditor.ui.dopeSheetCanvasContainer = canvasParent;
      let canvas = cg.createCanvas({element:canvasElement,
        background:"#121212",
        hideDebugOverlays : true
      },"animation_editor_dopesheet");
      canvas.setupParentElement(canvasParent);

      cg.graphicTypes.animation_editor_dopesheet = new class AnimationEditorDopeSheet {
        setup(init,cg) {
          this.cg = cg;
          this.dragging = false;
          this.dragDown = 0;
          this.dragSavedX = 0;
          this.dragSavedSpacing
          this.dragMode = null; // move resize

          this.moving = false;
          this.startMovingCurX = 0;

          this.hasSetInitalPosition = false;

          this.partSpacing = 20;

          this.selectedTrack = -1;
          this.selectedKeyFrame = -1;
          this.selectedKeyFrameData = null;
          this.selectedDopeSheetTrackData = null;
        };
        draw(c,ax,ay) {
          let cg = this.cg;
          let cursor = cg.Input.canvasCursors.animation_editor_dopesheet;
          let transform = cg.transforms.animation_editor_dopesheet;
          let canvas = cg.canvases.animation_editor_dopesheet;
          let leftX = -transform.x-canvas.width/2;
          let animation = this.cg.AnimationEditor.animation;
          if (animation==null||animation.tracks.length==0) { return; }
          let primaryTrack = animation.tracks[0];
          let partCount = primaryTrack.getPartCount();

          c.fillStyle = "#bbb";
          c.font = "10px Arial";
          c.textAlign = "center";
          c.beginPath();
          for (let part=0;part<partCount;part++) {
            c.moveTo(part*this.partSpacing,-canvas.height/2+20);
            c.lineTo(part*this.partSpacing,canvas.height/2);
            c.fillText(part,part*this.partSpacing,-canvas.height/2+12);
          }
          c.strokeStyle = "#444";
          c.lineWidth = 1.4 * cg.settings.core.debugCGScale;
          c.setLineDash([5,5]);
          c.stroke();
          c.setLineDash([]);

          let countTrackTypes = {};
          for (let track of cg.AnimationEditor.animation.tracks) {
            if (countTrackTypes[track.type]==undefined) { countTrackTypes[track.type] = 0; }
            countTrackTypes[track.type]++;
          }

          let grabbablePoints = [];
          let grabbablePointInRange = false;
          let grabbableDistance = 12*(this.partSpacing/20);

          c.save();
          for (let trackIndex=0;trackIndex<animation.tracks.length;trackIndex++) {
            let trackY = trackIndex*20-(10*animation.tracks.length)+15;
            let track = animation.tracks[trackIndex];
            let trackData = ChoreoGraph.AnimationEditor.getTrackDopeSheetData(cg,trackIndex);
            let linking = false;
            for (let keyFrameIndex=0;keyFrameIndex<trackData.keyFrames.length;keyFrameIndex++) {
              let keyFrame = trackData.keyFrames[keyFrameIndex];
              if (linking) {
                c.lineTo(keyFrame.part*this.partSpacing-5,trackY);
                c.stroke();
                linking = false;
              }
              c.strokeStyle = "white";
              c.beginPath();
              c.arc(keyFrame.part*this.partSpacing,trackY,5,0,2*Math.PI);
              let point = {
                x : keyFrame.part*this.partSpacing,
                y : trackY,
                keyFrame : keyFrame,
                trackData : trackData,
                trackIndex : trackIndex,
                keyFrameIndex : keyFrameIndex
              };
              grabbablePoints.push(point);
              if (cursor!==undefined) {
                let distance = Math.sqrt((cursor.x-transform.x-point.x)**2+(cursor.y-point.y)**2);
                if (distance<grabbableDistance) {
                  grabbablePointInRange = true;
                }
              }
              if (keyFrameIndex==this.selectedKeyFrame&&trackIndex==this.selectedTrack) {
                c.fillStyle = "#ff00ff";
                c.lineWidth = 5 * cg.settings.core.debugCGScale;
              } else {
                c.fillStyle = "#121212";
                c.lineWidth = 2 * cg.settings.core.debugCGScale;
              }
              c.stroke();
              c.fill();
              if (keyFrame.link) {
                linking = true;
                c.strokeStyle = "#ffffff";
                c.lineWidth = 1.4 * cg.settings.core.debugCGScale;
                c.beginPath();
                c.moveTo(keyFrame.part*this.partSpacing+5,trackY);
              }
              if (keyFrame.text!=="") {
                c.save();
                c.font = "12px Arial";
                c.textAlign = "left";
                c.textBaseline = "middle";
                c.strokeStyle = "#121212";
                c.lineWidth = 3 * cg.settings.core.debugCGScale;
                let x = keyFrame.part*this.partSpacing+3;
                let y = trackY+1;
                c.strokeText(keyFrame.text,x,y,this.partSpacing);
                c.fillStyle = "#0ff";
                c.fillText(keyFrame.text,x,y,this.partSpacing);
                c.restore();
              }
            }
            if (trackData.addable&&cursor!==undefined&&grabbablePointInRange==false) {
              let y = trackY;
              let verticalDistance = Math.abs(cursor.y-y);
              if (verticalDistance<9.5) {
                let x = (cursor.x-transform.x)/this.partSpacing;
                x = Math.max(0,Math.min(partCount-1,x));
                if (trackData.lockToParts) { x = Math.round(x); }
                c.beginPath();
                c.arc(x*this.partSpacing,trackY,5,0,2*Math.PI);
                c.strokeStyle = "#00a233";
                if (this.moving) {
                  c.strokeStyle = "#ff00ff";
                }
                c.lineWidth = 1.4 * cg.settings.core.debugCGScale;
                c.stroke();
                if (cursor.impulseDown.left) {
                  trackData.add(cg,x);
                }
              }
            }
            c.font = "12px Arial";
            c.fillStyle = "#bbb";
            c.textAlign = "left";
            c.textBaseline = "middle";
            let name = animation.tracks[trackIndex].type;
            if (countTrackTypes[name]>1) {
              name += " "+(trackIndex);
            }
            if (track.type=="value") {
              for (let key of animation.keys) {
                for (let source of key.sources) {
                  if (source[0]==trackIndex) {
                    name += " ("+key.keySet+")";
                  }
                }
              }
            }
            c.lineWidth = 15 * cg.settings.core.debugCGScale;
            c.miterLimit = 2;
            c.strokeStyle = "#121212";
            c.strokeText(name,leftX+10,trackY+1);
            c.fillStyle = "#bbb";
            c.fillText(name,leftX+10,trackY+1);
          }
          c.restore();

          if (cursor!==undefined) {
            if (cursor.impulseDown.left) {
              let closestDistance = Infinity;
              let closestPoint = null;
              for (let i=0;i<grabbablePoints.length;i++) {
                let point = grabbablePoints[i];
                let distance = Math.sqrt((cursor.x-transform.x-point.x)**2+(cursor.y-point.y)**2);
                if (distance<grabbableDistance) {
                  if (distance<closestDistance) {
                    closestDistance = distance;
                    closestPoint = point;
                  }
                }
              }
              if (closestPoint!=null) {
                this.selectedKeyFrame = closestPoint.keyFrameIndex;
                this.selectedTrack = closestPoint.trackIndex;
                this.selectedKeyFrameData = closestPoint.keyFrame;
                this.selectedDopeSheetTrackData = closestPoint.trackData;
                ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
                if (closestPoint.trackData.moveable) {
                  this.moving = true;
                  this.startMovingCurX = cursor.x;
                }
              }
            }
            if (cursor.impulseUp.left) {
              if (this.moving) {
                this.moving = false;
                let minDistance = 3;
                let distance = Math.abs(this.startMovingCurX-cursor.x);
                if (distance>minDistance) {
                  let y = this.selectedTrack*20-(10*animation.tracks.length)+15;
                  let verticalDistance = Math.abs(cursor.y-y);
                  if (verticalDistance<9.5) {
                    let x = (cursor.x-transform.x)/this.partSpacing;
                    x = Math.max(0,Math.min(partCount-1,x));
                    let trackData = this.selectedDopeSheetTrackData;
                    if (trackData.lockToParts) { x = Math.round(x); }
                    this.selectedKeyFrameData.move(cg,this.selectedKeyFrameData,x);
                  }
                }
              }
            }
          }

          let animators = [];
          for (let objectId of this.cg.keys.objects) {
            let object = this.cg.objects[objectId];
            for (let component of object.objectData.components) {
              if (component.manifest.type=="Animator"&&component.animation!==null&&component.animation.id==animation.id) {
                animators.push(component);
              }
            }
          }

          for (let i=0;i<animators.length;i++) {
            let animator = animators[i];
            let triggerlessPart = animator.part;
            if (animator.part>animator.animation.data.length-1) {
              continue;
            }
            for (let j=0;j<=animator.part;j++) {
              if (typeof animator.animation.data[j][0] != "number") {
                triggerlessPart--;
              }
            }
            c.beginPath();
            let t = 1-((animator.ent-animator.playhead)/(animator.ent-animator.stt)) - 1;
            if (animator.ease!="linear") { t = -this.cg.Animation.easeFunctions[animator.ease](t); }
            c.moveTo((triggerlessPart+t)*this.partSpacing,-canvas.height/2);
            c.lineTo((triggerlessPart+t)*this.partSpacing,canvas.height/2);
            c.strokeStyle = "white";
            c.lineWidth = 2 * cg.settings.core.debugCGScale;
            c.stroke();
          }
        };
      };
      cg.createGraphic({type:"animation_editor_dopesheet"},"animation_editor_dopesheet");

      cg.createScene({},"animation_editor_dopesheet");
      cg.createCamera({},"animation_editor_dopesheet");
      cg.cameras.animation_editor_dopesheet.addScene(cg.scenes.animation_editor_dopesheet);
      cg.canvases.animation_editor_dopesheet.setCamera(cg.cameras.animation_editor_dopesheet);
      cg.scenes.animation_editor_dopesheet.createItem("graphic",{graphic:cg.graphics.animation_editor_dopesheet,transform:cg.createTransform({},"animation_editor_dopesheet")},"animation_editor_dopesheet");

      cg.processLoops.push(function dopeSheetProcessLoop(cg){
        let cursor = cg.Input.canvasCursors.animation_editor_dopesheet;
        if (cursor===undefined) { return; }
        let graphic = cg.graphics.animation_editor_dopesheet;
        let transform = cg.transforms.animation_editor_dopesheet;
        let canvas = cg.canvases.animation_editor_dopesheet;
        if (graphic.dragging==false&&(cursor.impulseDown.middle||cursor.impulseDown.right)) {
          graphic.dragging = true;
          graphic.dragDown = cursor.x;
          graphic.dragSavedX = transform.x;
          graphic.dragSavedSpacing = graphic.partSpacing;
          canvas.element.style.cursor = "grabbing";

          if (ChoreoGraph.Input.keyStates.ctrl) {
            graphic.dragMode = "resize";
          } else {
            graphic.dragMode = "move";
          }
        }
        if (graphic.dragging&&!(cursor.hold.middle||cursor.hold.right)) {
          graphic.dragging = false;
          canvas.element.style.cursor = "default";
        }
        if (graphic.dragging) {
          let dx = cursor.x-graphic.dragDown;
          if (graphic.dragMode=="resize") {
            graphic.partSpacing = Math.max(graphic.dragSavedSpacing+dx*0.01,1);
            if (graphic.dragSavedSpacing+dx*0.01>1) {
              transform.x = graphic.dragSavedX-dx*0.5;
            }
          } else if (graphic.dragMode=="move") {
            transform.x = graphic.dragSavedX+dx;
          }
        }
        if (graphic.hasSetInitalPosition==false) {
          graphic.hasSetInitalPosition = true;
          transform.x = -canvas.width/2+80;
        }
        if (cg.AnimationEditor.animation==null) { return; }
        let height = cg.AnimationEditor.animation.tracks.length*20+40;
        if (cg.AnimationEditor.ui.dopeSheetCanvasContainer.style.height!==height+"px") {
          cg.AnimationEditor.ui.dopeSheetCanvasContainer.style.height = height+"px";
        }
        if (cg.Input.lastInteraction.keyboard==cg.clock-cg.timeSinceLastFrame && ChoreoGraph.Input.lastKeyDown=="x" && ChoreoGraph.Input.keyStates.shift && cg.graphics.animation_editor_dopesheet.selectedKeyFrame !==-1 && cg.graphics.animation_editor_dopesheet.selectedTrack !==-1) {
          let keyFrame = graphic.selectedDopeSheetTrackData.keyFrames[graphic.selectedKeyFrame];
          keyFrame.delete(cg,keyFrame);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
          ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
        }
      });

      ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);

      return cg.AnimationEditor.ui.dopeSheetCanvasContainer;
    };

    setPathActionType(cg,type) {
      let editor = cg.AnimationEditor;
      editor.path.actionType = type;
      ChoreoGraph.AnimationEditor.updateTrackContext(cg);
    };

    updateTrackContext(cg) {
      let div = cg.AnimationEditor.ui.trackContext;
      if (div==undefined) { return; }
      div.innerHTML = "";
      if (cg.AnimationEditor.track==null) { return; }
      // Separator
      let separator = document.createElement("div");
      separator.style.borderLeft = "1px solid white";
      separator.style.height = "10px";
      separator.style.display = "inline-block";
      separator.style.margin = "0px 2px";
      div.appendChild(separator);

      if (cg.AnimationEditor.track.type=="path") {
        ChoreoGraph.AnimationEditor.createPathTrackContext(cg,div);
      } else if (cg.AnimationEditor.track.type=="variabletime") {
        ChoreoGraph.AnimationEditor.createVariableTimeTrackContext(cg,div);
      } else if (cg.AnimationEditor.track.type=="fixedtime") {
        ChoreoGraph.AnimationEditor.createFixedTimeTrackContext(cg,div);
      } else if (cg.AnimationEditor.track.type=="sprite") {
        ChoreoGraph.AnimationEditor.createFixedTimeTrackContext(cg,div,false);
        ChoreoGraph.AnimationEditor.createSpriteTrackContext(cg,div);
      }
    };

    createPathTrackContext(cg,div) {
      let actionType = cg.AnimationEditor.path.actionType;

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
        button.onclick = (e) => { ChoreoGraph.AnimationEditor.setPathActionType(e.target.cg,e.target.lowerName); };
        if (actionType==lowerName) { button.style.borderColor = "cyan"; } else { button.style.borderColor = ""; }
        div.appendChild(button);
        cg.AnimationEditor.ui.pathActionButtons[lowerName] = button;
      }

      createPathTrackActionButton(cg.AnimationEditor.ACTION_ADD);
      createPathTrackActionButton(cg.AnimationEditor.ACTION_GRAB);
      createPathTrackActionButton(cg.AnimationEditor.ACTION_DELETE);
      createPathTrackActionButton(cg.AnimationEditor.ACTION_INSERT);

      let connectedToggle = new ChoreoGraph.Develop.UIToggleButton({
        activeText : "Connected Mode On",
        inactiveText : "Connected Mode Off",
        onActive : (cg) => { cg.AnimationEditor.path.connectedMode = true; },
        onInactive : (cg) => { cg.AnimationEditor.path.connectedMode = false; }
      },cg);
      div.appendChild(connectedToggle.element);
      cg.AnimationEditor.ui.connectedToggle = connectedToggle;

      // SELECTED TANGENT TYPE DROPDOWN
      let dropdown = document.createElement("select");
      dropdown.cg = cg;
      cg.AnimationEditor.ui.tangentDropdown = dropdown;
      dropdown.className = "develop_button";
      div.appendChild(dropdown);

      for (let type of [cg.AnimationEditor.TANGENT_ALIGNED,cg.AnimationEditor.TANGENT_MIRRORED,cg.AnimationEditor.TANGENT_BROKEN]) {
        let option = document.createElement("option");
        option.text = type;
        option.cg = cg;
        dropdown.add(option);
      }
      dropdown.onchange = (e) => {
        e.target.cg.AnimationEditor.path.selectedTangentType = e.target.value;
      }
      dropdown.value = cg.AnimationEditor.path.selectedTangentType;

      let copyJointsButton = document.createElement("button");
      copyJointsButton.innerText = "Copy Joint Path";
      copyJointsButton.classList.add("develop_button");
      copyJointsButton.classList.add("btn_action");
      copyJointsButton.cg = cg;
      copyJointsButton.onclick = (e) => {
        let data = e.target.cg.AnimationEditor.track.getJointPath();
        navigator.clipboard.writeText(data);
      };
      div.appendChild(copyJointsButton);
    };

    createVariableTimeTrackContext(cg,div) {
      // EXTEND BUTTON
      let extendButton = document.createElement("button");
      extendButton.classList.add("develop_button");
      extendButton.classList.add("btn_action");
      extendButton.innerText = "Extend";
      extendButton.cg = cg;
      extendButton.onclick = (e) => {
        let cg = e.target.cg;
        let track = cg.AnimationEditor.track;
        let graphic = cg.graphics.animation_editor_dopesheet;
        track.times.push(1);
        graphic.selectedKeyFrame = track.times.length-1;
      }
      div.appendChild(extendButton);
    };

    createFixedTimeTrackContext(cg,div,includeFrameInput=true) {
      // MODE DROPDOWN
      let modeDropdown = document.createElement("select");
      modeDropdown.cg = cg;
      modeDropdown.style.marginRight = "10px";
      modeDropdown.className = "develop_button";
      div.appendChild(modeDropdown);

      let framerateOption = document.createElement("option");
      framerateOption.text = "framerate";
      modeDropdown.add(framerateOption);
      let timeOption = document.createElement("option");
      timeOption.text = "time";
      modeDropdown.add(timeOption);

      modeDropdown.value = cg.AnimationEditor.track.mode;

      modeDropdown.onchange = (e) => {
        let track = e.target.cg.AnimationEditor.track;
        track.mode = e.target.value;
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
      }

      if (cg.AnimationEditor.track.mode=="framerate") {
        // FRAMERATE INPUT
        let framerateInput = document.createElement("input");
        framerateInput.type = "text";
        framerateInput.value = cg.AnimationEditor.track.fps;
        framerateInput.classList.add("develop_input");
        framerateInput.cg = cg;
        div.appendChild(framerateInput);

        framerateInput.oninput = (e) => {
          let fps = parseFloat(e.target.value);
          if (isNaN(fps)) { return; }
          e.target.cg.AnimationEditor.track.fps = fps;
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
        }

        framerateInput.onblur = (e) => {
          let fps = parseFloat(e.target.value);
          if (isNaN(fps)) {
            e.target.value = e.target.cg.AnimationEditor.track.fps;
          } else {
            e.target.cg.AnimationEditor.track.fps = fps;
          }
        }

        // FPS TEXT
        let fpsText = document.createElement("span");
        fpsText.innerHTML = " fps";
        fpsText.style.color = "white";
        fpsText.style.fontSize = "15px";
        div.appendChild(fpsText);
      } else if (cg.AnimationEditor.track.mode=="time") {
        // TIME INPUT
        let timeInput = document.createElement("input");
        timeInput.type = "text";
        timeInput.value = cg.AnimationEditor.track.time;
        timeInput.classList.add("develop_input");
        timeInput.cg = cg;
        div.appendChild(timeInput);

        timeInput.oninput = (e) => {
          e.target.cg.AnimationEditor.track.time = e.target.value;
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
        }

        // SECONDS TEXT
        let secondsText = document.createElement("span");
        secondsText.innerHTML = " seconds";
        secondsText.style.color = "white";
        secondsText.style.fontSize = "15px";
        div.appendChild(secondsText);
      }

      if (!includeFrameInput) { return; }

      // FRAMES INPUT
      let framesInput = document.createElement("input");
      framesInput.type = "text";
      framesInput.value = cg.AnimationEditor.track.frames;
      framesInput.classList.add("develop_input");
      framesInput.style.marginLeft = "10px";
      framesInput.cg = cg;
      div.appendChild(framesInput);

      framesInput.oninput = (e) => {
        let frames = parseInt(e.target.value);
        if (isNaN(frames)) { return; }
        e.target.cg.AnimationEditor.track.frames = frames;
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
      }

      framesInput.onblur = (e) => {
        let frames = parseInt(e.target.value);
        if (isNaN(frames)) {
          e.target.value = e.target.cg.AnimationEditor.track.frames;
        } else {
          e.target.cg.AnimationEditor.track.frames = frames;
        }
      }

      // FRAMES TEXT
      let framesText = document.createElement("span");
      framesText.innerHTML = " frame(s)";
      framesText.style.color = "white";
      framesText.style.fontSize = "15px";
      div.appendChild(framesText);
    };

    createSpriteTrackContext(cg,div) {
      div.style.width = "100%";
      div.appendChild(document.createElement("br"));
      div.appendChild(document.createElement("br"));

      function styleButton(button,unsetWidth=false) {
        button.classList.add("develop_button");
        button.classList.add("btn_action");
        button.style.margin = "0px 1px";
        button.style.padding = "5px";
        button.style.border = "2px solid grey";
        button.style.borderRadius = "500px";
        button.style.color = "white";
        button.style.fontWeight = "900";
        button.style.fontFamily = "consolas";
        if (!unsetWidth) { button.style.width = "29px"; }
        button.style.height = "29px";
      }

      for (let keyIndex=0;keyIndex<cg.AnimationEditor.track.graphicKey.length;keyIndex++) {
        let keyInput = document.createElement("input");
        div.appendChild(keyInput);
        keyInput.type = "text";
        keyInput.value = cg.AnimationEditor.track.graphicKey[keyIndex];
        keyInput.cg = cg;
        keyInput.keyIndex = keyIndex;
        keyInput.classList.add("develop_input");
        keyInput.style.marginRight = "5px";
        keyInput.style.fontSize = "13px";
        keyInput.oninput = (e) => {
          let track = e.target.cg.AnimationEditor.track;
          track.graphicKey[e.target.keyIndex] = e.target.value;
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
        }
        keyInput.onblur = (e) => {
          cg.AnimationEditor.preventUndoRedo = false;
          let track = e.target.cg.AnimationEditor.track;
          let graphicKey = e.target.value;
          track.graphicKey[e.target.keyIndex] = graphicKey;
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
        }
        keyInput.onfocus = (e) => {
          cg.AnimationEditor.preventUndoRedo = true;
        }
      }

      let removeKeyButton = document.createElement("button");
      div.appendChild(removeKeyButton);
      removeKeyButton.innerHTML = "-";
      removeKeyButton.cg = cg;
      styleButton(removeKeyButton);
      removeKeyButton.title = "Remove Key";
      removeKeyButton.onclick = (e) => {
        let track = e.target.cg.AnimationEditor.track;
        if (track.graphicKey.length>1) {
          track.graphicKey.pop();
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
        }
      }

      let addKeyButton = document.createElement("button");
      div.appendChild(addKeyButton);
      addKeyButton.innerHTML = "+";
      addKeyButton.cg = cg;
      styleButton(addKeyButton);
      addKeyButton.title = "Add Key";
      addKeyButton.onclick = (e) => {
        let track = e.target.cg.AnimationEditor.track;
        track.graphicKey.push("");
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
      }

      function createInsertButton(insertIndex,track) {
        let insertButton = document.createElement("button");
        insertButton.cg = cg;
        insertButton.insertIndex = insertIndex;
        styleButton(insertButton);
        insertButton.title = "Insert Frame";
        insertButton.style.position = "absolute";
        insertButton.style.translate = "0px -17px";
        insertButton.style.height = "8px";
        insertButton.style.width = "128px";
        insertButton.onclick = (e) => {
          let newFrame = new ChoreoGraph.Animation.SpriteFrame();
          let track = e.target.cg.AnimationEditor.track;
          track.frames.splice(e.target.insertIndex,0,newFrame);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
        }
        return insertButton;
      }

      let frameEditor = document.createElement("div");
      div.appendChild(frameEditor);
      frameEditor.style.marginTop = "40px";
      frameEditor.style.marginBottom = "24px";
      let track = cg.AnimationEditor.track;

      frameEditor.appendChild(createInsertButton(0,track));

      let frameIndex = 0;
      for (let frame of track.frames) {
        let frameDiv = document.createElement("div");
        frameDiv.style.margin = "20px 0px";
        frameEditor.appendChild(frameDiv);

        let deleteFrameButton = document.createElement("button");
        frameDiv.appendChild(deleteFrameButton);
        deleteFrameButton.title = "Delete Key Set";
        deleteFrameButton.innerHTML = "X";
        deleteFrameButton.cg = cg;
        deleteFrameButton.frameIndex = frameIndex;
        styleButton(deleteFrameButton);
        deleteFrameButton.style.marginLeft = "15px";
        deleteFrameButton.onclick = (e) => {
          let track = e.target.cg.AnimationEditor.track;
          track.frames.splice(e.target.frameIndex,1);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
        }

        let moveFrameUpButton = document.createElement("button");
        frameDiv.appendChild(moveFrameUpButton);
        moveFrameUpButton.title = "Move Frame Up";
        moveFrameUpButton.innerHTML = "V";
        moveFrameUpButton.style.transform = "scale(-1)";
        moveFrameUpButton.cg = cg;
        moveFrameUpButton.frameIndex = frameIndex;
        styleButton(moveFrameUpButton);
        if (frameIndex==0) {
          moveFrameUpButton.style.borderColor = "#333";
          moveFrameUpButton.style.color = "#333";
        } else {
          moveFrameUpButton.onclick = (e) => {
            let track = e.target.cg.AnimationEditor.track;
            let frameIndex = e.target.frameIndex;
            let savedFrame = track.frames[frameIndex];
            track.frames[frameIndex] = track.frames[frameIndex-1];
            track.frames[frameIndex-1] = savedFrame;
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
            ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
          }
        }

        let moveFrameDownButton = document.createElement("button");
        frameDiv.appendChild(moveFrameDownButton);
        moveFrameDownButton.title = "Move Frame Down";
        moveFrameDownButton.innerHTML = "V";
        moveFrameDownButton.cg = cg;
        moveFrameDownButton.frameIndex = frameIndex;
        styleButton(moveFrameDownButton);
        moveFrameDownButton.style.marginRight = "5px";
        if (frameIndex==track.frames.length-1) {
          moveFrameDownButton.style.borderColor = "#333";
          moveFrameDownButton.style.color = "#333";
        } else {
          moveFrameDownButton.onclick = (e) => {
            let track = e.target.cg.AnimationEditor.track;
            let frameIndex = e.target.frameIndex;
            let savedFrame = track.frames[frameIndex];
            track.frames[frameIndex] = track.frames[frameIndex+1];
            track.frames[frameIndex+1] = savedFrame;
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
            ChoreoGraph.AnimationEditor.updateTrackContext(e.target.cg);
          }
        }

        let graphicInput = document.createElement("input");
        frameDiv.appendChild(graphicInput);
        graphicInput.type = "text";
        graphicInput.title = "Graphic Id";
        graphicInput.classList.add("develop_input");
        graphicInput.style.fontSize = "13px";
        graphicInput.style.marginRight = "5px";
        graphicInput.cg = cg;
        graphicInput.frame = frame;
        graphicInput.value = frame.graphicId;
        graphicInput.originalValue = frame.graphicId;
        graphicInput.oninput = (e) => {
          let frame = e.target.frame;
          let graphicId = e.target.value;
          frame.graphicId = graphicId;
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
        }
        graphicInput.onblur = (e) => {
          cg.AnimationEditor.preventUndoRedo = false;
          let graphicId = e.target.value;
          if (graphicId!=e.target.originalValue) {
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          }
        }
        graphicInput.onfocus = (e) => {
          cg.AnimationEditor.preventUndoRedo = true;
        }

        let xSpan = document.createElement("span");
        frameDiv.appendChild(xSpan);
        xSpan.innerHTML = "x";
        xSpan.style.color = "white";
        xSpan.style.fontSize = "13px";
        xSpan.style.marginRight = "2px";

        let multiplierInput = document.createElement("input");
        frameDiv.appendChild(multiplierInput);
        multiplierInput.type = "text";
        multiplierInput.title = "Frame Duration Multiplier";
        multiplierInput.classList.add("develop_input");
        multiplierInput.style.fontSize = "13px";
        multiplierInput.cg = cg;
        multiplierInput.frame = frame;
        multiplierInput.value = frame.durationMultiplier;
        multiplierInput.originalValue = frame.durationMultiplier;
        multiplierInput.oninput = (e) => {
          let frame = e.target.frame;
          let durationMultiplier = parseFloat(e.target.value);
          frame.durationMultiplier = durationMultiplier;
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
        }
        multiplierInput.onblur = (e) => {
          let durationMultiplier = parseFloat(e.target.value);
          if (durationMultiplier!=e.target.originalValue) {
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          }
        }

        frameEditor.appendChild(createInsertButton(frameIndex+1,track));
        frameIndex++;
      }
    };

    updateKeyEditing(cg) {
      if (cg.AnimationEditor.animation==null) { return; }
      let div = cg.AnimationEditor.ui.keyEditing;
      div.innerHTML = "";
      div.style.marginTop = "20px";

      let countTrackTypes = {};
      for (let track of cg.AnimationEditor.animation.tracks) {
        if (countTrackTypes[track.type]==undefined) { countTrackTypes[track.type] = 0; }
        countTrackTypes[track.type]++;
      }

      let streams = [];
      for (let trackIndex=0;trackIndex<cg.AnimationEditor.animation.tracks.length;trackIndex++) {
        let track = cg.AnimationEditor.animation.tracks[trackIndex];
        if (track.streams==undefined) { continue; }
        for (let streamName of track.streams) {
          let name;
          if (countTrackTypes[track.type]>1) {
            name = track.type + trackIndex + " " + streamName;
          } else {
            name = track.type + " " + streamName;
          }
          let uses = [];
          let keyIndex = 0;
          for (let key of cg.AnimationEditor.animation.keys) {
            for (let source of key.sources) {
              if (source[0]==trackIndex && source[1]==streamName) {
                uses.push(keyIndex);
              }
            }
            keyIndex++;
          }
          let stream = {
            name : name,
            key : streamName,
            track : track,
            trackIndex : trackIndex,
            uses : uses
          }
          streams.push(stream);
        }
      }

      function styleButton(button,unsetWidth=false) {
        button.classList.add("develop_button");
        button.classList.add("btn_action");
        button.style.margin = "0px 1px";
        button.style.padding = "5px";
        button.style.border = "2px solid grey";
        button.style.borderRadius = "500px";
        button.style.color = "white";
        button.style.fontWeight = "900";
        button.style.fontFamily = "consolas";
        if (!unsetWidth) { button.style.width = "29px"; }
        button.style.height = "29px";
      }

      let keyIndex = 0;
      for (let key of cg.AnimationEditor.animation.keys) {
        if (key.sources==undefined) { key.sources = []; }
        let keySet = key.keySet;
        let set = document.createElement("ul");
        div.appendChild(set);
        set.style.listStyleType = "none";
        set.style.padding = "0px";
        set.style.margin = "10px 0px";
        set.style.height = "29px";
        let makeTimeKeyButton = document.createElement("button");
        makeTimeKeyButton.title = "Set as Time Key";
        makeTimeKeyButton.innerHTML = "Time";
        makeTimeKeyButton.cg = cg;
        makeTimeKeyButton.keyIndex = keyIndex;
        makeTimeKeyButton.onclick = (e) => {
          let animation = e.target.cg.AnimationEditor.animation;
          let prevIndex = animation.getTimeKey();
          if (prevIndex>=0) {
            animation.keys[prevIndex] = animation.keys[e.target.keyIndex];
          }
          animation.keys[e.target.keyIndex] = {keySet:"time",sources:[]};
          ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
        }
        styleButton(makeTimeKeyButton,true);
        makeTimeKeyButton.style.marginRight = "5px";
        set.appendChild(makeTimeKeyButton);

        let deleteKeySetButton = document.createElement("button");
        deleteKeySetButton.title = "Delete Key Set";
        deleteKeySetButton.innerHTML = "X";
        deleteKeySetButton.cg = cg;
        deleteKeySetButton.keyIndex = keyIndex;
        deleteKeySetButton.onclick = (e) => {
          let animation = e.target.cg.AnimationEditor.animation;
          animation.keys.splice(e.target.keyIndex,1);
          ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        }
        styleButton(deleteKeySetButton);
        set.appendChild(deleteKeySetButton);

        let moveKeyUpButton = document.createElement("button");
        set.appendChild(moveKeyUpButton);
        moveKeyUpButton.title = "Move Key Set Up";
        moveKeyUpButton.innerHTML = "V";
        moveKeyUpButton.style.transform = "scale(-1)";
        moveKeyUpButton.cg = cg;
        moveKeyUpButton.keyIndex = keyIndex;
        styleButton(moveKeyUpButton);
        if (keyIndex==0) {
          moveKeyUpButton.style.color = "#333";
          moveKeyUpButton.style.borderColor = "#333";
        } else {
          moveKeyUpButton.onclick = (e) => {
            let keys = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex];
            let prevKeys = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex-1];
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex] = prevKeys;
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex-1] = keys;
            ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          }
        }

        let moveKeyDownButton = document.createElement("button");
        set.appendChild(moveKeyDownButton);
        moveKeyDownButton.title = "Move Key Set Down";
        moveKeyDownButton.innerHTML = "V";
        moveKeyDownButton.cg = cg;
        moveKeyDownButton.keyIndex = keyIndex;
        styleButton(moveKeyDownButton);
        if (keyIndex==cg.AnimationEditor.animation.keys.length-1) {
          moveKeyDownButton.style.color = "#333";
          moveKeyDownButton.style.borderColor = "#333";
        } else {
          moveKeyDownButton.onclick = (e) => {
            let keys = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex];
            let prevKeys = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex+1];
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex] = prevKeys;
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex+1] = keys;
            ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          }
        }

        let removeKeyButton = document.createElement("button");
        set.appendChild(removeKeyButton);
        removeKeyButton.title = "Remove Last Key";
        removeKeyButton.innerHTML = "-";
        removeKeyButton.cg = cg;
        removeKeyButton.keyIndex = keyIndex;
        removeKeyButton.onclick = (e) => {
          let keySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex].keySet;
          keySet.pop();
          ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        };
        styleButton(removeKeyButton);
        let addKeyButton = document.createElement("button");
        set.appendChild(addKeyButton);
        addKeyButton.title = "Add Key";
        addKeyButton.innerHTML = "+";
        addKeyButton.cg = cg;
        addKeyButton.keyIndex = keyIndex;
        addKeyButton.onclick = (e) => {
          let keySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex].keySet;
          keySet.push("");
          ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        };
        styleButton(addKeyButton);
        addKeyButton.style.marginRight = "5px";

        function addSourceDropdown(sourceIndex,isAddNew=false) {
          let source = key.sources[sourceIndex];
          let sourceDropdown = document.createElement("select");
          set.appendChild(sourceDropdown);
          sourceDropdown.cg = cg;
          sourceDropdown.key = key;
          sourceDropdown.source = source;
          sourceDropdown.sourceIndex = sourceIndex;
          sourceDropdown.isAddNew = isAddNew;
          styleButton(sourceDropdown,true);
          if (isAddNew&&(key.sources.length>0||keySet==="time")) {
            sourceDropdown.style.borderColor = "#222";
            sourceDropdown.style.width = "20px";
            sourceDropdown.title = "Override Source";
          }
          sourceDropdown.onchange = (e) => {
            let option = e.target.options[e.target.options.selectedIndex];
            if (e.target.isAddNew) {
              let newSource = [option.stream.trackIndex,option.stream.key];
              e.target.key.sources.push(newSource);
            } else {
              let source = e.target.source;
              if (option.text=="") {
                e.target.key.sources.splice(e.target.sourceIndex,1);
              } else {
                source[0] = option.stream.trackIndex;
                source[1] = option.stream.key;
              }
            }
            ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          }

          let hasFoundCorrectLink = false;
          for (let stream of streams) {
            let option = document.createElement("option");
            option.text = stream.name;
            option.stream = stream;
            option.sourceIndex = sourceIndex;
            if (stream.uses.length>1) {
              option.style.color = "orange";
            } else if (stream.uses.length==0) {
              option.style.color = "red";
            }
            sourceDropdown.add(option);
            if (source!=undefined && stream.trackIndex==source[0] && stream.key==source[1]) {
              hasFoundCorrectLink = true;
              sourceDropdown.value = stream.name;
            }

            sourceIndex++;
          }
          if (!hasFoundCorrectLink) {
            sourceDropdown.value = "";
          } else {
            let unlinkOption = document.createElement("option");
            unlinkOption.text = "";
            sourceDropdown.add(unlinkOption);
          }
        }

        if (keySet === "time") {
          let timeLi = document.createElement("li");
          timeLi.style.display = "inline-block";
          timeLi.style.margin = "0px 5px 0px 0px";
          set.appendChild(timeLi);
          let timeSpan = document.createElement("span");
          timeLi.appendChild(timeSpan);
          timeSpan.innerText = "time";
          timeSpan.style.padding = "5px";
          timeSpan.style.border = "2px solid #649ed1";
          timeSpan.style.borderRadius = "5px";
          timeSpan.style.background = "black";
          timeSpan.style.color = "#649ed1";
          timeSpan.style.fontFamily = "consolas";
          makeTimeKeyButton.style.color = "#333";
          makeTimeKeyButton.style.borderColor = "#333";
          removeKeyButton.style.color = "#333";
          removeKeyButton.style.borderColor = "#333";
          removeKeyButton.onclick = null;
          addKeyButton.style.color = "#333";
          addKeyButton.style.borderColor = "#333";
          addKeyButton.onclick = null;
        } else {
          let keySetIndex = 0;
          for (let key of keySet) {
            let keyLi = document.createElement("li");
            set.appendChild(keyLi);
            keyLi.style.display = "inline-block";
            keyLi.style.width = "auto";
            keyLi.style.margin = "0px 5px 0px 0px";

            let keyValue = document.createElement("input");
            keyLi.appendChild(keyValue);
            keyValue.value = key;
            keyValue.classList.add("develop_input");
            keyValue.style.padding = "5px";
            keyValue.style.fontSize = "13px";
            keyValue.keyIndex = keyIndex;
            keyValue.keySetIndex = keySetIndex;
            keyValue.cg = cg;
            keyValue.onclick = (e) => { e.target.select(); }
            keyValue.onblur = (e) => {
              let illegalChars = ":,&|";
              let hasIllegal = false;
              for (let char of illegalChars) {
                if (e.target.value.indexOf(char)>-1) {
                  hasIllegal = true;
                }
              }
              let isUnique = true;
              if (e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex].keySet[e.target.keySetIndex]===e.target.value) {
                isUnique = false;
              }
              if (hasIllegal) {
                e.target.value = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex].keySet[e.target.keySetIndex];
                alert("You can not use: " + illegalChars);
              } else {
                e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex].keySet[e.target.keySetIndex] = e.target.value;
              }
              if (isUnique&&!hasIllegal) {
                ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
              }
            };
            keySetIndex++;
          }
        }

        for (let i=0;i<key.sources.length;i++) {
          addSourceDropdown(i);
        }
        addSourceDropdown(-1,true);

        keyIndex++;
      }
      let addKeySetButton = document.createElement("button");
      div.appendChild(addKeySetButton);
      addKeySetButton.innerHTML = "Add New Key Set +";
      addKeySetButton.cg = cg;
      addKeySetButton.style.fontStyle = "italic";
      addKeySetButton.onclick = (e) => {
        let animation = e.target.cg.AnimationEditor.animation;
        if (animation.getTimeKey()===-1) {
          animation.keys.push({keySet:"time",sources:[]});
        } else {
          animation.keys.push({keySet:[""],sources:[]});
        }
        ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
      };
      styleButton(addKeySetButton);
      addKeySetButton.style.width = "auto";
      addKeySetButton.style.padding = "5px 10px";
    };

    updateAnimationOverview(cg,addToUndoQueue=true) {
      let anim = cg.AnimationEditor.animation;
      if (anim==null) { return; }

      let div = cg.AnimationEditor.ui.animationInformation;
      if (div==null) { return; }
      div.innerHTML = "";
      div.style.marginTop = "20px";

      ChoreoGraph.AnimationEditor.updateTrackSelection(cg);

      div.appendChild(document.createElement("hr"));

      let copyPackedButton = document.createElement("button");
      copyPackedButton.innerHTML = "Copy Packed Data";
      copyPackedButton.classList.add("develop_button");
      copyPackedButton.classList.add("btn_action");
      copyPackedButton.cg = cg;
      copyPackedButton.onclick = (e) => {
        let data = e.target.cg.AnimationEditor.animation.pack();
        navigator.clipboard.writeText(data);
      };
      div.appendChild(copyPackedButton);

      let copyBakedButton = document.createElement("button");
      copyBakedButton.innerHTML = "Copy Baked Data";
      copyBakedButton.classList.add("develop_button");
      copyBakedButton.classList.add("btn_action");
      copyBakedButton.cg = cg;
      copyBakedButton.onclick = (e) => {
        let data = e.target.cg.AnimationEditor.animation.bake();
        ChoreoGraph.AnimationEditor.restartAllAnimators(e.target.cg);
        let output = "";
        for (var i in data) {
          output += "[";
          for (let value of data[i]) {
            if (typeof value=="number") {
              output += value + ",";
            } else if (typeof value=="string") {
              output += '"'+value+'",';
            } else if (typeof value=="object") {
              output += 'OBJECT,';
            } else if (typeof value=="boolean") {
              output += value + ",";
            } else {
              output += value + ",";
            }
          }
          output = output.slice(0, -1);
          output += "],";
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
        e.target.cg.AnimationEditor.animation.bake();
        ChoreoGraph.AnimationEditor.restartAllAnimators(e.target.cg);
      };
      div.appendChild(bakeButton);

      div.appendChild(cg.AnimationEditor.ui.autobakeToggle.element);

      if (cg.AnimationEditor.ui.autobakeToggle.activated) {
        cg.AnimationEditor.animation.bake();
        ChoreoGraph.AnimationEditor.restartAllAnimators(cg);
      }

      div.appendChild(document.createElement("br"));
      let packed = document.createElement("textarea");
      packed.style.overflowWrap = "break-word";
      packed.style.width = "90%";
      packed.style.height = "100px";
      packed.style.background = "#000";
      packed.style.color = "#fff";
      packed.onblur = (e) => {
        let packedData = e.target.value;
        let isUnique = false;
        isUnique = packedData!==cg.AnimationEditor.lastPack;
        if (packedData.length>0&&isUnique) {
          let selectedType = cg.AnimationEditor.track?.type;
          cg.AnimationEditor.undoStack.push(cg.AnimationEditor.lastPack);
          cg.AnimationEditor.animation.unpack(packedData,cg.AnimationEditor.autobake);
          ChoreoGraph.AnimationEditor.restartAllAnimators(cg);
          ChoreoGraph.AnimationEditor.updateKeyEditing(cg);
          ChoreoGraph.AnimationEditor.selectFirstTrackByType(cg,selectedType);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
          ChoreoGraph.AnimationEditor.updateDopeSheetUI(cg);
          ChoreoGraph.AnimationEditor.updateTrackContext(cg);
          ChoreoGraph.AnimationEditor.updateTrackTypeAdding(cg);
        }
      }
      let packedData = anim.pack();
      if (addToUndoQueue) {
        cg.AnimationEditor.redoStack.length = 0;
        cg.AnimationEditor.undoStack.push(cg.AnimationEditor.lastPack);
      }
      cg.AnimationEditor.lastPack = packedData;
      packed.innerText = packedData;
      div.appendChild(packed);
    };

    restartAllAnimators(cg) {
      for (let objectId in cg.objects) {
        let object = cg.objects[objectId];
        for (let component of object.objectData.components) {
          if (component.manifest.type=="Animator"&&component.animation!==null&&component.animation.id==cg.AnimationEditor.animation.id) {
            component.playFrom(0);
            component.connectionData.initialisedAnimation = null;
          }
        }
      }
    };

    removeInterface(cg) {
      cg.AnimationEditor.initInterface = false;
      cg.AnimationEditor.ui.section.remove();
    };

    selectFirstTrackByType(cg,type) {
      for (let track of cg.AnimationEditor.animation.tracks) {
        if (track.type==type) {
          cg.AnimationEditor.track = track;
          break;
        }
      }
    };

    undo(cg) {
      if (cg.AnimationEditor.preventUndoRedo) { return; }
      if (cg.AnimationEditor.undoStack.length>0) {
        let selectedType = cg.AnimationEditor.track.type;
        let packedData = cg.AnimationEditor.undoStack.pop();
        cg.AnimationEditor.redoStack.push(cg.AnimationEditor.animation.pack());
        cg.AnimationEditor.animation.unpack(packedData,cg.AnimationEditor.autobake);

        this.selectFirstTrackByType(cg,selectedType);
      }
      this.updateKeyEditing(cg);
      this.updateAnimationOverview(cg,false);
      this.updateDopeSheetUI(cg,false);
      this.updateTrackContext(cg,false);
    };

    redo(cg) {
      if (cg.AnimationEditor.preventUndoRedo) { return; }
      if (cg.AnimationEditor.redoStack.length>0) {
        let selectedType = cg.AnimationEditor.track.type;
        let packedData = cg.AnimationEditor.redoStack.pop();
        cg.AnimationEditor.undoStack.push(cg.AnimationEditor.animation.pack());
        cg.AnimationEditor.animation.unpack(packedData,cg.AnimationEditor.autobake);

        this.selectFirstTrackByType(cg,selectedType);
      }
      this.updateKeyEditing(cg);
      this.updateAnimationOverview(cg,false);
      this.updateDopeSheetUI(cg,false);
      this.updateTrackContext(cg,false);
    };

    overlayClosestFrameLocator(cg) {
      let canvas = cg.Input.cursor.canvas;
      let camera = canvas.camera;
      let c = canvas.c;
      let cursor = cg.Input.cursor;

      let closestAnimation = null;
      let closestDistance = Infinity;
      let closestPart = -1;
      let closestX = -1;
      let closestY = -1;
      for (let animationId of cg.keys.animations) {
        let animation = cg.Animation.animations[animationId];
        let xKey = -1;
        let yKey = -1;
        for (let k=0;k<animation.keys.length;k++) {
          if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(cg.settings.animation.debug.pathXKey)) { xKey = k; }
          if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(cg.settings.animation.debug.pathYKey)) { yKey = k; }
        }
        if (xKey==-1||yKey==-1) { continue; }

        for (let part=0;part<animation.data.length;part++) {
          let data = animation.data[part];
          if (typeof data[0] !== "number") { continue; }
          let x = data[xKey];
          let y = data[yKey];
          let distance = Math.sqrt(Math.pow(cursor.x-x,2)+Math.pow(cursor.y-y,2));
          if (distance<closestDistance) {
            closestDistance = distance;
            closestAnimation = animation;
            closestPart = part;
            closestX = x;
            closestY = y;
          }
        }
      }
      if (closestAnimation==null) { return; }

      ChoreoGraph.transformContext(camera);
      c.beginPath();
      c.moveTo(cursor.x,cursor.y);
      c.lineTo(closestX,closestY);
      c.strokeStyle = cg.settings.animationeditor.closestFrameLocator.lineColour;
      c.lineWidth = 2 * cg.settings.core.debugCGScale / camera.cz;
      c.stroke();
      c.beginPath();
      c.fillStyle = "white";
      c.arc(closestX,closestY,2*cg.settings.core.debugCGScale/camera.cz,0,Math.PI*2);
      c.fill();
      c.resetTransform();

      let text = `${closestAnimation.id}  part:${closestPart} x:${closestX} y:${closestY}  [${closestAnimation.data[closestPart]}]`;

      cg.Develop.drawTopLeftText(cg,canvas,text);
    };
  },

  instanceConnect(cg) {
    cg.AnimationEditor = new ChoreoGraph.AnimationEditor.InstanceObject();
    cg.AnimationEditor.cg = cg;

    cg.attachSettings("animationeditor",{
      active : false,
      grabDistance : 25,
      snapGridSize : 1,
      snapGridOffsetX : 0,
      snapGridOffsetY : 0,
      genericDecimalRounding : 3,
      timeDecimalRounding : 4,
      template : "2:transform,x|transform,y&",
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
      },
      closestFrameLocator : {
        active : false,
        lineColour : "#86acff"
      }
    });

    if (ChoreoGraph.Develop!==undefined) {
      ChoreoGraph.Develop.loops.process.push({cgid:cg.id,activeCheck:cg.settings.animationeditor,func:ChoreoGraph.AnimationEditor.processEditor});
      ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.animationeditor,func:ChoreoGraph.AnimationEditor.overlayEditor});
      ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.animationeditor.closestFrameLocator,func:ChoreoGraph.AnimationEditor.overlayClosestFrameLocator});

      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Animation Editor",
        inactiveText : "Animation Editor",
        activated : cg.settings.animationeditor,
        onActive : (cg) => { cg.settings.animationeditor.active = true; },
        onInactive : (cg) => { cg.settings.animationeditor.active = false; ChoreoGraph.AnimationEditor.removeInterface(cg); },
      });

      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Closest Frame Locator",
        inactiveText : "Closest Frame Locator",
        activated : cg.settings.animationeditor.closestFrameLocator,
        onActive : (cg) => { cg.settings.animationeditor.closestFrameLocator.active = true; },
        onInactive : (cg) => { cg.settings.animationeditor.closestFrameLocator.active = false; },
      });
    };
  },

  instanceStart(cg) {
    if (ChoreoGraph.Animation===undefined) { console.warn("Animation Editor requires Animation plugin"); return; }
    if (ChoreoGraph.AnimationEditor.initiated===false) {
      ChoreoGraph.AnimationEditor.init();
    }
  }
});