ChoreoGraph.plugin({
  name : "BlockController",
  key : "BlockController",
  version : "1.2",

  globalPackage : new class cgBlockController {
    Block = class Block {
      id = null;
      override = false; // If true the block will never be clear
      waitingForOverride = false; // If the object is waiting blocked in a block that is overridden
      clear = true; // If the block is clear to be entered, you know, basic block rules
      overrideType = 0; // 0 - allow stopping midway  1 - only at block markers
      objectCount = 0;
      groupOccupying = null;

      constructor(blockInit) {
        if (blockInit!=undefined) {
          for (let key in blockInit) {
            this[key] = blockInit[key];
          }
        }
      }
      isOpen(groupId) {
        if (this.groupOccupying==groupId&&groupId!=null) { return true; }
        return this.clear&&this.override==false;
      }
      isClosed(groupId) {
        if (this.groupOccupying==groupId&&groupId!=null) { return false; }
        return this.clear==false||this.override;
      }
      open() {
        this.clear = true;
      }
      close(groupId) { // Dont mark the null block as not clear
        if (this.id!==null) { this.clear = false; this.groupOccupying = groupId; }
      }
    };

    instanceObject = class cgInstanceBlockController {
      blocks = {};
      blockGroups = {};

      constructor(cg) {
        this.blocks[null] = new ChoreoGraph.BlockController.Block;
        this.cg = cg;
      }

      createBlock(blockInit={},id) {
        if (id==undefined) { console.warn("createBlock requires an id"); return; }
        let cg = this.cg;
        let newBlock = new ChoreoGraph.BlockController.Block(blockInit);
        newBlock.id = id;
        newBlock.cg = cg;
        ChoreoGraph.applyAttributes(newBlock,blockInit);
        cg.BlockController.blocks[newBlock.id] = newBlock;
        cg.keys.blocks.push(id);
        return newBlock;
      }

      hasActivatedDebugLoop = false;
      blockControllerDebugLoop(cg) {
        let debugSettings = cg.settings.blockcontroller.debug;
        if (!debugSettings.active) { return; }
        for (let canvasId of cg.keys.canvases) {
          let canvas = cg.canvases[canvasId];
          if (canvas.hideDebugOverlays) { continue; }
          ChoreoGraph.transformContext(canvas.camera);
          let block = null;
          for (let animation of debugSettings.animations) {
            if (typeof animation=="string") { block = animation; continue; }

            // FIND KEYS
            let xKey = -1;
            let yKey = -1;
            for (let k=0;k<animation.keys.length;k++) {
              if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(debugSettings.pathXKey)) { xKey = k; }
              if (JSON.stringify(animation.keys[k].keySet)==JSON.stringify(debugSettings.pathYKey)) { yKey = k; }
            }
            if (xKey==-1||yKey==-1) { continue; }

            let paths = {};
            let currentPath = [];

            // GET DATA FROM ANIMATIONS
            let lastX, lastY;
            for (let keyframe of animation.data) {
              if (typeof keyframe[0] == "number") {
                let x = keyframe[xKey];
                let y = keyframe[yKey];
                currentPath.push([x,y]);
                lastX = x;
                lastY = y;
              } else if (typeof keyframe[0] == "string") {
                if (keyframe[0].toUpperCase() == "B") {
                  let newBlock = keyframe[1];
                  if (newBlock!=block) {
                    if (block!=null) {
                      if (paths[block]==undefined) { paths[block] = []; }
                      paths[block].push(...currentPath);
                    }
                    currentPath = [[lastX,lastY]];
                    block = newBlock;
                  }
                }
              }
            }
            if (block!=null) {
              if (paths[block]==undefined) { paths[block] = currentPath; }
              else {
                paths[block].unshift(...currentPath);
              }
            }

            // DRAW PATHS
            let c = canvas.c;
            let alternator = 0;
            c.lineCap = "round";
            for (let blockId in paths) {
              c.lineWidth = 4;
              let block = cg.BlockController.blocks[blockId];
              let points = paths[blockId];
              let totalLength = 0;
              let lastPoint = points[0];
              c.beginPath();

              // DRAW LINES AND FIND LENGTH
              for (let i=0;i<points.length;i++) {
                let x = points[i][0];
                let y = points[i][1];
                c.lineTo(x,y);

                let dx = x-lastPoint[0];
                let dy = y-lastPoint[1];
                totalLength += Math.sqrt(dx*dx+dy*dy);
                lastPoint = points[i];
              }
              if (block.override) {
                c.strokeStyle = debugSettings.colours[alternator*3+2];
              } else if (block.clear) {
                c.strokeStyle = debugSettings.colours[alternator*3];
              } else {
                c.strokeStyle = debugSettings.colours[alternator*3+1];
              }
              c.stroke();

              // CAPS
              c.lineWidth = 2;
              c.beginPath();
              let startAngle = Math.atan2(points[1][1]-points[0][1],points[1][0]-points[0][0]);
              c.moveTo(points[0][0]+Math.cos(startAngle+Math.PI/2)*10,points[0][1]+Math.sin(startAngle+Math.PI/2)*10);
              c.lineTo(points[0][0]+Math.cos(startAngle-Math.PI/2)*10,points[0][1]+Math.sin(startAngle-Math.PI/2)*10);
              c.stroke();

              // FIND CENTRE
              let cX = 0;
              let cY = 0;
              lastPoint = points[0];
              let lengthSoFar = 0;
              for (let i=0;i<points.length;i++) {
                let x = points[i][0];
                let y = points[i][1];

                let dx = x-lastPoint[0];
                let dy = y-lastPoint[1];
                let length = Math.sqrt(dx*dx+dy*dy);
                lengthSoFar += length;

                if (lengthSoFar>=totalLength/2) {
                  let overshoot = lengthSoFar-totalLength/2;
                  let ratio = overshoot/length;

                  cX = lastPoint[0]+dx*ratio;
                  cY = lastPoint[1]+dy*ratio;
                  break;
                }

                lastPoint = points[i];
              }

              // DRAW MARKER
              c.fillStyle = "red";
              c.beginPath();
              c.arc(cX,cY,9,0,Math.PI*2);
              c.fill();
              c.fillStyle = "white";
              c.font = "bold 12px Verdana";
              c.textBaseline = "middle";
              c.textAlign = "center";
              c.fillText(blockId,cX,cY+0.6);

              alternator = !alternator;
            }
          }
        }
      };
    };
  },

  instanceConnect(cg) {
    cg.BlockController = new ChoreoGraph.BlockController.instanceObject(cg);
    cg.keys.blocks = [];

    cg.attachSettings("blockcontroller",{      
      debug : new class {
        pathXKey = ["transform","x"];
        pathYKey = ["transform","y"];
        animations = [];
        colours = ["#f9f51d","#f54242","#6e6c0c","#feb01d","#ff0000","#855b0d"] // A-Clear A-Blocked A-Overridden B-Clear B-Blocked B-Overridden

        #cg = cg;
        #active = false;
        set active(value) {
          this.#active = value;
          if (value&&!this.#cg.BlockController.hasActivatedDebugLoop) {
            this.#cg.BlockController.hasActivatedDebugLoop = true;
            this.#cg.overlayLoops.push(this.#cg.BlockController.blockControllerDebugLoop);
          }
        }
        get active() { return this.#active; }
      }
    });

    if (ChoreoGraph.Develop!==undefined) {
      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Blocks Debug",
        inactiveText : "Blocks Debug",
        activated : cg.settings.blockcontroller.debug,
        onActive : (cg) => { cg.settings.blockcontroller.debug.active = true; },
        onInactive : (cg) => { cg.settings.blockcontroller.debug.active = false; },
      });
    };
  }
});

