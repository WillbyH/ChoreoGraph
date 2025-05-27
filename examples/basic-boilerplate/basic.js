const cg = ChoreoGraph.instantiate({
  core : {
    generateBasicEnvironment : true
  }
});

cg.createCanvas({element:document.getElementsByTagName("canvas")[0],
  width : 700,
  height : 500,
  background : "peachpuff"
});

cg.createGraphic({type:"rectangle",width:200,height:100,colour:"turquoise",fill:true},"rectangleGraphic")

cg.scenes.main.createItem("graphic",{
  graphic : cg.graphics.rectangleGraphic,
  transform : cg.createTransform({x:700/2,y:500/2,r:20})
},"rectangleSceneItem");

ChoreoGraph.start();