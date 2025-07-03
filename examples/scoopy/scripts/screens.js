cg.createImage({file:"controllers/Xbox_A.png"},"xboxA");
cg.createImage({file:"controllers/Xbox_B.png"},"xboxB");
cg.createImage({file:"controllers/Xbox_X.png"},"xboxX");
cg.createImage({file:"controllers/Xbox_Y.png"},"xboxY");
cg.createImage({file:"controllers/PS_Cross.png"},"psCross");
cg.createImage({file:"controllers/PS_Triangle.png"},"psTriangle");
cg.createImage({file:"controllers/Left_Stick.png"},"leftStick");

// EXIT MENU
cg.graphicTypes.exit = new class ExitMenu {
  setup() {
    this.controllerHover = 0;
  };
  draw(c,ax,ay) {
    c.globalAlpha = 0.2;
    let scale = cg.camera.canvasSpaceScale;
    c.textBaseline = "alphabetic";
    c.fillStyle = "#000000";
    c.fillRect(ax-cg.cw/scale/2,ay-cg.ch/scale/2,cg.cw/scale,cg.ch/scale);

    c.globalAlpha = 0.8;
    c.beginPath();
    c.roundRect(ax-400,ay-400,800,800,3);
    c.fill();

    c.globalAlpha = 1;
    c.font = "50px PublicPixel";
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.fillText("Leave the",ax,ay-225-75);
    c.fillText("restaurant?",ax,ay-175-75);
    c.font = "35px PublicPixel";
    c.fillText("You have not yet",ax,ay-130);
    c.fillText("successfully",ax,ay-95);
    c.fillText("harvested the spoon",ax,ay-60);

    // Button boxes
    let changeTime = 100;
    if (cg.Input.buttons.leaveMenuYes.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.leaveMenuYes.enterTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#bfbfbf";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.leaveMenuYes.exitTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#ffffff";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    c.fillRect(ax-300,ay+44.5,600,100);
    if (cg.Input.buttons.leaveMenuNo.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.leaveMenuNo.enterTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#bfbfbf";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.leaveMenuNo.exitTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#ffffff";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    c.fillRect(ax-300,ay+188,600,100);

    c.fillStyle = "#333333";
    c.font = "30px PublicPixel";
    c.fillText("Yes, go home",ax,ay+107);
    c.fillText("No, I want to stay",ax,ay+250);

    if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected) {
      c.strokeStyle = "#21aeff";
      c.lineWidth = 5;
      if (this.controllerHover==0) {
        c.strokeRect(ax-300-5,ay+44.5-5,600+10,100+10);
      } else {
        c.strokeRect(ax-300-5,ay+188-5,600+10,100+10);
      }
    }
  };
};
cg.scenes.exit.createItem("graphic",{
  graphic : cg.createGraphic({type:"exit"},"exit"),
  transformInit : {CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5}
},"exit");

cg.Input.createButton({
  type : "rectangle",
  width : 600,
  height : 100,
  scene : cg.scenes.exit,
  transformInit : {
    CGSpace : false,
    x : 0,
    y : 94.5,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5,
  },
  down : () => {
    stst.closeExitMenu();
    stst.openTitleScreen();
  }
},"leaveMenuYes");

cg.Input.createButton({
  type : "rectangle",
  width : 600,
  height : 100,
  scene : cg.scenes.exit,
  transformInit : {
    CGSpace : false,
    x : 0,
    y : 238.6,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5,
  },
  down : () => {
    stst.closeExitMenu();
  }
},"leaveMenuNo");

// FAIL MENU
cg.graphicTypes.fail = new class FailMenu {
  setup() {
    this.controllerHover = 0;
  };
  draw(c,ax,ay) {
    c.globalAlpha = 0.2;
    let scale = cg.camera.canvasSpaceScale;
    c.textBaseline = "alphabetic";
    c.fillStyle = "#000000";
    c.fillRect(ax-cg.cw/scale/2,ay-cg.ch/scale/2,cg.cw/scale,cg.ch/scale);

    c.globalAlpha = 0.8;
    c.beginPath();
    c.roundRect(ax-400,ay-400,800,800,3);
    c.fill();

    c.globalAlpha = 1;
    c.font = "50px PublicPixel";
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.fillText("You were",ax,ay-225);
    c.fillText("caught!",ax,ay-175);
    c.font = "35px PublicPixel";
    c.fillText("Try again?",ax,ay-55);

    // Button boxes
    let changeTime = 100;
    if (cg.Input.buttons.tryAgainYes.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.tryAgainYes.enterTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#bfbfbf";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.tryAgainYes.exitTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#ffffff";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    c.fillRect(ax-300,ay+44.5,600,100);
    if (cg.Input.buttons.tryAgainNo.hovered) {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.tryAgainNo.enterTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#bfbfbf";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#ffffff","#bfbfbf",timeSince/changeTime);
      }
    } else {
      let timeSince = ChoreoGraph.nowint-cg.Input.buttons.tryAgainNo.exitTime;
      if (timeSince>changeTime) {
        c.fillStyle = "#ffffff";
      } else {
        c.fillStyle = ChoreoGraph.colourLerp("#bfbfbf","#ffffff",timeSince/changeTime);
      }
    }
    c.fillRect(ax-300,ay+188,600,100);

    c.fillStyle = "#333333";
    c.font = "30px PublicPixel";
    c.fillText("Yes",ax,ay+107);
    c.fillText("No, go home",ax,ay+250);

    if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected) {
      c.strokeStyle = "#21aeff";
      c.lineWidth = 5;
      if (this.controllerHover==0) {
        c.strokeRect(ax-300-5,ay+44.5-5,600+10,100+10);
      } else {
        c.strokeRect(ax-300-5,ay+188-5,600+10,100+10);
      }
    }
  };
};
cg.scenes.fail.createItem("graphic",{
  graphic : cg.createGraphic({type:"fail"},"fail"),
  transformInit : {CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5}
},"fail");

