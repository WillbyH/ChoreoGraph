export * from './choreograph';

declare module './choreograph' {
  type cgWebAudio = "WebAudio";
  type cgHTMLAudio = "HTMLAudio";

  interface ChoreoGraph {
    Audio : {
      readonly ready: boolean;
      readonly interacted: boolean;
      readonly nextId: number;

      readonly mode: cgWebAudio | cgHTMLAudio | null;
      ctx: AudioContext;

      onReady: (callback: () => void) => void;
      readonly hasCalledOnReady: boolean;

      warnAboutHTMLAudio: boolean;

      WEBAUDIO: cgWebAudio;
      HTMLAUDIO: cgHTMLAudio;

      generateImpulseResponse: (duration: number, decay: number, cache: boolean) => AudioBuffer;
      createEffectNode: (type: string, options?: Record<string, string | number>) => AudioNode | null;
    }
  }

  interface cgInstance {
    Audio : {
      readonly ready: boolean;
      readonly sounds: Record<ChoreoGraphId, cgSound>;
      readonly playing: Record<ChoreoGraphId | number, cgSoundInstance>;
      readonly buses: Record<ChoreoGraphId, cgAudioBus>;
      readonly masterGain: GainNode | null;

      masterVolume: number;

      createSound(init?: cgSoundInit, id?: ChoreoGraphId): cgSound;

      play(init: cgPlayOptionsInit): undefined | cgSoundInstance;
      playWithOptions(options: cgPlayOptions): undefined | cgSoundInstance;
      stop(id: ChoreoGraphId, fadeoutSeconds: number): void;
      updateNodes(id: ChoreoGraphId, nodes: AudioNode[]): void;
      setVolume(id: ChoreoGraphId, volume: number, seconds: number): void;
      setSpeed(id: ChoreoGraphId, speed: number): void;
      declareBus(id: ChoreoGraphId): cgAudioBus;
      beep(options: cgAudioBeepOptions): OscillatorNode;
    }
  }

  interface cgSettings {
    audio: {
      baseAudioPath: string;
      forceMode: cgWebAudio | cgHTMLAudio;
      skipURIEncoding: boolean;
      masterChangeTime: number;
      pauseFadeTime: number;
    };
  }

  type cgSound = {
    readonly id: ChoreoGraphId;
    readonly source: string;
    readonly blobAudio: Blob | null;
    readonly audio: HTMLAudioElement | AudioBuffer | null;
    readonly downloaded: boolean;
    readonly loaded: boolean;
    readonly instances: Record<string | number, cgSoundInstance>;

    play(options?: cgPlayOptionsInit): undefined | cgSoundInstance;
    delete(): void;
  }

  type cgSoundInit = {
    source: string;
  }

  type cgAudioBus = {
    id: ChoreoGraphId;
    gainNode: GainNode | null;
    volume: number;
  }

  type cgPlayOptions = {
    id: ChoreoGraphId;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    allowBuffer: boolean;
    fadeIn: number;
    volume: number;
    speed: number;
    paused: boolean;
    nodes: AudioNode[];
    soundInstanceId: ChoreoGraphId | null;
    bus: string;
    onCreateSource: (source: AudioBufferSourceNode, options: cgPlayOptions) => void | null;
  }

  type cgPlayOptionsInit = {
    loop?: boolean;
    loopStart?: number;
    loopEnd?: number;
    allowBuffer?: boolean;
    fadeIn?: number;
    volume?: number;
    speed?: number;
    paused?: boolean;
    nodes?: AudioNode[];
    soundInstanceId?: ChoreoGraphId;
    bus?: ChoreoGraphId;
    onCreateSource?: (source: AudioBufferSourceNode, options: cgPlayOptions) => void;
  }

  type cgAudioBeepOptions = {
    frequency?: number;
    endFrequency?: number;
    duration?: number;
    type?: "sine" | "square" | "sawtooth" | "triangle" | "noise";

    attack?: number;
    decay?: number;
    volume?: number;

    biquadType?: "lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "notch" | "allpass";
    biquadFrequency?: number;
    biquadQ?: number;
    biquadGain?: number;
    biquadDetune?: number;

    bus?: ChoreoGraphId;
  }

  type cgSoundInstance = {
    readonly id: ChoreoGraphId;
    readonly source: AudioBufferSourceNode | HTMLAudioElement | null;
    nodes: AudioNode[];
    readonly sound: cgSound;
    paused: boolean;
    readonly started: number;
    readonly lastPausedState: boolean;

    readonly stopTime: number;
    readonly stopped: boolean;

    readonly fadeFrom: number;
    readonly fadeTo: number;
    readonly fadeStart: number;
    readonly fadeEnd: number;

    stop(fadeoutSeconds?: number): void;
    pause(): void;
    fadeVolume(volume: number, time: number): void;
  }
}