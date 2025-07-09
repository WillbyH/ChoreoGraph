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

    banks = {};
    listenerCount = 0;

    baseBankPath = "";
    logging = false;
    pauseOnVisibilityChange = true;
    use3D = false;

    #dopplerScale = 1;
    #distanceFactor = 0.02;
    #rolloffScale = 0.02;
    get dopplerScale() {
      return this.#dopplerScale;
    }
    set dopplerScale(value) {
      this.#dopplerScale = value;
      ChoreoGraph.FMOD.use3D = true;
      this.errorCheck(this.SystemCore.set3DSettings(this.#dopplerScale, this.#distanceFactor, this.#rolloffScale));
    }
    get distanceFactor() {
      return this.#distanceFactor;
    }
    set distanceFactor(value) {
      this.#distanceFactor = value;
      ChoreoGraph.FMOD.use3D = true;
      this.errorCheck(this.SystemCore.set3DSettings(this.#dopplerScale, this.#distanceFactor, this.#rolloffScale));
    }
    get rolloffScale() {
      return this.#rolloffScale;
    }
    set rolloffScale(value) {
      this.#rolloffScale = value;
      ChoreoGraph.FMOD.use3D = true;
      this.errorCheck(this.SystemCore.set3DSettings(this.#dopplerScale, this.#distanceFactor, this.#rolloffScale));
    }

    onInit = null;

    constructor() {
      document.addEventListener("pointerdown", this.documentClicked, false);
    };

    errorCheck(result, meta) {
      if (result != this.FMOD.OK) {
        console.error(this.FMOD.ErrorString(result), meta);
      }
    };

    documentClicked() {
      let cgFMOD = ChoreoGraph.FMOD;
      if (cgFMOD.SystemCore==undefined||cgFMOD.audioReady) { return; }

      cgFMOD.errorCheck(cgFMOD.SystemCore.mixerSuspend());
      cgFMOD.errorCheck(cgFMOD.SystemCore.mixerResume());

      if (cgFMOD.logging) { console.info("Reset FMOD Audio Driver"); }

      cgFMOD.audioReady = true;
    };

    originAttributes() {
      let cgFMOD = ChoreoGraph.FMOD;
      let attributes = cgFMOD.FMOD._3D_ATTRIBUTES();
      attributes.forward.x = 0; attributes.forward.y = -1; attributes.forward.z = 0;
      attributes.up.x = 0; attributes.up.y = 0; attributes.up.z = 1;
      attributes.position.x = 0; attributes.position.y = 0; attributes.position.z = 0;
      attributes.velocity.x = 0; attributes.velocity.y = 0; attributes.velocity.z = 0;
      return attributes;
    };

    FMOD3DAttributes(attributes, x, y, lastX=x, lastY=y) {
      attributes.forward.x = 0; attributes.forward.y = -1; attributes.forward.z = 0;
      attributes.up.x = 0; attributes.up.y = 0; attributes.up.z = 1;
      attributes.position.x = x;
      attributes.position.y = y;
      attributes.position.z = 0;
      attributes.velocity.x = (x - lastX)*(ChoreoGraph.timeDelta/1000);
      attributes.velocity.y = (y - lastY)*(ChoreoGraph.timeDelta/1000);
      attributes.velocity.z = 0;
    };

    registerBank(key, filename, folderPath="", autoload=true) {
      this.banks[key] = new class cgFMODBank {
        loaded = false;

        bank = null;
        events = null;
        buses = null;
        VCAs = null;
        userData = null;
        constructor() {
          this.key = key;
          this.folderPath = folderPath;
          this.filename = filename;
          this.autoload = autoload;
        };
        load() { // Loads the bank file data into memory
          let cgFMOD = ChoreoGraph.FMOD;
          if (this.loaded) { return false; }
          if (cgFMOD.logging) { console.info("Loading bank: " + this.key); }
          let bankHandle = {};
          cgFMOD.errorCheck(cgFMOD.System.loadBankFile(this.filename, cgFMOD.FMOD.STUDIO_LOAD_BANK_NORMAL, bankHandle),"Loading bank: " + this.filename);
          this.bank = bankHandle.val;
          this.loaded = true;

          this.events = this.listEvents();
          this.buses = this.listBuses();
          this.VCAs = this.listVCAs();
          this.strings = this.listStrings();

          let userData = {};
          this.bank.getUserData(userData);
          this.userData = userData.val;
        };
        unload() { // Unloads the bank file data from memory
          if (!this.loaded) { return false; }
          if (ChoreoGraph.FMOD.logging) { console.info("Unloading bank: " + this.key); }
          return true;
        };
        listEvents() { // Returns a list of event descriptions in the bank
          let bankEvents = {};
          let intenselyHighArrayCapacity = 1000000;
          ChoreoGraph.FMOD.errorCheck(this.bank.getEventList(bankEvents, intenselyHighArrayCapacity, 0), this.bank);
          bankEvents = bankEvents.val;
          return this.createBankDataDictionary(bankEvents, "event");
        };
        listBuses() { // Returns a list of buses in the bank
          let bankBuses = {};
          let intenselyHighArrayCapacity = 1000000;
          ChoreoGraph.FMOD.errorCheck(this.bank.getBusList(bankBuses, intenselyHighArrayCapacity, 0), this.bank);
          bankBuses = bankBuses.val;
          return this.createBankDataDictionary(bankBuses, "bus");
        };
        listVCAs() { // Returns a list of VCAs in the bank
          let bankVCAs = {};
          let intenselyHighArrayCapacity = 1000000;
          ChoreoGraph.FMOD.errorCheck(this.bank.getVCAList(bankVCAs, intenselyHighArrayCapacity, 0), this.bank);
          bankVCAs = bankVCAs.val;
          return this.createBankDataDictionary(bankVCAs, "VCA");
        };
        listStrings() { // Returns a list of strings in the bank
          this.strings = [];
          let stringCount = {};
          ChoreoGraph.FMOD.errorCheck(this.bank.getStringCount(stringCount));
          stringCount = stringCount.val;
          for (let i=0;i<stringCount;i++) {
            let id = new ChoreoGraph.FMOD.FMOD.GUID(); let path = {}; let size = {}; let retrieved = {};
            ChoreoGraph.FMOD.errorCheck(this.bank.getStringInfo(i, id, path, 0, retrieved));
            id = id.val; path = path.val; size = size.val; retrieved = retrieved.val;
            let string = {index:i, id:id, path:path, size:size, retrieved:retrieved};
            this.strings.push(string);
          }
          return this.strings;
        }
        createBankDataDictionary(objects, typeKey) {
          let dict = {};
          for (let j = 0; j < objects.length; j++) {
            let object = objects[j];
            let path = {};
            ChoreoGraph.FMOD.errorCheck(object.getPath(path, 256, 0), object);
            let pathString = path.val;
            let entry = {
              path: pathString,
            };
            entry[typeKey] = object;
            dict[pathString] = entry;
          }
          return dict;
        };
      }
    };

    createEventInstance(eventPath,start=true) {
      let cgFMOD = ChoreoGraph.FMOD;
      if (!cgFMOD.FMODReady||cgFMOD.System==undefined) { console.warn("FMOD not ready"); return false; }
      let eventDescription = {};
      cgFMOD.errorCheck(cgFMOD.System.getEvent(eventPath, eventDescription), eventPath);

      let eventInstance = {};
      cgFMOD.errorCheck(eventDescription.val.createInstance(eventInstance), eventPath);
      eventInstance = eventInstance.val;

      if (start) { cgFMOD.errorCheck(eventInstance.start(), eventPath); }

      cgFMOD.errorCheck(eventInstance.set3DAttributes(cgFMOD.originAttributes()));

      return eventInstance;
    };

    getEventParameters(eventPath) {
      let cgFMOD = ChoreoGraph.FMOD;
      if (!cgFMOD.FMODReady||cgFMOD.System==undefined) { console.warn("FMOD not ready"); return false; }
      let eventDescription = {};
      cgFMOD.errorCheck(cgFMOD.System.getEvent(eventPath, eventDescription));
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
      return parameters;
    };

    getBus(busPath) {
      let bus = {};
      ChoreoGraph.FMOD.System.getBus(busPath,bus);
      return bus.val;
    };

    postBanksInfo() {
      let output = "";
      for (let bankKey in this.banks) {
        let bank = this.banks[bankKey];
        output += "Bank: \x1B[96;3m" + bankKey + "\x1B[m\n";
        output += " Loaded: " + bank.loaded + "\n";
        output += " Path: " + ChoreoGraph.FMOD.baseBankPath+bank.folderPath+bank.filename + "\n";
        output += " StringCount: " + bank.strings.length + "\n";

        if (Object.keys(bank.buses).length>0) { output += "\n----------- BUSES -----------\n"; }
        for (let busPath in bank.buses) {
          output += " Bus: \x1B[36;3m" + busPath + "\x1B[m\n";
        }

        if (Object.keys(bank.VCAs).length>0) { output += "\n----------- VCAS -----------\n"; }
        for (let vcaPath in bank.VCAs) {
          output += " VCA: \x1B[36;3m" + vcaPath + "\x1B[m\n";
        }

        if (Object.keys(bank.events).length>0) { output += "\n----------- EVENTS -----------\n"; }
        for (let eventPath in bank.events) {
          let eventDescription = bank.events[eventPath].event;
          output += " Event: \x1B[36;3m" + eventPath + "\x1B[m\n";
          let parameters = this.getEventParameters(eventPath);
          for (let parameter of parameters) {
            output += "     Parameter: \x1B[92;3m" + parameter.name + "\x1B[m min:" + parameter.minimum + " max:" + parameter.maximum + " default:" + parameter.defaultvalue + "\n";
          }
          let is3D = {}; eventDescription.is3D(is3D); is3D = is3D.val;
          let isOneshot = {}; eventDescription.isOneshot(isOneshot); isOneshot = isOneshot.val;
          let isSnapshot = {}; eventDescription.isSnapshot(isSnapshot); isSnapshot = isSnapshot.val;
          let isStream = {}; eventDescription.isStream(isStream); isStream = isStream.val;
          let hasSustainPoint = {}; eventDescription.hasSustainPoint(hasSustainPoint); hasSustainPoint = hasSustainPoint.val;

          if (is3D||(!isOneshot)||isSnapshot||isStream||hasSustainPoint) {
            output += "     Attributes: \x1B[37;3m";
            if (is3D) { output += "3D "; }
            if (!isOneshot) { output += "NotOneshot "; }
            if (isSnapshot) { output += "Snapshot "; }
            if (isStream) { output += "Stream "; }
            if (hasSustainPoint) { output += "hasSustainPoint "; }
            output += "\x1B[m\n";
          }

          if (parameters.length>0) { output += "\n"; }
        }
        output += "\n----------- END " + bankKey + " BANK -----------\n\n\n";
      }
      console.info(output);
    };
  },

  globalStart() {
    if (typeof FMODModule === 'undefined') {
      console.error("FMODModule is not loaded, be sure to include fmodstudio.js from fmod.com/download (Engine - HTML5), last tested with 2.03.07");
      return;
    }
    let cgFMOD = ChoreoGraph.FMOD;

    if (cgFMOD.logging) { console.info("Loading FMOD"); }

    cgFMOD.FMOD.preRun = function() {
      let cgFMOD = ChoreoGraph.FMOD;
      let folderName = "/";
      let canRead = true;
      let canWrite = false;

      for (let bankKey in cgFMOD.banks) {
        if (cgFMOD.logging) { console.info("Preloading bank: " + bankKey); }
        let filename = cgFMOD.banks[bankKey].filename;
        let path = cgFMOD.baseBankPath + cgFMOD.banks[bankKey].folderPath + filename;
        cgFMOD.FMOD.FS_createPreloadedFile(folderName, filename, path, canRead, canWrite);
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

      cgFMOD.errorCheck(cgFMOD.System.setListenerAttributes(0, cgFMOD.originAttributes(), null));
      if (cgFMOD.use3D) {
        cgFMOD.errorCheck(cgFMOD.SystemCore.set3DSettings(cgFMOD.dopplerScale, cgFMOD.distanceFactor, cgFMOD.rolloffScale));
        if (cgFMOD.logging) { console.info("3D audio enabled",cgFMOD.dopplerScale, cgFMOD.distanceFactor, cgFMOD.rolloffScale); }
      }

      if (cgFMOD.logging) { console.info("Initialised FMOD"); }
      cgFMOD.FMODReady = true;
      if (cgFMOD.onInit!=null) { cgFMOD.onInit(); }
    };

    FMODModule(cgFMOD.FMOD);

    ChoreoGraph.globalBeforeLoops.push(function() {
      let cgFMOD = ChoreoGraph.FMOD;
      if (!cgFMOD.FMODReady||cgFMOD.System==undefined) { return; }
      cgFMOD.errorCheck(cgFMOD.System.update());
    })
  }
});

document.addEventListener("visibilitychange", function() {
  let cgFMOD = ChoreoGraph.FMOD;
  if (cgFMOD.pauseOnVisibilityChange==false) { return; }

  const masterBus = cgFMOD.getBus("bus:/");

  if (document.hidden) {
    cgFMOD.errorCheck(masterBus.setPaused(true));
  } else {
    cgFMOD.errorCheck(masterBus.setPaused(false));
  }
  cgFMOD.errorCheck(cgFMOD.System.update());
}, false);

ChoreoGraph.ObjectComponents.FMODListener = class cgFMODListener {
  manifest = {
    type : "FMODListener",
    key : "FMODListener",
    master : true,
    functions : {
      update : true
    }
  }

  lastPosition = [0,0];

  constructor(componentInit,object) {
    let cgFMOD = ChoreoGraph.FMOD;
    this.listenerId = cgFMOD.listenerCount;
    cgFMOD.listenerCount++;

    this.lastPosition = [object.transform.x,object.transform.y];
    ChoreoGraph.initObjectComponent(this,componentInit);
  };

  update() {
    let cgFMOD = ChoreoGraph.FMOD;
    if (!cgFMOD.ready||cgFMOD.SystemCore==undefined) { return; }
    let attributes = cgFMOD.FMOD._3D_ATTRIBUTES();
    let transform = this.object.transform;
    cgFMOD.FMOD3DAttributes(attributes, transform.x, transform.y, this.lastPosition[0], this.lastPosition[1]);

    this.lastPosition = [transform.x,transform.y];

    cgFMOD.errorCheck(cgFMOD.System.setListenerAttributes(0, attributes, null));
  };
};

ChoreoGraph.ObjectComponents.FMODSource = class cgFMODSource {
  manifest = {
    type : "FMODSource",
    key : "FMODSource",
    master : true,
    functions : {
      update : true
    }
  }

  events = [];
  lastPosition = [0,0];

  constructor(componentInit,object) {
    this.lastPosition = [object.transform.x,object.transform.y];
    ChoreoGraph.initObjectComponent(this,componentInit);
  };

  update() {
    let cgFMOD = ChoreoGraph.FMOD;
    if (!cgFMOD.ready||cgFMOD.System==undefined) { return; }
    let attributes = cgFMOD.FMOD._3D_ATTRIBUTES();
    let transform = this.object.transform;
    cgFMOD.FMOD3DAttributes(attributes, transform.x, transform.y, this.lastPosition[0], this.lastPosition[1]);
    this.lastPosition = [transform.x,transform.y];
    for (let eventInstance of this.events) {
      cgFMOD.errorCheck(eventInstance.set3DAttributes(attributes));
    }
  };
};