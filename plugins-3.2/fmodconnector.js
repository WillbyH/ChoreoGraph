ChoreoGraph.plugin({
  name : "FMODConnector",
  key : "FMOD",
  version : "1.2",

  globalPackage : new class FMODConnector {
    FMODReady = false;
    audioReady = false;

    FMOD = {};
    System = null;
    SystemCore = null;

    logging = false;
    use3D = false;

    #dopplerscale = 1;
    #distancefactor = 0.02;
    #rolloffscale = 0.02;
    get dopplerscale() {
      return this.#dopplerscale;
    }
    set dopplerscale(value) {
      this.#dopplerscale = value;
      ChoreoGraph.FMOD.use3D = true;
      this.errorCheck(this.SystemCore.set3DSettings(this.#dopplerscale, this.#distancefactor, this.#rolloffscale));
    }
    get distancefactor() {
      return this.#distancefactor;
    }
    set distancefactor(value) {
      this.#distancefactor = value;
      ChoreoGraph.FMOD.use3D = true;
      this.errorCheck(this.SystemCore.set3DSettings(this.#dopplerscale, this.#distancefactor, this.#rolloffscale));
    }
    get rolloffscale() {
      return this.#rolloffscale;
    }
    set rolloffscale(value) {
      this.#rolloffscale = value;
      ChoreoGraph.FMOD.use3D = true;
      this.errorCheck(this.SystemCore.set3DSettings(this.#dopplerscale, this.#distancefactor, this.#rolloffscale));
    }

    onInit = null;

    constructor() {
      document.addEventListener("pointerdown", this.documentClicked, false);
    }

    errorCheck(result, meta) {
      if (result != this.FMOD.OK) {
        console.error(this.FMOD.ErrorString(result), meta);
      }
    }

    documentClicked() {
      let cgFMOD = ChoreoGraph.FMOD;
      if (cgFMOD.SystemCore==undefined||cgFMOD.audioReady) { return; }

      cgFMOD.errorCheck(cgFMOD.SystemCore.mixerSuspend());
      cgFMOD.errorCheck(cgFMOD.SystemCore.mixerResume());

      if (cgFMOD.logging) { console.info("Reset FMOD Audio Driver"); }

      cgFMOD.audioReady = true;
    }
  },

  globalStart() {
    if (typeof FMODModule === 'undefined') {
      console.error("FMODModule is not loaded, be sure to include fmodstudio.js from fmod.com/download (HTML5), last tested with 2.03.07");
      return;
    }
    let cgFMOD = ChoreoGraph.FMOD;

    if (cgFMOD.logging) { console.info("Loading FMOD"); }
    
    if (cgFMOD.use3D) {
      cgFMOD.errorCheck(FMODp.SystemCore.set3DSettings(dopplerscale, distancefactor, rolloffscale));
    }

    FMODp.errorCheck(FMODp.System.setListenerAttributes(0, FMODp.originAttributes(), null));
    if (FMODp.logging) { console.info("3D audio enabled",dopplerscale, distancefactor, rolloffscale); }
    
    cgFMOD.FMOD.preRun = function() {
      let cgFMOD = ChoreoGraph.FMOD;
      let folderName = "/";
      let canRead = true;
      let canWrite = false;
    
      for (let bankKey in cgFMOD.banks) {
        if (cgFMOD.logging) { console.info("Preloading bank: " + bankKey); }
        cgFMOD.FMOD.FS_createPreloadedFile(folderName, cgFMOD.banks[bankKey].filename, cgFMOD.baseBankPath + cgFMOD.banks[bankKey].folderPath + cgFMOD.banks[bankKey].filename, canRead, canWrite);
      }

      if (cgFMOD.logging) { console.info("Preloaded Banks"); }
    };

    cgFMOD.FMOD['INITIAL_MEMORY'] = 64*1024*1024;

    cgFMOD.FMOD.onRuntimeInitialized = function() {
      let outval = {}; // A temporary empty object to hold fmods weird but understandable responses
      let cgFMOD = ChoreoGraph.FMOD;

      // Studio::System::create
      cgFMOD.errorCheck(cgFMOD.FMOD.Studio_System_Create(outval));
      cgFMOD.System = outval.val;

      // Studio::System::getCoreSystem
      cgFMOD.errorCheck(cgFMOD.System.getCoreSystem(outval));
      cgFMOD.SystemCore = outval.val;

      // System::setDSPBufferSize
      cgFMOD.errorCheck(cgFMOD.SystemCore.setDSPBufferSize(2048, 2));

      // 1024 virtual channels
      cgFMOD.errorCheck(cgFMOD.System.initialize(1024, cgFMOD.FMOD.STUDIO_INIT_NORMAL, cgFMOD.FMOD.INIT_NORMAL, null));

      for (let bankKey in cgFMOD.banks) {
        if (cgFMOD.banks[bankKey].autoload==false) { continue; }
        cgFMOD.banks[bankKey].load();
      }

      if (cgFMOD.onInit!=null) { cgFMOD.onInit(); }

      if (cgFMOD.logging) { console.info("Initialised FMOD"); }
    };

    FMODModule(cgFMOD.FMOD);

    this.FMODReady = true;
  }
});