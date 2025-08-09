export * from './choreograph';

declare module './choreograph' {
  interface cgInstance {
    BlockController: {
      blocks: Record<ChoreoGraphId, cgBlock>;
      blockGroups: Record<ChoreoGraphId, cgObjectBlockController[]>;

      createBlock(init: cgBlockInit, id?: ChoreoGraphId): cgBlock;
    }
  }

  type cgBlock = {
    id: ChoreoGraphId;
    override: boolean;
    overrideType: cgBlock_ALLOW_STOPPING_MIDWAY | cgBlock_ONLY_AT_BLOCK_MARKERS;
    readonly clear: boolean;
    readonly objectCount: number;
    readonly groupOccupying: ChoreoGraphId | null;

    isOpen(groupId: ChoreoGraphId): boolean;
    isClosed(groupId: ChoreoGraphId): boolean;
    open(): void;
    close(groupId: ChoreoGraphId): void;
  }

  type cgBlockInit = {
    override?: boolean;
    overrideType?: cgBlock_ALLOW_STOPPING_MIDWAY | cgBlock_ONLY_AT_BLOCK_MARKERS;
  }

  type cgBlock_ALLOW_STOPPING_MIDWAY = 0;
  type cgBlock_ONLY_AT_BLOCK_MARKERS = 1;

  interface cgSettings {
    blockcontroller: {
      debug: {
        active: boolean;
        pathXKey: string[];
        pathYKey: string[];
        animations: (cgAnimation | string)[];
        colours: string[];
      }
    }
  }

  type cgObjectBlockController = {
    readonly manifest: {
      type: 'BlockController';
      key: string;
      master: true;
      functions: {
        update: true;
      };
    };

    block: ChoreoGraphId | null;
    group: ChoreoGraphId | null;
    readonly processingBlock: boolean;
    readonly blocked: boolean;

    start(): void;
    stop(): void;
  }

  interface cgObjectBlockControllerInit extends cgObjectComponentInitBase {
    block?: ChoreoGraphId;
    group?: ChoreoGraphId;
  }

  interface cgObjectComponentMap {
    BlockController: cgObjectBlockController;
  }

  interface cgObjectComponentInitMap {
    BlockController: cgObjectBlockControllerInit;
  }
}