cg.Input.createButton({
  type : "rectangle",
  width : 600,
  height : 100,
  scene : cg.scenes.fail,
  transformInit : {
    CGSpace : false,
    x : 0,
    y : 94.5,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5
  },
  down : () => {
    stst.closeFailMenu();
    stst.reset(true);
  }
},"tryAgainYes");

cg.Input.createButton({
  type : "rectangle",
  width : 600,
  height : 100,
  scene : cg.scenes.fail,
  transformInit : {
    CGSpace : false,
    x : 0,
    y : 238.6,
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5
  },
  down : () => {
    stst.closeFailMenu();
    stst.openTitleScreen();
  }
},"tryAgainNo");

// SPOON FOUND
cg.createGraphic({
  type : "pointText",
  text : "SPOON FOUND, NOW RUN!",
  textAlign : "center",
  textBaseline : "middle",
  fontFamily : "PublicPixel",
  fontSize : 64,
  colour : "#ffffff"
},"spoonFoundText");

cg.Animation.createAnimationFromPacked("0:transform,o;1,v&fixedtime=t:2:3&value=,1,0",{},"threeSecondFadeOut");

cg.createObject({
  transformInit : {
    CGSpace : false,
    o : 0
  }
},"spoonFoundText")
.attach("Graphic",{
  graphic : cg.graphics.spoonFoundText,
  transformInit : {
    canvasSpaceXAnchor : 0.5,
    canvasSpaceYAnchor : 0.5
  },
  collection : "top"
})
.attach("Animator",{
  loop : false,
  animation : cg.Animation.animations.threeSecondFadeOut,
  paused : true,
});

cg.scenes.main.addObject(cg.objects.spoonFoundText);

