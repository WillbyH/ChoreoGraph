cg.createImage({
  file : "sheet.png",
  crop : [16,16*6,32,32]
},"doorBackground");
cg.createImage({
  file : "sheet.png",
  crop : [16*3,16*6,32,32]
},"doorRoots");
cg.createImage({
  file : "sheet.png",
  crop : [16*5+9,16*5+12,3,4]
},"doorGemEmpty");
cg.createImage({
  file : "sheet.png",
  crop : [16*5+13,16*5+12,3,4]
},"doorGemFull");

cg.graphicTypes.exitDoor = {
  setup() {
    this.open = false;

    this.reset = () => {
      this.open = false;
    }
  },
  draw(c,ax,ay,canvas) {
    canvas.drawImage(cg.images.doorBackground, 0, 0, 32, 32);
    if (!this.open) {
      canvas.drawImage(cg.images.doorRoots, 0, 0, 32, 32);
    }

    const gameInterface = cg.graphics.gameInterface;
    const gemSeparation = 5;
    const xOffset = -gameInterface.gemCount * 0.5 * gemSeparation + 3;
    const yOffset = -14;

    for (let i=0;i<gameInterface.gemCount;i++) {
      const image = (i >= gameInterface.gemOrder.length) ? cg.images.doorGemEmpty : cg.images.doorGemFull;

      const x = xOffset + i * gemSeparation;
      const y = yOffset;
      canvas.drawImage(image, x, y);
    }
  }
}
cg.createGraphic({type : "exitDoor"},"exitDoor");