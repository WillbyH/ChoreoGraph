const cg = ChoreoGraph.instantiate({
  core : {
    debugCGScale : 0.1
  },
  input : {
    preventDefaultKeys : ["up","down","left","right"]
  }
});

cg.createCamera({
  scaleMode : "minimum",
  minimumSize : 85,
},"main")
.addScene(cg.createScene({},"main"));

cg.createCanvas({element:document.getElementsByTagName("canvas")[0],background:"black"},"main")
.resizeWithSelf()
.setCamera(cg.cameras.main);

cg.createImage({file:"tiles.png"},"tiles");

cg.Tilemaps.createTile({
  image : cg.images.tiles,
  imageX : 0,
  imageY : 0,
  width : 8,
  height : 8
},"wall");

cg.Tilemaps.createTile({
  image : cg.images.tiles,
  imageX : 16,
  imageY : 0,
  width : 8,
  height : 8
},"roof");

cg.Tilemaps.createTile({
  image : cg.images.tiles,
  imageX : 0,
  imageY : 8,
  width : 8,
  height : 8
},"floor");

cg.Tilemaps.createTile({
  image : cg.images.tiles,
  imageX : 8,
  imageY : 0,
  width : 8,
  height : 8
},"floorVariant");

cg.Tilemaps.createAnimatedTile("pit")
.addFrame({image:cg.images.tiles,imageX:24,imageY:0,width:8,height:8,duration:0.3})
.addFrame({image:cg.images.tiles,imageX:24,imageY:8,width:8,height:8,duration:0.3})
.addFrame({image:cg.images.tiles,imageX:16,imageY:8,width:8,height:8,duration:0.3})
.addFrame({image:cg.images.tiles,imageX:8,imageY:8,width:8,height:8,duration:0.3})
.addFrame({image:cg.images.tiles,imageX:16,imageY:8,width:8,height:8,duration:0.3})
.addFrame({image:cg.images.tiles,imageX:24,imageY:8,width:8,height:8,duration:0.3})

function tiles(tiles) {
  let translation = {
    0 : null,
    1 : "wall",
    2 : "roof",
    3 : "pit",
    4 : "floor",
    5 : "floorVariant"
  }
  let output = [];
  for (let tile of tiles) {
    output.push(translation[tile]);
  }
  return output;
}

cg.Tilemaps.createTilemap({
  tileHeight : 8,
  tileWidth : 8
},"main");

cg.Tilemaps.tilemaps.main.createChunkedLayer({
  tiles : tiles([
    0,0,0,0,0,0,0,2,2,2,
    2,2,2,2,2,2,2,2,1,2,
    2,1,1,1,1,1,1,1,5,2,
    2,4,4,4,4,3,3,4,4,2,
    2,3,4,5,4,4,4,5,4,2,
    2,4,4,4,4,4,2,2,2,2,
    2,2,4,3,5,4,1,1,1,2,
    2,1,4,4,4,4,4,4,4,2,
    2,4,4,2,2,2,4,5,4,2,
    2,2,2,2,0,2,2,2,2,2
  ]),
  chunkWidth : 5,
  chunkHeight : 5,
  totalWidth : 10,
  chunksOffsetX : -5,
  chunksOffsetY : -5
});

cg.Tilemaps.tilemaps.main.createChunkedLayer({
  tiles : tiles([
    0,0,0,0,0,0,0,1,1,1,
    1,1,1,1,1,1,1,1,0,1,
    1,0,0,0,0,0,0,0,0,1,
    1,0,0,0,0,1,1,0,0,1,
    1,1,0,0,0,0,0,0,0,1,
    1,0,0,0,0,0,1,1,1,1,
    1,1,0,1,0,0,0,0,0,1,
    1,0,0,0,0,0,0,0,0,1,
    1,0,0,1,1,1,0,0,0,1,
    1,1,1,1,0,1,1,1,1,1
  ]),
  chunkWidth : 5,
  chunkHeight : 5,
  totalWidth : 10,
  chunksOffsetX : -5,
  chunksOffsetY : -5,
  layerName : "colliders",
  layerVisible : false
});

cg.Physics.createCollidersFromTilemap(cg.Tilemaps.tilemaps.main,1,"wall");

cg.createGraphic({
  type : "tilemap",
  tilemap : cg.Tilemaps.tilemaps.main,
  debug : false,
},"tilemap");

cg.scenes.main.createItem("graphic",{graphic:cg.graphics.tilemap},"tilemap");

cg.Input.createAction({keys:["w","up"]},"primaryForward");
cg.Input.createAction({keys:["s","down"]},"primaryBackward");
cg.Input.createAction({keys:["a","left"]},"primaryLeft");
cg.Input.createAction({keys:["d","right"]},"primaryRight");

cg.createObject({},"player")
.attach("Graphic",{
  graphic:cg.createGraphic({
    type:"arc",
    colour:"#000000aa",
    radius:3,
  },"player"),
  transform : cg.createTransform({oy:0.8})
})
.attach("Graphic",{
  graphic:cg.createGraphic({
    type:"arc",
    colour:"#ff5555",
    radius:3,
  },"player")
})
.attach("RigidBody",{
  collider : cg.Physics.createCollider({
    type:"circle",
    radius:3
  },"player"),
})

cg.Input.createAction({keys:["i"]},"secondaryForward");
cg.Input.createAction({keys:["k"]},"secondaryBackward");
cg.Input.createAction({keys:["j"]},"secondaryLeft");
cg.Input.createAction({keys:["l"]},"secondaryRight");

cg.settings.core.callbacks.loopBefore = () => {
  let dir = cg.Input.getActionNormalisedVector("secondaryForward","secondaryBackward","secondaryLeft","secondaryRight");
  cg.cameras.main.transform.x += dir[0]*0.1*cg.timeDelta;
  cg.cameras.main.transform.y += dir[1]*0.1*cg.timeDelta;

  dir = cg.Input.getActionNormalisedVector("primaryForward","primaryBackward","primaryLeft","primaryRight");
  cg.objects.player.RigidBody.xv = dir[0]*30;
  cg.objects.player.RigidBody.yv = dir[1]*30;
};

ChoreoGraph.start();