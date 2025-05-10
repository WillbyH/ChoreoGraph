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
        if (ChoreoGraph.Input!==undefined) {
          this.interfaceItems.push({
            type : "UIToggleButton",
            activated : this.cg.settings.input.debug.buttons,
            activeText : "Hide Buttons",
            inactiveText : "Show Buttons",
            onActive : (cg) => { cg.settings.input.debug.active = true; cg.settings.input.debug.buttons.active = true; },
            onInactive : (cg) => { cg.settings.input.debug.buttons.active = false; }
          });
        };
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
            pixelScale : canvas.camera.pixelScale,
            cullOverride : canvas.camera
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
        canvasData.freeCamera.x = canvasData.savedCamera.x;
        canvasData.freeCamera.y = canvasData.savedCamera.y;
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
            let xo = (data.downCursorPosition.x - cg.Input.cursor.clientX)/camera.z;
            let yo = (data.downCursorPosition.y - cg.Input.cursor.clientY)/camera.z;
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
                x : cg.Input.cursor.clientX,
                y : cg.Input.cursor.clientY
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
              c.lineWidth = 3*camera.cz;
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
          let c = canvas.c;
          let cullCamera = canvas.camera;
          if (cullCamera===null) { continue; }
          if (cullCamera.cullOverride!==null) { cullCamera = cullCamera.cullOverride; }
          ChoreoGraph.transformContext(canvas.camera,cullCamera.x,cullCamera.y);
          c.strokeStyle = cg.settings.develop.frustumCulling.frustumColour;
          c.lineWidth = 3*canvas.camera.cz;
          c.lineWidth = 3;
          c.strokeRect(-canvas.width*0.5,-canvas.height*0.5,canvas.width,canvas.height);
          function drawCollectionCullBoxes(collection) {
            for (let item of collection) {
              if (item.type=="graphic"&&item.graphic.getBounds!==undefined) {
                let gx = item.transform.x;
                let gy = item.transform.y;
                let gax = item.transform.ax;
                let gay = item.transform.ay;
                let [bw, bh] = item.graphic.getBounds();
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
                let cw = canvas.width/cullCamera.z;
                let ch = canvas.height/cullCamera.z;
                
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
  
    generateInterface() {
      let cg = ChoreoGraph.Develop.cg;

      ChoreoGraph.Develop.section.innerHTML = "";
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
      // fps : {
      //   active : false,
      // },
      // animationCreator : {
      //   active : false,
      // },
      // consoleOverlay : {
      //   active : false,
      // },
      // liveEvaluation : {
      //   active : false,
      // },
      // closestFrameLocator : {
      //   active : false,
      // },
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
      // objectGizmo : {
      //   active : false,
      // },
      // animationEditor : {
      //   active : false,
      // },
      // objectPlacer : {
      //   active : false,
      // }
    });
    cg.Develop = new ChoreoGraph.Develop.instanceObject(cg);
    cg.processLoops.push(cg.Develop.developProcessLoop);
    cg.overlayLoops.push(cg.Develop.developOverlayLoop);
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