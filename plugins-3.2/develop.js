ChoreoGraph.plugin({
  name : "Develop",
  key : "Develop",
  version : "2.0",

  globalPackage : new class cgDevelop {
    #cg = null;
    get cg() { return this.#cg; }
    set cg(cg) {
      this.#cg = cg;
      ChoreoGraph.Develop.generateInterface();
    };

    style = {
      off : "#ff0000",
      on : "#008000",
      action : "#ffc0cb"
    };

    changedSelectedInstanceHotkey = "ctrl+shift";
    createInterfaces = true;

    instanceObject = class Develop {
      interfaceItems = [];

      constructor(cg) {
        this.cg = cg;

        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Disable FreeCam",
          inactiveText : "Enable FreeCam",
          activated : this.featureData.freeCam,
          onActive : (cg) => { cg.Develop.enableFreeCam(); },
          onInactive : (cg) => { cg.Develop.disableFreeCam(); }
        });
        this.interfaceItems.push({
          type : "UIActionButton",
          text : "Reset FreeCam",
          action : (cg) => { cg.Develop.resetFreeCam(); }
        });
        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Hide Cameras",
          inactiveText : "Show Cameras",
          activated : this.cg.settings.develop.cameras,
          onActive : (cg) => { cg.settings.develop.cameras.active = true; },
          onInactive : (cg) => { cg.settings.develop.cameras.active = false; }
        });
        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Hide Culling Boxes",
          inactiveText : "Show Culling Boxes",
          activated : this.cg.settings.develop.frustumCulling,
          onActive : (cg) => { cg.settings.develop.frustumCulling.active = true; },
          onInactive : (cg) => { cg.settings.develop.frustumCulling.active = false; }
        });
        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Hide FPS",
          inactiveText : "Show FPS",
          activated : this.cg.settings.develop.fps,
          onActive : (cg) => { cg.settings.develop.fps.active = true; },
          onInactive : (cg) => { cg.settings.develop.fps.active = false; }
        });
        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Hide Object Annotation",
          inactiveText : "Show Object Annotation",
          activated : this.cg.settings.develop.objectAnnotation,
          onActive : (cg) => { cg.settings.develop.objectAnnotation.active = true; },
          onInactive : (cg) => { cg.settings.develop.objectAnnotation.active = false; }
        });
        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Object Gizmo",
          inactiveText : "Object Gizmo",
          activated : this.cg.settings.develop.objectGizmo,
          onActive : (cg) => { cg.settings.develop.objectGizmo.active = true; },
          onInactive : (cg) => { cg.settings.develop.objectGizmo.active = false; }
        });
        this.interfaceItems.push({
          type : "UIToggleButton",
          activeText : "Path Editor",
          inactiveText : "Path Editor",
          activated : this.featureData.pathEditor,
          onActive : (cg) => { cg.Develop.featureData.pathEditor.active = true; ChoreoGraph.Develop.createPathEditorInterface(cg); },
          onInactive : (cg) => { cg.Develop.featureData.pathEditor.active = false; ChoreoGraph.Develop.hidePathEditorInterface(cg); },
        });
      };

      _selectedCanvas = null;
      set selectedCanvas(canvas) {
        if (this._selectedCanvas==null||this._selectedCanvas.id != canvas.id) {
          this._selectedCanvas = canvas;
          // if (ChoreoGraph.Develop.initiated) {
          //   ChoreoGraph.Develop.generateInterface();
          // }
        }
      }
      get selectedCanvas() {
        return this._selectedCanvas;
      }

      get cursor() { return this.canvasCursors[this.cg.settings.core.defaultCanvas.id]; }
      canvasCursors = {};
      lastInputType = "mouse";
      lastInteraction = {
        cursor : -Infinity,
        keyboard : -Infinity
      };

      updateCursor(canvas,event) {
        this.cg.Input.lastInputType = event.pointerType;
        const cursor = this.canvasCursors[canvas.id];
        if (cursor===undefined) { return; }
        cursor.update(event);
      };

      featureData = {
        freeCam : {
          active : false,
          canvasData : {},
          downCursorPosition : {x:0,y:0},
          downCameraPosition : {x:0,y:0},
          dragging : false
        },
        fps : {
          previous : []
        },
        objectGizmo : {
          active : false,
          mode : "translate",
          grabMode : "",
          selectedScene : null,
          selectedObject : null,
          originalPosition: [0,0],
          originalScale: [1,1],
          originalRotation: 0,
          cursorDownPosition : [0,0],
          modifiedObjects : {},
          lastTopTextFramee : -1
        },
        topLeftText : {
          lastDrawFrame : -1,
          countByCanvas : {}
        },
        pathEditor : {
          active : false,
          selectedPath : null,
          selectedPathIndex : -1,
          undoBuffer : [],
          redoBuffer : [],
          grabbing : false,
          originalPosition : [],
          section : null,
          dropdown : null
        }
      };

      enableFreeCam() {
        this.featureData.freeCam.active = true;
        let canvas = this.cg.Develop.selectedCanvas;
        if (this.featureData.freeCam.canvasData[canvas.id]===undefined) {
          let transform = this.cg.createTransform({x:canvas.camera.transform.x,y:canvas.camera.transform.y},"develop_freeCam-"+canvas.id);
          let freeCamera = this.cg.createCamera({
            transform : transform,
            z : canvas.camera.z,
            canvasSpaceScale : canvas.camera.canvasSpaceScale,
            canvas : canvas,
            scaleMode : canvas.camera.scaleMode,
            WHRatio : canvas.camera.WHRatio,
            maximumSize : canvas.camera.maximumSize,
            maximumWidth : canvas.camera.maximumWidth,
            maximumHeight : canvas.camera.maximumHeight,
            minimumSize : canvas.camera.minimumSize,
            minimumWidth : canvas.camera.minimumWidth,
            minimumHeight : canvas.camera.minimumHeight,
            pixelScale : canvas.camera.pixelScale,
            cullOverride : canvas.camera,
            inactiveCanvas : canvas
          },"develop_freeCam-"+canvas.id);
          for (let scene of canvas.camera.scenes) {
            freeCamera.addScene(scene);
          }
          this.featureData.freeCam.canvasData[canvas.id] = {
            savedCamera : canvas.camera,
            freeCamera : freeCamera
          };
        };
        let canvasData = this.featureData.freeCam.canvasData[canvas.id];
        canvas.camera.inactiveCanvas = canvas;
        canvas.setCamera(canvasData.freeCamera);
      };

      disableFreeCam() {
        this.featureData.freeCam.active = false;
        let canvas = this.cg.Develop.selectedCanvas;
        let canvasData = this.featureData.freeCam.canvasData[canvas.id];
        canvas.setCamera(canvasData.savedCamera);
      };

      resetFreeCam() {
        let canvas = this.cg.Develop.selectedCanvas;
        let canvasData = this.featureData.freeCam.canvasData[canvas.id];
        if (canvasData===undefined) { return; }
        canvasData.freeCamera.transform.x = canvasData.savedCamera.x;
        canvasData.freeCamera.transform.y = canvasData.savedCamera.y;
        canvasData.freeCamera.z = canvasData.savedCamera.z;
      }

      developProcessLoop(cg) {
        for (let loop of ChoreoGraph.Develop.loops.process) {
          if (loop.activeCheck.active&&loop.cgid===cg.id) {
            loop.func(cg);
          }
        }
      };

      processFreecam(cg) {
        let data = cg.Develop.featureData.freeCam;
        if (!data.active) { return; }
        if (cg.Input===undefined) {
          data.active = false;
          console.warn("FreeCam requires the Input plugin");
          return;
        }
        if (ChoreoGraph.Input.keyStates.shift) {
          let canvas = cg.Develop.selectedCanvas;
          let camera = data.canvasData[canvas.id].freeCamera;
          if (data.dragging) {
            if (!cg.Input.cursor.hold.any) {
              data.dragging = false;
              return;
            }
            let xo = (data.downCursorPosition.x - cg.Input.cursor.canvasX)/camera.cz;
            let yo = (data.downCursorPosition.y - cg.Input.cursor.canvasY)/camera.cz;
            camera.transform.x = data.downCameraPosition.x + xo;
            camera.transform.y = data.downCameraPosition.y + yo;
          } else {
            if (cg.Input.cursor.hold.any) {
              data.dragging = true;
              data.downCameraPosition = {
                x : camera.transform.x,
                y : camera.transform.y
              };
              data.downCursorPosition = {
                x : cg.Input.cursor.canvasX,
                y : cg.Input.cursor.canvasY
              };
            }
          }
        }
      };

      developOverlayLoop(cg) {
        for (let loop of ChoreoGraph.Develop.loops.overlay) {
          if (loop.activeCheck.active&&loop.cgid===cg.id) {
            loop.func(cg);
          }
        }
      };

      overlayCameras(cg) {
        let byScene = {};
        for (let cameraId of cg.keys.cameras) {
          let camera = cg.cameras[cameraId];
          for (let scene of camera.scenes) {
            if (byScene[scene.id]===undefined) {
              byScene[scene.id] = [];
            }
            byScene[scene.id].push(camera);
          }
        }
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.hideDebugOverlays) { continue; }
          let c = canvas.c;
          c.globalAlpha = 1;
          if (canvas.camera===null) { continue; }
          for (let scene of canvas.camera.scenes) {
            let cameras = byScene[scene.id];

            for (let camera of cameras) {
              if (camera.id==canvas.camera.id) { continue; }
              ChoreoGraph.transformContext(canvas.camera,camera.x,camera.y);
              c.strokeStyle = cg.settings.develop.cameras.colour;
              let cw = canvas.width/camera.cz;
              let ch = canvas.height/camera.cz;
              c.lineWidth = 2 * cg.settings.core.debugCGScale / canvas.camera.cz;
              c.beginPath();
              c.rect(-cw*0.5,-ch*0.5,cw,ch)
              c.moveTo(-cw*0.5,-ch*0.5);
              c.lineTo(cw*0.5,ch*0.5);
              c.moveTo(cw*0.5,-ch*0.5);
              c.lineTo(-cw*0.5,ch*0.5);
              c.stroke();
            }
          }
        }
      };

      overlayFrustumCulling(cg) {
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.hideDebugOverlays) { continue; }
          let c = canvas.c;
          let cullCamera = canvas.camera;
          if (cullCamera===null) { continue; }
          if (cullCamera.cullOverride!==null) { cullCamera = cullCamera.cullOverride; }
          ChoreoGraph.transformContext(canvas.camera,cullCamera.x,cullCamera.y);
          c.strokeStyle = cg.settings.develop.frustumCulling.frustumColour;
          c.lineWidth = 3 * cg.settings.core.debugCGScale / canvas.camera.cz;
          let height = canvas.height / cullCamera.cz;
          let width = canvas.width / cullCamera.cz;
          c.strokeRect(-width*0.5,-height*0.5,width,height);

          function drawCullBox(item) {
            let [bw, bh, bx, by] = item.graphic.getBounds();
            let gx = item.transform.x + bx;
            let gy = item.transform.y + by;
            let gax = item.transform.ax;
            let gay = item.transform.ay;
            bw *= item.transform.sx;
            bh *= item.transform.sy;
            if (item.transform.r!==0) {
              let r = -item.transform.r+90;
              let rad = r*Math.PI/180;
              let savedbh = bh;
              bh = Math.abs(bw*Math.cos(rad))+Math.abs(bh*Math.sin(rad));
              bw = Math.abs(bw*Math.sin(rad))+Math.abs(savedbh*Math.cos(rad));

              let rox = Math.sin(rad)*gax-Math.cos(rad)*gay;
              let roy = Math.cos(rad)*gax+Math.sin(rad)*gay;
              gx += rox;
              gy += roy;
            } else {
              gx += gax;
              gy += gay;
            }
            let cx = cullCamera.x;
            let cy = cullCamera.y;
            let cw = canvas.width/cullCamera.cz;
            let ch = canvas.height/cullCamera.cz;

            c.strokeStyle = cg.settings.develop.frustumCulling.unculledBoxColour;
            if (gx+bw*0.5<cx-cw*0.5||gx-bw*0.5>cx+cw*0.5||gy+bh*0.5<cy-ch*0.5||gy-bh*0.5>cy+ch*0.5) {
              c.strokeStyle = cg.settings.develop.frustumCulling.culledBoxColour;
            }

            ChoreoGraph.transformContext(canvas.camera,gx,gy);

            c.strokeRect(-bw/2,-bh/2,bw,bh);
          }

          function drawCollectionCullBoxes(collection) {
            for (let item of collection) {
              if (item.type=="graphic"&&item.graphic.getBounds!==undefined&&item.transform.CGSpace) {
                drawCullBox(item);
              } else if (item.type=="collection") {
                drawCollectionCullBoxes(item.children);
              }
            }
          }

          for (let scene of cullCamera.scenes) {
            drawCollectionCullBoxes(scene.drawBuffer);
          }
        }
      };

      overlayFPS(cg) {
        ChoreoGraph.settings.storeProcessTime = true;
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.hideDebugOverlays) { continue; }
          let fps = 1000/ChoreoGraph.timeDelta;
          if (cg.Develop.featureData.fps.previous.length>30) {
            cg.Develop.featureData.fps.previous.shift();
          } else {
            cg.Develop.featureData.fps.previous.push(fps);
          }

          let average = 0;
          for (let f of cg.Develop.featureData.fps.previous) {
            average += f;
          }
          average /= cg.Develop.featureData.fps.previous.length;
          let text = Math.round(fps*10)/10+"fps";
          text += " (" + Math.round(ChoreoGraph.processTime*10)/10 + "ms)";

          cg.Develop.drawTopLeftText(cg,canvas,text);
        }
      };

      drawTopLeftText(cg,canvas,text) {
        let topLeftText = cg.Develop.featureData.topLeftText;
        if (topLeftText.lastDrawFrame!=ChoreoGraph.frame) {
          topLeftText.lastDrawFrame = ChoreoGraph.frame;
          topLeftText.countByCanvas = {};
        }
        if (topLeftText.countByCanvas[canvas.id]===undefined) {
          topLeftText.countByCanvas[canvas.id] = 0;
        }
        let c = canvas.c;
        let scale = cg.settings.core.debugCanvasScale;
        let height = 26*scale;
        let yOffset = topLeftText.countByCanvas[canvas.id] * height;
        c.resetTransform();
        c.font = 14*scale+"px Arial";
        c.fillStyle = "black";
        c.globalAlpha = 0.3;
        c.textBaseline = "bottom";
        c.fillRect(0,yOffset,c.measureText(text).width+10*scale,height);

        c.globalAlpha = 1;
        c.fillStyle = "white";
        c.textAlign = "left";
        c.textBaseline = "top";
        c.fillText(text,5*scale,7*scale+yOffset);

        topLeftText.countByCanvas[canvas.id]++;
      };

      overlayObjectAnnotation(cg) {
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.hideDebugOverlays) { continue; }
          let camera = canvas.camera;
          if (camera===null) { continue; }
          ChoreoGraph.transformContext(camera);
          let c = canvas.c;
          c.font = cg.settings.develop.objectAnnotation.fontSize*cg.settings.core.debugCGScale+"px Arial";
          c.textAlign = "center";
          c.fillStyle = cg.settings.develop.objectAnnotation.textColour;
          for (let scene of camera.scenes) {
            for (let object of scene.objects) {
              let x = object.transform.x;
              let y = object.transform.y;
              let text = cg.settings.develop.objectAnnotation.keySet.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object);
              if (text===undefined||text==="") { continue; }
              x += cg.settings.develop.objectAnnotation.offsetX * cg.settings.core.debugCGScale;
              y += cg.settings.develop.objectAnnotation.offsetY * cg.settings.core.debugCGScale;
              for (let removeText of cg.settings.develop.objectAnnotation.removeText) {
                text = text.replace(removeText,"");
              }
              c.fillText(text,x,y);
            }
          }
        }
      };

      overlayObjectGizmo(cg) {
        let gizmoSettings = cg.settings.develop.objectGizmo;
        let colours = gizmoSettings.colours;
        let gizmoData = cg.Develop.featureData.objectGizmo;
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.hideDebugOverlays) { continue; }
          let camera = canvas.camera;
          if (camera===null) { continue; }
          ChoreoGraph.transformContext(camera);
          let cursor = cg.Input.canvasCursors[canvas.id];
          let c = canvas.c;

          // SELECTION CIRCLES
          c.font = 6*cg.settings.core.debugCGScale+"px Arial";
          c.textAlign = "center";
          c.fillStyle = cg.settings.develop.objectAnnotation.textColour;
          if (gizmoData.grabMode=="") {
            for (let scene of camera.scenes) {
              let objects = scene.objects;
              if (objects.length==0) {
                for (let objId of cg.keys.objects) {
                  objects.push(cg.objects[objId]);
                }
              }
              for (let object of objects) {
                if (gizmoData.selectedObject===object) { continue; }
                let x = object.transform.x;
                let y = object.transform.y;

                let grabDistance = 20 * cg.settings.core.debugCGScale / camera.cz;

                let distanceFromSelected = Infinity;
                if (gizmoData.selectedObject!==null&&gizmoData.selectedScene==scene) {
                  let selectedX = gizmoData.selectedObject.transform.x;
                  let selectedY = gizmoData.selectedObject.transform.y;
                  distanceFromSelected = Math.sqrt((x - selectedX)**2 + (y - selectedY)**2);
                }

                c.lineWidth = 2 * cg.settings.core.debugCGScale / camera.cz;
                c.strokeStyle = colours.unhoveredSelection;
                let distance = Math.sqrt((cursor.x - x)**2 + (cursor.y - y)**2);
                if (distanceFromSelected < 70 * cg.settings.core.debugCGScale / camera.cz) { grabDistance /= 3.5; }
                if (distance < grabDistance) {
                  c.strokeStyle = colours.hoveredSelection;
                  if (cursor.impulseUp.any||cursor.impulseDown.any) {
                    gizmoData.selectedObject = object;
                    gizmoData.selectedScene = scene;
                  }
                }
                c.beginPath();
                c.arc(x,y,grabDistance,0,Math.PI*2);
                c.stroke();
              }
            }
          }
        }

        if (gizmoData.selectedObject===null||gizmoData.selectedScene===null) { return; }

        let canvas = cg.Develop.selectedCanvas;
        let camera = canvas.camera;
        if (camera===null) { return; }
        let c = canvas.c;

        ChoreoGraph.transformContext(camera);

        let x = gizmoData.selectedObject.transform.x;
        let y = gizmoData.selectedObject.transform.y;

        let gizmoSize = 20 * cg.settings.core.debugCGScale / camera.cz;

        if (ChoreoGraph.Input.lastKeyDown==gizmoSettings.hotkeySwitchMode&&ChoreoGraph.Input.lastKeyDownFrame==ChoreoGraph.frame) {
          if (gizmoData.mode=="translate") {
            gizmoData.mode = "rotate";
          } else if (gizmoData.mode=="rotate") {
            gizmoData.mode = "scale";
          } else if (gizmoData.mode=="scale") {
            gizmoData.mode = "translate";
          }
        }

        function modified() {
          let object = gizmoData.selectedObject;
          let ids = Object.keys(gizmoData.modifiedObjects);

          function round(number) {
            let rounding = gizmoSettings.rounding;
            return Math.round(number*Math.pow(10,rounding))/Math.pow(10,rounding);
          }

          if (ids.indexOf(gizmoData.selectedObject.id)<0) {
            gizmoData.modifiedObjects[gizmoData.selectedObject.id] = {
              translate : gizmoData.mode == "translate",
              scale : gizmoData.mode == "scale",
              rotate : gizmoData.mode == "rotate"
            };
          } else {
            gizmoData.modifiedObjects[gizmoData.selectedObject.id][gizmoData.mode] = true;

            if (gizmoData.lastTopTextFramee!=ChoreoGraph.frame) {
              let text;
              if (gizmoData.mode == "translate") {
                text = round(object.transform.x) + "," + round(object.transform.y);
              } else if (gizmoData.mode == "scale") {
                text = round(object.transform.sx) + "," + round(object.transform.sy);
              } else if (gizmoData.mode == "rotate") {
                text = Math.floor(object.transform.r);
              }
              canvas.c.save();
              gizmoData.lastTopTextFramee = ChoreoGraph.frame;
              cg.Develop.drawTopLeftText(cg,canvas,text);
              canvas.c.restore();
            }
          }

          let div = document.getElementById("develop_gizmo_dump");
          div.innerHTML = "";
          for (let id of ids) {
            let object = cg.objects[id];
            let span = document.createElement("span");
            span.style.fontFamily = "monospace";
            span.innerText = id + " ";
            if (gizmoData.modifiedObjects[id].translate) {
              span.innerText += "x,y: " + round(object.transform.x) + "," + round(object.transform.y) + "  ";
            }
            if (gizmoData.modifiedObjects[id].scale) {
              span.innerText += "sx,sy: " + round(object.transform.sx) + "," + round(object.transform.sy) + "  ";
            }
            if (gizmoData.modifiedObjects[id].rotate) {
              span.innerText += "r: " + Math.floor(object.transform.r);
            }
            div.appendChild(span);
            div.appendChild(document.createElement("br"));
          }
        }

        let cursor = cg.Input.canvasCursors[canvas.id];
        let handSize = gizmoSize * 1;
        let armLength = gizmoSize * 3;

        // TRANSLATE MODE
        if (gizmoData.mode=="translate") {
          let curX = cursor.x;
          let curY = cursor.y;

          let cursorHoverMultiAxis = curX > x && curX < x + handSize*1.1 && curY < y && curY > y - handSize*1.1;
          let cursorHoverXAxis = curX > x && curX < x + armLength*1.3 && curY > y - handSize/2 && curY < y + handSize/2 && !cursorHoverMultiAxis;
          let cursorHoverYAxis = curY < y && curY > y - armLength*1.3 && curX > x - handSize/2 && curX < x + handSize/2 && !cursorHoverMultiAxis && !cursorHoverXAxis;

          if ((cursorHoverMultiAxis||cursorHoverXAxis||cursorHoverYAxis)&&cursor.impulseDown.any) {
            let transform = gizmoData.selectedObject.transform;
            gizmoData.originalPosition = [transform.x,transform.y];
            gizmoData.cursorDownPosition = [cursor.x,cursor.y];
            if (cursorHoverMultiAxis) {
              gizmoData.grabMode = "multiAxis";
            } else if (cursorHoverXAxis) {
              gizmoData.grabMode = "xAxis";
            } else if (cursorHoverYAxis) {
              gizmoData.grabMode = "yAxis";
            }
          }

          if (cursor.impulseUp.any) {
            gizmoData.grabMode = "";
          }

          let dx = cursor.x - gizmoData.cursorDownPosition[0];
          let dy = cursor.y - gizmoData.cursorDownPosition[1];
          if (gizmoData.grabMode=="xAxis"||gizmoData.grabMode=="multiAxis") {
            let x = gizmoData.originalPosition[0] + dx;
            if (ChoreoGraph.Input.keyStates[gizmoSettings.hotkeySnap]) {
              x += gizmoSettings.snapXOffset;
              x = Math.round(x/gizmoSettings.positionSnap)*gizmoSettings.positionSnap;
            }
            gizmoData.selectedObject.transform.x = x;
            modified();
          }
          if (gizmoData.grabMode=="yAxis"||gizmoData.grabMode=="multiAxis") {
            let y = gizmoData.originalPosition[1] + dy;
            if (ChoreoGraph.Input.keyStates[gizmoSettings.hotkeySnap]) {
              y += gizmoSettings.snapYOffset;
              y = Math.round(y/gizmoSettings.positionSnap)*gizmoSettings.positionSnap;
            }
            gizmoData.selectedObject.transform.y = y;
            modified();
          }

          c.strokeStyle = colours.gizmoOther;
          c.lineWidth = handSize/4;
          if (cursorHoverMultiAxis&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.beginPath();
          c.rect(x,y-handSize,handSize,handSize);
          c.stroke();
          c.lineWidth = handSize/3;
          c.fillStyle = colours.gizmoX;
          c.strokeStyle = colours.gizmoX;
          c.globalAlpha = 1;
          if (cursorHoverXAxis&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.beginPath();
          c.moveTo(x,y);
          c.lineTo(x+armLength,y);
          c.lineTo(x+armLength,y-(handSize/3));
          c.lineTo(x+armLength+(handSize/2),y);
          c.lineTo(x+armLength,y+(handSize/3));
          c.lineTo(x+armLength,y);
          c.stroke();
          c.globalAlpha = 1;
          if (cursorHoverYAxis&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.fillStyle = colours.gizmoY;
          c.strokeStyle = colours.gizmoY;
          c.beginPath();
          c.moveTo(x,y+gizmoSize*0.16);
          c.lineTo(x,y-armLength);
          c.lineTo(x-(handSize/3),y-armLength);
          c.lineTo(x,y-armLength-(handSize/2));
          c.lineTo(x+(handSize/3),y-armLength);
          c.lineTo(x,y-armLength);
          c.stroke();

        // SCALE MODE
        } else if (gizmoData.mode=="scale") {
          let curX = cursor.x;
          let curY = cursor.y;

          let cursorHoverMultiAxis = curX > x && curX < x + handSize*1.1 && curY < y && curY > y - handSize*1.1;
          let cursorHoverXAxis = curX > x && curX < x + armLength*1.3 && curY > y - handSize/2 && curY < y + handSize/2 && !cursorHoverMultiAxis;
          let cursorHoverYAxis = curY < y && curY > y - armLength*1.3 && curX > x - handSize/2 && curX < x + handSize/2 && !cursorHoverMultiAxis && !cursorHoverXAxis;

          if ((cursorHoverMultiAxis||cursorHoverXAxis||cursorHoverYAxis)&&cursor.impulseDown.any) {
            let transform = gizmoData.selectedObject.transform;
            gizmoData.originalScale = [transform.sx,transform.sy];
            gizmoData.cursorDownPosition = [cursor.x,cursor.y];
            if (cursorHoverMultiAxis) {
              gizmoData.grabMode = "multiAxis";
            } else if (cursorHoverXAxis) {
              gizmoData.grabMode = "xAxis";
            } else if (cursorHoverYAxis) {
              gizmoData.grabMode = "yAxis";
            }
          }

          if (cursor.impulseUp.any) {
            gizmoData.grabMode = "";
          }

          let downPosX = gizmoData.cursorDownPosition[0];
          let downPosY = gizmoData.cursorDownPosition[1];
          let originalX = gizmoData.originalScale[0];
          let originalY = gizmoData.originalScale[1];
          if (gizmoData.grabMode=="xAxis"||gizmoData.grabMode=="multiAxis") {
            gizmoData.selectedObject.transform.sx = originalX*(((curX-downPosX)/handSize)+1);
            modified();
          }
          if (gizmoData.grabMode=="yAxis"||gizmoData.grabMode=="multiAxis") {
            gizmoData.selectedObject.transform.sy = originalY*(((-(curY-downPosY))/handSize)+1);
            modified();
          }

          c.strokeStyle = colours.gizmoOther;
          c.lineWidth = handSize/4;
          if (cursorHoverMultiAxis&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.beginPath();
          c.rect(x,y-handSize,handSize,handSize);
          c.stroke();
          c.lineWidth = handSize/3;
          c.fillStyle = colours.gizmoX;
          c.strokeStyle = colours.gizmoX;
          c.globalAlpha = 1;
          if (cursorHoverXAxis&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.beginPath();
          c.moveTo(x,y);
          c.lineTo(x+armLength,y);
          c.rect(x+armLength-handSize/3,y-(handSize/6),handSize/3,handSize/3);
          c.lineTo(x+armLength,y);
          c.stroke();
          c.globalAlpha = 1;
          if (cursorHoverYAxis&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.fillStyle = colours.gizmoY;
          c.strokeStyle = colours.gizmoY;
          c.beginPath();
          c.moveTo(x,y+gizmoSize*0.16);
          c.lineTo(x,y-armLength);
          c.rect(x-(handSize/6),y-armLength,handSize/3,handSize/3);
          c.lineTo(x,y-armLength);
          c.stroke();

        // ROTATE MODE
        } else if (gizmoData.mode=="rotate") {
          let circleRadius = gizmoSize * 2;

          let distance = Math.sqrt((cursor.x - x)**2 + (cursor.y - y)**2);
          let hoverCircle = distance < circleRadius*1.3;

          if (hoverCircle&&cursor.impulseDown.any) {
            gizmoData.originalRotation = gizmoData.selectedObject.transform.r;
            gizmoData.cursorDownPosition = [cursor.x,cursor.y];
            gizmoData.grabMode = "rotate";
          }

          if (cursor.impulseUp.any) {
            gizmoData.grabMode = "";
          }

          if (gizmoData.grabMode=="rotate") {
            let angle = Math.atan2(cursor.y-y,cursor.x-x);
            let startAngle = Math.atan2(gizmoData.cursorDownPosition[1]-y,gizmoData.cursorDownPosition[0]-x);
            let offset = (angle-startAngle)*180/Math.PI;
            let rotation = gizmoData.originalRotation+offset;
            if (ChoreoGraph.Input.keyStates[gizmoSettings.hotkeySnap]) {
              rotation = Math.round(rotation/gizmoSettings.rotationSnap)*gizmoSettings.rotationSnap;
            }
            if (rotation<0) {
              rotation += 360;
            }
            gizmoData.selectedObject.transform.r = rotation;
            modified();
          }

          c.strokeStyle = colours.gizmoOther;
          c.lineWidth = gizmoSize/2;
          if (hoverCircle&&gizmoData.grabMode=="") { c.globalAlpha = 0.5; }
          c.beginPath();
          c.arc(x,y,circleRadius,0,Math.PI*2);
          c.stroke();
          c.globalAlpha = 1;
        }
      };
    };

    loops = {
      process : [],
      overlay : []
    };

    wheel(event) {
      for (let cg of ChoreoGraph.instances) {
        if (cg.Develop.featureData.freeCam.active&&ChoreoGraph.Input.keyStates.shift) {
          let canvas = cg.Develop.selectedCanvas;
          if (event.target.cgCanvas!==canvas) { continue; }
          let camera = cg.Develop.featureData.freeCam.canvasData[canvas.id].freeCamera;
          let scrollSpeed = cg.settings.develop.freeCam.zoomSpeed;
          let magnitude = 0.1;
          if (event.deltaY<0) { magnitude = -0.1; }
          let change = Math.abs(magnitude)/scrollSpeed
          if (event.deltaY<0) { camera.z*=1+change; } else { camera.z*=1-change; }
        }
      }
    }

    section = document.createElement("section");
    infoDump = document.createElement("div");

    generateInterface() {
      if (!ChoreoGraph.Develop.createInterfaces) { return; }
      let cg = ChoreoGraph.Develop.cg;
      ChoreoGraph.Develop.section.innerHTML = "";

      ChoreoGraph.Develop.section.appendChild(ChoreoGraph.Develop.infoDump);
      let gizmoDump = document.createElement("div");
      gizmoDump.id = "develop_gizmo_dump";
      ChoreoGraph.Develop.infoDump.appendChild(gizmoDump)

      if (ChoreoGraph.instances.length>1) {
        let selectedInstanceDiv = document.createElement("div");
        selectedInstanceDiv.innerText = "Selected Instance: "+cg.id;
        ChoreoGraph.Develop.section.appendChild(selectedInstanceDiv);
      }
      for (let item of cg.Develop.interfaceItems) {
        let newItem = new ChoreoGraph.Develop[item.type](item,this.cg);
        ChoreoGraph.Develop.section.appendChild(newItem.element);
      }
    };

    hidePathEditorInterface(cg) {
      let section = cg.Develop.featureData.pathEditor.section;
      if (section===null) { return; }
      section.style.display = "none";
    };

    createPathEditorInterface(cg) {
      let data = cg.Develop.featureData.pathEditor;
      let section = data.section;
      if (section!==null) { section.style.display = "block"; return; }
      data.section = document.createElement("section");
      section = data.section;
      section.style.marginBottom = "20px";
      ChoreoGraph.Develop.section.prepend(section);

      cg.debugLoops.push(ChoreoGraph.Develop.pathEditorOverlayLoop);

      // SELECTED PATH DROPDOWN
      let dropdown = document.createElement("select");
      data.dropdown = dropdown;
      dropdown.cg = cg;
      dropdown.className = "develop_button";
      section.appendChild(dropdown);

      for (let pathId of cg.keys.paths) {
        let option = document.createElement("option");
        option.text = pathId;
        dropdown.add(option);
      }
      let blankOption = document.createElement("option");
      blankOption.text = "";
      blankOption.value = "";
      dropdown.add(blankOption);

      dropdown.onchange = (e) => {
        let selected = dropdown.value;
        if (dropdown.value=="") {
          selected = null;
        }
        e.target.cg.Develop.featureData.pathEditor.selectedPath = selected;
        e.target.cg.Develop.featureData.pathEditor.selectedPathIndex = -1;
      }
      dropdown.value = "";

      // CREATE NEW PATH BUTTON
      let createNewButton = document.createElement("button");
      createNewButton.innerHTML = "Create New Path";
      createNewButton.classList.add("develop_button");
      createNewButton.classList.add("btn_action");
      createNewButton.cg = cg;
      createNewButton.onclick = (e) => {
        let newPathId = ChoreoGraph.id.get();
        cg.createPath([], newPathId);
        let option = document.createElement("option");
        option.text = newPathId;
        data.dropdown.add(option);
        data.dropdown.value = newPathId;
        data.selectedPath = newPathId;
        data.selectedPathIndex = -1;
      }
      section.appendChild(createNewButton);

      let trackTypeAdding = document.createElement("div");
      trackTypeAdding.style.display = "inline-block";
      section.appendChild(trackTypeAdding);

      // UNDO BUTTON
      let undoButton = document.createElement("button");
      undoButton.innerHTML = "Undo";
      undoButton.classList.add("develop_button");
      undoButton.classList.add("btn_action");
      undoButton.cg = cg;
      undoButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorUndo(e.target.cg);
      }
      section.appendChild(undoButton);

      // REDO BUTTON
      let redoButton = document.createElement("button");
      redoButton.innerHTML = "Redo";
      redoButton.classList.add("develop_button");
      redoButton.classList.add("btn_action");
      redoButton.cg = cg;
      redoButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorRedo(e.target.cg);
      }
      section.appendChild(redoButton);

      // REVERSE BUTTON
      let reverseButton = document.createElement("button");
      reverseButton.innerHTML = "Reverse";
      reverseButton.classList.add("develop_button");
      reverseButton.classList.add("btn_action");
      reverseButton.cg = cg;
      reverseButton.onclick = (e) => {
        let selectedId = e.target.cg.Develop.featureData.pathEditor.selectedPath;
        if (selectedId===null) { return; }
        e.target.cg.paths[selectedId].reverse();
      }
      section.appendChild(reverseButton);

      // SEPARATOR
      let separator = document.createElement("div");
      separator.style.borderLeft = "1px solid white";
      separator.style.height = "10px";
      separator.style.display = "inline-block";
      separator.style.margin = "0px 2px";
      section.appendChild(separator);

      // GENERIC COPY BUTTON
      let copyButton = document.createElement("button");
      copyButton.innerHTML = "Copy";
      copyButton.classList.add("develop_button");
      copyButton.classList.add("btn_action");
      copyButton.cg = cg;
      copyButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorCopy(e.target.cg);
      }
      section.appendChild(copyButton);

      // COPY POINT ARRAY BUTTON
      let copyArrayButton = document.createElement("button");
      copyArrayButton.innerHTML = "Copy Point[]";
      copyArrayButton.classList.add("develop_button");
      copyArrayButton.classList.add("btn_action");
      copyArrayButton.cg = cg;
      copyArrayButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorCopy(e.target.cg,"array");
      }
      section.appendChild(copyArrayButton);

      // COPY POINT DICTIONARY BUTTON
      let copyDictButton = document.createElement("button");
      copyDictButton.innerHTML = "Copy Point{}";
      copyDictButton.classList.add("develop_button");
      copyDictButton.classList.add("btn_action");
      copyDictButton.cg = cg;
      copyDictButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorCopy(e.target.cg,"dict");
      }
      section.appendChild(copyDictButton);

      // COPY PATH BUTTON
      let copyPathButton = document.createElement("button");
      copyPathButton.innerHTML = "Copy Path";
      copyPathButton.classList.add("develop_button");
      copyPathButton.classList.add("btn_action");
      copyPathButton.cg = cg;
      copyPathButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorCopy(e.target.cg,"path");
      }
      section.appendChild(copyPathButton);

      // COPY FUNCTION BUTTON
      let copyFunctionButton = document.createElement("button");
      copyFunctionButton.innerHTML = "Copy Function";
      copyFunctionButton.classList.add("develop_button");
      copyFunctionButton.classList.add("btn_action");
      copyFunctionButton.cg = cg;
      copyFunctionButton.onclick = (e) => {
        ChoreoGraph.Develop.pathEditorCopy(e.target.cg,"function");
      }
      section.appendChild(copyFunctionButton);
    };

    pathEditorOverlayLoop(cg) {
      if (!cg.Develop.featureData.pathEditor.active) { return; }
      // ALL PATHS
      if (cg.Input===undefined) { return; }
      let camera = cg.Input.cursor.canvas.camera;
      if (camera.canvas===null) { return; }
      ChoreoGraph.transformContext(camera);
      let c = camera.canvas.c;
      let colours = cg.settings.develop.pathEditor.colours;
      let size = cg.settings.core.debugCanvasScale / camera.cz;

      function getSidesAndPoints(path) {
        let points = [];
        let aSides = [];
        let bSides = [];
        let alternate = false;
        let lastPoint = null;
        for (let point of path) {
          points.push(point);
          if (lastPoint!==null) {
            if (alternate) {
              aSides.push([lastPoint,point]);
            } else {
              bSides.push([lastPoint,point]);
            }
            alternate = !alternate;
          }
          lastPoint = point;
        }
        return [points,aSides,bSides];
      }

      // SELECTED PATH
      let data = cg.Develop.featureData.pathEditor;
      let selectedPathId = data.selectedPath;
      let selectedPathIndex = data.selectedPathIndex;

      // DRAW ALL PATHS
      let points = [];
      let aSides = [];
      let bSides = [];

      for (let pathId of cg.keys.paths) {
        if (pathId!=selectedPathId&&selectedPathId!=null) { continue; }
        let [newPoints, newASides, newBSides] = getSidesAndPoints(cg.paths[pathId]);
        points.push(...newPoints);
        aSides.push(...newASides);
        bSides.push(...newBSides);
      }

      c.lineWidth = 2 * size;

      c.strokeStyle = colours.lineA;
      c.beginPath();
      for (let point of aSides) {
        c.moveTo(point[0][0],point[0][1]);
        c.lineTo(point[1][0],point[1][1]);
      }
      c.stroke();
      c.strokeStyle = colours.lineB;
      c.beginPath();
      for (let point of bSides) {
        c.moveTo(point[0][0],point[0][1]);
        c.lineTo(point[1][0],point[1][1]);
      }
      c.stroke();
      c.fillStyle = colours.point;
      c.beginPath();
      for (let point of points) {
        c.moveTo(point[0],point[1]);
        c.arc(point[0],point[1],selectedPathId==null?1:5,0,Math.PI*2);
      }
      c.fill();

      let settings = cg.settings.develop.pathEditor;
      let grabDistance = settings.grabDistance * cg.settings.core.debugCanvasScale / camera.cz;
      let grabbing = data.grabbing;
      let cursor = cg.Input.cursor;

      let path = cg.paths[selectedPathId];
      if (path===undefined) {
        let closestPath = null;
        let closestDistance = Infinity;
        let closestPathIndex = -1;
        for (let pathId of cg.keys.paths) {
          for (let point of cg.paths[pathId]) {
            let distance = Math.sqrt((point[0]-cg.Input.cursor.x)**2 + (point[1]-cg.Input.cursor.y)**2);
            if (distance<closestDistance) {
              closestDistance = distance;
              closestPath = pathId;
              closestPathIndex = cg.paths[pathId].indexOf(point);
            }
          }
        }
        if (closestDistance<grabDistance) {
          c.beginPath();
          c.strokeStyle = colours.selected;
          c.lineWidth = 4 * size;
          for (let point of cg.paths[closestPath]) {
            c.lineTo(point[0],point[1]);
          }
          c.stroke();
          if (cursor.impulseDown.any) {
            data.selectedPath = closestPath;
            data.selectedPathIndex = closestPathIndex;
            data.dropdown.value = closestPath;
          }
        }
        return;
      }

      let clickType = null;
      // POINT CHECK
      let closestPoint = null;
      let closestDistance = Infinity;
      for (let i=0;i<path.length;i++) {
        let distance = Math.sqrt((path[i][0]-cursor.x)**2 + (path[i][1]-cursor.y)**2);
        if (distance<closestDistance) {
          closestDistance = distance;
          closestPoint = i;
        }
      }
      if (closestDistance<grabDistance) {
        clickType = "point";
      }

      // INSERT CENTRE CHECK
      let closestSide = null;
      let closestSideDistance = Infinity;
      let insertCentreX = 0;
      let insertCentreY = 0;
      if (clickType==null) {
        for (let i=0;i<path.length-1;i++) {
          let from = path[i];
          let to = path[i+1];
          let centre = [(from[0]+to[0])/2,(from[1]+to[1])/2];
          let distance = Math.sqrt((centre[0]-cursor.x)**2 + (centre[1]-cursor.y)**2);
          if (distance<closestSideDistance) {
            closestSideDistance = distance;
            closestSide = i;
            insertCentreX = centre[0];
            insertCentreY = centre[1];
          }
        }
        if (closestSideDistance<grabDistance) {
          clickType = "insert";
        }
      }
      if (clickType==null) {
        clickType = "add";
      }

      if (ChoreoGraph.Input.keyStates[cg.settings.develop.freeCam.hotkey]) {
        clickType = null;
      }

      function snapX(x) {
        let gridSize = cg.settings.develop.pathEditor.snapGridSize;
        let offset = cg.settings.develop.pathEditor.snapXOffset;
        let snappedX = Math.round((x+offset)/gridSize)*gridSize - offset;
        return snappedX;
      };
      function snapY(y) {
        let gridSize = cg.settings.develop.pathEditor.snapGridSize;
        let offset = cg.settings.develop.pathEditor.snapYOffset;
        let snappedY = Math.round((y+offset)/gridSize)*gridSize - offset;
        return snappedY;
      };
      function magnetic(oldX,oldY,newX,newY) {
        if (!ChoreoGraph.Input.keyStates[cg.settings.develop.pathEditor.hotkeys.magnetic]) {
          return [newX,newY];
        }
        let magneticAngle = cg.settings.develop.pathEditor.magneticAngle * Math.PI / 180;
        let dx = newX - oldX;
        let dy = newY - oldY;
        let angle = Math.atan2(dy,dx);
        let magnitude = Math.sqrt(dx*dx + dy*dy);
        let snappedAngle = Math.round(angle/magneticAngle)*magneticAngle;
        let snappedX = oldX + Math.cos(snappedAngle) * magnitude;
        let snappedY = oldY + Math.sin(snappedAngle) * magnitude;
        return [snappedX,snappedY];
      }

      // SELECTED POINT OVERLAY
      if (selectedPathIndex!=-1) {
        let selectedPoint = path[selectedPathIndex];
        c.beginPath();
        c.strokeStyle = colours.selected;
        c.arc(selectedPoint[0],selectedPoint[1],8*size,0,Math.PI*2);
        c.stroke();
      }

      // CLICK TYPE AFFORDANCES
      if (!grabbing) {
        if (clickType=="add") {
          let newPoint = [snapX(cursor.x),snapY(cursor.y)];
          if (path.length>0) {
            newPoint = magnetic(path[path.length-1][0],path[path.length-1][1],snapX(cursor.x),snapY(cursor.y))
          }
          if (path.length==0) {
            c.beginPath();
            c.fillStyle = colours.new;
            c.arc(newPoint[0],newPoint[1],5*size,0,Math.PI*2);
            c.fill();
          } else {
            c.beginPath();
            c.strokeStyle = colours.new;
            c.moveTo(path[path.length-1][0],path[path.length-1][1]);
            c.lineTo(newPoint[0],newPoint[1]);
            c.stroke();
          }
        } else if (clickType=="point") {
          c.beginPath();
          c.fillStyle = "black";
          c.globalAlpha = 0.4;
          c.arc(path[closestPoint][0],path[closestPoint][1],5*size,0,Math.PI*2);
          c.fill();
          c.globalAlpha = 1;
        } else if (clickType=="insert") {
          c.beginPath();
          c.strokeStyle = colours.point;
          c.arc(insertCentreX,insertCentreY,5*size,0,Math.PI*2);
          c.stroke();
        }
      } else {
        if (ChoreoGraph.Input.keyStates[cg.settings.develop.pathEditor.hotkeys.magnetic]) {
          c.beginPath();
          c.strokeStyle = colours.magnetic;
          c.moveTo(data.originalPosition[0],data.originalPosition[1]);
          let x = snapX(cursor.x);
          let y = snapY(cursor.y);
          if (data.selectedPathIndex!=-1) {
            let newPoint = magnetic(data.originalPosition[0],data.originalPosition[1],x,y);
            x = newPoint[0];
            y = newPoint[1];
          }
          c.lineTo(x,y);
          c.stroke();
        }
      }

      // MODIFICATION
      function appendUndo() {
        let clone = [];
        for (let point of path) {
          clone.push([point[0],point[1]]);
        }
        data.undoBuffer.push(clone);
        data.redoBuffer.length = 0;
      }
      if (cursor.impulseDown.any) {
        if (clickType=="add") {
          appendUndo();
          if (path.length==0) {
            path.push([snapX(cursor.x),snapY(cursor.y)]);
          } else {
            path.push(magnetic(path[path.length-1][0],path[path.length-1][1],snapX(cursor.x),snapY(cursor.y)));
          }
          data.selectedPathIndex = path.length-1;
        } else if (clickType=="point") {
          data.selectedPathIndex = closestPoint;
          if (cursor.impulseDown.middle) {
            appendUndo();
            path.splice(data.selectedPathIndex,1);
            data.selectedPathIndex = path.length-1;
          } else {
            appendUndo();
            data.originalPosition = [path[closestPoint][0],path[closestPoint][1]];
            data.grabbing = true;
          }
        } else if (clickType=="insert") {
          appendUndo();
          let newPoint = [snapX(insertCentreX),snapY(insertCentreY)];
          path.splice(closestSide+1,0,newPoint);
          data.selectedPathIndex = closestSide+1;
          data.originalPosition = [newPoint[0],newPoint[1]];
          data.grabbing = true;
        }
      }
      if (grabbing&&cursor.impulseUp.any) {
        data.grabbing = false;
      } else if (grabbing) {
        let dx = cursor.x - cursor.down.any.x;
        let dy = cursor.y - cursor.down.any.y;
        let originalX = data.originalPosition[0];
        let originalY = data.originalPosition[1];
        let newPoint = magnetic(originalX,originalY,snapX(originalX + dx),snapY(originalY + dy));
        path[data.selectedPathIndex] = newPoint;
      }

      let hotkeys = cg.settings.develop.pathEditor.hotkeys;
      let lastKey = ChoreoGraph.Input.lastKeyDown;
      if (ChoreoGraph.Input.lastKeyDownFrame!=ChoreoGraph.frame) { lastKey = null; }

      // DELETE
      if (hotkeys.delete==lastKey) {
        if (data.selectedPathIndex!=-1) {
          appendUndo();
          path.splice(data.selectedPathIndex,1);
          data.selectedPathIndex = path.length-1;
        }

      } else if (hotkeys.copy==lastKey) {
        ChoreoGraph.Develop.pathEditorCopy(cg);

      } else if (hotkeys.undo==lastKey) {
        ChoreoGraph.Develop.pathEditorUndo(cg);

      } else if (hotkeys.redo==lastKey) {
        ChoreoGraph.Develop.pathEditorRedo(cg);
      }
    };

    pathEditorUndo(cg) {
      let data = cg.Develop.featureData.pathEditor;
      let selectedPathId = data.selectedPath;
      if (selectedPathId===null) { return; }
      let path = cg.paths[selectedPathId];
      if (path===undefined) { return; }
      if (data.undoBuffer.length==0) { return; }

      let clone = [];
      for (let point of path) {
        clone.push([point[0],point[1]]);
      }
      data.redoBuffer.push(clone);

      let lastState = data.undoBuffer.pop();
      if (lastState!==undefined) {
        cg.paths[selectedPathId] = lastState;
        data.selectedPathIndex = lastState.length-1;
      }
    };

    pathEditorRedo(cg) {
      let data = cg.Develop.featureData.pathEditor;
      let selectedPathId = data.selectedPath;
      if (selectedPathId===null) { return; }
      let path = cg.paths[selectedPathId];
      if (path===undefined) { return; }
      if (data.redoBuffer.length==0) { return; }

      let clone = [];
      for (let point of path) {
        clone.push([point[0],point[1]]);
      }
      data.undoBuffer.push(clone);

      let nextState = data.redoBuffer.pop();
      if (nextState!==undefined) {
        cg.paths[selectedPathId] = nextState;
        data.selectedPathIndex = nextState.length-1;
      }
    };

    pathEditorCopy(cg,type=null) {
      let data = cg.Develop.featureData.pathEditor;
      let selectedPathId = data.selectedPath;
      if (selectedPathId===null) { return; }
      let path = cg.paths[selectedPathId];
      if (path===undefined) { return; }

      function round(number) {
        let rounding = cg.settings.develop.pathEditor.rounding;
        return Math.round(number*Math.pow(10,rounding))/Math.pow(10,rounding);
      }

      if (type==null) {
        if (path.length==0) {
          alert("Path is empty, nothing to copy.");
          return;
        } else if (path.length==1) {
          type = "array";
        } else {
          type = "path";
        }
      }

      let text = "";
      if (type=="array") {
        for (let i=0;i<path.length;i++) {
          text += round(path[i][0]) + "," + round(path[i][1]);
          if (i<path.length-1) { text += ","; }
        }
      } else if (type=="dict") {
        text = "x:" + round(path[0][0]) + ",y:" + round(path[0][1]);
      } else if (type=="path") {
        for (let i=0;i<path.length;i++) {
          text += "[" + round(path[i][0]) + "," + round(path[i][1]) + "]";
          if (i<path.length-1) { text += ","; }
        }
      } else if (type=="function") {
        text = "cg.createPath([";
        for (let i=0;i<path.length;i++) {
          text += "[" + round(path[i][0]) + "," + round(path[i][1]) + "]";
          if (i<path.length-1) { text += ","; }
        }
        text += '],"' + selectedPathId + '")';
      }
      navigator.clipboard.writeText(text);
    };

    UIToggleButton = class UIToggleButton {
      constructor(init,cg) {
        this.cg = cg;
        this.activeText = "On";
        this.inactiveText = "Off";

        this.onActive = null;
        this.onInactive = null;

        this.activated = false;
        this.element = document.createElement("button");
        this.element.developUIData = this;
        this.element.type = "button";
        this.element.classList.add("develop_button");
        this.element.onclick = () => {
          if (typeof this.activated=="boolean") {
            this.activated = !this.activated;
          } else if (typeof this.activated=="object") {
            this.activated.active = !this.activated.active;
          }
          if ((typeof this.activated=="boolean"&&this.activated)||
            (typeof this.activated=="object"&&this.activated.active)) {
            if (this.onActive!=null) { this.onActive(this.cg,this); }
          } else {
            if (this.onInactive!=null) { this.onInactive(this.cg,this); }
          }
          this.setStylesAndText();
        };

        for (let key in init) {
          this[key] = init[key];
        }

        this.setStylesAndText();
      };
      setStylesAndText() {
        if ((typeof this.activated=="boolean"&&this.activated)||
            (typeof this.activated=="object"&&this.activated.active)) {
          this.element.innerText = this.activeText;
          this.element.classList.add("btn_on");
          this.element.classList.remove("btn_off");
        } else {
          this.element.innerText = this.inactiveText;
          this.element.classList.add("btn_off");
          this.element.classList.remove("btn_on");
        }
      };
    };

    UIActionButton = class UIActionButton {
      constructor(init,cg) {
        this.cg = cg;
        this.text = "Action";
        this.action = null;
        this.element = document.createElement("button");
        this.element.developUIData = this;
        this.element.type = "button";
        this.element.classList.add("develop_button");
        this.element.classList.add("btn_action");
        this.element.onclick = () => {
          if (this.action!=null) { this.action(this.cg); }
        };
        for (let key in init) {
          this[key] = init[key];
        }
        this.element.innerText = this.text;
      };
    }
  },

  instanceConnect(cg) {
    cg.attachSettings("develop",{
      fps : {
        active : false,
      },
      freeCam : {
        hotkey : "shift",
        zoomSpeed : 0.5
      },
      cameras : {
        active : false,
        colour : "#76f562"
      },
      frustumCulling : {
        active : false,
        unculledBoxColour : "#59eb38",
        culledBoxColour : "#eb3838",
        frustumColour : "#5c38eb"
      },
      objectGizmo : {
        active : false,
        hotkeySwitchMode : "x",
        hotkeySnap : "ctrl",
        rounding : 2,
        rotationSnap : 30,
        positionSnap : 1,
        snapXOffset : 0,
        snapYOffset : 0,
        colours : {
          unhoveredSelection : "#ff0000",
          hoveredSelection : "#0000ff",
          gizmoX: "#ff0000",
          gizmoY: "#00ff00",
          gizmoOther: "#00ffff"
        }
      },
      objectAnnotation : {
        active : false,
        textColour : "white",
        offsetX : 0,
        offsetY : 0,
        maxWidth : 100,
        keySet : ["id"],
        removeText : [],
        fontSize : 6
      },
      pathEditor : {
        snapGridSize : 1,
        snapXOffset : 0,
        snapYOffset : 0,
        rounding : 2,
        grabDistance : 20,
        magneticAngle : 45,
        colours : {
          lineA : "#ff0000",
          lineB : "#0000ff",
          point : "#00ff00",
          new : "#ffffff",
          selected : "#ffff00"
        },
        hotkeys : {
          copy : "c",
          undo : "z",
          redo : "y",
          delete : "x",
          magnetic : "ctrl"
        }
      }
    });
    cg.Develop = new ChoreoGraph.Develop.instanceObject(cg);
    cg.processLoops.push(cg.Develop.developProcessLoop);
    cg.debugLoops.push(cg.Develop.developOverlayLoop);
  },

  globalStart() {
    if (ChoreoGraph.Develop.createInterfaces) {
      ChoreoGraph.Develop.section.style.display = "block";
    } else {
      ChoreoGraph.Develop.section.remove();
    }
  },

  instanceStart(cg) {
    if (cg.Develop.selectedCanvas===null) {
      if (cg.settings.core.defaultCanvas!==null) {
        if (cg.keys.canvases.length>0) {
          cg.Develop.selectedCanvas = cg.canvases[cg.keys.canvases[0]];
        }
      } else {
        cg.Develop.selectedCanvas = cg.settings.core.defaultCanvas;
      }
    }
    if (ChoreoGraph.Develop.cg===null) {
      ChoreoGraph.Develop.cg = cg;
    }

    ChoreoGraph.Develop.loops.process.push({cgid:cg.id,activeCheck:cg.Develop.featureData.freeCam,func:cg.Develop.processFreecam});

    ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.develop.cameras,func:cg.Develop.overlayCameras});
    ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.develop.frustumCulling,func:cg.Develop.overlayFrustumCulling});
    ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.develop.fps,func:cg.Develop.overlayFPS});
    ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.develop.objectAnnotation,func:cg.Develop.overlayObjectAnnotation});
    ChoreoGraph.Develop.loops.overlay.push({cgid:cg.id,activeCheck:cg.settings.develop.objectGizmo,func:cg.Develop.overlayObjectGizmo});
  }
});

