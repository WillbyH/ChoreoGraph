interface cgSettings {
  animationeditor: {
    active: boolean,
    grabDistance: number,
    snapGridSize: number,
    snapGridOffsetX: number,
    snapGridOffsetY: number,
    genericDecimalRounding: number,
    timeDecimalRounding: number,
    template: string,
    hotkeys: {
      undo: string,
      redo: string,
      pathAdd: string,
      pathGrab: string,
      pathDelete: string,
      pathInsert: string
    },
    pathStyle : {
      lineA: string,
      lineB: string,
      lineC: string,
      joint: string,
      control: string,
      curve: string,
    },
    closestFrameLocator : {
      active: boolean,
      lineColour: string
    }
  }
}