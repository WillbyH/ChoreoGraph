ChoreoGraph.plugin({
  name : "AnimationEditor",
  key : "AnimationEditor",
  version : "1.0",

  globalPackage : new class cgAnimationEditorPackage {
    instanceObject = class cgAnimationEditorInstancePackage {

      initInterface = false;
      animation = null;
      track = null;
      autobake = false;
      undoStack = [];
      redoStack = [];
      lastPack = null;
      template = "2:transform,x|transform,y&";

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
        keyEditing : null
      };

      path = {
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
          } else if (actionType==editor.ACTION_ADD&&editor.path.connectedMode&&track.segments.length>0) {
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
            let grabDistance = cg.settings.animationeditor.grabDistance*(1/cg.Input.cursor.canvas.camera.z);
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
          if (ChoreoGraph.Input.lastKeyDown==hotkeys.undo) {
            ChoreoGraph.AnimationEditor.undo(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.redo) {
            ChoreoGraph.AnimationEditor.redo(cg);
          } else if (ChoreoGraph.Input.lastKeyDown==hotkeys.pathAdd) {
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
    };

    overlayEditor(cg) {
      if (ChoreoGraph.Develop.cg.id!==cg.id) { return; }
      if (cg.Input===undefined) { return; }
      if (cg.Input.cursor.canvas.camera==null) { return; }
      let editor = cg.AnimationEditor;
      let pathStyle = cg.settings.animationeditor.pathStyle;
      let c = cg.Input.cursor.canvas.c;
      let track = editor.track;
      if (track==null) { return; }
      let size = 1/cg.Input.cursor.canvas.camera.z;
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

        for (let grabbablePoint of editor.path.grabbablePoints) {
          let point = grabbablePoint.point;
          let distance = Math.sqrt((cg.Input.cursor.x-point[0])**2+(cg.Input.cursor.y-point[1])**2);
          c.beginPath();
          if (distance<cg.settings.animationeditor.grabDistance*cg.Input.cursor.canvas.camera.z) {
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

        if (cg.AnimationEditor.template!=null) {
          newAnim.unpack(cg.AnimationEditor.template,false);
        }

        ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
        ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
      }
      section.appendChild(createNewButton);

      // SELECTED ANIMATION DROPDOWN
      let trackTypeDropdown = document.createElement("select");
      trackTypeDropdown.cg = cg;
      cg.AnimationEditor.ui.trackTypeDropdown = trackTypeDropdown;
      trackTypeDropdown.className = "develop_button";
      section.appendChild(trackTypeDropdown);

      for (let type in ChoreoGraph.Animation.TrackTypes) {
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
      }
      section.appendChild(addTrackButton);

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

    getTrackDopeSheetData(track) {
      let data = {
        type : track.type,
        keyFrames : [],
        editable : true
      };
      if (track.type==="path") {
        data.editable = false;
        let part = 0;
        for (let i=0;i<track.segments.length;i++) {
          let segment = track.segments[i];
          data.keyFrames.push({
            data : segment.start,
            part : part
          })
          let empties = segment.getScaledSampleSize(track.density);
          part += empties;
          if (!segment.connected) {
            data.keyFrames.push({
              data : segment.end,
              part : part
            })
            part++;
          }
        }
      } else if (track.type==="value") {
        for (let i=0;i<track.values.length;i++) {
          let value = track.values[i];
          if (value!==undefined) {
            data.keyFrames.push({
              data : value,
              part : i
            })
          }
        }
      }
      return data;
    }

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
        background:"#121212"
      },"animation_editor_dopesheet");
      canvas.setupParentElement(canvasParent);
      
      cg.graphicTypes.animation_editor_dopesheet = new class AnimationEditorDopeSheet {
        setup(init,cg) {
          this.dragging = false;
          this.dragDown = 0;
          this.dragSavedX = 0;
          this.dragSavedSpacing
          this.dragMode = null; // move resize

          this.hasSetInitalPosition = false;

          this.partSpacing = 20;

          this.selectedTrack = 0;
          this.selectedKeyFrame = 3;
        };
        draw(c,ax,ay) {
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
          c.lineWidth = 1.4;
          c.setLineDash([5,5]);
          c.stroke();
          c.setLineDash([]);

          let countTrackTypes = {};
          for (let track of cg.AnimationEditor.animation.tracks) {
            if (countTrackTypes[track.type]==undefined) { countTrackTypes[track.type] = 0; }
            countTrackTypes[track.type]++;
          }

          c.save();
          for (let trackIndex=0;trackIndex<animation.tracks.length;trackIndex++) {
            let trackY = trackIndex*20-(10*animation.tracks.length)+15;
            let track = animation.tracks[trackIndex];
            let data = ChoreoGraph.AnimationEditor.getTrackDopeSheetData(track);
            for (let keyFrameIndex=0;keyFrameIndex<data.keyFrames.length;keyFrameIndex++) {
              let keyFrame = data.keyFrames[keyFrameIndex];
              c.strokeStyle = "white";
              c.beginPath();
              c.arc(keyFrame.part*this.partSpacing,trackY,5,0,2*Math.PI);
              if (keyFrameIndex==this.selectedKeyFrame&&trackIndex==this.selectedTrack) {
                c.fillStyle = "#ff00ff";
                c.lineWidth = 5;
              } else {
                c.fillStyle = "#121212";
                c.lineWidth = 2;
              }
              c.stroke();
              c.fill();
            }
            c.font = "12px Arial";
            c.fillStyle = "#bbb";
            c.textAlign = "left";
            c.textBaseline = "middle";
            let name = animation.tracks[trackIndex].type;
            if (countTrackTypes[name]>1) {
              name += " "+(trackIndex+1);
            }
            if (track.type=="value"&&track.keys.v!==-1) {
              name += " ("+animation.keys[track.keys.v]+")";
            }
            c.lineWidth = 15;
            c.miterLimit = 2;
            c.strokeStyle = "#121212";
            c.strokeText(name,leftX+10,trackY+1);
            c.fillStyle = "#bbb";
            c.fillText(name,leftX+10,trackY+1);
          }
          c.restore();

          let animators = [];
          for (let objectId of this.cg.keys.objects) {
            let object = this.cg.objects[objectId];
            for (let component of object.objectData.components) {
              if (component.manifest.type=="Animator"&&component.animation.id==animation.id) {
                animators.push(component);
              }
            }
          }

          for (let i=0;i<animators.length;i++) {
            let animator = animators[i];
            c.beginPath();
            let t = 1-((animator.ent-animator.playhead)/(animator.ent-animator.stt));
            c.moveTo((animator.part+t)*this.partSpacing,-canvas.height/2);
            c.lineTo((animator.part+t)*this.partSpacing,canvas.height/2);
            c.strokeStyle = "white";
            c.lineWidth = 2;
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
        let height = cg.AnimationEditor.animation.tracks.length*20+40;
        if (cg.AnimationEditor.ui.dopeSheetCanvasContainer.style.height!==height+"px") {
          cg.AnimationEditor.ui.dopeSheetCanvasContainer.style.height = height+"px";
        }
      })

      return cg.AnimationEditor.ui.dopeSheetCanvasContainer;
    };

    setPathActionType(cg,type) {
      let editor = cg.AnimationEditor;
      editor.path.actionType = type;
      ChoreoGraph.AnimationEditor.updateTrackContext(cg);
    };

    updateTrackContext(cg) {
      let div = cg.AnimationEditor.ui.trackContext;
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
      } else if (cg.AnimationEditor.track.type=="value") {
        ChoreoGraph.AnimationEditor.createValueTrackContext(cg,div);
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
      copyJointsButton.innerHTML = "Copy Joint Path";
      copyJointsButton.classList.add("develop_button");
      copyJointsButton.classList.add("btn_action");
      copyJointsButton.cg = cg;
      copyJointsButton.onclick = (e) => {
        let data = e.target.cg.AnimationEditor.track.getJointPath();
        navigator.clipboard.writeText(data);
      };
      div.appendChild(copyJointsButton);
    };

    createValueTrackContext(cg,div) {
      
    };

    updateKeyEditing(cg) {
      let div = cg.AnimationEditor.ui.keyEditing;
      div.innerHTML = "";
      div.style.marginTop = "20px";

      let countTrackTypes = {};
      for (let track of cg.AnimationEditor.animation.tracks) {
        if (countTrackTypes[track.type]==undefined) { countTrackTypes[track.type] = 0; }
        countTrackTypes[track.type]++;
      }

      let trackLinks = [];
      for (let trackIndex=0;trackIndex<cg.AnimationEditor.animation.tracks.length;trackIndex++) {
        let track = cg.AnimationEditor.animation.tracks[trackIndex];
        for (let trackKey in track.keys) {
          let keyIndex = track.keys[trackKey];
          let name;
          if (countTrackTypes[track.type]>1) {
            name = track.type + trackIndex + " " + trackKey;
          } else {
            name = track.type + " " + trackKey;
          }
          let isUsedMoreThanOnce = false;
          for (let otherLinkIndex=0;otherLinkIndex<trackLinks.length;otherLinkIndex++) {
            let otherLink = trackLinks[otherLinkIndex];
            if (otherLink.name==name) { continue; }
            if (otherLink.keyIndex==keyIndex) {
              isUsedMoreThanOnce = true;
              otherLink.isUsedMoreThanOnce = true;
              break;
            }
          }
          let link = {
            name : name,
            keyIndex : keyIndex,
            trackIndex : trackIndex,
            trackKey : trackKey,
            isUsedMoreThanOnce : isUsedMoreThanOnce
          }
          trackLinks.push(link);
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
      for (let keySet of cg.AnimationEditor.animation.keys) {
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
          let prevIndex = animation.keys.indexOf("time");
          if (prevIndex>=0) {
            animation.keys[prevIndex] = animation.keys[e.target.keyIndex];
          }
          animation.keys[e.target.keyIndex] = "time";
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
            let keySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex];
            let prevKeySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex-1];
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex] = prevKeySet;
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex-1] = keySet;
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
            let keySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex];
            let nextKeySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex+1];
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex] = nextKeySet;
            e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex+1] = keySet;
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
          let keySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex];
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
          let keySet = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex];
          keySet.push("");
          ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
        };
        styleButton(addKeyButton);
        addKeyButton.style.marginRight = "5px";
        
        if (keySet === "time") {
          let timeLi = document.createElement("li");
          timeLi.style.display = "inline-block";
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
            keyValue.style.padding = "5px";
            keyValue.style.border = "2px solid white";
            keyValue.style.borderRadius = "5px";
            keyValue.style.background = "black";
            keyValue.style.color = "white";
            keyValue.style.fontFamily = "consolas";
            keyValue.style.width = "auto";
            keyValue.style.fieldSizing = "content";
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
              if (e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex][e.target.keySetIndex]===e.target.value) {
                isUnique = false;
              }
              if (hasIllegal) {
                e.target.value = e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex][e.target.keySetIndex];
                alert("You can not use: " + illegalChars);
              } else {
                e.target.cg.AnimationEditor.animation.keys[e.target.keyIndex][e.target.keySetIndex] = e.target.value;
              }
              if (isUnique&&!hasIllegal) {
                ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
              }
            };
            keySetIndex++;
          }

          let trackLinkDropdown = document.createElement("select");
          set.appendChild(trackLinkDropdown);
          trackLinkDropdown.cg = cg;
          trackLinkDropdown.keyIndex = keyIndex;
          styleButton(trackLinkDropdown,true);
          trackLinkDropdown.onchange = (e) => {
            let animation = e.target.cg.AnimationEditor.animation;
            let option = e.target.options[e.target.options.selectedIndex];
            let trackIndex = option.trackIndex;
            let keyIndex = e.target.keyIndex;
            let trackKey = option.trackKey;
            if (option.text=="") {
              animation.tracks[trackIndex].keys[trackKey] = -1;
            } else {
              for (let track of animation.tracks) {
                for (let key in track.keys) {
                  let trackKeyIndex = track.keys[key];
                  if (trackKeyIndex==keyIndex) {
                    track.keys[key] = -1;
                  }
                }
              }
              animation.tracks[trackIndex].keys[trackKey] = keyIndex;
            }
            ChoreoGraph.AnimationEditor.updateKeyEditing(e.target.cg);
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg);
          }
  
          let hasFoundCorrectLink = false;
          let unlinkOption;
          for (let link of trackLinks) {
            let option = document.createElement("option");
            option.text = link.name;
            option.keyIndex = keyIndex;
            option.trackIndex = link.trackIndex;
            option.trackKey = link.trackKey;
            if (link.keyIndex===-1) {
              option.style.color = "red";
            } else if (link.isUsedMoreThanOnce) {
              option.style.color = "orange";
            }
            trackLinkDropdown.add(option);
            if (link.keyIndex==keyIndex) {
              hasFoundCorrectLink = true;
              trackLinkDropdown.value = link.name;
              unlinkOption = document.createElement("option");
              unlinkOption.text = "";
              unlinkOption.trackIndex = link.trackIndex;
              unlinkOption.trackKey = link.trackKey;
              if (link.isUsedMoreThanOnce) {
                trackLinkDropdown.style.color = "orange";
              }
            }
          }
          if (!hasFoundCorrectLink) {
            trackLinkDropdown.value = "";
          } else {
            trackLinkDropdown.add(unlinkOption);
          }
        }
        keyIndex++;
      }
      let addKeySetButton = document.createElement("button");
      div.appendChild(addKeySetButton);
      addKeySetButton.innerHTML = "Add New Key Set +";
      addKeySetButton.cg = cg;
      addKeySetButton.style.fontStyle = "italic";
      addKeySetButton.onclick = (e) => {
        let animation = e.target.cg.AnimationEditor.animation;
        if (animation.keys.indexOf("time")===-1) {
          animation.keys.push("time");
        } else {
          animation.keys.push([""]);
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
            ChoreoGraph.AnimationEditor.updateAnimationOverview(e.target.cg,false);
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
          cg.AnimationEditor.undoStack.push(cg.AnimationEditor.lastPack);
          cg.AnimationEditor.animation.unpack(packedData,cg.AnimationEditor.autobake);
          ChoreoGraph.AnimationEditor.restartAllAnimators(cg);
          ChoreoGraph.AnimationEditor.updateKeyEditing(cg);
          ChoreoGraph.AnimationEditor.updateAnimationOverview(cg);
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
          if (component.manifest.type=="Animator"&&component.animation.id==cg.AnimationEditor.animation.id) {
            component.playFrom(0);
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
      if (cg.AnimationEditor.undoStack.length>0) {
        let selectedType = cg.AnimationEditor.track.type;
        let packedData = cg.AnimationEditor.undoStack.pop();
        cg.AnimationEditor.redoStack.push(cg.AnimationEditor.animation.pack());
        cg.AnimationEditor.animation.unpack(packedData,cg.AnimationEditor.autobake);

        this.selectFirstTrackByType(cg,selectedType);
      }
      this.updateKeyEditing(cg);
      this.updateAnimationOverview(cg,false);
    };

    redo(cg) {
      if (cg.AnimationEditor.redoStack.length>0) {
        let selectedType = cg.AnimationEditor.track.type;
        let packedData = cg.AnimationEditor.redoStack.pop();
        cg.AnimationEditor.undoStack.push(cg.AnimationEditor.animation.pack());
        cg.AnimationEditor.animation.unpack(packedData,cg.AnimationEditor.autobake);

        this.selectFirstTrackByType(cg,selectedType);
      }
      this.updateKeyEditing(cg);
      this.updateAnimationOverview(cg,false);
    };
  },

  instanceConnect(cg) {
    cg.AnimationEditor = new ChoreoGraph.AnimationEditor.instanceObject();
    cg.AnimationEditor.cg = cg;

    cg.attachSettings("animationeditor",{
      active : false,
      grabDistance : 25,
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
    });

    if (ChoreoGraph.Develop!==undefined) {
      ChoreoGraph.Develop.loops.process.push({cgid:cg.id,activeCheck:cg.settings.animationeditor,func:ChoreoGraph.AnimationEditor.processEditor});
      ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.animationeditor,func:ChoreoGraph.AnimationEditor.overlayEditor});

      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Animation Editor",
        inactiveText : "Animation Editor",
        activated : cg.settings.animationeditor,
        onActive : (cg) => { cg.settings.animationeditor.active = true; },
        onInactive : (cg) => { cg.settings.animationeditor.active = false; ChoreoGraph.AnimationEditor.removeInterface(cg); },
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