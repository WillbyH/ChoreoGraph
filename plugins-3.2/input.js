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
      window.addEventListener("blur", this.blur);
      window.addEventListener("gamepadconnected", (event) => { ChoreoGraph.Input.controllers[event.gamepad.index] = new ChoreoGraph.Input.GamePadController(event); });
      window.addEventListener("gamepaddisconnected", (event) => { ChoreoGraph.Input.controllers[event.gamepad.index].connected = false; });

      this.keyNames = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","1","2","3","4","5","6","7","8","9","0","left","right","up","down","ctrl","shift","alt","space","enter","backspace","tab","capslock","escape","pageup","pagedown","end","home","insert","delete","numlock","scrolllock","pause","printscreen","contextmenu","meta","altgraph","fn","fnlock","hyper","super","symbol","symbollock","clear","cut","copy","paste","eraseeof","exsel","redo","undo","accept","again","attn","cancel","execute","find","finish","help","play","props","select","zoomin","zoomout","brightnessdown","brightnessup","eject","logoff","power","poweroff","hibernate","standby","wakeup","allcandidates","alphanumeric","codeinput","compose","convert","dead","finalmode","groupfirst","grouplast","groupnext","groupprevious","modechange","nextcandidate","nonconvert","previouscandidate","process","singlecandidate","hangulmode","hanjamode","junjamode","eisu","hankaku","hiragana","hiraganakatakana","kanamode","kanjimode","katakana","romaji","zenkaku","zenkakukankaku",";","=",",","-",".","/","`","[","\\","]","'","^",":","!",,"<",">","?","~","{","|","}",'"',"@","#","$","%","&","*","(",")","_","+","f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12","f13","f14","f15","f16","f17","f18","f19","f20","f21","f22","f23","f24","soft1","soft2","soft3","soft4","appswitch","call","camera","camerafocus","endcall","goback","gohome","headsethook","lastnumberredial","notification","mannermode","voicedial","channeldown","channelup","mediafastforward","mediapause","mediaplay","mediaplaypause","mediarecord","mediarewind","mediastop","mediatrackprevious","audiobalanceleft","audiobalanceright","audiobassdown","audiobassboostdown","audiobassboosttoggle","audiobassboostup","audiobassup","audiofaderfront","audiofaderrear","audiosurroundmodenext","audiotrebledown","audiotrebleup","audiovolumedown","audiovolumemute","audiovolumeup","microphonetoggle","microphonevolumedown","microphonevolumemute","microphonevolumeup","close","new","open","print","save","spellcheck","mailforward","mailreply","mailsend","browserback","browserfavourites","browserforward","browserhome","browserrefresh","browsersearch","browserstop","decimal","key11","key12","multiply","add","divide","subtract","separator",
      "conactiontop","conactionbottom","conactionleft","conactionright","condpadup","condpaddown","condpadleft","condpadright","conleftstick","conrightstick","constart","conselect","conleftbumper","conrightbumper","conlefttrigger","conrighttrigger","conleftstickup","conleftstickdown","conleftstickleft","conleftstickright","conrightstickup","conrightstickdown","conrightstickleft","conrightstickright"];

      // This list does not include TV, Media Controller, Speech Recognition or Application Selector keys
      // See https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values for more information

      this.keyStates = {};
      for (let key of this.keyNames) {
        this.keyStates[key] = false;
      }

      this.controllerLayouts = {};

      this.controllerLayouts.xbox = {
        name : "XBox",
        buttons : {
          a:0,b:1,x:2,y:3,
          lb:4,rb:5,lt:6,rt:7,
          back:8,start:9,
          ls:10,rs:11,
          up:12,down:13,left:14,right:15,
          home:16,

          0:"a",1:"b",2:"x",3:"y",
          4:"lb",5:"rb",6:"lt",7:"rt",
          8:"back",9:"start",
          10:"ls",11:"rs",
          12:"up",13:"down",14:"left",15:"right",
          16:"home"
        },
        axes : {
          lsx:0,lsy:1,
          rsx:2,rsy:3,

          0:"lsx",1:"lsy",
          2:"rsx",3:"rsy"
        }
      };
      this.controllerLayouts.playstation = {
        name : "PlayStation",
        buttons : {
          cross:0,circle:1,square:2,triangle:3,
          l1:4,r1:5,l2:6,r2:7,
          select:8,start:9,
          ls:10,rs:11,
          up:12,
          down:13,
          left:14,
          right:15,
          home:16,

          0:"cross",1:"circle",2:"square",3:"triangle",
          4:"l1",5:"r1",6:"l2",7:"r2",
          8:"select",9:"start",
          10:"ls",11:"rs",
          12:"up",13:"down",14:"left",15:"right",
          16:"home"
        },
        axes : {
          lsx:0,lsy:1,
          rsx:2,rsy:3,

          0:"lsx",1:"lsy",
          2:"rsx",3:"rsy"
        }
      }
    }
    instanceObject = class Input {
      get cursor() { return this.canvasCursors[this.cg.settings.core.defaultCanvas.id]; }
      lastInputType = "mouse";
      lastInteraction = {
        cursor : -Infinity,
        keyboard : -Infinity,
        controller : -Infinity
      };

      constructor(cg) {
        this.cg = cg;
        this.canvasCursors = {};
      };
      updateCursor(canvas,event) {
        this.cg.Input.lastInputType = event.pointerType;
        const cursor = this.canvasCursors[canvas.id];
        if (cursor===undefined) { return; }
        cursor.update(event);
      };
    };

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
      impulse = {
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
      }
      update(event) {
        if (event.type!="pointermove") {
          this.canvas.cg.Input.lastInteraction.cursor = this.canvas.cg.clock;
        }
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
        let cameraXOffset = this.canvas.camera.x-(this.canvas.width/this.canvas.camera.z)/2;
        let cameraYOffset = this.canvas.camera.y-(this.canvas.height/this.canvas.camera.z)/2;
        this.x = Math.floor(((event.clientX-this.boundBox.left)/this.boundBox.width)*(this.canvas.width/this.canvas.camera.z))+cameraXOffset;
        this.y = Math.floor(((event.clientY-this.boundBox.top)/this.boundBox.height)*(this.canvas.height/this.canvas.camera.z))+cameraYOffset;
        this.clientX = event.clientX;
        this.clientY = event.clientY;
        this.impulse.any = false;
        this.impulse.left = false;
        this.impulse.middle = false;
        this.impulse.right = false;
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
          this.impulse.any = true;
          this.impulse[side] = true;
          this.touches[event.pointerId] = {
            x : this.x,
            y : this.y
          };
          this.activeTouches.push(event.pointerId);
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
          delete this.touches[event.pointerId];
          this.activeTouches.splice(this.activeTouches.indexOf(event.pointerId),1);
          if (this.canvas.cg.settings.input.callbacks.cursorUp!==null) {
            this.canvas.cg.settings.input.callbacks.cursorUp(event,this.canvas);
          }
        } else if (event.type=="pointermove") {
          if (this.touches[event.pointerId]!==undefined) {
            this.touches[event.pointerId].x = this.x;
            this.touches[event.pointerId].y = this.y;
          }
          if (this.canvas.cg.settings.input.callbacks.cursorMove!==null) {
            this.canvas.cg.settings.input.callbacks.cursorMove(event,this.canvas);
          }
        }
      };
      enter(event) {
        let cursorEnter = this.cgCanvas.cg.settings.input.callbacks.cursorEnter;
        if (cursorEnter!==null) {
          cursorEnter(event,this.cgCanvas);
        }
      };
      exit(event) {
        let cursorLeave = this.cgCanvas.cg.settings.input.callbacks.cursorLeave;
        if (cursorLeave!==null) {
          cursorLeave(event,this.cgCanvas);
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
    };
    pointerUp(event) {
      if (ChoreoGraph.Input.downCanvases[event.pointerId]===undefined) { return }
      ChoreoGraph.Input.downCanvases[event.pointerId].cg.Input.updateCursor(ChoreoGraph.Input.downCanvases[event.pointerId],event);
      delete ChoreoGraph.Input.downCanvases[event.pointerId];
    };
    pointerMove(event) {
      for (let cg of ChoreoGraph.instances) {
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          cg.Input.updateCursor(canvas,event);
        }
      }
    };
    pointerCancel(event) {
      console.log("cancel",event.pointerId);
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

    };

    lastClickedCanvas = null;

    lastKeyDown = null;
    activeKeys = 0;
    capsLock = false;

    keyDown(event) {
      for (let cg of ChoreoGraph.instances) {
        if ((cg.settings.input.focusKeys&&ChoreoGraph.Input.lastClickedCanvas!==null&&ChoreoGraph.Input.lastClickedCanvas.cg.id==cg.id)||(!cg.settings.input.focusKeys)) {
          let key = ChoreoGraph.Input.getSimplifiedKey(event);
          if (ChoreoGraph.Input.keyStates[key]===undefined) { return; }
          if (ChoreoGraph.Input.keyStates[key]) { return; }
          ChoreoGraph.Input.lastKeyDown = key;
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
        if ((cg.settings.input.focusKeys&&ChoreoGraph.Input.lastClickedCanvas!==null&&ChoreoGraph.Input.lastClickedCanvas.cg.id==cg.id)||(!cg.settings.input.focusKeys)) {
          let key = ChoreoGraph.Input.getSimplifiedKey(event);
          if (ChoreoGraph.Input.keyStates[key]===undefined) { return; }
          if (ChoreoGraph.Input.keyStates[key]==false) { return; }
          ChoreoGraph.Input.keyStates[key] = false;
          ChoreoGraph.Input.activeKeys--;
          if (cg.settings.input.callbacks.keyDown!==null) {
            cg.settings.input.callbacks.keyDown(key,event);
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

    controllers = {};
    selectedController = null;
    get controller() {
      if (this.selectedController===null) { return null; }
      return this.controllers[this.selectedController];
    }

    GamePadController = class cgGamePadController {
      connected = true;
      layout = "xbox";

      lastButtons = [false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false];

      get gamepad() {
        this.lastGamepad = navigator.getGamepads()[this.lastGamepad.index]
        return this.lastGamepad;
      }

      constructor(event) {
        this.lastGamepad = event.gamepad;

        if (ChoreoGraph.Input.selectedController===null) {
          ChoreoGraph.Input.selectedController = this.lastGamepad.index;
        }
      }
    };

    controllerButtonLoop(cg) {
      let controller = ChoreoGraph.Input.controller;
      if (controller==null||controller.connected==false) { return; }
      if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
      let gamepad = controller.gamepad;

      function getButtonName(buttonIndex) {
        return {
          0:"conactionbottom",
          1:"conactionright",
          2:"conactionleft",
          3:"conactiontop",
          4:"conleftbumper",
          5:"conrightbumper",
          6:"conlefttrigger",
          7:"conrighttrigger",
          8:"conselect",
          9:"constart",
          10:"conleftstick",
          11:"conrightstick",
          12:"condpadup",
          13:"condpaddown",
          14:"condpadleft",
          15:"condpadright"
        }[buttonIndex];
      }

      for (let buttonIndex=0;buttonIndex<gamepad.buttons.length;buttonIndex++) {
        let button = gamepad.buttons[buttonIndex];
        if (controller.lastButtons[buttonIndex]!==button.pressed) {
          if (button.pressed) {
            let fakeEvent = new class FakeKeyboardEvent {
              type = "keydown";
              gamepadButtonIndex = buttonIndex;
              key = getButtonName(buttonIndex);
            }
            ChoreoGraph.Input.keyDown(fakeEvent);
          } else {
            let fakeEvent = new class FakeKeyboardEvent {
              type = "keyup";
              gamepadButtonIndex = buttonIndex;
              key = getButtonName(buttonIndex);
            }
            ChoreoGraph.Input.keyUp(fakeEvent);
          }
        }
        controller.lastButtons[buttonIndex] = button.pressed;
      }
    };

    emulatedCursorLoop(cg) {
      let controller = ChoreoGraph.Input.controller;
      if (controller==null||controller.connected==false) { return; }
      if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
      let cursor = cg.Input.canvasCursors[ChoreoGraph.Input.lastClickedCanvas.id];
      let gamepad = controller.gamepad;
      let xi = 0;
      let yi = 1;
      if (cg.settings.input.controller.emulatedCursor.stickSide=="right") {
        xi = 2;
        yi = 3;
      }
      let sx = gamepad.axes[xi];
      let sy = gamepad.axes[yi];

      let sen = cg.settings.input.controller.emulatedCursor.stickSensitivity;
      let dead = cg.settings.input.controller.emulatedCursor.stickDeadzone;

      if (Math.abs(sx)<dead) { sx = 0; }
      if (Math.abs(sy)<dead) { sy = 0; }

      if (sx!=0||sy!=0) {
        cursor.clientX += sen*sx*ChoreoGraph.timeDelta;
        cursor.clientY += sen*sy*ChoreoGraph.timeDelta;
  
        if (cg.settings.input.controller.emulatedCursor.lockCursorCanvas) {
          if (cursor.clientX<cursor.boundBox.left) { cursor.clientX = cursor.boundBox.left; }
          if (cursor.clientX>cursor.boundBox.right) { cursor.clientX = cursor.boundBox.right; }
          if (cursor.clientY<cursor.boundBox.top) { cursor.clientY = cursor.boundBox.top; }
          if (cursor.clientY>cursor.boundBox.bottom) { cursor.clientY = cursor.boundBox.bottom; }
        }
  
        let fakeEvent = new class FakePointerEvent {
          target = ChoreoGraph.Input.lastClickedCanvas.element;
          pointerId = 0;
          type = "pointermove";
          clientX = cursor.clientX;
          clientY = cursor.clientY;
        }
        ChoreoGraph.Input.pointerMove(fakeEvent);
      }

      if (cg.settings.input.controller.emulatedCursor.buttons.active) {
        if (controller.emulatedCursorLastButtons===undefined) {
          controller.emulatedCursorLastButtons = {
            left : false,
            right : false,
            up : false
          };
        };
        let buttons = controller.emulatedCursorLastButtons;
        let settings = cg.settings.input.controller.emulatedCursor.buttons;
        function pointerDown(side) {
          if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
          let fakeEvent = new class FakePointerEvent {
            target = ChoreoGraph.Input.lastClickedCanvas.element;
            pointerId = 0;
            button = {left:0,right:2,up:1}[side];
            type = "pointerdown";
            clientX = cursor.clientX;
            clientY = cursor.clientY;
          }
          ChoreoGraph.Input.pointerDown(fakeEvent);
        }
        function pointerUp(side) {
          if (ChoreoGraph.Input.lastClickedCanvas===null) { return; }
          let fakeEvent = new class FakePointerEvent {
            target = ChoreoGraph.Input.lastClickedCanvas.element;
            pointerId = 0;
            button = {left:0,right:2,up:1}[side];
            type = "pointerup";
            clientX = cursor.clientX;
            clientY = cursor.clientY;
          }
          ChoreoGraph.Input.pointerDown(fakeEvent);
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
  },

  instanceConnect(cg) {
    cg.Input = new ChoreoGraph.Input.instanceObject(cg);
    cg.attachSettings("input",{
      preventSingleTouch : true,
      preventContextMenu : false,
      preventMiddleClick : false,
      preventCanvasSelection : true,

      focusKeys : false, // If true, keys will only be sent to the last clicked canvases instance

      controller : {
        emulatedCursor : {
          active : true,
          lockCursorCanvas : true,
          stickSide : "left",
          stickDeadzone : 0.1,
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

      cg.processLoops.push(ChoreoGraph.Input.controllerButtonLoop);
      if (cg.settings.input.controller.emulatedCursor.active) {
        cg.processLoops.push(ChoreoGraph.Input.emulatedCursorLoop);
      }
    }
  }
});