(()=>{
  let colOff = ChoreoGraph.Develop.style.off;
  let colOn = ChoreoGraph.Develop.style.on;
  let colAction = ChoreoGraph.Develop.style.action;

  let style = document.createElement("style");
  style.innerHTML = `
    .develop_section {
      color:white;
      margin-left: 20px;
      margin-top: 10px;
      margin-bottom: 80px;
      font-family: Arial;
    }
    .develop_button {
      background: black;
      color: white;
      margin:5px;
      border: 3px solid white;
      padding:10px;
      border-radius:10px;
      cursor: pointer;
    }
    .develop_button:hover {
      background: #111;
    }
    .develop_input {
      font-size: 15px;
      padding: 6px;
      border: 2px solid white;
      border-radius: 5px;
      background: black;
      color: white;
      font-family: consolas;
      width: auto;
      field-sizing: content;
    }
    .btn_off {
      border-color: ${colOff};
    }
    .btn_on {
      border-color: ${colOn};
    }
    .btn_action {
      border-color: ${colAction};
    }
    .btn_action:active {
      background: #999999;
    }
    .single_input {
      background: black;
      color: white;
      padding: 10px;
      border: 3px solid ${colAction};
      border-radius: 10px;
    }
    .develop_textarea {
      display: block;
      margin-left: 20px;
      width: 50%;
      overflow: hidden;
      resize: both;
      min-height: 40px;
      padding:10px;
      background-color: #1f1f1f;
      font-family: monospace;
    }
    .code_keyword {
      color: #dc98ff;
    }
    .code_comment {
      color: #a3a3a3;
      font-style: italic;
    }
    .code_string {
      color: #ce9178;
    }
    .code_global {
      color: #ffff00;
    }
    .code_number {
      color: #78ff7f;
    }
    .code_function {
      color: #ff744a;
    }
    .live_eval_error {
      color: red;
      margin: 10px;
    }
  `;
  document.head.appendChild(style);

  ChoreoGraph.Develop.section.classList.add("develop_section");
  document.body.appendChild(ChoreoGraph.Develop.section);
  ChoreoGraph.Develop.section.style.display = "none";

  document.addEventListener("wheel", ChoreoGraph.Develop.wheel, {passive: false});
  document.addEventListener("pointerdown", function(event){
    if (event.target.cgCanvas===undefined) { return; }
    let cg = event.target.cgCanvas.cg;
    if (cg===ChoreoGraph.Develop.cg) { return; }
    if (ChoreoGraph.Input===undefined) { return; }
    let canChange = true;
    for (let key of ChoreoGraph.Develop.changedSelectedInstanceHotkey.split("+")) {
      if (!ChoreoGraph.Input.keyStates[key]) {
        if (key=="shift"&&event.shiftKey) { continue; }
        if (key=="ctrl"&&event.ctrlKey) { continue; }
        if (key=="alt"&&event.altKey) { continue; }
        if (key=="meta"&&event.metaKey) { continue; }
        canChange = false;
        break;
      }
    }
    if (canChange) {
      ChoreoGraph.Develop.cg = cg;
    }
  }, {passive: false});
})();