cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[8*16,4*16,16,16]},"cameraDown")
},"cameraDown");
cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[8*16,4*16+16,16,16]},"cameraUp")
},"cameraUp");
cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[8*16,4*16+32,16,16]},"cameraLeft")
},"cameraLeft");
cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[8*16,4*16+48,16,16]},"cameraRight")
},"cameraRight");
cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[9*16,5*16,16,16]},"camMountDown")
},"camMountDown");
cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[9*16,6*16,16,16]},"camMountUp")
},"camMountUp");
cg.createGraphic({
  type:"image",imageSmoothingEnabled:false,
  image:cg.createImage({file:"BuffetSpriteSheet.png",crop:[9*16,7*16,16,16]},"camMountRight")
},"camMountRight");

stst.cameras = [];
stst.createCamera = function(cameraInit) {
  let cameraIndex = stst.cameras.length;
  let transform = cg.createTransform({x:cameraInit.x, y:cameraInit.y, r:cameraInit.pivotCentre || 0});

  let newCamera = cg.createObject({
    fov : cameraInit.fov || 60,
    pivotRange : cameraInit.pivotRange || 90,
    pivotSpeed : cameraInit.pivotSpeed || 0.5,
    pivotOffset : cameraInit.pivotOffset || 0,
    detectRange : cameraInit.detectRange || 15,
    pivotCentre : cameraInit.pivotCentre || 0,
    swing : cameraInit.swing == undefined ? true : cameraInit.swing,
    transform : transform
  }, "camera"+cameraIndex)
  .attach("Script",{
    updateScript : (camera, scene) => {
      if (camera.swing) {
        let angle = Math.sin((cg.clock/1000) * camera.pivotSpeed + camera.pivotOffset) * camera.pivotRange/2;
        camera.transform.r = angle+camera.pivotCentre;
      } else {
        camera.transform.r += camera.pivotSpeed * cg.timeDelta/1000;
        if (camera.transform.r>360) { camera.transform.r -= 360; }
      }

      if (camera.canSeePlayer()) {
        stst.caught();
      }
    }
  });

  let orientation = Math.floor((newCamera.pivotCentre+45)/(360/4));
  if (orientation==4) { orientation = 0; }

  let cameraGraphic = [cg.graphics.cameraRight, cg.graphics.cameraUp, cg.graphics.cameraLeft, cg.graphics.cameraDown][orientation];
  let mountGraphic = [cg.graphics.camMountRight, cg.graphics.camMountUp, cg.graphics.camMountRight, cg.graphics.camMountDown][orientation];

  if (newCamera.swing) {
    newCamera.attach("Graphic",{
      key : "mount",
      graphic : mountGraphic,
      transformInit : {flipX:orientation==0},
      collection : "cameras"
    });
    newCamera.mount.transform.parent = null;
    newCamera.mount.transform.x = transform.x + [-6,0,0,0][orientation];
    newCamera.mount.transform.y = transform.y + [0,-3.5,0,4][orientation];
  }

  newCamera.attach("Graphic",{
    key : "camera",
    graphic : cameraGraphic,
    transformInit : {ax:[-3.5,0,4,0][orientation],ay:[1,-2,0,2][orientation],or:[0,-90,180,-270][orientation]},
    collection : "cameras"
  });

  newCamera.light = cg.Lighting.createLight({
    type : "spot",
    hexColour : "#FF4242",
    outerRadius : 208,
    innerRadius : 32,
    brightness : 0.9,
    feather : 1,
    radius : 43,
    penumbra : 1-newCamera.fov/360,
    transformInit : {parent:transform,ax:[-8,-7,0,-7][orientation],ay:[1,0,0,0][orientation]}
  },"camera"+cameraIndex);

  newCamera.raycast = cg.Physics.createCollider({
    type : "raycast",
    groups : [1],
    scene:cg.scenes.main,
    transformInit : {parent:transform,ax:[-8,-7,0,-7][orientation],ay:[1,0,0,0][orientation]}
  },"camera"+cameraIndex);

  newCamera.canSeePlayer = function() {
    let sx = stst.scoopy.transform.x;
    let sy = stst.scoopy.transform.y;
    let [cx, cy] = this.raycast.getPosition();

    let distance = Math.sqrt((sx-cx)*(sx-cx)+(sy-cy)*(sy-cy));
    if (distance > this.detectRange*16) { return false; }

    let dx = sx - cx;
    let dy = sy - cy;
    let playerAngle = Math.atan2(dy,dx) * 180 / Math.PI + 90;
    if (playerAngle<0) { playerAngle += 360; }
    let cameraAngle = this.transform.r-90;
    if (cameraAngle<0) { cameraAngle += 360; }
    if (cameraAngle>360) { cameraAngle -= 360; }
    if (Math.abs(cameraAngle-playerAngle)<this.fov/2) {
      this.raycast.dx = dx;
      this.raycast.dy = dy;
    } else {
      this.raycast.dx = 0;
      this.raycast.dy = 0;
    }

    if (this.raycast.collisions.includes(stst.scoopy.RigidBody.collider)) {
      return true;
    }

    return false;
  };

  cg.scenes.main.addObject(newCamera);
  stst.cameras.push(newCamera);
  return newCamera;
};

stst.createCamera({
  x:29,
  y:25,
  pivotRange : 42.7,
  fov : 29.2,
  detectRange : 14,
  pivotCentre : 270
});

stst.createCamera({
  x:158,
  y:-58,
  pivotRange:96.3,
  fov:39.9,
  pivotSpeed:0.2,
  pivotCentre:0
});

stst.createCamera({
  x:-114,
  y:-51,
  pivotRange:70.06,
  fov:40.1,
  detectRange:11,
  pivotSpeed:1,
  pivotCentre:0
});

stst.createCamera({
  x:72,
  y:-204,
  pivotRange:6000,
  fov:60,
  detectRange:7,
  pivotCentre:270,
  pivotSpeed:27,
  swing:false
});

stst.createCamera({
  x:72,
  y:-204,
  pivotRange:6000,
  fov:60,
  detectRange:7,
  pivotCentre:90,
  pivotSpeed:27,
  swing:false
});

stst.createCamera({
  x:233,
  y:-131,
  pivotRange:50,
  fov:60,
  detectRange:15,
  pivotCentre:90,
  pivotSpeed:0.5
});