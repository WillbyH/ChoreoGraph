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
      overrideType = 0; // 0 - allow stopping midway, 1 - only at block markers
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
      close() { // Dont mark the null block as not clear
        if (this.id!==null) { this.clear = false; }
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
    };
  },

  instanceConnect(cg) {
    cg.BlockController = new ChoreoGraph.BlockController.instanceObject(cg);
    cg.keys.blocks = [];
  }
});

ChoreoGraph.ObjectComponents.BlockController = class cgObjectBlockController {
  manifest = {
    type : "BlockController",
    key : "BlockController",
    master : true,
    functions : {
      update : false
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
      previousGroup.splice(previousGroup.indexOf(this.object),1);
      if (previousGroup.length==0) { delete blockGroups[previousGroupId]; }
    }
    if (value!=null) {
      let newGroup = blockGroups[value];
      if (newGroup==undefined) {
        blockGroups[value] = [];
        newGroup = blockGroups[value];
      }
      newGroup.push(this.Animator.object);
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

    if (newBlock.isOpen(this.group)) {
      newBlock.groupOccupying = this.group;
      newBlock.objectCount++;
      newBlock.close();
    } else if (newBlock.isClosed(this.group)) {
      bc.stop();
    }

    bc.processingBlock = false;
    return true;
  };

  start() {
    if (this.blocked) {
      if (this.trainPosition==null) { // Individual Objects
        this.newlyUnblocked = true;
        this.blocked = false;
      } else { // Trains
        for (let onum=0;onum<this.trainCarriages.length;onum++) {
          if (this.trainCarriages[onum].blocked) { this.newlyUnblocked = true; }
          this.trainCarriages[onum].blocked = false;
        }
      }
    }
  };

  stop() {
    if (!this.blocked) {
      this.blocked = true;
      if (this.group==null) {

      } else {

      }
    }
  };
};