// CONTROLLER HINTS
cg.graphicTypes.hints = new class ControllerHints {
  draw(c,ax,ay) {
    let hints = [];
    if (ChoreoGraph.Input.controller==null || !ChoreoGraph.Input.controller.connected) { return }

    if (stst.exitMenuIsOpen||stst.failMenuIsOpen) {
      hints.push([cg.images.leftStick,"Navigate"]);
      if (ChoreoGraph.Input.controller.type.buttons[0]=="A") {
        hints.push([cg.images.xboxA,"Select"]);
      } else if (ChoreoGraph.Input.controller.type.buttons[0]=="B") {
        hints.push([cg.images.xboxB,"Select"]);
      } else {
        hints.push([cg.images.psCross,"Select"]);
      }
    } else if (cg.camera.isSceneOpen(cg.scenes.title)) {
      hints.push([cg.images.leftStick,"Navigate Volumes"]);
      if (ChoreoGraph.Input.controller.type.buttons[0]=="A") {
        hints.push([cg.images.xboxA,"Play"]);
      } else if (ChoreoGraph.Input.controller.type.buttons[0]=="B") {
        hints.push([cg.images.xboxB,"Play"]);
      } else {
        hints.push([cg.images.psCross,"Play"]);
      }
    } else {
      hints.push([cg.images.leftStick,"Movement"]);
      if (ChoreoGraph.Input.controller.type.buttons[0]=="A") {
        hints.push([cg.images.xboxY,"Restart"]);
      } else if (ChoreoGraph.Input.controller.type.buttons[0]=="B") {
        hints.push([cg.images.xboxX,"Restart"]);
      } else {
        hints.push([cg.images.psTriangle,"Restart"]);
      }
    }

    c.font = "15px PublicPixel";
    c.textAlign = "right";
    c.fillStyle = "#ffffff";
    c.textBaseline = "middle";
    for (let i=0;i<hints.length;i++) {
      let image = hints[i][0];
      let text = hints[i][1];
      c.drawImage(image.image,ax-100,ay+50+i*45,45,45);
      c.fillText(text,-110,ay+75+i*45-5);
    }
  };
};
cg.createGraphic({type:"hints"},"hints")
cg.scenes.main.createItem("graphic",{
  graphic : cg.graphics.hints,
  transformInit : {
    CGSpace : false,
    canvasSpaceXAnchor : 1,
    canvasSpaceYAnchor : 0
  }
},"controllerHintsMain","top");

cg.scenes.title.createItem("graphic",{
  graphic : cg.graphics.hints,
  transformInit : {
    CGSpace : false,
    canvasSpaceXAnchor : 1,
    canvasSpaceYAnchor : 0
  }
},"controllerHintsTitle","overlay");

// COUNTDOWN
cg.createGraphic({
  type : "pointText",
  text : "Time to escape: ",
  textAlign : "left",
  textBaseline : "top",
  fontFamily : "PublicPixel",
  fontSize : 40,
  colour : "#ffffff"
},"countdownText");

cg.createGraphic({
  type : "pointText",
  text : "(Click R to restart.)",
  textAlign : "left",
  textBaseline : "top",
  fontFamily : "PublicPixel",
  fontSize : 30,
  colour : "#ffffff"
},"restartText");

cg.createGraphic({
  type : "image",
  image : cg.images.xboxY,
  width : 70,
  height : 70,
},"restartTextControllerIcon")

cg.createObject({
  transformInit : {
    CGSpace : false,
    canvasSpaceXAnchor : 0,
    canvasSpaceYAnchor : 0,
    o : 0
  }
},"topLeftText")
.attach("Graphic",{
  key : "countdown",
  graphic : cg.graphics.countdownText,
  collection : "top",
  transformInit : {
    x : 30,
    y : 30,
  }
})
.attach("Graphic",{
  key : "restart",
  graphic : cg.graphics.restartText,
  collection : "top",
  transformInit : {
    x : 30,
    y : 100,
  }
})
.attach("Graphic",{
  key : "controllerIcon",
  graphic : cg.graphics.restartTextControllerIcon,
  collection : "top",
  transformInit : {
    x : 255,
    y : 118,
  }
})
.attach("Script",{
  updateScript : (object,scene) => {
    if (ChoreoGraph.Input.controller==null || !ChoreoGraph.Input.controller.connected) {
      object.controllerIcon.transform.o = 0;
      if (cg.Input.lastCursorType==ChoreoGraph.Input.TOUCH) {
        object.restart.graphic.text = "(Click here to restart.)";
      } else {
        object.restart.graphic.text = "(Click R to restart.)";
      }
    } else {
      object.controllerIcon.transform.o = 1;
      if (ChoreoGraph.Input.controller.type.buttons[0]=="A") {
        cg.graphics.restartTextControllerIcon.image = cg.images.xboxY;
      } else if (ChoreoGraph.Input.controller.type.buttons[0]=="B") {
        cg.graphics.restartTextControllerIcon.image = cg.images.xboxX;
      } else {
        cg.graphics.restartTextControllerIcon.image = cg.images.psTriangle;
      }
      object.restart.graphic.text = "(Press   to restart.)";
    }
    if (stst.alarm) {
      let timeLeft = Math.ceil((stst.alarmEndTime-cg.clock)/1000);
      if (timeLeft<0) { stst.openFailMenu(); return; }
      object.countdown.graphic.text = "Time to escape: "+timeLeft+" seconds";
    }
  }
});

