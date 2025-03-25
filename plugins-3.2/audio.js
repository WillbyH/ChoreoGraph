ChoreoGraph.plugin({
  name : "Audio",
  key : "Audio",
  version : "2.2",

  globalPackage : new class cgAudio {
    constructor() {
      document.addEventListener("pointerdown", this.documentClicked, false);
    }
    ready = false;
    interacted = false;
    nextId = 0;
    masterVolume = 1;
    lastSeenMasterVolume = this.masterVolume;

    sounds = {};
    playing = {};
    loadBuffer = [];
    
    mode = null; // AudioContext or HTMLAudio
    ctx = null;

    onReady = null;
    calledOnReady = false;

    cache = {};

    instanceObject = class cgAudio {
      sounds = {};

      createSound(name, source, options={}) {
        let newPlayableSound = new this.PlayableSound(name,source,options);
        this.sounds[name] = newPlayableSound;
        this.loadBuffer.push(newPlayableSound);
        return newPlayableSound;
      };

      play(name, loop=0, fadeinSeconds=0, volume=1, speed=1, nodes=[], forceid=false) {
        if (!this.ready) { return; }
        if (this.sounds[name]==undefined) { console.warn("Sound not found"); return; }
        let id = forceid;
        if (forceid===false) { id = this.nextId; this.nextId++; }
    
        if (this.mode=="AudioContext") {
          // SOURCE -> GAIN -> EFFECT NODES -> MASTER GAIN -> DESTINATION
    
          let source = this.ctx.createBufferSource();
          source.buffer = this.sounds[name].audio; // Audio Asset
          source.gainNode = this.ctx.createGain();
          source.gainNode.gain.value = volume; // Volume
          source.loop = loop; // Looping
          source.playbackRate.value = speed; // Speed
    
          source.connect(source.gainNode);
    
          let lastNode = source.gainNode;
          for (let i=0;i<nodes.length;i++) {
            lastNode = lastNode.connect(nodes[i]);
          }
          lastNode.connect(this.masterGain);
    
          source.start();
    
          let newSound = new this.SoundInstance(forceid,source,name,nodes);
          if (fadeinSeconds!=0) {
            source.gainNode.gain.setValueAtTime(-1, this.ctx.currentTime);
            source.gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + fadeinSeconds)
          }
          source.id = newSound.id;
          this.playing[newSound.id] = newSound;
          this.sounds[name].instances[newSound.id] = newSound;
          source.addEventListener('ended', e => {
            if(!e.target.loop&&e.target.stopped!=true){
              e.target.stop();
              delete ChoreoGraph.AudioController.sounds[ChoreoGraph.AudioController.playing[e.target.id].name].instances[e.target.id];
              delete ChoreoGraph.AudioController.playing[e.target.id];
            }
          },{passive: true});
          
          return newSound;
        } else if (this.mode=="HTMLAudio") {
          let source = this.sounds[name].audio.cloneNode();
          let savedVolume = volume;
          source.play();
          source.loop = loop; // Looping
          source.volume = volume; // Volume
          let newSound = new this.SoundInstance(forceid,source,name,nodes);
          if (fadeinSeconds!=0) {
            source.volume = 0;
          }
          newSound.fadeFrom = 0;
          newSound.fadeTo = volume;
          newSound.fadeStart = ChoreoGraph.nowint;
          newSound.fadeEnd = ChoreoGraph.nowint+fadeinSeconds*1000;
          if (this.masterVolume==0) { newSound.savedVolume = savedVolume; }
          source.id = id;
          source.addEventListener('ended', e => {
            if(!e.target.loop&&e.target.stopped!=true){
              e.target.pause();
              delete ChoreoGraph.AudioController.sounds[ChoreoGraph.AudioController.playing[e.target.id].name].instances[e.target.id];
              delete ChoreoGraph.AudioController.playing[e.target.id];
            }
          },{passive: true});
          this.playing[id] = newSound;
          this.sounds[name].instances[id] = newSound;
    
          return newSound;
        }
      };

      stop(id, fadeoutSeconds=0) {
        if (!ChoreoGraph.Audio.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        
        if (this.mode=="AudioContext") {
          if (fadeoutSeconds==0) {
            sound.source.stopped = true;
            sound.source.stop();
            delete this.playing[id];
          } else {
            sound.source.gainNode.gain.setValueAtTime(sound.source.gainNode.gain.value, ChoreoGraph.AudioController.ctx.currentTime);
            sound.source.gainNode.gain.linearRampToValueAtTime(-1, ChoreoGraph.AudioController.ctx.currentTime + fadeoutSeconds);
            setTimeout(function(){ sound.source.stop(); delete ChoreoGraph.AudioController.playing[id]; }, fadeoutSeconds*1000);
          }
        } else if (this.mode=="HTMLAudio") {
          if (fadeoutSeconds==0) {
            sound.source.stopped = true;
            sound.source.pause();
            delete this.playing[id];
          } else {
            sound.fadeFrom = sound.source.volume;
            sound.fadeTo = 0;
            sound.fadeStart = ChoreoGraph.nowint;
            sound.fadeEnd = ChoreoGraph.nowint+fadeoutSeconds*1000;
            setTimeout(function(){ sound.source.pause(); delete ChoreoGraph.AudioController.playing[id]; }, fadeoutSeconds*1000);
          }
        }
      };

      updateNodes(id, nodes) { // Disconnects currently connected nodes and connects new given nodes
        if (!this.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        if (this.mode=="AudioContext") {
          if (sound.nodes.length>0) {
            for (let i=sound.nodes.length-1;i>=0;i--) {
              sound.nodes[i].disconnect();
            }
          } else {
            sound.source.gainNode.disconnect(this.masterGain);
          }
          sound.nodes = nodes;
          let lastNode = sound.source.gainNode;
          for (let i=0;i<sound.nodes.length;i++) {
            lastNode = lastNode.connect(nodes[i]);
          }
          lastNode.connect(this.masterGain);
        } else {
          return "HTMLAudio does not support nodes";
        }
      }

      setVolume(id, volume, seconds) {
        if (!this.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        if (this.mode=="AudioContext") {
          if (seconds==0) { sound.source.gainNode.gain.value = volume; }
          else {
            sound.source.gainNode.gain.setValueAtTime(sound.source.gainNode.gain.value, ChoreoGraph.AudioController.ctx.currentTime);
            sound.source.gainNode.gain.linearRampToValueAtTime(volume, ChoreoGraph.AudioController.ctx.currentTime + seconds);
          }
        } else if (this.mode=="HTMLAudio") {
          if (this.masterVolume==0) { sound.savedVolume = volume; } // Save Volume When Muted
          if (volume<0) { volume = 0; } else if (volume>1) { volume = 1; }
          if (seconds==0) { sound.source.volume = volume; }
          else {
            sound.fadeFrom = sound.source.volume;
            sound.fadeTo = volume;
            sound.fadeStart = ChoreoGraph.nowint;
            sound.fadeEnd = ChoreoGraph.nowint+seconds*1000;
          }
        }
      };

      setSpeed(id, speed) {
        if (!this.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        if (this.mode=="AudioContext") {
          sound.source.playbackRate.value = speed;
        } else if (this.mode=="HTMLAudio") {
          sound.source.playbackRate = speed;
        }
      };
    };
    
    PlayableSound = class PlayableSound {
      constructor(name,file,options) {
        this.name = name;
        this.file = file;
        this.audio = null;
        this.options = options;
        this.loaded = false;

        this.instances = {};
      }
      audioContextInit = async () => {
        let current = this;
        this.audio = await fetch(this.file)
        .then(res => res.arrayBuffer())
        .then(ArrayBuffer => ChoreoGraph.AudioController.ctx.decodeAudioData(ArrayBuffer));
        current.loaded = true;
      }
      HTMLAudioInit = () => {
        this.audio = new Audio(this.file);
      }
      start(loop=0, fadeinSeconds=0, volume=1, speed=1, forceid=false) {
        return ChoreoGraph.AudioController.start(this.name, loop, fadeinSeconds, volume, speed, forceid);
      }
    };

    SoundInstance = class SoundInstance {
      constructor(forceId=false,source,name,nodes=[]) {
        this.id = forceId;
        if (forceId===false) {
          this.id = ChoreoGraph.AudioController.nextId;
          ChoreoGraph.AudioController.nextId++;
        }
        this.source = source;
        this.nodes = nodes;
        this.name = name;

        this.paused = false;
        this.lastPausedState = false;
      }
      start(loop=0, fadeinSeconds=0, volume=1, speed=1, forceid=false) {
        return ChoreoGraph.AudioController.start(this.name, loop, fadeinSeconds, volume, speed, forceid);
      }
      stop(fadeoutSeconds=0) {
        ChoreoGraph.AudioController.stop(this.id, fadeoutSeconds);
      }
    };

    documentClicked() {
      if (ChoreoGraph.Audio.ready) { return; }
      let soundSetupSource = new Audio();
      soundSetupSource.play();
      ChoreoGraph.Audio.interacted = true;
      document.removeEventListener("pointerdown", ChoreoGraph.Audio.documentClicked, false);
    };

    generateImpulseResponse(duration, decay, doNotCache=false) {
      if (this.cache["impulse_"+duration+"_"+decay]!=undefined) { return this.cache["impulse_"+duration+"_"+decay]; }
      let length = this.ctx.sampleRate * duration;
      let impulse = this.ctx.createBuffer(2,length,this.ctx.sampleRate)
      let IR = impulse.getChannelData(0)
      let IL = impulse.getChannelData(1)
      for (let i=0;i<length;i++) {
        IR[i] = (2*Math.random()-1)*Math.pow(1-i/length,decay);
        IL[i] = IR[i];
      }
      if (doNotCache==false) { this.cache["impulse_"+duration+"_"+decay] = impulse; }
      return impulse;
    };

    createEffectNode(type, options) {
      if (this.ctx==null) { console.warn("AudioContext not ready"); return; }
      if (type=="reverb") { // duration, decay
        let convolver = this.ctx.createConvolver();
        convolver.buffer = this.generateImpulseResponse(options.duration, options.decay);
        return convolver;
      } else if (type=="delay") { // time
        let delay = this.ctx.createDelay();
        delay.delayTime.value = options.time;
        return delay;
      } else if (type=="eq") { // type, frequency, Q, gain
        let filter = this.ctx.createBiquadFilter();
        filter.type = options.type;
        if (options.frequency!=undefined) filter.frequency.value = options.frequency;
        if (options.Q!=undefined) filter.Q.value = options.Q;
        if (options.gain!=undefined) filter.gain.value = options.gain;
        return filter;
      } else if (type=="gain") { // volume
        let gain = this.ctx.createGain();
        gain.gain.value = options.volume; // 0 - silent  1 - normal  2 - double
        return gain;
      } else if (type=="panner") { // x, y, z
        let panner = this.ctx.createPanner();
        panner.positionX.setValueAtTime(options.x, this.ctx.currentTime);
        panner.positionY.setValueAtTime(options.y, this.ctx.currentTime);
        panner.positionZ.setValueAtTime(options.z, this.ctx.currentTime);
        return panner;
      } else if (type=="stereo") { // pan
        let stereo = this.ctx.createStereoPanner();
        stereo.pan.value = options.pan; // -1 to 1
        return stereo;
      }
    };

    checkSetup() {
      if (this.mode==null&&this.interacted) { this.init(); }
      if (this.mode==null) { return; }
      if (this.loadBuffer.length>0) {
        Audio.loadBuffer.forEach(sound => {
          if (sound.options.autoplay) {
            sound.options.loop = sound.options.loop || 0;
            sound.options.volume = sound.options.volume === undefined ? 1 : sound.options.volume;
            sound.options.speed = sound.options.speed === undefined ? 1 : sound.options.speed;
            sound.options.fadeIn = sound.options.fadeIn || 0;
            sound.options.forceId = sound.options.forceId || false;
            sound.options.nodes = sound.options.nodes === undefined ? [] : sound.options.nodes;
          }
          if (Audio.mode=="AudioContext") {
            sound.audioContextInit();
          } else if (Audio.mode=="HTMLAudio") {
            sound.HTMLAudioInit();
          }
          if (sound.options.autoplay&&ChoreoGraph.AudioController.mode=="HTMLAudio") {
            ChoreoGraph.AudioController.start(sound.name, sound.options.loop, sound.options.fadeIn, sound.options.volume, sound.options.nodes, sound.options.forceId);
          }
        });
        Audio.loadBuffer = [];
      }
    };

    initContext() {
      let AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext!=undefined&&["http:","https:"].includes(location.protocol)) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.ctx.destination);
        this.mode = "AudioContext";
      } else {
        console.warn("Using HTMLAudio")
        this.mode = "HTMLAudio";
      }
    };

    update() {
      this.checkSetup();      
      if (Audio.ready==false) {
        for (let name in Audio.sounds) {
          if (Audio.sounds[name].loaded==false) { return; }
        }
        Audio.ready = true;
        for (let name in Audio.sounds) {
          let current = Audio.sounds[name];
          if (current.options.autoplay) {
            ChoreoGraph.AudioController.start(current.name, current.options.loop, current.options.fadeIn, current.options.volume, current.options.speed, current.options.forceId);
          }
        }
      }
      if (Audio.calledOnReady==false&&Audio.ready&&Audio.onReady!==null) { Audio.calledOnReady = true; Audio.onReady(); }
      if (Audio.masterVolume!=Audio.lastSeenMasterVolume) {
        if (Audio.mode=="AudioContext") {
          Audio.masterGain.gain.value = Audio.masterVolume;
        } else if (Audio.mode=="HTMLAudio") {
          for (let id in Audio.playing) {
            if (Audio.masterVolume==0) {
              Audio.playing[id].savedVolume = Audio.playing[id].source.volume;
              Audio.playing[id].source.volume = 0;
            } else {
              Audio.playing[id].source.volume = Audio.playing[id].savedVolume;
              delete Audio.playing[id].savedVolume;
            }
          }
        }
        Audio.lastSeenMasterVolume = Audio.masterVolume;
      }
      if (Audio.mode=="HTMLAudio") {
        for (let id in Audio.playing) {
          let sound = Audio.playing[id];
          if (sound.fadeEnd!=0) {
            if (ChoreoGraph.nowint<sound.fadeEnd) {
              sound.source.volume = sound.fadeFrom+(sound.fadeTo-sound.fadeFrom)*(ChoreoGraph.nowint-sound.fadeStart)/(sound.fadeEnd-sound.fadeStart);
            } else if (sound.fadeEnd!=0) {
              sound.source.volume = sound.fadeTo;
              sound.fadeEnd = 0;
            }
          }
        }
      }
      for (let id in Audio.playing) {
        let soundInstance = Audio.playing[id];
        if (soundInstance.paused!=soundInstance.lastPausedState) {
          if (soundInstance.paused) {
            if (Audio.mode=="AudioContext") {
              soundInstance.source.playbackRate.value = 0;
            } else if (Audio.mode=="HTMLAudio") {
              soundInstance.source.pause();
            }
          } else {
            if (Audio.mode=="AudioContext") {
              soundInstance.source.playbackRate.value = 1;
            } else if (Audio.mode=="HTMLAudio") {
              soundInstance.source.play();
            }
          }
        }
        soundInstance.lastPausedState = soundInstance.paused;
      }
    };
  },

  instanceConnect(cg) {
    cg.keys.sounds = [];
    cg.Audio = new ChoreoGraph.Audio.instanceObject(cg);
    ChoreoGraph.globalLoops.push(ChoreoGraph.Audio.update);
  },

  instanceStart(cg) {

  }
});