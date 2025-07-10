export * from './choreograph';

declare module './choreograph' {
  interface ChoreoGraph {
    FMOD: {
      readonly FMODReady: boolean;
      readonly audioReady: boolean;

      readonly FMOD: FMOD;
      readonly System: FMODStudioSystem;
      readonly SystemCore: FMODSystem;

      readonly banks: Record<string, cgFMODBank>;
      readonly listenerCount: number;

      baseBankPath: string;
      logging: boolean;
      pauseOnVisibilityChange: boolean;
      use3D: boolean;

      dopplerScale: number;
      distanceFactor: number;
      rolloffScale: number;

      onInit: (callback: () => void) => void;

      errorCheck(result: number, meta: any): void;
      originAttributes(): FMOD3DAttributes;

      FMOD3DAttributes(
        attributes: FMOD3DAttributes,
        x: number,
        y: number,
        lastX?: number,
        lastY?: number
      ): void;

      registerBank(
        key: ChoreoGraphId,
        filename: string,
        folderPath?: string,
        autoload?: boolean
      ): void;

      createEventInstance(
        eventPath: string,
        start?: boolean
      ): FMODStudioEventDescription;

      getEventParameters(
        eventPath: string
      ): FMODStudioParameterDescription[];

      getBus(
        busPath: string
      ): FMODStudioBus;

      postBanksInfo(): void;
    }
  }

  type cgFMODBank = {
    loaded: boolean;

    bank: FMODStudioBank;
    events: Record<string, FMODStudioEventDescription>;
    buses: Record<string, FMODStudioBus>;
    VCAs: Record<string, FMODStudioVCA>;
    userData: FMODStudioBankUserData;

    key: ChoreoGraphId;
    folderPath: string;
    filename: string;
    autoload: boolean;

    load(): void;
    unload(): boolean;
    listEvents(): Record<string, FMODStudioEventDescription>;
    listBuses(): Record<string, FMODStudioBus>;
    listVCAs(): Record<string, FMODStudioVCA>;
    listStrings(): object;
  }

  type cgObjectFMODListener = {
    readonly manifest: {
      type: 'FMODSource';
      key: string;
      master: true;
      functions: {
        update: true;
        delete: true;
      };
    };

    readonly lastPosition: [number, number];
  }

  interface cgObjectFMODListenerInit extends cgObjectComponentInitBase {

  }

  type cgObjectFMODSource = {
    readonly manifest: {
      type: 'FMODSource';
      key: string;
      master: true;
      functions: {
        update: true;
        delete: true;
      };
    };

    events: FMODStudioEventDescription[];
    readonly lastPosition: [number, number];
  }

  interface cgObjectFMODSourceInit extends cgObjectComponentInitBase {

  }

  interface cgObjectComponentMap {
    FMODListener: cgObjectFMODListener;
    FMODSource: cgObjectFMODSource;
  }

  interface cgObjectComponentInitMap {
    FMODListener: cgObjectFMODListenerInit;
    FMODSource: cgObjectFMODSourceInit;
  }

  /** FMOD - https://www.fmod.com/docs/2.03/api/core-api-common.html */
  type FMOD = object;

  /** Studio::System - https://www.fmod.com/docs/2.03/api/studio-api-system.html */
  type FMODStudioSystem = object;

  /** System - https://www.fmod.com/docs/2.03/api/core-api-system.html */
  type FMODSystem = object;

  /** FMOD_3D_ATTRIBUTES - https://www.fmod.com/docs/2.03/api/core-api-common.html#fmod_3d_attributes */
  type FMOD3DAttributes = object;

  /** Studio::Bank - https://www.fmod.com/docs/2.03/api/studio-api-bank.html */
  type FMODStudioBank = object;

  /** Studio::EventDescription - https://www.fmod.com/docs/2.03/api/studio-api-eventdescription.html */
  type FMODStudioEventDescription = object;

  /** Studio::Bus - https://www.fmod.com/docs/2.03/api/studio-api-bus.html */
  type FMODStudioBus = object;

  /** Studio::VCA - https://www.fmod.com/docs/2.03/api/studio-api-vca.html */
  type FMODStudioVCA = object;

  /** Studio::BankUserData - https://www.fmod.com/docs/2.03/api/glossary.html#user-data */
  type FMODStudioBankUserData = object;

  /** FMOD_STUDIO_PARAMETER_DESCRIPTION - https://www.fmod.com/docs/2.03/api/studio-api-common.html#fmod_studio_parameter_description */
  type FMODStudioParameterDescription = object;
}