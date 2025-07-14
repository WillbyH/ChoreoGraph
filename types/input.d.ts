export * from './choreograph';

declare module './choreograph' {
  interface ChoreoGraph {
    Input: {
      keyNames: cgKeyType[];
      keyStates: Record<cgKeyType, boolean>;

      NULLINPUT: "nullinput";
      KEYBOARD: "keyboard";
      CONTROLLER: "controller";
      MOUSE: "mouse";
      TOUCH: "touch";

      CURSOR_DEFAULT: "default";
      CURSOR_HOVERING: "hovering";
      CURSOR_PRESSING: "pressing";
      CURSOR_HIDDEN: "hidden";

      lastKeyDown: cgKeyType | null;
      lastKeyDownFrame: ChoreoGraphFrame;
      activeKeys: number;
      capsLock: boolean;
      altKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      metaKey: boolean;

      isInstanceKeyAvailable(cg: cgInstance): boolean;
      keyDown(key: cgKeyType): void;
      keyUp(key: cgKeyType): void;
      releaseAllKeys(): void;
      getSimplifiedKey(event: KeyboardEvent): cgKeyType;

      controllers: Record<string, cgInputController>;
      selectedController: cgInputController | null;
      controller: cgInputController | null;

      GamePadTypes: cgInputGamePadTypes;
    }
  }

  type cgInputType = "nullinput" | "keyboard" | "controller" | "mouse" | "touch";
  type cgInputKeyType = "nullinput" | "keyboard" | "controller" | "mouse";
  type cgInputCursorType = "nullinput" | "mouse" | "touch" | "controller";
  type cgInputCursorStyleType = "default" | "hovering" | "pressing" | "hidden";

  type cgKeyType = "a"|"b"|"c"|"d"|"e"|"f"|"g"|"h"|"i"|"j"|"k"|"l"|"m"|"n"|"o"|"p"|"q"|"r"|"s"|"t"|"u"|"v"|"w"|"x"|"y"|"z"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"0"|"left"|"right"|"up"|"down"|"ctrl"|"shift"|"alt"|"space"|"enter"|"backspace"|"tab"|"capslock"|"escape"|"pageup"|"pagedown"|"end"|"home"|"insert"|"delete"|"numlock"|"scrolllock"|"pause"|"printscreen"|"contextmenu"|"meta"|"altgraph"|"fn"|"fnlock"|"hyper"|"super"|"symbol"|"symbollock"|"clear"|"cut"|"copy"|"paste"|"eraseeof"|"exsel"|"redo"|"undo"|"accept"|"again"|"attn"|"cancel"|"execute"|"find"|"finish"|"help"|"play"|"props"|"select"|"zoomin"|"zoomout"|"brightnessdown"|"brightnessup"|"eject"|"logoff"|"power"|"poweroff"|"hibernate"|"standby"|"wakeup"|"allcandidates"|"alphanumeric"|"codeinput"|"compose"|"convert"|"dead"|"finalmode"|"groupfirst"|"grouplast"|"groupnext"|"groupprevious"|"modechange"|"nextcandidate"|"nonconvert"|"previouscandidate"|"process"|"singlecandidate"|"hangulmode"|"hanjamode"|"junjamode"|"eisu"|"hankaku"|"hiragana"|"hiraganakatakana"|"kanamode"|"kanjimode"|"katakana"|"romaji"|"zenkaku"|"zenkakukankaku"|";"|"="|","|"-"|"."|"/"|"`"|"["|"\\"|"]"|"'"|"^"|":"|"!"|"<"|">"|"?"|"~"|"{"|"|"|"}"|'"'|"@"|"#"|"$"|"%"|"&"|"*"|"("|")"|"_"|"+"|"f1"|"f2"|"f3"|"f4"|"f5"|"f6"|"f7"|"f8"|"f9"|"f10"|"f11"|"f12"|"f13"|"f14"|"f15"|"f16"|"f17"|"f18"|"f19"|"f20"|"f21"|"f22"|"f23"|"f24"|"soft1"|"soft2"|"soft3"|"soft4"|"appswitch"|"call"|"camera"|"camerafocus"|"endcall"|"goback"|"gohome"|"headsethook"|"lastnumberredial"|"notification"|"mannermode"|"voicedial"|"channeldown"|"channelup"|"mediafastforward"|"mediapause"|"mediaplay"|"mediaplaypause"|"mediarecord"|"mediarewind"|"mediastop"|"mediatrackprevious"|"audiobalanceleft"|"audiobalanceright"|"audiobassdown"|"audiobassboostdown"|"audiobassboosttoggle"|"audiobassboostup"|"audiobassup"|"audiofaderfront"|"audiofaderrear"|"audiosurroundmodenext"|"audiotrebledown"|"audiotrebleup"|"audiovolumedown"|"audiovolumemute"|"audiovolumeup"|"microphonetoggle"|"microphonevolumedown"|"microphonevolumemute"|"microphonevolumeup"|"close"|"new"|"open"|"print"|"save"|"spellcheck"|"mailforward"|"mailreply"|"mailsend"|"browserback"|"browserfavourites"|"browserforward"|"browserhome"|"browserrefresh"|"browsersearch"|"browserstop"|"decimal"|"key11"|"key12"|"multiply"|"add"|"divide"|"subtract"|"separator"|"conactiontop"|"conactionbottom"|"conactionleft"|"conactionright"|"condpadup"|"condpaddown"|"condpadleft"|"condpadright"|"conleftstick"|"conrightstick"|"constart"|"conselect"|"conleftbumper"|"conrightbumper"|"conlefttrigger"|"conrighttrigger"|"conleftstickup"|"conleftstickdown"|"conleftstickleft"|"conleftstickright"|"conrightstickup"|"conrightstickdown"|"conrightstickleft"|"conrightstickright"|"mouseleft"|"mousemiddle"|"mouseright"|"mousewheelup"|"mousewheeldown"|"mousebutton1"|"mousebutton2";

