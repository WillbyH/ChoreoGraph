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
    }
    instanceObject = class Input {
      get cursor() { return this.canvasCursors[this.cg.settings.core.defaultCanvas.id]; }
      lastInputType = "mouse";
      lastInteraction = {
        cursor : -Infinity,
        keyboard : -Infinity
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
        this.x = Math.floor(((event.clientX-this.boundBox.left)/this.boundBox.width)*this.canvas.width);
        this.y = Math.floor(((event.clientY-this.boundBox.top)/this.boundBox.height)*this.canvas.height);
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

    keyDown(event) {

    };
    keyUp(event) {
      
    };
  },

  instanceConnect(cg) {
    cg.Input = new ChoreoGraph.Input.instanceObject(cg);
    cg.attachSettings("input",{
      preventSingleTouch : true,
      preventContextMenu : false,
      preventMiddleClick : false,
      preventCanvasSelection : true,
      callbacks : {
        keyDown : null, // keyDown(keyName) when any known key is pressed it will activate this function
        keyUp : null, // keyUp(keyName) when any known key is released it will activate this function
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
    }
  }
});