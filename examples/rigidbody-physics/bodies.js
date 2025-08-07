// @ts-check
/** @typedef {import('../../types/choreograph') } ChoreoGraphCore */
/** @typedef {import('../../types/develop') } ChoreoGraphDevelop */
/** @typedef {import('../../types/input') } ChoreoGraphInput */
/** @typedef {import('../../types/audio') } ChoreoGraphAudio */
/** @typedef {import('../../types/physics') } ChoreoGraphPhysics */

const cg = ChoreoGraph.instantiate({
  core : {
    assumptions : true
  },
  input : {
    preventSingleTouch : true,
    preventTouchScrolling : true
  }
});

cg.createCamera({
  scaleMode : "minimum",
  size : 800,
},"main")
.addScene(cg.createScene({},"main"));

cg.createCanvas({
  element:document.getElementsByTagName("canvas")[0],
  background:"mistyrose"
},"main")
.resizeWithSelf()
.setCamera(cg.cameras.main);

let gravityScale = 0;
let drag = 0.8;

cg.Audio.createSound({source:"boing.mp3"},"boing");

function createBall(id,x,y,colour) {
  let object = cg.createObject({transformInit:{x:x,y:y}},id)
  .attach("RigidBody",{
    drag : drag,
    bounce:true,
    gravityScaleY:gravityScale,
    collider : cg.Physics.createCollider({
      type:"circle",
      radius:50,
      isBall:true,
      collide : (collider) => {
        if (!collider.isBall) return;
        cg.Audio.sounds.boing.play();
      }
    },"circleCollider"+id),
  })
  .attach("Graphic",{
    graphic:cg.createGraphic({
      type:"arc",
      colour:colour,
      radius:50
    },"circleGraphic"+id)
  });
  cg.Input.createButton({
    type:"circle",
    object:object,
    hoverCursor:"grab",
    pressCursor:"grabbing",
    transform:object.transform,
    radius:50
  },"grab"+id);
}

createBall("alpha",200,100,"#517261"); // Green
createBall("bravo",-150,-20,"#1f377a"); // Blue
createBall("charlie",200,-200,"#181a1f"); // Black
createBall("delta",40,20,"#c79940"); // Yellow
createBall("echo",-200,110,"#ce8c9c"); // Pink
createBall("foxtrot",-50,-100,"#cb6758"); // Red
createBall("golf",130,-210,"#a17da7"); // Purple

cg.Physics.colliders.circleCollidergolf.rigidbody.mass = 10;

cg.createObject({transformInit:{x:-300,y:200}},"hotel")
.attach("RigidBody",{
  drag : drag,
  bounce:true,
  gravityScaleY:gravityScale||10,
  collider : cg.Physics.createCollider({
    type:"rectangle",
    height:100,
    width:100
  },"rectangleCollider"),
})
.attach("Graphic",{
  graphic:cg.createGraphic({
    type:"rectangle",
    colour:"#fbbf03",
    height:100,
    width:100
  },"blueCircleGraphic")
});
cg.Input.createButton({
  type:"rectangle",
  object:cg.objects.hotel,
  cursor:"grab",
  transform:cg.objects.hotel.transform,
  height:100,
  width:100
},"grabHotel");

cg.createObject({transformInit:{x:300,y:200}},"india")
.attach("RigidBody",{
  drag : drag,
  bounce:true,
  mass : 0.1,
  gravityScaleY:gravityScale,
  collider : cg.Physics.createCollider({
    type:"point",
  },"pointCollider"),
})
.attach("Graphic",{
  graphic:cg.createGraphic({
    type:"arc",
    colour:"#e72222",
    radius:5
  },"blueCircleGraphic")
});
cg.Input.createButton({
  type:"rectangle",
  object:cg.objects.india,
  cursor:"grab",
  transform:cg.objects.india.transform,
  height:30,
  width:30
},"grabIndia");

cg.Physics.createCollider({
  static:true,
  type:"rectangle",
  width:1000,
  height:100,
  transformInit:{y:-450}
},"roof");
cg.Physics.createCollider({
  static:true,
  type:"rectangle",
  width:1000,
  height:100,
  transformInit:{y:450}
},"floor");
cg.Physics.createCollider({
  static:true,
  type:"rectangle",
  width:100,
  height:1000,
  transformInit:{x:-450}
},"leftWall");
cg.Physics.createCollider({
  static:true,
  type:"rectangle",
  width:100,
  height:1000,
  transformInit:{x:450}
},"rightWall");

cg.Physics.createCollider({
  type:"rectangle",
  trigger:true,
  width:100,
  height:100,
  transformInit:{x:200},
  enter:function(self,collider) { console.info(collider.id + " entered") },
  exit:function(self,collider) { console.info(collider.id + " exited") }
},"triggerTest");

cg.callbacks.listen("core","predraw",() => {
  let speed = 5;
  for (let buttonId of cg.keys.buttons) {
    let button = cg.Input.buttons[buttonId];
    if (button.pressed && button.object) {
      let cx = cg.Input.cursor.touches[button.cursorId].x;
      let cy = cg.Input.cursor.touches[button.cursorId].y;
      button.object.RigidBody.xv = (cx - button.object.transform.x) * speed;
      button.object.RigidBody.yv = (cy - button.object.transform.y) * speed;
    }
  }
});

cg.callbacks.listen("core","overlay",() => {
  for (let buttonId of cg.keys.buttons) {
    let button = cg.Input.buttons[buttonId];
    if (button.pressed && button.object) {
      ChoreoGraph.transformContext(cg.canvas.camera);
      let cx = cg.Input.cursor.touches[button.cursorId].x;
      let cy = cg.Input.cursor.touches[button.cursorId].y;
      let c = cg.canvas.c;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(button.object.transform.x, button.object.transform.y);
      c.strokeStyle = "white";
      c.lineWidth = 20;
      c.lineCap = "round";
      c.globalAlpha = 0.5;
      c.stroke();
      c.globalAlpha = 1;
    }
  }
});

ChoreoGraph.start();