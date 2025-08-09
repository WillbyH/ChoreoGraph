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
    busLoadBuffer = [];
    playBuffer = [];

    mode = null; // WebAudio or HTMLAudio
    ctx = null;

    _onReadys = [];
    set onReady(callback) {
      if (this.ready) { callback(); return; }
      this._onReadys.push(callback);
    }
    hasCalledOnReady = false;

    cache = {};

    warnAboutHTMLAudio = true;

    WEBAUDIO = "WebAudio";
    HTMLAUDIO = "HTMLAudio";

    InstanceObject = class cgAudio {
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
        if (ChoreoGraph.Audio.mode==null) { this.masterVolumeBuffer = value; return; }
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO&&this.masterGain!=null) {
          if (this.cg.settings.audio.masterChangeTime==0) {
            this.masterGain.gain.value = this.#masterVolume;
          } else {
            const now = ChoreoGraph.Audio.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(this.#masterVolume, now + this.cg.settings.audio.masterChangeTime);
          }
        } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          for (let id in this.playing) {
            if (this.#masterVolume==0) {
              this.playing[id].savedVolume = this.playing[id].source.volume;
              this.playing[id].source.volume = 0;
            } else if (this.playing[id].savedVolume !== undefined) {
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
        return this.playWithOptions(options);
      }

      playWithOptions(options) {
        let sound = this.sounds[options.id];
        if (sound==undefined) { console.warn("Sound not found:",options.id); return; }

        options.soundInstance = new ChoreoGraph.Audio.SoundInstance({
          id:options.soundInstanceId,
          nodes:options.nodes,
          sound:sound,
          paused:options.paused,
          cgAudio:this,
          playOptions:options
        });

        if (this.playing[options.soundInstance.id]!=undefined&&this.playing[options.soundInstance.id].started) {
          this.playing[options.soundInstance.id].stop();
        }

        this.playing[options.soundInstance.id] = options.soundInstance;
        sound.instances[options.soundInstance.id] = options.soundInstance;

        if ((!ChoreoGraph.Audio.ready||this.ready||!sound.loaded)&&options.allowBuffer) {
          options.allowBuffer = false;
          ChoreoGraph.Audio.playBuffer.push(options);
          return options.soundInstance;
        }
        options.soundInstance.started = true;
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
          // SOURCE -> GAIN -> EFFECT NODES -> BUS GAIN -> MASTER GAIN -> DESTINATION

          let source = ChoreoGraph.Audio.ctx.createBufferSource();
          source.buffer = sound.audio;
          source.gainNode = ChoreoGraph.Audio.ctx.createGain();
          source.gainNode.gain.value = options.volume; // Volume
          // Looping
          source.loop = options.loop;
          if (options.loopStart!==0) { source.loopStart = options.loopStart; }
          if (options.loopEnd!==0) { source.loopEnd = options.loopEnd; }
          source.playbackRate.value = options.speed; // Speed

          if (options.onCreateSource!=null) { options.onCreateSource(source, options); }

          source.connect(source.gainNode);

          let lastNode = source.gainNode;
          for (let i=0;i<options.nodes.length;i++) {
            lastNode = lastNode.connect(options.nodes[i]);
          }

          if (options.bus!=null) {
            let bus = this.buses[options.bus];
            if (bus==undefined) {
              bus = new ChoreoGraph.Audio.Bus(options.bus, this.cg);
              this.buses[options.bus] = bus;
            }
            lastNode.connect(bus.gainNode);
            lastNode = bus.gainNode;
          };

          lastNode.connect(this.masterGain);

          source.start();

          options.soundInstance.source = source;
          if (options.fadeIn!=0) {
            source.gainNode.gain.setValueAtTime(0, ChoreoGraph.Audio.ctx.currentTime);
            source.gainNode.gain.linearRampToValueAtTime(options.volume, ChoreoGraph.Audio.ctx.currentTime + options.fadeIn)
          }
          source.id = options.soundInstance.id;
          source.cgAudio = this;

          if (options.paused) {
            source.gainNode.gain.cancelScheduledValues(ChoreoGraph.Audio.ctx.currentTime);
            source.gainNode.gain.setValueAtTime(0, ChoreoGraph.Audio.ctx.currentTime);
            options.soundInstance.lastPausedState = true;
          }

          options.soundInstance.applyEndListener();

          return options.soundInstance;
        } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          let source = sound.audio.cloneNode();
          if (!options.paused) { source.play(); }
          source.loop = options.loop; // Looping
          source.volume = options.volume; // Volume
          options.soundInstance.source = source;
          if (options.fadeIn!=0) {
            source.volume = 0;
          }
          options.soundInstance.fadeFrom = 0;
          options.soundInstance.fadeTo = options.volume;
          options.soundInstance.fadeStart = ChoreoGraph.nowint;
          options.soundInstance.fadeEnd = ChoreoGraph.nowint+options.fadeIn*1000;
          if (this.#masterVolume==0) {
            options.soundInstance.savedVolume = options.volume;
            source.volume = 0;
          }
          source.id = options.soundInstance.id;
          source.cgAudio = this;

          options.soundInstance.applyEndListener();

          return options.soundInstance;
        }
      };

      stop(id, fadeoutSeconds=0) {
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];

        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
          if (fadeoutSeconds==0) {
            sound.source.stopped = true;
            sound.source.stop();
            delete this.playing[id];
          } else {
            sound.source.gainNode.gain.setValueAtTime(sound.source.gainNode.gain.value, ChoreoGraph.Audio.ctx.currentTime);
            sound.source.gainNode.gain.linearRampToValueAtTime(0, ChoreoGraph.Audio.ctx.currentTime + fadeoutSeconds);
            let cg = sound.cgAudio.cg;
            if (fadeoutSeconds===0) {
              sound.source.stop();
              delete cg.Audio.playing[id];
            } else {
              sound.stopTime = ChoreoGraph.Audio.ctx.currentTime + fadeoutSeconds;
            }
          }
        } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          if (fadeoutSeconds===0) {
            sound.source.stopped = true;
            sound.source.pause();
            delete this.playing[id];
          } else {
            sound.fadeFrom = sound.source.volume;
            sound.fadeTo = 0;
            sound.fadeStart = ChoreoGraph.nowint;
            sound.fadeEnd = ChoreoGraph.nowint+fadeoutSeconds*1000;
            sound.stopTime = ChoreoGraph.nowint + fadeoutSeconds*1000;
          }
        }
      };

      updateNodes(id, nodes) { // Disconnects currently connected nodes and connects new given nodes
        if (!this.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
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

      setVolume(id, volume=1, seconds=0) {
        if (!this.ready) { return; }
        if (this.playing[id]==undefined) { console.warn("Sound not found"); return; }
        let sound = this.playing[id];
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
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
        if (this.mode==ChoreoGraph.Audio.WEBAUDIO) {
          sound.source.playbackRate.value = speed;
        } else if (this.mode==ChoreoGraph.Audio.HTMLAUDIO) {
          sound.source.playbackRate = speed;
        }
      };

      init() {
        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
          this.masterGain = ChoreoGraph.Audio.ctx.createGain();
          this.masterGain.gain.value = this.masterVolumeBuffer;
          this.masterGain.connect(ChoreoGraph.Audio.ctx.destination);
        }
        this.ready = true;
      };

      declareBus(id) {
        if (this.buses[id]!=undefined) { console.warn("Bus ID already exists:",id); return; }
        let bus = new ChoreoGraph.Audio.Bus(id,this.cg);
        this.buses[id] = bus;
        ChoreoGraph.Audio.busLoadBuffer.push(bus);
        return bus;
      };

      beep(options={}) {
        if (!this.ready) { return; }

        if (options.frequency===undefined) { options.frequency = 440; }
        if (options.duration===undefined) { options.duration = 0.1; }
        if (options.type===undefined) { options.type = "sine"; }
        if (options.volume===undefined) { options.volume = 0.8; }

        const currentTime = ChoreoGraph.Audio.ctx.currentTime;
        const beep = {};
        let out;

        if (options.type==="noise") {
          beep.bufferSource = ChoreoGraph.Audio.ctx.createBufferSource();
          beep.bufferSource.buffer = ChoreoGraph.Audio.ctx.createBuffer(1, ChoreoGraph.Audio.ctx.sampleRate * options.duration, ChoreoGraph.Audio.ctx.sampleRate);
          const channelData = beep.bufferSource.buffer.getChannelData(0);
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] = Math.random() * 2 - 1;
          }
          beep.bufferSource.loop = false;

          out = beep.bufferSource;
        } else {
          beep.osc = ChoreoGraph.Audio.ctx.createOscillator();
          beep.osc.type = options.type;
          beep.osc.frequency.value = options.frequency;
          if (options.endFrequency!==undefined) {
            beep.osc.frequency.setValueAtTime(options.frequency, currentTime);
            beep.osc.frequency.exponentialRampToValueAtTime(options.endFrequency+0.000000001, currentTime + options.duration);
          }
          out = beep.osc;
        }

        if (options.biquadType!==undefined) {
          beep.biquadFilter = ChoreoGraph.Audio.ctx.createBiquadFilter();
          beep.biquadFilter.type = options.biquadType;
          if (options.biquadFrequency===undefined) { options.biquadFrequency = options.frequency; }
          beep.biquadFilter.frequency.value = options.biquadFrequency;
          if (options.biquadQ!==undefined) { beep.biquadFilter.Q.value = options.biquadQ; }
          if (options.biquadGain!==undefined) { beep.biquadFilter.gain.value = options.biquadGain; }
          if (options.biquadDetune!==undefined) { beep.biquadFilter.detune.value = options.biquadDetune; }
          out.connect(beep.biquadFilter);
          out = beep.biquadFilter;
        }

        beep.gainNode = ChoreoGraph.Audio.ctx.createGain();
        out.connect(beep.gainNode);
        beep.gainNode.gain.value = options.volume;
        beep.gainNode.gain.cancelScheduledValues(currentTime);
        if (options.attack!==undefined) {
          beep.gainNode.gain.setValueAtTime(0, currentTime);
          beep.gainNode.gain.linearRampToValueAtTime(options.volume, currentTime + options.attack);
        }
        if (options.decay!==undefined) {
          beep.gainNode.gain.setValueAtTime(options.volume, currentTime + options.duration - options.decay);
          beep.gainNode.gain.linearRampToValueAtTime(0, currentTime + options.duration);
        }
        out = beep.gainNode;

        if (options.bus!==undefined) {
          let bus = this.buses[options.bus];
          if (bus==undefined) {
            bus = new ChoreoGraph.Audio.Bus(options.bus, this.cg);
            this.buses[options.bus] = bus;
          }
          out.connect(bus.gainNode);
        } else {
          out.connect(this.masterGain);
        }

        if (options.type==="noise") {
          beep.bufferSource.start();
          beep.bufferSource.stop(currentTime + options.duration);
          beep.bufferSource.onended = () => {
            beep.bufferSource.disconnect();
            if (beep.biquadFilter) beep.biquadFilter.disconnect();
            beep.gainNode.disconnect();
          };
        } else {
          beep.osc.start();
          beep.osc.stop(currentTime + options.duration);
          beep.osc.onended = () => {
            beep.osc.disconnect();
            if (beep.biquadFilter) beep.biquadFilter.disconnect();
            beep.gainNode.disconnect();
          };
        }
        return beep;
      }
    };

    PlayOptions = class PlayOptions {
      id = null;
      loop = false;
      loopStart = 0;
      loopEnd = 0;
      allowBuffer = false;
      fadeIn = 0; // Seconds
      volume = 1; // 0 - silent  1 - normal  2 - double
      speed = 1; // Multiplier
      paused = false;
      nodes = [];
      soundInstanceId = null;
      bus = null;
      onCreateSource = null; // Callback when source is created
      constructor(playOptionsInit={},cgAudio) {
        this.cgAudio = cgAudio;
        ChoreoGraph.applyAttributes(this,playOptionsInit);
      }
    }

    Sound = class cgSound {
      source = "";
      blobAudio = null;
      audio = null;
      downloaded = false;
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
        this.downloaded = true;
      };

      audioContextInit = async () => {
        this.audio = await (this.blobAudio.arrayBuffer())
        .then(ArrayBuffer => ChoreoGraph.Audio.ctx.decodeAudioData(ArrayBuffer));
        this.loaded = true;
      };

      HTMLAudioInit = async () => {
        let url = URL.createObjectURL(this.blobAudio);
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

      delete() {
        ChoreoGraph.id.release(this.id);
        this.cg.keys.sounds = this.cg.keys.sounds.filter(id => id !== this.id);
        delete this.cg.Audio.sounds[this.id];
      };
    };

    SoundInstance = class cgSoundInstance {
      id = null;
      source = null;
      nodes = [];
      sound = null;
      paused = false;
      started = false;
      lastPausedState = false;

      stopTime = Infinity;
      stopped = false;
      cgAudio = null;

      fadeFrom = 0;
      fadeTo = 0;
      fadeStart = 0;
      fadeEnd = 0;

      constructor(init={}) {
        ChoreoGraph.applyAttributes(this,init);
        if (this.id==null) { this.id = ChoreoGraph.Audio.nextId; ChoreoGraph.Audio.nextId++; }
      }
      stop(fadeoutSeconds=0) {
        this.stopped = true;
        if (ChoreoGraph.Audio.playBuffer.includes(this.playOptions)) {
          ChoreoGraph.Audio.playBuffer.splice(ChoreoGraph.Audio.playBuffer.indexOf(this.playOptions), 1);
        } else {
          this.cgAudio.stop(this.id, fadeoutSeconds);
        }
      }
      pause() {
        this.paused = true;
        this.savedPausedVolume = this.source.gainNode.gain.value;
        const now = ChoreoGraph.Audio.ctx.currentTime;
        this.source.gainNode.gain.cancelScheduledValues(now);
        this.source.gainNode.gain.setValueAtTime(this.source.gainNode.gain.value, now);
        this.source.gainNode.gain.linearRampToValueAtTime(0, now + cg.settings.audio.pauseFadeTime);
        this.source.playbackRate.setValueAtTime(0, now + cg.settings.audio.pauseFadeTime);
      }
      applyEndListener() {
        this.source.addEventListener('ended', e => {
          if(!e.target.loop&&e.target.stopped!=true){
            if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
              e.target.stop();
            } else if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
              e.target.pause();
            }
            if (e.target.cgAudio.playing[e.target.id]==undefined) { return; }
            delete e.target.cgAudio.playing[e.target.id].sound.instances[e.target.id];
            delete e.target.cgAudio.playing[e.target.id];
          }
        },{passive: true});
      }
      fadeVolume(volume=0.5, time=1) {
        if (ChoreoGraph.Audio.mode===ChoreoGraph.Audio.HTMLAUDIO) {
          this.fadeFrom = this.source.volume;
          this.fadeTo = volume;
          this.fadeStart = ChoreoGraph.nowint;
          this.fadeEnd = ChoreoGraph.nowint + time * 1000;
        } else if (ChoreoGraph.Audio.mode===ChoreoGraph.Audio.WEBAUDIO) {
          if (this.started==false) {
            this.playOptions.volume = volume;
            return;
          }
          const now = ChoreoGraph.Audio.ctx.currentTime;
          this.source.gainNode.gain.cancelScheduledValues(now);
          this.source.gainNode.gain.setValueAtTime(this.source.gainNode.gain.value, now);
          this.source.gainNode.gain.linearRampToValueAtTime(volume, now + time);
        }
      }
    };

    Bus = class Bus {
      id = null;
      gainNode = null;

      #volume = 1;

      get volume() { return this.#volume; }
      set volume(value) {
        this.#volume = value;
        if (this.gainNode!=null) { this.gainNode.gain.value = value; }
      };

      constructor(id,cg) {
        this.id = id;
        this.cg = cg;

        if (ChoreoGraph.Audio.mode==ChoreoGraph.Audio.WEBAUDIO) {
          this.gainNode = ChoreoGraph.Audio.ctx.createGain();
          this.gainNode.connect(this.cg.Audio.masterGain);
        }
      }
    };

    documentClicked() {
      if (ChoreoGraph.Audio.ready) { return; }
      let soundSetupSource = new Audio();
      soundSetupSource.play();
      ChoreoGraph.Audio.interacted = true;
      document.removeEventListener("pointerdown", ChoreoGraph.Audio.documentClicked, false);
      ChoreoGraph.Audio.ready = true;
    };

    generateImpulseResponse(duration, decay, cache=true) {
      if (this.mode!=this.WEBAUDIO) { console.warn("Impulse Response only available in WebAudio mode"); return; }
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
      if (this.mode!=this.WEBAUDIO) { console.warn("Nodes are only supported in WebAudio mode"); return; }
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
      if (this.soundLoadBuffer.length+this.instanceLoadBuffer.length+this.playBuffer.length+this.busLoadBuffer.length==0) { return true; }
      else if (this.soundLoadBuffer.length>0) {
        for (let i=0;i<this.soundLoadBuffer.length;i++) {
          let sound = this.soundLoadBuffer[i];
          if (sound.blobAudio!=null) {
            if (this.mode==this.WEBAUDIO) {
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
      } else if (this.busLoadBuffer.length>0) {
        if (this.mode==this.WEBAUDIO) {
          for (let i=0;i<this.busLoadBuffer.length;i++) {
            let bus = this.busLoadBuffer[i];
            if (bus.gainNode==null) {
              bus.gainNode = ChoreoGraph.Audio.ctx.createGain();
              bus.gainNode.connect(bus.cg.Audio.masterGain);
            }
            this.busLoadBuffer.splice(i,1);
            i--;
          }
        } else {
          this.busLoadBuffer.length = 0;
        }
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

    soundLoadCheck(cg) {
      let pass = true;
      let count = 0;
      let total = cg.keys.sounds.length;
      for (let soundId of cg.keys.sounds) {
        let sound = cg.Audio.sounds[soundId];
        if (sound.downloaded) {
          count++;
        } else {
          pass = false;
        }
      }
      return ["sounds",pass,count,total];
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
      if ((AudioContext!=undefined&&["http:","https:"].includes(location.protocol)&&force!=this.HTMLAUDIO)||force==this.WEBAUDIO) {
        this.ctx = new AudioContext();
        this.mode = this.WEBAUDIO;
      } else {
        if (ChoreoGraph.Audio.warnAboutHTMLAudio) {
          console.warn("Using HTMLAudio");
        }
        this.mode = this.HTMLAUDIO;
      }
    };

    update() {
      let Audio = ChoreoGraph.Audio;
      if (!Audio.checkSetup()) { return; };
      if (Audio.hasCalledOnReady==false&&Audio.ready) {
        Audio.hasCalledOnReady = true;
        for (let callback of Audio._onReadys) {
          callback();
        }
      }

      // HTML Audio Volume Fade
      if (Audio.mode==Audio.HTMLAUDIO) {
        for (let cg of ChoreoGraph.instances) {
          for (let id in cg.Audio.playing) {
            let soundInstance = cg.Audio.playing[id];
            if (soundInstance.fadeEnd!=0) {
              if (ChoreoGraph.nowint<soundInstance.fadeEnd) {
                const volume = soundInstance.fadeFrom+(soundInstance.fadeTo-soundInstance.fadeFrom)*(ChoreoGraph.nowint-soundInstance.fadeStart)/(soundInstance.fadeEnd-soundInstance.fadeStart);
                soundInstance.source.volume = volume;
              } else if (soundInstance.fadeEnd!=0) {
                soundInstance.source.volume = soundInstance.fadeTo;
                soundInstance.fadeEnd = 0;
              }
            }
          }
        }
      };
      for (let cg of ChoreoGraph.instances) {
        for (let id in cg.Audio.playing) {
          let soundInstance = cg.Audio.playing[id];
          if (!soundInstance.started) { continue; }

          // PAUSING
          if (soundInstance.paused!=soundInstance.lastPausedState) {
            if (soundInstance.paused) {
              if (Audio.mode==Audio.WEBAUDIO) {
                soundInstance.pause();
              } else if (Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
                soundInstance.source.pause();
              }
            } else {
              if (Audio.mode==Audio.WEBAUDIO) {
                soundInstance.source.playbackRate.value = 1;

                const now = ChoreoGraph.Audio.ctx.currentTime;
                soundInstance.source.gainNode.gain.cancelScheduledValues(now);
                soundInstance.source.gainNode.gain.setValueAtTime(soundInstance.source.gainNode.gain.value, now);
                soundInstance.source.gainNode.gain.linearRampToValueAtTime(soundInstance.savedPausedVolume || 1, now + cg.settings.audio.pauseFadeTime);
              } else if (Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
                soundInstance.source.play();
              }
            }
          }
          soundInstance.lastPausedState = soundInstance.paused;

          // STOP AUDIO AFTER FADE OUT DELAYS
          if (Audio.mode==Audio.WEBAUDIO) {
            if (soundInstance.stopTime<ChoreoGraph.Audio.ctx.currentTime) {
              soundInstance.source.stop();
              delete cg.Audio.playing[id];
            }
          } else if (Audio.mode==ChoreoGraph.Audio.HTMLAUDIO) {
            if (soundInstance.stopTime<ChoreoGraph.nowint) {
              soundInstance.source.pause();
              delete cg.Audio.playing[id];
            }
          }
        };
      }
    };
  },

  instanceConnect(cg) {
    cg.attachSettings("audio",{
      baseAudioPath : "",
      forceMode : false, // false, "WebAudio", "HTMLAudio"
      skipURIEncoding : false,
      masterChangeTime : 0.1,
      pauseFadeTime : 0.1
    });
    cg.loadChecks.push(ChoreoGraph.Audio.soundLoadCheck);
    cg.keys.sounds = [];
    cg.Audio = new ChoreoGraph.Audio.InstanceObject(cg);
    cg.Audio.cg = cg;
    ChoreoGraph.globalBeforeLoops.push(ChoreoGraph.Audio.update);
    ChoreoGraph.Audio.instanceLoadBuffer.push(cg.Audio);
  }
});