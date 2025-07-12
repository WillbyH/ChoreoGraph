export * from './choreograph';

declare module './choreograph' {
  interface cgInstance {
    Animation: {
      createAnimation(init?: cgAnimationInit, id?: ChoreoGraphId): cgAnimation;
      createAnimationFromPacked(packedData: string, init?: cgAnimationInit, id?: ChoreoGraphId): cgAnimation;

      animations: Record<ChoreoGraphId, cgAnimation>;

      easeFunctions: Record<cgAnimationEaseFunctionTypes, (t: number) => number>;

      rawPreprocessFunctions: Record<string, (animation: cgAnimation) => void>;
    }
  }

  type cgAnimationEaseFunctionTypes = "linear"|"inSine"|"outSine"|"inOutSine"|"inQuad"|"outQuad"|"inOutQuad"|"inCubic"|"outCubic"|"inOutCubic"|"inQuart"|"outQuart"|"inOutQuart"|"inQuint"|"outQuint"|"inOutQuint"|"inExpo"|"outExpo"|"inOutExpo"|"inCirc"|"outCirc"|"inOutCirc"|"inBack"|"outBack"|"inOutBack"|"inElastic"|"outElastic"|"inOutElastic"|"inBounce"|"outBounce"|"inOutBounce";

  type cgAnimation = {
    id: ChoreoGraphId;
    data: cgAnimationData;
    keys: cgAnimationKey[];
    tracks: cgAnimationTrack[];
    readonly duration: number;
    readonly timeKey: boolean;
    readonly ready: boolean;

    loadRaw(
      data: cgAnimationData,
      keys: cgAnimationKey[],
      preprocessingFunctions?: string[]
    ): cgAnimation;
    createTrack(trackType: cgAnimationTrackType): cgAnimationTrack;
    bake(): void;
    calculateDuration(): number;
    pack(): string;
    unpack(packedData: string): void;
    getTimeKey(): number;
    delete(): void;

    [key: string]: any;
  }

  type cgAnimationData = any[][];
  type cgAnimationKey = {
    keySet: "time" | string[];
    sources?: string[];
  }

  type cgAnimationPathTrack = {
    type: "path";
    segments: [];
    streams: ["x","y","r"];
    keys: {
      x: number,
      y: number,
      r: number
    }
    density: number;

    getJointPath(): string;
  }

  type cgAnimationSpriteTrack = {
    type: "sprite";

    mode: "framerate" | "time";
    fps: number;
    time: string | number;
    frames: number[];

    graphicKey: string[];
  }

  type cgAnimationFixedTimeTrack = {
    type: "fixedtime";

    mode: "framerate" | "time";
    fps: number;
    time: string | number;
    frames: number;
  }

  type cgAnimationVariableTimeTrack = {
    type: "variabletime";

    times : number[];
  }

  type cgAnimationValueTrack = {
    type: "value";

    streams: ["v"];
    values: number[];
  }

  type cgAnimationTriggerTrack = {
    type: "trigger";

    triggers: {
      part: number,
      type: string,
      data: {
        evaluate: boolean,
        value: string
      }
    }[];
  }

  type cgAnimationTrack = cgAnimationPathTrack | cgAnimationSpriteTrack | cgAnimationFixedTimeTrack | cgAnimationVariableTimeTrack | cgAnimationValueTrack | cgAnimationTriggerTrack;
  type cgAnimationTrackType = "path" | "sprite" | "fixedtime" | "variabletime" | "value" | "trigger";

  type cgAnimationInit = {

  }

  interface cgSettings {
    animation: {
      defaultPathDensity: number;
      genericDecimalRounding: number;
      timeDecimalRounding: number;

      rawProcessing : {
        xKey : string[],
        yKey : string[],
        rKey : string[],
        consistentSpeed : number
      },

      debug: {
        active: boolean;
        showBakedPaths: boolean;
        showDirectionalMarkings: boolean;
        directionalMarkingLength: number;
        pathXKey: string[];
        pathYKey: string[];
        pathRKey: string[];
        pathColours: [string, string, string];

        showMarkers: boolean;
        markerColours: Record<string, string>;
        width: number;
      }
    }
  }

  type cgObjectAnimator = {
    readonly manifest: {
      type: 'Animator';
      key: string;
      master: true;
      functions: {
        update: true;
        delete: true;
      };
    };

    animation: cgAnimation | null;
    readonly connectionData: {
      initialisedAnimation: ChoreoGraphId;
      keys: {
        key: string;
        object: object;
      }[];
    }
    speed: number;
    playhead: number;
    readonly timeBudget: number;
    readonly travelledThisFrame: number;
    readonly stt: number;
    readonly ent: number;
    readonly part: number;
    readonly from: object;
    readonly to: object;
    ease: cgAnimationEaseFunctionTypes;
    readonly lastUpdatedFrame: number;
    readonly nextPlayfromAllowTriggers: boolean;
    runTriggers: boolean;
    loop: boolean;
    paused: boolean;
    readonly playing: boolean;
    readonly processingTrigger: boolean;
    onStart: (animator: cgObjectAnimator) => void;
    onEnd: (animator: cgObjectAnimator) => void;

    triggerTypes: Record<string, object>;

    deleteAnimationOnDelete: boolean;

    rewind(): void;
    setValues(): void;
    setFinalValues(): void;
    playFrom(playhead: number): void;
    reset(): void;
    restart(): void;
    delete(): void;
  }

  interface cgObjectAnimatorInit extends cgObjectComponentInitBase {
    animation?: cgAnimation;
    speed?: number;
    playhead?: number;
    ease?: cgAnimationEaseFunctionTypes;
    runTriggers?: boolean;
    loop?: boolean;
    paused?: boolean;
    onStart?: (animator: cgObjectAnimator) => void;
    onEnd?: (animator: cgObjectAnimator) => void;
    triggerTypes?: Record<string, object>;
    deleteAnimationOnDelete?: boolean;
  }

  interface cgObjectComponentMap {
    Animator: cgObjectAnimator;
  }

  interface cgObjectComponentInitMap {
    Animator: cgObjectAnimatorInit;
  }
}