ChoreoGraph.plugin({
  name : "Develop",
  key : "Develop",
  version : "2.0",

  globalPackage : new class cgDevelop {
    cg = null;

    instanceObject = class Develop {
      constructor(cg) {
        this.cg = cg;
        document.addEventListener("wheel", this.wheel, {passive: false});
      };

      _selectedCanvas = null;
      set selectedCanvas(canvas) {
        if (this._selectedCanvas==null||this._selectedCanvas.id != canvas.id) {
          this._selectedCanvas = canvas;
          if (ChoreoGraph.Develop.initiated) {
            this.generateInterface();
          }
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
  
      generateInterface() {
        ChoreoGraph.Develop.section.innerHTML = "";
        for (let item of ChoreoGraph.Develop.interfaceItems) {
          let newItem = new ChoreoGraph.Develop[item.type](item);
          ChoreoGraph.Develop.section.appendChild(newItem.element);
        }
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
          let freeCamera = this.cg.createCamera({
            x : canvas.camera.x,
            y : canvas.camera.y,
            z : canvas.camera.z,
            scaleMode : canvas.camera.scaleMode,
            WHRatio : canvas.camera.WHRatio,
            maximumSize : canvas.camera.maximumSize,
            pixelScale : canvas.camera.pixelScale
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
        canvasData.freeCamera.x = canvasData.savedCamera.x;
        canvasData.freeCamera.y = canvasData.savedCamera.y;
        canvasData.freeCamera.z = canvasData.savedCamera.z;
      }

      wheel(event) {
        let cg = ChoreoGraph.Develop.cg;
        if (cg.Develop.featureData.freeCam.active&&ChoreoGraph.Input.keyStates.shift) {
          let canvas = cg.Develop.selectedCanvas;
          let camera = cg.Develop.featureData.freeCam.canvasData[canvas.id].freeCamera;
          let scrollSpeed = cg.settings.develop.freeCam.zoomSpeed;
          let magnitude = 0.1;
          if (event.deltaY<0) { magnitude = -0.1; }
          let change = Math.abs(magnitude)/scrollSpeed
          if (event.deltaY<0) { camera.z*=1+change; } else { camera.z*=1-change; }
        }
      }

      processLoop(cg) {
        if (cg.Develop.featureData.freeCam.active) {
          let data = cg.Develop.featureData.freeCam;
          if (cg.Input===undefined) {
            data.active = false;
            console.warn("FreeCam requires the Input plugin");
            return;
          }
          if (ChoreoGraph.Input.keyStates.shift) {
            let canvas = cg.Develop.selectedCanvas;
            let camera = cg.Develop.featureData.freeCam.canvasData[canvas.id].freeCamera;
            if (data.dragging) {
              if (!cg.Input.cursor.hold.any) {
                data.dragging = false;
                return;
              }
              let xo = (data.downCursorPosition.x - cg.Input.cursor.clientX)/camera.z;
              let yo = (data.downCursorPosition.y - cg.Input.cursor.clientY)/camera.z;
              camera.x = data.downCameraPosition.x + xo;
              camera.y = data.downCameraPosition.y + yo;
            } else {
              if (cg.Input.cursor.hold.any) {
                data.dragging = true;
                data.downCameraPosition = {
                  x : camera.x,
                  y : camera.y
                };
                data.downCursorPosition = {
                  x : cg.Input.cursor.clientX,
                  y : cg.Input.cursor.clientY
                };
              }
            }
          }
        }
      };
    };

    initiated = false;
    section = document.createElement("section");
    interfaceItems = [];

    UIToggleButton = class UIToggleButton {
      constructor(init) {
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
          this.activated = !this.activated;
          if (this.activated) {
            if (this.onActive!=null) { this.onActive(); }
          } else {
            if (this.onInactive!=null) { this.onInactive(); }
          }
          this.setStylesAndText();
        };

        for (let key in init) {
          this[key] = init[key];
        }

        this.setStylesAndText();
      };
      setStylesAndText() {
        if (this.activated) {
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
      constructor(init) {
        this.text = "Action";
        this.action = null;
        this.element = document.createElement("button");
        this.element.developUIData = this;
        this.element.type = "button";
        this.element.classList.add("develop_button");
        this.element.classList.add("btn_action");
        this.element.onclick = () => {
          if (this.action!=null) { this.action(); }
        };
        for (let key in init) {
          this[key] = init[key];
        }
        this.element.innerText = this.text;
      };
    }

    init() {
      this.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Disable FreeCam",
        inactiveText : "Enable FreeCam",
        onActive : () => { this.cg.Develop.enableFreeCam(); },
        onInactive : () => { this.cg.Develop.disableFreeCam(); }
      });
      this.interfaceItems.push({
        type : "UIActionButton",
        text : "Reset FreeCam",
        action : () => { this.cg.Develop.resetFreeCam(); }
      });
      document.body.appendChild(this.section);
      this.section.classList.add("develop_section");

      let colOff = this.cg.settings.develop.style.off;
      let colOn = this.cg.settings.develop.style.on;
      let colAction = this.cg.settings.develop.style.action;

      let style = document.createElement("style");
      style.innerHTML = `
        .develop_section {
            color:white;
            margin-left: 20px;
            margin-top: 10px;
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
        .btn_off {
            border-color: ${colOff};
        }
        .btn_on {
            border-color: ${colOn};
        }
        .btn_action {
            border-color: ${colAction};
        }
        .develop_input {
            margin:5px;
            border:0;
            padding:10px;
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
      document.body.appendChild(style);
      this.cg.Develop.generateInterface();
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
      // objectGizmo : {
      //   active : false,
      // },
      // animationEditor : {
      //   active : false,
      // },
      // objectPlacer : {
      //   active : false,
      // }
      style : {
        off : "#ff0000",
        on : "#008000",
        action : "#ffc0cb"
      }
    });
    cg.Develop = new ChoreoGraph.Develop.instanceObject(cg);
    cg.processLoops.push(cg.Develop.processLoop);
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
    if (ChoreoGraph.Develop.initiated===false) {
      ChoreoGraph.Develop.init();
    }
  }
});