cg.createImage({
  file : "sheet.png",
  crop : [5*16+1,6*16+6,6,9]
},"largeGemColour");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+9,6*16+6,6,9]
},"largeGemOutline");
cg.createImage({
  file : "sheet.png",
  crop : [5*16,6*16+1,4,4]
},"gemParticle0");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+5,6*16+1,4,4]
},"gemParticle1");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+9,6*16+1,4,4]
},"gemParticle2");
cg.createImage({
  file : "sheet.png",
  crop : [5*16+12,6*16+1,4,4]
},"gemParticle3");

cg.callbacks.listen("core","process",function canvasScaler() {
  cg.cameras.main.canvasSpaceScale = cg.canvases.main.width/1920;
});

cg.graphicTypes.gameInterface = {
  setup() {
    this.gemCount = 3;
    this.displayedGems = 0;

    this.collections = [];
    this.losses = [];
    this.particles = [];
    this.gemOrder = [];
    this.fadeOutTime = Infinity;

    this.reset = () => {
      this.gemOrder = [];
      this.collections = [];
      this.particles = [];
      this.fadeOutTime = Infinity;
      this.displayedGems = 0;
    }

    this.fadeOut = () => {
      if (this.fadeOutTime !== Infinity) { return; }
      this.fadeOutTime = cg.clock;
    }

    this.createParticle = (x,y) => {
      const dir = Math.random() * 2 * Math.PI;
      const speed = Math.random() * 0.4;
      const xv = Math.cos(dir) * speed;
      const yv = Math.sin(dir) * speed;

      this.particles.push({
        x : x + (Math.random()-0.5)*10,
        y : y + (Math.random()-0.5)*10,
        r : (Math.random()-0.5)*360,
        xv : xv,
        yv : yv,
        rv : (Math.random()-0.5),
        stt : cg.clock,
        lifetime : Math.random()*1000 + 700,
        image : cg.images["gemParticle" + Math.floor(Math.random()*4)]
      })
    }

    this.collectGem = (gem) => {
      const x = cg.cameras.main.getCanvasSpaceX(gem.transform.x);
      const y = cg.cameras.main.getCanvasSpaceY(gem.transform.y);
      this.collections.push({
        originX : x,
        originY : y,
        stt : cg.clock,
        targetIndex : this.gemOrder.length,
      });

      this.gemOrder.push(gem);

      gem.light.brightness = 0;

      for (let i=0;i<10;i++) {
        this.createParticle(x,y);
      }
    }

    this.loseGem = () => {
      if (this.gemOrder.length === 0) { return; }
      const gem = this.gemOrder.pop();
      this.displayedGems--;
      cg.graphics.exitDoor.open = false;
      this.losses.push({
        originIndex : this.gemOrder.length,
        gem : gem,
        stt : cg.clock
      });
    }

    this.poof = (x,y) => {
      x = cg.cameras.main.getCanvasSpaceX(x);
      y = cg.cameras.main.getCanvasSpaceY(y);
      for (let i=0;i<40;i++) {
        this.createParticle(x,y);
      }
    }
  },
  draw(c,ax,ay,canvas) {
    const xOffset = 100;
    const yOffset = 100;
    const pixelScale = 4;
    const gemWidth = 6*pixelScale;
    const gemHeight = 9*pixelScale;
    const gemSeparation = 50;

    // Collection Paths
    const collectionDuration = 700;

    for (let i=0;i<this.collections.length;i++) {
      const collection = this.collections[i];
      let progress = (cg.clock - collection.stt) / collectionDuration;
      if (progress >= 1) {
        this.displayedGems++;
        if (this.displayedGems >= this.gemCount) {
          cg.graphics.exitDoor.open = true;
        }
        collection.collected = true;
        continue;
      }
      progress = cg.Animation.easeFunctions.inOutQuart(progress);
      const targetX = xOffset + collection.targetIndex * gemSeparation;
      const targetY = yOffset;
      const x = collection.originX + (targetX - collection.originX) * progress;
      const y = collection.originY + (targetY - collection.originY) * progress;

      this.createParticle(x,y);

      c.fillStyle = "#78ed87";
      c.globalAlpha = progress + 0.1;
      canvas.drawImage(cg.images.largeGemColour, x, y, gemWidth, gemHeight);
    }
    this.collections = this.collections.filter(c => !c.collected);

    // Loss Paths
    const lossDuration = 700;

    for (let i=0;i<this.losses.length;i++) {
      const loss = this.losses[i];
      let progress = (cg.clock - loss.stt) / lossDuration;
      if (progress >= 1) {
        loss.gem.Graphic.transform.o = 1;
        this.losses.splice(i,1);
        i--;
        continue;
      }
      progress = cg.Animation.easeFunctions.inOutQuart(progress);
      const originX = xOffset + loss.originIndex * gemSeparation;
      const originY = yOffset;
      const targetX = cg.cameras.main.getCanvasSpaceX(loss.gem.transform.x);
      const targetY = cg.cameras.main.getCanvasSpaceY(loss.gem.transform.y);
      const x = originX + (targetX - originX) * progress;
      const y = originY + (targetY - originY) * progress;

      this.createParticle(x,y);

      c.fillStyle = "#ff0000";
      c.globalAlpha = 1 - progress;
      canvas.drawImage(cg.images.largeGemOutline, x, y, gemWidth, gemHeight);
    }

    // Gems and Outlines

    c.globalAlpha = 1;
    for (let i=0;i<this.gemCount;i++) {
      const image = (i<this.displayedGems) ? cg.images.largeGemColour : cg.images.largeGemOutline;
      canvas.drawImage(image, xOffset + gemSeparation*i, yOffset, gemWidth, gemHeight);
    }

    // Particles
    const particleSize = 10 / cg.cameras.main.canvasSpaceScale;

    for (let i=0;i<this.particles.length;i++) {
      const particle = this.particles[i];
      const progress = (cg.clock - particle.stt) / particle.lifetime;
      if (progress >= 1) {
        this.particles.splice(i,1);
        i--;
        continue;
      }
      particle.x += particle.xv * cg.timeDelta;
      particle.y += particle.yv * cg.timeDelta;
      particle.r += particle.rv * cg.timeDelta;

      c.globalAlpha = 1 - progress;

      canvas.drawImage(particle.image, particle.x, particle.y, particleSize, particleSize, particle.r);
    }

    // Radial Fade Out

    const fadeOutTime = 2000;
    c.fillStyle = "#000000";
    c.globalAlpha = 1;

    if ((this.fadeOutTime+fadeOutTime) - cg.clock < fadeOutTime) {
      const playerX = cg.cameras.main.getCanvasSpaceX(cg.objects.player.transform.x);
      const playerY = cg.cameras.main.getCanvasSpaceY(cg.objects.player.transform.y);

      let progress = Math.max(((this.fadeOutTime+fadeOutTime) - cg.clock) / fadeOutTime,0);

      if (progress === 0) {
        cg.cameras.main.setScene(cg.scenes.levels);
        this.reset();
      }

      progress = cg.Animation.easeFunctions.inCubic(progress);
      c.beginPath();
      c.arc(playerX,playerY,6000,0,Math.PI*2);
      c.arc(playerX,playerY,2000*progress,0,Math.PI*2,true);
      c.fill();
    }
  }
};
cg.createGraphic({type : "gameInterface"},"gameInterface");