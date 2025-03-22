ChoreoGraph.plugin({
  name : "Develop",
  key : "Develop",
  version : "2.0",

  globalPackage : new class cgDevelop {
    cg = null;

    instanceObject = class Develop {
      constructor(cg) {
        this.cg = cg;
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

      loop(cg) {
        if (cg.Develop.featureData.freeCam.active) {
          if (cg.Input===undefined) {
            cg.Develop.featureData.freeCam.active = false;
            console.warn("FreeCam requires the Input plugin");
            return;
          }
          if (true||cg.Input.keyStates.shift) {
            
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

    init() {
      this.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Disable FreeCam",
        inactiveText : "Enable FreeCam",
        onActive : () => { this.cg.Develop.enableFreeCam(); },
        onInactive : () => { this.cg.Develop.disableFreeCam(); }
      })
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
    cg.overlayLoops.push(cg.Develop.loop);
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