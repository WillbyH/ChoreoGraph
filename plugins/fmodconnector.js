ChoreoGraph.plugin({
  name: "FMODConnector",
  key: "FMODConnector",
  version: "1.1",
  f: new class FMODConnector {
    ready = false;
    audioReady = false;

    baseBankPath = "";
    banks = {};
    logging = false; // If the plugin should fill the console with information

    listeners = 0; // Count of listeners
    using3D = false;

    onInit = null; // Callback that runs once everything is fully ready and initialised

    constructor() {
      document.addEventListener("mousedown", this.documentPressed, false);
      document.addEventListener("touchstart", this.documentPressed, false);

      this.FMOD = {}; // The main FMOD object
      this.System;
      this.SystemCore;

      this.setUp();
    }
    documentPressed() {
      let FMODp = ChoreoGraph.FMODConnector;
      if (FMODp.SystemCore==undefined||FMODp.audioReady) { return; }

      // Reset audio driver
      FMODp.errorCheck(FMODp.SystemCore.mixerSuspend());
      FMODp.errorCheck(FMODp.SystemCore.mixerResume());

      FMODp.audioReady = true;
    }
    errorCheck(result, meta) {
      if (result != this.FMOD.OK) {
        console.error(this.FMOD.ErrorString(result), meta);
      }
    }
    registerBank(key, folderPath, filename, autoload = false) {
      this.banks[key] = new class FMODBank {
        loaded = false;

        bank = null;
        events = null;
        buses = null;
        VCAs = null;
        userData = null;
        constructor() {
          this.key = key,
          this.folderPath = folderPath,
          this.filename = filename,
          this.autoload = autoload,
          this.FMODp = ChoreoGraph.FMODConnector;
        }
        load() { // Loads the bank file data into memory
          if (this.loaded) { return false; }
          if (this.FMODp.logging) { console.info("Loading bank: " + this.key); }
          let bankHandle = {};
          console.log(this.filename, this.FMODp.FMOD.STUDIO_LOAD_BANK_NORMAL, bankHandle)
          this.FMODp.errorCheck(this.FMODp.System.loadBankFile(this.filename, this.FMODp.FMOD.STUDIO_LOAD_BANK_NORMAL, bankHandle));
          this.bank = bankHandle.val;
          this.loaded = true;

          this.events = this.listEvents();
          this.buses = this.listBuses();
          this.VCAs = this.listVCAs();

          let userData = {};
          this.bank.getUserData(userData);
          this.userData = userData.val;
        }
        unload() { // Unloads the bank file data from memory
          if (!this.loaded) { return false; }
          if (this.FMODp.logging) { console.info("Unloading bank: " + this.key); }
        }
        listEvents() { // Returns a list of event descriptions in the bank
          let bankEvents = {};
          let intenselyHighArrayCapacity = 1000000;
          this.FMODp.errorCheck(this.bank.getEventList(bankEvents, intenselyHighArrayCapacity, 0), this.bank);
          bankEvents = bankEvents.val;
          return this.createBankDataDictionary(bankEvents, "event");
        }
        listBuses() { // Returns a list of buses in the bank
          let bankBuses = {};
          let intenselyHighArrayCapacity = 1000000;
          this.FMODp.errorCheck(this.bank.getBusList(bankBuses, intenselyHighArrayCapacity, 0), this.bank);
          bankBuses = bankBuses.val;
          return this.createBankDataDictionary(bankBuses, "bus");
        }
        listVCAs() { // Returns a list of VCAs in the bank
          let bankVCAs = {};
          let intenselyHighArrayCapacity = 1000000;
          this.FMODp.errorCheck(this.bank.getVCAList(bankVCAs, intenselyHighArrayCapacity, 0), this.bank);
          bankVCAs = bankVCAs.val;
          return this.createBankDataDictionary(bankVCAs, "VCA");
        }
        createBankDataDictionary(objects, typeKey) {
          let dict = {};
          for (let j = 0; j < objects.length; j++) {
            let object = objects[j];
            let path = {};
            this.FMODp.errorCheck(object.getPath(path, 256, 0), object);
            let pathString = path.val;
            let entry = {
              path: pathString,
            };
            entry[typeKey] = object;
            dict[pathString] = entry;
          }
          return dict;
        }
      };
    }
    setUp() {
      if (typeof FMODModule === 'undefined') {
        console.error("FMODModule is not loaded");
        return;
      }
      if (this.logging) { console.info("Setting up FMOD"); }
      this.FMOD.preRun = function() {
        let FMODp = ChoreoGraph.FMODConnector;
        let folderName = "/";
        let canRead = true;
        let canWrite = false;
      
        for (let bankKey in FMODp.banks) {
          if (FMODp.logging) { console.info("Preloading bank: " + bankKey); }
          FMODp.FMOD.FS_createPreloadedFile(folderName, FMODp.banks[bankKey].filename, FMODp.baseBankPath + FMODp.banks[bankKey].folderPath + FMODp.banks[bankKey].filename, canRead, canWrite);
        }
      };
      this.FMOD['INITIAL_MEMORY'] = 64*1024*1024;

      this.FMOD.onRuntimeInitialized = function() {
        let outval = {}; // A temporary empty object to hold fmods weird but understandable responses
        let FMODp = ChoreoGraph.FMODConnector;

        // Studio::System::create
        FMODp.errorCheck(FMODp.FMOD.Studio_System_Create(outval));
        FMODp.System = outval.val;

        // Studio::System::getCoreSystem
        FMODp.errorCheck(FMODp.System.getCoreSystem(outval));
        FMODp.SystemCore = outval.val;

        // System::setDSPBufferSize
        FMODp.errorCheck(FMODp.SystemCore.setDSPBufferSize(2048, 2));

        // 1024 virtual channels
        FMODp.errorCheck(FMODp.System.initialize(1024, FMODp.FMOD.STUDIO_INIT_NORMAL, FMODp.FMOD.INIT_NORMAL, null));

        for (let bankKey in FMODp.banks) {
          if (FMODp.banks[bankKey].autoload==false) { continue; }
          FMODp.banks[bankKey].load();
        }

        if (FMODp.onInit!=null) { FMODp.onInit(); }
      }

      FMODModule(this.FMOD);

      this.ready = true;
    }
    createEventInstance(eventPath,start=false) {
      let FMODp = ChoreoGraph.FMODConnector;
      if (!FMODp.ready||FMODp.System==undefined) { console.warn("FMOD not ready."); return false; }
      let eventDescription = {};
      this.errorCheck(this.System.getEvent(eventPath, eventDescription), eventPath);
    
      let eventInstance = {};
      this.errorCheck(eventDescription.val.createInstance(eventInstance), eventPath);
      if (start) {
        this.errorCheck(eventInstance.val.start(), eventPath);
      }
      eventInstance = eventInstance.val;
      FMODp.errorCheck(eventInstance.set3DAttributes(FMODp.originAttributes()));

      return eventInstance;
    }
    getEventParameters(eventPath) {
      let FMODp = ChoreoGraph.FMODConnector;
      if (!FMODp.ready||FMODp.System==undefined) { console.warn("FMOD not ready."); return false; }
      let eventDescription = {};
      this.errorCheck(this.System.getEvent(eventPath, eventDescription));
      eventDescription = eventDescription.val;

      let count = {};
      eventDescription.getParameterDescriptionCount(count);
      count = count.val;

      let parameters = [];
      for (let i=0;i<count;i++) {
        let parameter = {};
        eventDescription.getParameterDescriptionByIndex(i, parameter);
        parameters.push(parameter);
      }
      return parameters
    }
    FMOD3DAttributes(attributes, object, lastPosition) {
      attributes.forward.x = 0; attributes.forward.y = -1; attributes.forward.z = 0;
      attributes.up.x = 0; attributes.up.y = 0; attributes.up.z = 1;
      attributes.position.x = object.Transform.x;
      attributes.position.y = object.Transform.y;
      attributes.position.z = 0;
      attributes.velocity.x = (object.Transform.x - lastPosition[0])*(ChoreoGraph.timeDelta/1000);
      attributes.velocity.y = (object.Transform.y - lastPosition[1])*(ChoreoGraph.timeDelta/1000);
      attributes.velocity.z = 0;
    }
    async setup3D(dopplerscale=1, distancefactor=0.02, rolloffscale=0.02) {
      let FMODp = ChoreoGraph.FMODConnector;
      FMODp.using3D = true;
      while (!FMODp.ready||FMODp.SystemCore==undefined) { await new Promise(r => setTimeout(r, 100)); }
      FMODp.errorCheck(FMODp.SystemCore.set3DSettings(dopplerscale, distancefactor, rolloffscale));

      FMODp.errorCheck(FMODp.System.setListenerAttributes(0, FMODp.originAttributes(), null));
      if (FMODp.logging) { console.log("3D audio enabled",dopplerscale, distancefactor, rolloffscale); }
    }
    originAttributes() {
      let attributes = this.FMOD._3D_ATTRIBUTES();
      attributes.forward.x = 0; attributes.forward.y = -1; attributes.forward.z = 0;
      attributes.up.x = 0; attributes.up.y = 0; attributes.up.z = 1;
      attributes.position.x = 0; attributes.position.y = 0; attributes.position.z = 0;
      attributes.velocity.x = 0; attributes.velocity.y = 0; attributes.velocity.z = 0;
      return  attributes;
    }
  },
  externalMainLoops: [function() {
    let FMODp = ChoreoGraph.FMODConnector;
    if (!FMODp.ready||FMODp.System==undefined) { return; }
    FMODp.errorCheck(FMODp.System.update());
  }]
});
ChoreoGraph.FMODConnector = ChoreoGraph.plugins.FMODConnector.f;
ChoreoGraph.ObjectComponents.FMODListener = class FMODListener {
  manifest = {
    title : "FMODListener",
    master : true,
    keyOverride : "",
    update : true
  }

  constructor(componentInit, object) {
    let FMODp = ChoreoGraph.FMODConnector;
    this.listenerId = FMODp.listeners;
    FMODp.listeners++;

    this.lastPosition = [object.Transform.x,object.Transform.y];
    ChoreoGraph.initObjectComponent(this, componentInit);
  }
  update(object) {
    let FMODp = ChoreoGraph.FMODConnector;
    if (!FMODp.ready||FMODp.SystemCore==undefined) { return; }
    let attributes = FMODp.FMOD._3D_ATTRIBUTES();
    FMODp.FMOD3DAttributes(attributes, object, this.lastPosition);

    this.lastPosition = [object.Transform.x,object.Transform.y];

    FMODp.errorCheck(FMODp.System.setListenerAttributes(0, attributes, null));
  }
}
ChoreoGraph.ObjectComponents.FMODSource = class FMODSource {
  manifest = {
    title : "FMODSource",
    master : true,
    keyOverride : "",
    update : true
  }

  events = [];

  constructor(componentInit, object) {
    this.lastPosition = [object.Transform.x,object.Transform.y];
    ChoreoGraph.initObjectComponent(this, componentInit);
  }
  update(object) {
    let FMODp = ChoreoGraph.FMODConnector;
    if (!FMODp.ready||FMODp.System==undefined) { return; }
    let attributes = FMODp.FMOD._3D_ATTRIBUTES();
    FMODp.FMOD3DAttributes(attributes, object, this.lastPosition);
    this.lastPosition = [object.Transform.x,object.Transform.y];
    for (let eventInstance of this.events) {
      FMODp.errorCheck(eventInstance.set3DAttributes(attributes));
    }
  }
}
// Willby - 2024