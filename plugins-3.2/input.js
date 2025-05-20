ChoreoGraph.plugin({
  name : "Input",
  key : "Input",
  version : "1.0",

  globalPackage : new class cgInput {
    constructor() {
      document.addEventListener("keydown", this.keyDown, false);
      document.addEventListener("keyup", this.keyUp, false);
      document.addEventListener("pointerdown", this.pointerDown, false);
      document.addEventListener("pointerup", this.pointerUp, false);
      document.addEventListener("pointermove", this.pointerMove, false);
      document.addEventListener("pointercancel", this.pointerCancel, false);
      document.addEventListener("contextmenu", this.contextMenu, false);
      document.addEventListener("wheel", this.wheel, {passive: false});
      document.addEventListener("mouseleave", this.unhoverAllButtons, false);
      window.addEventListener("blur", this.blur);
      window.addEventListener("gamepadconnected", (event) => { ChoreoGraph.Input.controllers[event.gamepad.index] = new ChoreoGraph.Input.GamePadController(event); });
      window.addEventListener("gamepaddisconnected", (event) => { ChoreoGraph.Input.controllers[event.gamepad.index].connected = false; });

      this.keyNames = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","1","2","3","4","5","6","7","8","9","0","left","right","up","down","ctrl","shift","alt","space","enter","backspace","tab","capslock","escape","pageup","pagedown","end","home","insert","delete","numlock","scrolllock","pause","printscreen","contextmenu","meta","altgraph","fn","fnlock","hyper","super","symbol","symbollock","clear","cut","copy","paste","eraseeof","exsel","redo","undo","accept","again","attn","cancel","execute","find","finish","help","play","props","select","zoomin","zoomout","brightnessdown","brightnessup","eject","logoff","power","poweroff","hibernate","standby","wakeup","allcandidates","alphanumeric","codeinput","compose","convert","dead","finalmode","groupfirst","grouplast","groupnext","groupprevious","modechange","nextcandidate","nonconvert","previouscandidate","process","singlecandidate","hangulmode","hanjamode","junjamode","eisu","hankaku","hiragana","hiraganakatakana","kanamode","kanjimode","katakana","romaji","zenkaku","zenkakukankaku",";","=",",","-",".","/","`","[","\\","]","'","^",":","!",,"<",">","?","~","{","|","}",'"',"@","#","$","%","&","*","(",")","_","+","f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12","f13","f14","f15","f16","f17","f18","f19","f20","f21","f22","f23","f24","soft1","soft2","soft3","soft4","appswitch","call","camera","camerafocus","endcall","goback","gohome","headsethook","lastnumberredial","notification","mannermode","voicedial","channeldown","channelup","mediafastforward","mediapause","mediaplay","mediaplaypause","mediarecord","mediarewind","mediastop","mediatrackprevious","audiobalanceleft","audiobalanceright","audiobassdown","audiobassboostdown","audiobassboosttoggle","audiobassboostup","audiobassup","audiofaderfront","audiofaderrear","audiosurroundmodenext","audiotrebledown","audiotrebleup","audiovolumedown","audiovolumemute","audiovolumeup","microphonetoggle","microphonevolumedown","microphonevolumemute","microphonevolumeup","close","new","open","print","save","spellcheck","mailforward","mailreply","mailsend","browserback","browserfavourites","browserforward","browserhome","browserrefresh","browsersearch","browserstop","decimal","key11","key12","multiply","add","divide","subtract","separator",
      "conactiontop","conactionbottom","conactionleft","conactionright","condpadup","condpaddown","condpadleft","condpadright","conleftstick","conrightstick","constart","conselect","conleftbumper","conrightbumper","conlefttrigger","conrighttrigger","conleftstickup","conleftstickdown","conleftstickleft","conleftstickright","conrightstickup","conrightstickdown","conrightstickleft","conrightstickright",
      "mouseleft","mousemiddle","mouseright","mousewheelup","mousewheeldown","mousebutton1","mousebutton2"];

      // This list does not include TV, Media Controller, Speech Recognition or Application Selector keys
      // See https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values for more information

      this.keyStates = {};
      for (let key of this.keyNames) {
        this.keyStates[key] = false;
      }

      this.NULLINPUT = "nullinput";
      this.KEYBOARD = "keyboard";
      this.CONTROLLER = "controller";
      this.MOUSE = "mouse";
      this.TOUCH = "touch";
    }
    instanceObject = class Input {
      get cursor() { return this.canvasCursors[this.cg.settings.core.defaultCanvas.id]; }
      lastInputType = ChoreoGraph.Input.NULLINPUT; // mouse touch keyboard controller
      lastKeyType = ChoreoGraph.Input.NULLINPUT; // keyboard controller mouse
      lastCursorType = ChoreoGraph.Input.NULLINPUT; // mouse touch controller
      lastInteraction = {
        any : -Infinity,

        cursor : -Infinity,
        cursorButton : -Infinity,
        touch : -Infinity,
        mouse : -Infinity,

        key : -Infinity,
        keyboard : -Infinity,
        controller : -Infinity
      };

      buttons = {};
      lastCheckedButtonChecks = -1;
      cachedButtonChecks = {};
      hoveredButtons = 0;

      actions = {};

      get buttonChecks() {
        if (this.cg.settings.input.callbacks.updateButtonChecks!==null) {
          if (this.lastCheckedButtonChecks===ChoreoGraph.frame) {
            return this.cachedButtonChecks;
          } else {
            this.lastCheckedButtonChecks = ChoreoGraph.frame;
            this.cachedButtonChecks = this.cg.settings.input.callbacks.updateButtonChecks(this.cg);
          }
        } else {
          return {};
        }
      }

      constructor(cg) {
        this.cg = cg;
        this.canvasCursors = {};
      };
      updateCursor(canvas,event) {
        if (event.pointerType=="mouse") {
          this.cg.Input.lastInputType = ChoreoGraph.Input.MOUSE;
          this.cg.Input.lastCursorType = ChoreoGraph.Input.MOUSE;
        } else if (event.pointerType=="touch") {
          this.cg.Input.lastInputType = ChoreoGraph.Input.TOUCH;
          this.cg.Input.lastCursorType = ChoreoGraph.Input.TOUCH;
        } else if (event.pointerType=="controller") {
          this.cg.Input.lastInputType = ChoreoGraph.Input.CONTROLLER;
          this.cg.Input.lastCursorType = ChoreoGraph.Input.CONTROLLER;
        }
        this.cg.Input.lastInteraction.any = this.cg.clock;
        this.cg.Input.lastInteraction.cursor = this.cg.clock;
        if (event.type=="pointerdown"||event.type=="pointerup") {
          this.cg.Input.lastInteraction.cursorButton = this.cg.clock;
        }
        if (event.pointerType=="mouse") {
          this.cg.Input.lastInteraction.mouse = this.cg.clock;
        } else if (event.pointerType=="touch") {
          this.cg.Input.lastInteraction.touch = this.cg.clock;
        } else if (event.pointerType=="controller") {
          this.cg.Input.lastInteraction.controller = this.cg.clock;
        }
        let cursor = this.canvasCursors[canvas.id];
        if (cursor===undefined) {
          cursor = new ChoreoGraph.Input.canvasCursorData(canvas);
          this.canvasCursors[canvas.id] = cursor;
        }
        cursor.update(event);
      };

      createButton(buttonInit,id=ChoreoGraph.id.get()) {
        let type = buttonInit.type;
        if (type==undefined) { console.warn("Button type not defined for",id); return; }
        if (buttonInit.scene==undefined) {
          if (this.cg.settings.core.defaultCanvas != null && this.cg.settings.core.defaultCanvas.camera.scenes.length>0) {
            buttonInit.scene = this.cg.settings.core.defaultCanvas.camera.scenes[0];
          } else if (this.cg.keys.scenes.length>0) {
            buttonInit.scene = this.cg.scenes[this.cg.keys.scenes[0]];
          }
        }
        if (buttonInit.scene==undefined) { console.warn("Scene not defined for Button",id); return; }
        let newButton = new ChoreoGraph.Input[type+"Button"](buttonInit);
        ChoreoGraph.applyAttributes(newButton,buttonInit);
        newButton.id = id;
        newButton.cg = this.cg;
        this.buttons[id] = newButton;
        this.cg.keys.buttons.push(id);
        return newButton;
      };

      createAction(actionInit,id=ChoreoGraph.id.get()) {
        let action = new ChoreoGraph.Input.Action(actionInit);
        action.id = id;
        action.cg = this.cg;
        this.actions[id] = action;
        this.cg.keys.actions.push(id);
        return action;
      };

      getActionNormalisedVector(up, down, left, right) {
        let x = 0;
        let y = 0;
        if (up instanceof ChoreoGraph.Input.Action) {
          y += up.get();
          y -= down.get();
          x += left.get();
          x -= right.get();
        } else {
          y -= this.cg.Input.actions[up].get();
          y += this.cg.Input.actions[down].get();
          x -= this.cg.Input.actions[left].get();
          x += this.cg.Input.actions[right].get();
        }
        let magnitude = Math.sqrt(x*x+y*y);
        if (magnitude>1) {
          x /= magnitude;
          y /= magnitude;
        };
        return [x,y];
      };

      hasActivatedDebugLoop = false;
      inputDebugLoop(cg) {
        if (!cg.settings.input.debug.active) { return; }
        if (cg.settings.input.debug.buttons.active) {
          for (let canvasId of cg.keys.canvases) {
            let canvas = cg.canvases[canvasId];
            if (canvas.hideDebugOverlays) { continue; }
            canvas.c.save();
            for (let buttonId of cg.keys.buttons) {
              let button = cg.Input.buttons[buttonId];
              if (!canvas.camera.scenes.includes(button.scene)) { continue; }
              ChoreoGraph.transformContext(canvas.camera,button.x,button.y,0,1,1,button.CGSpace,false,false,button.canvasSpaceXAnchor,button.canvasSpaceYAnchor);
              button.setStyles(canvas);
              button.drawShape(canvas);
            }
            for (let buttonId of cg.keys.buttons) {
              let button = cg.Input.buttons[buttonId];
              if (!canvas.camera.scenes.includes(button.scene)) { continue; }
              button.drawTitle(canvas);
            }
            canvas.c.restore();
          }
        }
      };
    };

    // CURSORS

    hasMultipleCursors = false;
    downCanvases = {};

    canvasCursorData = class canvasCursorData {
      x = 0;
      y = 0;

      canvasX = 0;
      canvasY = 0;

      clientX = 0;
      clientY = 0;

      canvas = null;
      boundBox = null;
      
      touches = {};
      activeTouches = [];

      down = {
        left : {x:0,y:0},
        middle : {x:0,y:0},
        right : {x:0,y:0},
        any : {x:0,y:0}
      };
      up = {
        left : {x:0,y:0},
        middle : {x:0,y:0},
        right : {x:0,y:0},
        any : {x:0,y:0}
      };
      hold = {
        left : false,
        middle : false,
        right : false,
        any : false
      };
      impulseDown = {
        left : false,
        middle : false,
        right : false,
        any : false
      };
      impulseUp = {
        left : false,
        middle : false,
        right : false,
        any : false
      };
      constructor(canvas) {
        this.canvas = canvas;
        this.boundBox = canvas.element.getBoundingClientRect();
      }
      buttonSide(button) {
        if (button==0) { return "left"; }
        if (button==1) { return "middle"; }
        if (button==2) { return "right"; }
        return "any";
      }
      update(event) {
        this.boundBox = this.canvas.element.getBoundingClientRect();
        if (this.boundBox.width>=window.innerWidth
          &&this.boundBox.height>=window.innerHeight
          &&this.canvas.cg.settings.input.preventSingleTouch
          &&!this.hasPreventedTrappedViewport) {
          this.canvas.element.style.touchAction = "auto";
          this.hasPreventedTrappedViewport = true;
        } else if (this.hasPreventedTrappedViewport) {
          if (this.boundBox.width<window.innerWidth||this.boundBox.height<window.innerHeight) {
            this.canvas.element.style.touchAction = "none";
            this.hasPreventedTrappedViewport = false;
          }
        }
        this.canvasX = Math.floor(((event.clientX-this.boundBox.left)/this.boundBox.width)*this.canvas.width);
        this.canvasY = Math.floor(((event.clientY-this.boundBox.top)/this.boundBox.height)*this.canvas.height);
        if (this.canvas.camera!==null) {
          let cameraXOffset = this.canvas.camera.x-(this.canvas.width/this.canvas.camera.z)/2;
          let cameraYOffset = this.canvas.camera.y-(this.canvas.height/this.canvas.camera.z)/2;
          this.x = ((event.clientX-this.boundBox.left)/this.boundBox.width)*(this.canvas.width/this.canvas.camera.z);
          this.x += cameraXOffset;
          this.y = ((event.clientY-this.boundBox.top)/this.boundBox.height)*(this.canvas.height/this.canvas.camera.z);
          this.y += cameraYOffset;
        }
        this.clientX = event.clientX;
        this.clientY = event.clientY;
        if (event.type=="pointerdown") {
          let side = this.buttonSide(event.button);
          if (side=="middle"&&this.canvas.cg.settings.input.preventMiddleClick) {
            event.preventDefault();
          }
          this.down.any.x = this.x;
          this.down.any.y = this.y;
          this.down[side].x = this.x;
          this.down[side].x = this.y;
          this.hold.any = true;
          this.hold[side] = true;
          this.impulseDown.any = true;
          this.impulseDown[side] = true;
          this.touches[event.pointerId] = {
            x : this.x,
            y : this.y,
            clientX : event.clientX,
            clientY : event.clientY,
            canvasX : this.canvasX,
            canvasY : this.canvasY
          };
          if (!this.activeTouches.includes(event.pointerId)) {
            this.activeTouches.push(event.pointerId);
          }
          if (this.canvas.cg.settings.input.callbacks.cursorDown!==null) {
            this.canvas.cg.settings.input.callbacks.cursorDown(event,this.canvas);
          }
        } else if (event.type=="pointerup") {
          let side = this.buttonSide(event.button);
          this.up.any.x = this.x;
          this.up.any.y = this.y;
          this.up[side].x = this.x;
          this.up[side].y = this.y;
          
          this.hold.any = false;
          this.hold[side] = false;
          this.impulseUp.any = true;
          this.impulseUp[side] = true;
          delete this.touches[event.pointerId];
          this.activeTouches.splice(this.activeTouches.indexOf(event.pointerId),1);
          if (this.canvas.cg.settings.input.callbacks.cursorUp!==null) {
            this.canvas.cg.settings.input.callbacks.cursorUp(event,this.canvas);
          }
        } else if (event.type=="pointermove") {
          if (cg.Input.cursor.canvas.hasHiddenCursorForEmulatedCursor&&event.pointerType=="mouse") {
            cg.Input.cursor.canvas.hasHiddenCursorForEmulatedCursor = false;
            cg.Input.cursor.canvas.keepCursorHidden = false;
            cg.Input.cursor.canvas.element.style.cursor = cg.settings.core.defaultCursor;
          }
          if (this.touches[event.pointerId]!==undefined) {
            this.touches[event.pointerId].x = this.x;
            this.touches[event.pointerId].y = this.y;
            this.touches[event.pointerId].clientX = event.clientX;
            this.touches[event.pointerId].clientY = event.clientY;
            this.touches[event.pointerId].canvasX = this.canvasX;
            this.touches[event.pointerId].canvasY = this.canvasY;
          }
          if (this.canvas.cg.settings.input.callbacks.cursorMove!==null) {
            this.canvas.cg.settings.input.callbacks.cursorMove(event,this.canvas);
          }
        }
      };
      enter(event) {
        let cgCanvas = event.target.cgCanvas;
        let cursorEnter = cgCanvas.cg.settings.input.callbacks.cursorEnter;
        if (cursorEnter!==null) {
          cursorEnter(event,cgCanvas);
        }
      };
      exit(event) {
        let cgCanvas = event.target.cgCanvas;
        let cursorLeave = cgCanvas.cg.settings.input.callbacks.cursorLeave;
        if (cursorLeave!==null) {
          cursorLeave(event,cgCanvas);
        }
      };
      cancel(event) {
        delete this.touches[event.pointerId];
        this.activeTouches.splice(this.activeTouches.indexOf(event.pointerId),1);

        if (ChoreoGraph.Input.downCanvases[event.pointerId]!==undefined) {
          this.up.any.x = this.x;
          this.up.any.y = this.y;
          this.up.left.x = this.x;
          this.up.left.y = this.y;
          this.up.middle.x = this.x;
          this.up.middle.y = this.y;
          this.up.right.x = this.x;
          this.up.right.y = this.y;
        }

        delete ChoreoGraph.Input.downCanvases[event.pointerId];

        this.hold.any = false;
        this.hold.left = false;
        this.hold.middle = false;
        this.hold.right = false;
      };
      contextMenu(event) {
        if (this.canvas.cg.settings.input.preventContextMenu) {
          event.preventDefault();
        }
      };
    };

    pointerDown(event) {
      if (event.target.cgCanvas===undefined) { return };
      ChoreoGraph.Input.lastClickedCanvas = event.target.cgCanvas;
      if (event.pointerId>1) { ChoreoGraph.Input.hasMultipleCursors = true; }
      event.target.cgCanvas.cg.Input.updateCursor(event.target.cgCanvas,event);
      ChoreoGraph.Input.downCanvases[event.pointerId] = event.target.cgCanvas;
      ChoreoGraph.Input.updateButtons(event.target.cgCanvas,event,"down");

      if (event.pointerType=="mouse") {
        let fakeEvent = new class FakeKeyboardEvent {
          type = "keydown";
          key = ["mouseleft","mousemiddle","mouseright","mousebutton1","mousebutton2"][event.button];
          keyType = "mouse";
        }
        ChoreoGraph.Input.keyDown(fakeEvent);
      }
    };
    pointerUp(event) {
      let canvas = ChoreoGraph.Input.downCanvases[event.pointerId];
      if (canvas===undefined) { return }
      ChoreoGraph.Input.downCanvases[event.pointerId].cg.Input.updateCursor(canvas,event);
      ChoreoGraph.Input.updateButtons(canvas,event,"up");
      delete ChoreoGraph.Input.downCanvases[event.pointerId];

      if (event.pointerType=="mouse") {
        let fakeEvent = new class FakeKeyboardEvent {
          type = "keyup";
          key = ["mouseleft","mousemiddle","mouseright","mousebutton1","mousebutton2"][event.button];
          keyType = "mouse";
        }
        ChoreoGraph.Input.keyUp(fakeEvent);
      }
    };
    pointerMove(event) {
      for (let cg of ChoreoGraph.instances) {
        if (cg.ready==false) { continue; }
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          cg.Input.updateCursor(canvas,event);
          ChoreoGraph.Input.updateButtons(canvas,event);
        }
      }
    };
    pointerCancel(event) {
      for (let cg of ChoreoGraph.instances) {
        for (let canvasId of cg.keys.canvases) {
          let cursor = cg.Input.canvasCursors[canvasId];
          cursor.cancel(event);
        }
      }
    };
    contextMenu(event) {
      if (event.target.cgCanvas===undefined) { return };
      event.target.cgCanvas.cg.Input.canvasCursors[event.target.cgCanvas.id].contextMenu(event);
    }
    wheel(event) {
      for (let cg of ChoreoGraph.instances) {
        if (cg.ready==false) { continue; }
        if (cg.settings.input.preventScrollWheel) {
          event.preventDefault();
        }
        if (cg.settings.input.callbacks.wheel!==null) {
          cg.settings.input.callbacks.wheel(event);
        }
      }
      
      let key = null;
      if (event.deltaY > 0) {
        key = "mousewheeldown";
      } else {
        key = "mousewheelup";
      }
      let fakeDownEvent = new class FakeKeyboardEvent {
        type = "keydown";
        key = key;
        keyType = "mouse";
      }
      ChoreoGraph.Input.keyDown(fakeDownEvent);

      let fakeUpEvent = new class FakeKeyboardEvent {
        type = "keyup";
        key = key;
        keyType = "mouse";
      }
      ChoreoGraph.Input.keyUp(fakeUpEvent);
    };

    lastClickedCanvas = null;

    cursorImpulseReset() {
      for (let cg of ChoreoGraph.instances) {
        for (let canvasId of cg.keys.canvases) {
          let cursor = cg.Input.canvasCursors[canvasId];
          if (cursor===undefined) { continue; }
          cursor.impulseDown.left = false;
          cursor.impulseDown.middle = false;
          cursor.impulseDown.right = false;
          cursor.impulseDown.any = false;
          cursor.impulseUp.left = false;
          cursor.impulseUp.middle = false;
          cursor.impulseUp.right = false;
          cursor.impulseUp.any = false;
        }
      }
    }

    // KEYBOARD

    lastKeyDown = null;
    lastKeyDownFrame = -1;
    activeKeys = 0;
    capsLock = false;
    altKey = false;
    ctrlKey = false;
    shiftKey = false;
    metaKey = false;

    isInstanceKeyAvailable(cg) {
      return (cg.settings.input.focusKeys&&ChoreoGraph.Input.lastClickedCanvas!==null&&ChoreoGraph.Input.lastClickedCanvas.cg.id==cg.id)||(!cg.settings.input.focusKeys);
    }

    standardKeyFunctions(event) {
      cg.Input.lastInteraction.any = cg.clock;
      cg.Input.lastInteraction.key = cg.clock;
      if (event.keyType=="controller") {
        cg.Input.lastInputType = ChoreoGraph.Input.CONTROLLER;
        cg.Input.lastKeyType = ChoreoGraph.Input.CONTROLLER;
        cg.Input.lastInteraction.controller = cg.clock;
      } else if (event.keyType=="mouse") {
        cg.Input.lastInputType = ChoreoGraph.Input.MOUSE;
        cg.Input.lastKeyType = ChoreoGraph.Input.MOUSE;
        cg.Input.lastInteraction.mouse = cg.clock;
      } else {
        cg.Input.lastInputType = ChoreoGraph.Input.KEYBOARD;
        cg.Input.lastKeyType = ChoreoGraph.Input.KEYBOARD;
        cg.Input.lastInteraction.keyboard = cg.clock;
      }
      return ChoreoGraph.Input.getSimplifiedKey(event);
    }

    keyDown(event) {
      for (let cg of ChoreoGraph.instances) {
        if (ChoreoGraph.Input.isInstanceKeyAvailable(cg)) {
          let key = ChoreoGraph.Input.standardKeyFunctions(event);
          if (cg.settings.input.preventDefaultKeys.includes(key)) {
            event.preventDefault();
          }
          if (ChoreoGraph.Input.keyStates[key]===undefined) { return; }
          if (ChoreoGraph.Input.keyStates[key]) { return; }
          ChoreoGraph.Input.lastKeyDown = key;
          ChoreoGraph.Input.lastKeyDownFrame = ChoreoGraph.frame;
          ChoreoGraph.Input.keyStates[key] = true;
          ChoreoGraph.Input.activeKeys++;
          if (cg.settings.input.callbacks.keyDown!==null) {
            cg.settings.input.callbacks.keyDown(key,event);
          }
        } else {
          continue;
        }
      }
    };
    keyUp(event) {
      for (let cg of ChoreoGraph.instances) {
        if (ChoreoGraph.Input.isInstanceKeyAvailable(cg)) {
          let key = ChoreoGraph.Input.standardKeyFunctions(event);
          if (ChoreoGraph.Input.keyStates[key]===undefined) { return; }
          if (ChoreoGraph.Input.keyStates[key]==false) { return; }
          ChoreoGraph.Input.keyStates[key] = false;
          ChoreoGraph.Input.activeKeys--;
          if (cg.settings.input.callbacks.keyUp!==null) {
            cg.settings.input.callbacks.keyUp(key,event);
          }
          if (ChoreoGraph.Input.activeKeys==0) {
            ChoreoGraph.Input.altKey = false;
            ChoreoGraph.Input.ctrlKey = false;
            ChoreoGraph.Input.shiftKey = false;
            ChoreoGraph.Input.metaKey = false;
          }
        } else {
          continue;
        }
      }
    };

    blur() {
      ChoreoGraph.Input.releaseAllKeys();
    }

    releaseAllKeys() {
      for (let key in this.keyStates) {
        this.keyStates[key] = false;
      }
      ChoreoGraph.Input.activeKeys = 0;
      ChoreoGraph.Input.altKey = false;
      ChoreoGraph.Input.ctrlKey = false;
      ChoreoGraph.Input.shiftKey = false;
      ChoreoGraph.Input.metaKey = false;
    }

    getSimplifiedKey(event) {
      let key = event.key;
      let output = key;
      if (key=="ArrowLeft") { output = "left"; }
      else if (key=="ArrowRight") { output = "right"; }
      else if (key=="ArrowUp") { output = "up"; }
      else if (key=="ArrowDown") { output = "down"; }
      else if (key=="Control") { output = "ctrl"; }
      else if (key==" ") { output = "space"; }

      output = output.toLowerCase();
      return output;
    };

    // CONTROLLERS

    controllers = {};
    selectedController = null;
    get controller() {
      if (this.selectedController===null) { return null; }
      return this.controllers[this.selectedController];
    }

    GamePadController = class cgGamePadController {
      connected = true;

      lastButtons = [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false];

      get gamepad() {
        if (this.connected==false) { return this.lastGamepad; }
        this.lastGamepad = navigator.getGamepads()[this.lastGamepad.index]
        return this.lastGamepad;
      }

      constructor(event) {
        this.lastGamepad = event.gamepad;

        if (ChoreoGraph.Input.selectedController===null) {
          ChoreoGraph.Input.selectedController = this.lastGamepad.index;
        }

        if (this.lastGamepad.mapping!=="standard") {
          this.connected = false;
          console.warn("Controller not supported",this.lastGamepad.id);
        }
      }
    };

    controllerButtonLoop(cg) {
      let controller = ChoreoGraph.Input.controller;
      if (controller==null||controller.connected==false||cg.settings.input.allowController==false) { return; }
      if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
      let gamepad = controller.gamepad;
      if (gamepad===undefined) { return; }

      function checkButton(buttonIndex,pressed) {
        if (controller.lastButtons[buttonIndex]!==pressed) {
          let fakeEvent = new class FakeKeyboardEvent {
            type = null;
            gamepad = gamepad;
            gamepadButtonIndex = buttonIndex;
            key = ["conactionbottom","conactionright","conactionleft","conactiontop","conleftbumper","conrightbumper","conlefttrigger","conrighttrigger","conselect","constart","conleftstick","conrightstick","condpadup","condpaddown","condpadleft","condpadright","conleftstickup","conleftstickdown","conleftstickleft","conleftstickright","conrightstickup","conrightstickdown","conrightstickleft","conrightstickright"][buttonIndex];
            keyType = "controller";
          }
          if (pressed) {
            fakeEvent.type = "keydown";
            ChoreoGraph.Input.keyDown(fakeEvent);
          } else {
            fakeEvent.type = "keyup";
            ChoreoGraph.Input.keyUp(fakeEvent);
          }
        }
        controller.lastButtons[buttonIndex] = pressed;
      }

      for (let buttonIndex=0;buttonIndex<gamepad.buttons.length;buttonIndex++) {
        checkButton(buttonIndex,gamepad.buttons[buttonIndex].pressed);
      };
      let dead = cg.settings.input.controller.keyStickDeadzone;
      let lsx = gamepad.axes[0];
      let lsy = gamepad.axes[1];
      let rsx = gamepad.axes[2];
      let rsy = gamepad.axes[3];
      if (lsy>dead) { checkButton(17,true); } else { checkButton(17,false); }
      if (lsy<-dead) { checkButton(16,true); } else { checkButton(16,false); }
      if (lsx>dead) { checkButton(19,true); } else { checkButton(19,false); }
      if (lsx<-dead) { checkButton(18,true); } else { checkButton(18,false); }
      if (rsy>dead) { checkButton(21,true); } else { checkButton(21,false); }
      if (rsy<-dead) { checkButton(20,true); } else { checkButton(20,false); }
      if (rsx>dead) { checkButton(23,true); } else { checkButton(23,false); }
      if (rsx<-dead) { checkButton(22,true); } else { checkButton(22,false); }
    };

    emulatedCursorLoop(cg) {
      let controller = ChoreoGraph.Input.controller;
      if (controller==null||controller.connected==false) { return; }
      if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
      let cursor = cg.Input.canvasCursors[ChoreoGraph.Input.lastClickedCanvas.id];
      let emulatedCursor = cg.settings.input.controller.emulatedCursor;
      let gamepad = controller.gamepad;
      let xi = 0;
      let yi = 1;
      if (emulatedCursor.stickSide=="right") {
        xi = 2;
        yi = 3;
      }
      let sx = gamepad.axes[xi];
      let sy = gamepad.axes[yi];

      let sen = emulatedCursor.stickSensitivity;
      let dead = emulatedCursor.stickDeadzone;

      if (Math.abs(sx)<dead) { sx = 0; }
      if (Math.abs(sy)<dead) { sy = 0; }

      if (sx!=0||sy!=0) {
        cursor.clientX += sen*sx*ChoreoGraph.timeDelta;
        cursor.clientY += sen*sy*ChoreoGraph.timeDelta;
  
        if (emulatedCursor.lockCursorCanvas) {
          if (cursor.clientX<cursor.boundBox.left) { cursor.clientX = cursor.boundBox.left; }
          if (cursor.clientX>cursor.boundBox.right) { cursor.clientX = cursor.boundBox.right; }
          if (cursor.clientY<cursor.boundBox.top) { cursor.clientY = cursor.boundBox.top; }
          if (cursor.clientY>cursor.boundBox.bottom) { cursor.clientY = cursor.boundBox.bottom; }
        }
        let canvas = cg.Input.cursor.canvas;
        if (emulatedCursor.hideCursor&&canvas.keepCursorHidden==false) {
          canvas.hasHiddenCursorForEmulatedCursor = true;
          canvas.keepCursorHidden = true;
          canvas.element.style.cursor = "none";
        } else if (!emulatedCursor.hideCursor&&canvas.keepCursorHidden&&canvas.hasHiddenCursorForEmulatedCursor) {
          canvas.hasHiddenCursorForEmulatedCursor = false;
          canvas.keepCursorHidden = false;
          canvas.element.style.cursor = cg.settings.core.defaultCursor;
        }
  
        let fakeEvent = new class FakePointerEvent {
          target = ChoreoGraph.Input.lastClickedCanvas.element;
          pointerId = 0;
          gamepad = gamepad;
          type = "pointermove";
          clientX = cursor.clientX;
          clientY = cursor.clientY;
          pointerType = "controller";
        }
        ChoreoGraph.Input.pointerMove(fakeEvent);
      }

      if (emulatedCursor.buttons.active) {
        if (controller.emulatedCursorLastButtons===undefined) {
          controller.emulatedCursorLastButtons = {
            left : false,
            right : false,
            up : false
          };
        };
        let buttons = controller.emulatedCursorLastButtons;
        let settings = emulatedCursor.buttons;
        function pointerDown(side) {
          if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
          let fakeEvent = new class FakePointerEvent {
            target = ChoreoGraph.Input.lastClickedCanvas.element;
            pointerId = 0;
            gamepad = gamepad;
            button = {left:0,right:2,up:1}[side];
            type = "pointerdown";
            clientX = cursor.clientX;
            clientY = cursor.clientY;
            pointerType = "controller";
          }
          ChoreoGraph.Input.pointerDown(fakeEvent);
        }
        function pointerUp(side) {
          if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
          let fakeEvent = new class FakePointerEvent {
            target = ChoreoGraph.Input.lastClickedCanvas.element;
            pointerId = 0;
            gamepad = gamepad;
            button = {left:0,right:2,up:1}[side];
            type = "pointerup";
            clientX = cursor.clientX;
            clientY = cursor.clientY;
            pointerType = "controller";
          }
          ChoreoGraph.Input.pointerUp(fakeEvent);
        }
        for (let side of ["left","right","up"]) {
          if (settings[side]!=null) {
            if (gamepad.buttons[settings[side]].pressed) {
              if (!buttons[side]) {
                pointerDown(side);
              }
              buttons[side] = true;
            } else {
              if (buttons[side]) {
                pointerUp(side);
              }
              buttons[side] = false;
            }
          }
        }
      }
    };

    // BUTTONS

    Button = class cgButton {
      downTime = -Infinity;
      upTime = -Infinity;
      enterTime = -Infinity;
      exitTime = -Infinity;
      hovered = false;
      pressed = false;
      check = null;
      cursor = "pointer";
      allowedButtons = [true,false,true]; // Left Middle Right
      hoverCount = 0;

      // Callbacks
      down = null;
      up = null;
      enter = null;
      exit = null;

      CGSpace = true;

      allowUpWithNoPress = false;

      get x() { return this.transform.x; }
      get y() { return this.transform.y; }
      get canvasSpaceXAnchor() { return this.transform.canvasSpaceXAnchor; }
      get canvasSpaceYAnchor() { return this.transform.canvasSpaceYAnchor; }

      transform = null;

      scene = null;

      constructor(buttonInit) {
        if (buttonInit.transform===undefined) {
          if (buttonInit.transformId!=undefined) {
            this.transform = cg.createTransform();
          } else {
            this.transform = cg.createTransform({},buttonInit.transformId);
            delete buttonInit.transformId;
          }
        }
        if (buttonInit.x!=undefined) { this.transform.x = buttonInit.x; delete buttonInit.x; }
        if (buttonInit.y!=undefined) { this.transform.y = buttonInit.y; delete buttonInit.y; }
        if (buttonInit.canvasSpaceXAnchor!=undefined) { this.transform.canvasSpaceXAnchor = buttonInit.canvasSpaceXAnchor; delete buttonInit.canvasSpaceXAnchor; }
        if (buttonInit.canvasSpaceYAnchor!=undefined) { this.transform.canvasSpaceYAnchor = buttonInit.canvasSpaceYAnchor; delete buttonInit.canvasSpaceYAnchor; }
      };

      cursorInside(cursor,onlyPrimaryTouch=false) {
        if (cursor?.canvas.camera==null) { return false; }
        if (this.check!==null) {
          if (this.check in this.cg.Input.buttonChecks) {
            if (this.cg.Input.buttonChecks[this.check]==false) {
              return false;
            }
          }
        }
        let foundScene = false;
        for (let scene of cursor.canvas.camera.scenes) {
          if (this.scene==scene) {
            foundScene = true;
            break;
          }
        }
        if (foundScene==false) { return false; }
        let hovered = false;

        function getPositionInSpace(button,cursor,touch=null) {
          if (button.CGSpace) {
            if (touch!==null) {
              return [cursor.touches[touch].x,cursor.touches[touch].y];
            } else {
              return [cursor.x,cursor.y];
            }
          } else {
            let x = touch!==null ? cursor.touches[touch].canvasX : cursor.canvasX;
            let y = touch!==null ? cursor.touches[touch].canvasY : cursor.canvasY;
            x -= button.canvasSpaceXAnchor*cursor.canvas.width;
            y -= button.canvasSpaceYAnchor*cursor.canvas.height;
            x /= cursor.canvas.camera.canvasSpaceScale;
            y /= cursor.canvas.camera.canvasSpaceScale;
            return [x,y];
          }
        }

        if (this.cg.Input.lastInputType==ChoreoGraph.Input.TOUCH) {
          if (onlyPrimaryTouch) {
            const [x, y] = getPositionInSpace(this,cursor);
            if (this.inside(x,y)) {
              hovered = true;
            }
          } else {
            for (let touch of cursor.activeTouches) {
              const [x, y] = getPositionInSpace(this,cursor,touch);
              if (this.inside(x,y)) {
                hovered = true;
              }
            }
          }
        } else {
          const [x, y] = getPositionInSpace(this,cursor);
          hovered = this.inside(x,y);
        }
        return hovered;
      };

      setStyles(canvas) {
        let c = canvas.c;
        c.globalAlpha = canvas.cg.settings.input.debug.buttons.opacity;
        let style = canvas.cg.settings.input.debug.buttons.style;
        c.fillStyle = style.bgNormal;
        if (canvas.cg.Input.buttonChecks[this.check]==false){cg.c.fillStyle=style.bgInactive;}
        if (this.hovered){c.fillStyle=style.bgHover;}
        if (this.pressed){c.fillStyle=style.bgClicked;}
        let fadeOut = canvas.cg.settings.input.debug.buttons.fadeOut;
        if (ChoreoGraph.nowint-this.upTime<fadeOut) {
          c.fillStyle = ChoreoGraph.colourLerp(style.bgClicked,cg.c.fillStyle,(ChoreoGraph.nowint-this.upTime)/fadeOut);
        }
      }

      drawTitle(canvas) {
        ChoreoGraph.transformContext(canvas.camera,this.x,this.y,0,1,1,this.CGSpace,false,false,this.canvasSpaceXAnchor,this.canvasSpaceYAnchor);
        let c = canvas.c;
        c.globalAlpha = 1;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = canvas.cg.settings.input.debug.buttons.style.textColour;
        c.fillText(this.id, 0, 0);
      };
    };

    rectangleButton = class cgRectangleButton extends this.Button {
      type = "rectangle";
      width = 100;
      height = 100;

      inside(x,y) {
        return (x>this.x-this.width/2&&x<this.x+this.width/2&&y>this.y-this.height/2&&y<this.y+this.height/2);
      };

      drawShape(canvas) {
        canvas.c.fillRect(-this.width/2,-this.height/2,this.width,this.height);
      };
    };

    circleButton = class cgCircleButton extends this.Button {
      type = "circle";
      radius = 50;
      
      inside(x,y) {
        return Math.sqrt((x-this.x)**2+(y-this.y)**2) < this.radius;
      };

      drawShape(canvas) {
        canvas.c.beginPath();
        canvas.c.arc(0,0,this.radius,0,Math.PI*2);
        canvas.c.fill();
      };
    };

    polygonButton = class cgPolygonButton extends this.Button {
      type = "polygon";
      path = [];

      inside(x,y) {
        let i, j;
        let inside = false;
        for (i = 0, j = this.path.length - 1; i < this.path.length; j = i++) {
          let ip = [this.path[i][0],this.path[i][1]];
          let jp = [this.path[j][0],this.path[j][1]];
          ip[0] += this.x;
          ip[1] += this.y;
          jp[0] += this.x;
          jp[1] += this.y;
          if (((ip[1] > y) != (jp[1] > y))&&(x < (jp[0]-ip[0]) * (y-ip[1]) / (jp[1]-ip[1]) + ip[0])) inside = !inside;
        }
        return inside;
      };

      drawShape(canvas) {
        canvas.c.beginPath();
        for (let i=0;i<this.path.length;i++) {
          let point = this.path[i];
          if (i==0) {
            canvas.c.moveTo(point[0],point[1]);
          } else {
            canvas.c.lineTo(point[0],point[1]);
          }
        }
        canvas.c.closePath();
        canvas.c.fill();
      };
    };

    updateButtons(canvas,event,special=false) {
      let cg = canvas.cg;
      for (let buttonId of cg.keys.buttons) {
        let button = cg.Input.buttons[buttonId];
        let isRelevant = false;
        for (let camera of button.scene.cameras) {
          if (camera.canvas==canvas) {
            isRelevant = true;
            break;
          }
        }
        if (!isRelevant) { continue; }
        if (button.cursorInside(cg.Input.canvasCursors[canvas.id],special=="down")) {
          if (!button.hovered) {
            button.hovered = true;
            button.enterTime = ChoreoGraph.nowint;
            button.hoverCount++;
            cg.Input.hoveredButtons++;
            if (cg.Input.cursor.canvas.keepCursorHidden==false) {
              cg.Input.cursor.canvas.element.style.cursor = button.cursor;
            }
            if (button.enter!==null) {
              button.enter(event,canvas);
            }
          }
          if (special=="down") {
            if (button.allowedButtons[event.button]) {
              button.downTime = ChoreoGraph.nowint;
              button.pressed = true;
              if (button.down!==null) {
                button.down(event,canvas);
              }
            }
          } else if (special=="up") {
            if (button.pressed||button.allowUpWithNoPress) {
              button.upTime = ChoreoGraph.nowint;
              button.pressed = false;
              if (button.up!==null) {
                button.up(event,canvas);
              }
            }
          }
        } else {
          if (button.hovered) {
            button.hovered = false;
            button.exitTime = ChoreoGraph.nowint;
            button.hoverCount--;
            cg.Input.hoveredButtons--;
            if (button.hoverCount==0&&(button.pressed||button.allowUpWithNoPress)) {
              button.upTime = ChoreoGraph.nowint;
              if (button.up!==null) {
                button.up(event,canvas);
              }
            }
            if (button.hoverCount==0) {
              button.pressed = false;
            }
            if (cg.Input.hoveredButtons==0&&cg.Input.cursor.canvas.keepCursorHidden==false) {
              cg.Input.cursor.canvas.element.style.cursor = cg.settings.core.defaultCursor;
            }
            if (button.exit!==null) {
              button.exit(event,canvas);
            }
          }
        }
      }
    };

    unhoverAllButtons(event) {
      for (let cg of ChoreoGraph.instances) {
        for (let buttonId of cg.keys.buttons) {
          let button = cg.Input.buttons[buttonId];
          if (button.hovered) {
            button.hovered = false;
            button.exitTime = ChoreoGraph.nowint;
            button.hoverCount = 0;
            cg.Input.hoveredButtons = 0;
            if (button.exit!==null) {
              button.exit(event,canvas);
            }
          }
        }
      }
    };

    // ACTIONS

    ActionKey = class cgActionKey {
      main = null;
      shift = false;
      ctrl = false;
      alt = false;
      meta = false;
      deadzone = 0.2;

      constructor(init) {
        this.main = init.main;
        this.shift = init.shift || false;
        this.ctrl = init.ctrl || false;
        this.alt = init.alt || false;
        this.meta = init.meta || false;
        if (init.deadzone!=undefined) {
          this.deadzone = init.deadzone;
        }
      };

      get() {
        if (this.cachedFrame==ChoreoGraph.frame) { return this.cachedValue; }
        if (this.main==null) { return 0; }
        if (!ChoreoGraph.Input.altKey&&this.alt) { return 0; }
        if (!ChoreoGraph.Input.ctrlKey&&this.ctrl) { return 0; }
        if (!ChoreoGraph.Input.shiftKey&&this.shift) { return 0; }
        if (!ChoreoGraph.Input.metaKey&&this.meta) { return 0; }
        let controllerAxes = ["conleftup","conleftdown","conleftleft","conleftright","conrightup","conrightdown","conrightleft","conrightright"];
        if (controllerAxes.includes(this.main)) {
          let controller = ChoreoGraph.Input.controller;
          if (controller==null||controller.connected==false) { return 0; }
          let gamepad = controller.gamepad;
          switch (this.main) {
            case "conleftup":
              if (gamepad.axes[1]<-this.deadzone) { return -gamepad.axes[1]; }
              return 0;
            case "conleftdown":
              if (gamepad.axes[1]>this.deadzone) { return gamepad.axes[1]; }
              return 0;
            case "conleftleft":
              if (gamepad.axes[0]<-this.deadzone) { return -gamepad.axes[0]; }
              return 0;
            case "conleftright":
              if (gamepad.axes[0]>this.deadzone) { return gamepad.axes[0]; }
              return 0;
            case "conrightup":
              if (gamepad.axes[3]<-this.deadzone) { return -gamepad.axes[3]; }
              return 0;
            case "conrightdown":
              if (gamepad.axes[3]>this.deadzone) { return gamepad.axes[3]; }
              return 0;
            case "conrightleft":
              if (gamepad.axes[2]<-this.deadzone) { return -gamepad.axes[2]; }
              return 0;
            case "conrightright":
              if (gamepad.axes[2]>this.deadzone) { return gamepad.axes[2]; }
              return 0;
          }
        } else if (ChoreoGraph.Input.keyStates[this.main]!==undefined) {
          return Number(ChoreoGraph.Input.keyStates[this.main]);
        } else if (this.main instanceof ChoreoGraph.Input.Button) {
          return Number(this.main.pressed);
        } else {
          return 0;
        }
      }
    };

    Action = class cgAction {
      keys = [];
      controllerAxes = [];

      cachedValue = 0;
      cachedFrame = -1;

      down = null;
      up = null;

      constructor(init) {
        for (let key of init.keys) {
          if (typeof key == "string") {
            this.keys.push(new ChoreoGraph.Input.ActionKey({main:key}));
          } else if (key instanceof ChoreoGraph.Input.Button) {
            this.keys.push(new ChoreoGraph.Input.ActionKey({main:key}));
          } else if (key instanceof ChoreoGraph.Input.ActionKey) {
            this.keys.push(key);
          } else if (typeof key == "object") {
            this.keys.push(new ChoreoGraph.Input.ActionKey(key));
          }
        }
      }

      get() {
        if (this.cachedFrame==ChoreoGraph.frame) { return this.cachedValue; }
        let value = 0;
        for (let key of this.keys) {
          value += key.get();
        }
        value = Math.min(value,1);
        this.cachedFrame = ChoreoGraph.frame;
        this.cachedValue = value;
        return value;
      };
    };
  },

  instanceConnect(cg) {
    cg.Input = new ChoreoGraph.Input.instanceObject(cg);
    cg.keys.buttons = [];
    cg.keys.actions = [];
    cg.attachSettings("input",{
      preventSingleTouch : true, // Prevents touches starting on the canvas from scrolling the page, unless you would get trapped
      preventContextMenu : false, // Prevents the context menu from appearing on right click
      preventMiddleClick : false, // Prevents the middle mouse button from scrolling the page
      preventCanvasSelection : true, // Prevents the canvas from being selected, mainly for ios safari
      preventScrollWheel : false, // Prevents the page from scrolling when the mouse wheel is used

      focusKeys : false, // If true, keys will only be sent to the last clicked canvases instance

      preventDefaultKeys : [],

      allowController : true, // Allow controller input events
      controller : {
        keyStickDeadzone : 0.5,
        emulatedCursor : {
          active : false,
          hideCursor : true,
          lockCursorCanvas : true,
          stickSide : "left",
          stickDeadzone : 0.15,
          stickSensitivity : 0.5,
          buttons : {
            active : true,
            left : 1, // button index
            right : null,
            up : null
          }
        },
      },

      callbacks : {
        keyDown : null, // keyDown(keyName,event) when any known key is pressed it will activate this function
        keyUp : null, // keyUp(keyName,event) when any known key is released it will activate this function
        cursorUp : null, // cursorUp(event,canvas)
        cursorDown : null, // cursorDown(event,canvas)
        cursorMove : null, // cursorMove(event,canvas)
        cursorEnter : null, // cursorEnter(event,canvas) when the cursor enters a canvas
        cursorLeave : null, // cursorLeave(event,canvas) when the cursor exits a canvas
        wheel : null, // wheel(event) when the mouse wheel is used
        buttonClicked : null, // buttonClicked(buttonName,event) when a button is clicked
        updateButtonChecks : null // updateButtonChecks(cg) for ChoreoGraph to request button checks
      },

      debug : new class {
        buttons = {
          active : true,
          opacity : 0.4,
          fadeOut : 300, // Time in ms that the button fades out for
          style : {
            font : "12px Arial",
            textColour : "#000000",
            bgNormal : "#ffffff",
            bgInactive : "#000000",
            bgHover : "#ff0000",
            bgClicked : "#000000"
          }
        }
        #cg = cg;
        #active = false;
        set active(value) {
          this.#active = value;
          if (value&&!this.#cg.Input.hasActivatedDebugLoop) {
            this.#cg.Input.hasActivatedDebugLoop = true;
            this.#cg.overlayLoops.push(this.#cg.Input.inputDebugLoop);
          }
        }
        get active() { return this.#active; }
      }
    });
  },

  instanceStart(cg) {
    for (let canvasId of cg.keys.canvases) {
      let canvas = cg.canvases[canvasId];
      let cursor = new ChoreoGraph.Input.canvasCursorData(canvas);
      cg.Input.canvasCursors[canvasId] = cursor;
      if (cg.settings.input.preventSingleTouch) {
        canvas.element.style.touchAction = "none";
      }
      if (cg.settings.input.preventCanvasSelection) {
        canvas.element.style.userSelect = "none";
        canvas.element.style.webkitUserSelect = "none";
      }
      canvas.element.style.userSelect = "none";
      canvas.element.style.webkitUserSelect = "none";

      canvas.element.addEventListener("pointerenter", cursor.enter, false);
      canvas.element.addEventListener("pointerleave", cursor.exit, false);

      ChoreoGraph.globalAfterLoops.push(ChoreoGraph.Input.cursorImpulseReset);
      cg.processLoops.push(ChoreoGraph.Input.controllerButtonLoop);
      if (cg.settings.input.controller.emulatedCursor.active) {
        cg.processLoops.push(ChoreoGraph.Input.emulatedCursorLoop);
      }
    }
  }
});