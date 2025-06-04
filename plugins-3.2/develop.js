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
          function drawCollectionCullBoxes(collection) {
            for (let item of collection) {
              if (item.type=="graphic"&&item.graphic.getBounds!==undefined) {
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
          c.font = 6*cg.settings.core.debugCGScale+"px Arial";
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
              for (let object of scene.objects) {
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
        frustumColour : "#5c38eb",
        cgid : cg.id
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
        removeText : []
      }
    });
    cg.Develop = new ChoreoGraph.Develop.instanceObject(cg);
    cg.processLoops.push(cg.Develop.developProcessLoop);
    cg.overlayLoops.push(cg.Develop.developOverlayLoop);
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