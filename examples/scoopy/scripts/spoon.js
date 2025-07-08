cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"buffetSpriteSheet.png",crop:[5*16,6*16,16,16]},"frontEndLoader")
},"frontEndLoader");

cg.Animation.createAnimationFromPacked("1:transform,oy;1,v&fixedtime=t:3:2&value=,0,6,0",{},"bob");

stst.spoon = cg.createObject({
  transformInit : {x:328,y:-82}
},"spoon")
.attach("Graphic",{
  graphic:cg.graphics.frontEndLoader,
  collection:"entities"
})
.attach("Animator",{
  animation:cg.Animation.animations.bob,
  ease:"inOutSine"
});

cg.scenes.main.addObject(stst.spoon);

cg.Lighting.createLight({
  type : "spot",
  transformInit : {x:328.5,y:-150,r:-90},
  outerRadius : 80,
  innerRadius : 3,
  brightness : 1,
  penumbra : 0.925,
  occlude : false
},"spoonSpotlightDown");

cg.Lighting.createLight({
  type : "spot",
  transformInit : {x:328.5,y:-73},
  outerRadius : 20,
  innerRadius : 3,
  brightness : 1,
  occlude : false
},"spoonSpotlightFloor");

cg.Physics.createCollider({
  type : "circle",
  transformInit : {x:328.5,y:-73},
  radius : 22,
  trigger : true,
  groups : [1],
  scene:cg.scenes.main,
  enter : () => {
    stst.spoon.transform.o = 0;
    cg.objects.spoonFoundText.Animator.restart()
    stst.caught();
  }
},"harvestSpoon");

stst.alarm = false;
stst.alarmEndTime = 0;
stst.hasEscapedWithSpoon = false;

cg.processLoops.push(function alarmLighting() {
  if (stst.alarm) {
    let pulseSpeed = 1;
    let pingPong = Math.abs(cg.clock%(1000*(1/pulseSpeed))-(1000*(1/pulseSpeed))/2)/(1000*(1/pulseSpeed)/2);
    let colour = ChoreoGraph.colourLerp("090300","550000",pingPong);
    let upperBound = 0.8;
    let lowerBound = 0.9; // When off
    let brightness = lowerBound + (upperBound-lowerBound)*pingPong;
    cg.graphics.lighting.shadowColour = colour + Math.round(brightness*255).toString(16);
  }
});