  type cgInputControllerAxes = "conleftup"|"conleftdown"|"conleftleft"|"conleftright"|"conrightup"|"conrightdown"|"conrightleft"|"conrightright";

  interface cgInstance {
    Input: {
      cursor: cgInputCanvasCursorData;
      lastInputType: cgInputType;
      lastKeyType: cgInputKeyType;
      lastCursorType: cgInputCursorType;
      lastInteraction: {
        any: number;

        cursor: number;
        cursorButton: number;
        touch: number;
        mouse: number;

        key: number;
        keyboard: number;
        controller: number;
      }
      lastPointerMoveEvent: PointerEvent | null;

      readonly buttons: Record<string, cgButton>;
      readonly lastCheckedButtonChecks: ChoreoGraphFrame;
      readonly cachedButtonChecks: Record<string, boolean>;
      readonly hoveredButtons: number;
      readonly pressedButtons: number;

      readonly actions: Record<string, cgAction>;

      buttonChecks(): Record<string, boolean>;

      createButton(init: cgButtonInit, id?: ChoreoGraphId): cgButton;
      createAction(init: cgActionInit, id?: ChoreoGraphId): cgAction;

      getActionNormalisedVector(
        up: cgKeyType | cgAction | cgButton | cgInputControllerAxes | ChoreoGraphId,
        down: cgKeyType | cgAction | cgButton | cgInputControllerAxes | ChoreoGraphId,
        left: cgKeyType | cgAction | cgButton | cgInputControllerAxes | ChoreoGraphId,
        right: cgKeyType | cgAction | cgButton | cgInputControllerAxes | ChoreoGraphId
      ): [number, number];
    }
  }

  type CSSCursor =
    | 'auto'
    | 'default'
    | 'none'
    | 'context-menu'
    | 'help'
    | 'pointer'
    | 'progress'
    | 'wait'
    | 'cell'
    | 'crosshair'
    | 'text'
    | 'vertical-text'
    | 'alias'
    | 'copy'
    | 'move'
    | 'no-drop'
    | 'not-allowed'
    | 'grab'
    | 'grabbing'
    | 'all-scroll'
    | 'col-resize'
    | 'row-resize'
    | 'n-resize'
    | 'e-resize'
    | 's-resize'
    | 'w-resize'
    | 'ne-resize'
    | 'nw-resize'
    | 'se-resize'
    | 'sw-resize'
    | 'ew-resize'
    | 'ns-resize'
    | 'nesw-resize'
    | 'nwse-resize'
    | 'zoom-in'
    | 'zoom-out'
    | `url(${string})`
    | string;

