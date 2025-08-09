for (let i=0;i<4;i++) {
  let x = (i%2)*5 + 81;
  let y = Math.floor(i/2)*6 + 113;
  cg.createGraphic({
    type : "image",
    image : cg.createImage({
      file : "sheet.png",
      crop : [x,y,4,5]
    },"gem" + i),
  },"gem" + i);
}

cg.Animation.createAnimationFromPacked("0&sprite=f:7:Graphic,graphic:gem0|gem1|gem2|gem3",{},"gem");

function createGem(x,y,scene) {
  const gem = cg.createObject({
    transformInit : {x:x,y:y}
  },"gem")
  .attach("Graphic",{
    graphic : cg.graphics.gem0,
    collection : "entities"
  })
  .attach("Animator",{
    animation : cg.Animation.animations.gem
  });

  gem.light = cg.Lighting.createLight({
    type : "spot",
    transformInit : {parent:gem.transform},
    outerRadius : 20,
    innerRadius : 2,
    brightness : 1,
    occlude : false,
    hexColour : "#78ed87"
  },"gemLight");

  scene.items.lighting.graphic.lights.push(gem.light);

  gem.collider = cg.Physics.createCollider({
    type : "circle",
    radius : 10,
    trigger : true,
    groups : [1],
    scene : scene,
    gem : gem,
    transformInit : {parent:gem.transform},
    enter : (self, collider) =>{
      if (self.gem.Graphic.transform.o===0) { return; }
      cg.graphics.gameInterface.collectGem(self.gem);
      self.gem.Graphic.transform.o = 0;
    }
  },"gemCollider");

  return gem;
}