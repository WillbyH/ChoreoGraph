ChoreoGraph.plugin({
  name : "Audio",
  key : "Audio",
  version : "2.2",

  globalPackage : new class ChoreoGraphAudio {
    constructor() {
      document.addEventListener("pointerdown", this.documentClicked, false);
    }
    ready = false;
    interacted = false;
    nextId = 0;

    soundLoadBuffer = [];
    instanceLoadBuffer = [];
    playBuffer = [];
    
    mode = null; // AudioContext or HTMLAudio
    ctx = null;

    onReady = null;
    calledOnReady = false;

    cache = {};

    AUDIOCONTEXT = "AudioContext";
    HTMLAUDIO = "HTMLAudio";

    instanceObject = class cgAudio {
      ready = false;
      sounds = {};
      playing = {};
      buses = {};
      masterGain = null;

      masterVolumeBuffer = 1;
      #masterVolume = 1;
      get masterVolume() { return this.#masterVolume; }
      set masterVolume(value) {
        this.#masterVolume = value;
        if (this.mode==this.AUDIOCONTEXT) {
          if (this.masterGain==null) { this.masterVolumeBuffer = value; return; }
          if (this.cg.settings.masterChangeTime==0) {
            this.masterGain.gain.value = this.#masterVolume;
          } else {
            this.masterGain.gain.linearRampToValueAtTime(this.#masterVolume, ChoreoGraph.Audio.ctx.currentTime + this.cg.settings.audio.masterChangeTime);
          }
        } else if (this.mode==this.HTMLAUDIO) {
          for (let id in this.playing) {
            if (this.#masterVolume==0) {
              this.playing[id].savedVolume = this.playing[id].source.volume;
              this.playing[id].source.volume = 0;
            } else {
              this.playing[id].source.volume = this.playing[id].savedVolume;
              delete this.playing[id].savedVolume;
            }
          }
        }
      };

      createSound(soundInit,id=ChoreoGraph.id.get()) {
        if (this.sounds[id]!=undefined) { console.warn("Sound ID already exists:",id); return; }
        let newSound = new ChoreoGraph.Audio.Sound(soundInit,id,this.cg);
        this.sounds[id] = newSound;
        this.cg.keys.sounds.push(id);
        ChoreoGraph.Audio.soundLoadBuffer.push(newSound);
        return newSound;
      };

      play(playOptionsInit) {
        let options = new ChoreoGraph.Audio.PlayOptions(playOptionsInit,this);
        this.playWithOptions(options);
      }

      playWithOptions(options) {
        let sound = this.sounds[options.id];
        if (sound==undefined) { console.warn("Sound not found:",options.id); return; }

        if ((!ChoreoGraph.Audio.ready||this.ready||!sound.loaded)&&options.allowBuffer) {
          options.allowBuffer = false;
          ChoreoGraph.Audio.playBuffer.push(options);
          return;
        }
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
          // SOURCE -> GAIN -> EFFECT NODES -> BUS GAIN -> MASTER GAIN -> DESTINATION
    
          let source = ChoreoGraph.Audio.ctx.createBufferSource();
          source.buffer = sound.audio;
          source.gainNode = ChoreoGraph.Audio.ctx.createGain();
          source.gainNode.gain.value = options.volume; // Volume
          source.loop = options.loop; // Looping
          source.playbackRate.value = options.speed; // Speed

          source.connect(source.gainNode);
    
          let lastNode = source.gainNode;
          for (let i=0;i<options.nodes.length;i++) {
            lastNode = lastNode.connect(options.nodes[i]);
          }

          if (options.bus!=null) {
            let bus = this.buses[options.bus.id];
            if (bus==undefined) {
              bus = new ChoreoGraph.Audio.Bus();
              this.buses[options.bus.id] = bus;
            }
            lastNode.connect(options.bus.gainNode);
            lastNode = options.bus.gainNode;
          };

          lastNode.connect(this.masterGain);
    
          source.start();
    
          let newSoundInstance = new ChoreoGraph.Audio.SoundInstance({id:options.soundInstanceId,source:source,nodes:options.nodes,sound:sound});
          newSoundInstance.cgAudio = this;
          if (options.fadeIn!=0) {
            source.gainNode.gain.setValueAtTime(-1, ChoreoGraph.Audio.ctx.currentTime);
            source.gainNode.gain.linearRampToValueAtTime(options.volume, ChoreoGraph.Audio.ctx.currentTime + options.fadeIn)
          }
          source.id = newSoundInstance.id;
          source.cgAudio = this;
          this.playing[newSoundInstance.id] = newSoundInstance;
          sound.instances[newSoundInstance.id] = newSoundInstance;

          newSoundInstance.applyEndListener();
          
          return newSoundInstance;
        } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          let source = sound.audio.cloneNode();
          let savedVolume = options.volume;
          source.play();
          source.loop = options.loop; // Looping
          source.volume = options.volume; // Volume
          let newSoundInstance = new ChoreoGraph.Audio.SoundInstance({id:options.soundInstanceId,source:source,nodes:options.nodes,sound:sound});
          newSoundInstance.cgAudio = this;
          if (options.fadeIn!=0) {
            source.volume = 0;
          }
          newSoundInstance.fadeFrom = 0;
          newSoundInstance.fadeTo = options.volume;
          newSoundInstance.fadeStart = ChoreoGraph.nowint;
          newSoundInstance.fadeEnd = ChoreoGraph.nowint+options.fadeIn*1000;
          if (this.#masterVolume==0) { newSoundInstance.savedVolume = savedVolume; }
          source.id = newSoundInstance.id;
          source.cgAudio = this;

          newSoundInstance.applyEndListener();

          this.playing[newSoundInstance.id] = newSoundInstance;
          sound.instances[newSoundInstance.id] = newSoundInstance;
    
          return newSoundInstance;
        }
      };

      stop(id, fadeoutSeconds=0) {
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
          if (fadeoutSeconds==0) {
            sound.source.stopped = true;
            sound.source.stop();
            delete this.playing[id];
          } else {
            sound.source.gainNode.gain.setValueAtTime(sound.source.gainNode.gain.value, ChoreoGraph.Audio.ctx.currentTime);
            sound.source.gainNode.gain.linearRampToValueAtTime(-1, ChoreoGraph.Audio.ctx.currentTime + fadeoutSeconds);
            setTimeout(function(){ sound.source.stop(); delete ChoreoGraph.Audio.playing[id]; }, fadeoutSeconds*1000);
          }
        } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          if (fadeoutSeconds==0) {
            sound.source.stopped = true;
            sound.source.pause();
            delete this.playing[id];
          } else {
            sound.fadeFrom = sound.source.volume;
            sound.fadeTo = 0;
            sound.fadeStart = ChoreoGraph.nowint;
            sound.fadeEnd = ChoreoGraph.nowint+fadeoutSeconds*1000;
            setTimeout(function(){ sound.source.pause(); delete ChoreoGraph.Audio.playing[id]; }, fadeoutSeconds*1000);
          }
        }
      };

      updateNodes(id, nodes) { // Disconnects currently connected nodes and connects new given nodes
        if (!this.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
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
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
          if (seconds==0) { sound.source.gainNode.gain.value = volume; }
          else {
            sound.source.gainNode.gain.setValueAtTime(sound.source.gainNode.gain.value, ChoreoGraph.Audio.ctx.currentTime);
            sound.source.gainNode.gain.linearRampToValueAtTime(volume, ChoreoGraph.Audio.ctx.currentTime + seconds);
          }
        } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          if (this.#masterVolume==0) { sound.savedVolume = volume; } // Save Volume When Muted
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
        if (this.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
          sound.source.playbackRate.value = speed;
        } else if (this.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          sound.source.playbackRate = speed;
        }
      };

      init() {
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
          this.masterGain = ChoreoGraph.Audio.ctx.createGain();
          this.masterGain.gain.value = this.masterVolumeBuffer;
          this.masterGain.connect(ChoreoGraph.Audio.ctx.destination);
        }
        this.ready = true;
      };
    };

    PlayOptions = class PlayOptions {
      id = null;
      loop = false;
      allowBuffer = false;
      fadeIn = 0; // Seconds
      volume = 1; // 0 - silent  1 - normal  2 - double
      speed = 1; // Multiplier
      nodes = [];
      soundInstanceId = null;
      bus = null;
      constructor(playOptionsInit={},cgAudio) {
        this.cgAudio = cgAudio;
        ChoreoGraph.applyAttributes(this,playOptionsInit);
      }
    }
    
    Sound = class cgSound {
      source = "";
      blobAudio = null;
      audio = null;
      loaded = false;
      instances = {};
      cg = null;

      constructor(soundInit,id,cg) {
        ChoreoGraph.applyAttributes(this,soundInit);
        this.id = id;
        this.cg = cg;
        this.download();
      }

      async download() {
        let split = this.source.split("/");
        let source = [];
        for (let part of split) { source.push(encodeURIComponent(part)); }
        source = source.join("/");
        if (this.cg.settings.audio.skipURIEncoding) { source = this.source; }

        let response = await fetch(this.cg.settings.audio.baseAudioPath+source);
        this.blobAudio = await response.blob();
      };

      audioContextInit = async () => {
        this.audio = await (this.blobAudio.arrayBuffer())
        .then(ArrayBuffer => ChoreoGraph.Audio.ctx.decodeAudioData(ArrayBuffer));
        this.loaded = true;
      };

      HTMLAudioInit = async () => {
        let url = URL.createObjectURL(this.blobAudio);
        let sound = this;
        this.audio = await new Promise((resolve, reject) => {
          let audio = new Audio(url);
  
          audio.addEventListener("canplaythrough", () => resolve(audio), { once: true });
          audio.addEventListener("error", () => reject(new Error(`Failed to load audio: ${url}`)), { once: true });
  
          audio.load();
        });
        this.loaded = true;
      };

      play(playOptionsInit={}) {
        playOptionsInit.id = this.id;
        let options = new ChoreoGraph.Audio.PlayOptions(playOptionsInit,this.cg.Audio);
        return this.cg.Audio.play(options);
      };
    };

    SoundInstance = class SoundInstance {
      id = null;
      source = null;
      nodes = [];
      sound = null;
      paused = false;
      lastPausedState = false;

      constructor(init={}) {
        ChoreoGraph.applyAttributes(this,init);
        if (this.id==null) { this.id = ChoreoGraph.Audio.nextId; ChoreoGraph.Audio.nextId++; }
      }
      stop(fadeoutSeconds=0) {
        this.cgAudio.stop(this.id, fadeoutSeconds);
      }
      applyEndListener() {
        this.source.addEventListener('ended', e => {
          if(!e.target.loop&&e.target.stopped!=true){
            if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
              e.target.stop();
            } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
              e.target.pause();
            }
            delete e.target.cgAudio.playing[e.target.id].sound.instances[e.target.id];
            delete e.target.cgAudio.playing[e.target.id];
          }
        },{passive: true});
      }
    };

    Bus = class Bus {
      id = null;
      gainNode = null;
      constructor() {
        this.gainNode = ChoreoGraph.Audio.ctx.createGain();
      }
    };

    documentClicked() {
      if (ChoreoGraph.Audio.ready) { return; }
      let soundSetupSource = new Audio();
      soundSetupSource.play();
      ChoreoGraph.Audio.interacted = true;
      document.removeEventListener("pointerdown", ChoreoGraph.Audio.documentClicked, false);
    };

    generateImpulseResponse(duration, decay, cache=true) {
      if (this.mode!=this.AUDIOCONTEXT) { console.warn("Impulse Response only available in AudioContext mode"); return; }
      if (this.cache["impulse_"+duration+"_"+decay]!=undefined) { return this.cache["impulse_"+duration+"_"+decay]; }
      let length = this.ctx.sampleRate * duration;
      let impulse = this.ctx.createBuffer(2,length,this.ctx.sampleRate)
      let IR = impulse.getChannelData(0)
      let IL = impulse.getChannelData(1)
      for (let i=0;i<length;i++) {
        IR[i] = (2*Math.random()-1)*Math.pow(1-i/length,decay);
        IL[i] = IR[i];
      }
      if (cache) { this.cache["impulse_"+duration+"_"+decay] = impulse; }
      return impulse;
    };

    createEffectNode(type, options) {
      if (this.ctx==null) { console.warn("AudioContext not ready"); return; }
      if (this.mode!=this.AUDIOCONTEXT) { console.warn("Nodes are only supported in AudioContext mode"); return; }
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
      if (this.mode==null&&this.interacted) { this.initContext(); }
      if (this.mode==null) { return false; }
      if (this.soundLoadBuffer.length+this.instanceLoadBuffer.length+this.playBuffer.length==0) { return true; }
      else if (this.soundLoadBuffer.length>0) {
        for (let i=0;i<this.soundLoadBuffer.length;i++) {
          let sound = this.soundLoadBuffer[i];
          if (sound.blobAudio!=null) {
            if (this.mode==this.AUDIOCONTEXT) {
              sound.audioContextInit();
            } else if (this.mode==this.HTMLAUDIO) {
              sound.HTMLAudioInit();
            }
            this.soundLoadBuffer.splice(i,1);
            i--;
          }
        }
      } else if (this.instanceLoadBuffer.length>0) {
        this.instanceLoadBuffer.forEach(cgAudio => {
          cgAudio.init();
        });
        this.instanceLoadBuffer = [];
      } else if (this.playBuffer.length>0) {
        for (let i=0;i<this.playBuffer.length;i++) {
          let options = this.playBuffer[i];
          if (options.cgAudio.ready&&options.cgAudio.ready&&options.cgAudio.sounds[options.id].loaded) {
            options.cgAudio.playWithOptions(options);
            this.playBuffer.splice(i,1);
            i--;
          }
        }
      }
      return true;
    };

    initContext() {
      let force = false;
      for (let cg of ChoreoGraph.instances) {
        if (cg.settings.audio.forceMode!==false) {
          force = cg.settings.audio.forceMode;
          break;
        }
      }
      let AudioContext = window.AudioContext || window.webkitAudioContext;
      if ((AudioContext!=undefined&&["http:","https:"].includes(location.protocol)&&force!=this.HTMLAUDIO)||force==this.AUDIOCONTEXT) {
        this.ctx = new AudioContext();
        this.mode = this.AUDIOCONTEXT;
      } else {
        console.warn("Using HTMLAudio")
        this.mode = this.HTMLAUDIO;
      }
    };

    update() {
      if (!ChoreoGraph.Audio.checkSetup()) { return; };
      if (Audio.calledOnReady==false&&Audio.ready&&Audio.onReady!==null) { Audio.calledOnReady = true; Audio.onReady(); }
      if (Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
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
      };
      for (let id in Audio.playing) {
        let soundInstance = Audio.playing[id];
        if (soundInstance.paused!=soundInstance.lastPausedState) {
          if (soundInstance.paused) {
            if (Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
              soundInstance.source.playbackRate.value = 0;
            } else if (Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
              soundInstance.source.pause();
            }
          } else {
            if (Audio.mode==ChoreoGraph.Audio.AUDIOCONTEXT) {
              soundInstance.source.playbackRate.value = 1;
            } else if (Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
              soundInstance.source.play();
            }
          }
        }
        soundInstance.lastPausedState = soundInstance.paused;
      };
    };
  },

  instanceConnect(cg) {
    cg.attachSettings("audio",{
      baseAudioPath : "audio/",
      forceMode : false, // false, "AudioContext", "HTMLAudio"
      skipURIEncoding : false,
      masterChangeTime : 0.3
    });
    cg.keys.sounds = [];
    cg.Audio = new ChoreoGraph.Audio.instanceObject(cg);
    cg.Audio.cg = cg;
    ChoreoGraph.globalLoops.push(ChoreoGraph.Audio.update);
    ChoreoGraph.Audio.instanceLoadBuffer.push(cg.Audio);
  }
});