  type cgInputCanvasCursorData = {
    readonly x: number;
    readonly y: number;
    readonly canvasX: number;
    readonly canvasY: number;
    readonly clientX: number;
    readonly clientY: number;
    readonly canvas: cgCanvas;
    readonly boundBox: DOMRect;
    readonly touches: Record<number, cgInputTouchData>;
    readonly activeTouches: number[];
    readonly styleState: cgInputCursorStyleType;

    down: {
      left: {x: number, y: number};
      middle: {x: number, y: number};
      right: {x: number, y: number};
      any: {x: number, y: number};
    }
    up: {
      left: {x: number, y: number};
      middle: {x: number, y: number};
      right: {x: number, y: number};
      any: {x: number, y: number};
    }
    hold: {
      left: boolean;
      middle: boolean;
      right: boolean;
      any: boolean;
    }
    impulseDown: {
      left: boolean;
      middle: boolean;
      right: boolean;
      any: boolean;
    }
    impulseUp: {
      left: boolean;
      middle: boolean;
      right: boolean;
      any: boolean;
    }

    setStyle(state: cgInputCursorStyleType, cursor: CSSCursor): void;
  }

  type cgInputTouchData = {
    readonly x: number;
    readonly y: number;
    readonly canvasX: number;
    readonly canvasY: number;
    readonly clientX: number;
    readonly clientY: number;
  }

  type cgInputGamePadTypes = Record<cgInputGamePadTypeName, cgInputGamePadType>;

  type cgInputXBOXGamePad = {
    name: "Xbox Controller";
    buttons: ["A", "B", "X", "Y", "Left Bumper", "Right Bumper", "Left Trigger", "Right Trigger", "Select", "Start", "Left Stick", "Right Stick", "D-Pad Up", "D-Pad Down", "D-Pad Left", "D-Pad Right"];
    triggers: ["LT", "RT"];
  }

  type cgInputPlaystationGamePad = {
    name: "Playstation Controller";
    buttons: ["Cross", "Circle", "Square", "Triangle", "Left Bumper", "Right Bumper", "Left Trigger", "Right Trigger", "Select", "Start", "Left Stick", "Right Stick", "D-Pad Up", "D-Pad Down", "D-Pad Left", "D-Pad Right"];
    triggers: ["L2", "R2"];
  }

  type cgInputNintendoGamePad = {
    name: "Nintendo Pro Controller";
    buttons: ["B", "A", "Y", "X", "Left Bumper", "Right Bumper", "Left Trigger", "Right Trigger", "Minus", "Plus", "Left Stick", "Right Stick", "D-Pad Up", "D-Pad Down", "D-Pad Left", "D-Pad Right"];
    triggers: ["ZL", "ZR"];
  }

  type cgInputSteamGamePad = {
    name: "Steam Controller";
    buttons: ["A", "B", "X", "Y", "Left Bumper", "Right Bumper", "Left Trigger", "Right Trigger", "Select", "Start", "Left Stick", "Right Stick", "D-Pad Up", "D-Pad Down", "D-Pad Left", "D-Pad Right"];
    triggers: ["LT", "RT"];
  }

  type cgInputUnknownGamePad = {
    name: "Controller";
    buttons: ["A", "B", "X", "Y", "Left Bumper", "Right Bumper", "Left Trigger", "Right Trigger", "Select", "Start", "Left Stick", "Right Stick", "D-Pad Up", "D-Pad Down", "D-Pad Left", "D-Pad Right"];
    triggers: ["LT", "RT"];
  }

  type cgInputGamePadTypeName = "XBOX" | "PLAYSTATION" | "NINTENDO" | "STEAM" | "UNKNOWN";
  type cgInputGamePadType = cgInputXBOXGamePad | cgInputPlaystationGamePad | cgInputNintendoGamePad | cgInputSteamGamePad | cgInputUnknownGamePad;

  type cgInputController = {
    connected: boolean;
    type: cgInputGamePadType;
    lastButtons: boolean[];
    gamepad: Gamepad;
  }

  interface cgButton {
    readonly id: ChoreoGraphId;
    readonly downTime: number;
    readonly upTime: number;
    readonly enterTime: number;
    readonly exitTime: number;
    readonly hovered: boolean;
    readonly pressed: boolean;
    check: string;
    cursorId: number;
    hoverCursor: CSSCursor | null;
    pressCursor: CSSCursor | null;
    allowUpWithNoPress: boolean;
    allowedButtons: [boolean, boolean, boolean, boolean];
    readonly hoverCount: number;
    readonly hoveredX: number;
    readonly hoveredY: number;

