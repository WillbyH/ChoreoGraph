ChoreoGraph.plugin({
  name: "BlockController",
  key: "BlockController",
  version: "1.1",
  Block: class Block {
    id = null;
    override = false; // If true the block will never be clear
    waitingForOverride = false; // If the object is waiting blocked in a block that is overridden
    clear = true; // If the block is clear to be entered, you know, basic block rules
    overrideType = 0; // 0 - allow stopping midway, 1 - only at block markers
    
    constructor(blockInit) {
      if (blockInit!=undefined) {
        for (let key in blockInit) {
          this[key] = blockInit[key];
        }
      }
    }
    isOpen() {
      return this.clear&&this.override==false;
    }
    isClosed() {
      return this.clear==false||this.override;
    }
    open() {
      this.clear = true;
    }
    close() { // Dont mark the null block as not clear
      if (this.id!=null) { this.clear = false; }
    }
  },
  instanceConnect: function(cg) {
    cg.blocks = {};
    cg.blocks[null] = new ChoreoGraph.plugins.BlockController.Block;
    cg.createBlock = function (blockInit) {
      let newBlock = new ChoreoGraph.plugins.BlockController.Block(blockInit,this);
      newBlock.ChoreoGraph = cg;
      cg.blocks[newBlock.id] = newBlock;
      return newBlock;
    }
  }
});
ChoreoGraph.ObjectComponents.BlockController = class BlockController {
  manifest = {
    title : "BlockController",
    master : true,
    keyOverride : "",
    update : true,
    collapse : false
  }
  block = null;
  blocked = false;
  newlyUnblocked = false;
  processingBlock = false;

  trainPosition = null;
  // "front" - In charge of closing blocks and stopping the train
  // "middle" - Just along for the ride
  // "back" - In charge of opening blocks as they are the last to leave them
  // null - not part of a train
  trainCarriages = []; // List of BlockControllers of other objects in the train

  constructor(componentInit, object) {
    this.object = object;

    if (componentInit!=undefined&&componentInit.Animator==undefined) {
      for (let compId in object.components) {
        if (object.components[compId].manifest.title=="Animator") {
          componentInit.Animator = object.components[compId];
        }
      }
    }

    ChoreoGraph.initObjectComponent(this, componentInit);

    if (componentInit!=undefined&&componentInit.Animator!=undefined) {
      if (this.manifest.master==false) {
        console.warn("BlockController must be a master component, consider changing the keyOverride");
      }
      componentInit.Animator.BlockController = this;
      componentInit.Animator.triggerCallbacks["B"] = this.blockTrigger; // Set "B" triggers to blockTrigger
      let componentKey = this.manifest.title;
      if (this.manifest.keyOverride!="") {
        componentKey = this.manifest.keyOverride;
      }
      componentInit.Animator.freeChecks.push([componentKey,"blocked"]); // Add "blocked" to the list of places to check for if the object is free to move
    } else {
      console.warn("BlockController must be used with an Animator",object);
    }
  }
  blockTrigger(object,Animator,trigger) {
    let bc = Animator.BlockController;
    bc.processingBlock = true;
    let newBlockId = trigger[1];
    let oldBlockId = bc.block;
    let newBlock = object.ChoreoGraph.blocks[newBlockId];
    let oldBlock = object.ChoreoGraph.blocks[oldBlockId];

    if (bc.trainPosition=="back") { // Back of train always does this at every block trigger
      bc.block = newBlockId;
      oldBlock.open();
    } else if (newBlock.isOpen()) {
      if (bc.trainPosition==null) {
        bc.start();
        bc.block = newBlockId;
        newBlock.close();
        oldBlock.open();
      } else if (bc.trainPosition=="front") {
        bc.start();
        bc.block = newBlockId;
        newBlock.close();
      }
    } else if (newBlock.isClosed()&&(bc.trainPosition==null||bc.trainPosition=="front")) {
      bc.stop();
      return false; // Do not pass the trigger
    }
    
    bc.processingBlock = false;
    return true;
  }
  openBlock(block) {
    block.clear = true;
  }
  closeBlock(block) {
    if (block.id!=null) { block.clear = false; }
  }
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
  }
  stop() {
    if (this.blocked==false) {
      if (this.trainPosition==null) { // Individual Objects
        this.blocked = true;
      } else { // Trains
        for (let onum=0;onum<this.trainCarriages.length;onum++) {
          this.trainCarriages[onum].blocked = true;
        }
      }
    }
  }
  update(object) {
    // Block override response
    let block = object.ChoreoGraph.blocks[this.block];
    if (block.overrideType==0) {
      if (this.trainPosition==null||this.trainPosition=="front") {
        if (block.override&&!this.blocked) { this.waitingForOverride = true; this.stop(); } // In overridden block
        else if (!block.override&&this.blocked&&this.waitingForOverride) { this.waitingForOverride = false; this.start(); }
      }
    }
  }
};
// Willby - 2024