cg.scenes.main.addObject(cg.objects.topLeftText);

cg.Input.createButton({
  type : "rectangle",
  check : "touchAndAlarm",
  width : 800,
  height : 200,
  scene : cg.scenes.main,
  transformInit : {
    CGSpace : false,
    x : 400,
    y : 100
  },
  down : () => {
    stst.openFailMenu();
  }
},"restartButton");

cg.settings.input.callbacks.updateButtonChecks = () => {
  return {
    touchAndAlarm : cg.Input.lastCursorType == ChoreoGraph.Input.TOUCH && stst.alarm,
    touch : cg.Input.lastInputType == ChoreoGraph.Input.TOUCH,
  }
}

// JOYSTICK
cg.graphicTypes.joystick = new class JoyStick {
  setup() {
    this.dir = [0,0];
  };
  draw(c,ax,ay) {
    if (cg.Input.lastInputType!=ChoreoGraph.Input.TOUCH) { return; }
    c.fillStyle = "white";
    c.globalAlpha = 0.05
    c.beginPath();
    c.arc(0,0,150,0,Math.PI*2);
    c.fill();
    c.globalAlpha = 0.6;
    c.beginPath();
    c.arc(150*this.dir[0],150*this.dir[1],40,0,Math.PI*2);
    c.fill();
  };
};
cg.scenes.main.createItem("graphic",{
  graphic : cg.createGraphic({type:"joystick"},"joystick"),
  transformInit : {CGSpace:false,canvasSpaceXAnchor:0,canvasSpaceYAnchor:1,x:260,y:-260}
},"joystick","top");

// TITLE SCREEN
cg.createImage({file:"stst.png"},"logo");
cg.createImage({file:"cg.png"},"cg");
cg.createImage({file:"buffetSpriteSheet.png",crop:[8*16,2*16,16,32]},"bigSpoonOutline");
cg.createImage({file:"buffetSpriteSheet.png",crop:[10*16,5*16,16,32]},"bigSpoonColoured");