ChoreoGraph.ObjectComponents.BlockController = class cgObjectBlockController {
  manifest = {
    type : "BlockController",
    key : "BlockController",
    master : true,
    functions : {
      update : true
    }
  }

  block = null;
  #group = null;
  set group(value) {
    let previousGroupId = this.#group;
    this.#group = value;
    let blockGroups = this.Animator.cg.BlockController.blockGroups;
    if (previousGroupId!=null) {
      let previousGroup = blockGroups[previousGroupId];
      previousGroup.splice(previousGroup.indexOf(this),1);
      if (previousGroup.length==0) { delete blockGroups[previousGroupId]; }
    }
    if (value!=null) {
      let newGroup = blockGroups[value];
      if (newGroup==undefined) {
        blockGroups[value] = [];
        newGroup = blockGroups[value];
      }
      newGroup.push(this);
    }
  }
  get group() {
    return this.#group;
  }

  processingBlock = false;
  blocked = false;

  constructor(componentInit,object) {
    this.Animator;
    if (componentInit.Animator==undefined) {
      for (let component of object.objectData.components) {
        if (component.manifest.type=="Animator") {
          this.Animator = component;
          break;
        }
      }
    } else {
      this.Animator = componentInit.Animator;
      delete componentInit.Animator;
    }

    if (this.Animator==undefined) {
      console.warn("BlockController requires an Animator component");
    }

    ChoreoGraph.initObjectComponent(this,componentInit);

    this.Animator.BlockController = this;
    this.Animator.triggerTypes.b = this.blockTrigger;
  };

  nonexistentWarn(blockId) {
    if (ChoreoGraph.BlockController.nonexistentWarnings==undefined) {
      ChoreoGraph.BlockController.nonexistentWarnings = [blockId];
    } else if (ChoreoGraph.BlockController.nonexistentWarnings.indexOf(blockId)==-1) {
      ChoreoGraph.BlockController.nonexistentWarnings.push(blockId);
    } else {
      return;
    }
    console.warn("Block does not exist:",blockId);
  }

  blockTrigger(trigger,object,animator) {
    let bc = animator.BlockController;
    let newBlockId = trigger[1];
    let oldBlockId = bc.block;

    let newBlock = animator.cg.BlockController.blocks[newBlockId];
    if (newBlock==undefined) { bc.nonexistentWarn(newBlockId); return true; }

    let oldBlock = animator.cg.BlockController.blocks[oldBlockId];
    if (oldBlock==undefined) { bc.nonexistentWarn(oldBlockId); return true; }

    bc.processingBlock = true;

    if (newBlock.isOpen(bc.group)) {
      newBlock.groupOccupying = bc.group;
      newBlock.objectCount++;
      newBlock.close(bc.group);
    } else if (newBlock.isClosed(bc.group)) {
      bc.stop(false);
      return false;
    }
    
    if (oldBlockId!=null) {
      oldBlock.objectCount--;
    }
    if (oldBlock.objectCount<=0) {
      oldBlock.open();
      oldBlock.groupOccupying = null;
    }

    if (bc.blocked) {
      bc.start();
    }

    bc.block = newBlockId;
    bc.processingBlock = false;
    return true;
  };

  start() {
    // UNPAUSE ALL RELEVANT ANIMATORS
    if (this.blocked) {
      this.blocked = false;
      if (this.group==null) {
        this.Animator.paused = false;
      } else if (this.group!=null) {
        let blockGroup = this.Animator.cg.BlockController.blockGroups[this.group];
        for (let bc of blockGroup) {
          bc.blocked = false;
          bc.Animator.paused = false;
          bc.processingBlock = false;
        }
      }
    }
  };

  stop(stopSelf=true) {
    // PAUSE ALL RELEVANT ANIMATORS
    if (!this.blocked) {
      this.blocked = true;
      if (this.group==null&&stopSelf) {
        this.Animator.paused = true;
      } else if (this.group!=null) {
        let blockGroup = this.Animator.cg.BlockController.blockGroups[this.group];
        for (let bc of blockGroup) {
          if (!stopSelf&&bc==this) { continue; }
          bc.blocked = true;
          bc.Animator.paused = true;
          bc.processingBlock = true;
          bc.Animator.playhead += this.Animator.travelledThisFrame;
          bc.Animator.setValues();
        }
      }
    }
  };

  update(scene) {
    // BLOCK OVERRIDE RESPONSE
    if (this.processingBlock) { return; }
    let block = scene.cg.BlockController.blocks[this.block];
    if (block.overrideType==0) {
      if (block.override) {
        this.stop();
      } else if (block.isOpen(this.group)) {
        this.start();
      }
    }
  }
};