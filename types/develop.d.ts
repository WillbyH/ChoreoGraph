export * from './choreograph';

declare module './choreograph' {
  interface ChoreoGraph {
    Develop: {
      style: {
        action: string;
        off: string;
        on: string;
      }
      changedSelectedInstanceHotkey: string;
      createInterfaces: boolean;
    }
  }

  interface cgInstance {
    Develop: {
      selectedCanvas: cgCanvas;
    }
  }

  interface cgSettings {
    develop: {
      fps: {
        active: boolean;
      }
      freeCam: {
        hotkey: string;
        zoomSpeed: number;
      }
      cameras: {
        active: boolean;
        colour: string;
      }
      frustumCulling: {
        active: boolean;
        unculledBoxColour: string;
        culledBoxColour: string;
        frustumColour: string;
      }
      objectGizmo: {
        active: boolean;
        hotkeySwitchMode: string;
        hotkeySnap: string;
        rounding: number;
        rotationSnap: number;
        positionSnap: number;
        snapXOffset: number;
        snapYOffset: number;
        colours: {
          unhoveredSelection: string;
          hoveredSelection: string;
          gizmoX: string;
          gizmoY: string;
          gizmoOther: string;
        }
      }
      objectAnnotation: {
        active: boolean;
        textColour: string;
        offsetX: number;
        offsetY: number;
        maxWidth: number;
        keySet: string[];
        removeText: string[];
        fontSize: number;
      }
      pathEditor: {
        snapGridSize: number;
        snapXOffset: number;
        snapYOffset: number;
        rounding: number;
        grabDistance: number;
        magneticAngle: number;
        colours: {
          lineA: string;
          lineB: string;
          point: string;
          new: string;
          selected: string;
        }
        hotkeys: {
          copy: string;
          undo: string;
          redo: string;
          delete: string;
          magnetic: string;
        }
      }
    }
  }
}