cg.graphicTypes.title = new class TitleScreen {
  setup() {
    this.controllerHover = 0;
  };
  draw(c,ax,ay) {
    let scale = cg.camera.canvasSpaceScale;
    c.fillStyle = "#000000";
    c.fillRect(ax-cg.cw/scale/2,ay-cg.ch/scale/2,cg.cw/scale,cg.ch/scale);

    c.imageSmoothingEnabled = false;

    c.globalAlpha = 0.1;
    let bigSpoonScale = 7;
    let image = cg.images.bigSpoonOutline;
    if (stst.hasEscapedWithSpoon) {
      image = cg.images.bigSpoonColoured;
    }
    cg.canvas.drawImage(image,ax,ay,100*bigSpoonScale,200*bigSpoonScale,90);

    c.globalAlpha = 1;
    let logoW = cg.images.logo.width;
    let logoH = cg.images.logo.height;
    let logoScale = 15;
    cg.canvas.drawImage(cg.images.logo,ax,ay-100,logoW*logoScale,logoH*logoScale,0);

    let cgSize = 150;
    cg.canvas.drawImage(cg.images.cg,ax-240,ay+200,cgSize,cgSize,20);
    c.textBaseline = "alphabetic";
    c.fillStyle = "#ffffff";
    c.font = "40px PublicPixel";
    c.textAlign = "left";
    c.fillText("ChoreoGraph",ax-80,ay+200);
    c.fillText("Edition",ax-80,ay+250);

    c.font = "20px PublicPixel";
    c.textAlign = "center";
    let playText = "Click anywhere to play"
    if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected && cg.Audio.ready) {
      playText = "Press    to play";
      if (ChoreoGraph.Input.controller.type.buttons[0]=="A") {
        cg.canvas.drawImage(cg.images.xboxA,ax-19,ay+cg.ch/scale*0.45-10,60,60);
      } else if (ChoreoGraph.Input.controller.type.buttons[0]=="B") {
        cg.canvas.drawImage(cg.images.xboxB,ax-19,ay+cg.ch/scale*0.45-10,60,60);
      } else {
        cg.canvas.drawImage(cg.images.psCross,ax-19,ay+cg.ch/scale*0.45-10,60,60);
      }
    }
    c.font = "20px PublicPixel";
    c.fillStyle = "#ffffff";
    c.fillText(playText,ax,ay+cg.ch/scale*0.45);

    c.font = "25px PublicPixel";
    c.textBaseline = "middle";
    c.textAlign = "right";

    let width = 200;
    let left = ax+cg.cw/scale/2-280;
    let right = left+width;
    let top = ay+cg.ch/scale/2-70*3;
    let middle = ay+cg.ch/scale/2-70*2;
    let bottom = ay+cg.ch/scale/2-70;

    c.fillText("MASTER",ax+cg.cw/scale/2-310,top-2);
    c.fillText("MUSIC",ax+cg.cw/scale/2-310,middle-2);
    c.fillText("SFX",ax+cg.cw/scale/2-310,bottom-2);

    c.lineWidth = 8;
    c.strokeStyle = "#ffffff";
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(left,top);
    c.lineTo(left+width*cg.Audio.masterVolume,top);
    c.moveTo(left,middle);
    c.lineTo(left+width*cg.Audio.buses.music.volume,middle);
    c.moveTo(left,bottom);
    c.lineTo(left+width*cg.Audio.buses.sfx.volume,bottom);
    c.stroke();

    c.strokeStyle = "#333333";
    c.beginPath();
    c.moveTo(left+width*cg.Audio.masterVolume,top);
    c.lineTo(right,top);
    c.moveTo(left+width*cg.Audio.buses.music.volume,middle);
    c.lineTo(right,middle);
    c.moveTo(left+width*cg.Audio.buses.sfx.volume,bottom);
    c.lineTo(right,bottom);
    c.stroke();

    c.fillStyle = "#ffffff";
    if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected&&this.controllerHover==0) {
      c.fillStyle = "#21aeff";
    }
    c.beginPath();
    c.moveTo(left+width*cg.Audio.masterVolume,top-10);
    c.arc(left+width*cg.Audio.masterVolume,top,13,0,Math.PI*2);
    c.fill();
    c.fillStyle = "#ffffff";
    if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected&&this.controllerHover==1) {
      c.fillStyle = "#21aeff";
    }
    c.beginPath();
    c.moveTo(left+width*cg.Audio.buses.music.volume,middle-10);
    c.arc(left+width*cg.Audio.buses.music.volume,middle,13,0,Math.PI*2);
    c.fill();
    c.fillStyle = "#ffffff";
    if (ChoreoGraph.Input.controller!=null && ChoreoGraph.Input.controller.connected&&this.controllerHover==2) {
      c.fillStyle = "#21aeff";
    }
    c.beginPath();
    c.moveTo(left+width*cg.Audio.buses.sfx.volume,bottom-10);
    c.arc(left+width*cg.Audio.buses.sfx.volume,bottom,13,0,Math.PI*2);
    c.fill();

    c.fillStyle = "#ffffff";
    c.font = "20px PublicPixel";
    c.textAlign = "left";
    if (stst.isFullscreen) {
      c.fillText("EXIT FULLSCREEN",ax-cg.cw/scale/2+50,bottom);
    } else {
      c.fillText("FULLSCREEN",ax-cg.cw/scale/2+50,bottom);
    }

    c.textBaseline = "alphabetic";
  };
};
cg.scenes.title.createItem("graphic",{
  graphic : cg.createGraphic({type:"title"},"title"),
  transformInit : {CGSpace:false,canvasSpaceXAnchor:0.5,canvasSpaceYAnchor:0.5}
},"title","underlay");

cg.Input.createButton({
  type : "rectangle",
  width : 250,
  height : 60,
  scene : cg.scenes.title,
  transformInit : {
    CGSpace : false,
    x : -175,
    y : -70*3,
    canvasSpaceXAnchor : 1,
    canvasSpaceYAnchor : 1
  }
},"masterVolume");

cg.Input.createButton({
  type : "rectangle",
  scene : cg.scenes.title,
  width : 250,
  height : 60,
  transformInit : {
    CGSpace : false,
    x : -175,
    y : -70*2,
    canvasSpaceXAnchor : 1,
    canvasSpaceYAnchor : 1
  }
},"musicVolume");

cg.Input.createButton({
  type : "rectangle",
  scene : cg.scenes.title,
  width : 250,
  height : 60,
  transformInit : {
    CGSpace : false,
    x : -175,
    y : -70,
    canvasSpaceXAnchor : 1,
    canvasSpaceYAnchor : 1
  }
},"sfxVolume");