    down: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;
    up: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;
    enter: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;
    exit: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;

    readonly x: number;
    readonly y: number;

    transform: cgTransform;
    scene: cgScene | null;

    inside(x: number, y: number): boolean;
    getCentre(): [number, number];
    delete(): void;

    [key: string]: any;
  }

  interface cgButtonInitBase {
    check?: string;
    hoverCursor?: CSSCursor;
    pressCursor?: CSSCursor;
    allowUpWithNoPress?: boolean;
    allowedButtons?: [boolean, boolean, boolean, boolean];

    down?: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;
    up?: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;
    enter?: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;
    exit?: (button?: cgButton, event?: PointerEvent, canvas?: cgCanvas) => void;

    scene?: cgScene;

    transform?: cgTransform;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;

    [key: string]: any;
  }

  interface cgRectangleButton extends cgButton {
    type: "rectangle";
    width: number;
    height: number;
  }

  interface cgRectangleButtonInit extends cgButtonInitBase {
    type: "rectangle";
    width: number;
    height: number;
  }

  interface cgCircleButton extends cgButton {
    type: "circle";
    radius: number;
  }

  interface cgCircleButtonInit extends cgButtonInitBase {
    type: "circle";
    radius: number;
  }

  interface cgPolygonButton extends cgButton {
    type: "polygon";
    path: [number, number][];
  }

  interface cgPolygonButtonInit extends cgButtonInitBase {
    type: "polygon";
    path: [number, number][];
  }

  type cgButtonInit = cgRectangleButtonInit | cgCircleButtonInit | cgPolygonButtonInit;

  type cgActionKey = {
    main: cgKeyType | cgInputControllerAxes | cgButton | cgAction;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
    deadzone: number;

    get(): number;
  }

  type cgAction = {
    readonly id: ChoreoGraphId;
    keys: cgActionKey[];

    readonly cachedValue: number;
    readonly cachedFrame: ChoreoGraphFrame;
    readonly lastUpdateValue: number;

    down: (value: number) => void;
    up: () => void;

    get(): number;
    delete(): void;
  }

  type cgActionInit = {
    keys: (cgKeyType | cgInputControllerAxes | cgButton | cgAction)[];

    down?: (value: number) => void;
    up?: () => void;
  }

  interface cgSettings {
    input: {
      preventSingleTouch: boolean;
      preventTouchScrolling: boolean;
      preventTouchOnButtons: boolean;
      preventContextMenu: boolean;
      preventMiddleClick: boolean;
      preventCanvasSelection: boolean;
      preventScrollWheel: boolean;

      focusKeys: boolean;
      preventDefaultKeys: cgKeyType[];
      recheckButtonsEveryFrame: boolean;

      allowController: boolean;
      controller: {
        keyStickDeadzone: number;
        emulatedCursor: {
          active: boolean;
          hideCursor: boolean;
          lockCursorCanvas: boolean;
          stickSide: "left" | "right";
          stickDeadzone: number;
          stickSensitivity: number;
          buttons: {
            active: boolean;
            left: number;
            right: number;

          }
        }
      }

      callbacks: {
        keyDown: ((key: cgKeyType, event: PointerEvent) => void) | null;
        keyUp: ((key: cgKeyType, event: PointerEvent) => void) | null;
        cursorUp: ((cursor: cgInputCanvasCursorData, event: PointerEvent) => void) | null;
        cursorDown: ((cursor: cgInputCanvasCursorData, event: PointerEvent) => void) | null;
        cursorMove: ((cursor: cgInputCanvasCursorData, event: PointerEvent) => void) | null;
        cursorEnter: ((cursor: cgInputCanvasCursorData, event: PointerEvent) => void) | null;
        cursorExit: ((cursor: cgInputCanvasCursorData, event: PointerEvent) => void) | null;
        wheel: ((cursor: cgInputCanvasCursorData, event: WheelEvent) => void) | null;
        buttonDown: ((button: cgButton, event: PointerEvent, canvas: cgCanvas) => void) | null;
        updateButtonChecks: ((cg: cgInstance) => void) | null;
      }

      debug: {
        active: boolean;
        buttons: {
          active: false;
          opacity: number;
          fadeOut: number;
          style: {
            fontSize: number;
            fontFamily: string;
            textColour: string;
            bgNormal: string;
            bgInactive: string;
            bgHover: string;
            bgClicked: string;
          }
        }
      }
    }
  }
}