stst.isFullscreen = false;

cg.Input.createButton({type:"rectangle",
  width : 350,
  height : 60,
  scene : cg.scenes.title,
  transformInit : {
    CGSpace : false,
    x : 200,
    y : -68,
    canvasSpaceYAnchor : 1
  },
  down : ()=> {
    stst.isFullscreen = !stst.isFullscreen;
    if (stst.isFullscreen) {
      cg.canvas.element.requestFullscreen().catch((e)=>{
        alert("Your browser does not support fullscreen")
      });
    } else {
      document.exitFullscreen();
    }
  },
},"fullscreenToggle");

cg.settings.input.callbacks.cursorMove = () => {
  let master = cg.Input.buttons.masterVolume;
  let music = cg.Input.buttons.musicVolume;
  let sfx = cg.Input.buttons.sfxVolume;
  function transform(phase) {
    if (phase<0.1) { return 0; }
    if (phase>0.9) { return 1; }
    return (phase-0.1)/(0.9-0.1);
  }
  if (master.hovered&&cg.Input.cursor.hold.any) {
    cg.Audio.masterVolume = transform(master.hoveredX);
  }
  if (music.hovered&&cg.Input.cursor.hold.any) {
    cg.Audio.buses.music.volume = transform(music.hoveredX);
  }
  if (sfx.hovered&&cg.Input.cursor.hold.any) {
    cg.Audio.buses.sfx.volume = transform(sfx.hoveredX);
  }
}

cg.processLoops.push(function canvasScaler() {
  cg.cameras.main.canvasSpaceScale = cg.canvases.main.width/1920;
});

stst.exitMenuIsOpen = false;
stst.failMenuIsOpen = false;

stst.openExitMenu = () => {
  cg.Audio.playing.footsteps.paused = true;
  stst.exitMenuIsOpen = true;
  cg.camera.addScene(cg.scenes.exit);
  cg.settings.core.timeScale = 0;
}

stst.closeExitMenu = () => {
  stst.exitMenuIsOpen = false;
  cg.camera.removeScene(cg.scenes.exit);
  cg.settings.core.timeScale = 1;
}

stst.openFailMenu = () => {
  if (stst.exitMenuIsOpen) { return; }
  cg.objects.topLeftText.transform.o = 0;
  if (cg.camera.isSceneOpen(cg.scenes.title)) { return; }
  cg.Audio.playing.footsteps.paused = true;
  stst.failMenuIsOpen = true;
  cg.camera.addScene(cg.scenes.fail);
  cg.settings.core.timeScale = 0;
}

stst.closeFailMenu = () => {
  stst.failMenuIsOpen = false;
  cg.camera.removeScene(cg.scenes.fail);
  cg.settings.core.timeScale = 1;
}

stst.openTitleScreen = () => {
  cg.Audio.playing.footsteps.paused = true;
  cg.settings.core.timeScale = 0;
  cg.camera.setScene(cg.scenes.title);
  if (cg.Audio.playing.running!=null) {
    cg.Audio.playing.running.stop(3);
    cg.Audio.playing.alarm.stop(1);
  }
  if (cg.Audio.playing.ambience!=null) {
    cg.Audio.playing.ambience.fadeVolume(0,3);
  }
}

stst.closeTitleScreen = () => {
  stst.reset(true);
  cg.settings.core.timeScale = 1;
  cg.camera.setScene(cg.scenes.main);
  if (cg.Audio.playing.ambience==null) {
    cg.Audio.sounds.ambience.play({bus:"music",allowBuffer:true,loop:true,fadeIn:1,soundInstanceId:"ambience"});
  } else {
    cg.Audio.playing.ambience.fadeVolume(1,3);
  }
}

stst.start = () => {
  if (cg.camera.isSceneOpen(cg.scenes.title)) {
    let isHoveringButton = false;
    for (let buttonId of cg.keys.buttons) {
      let button = cg.Input.buttons[buttonId];
      if (button.hovered||button.pressed||ChoreoGraph.nowint-button.downTime<100) {
        isHoveringButton = true;
        break;
      }
    }
    if (isHoveringButton==false) {
      stst.closeTitleScreen();
    }
  }
}

cg.settings.input.callbacks.cursorDown = () => {
  stst.start();
}