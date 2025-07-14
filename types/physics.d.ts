export * from './choreograph';

declare module './choreograph' {
  interface cgInstance {
    Physics: {
      colliders : Record<ChoreoGraphId, cgCollider>;

      calibrateCollisionOrder(): void;
      createCollider(init: cgColliderInit, id?: ChoreoGraphId): cgCollider;
      createCollidersFromTilemap(
        tilemap : cgTilemap,
        layerIndex?: number,
        targetTileId?: ChoreoGraphId | null,
        scene?: cgScene,
        groups?: number[]
      ): void;
    }
  }

  interface cgSettings {
    physics: {
      maximumIterations: number;
      gravityX: number;
      gravityY: number;

      debug: {
        active: boolean;

        style: {
          outlineWidth: number;
          opacity: number;

          colours: {
            physics: string;
            trigger: string;
            collided: string;
          }
        }
      }
    }
  }

  type cgColliderGroupId = number | string;

  interface cgColliderBase {
    id: ChoreoGraphId;
    trigger: boolean;
    static: boolean;
    manual: boolean;
    groups: cgColliderGroupId[];
    scene: cgScene | null;

    transform: cgTransform;
    readonly collided: boolean;
    readonly resolutionVector: [number, number];
    readonly collidedFrame: ChoreoGraphFrame;
    readonly collisions: cgCollider[];
    readonly affiliations: cgCollider[];

    collide: (collider: cgCollider, comparison: cgCollider, vector: [number, number] | null) => void;
    enter: (collider: cgCollider, comparison: cgCollider) => void;
    exit: (collider: cgCollider, comparison: cgCollider) => void;

    getPosition(): [number, number];
    delete(): void;

    [key: string]: any;
  }

  interface cgColliderInitBase {
    trigger?: boolean;
    static?: boolean;
    manual?: boolean;
    groups?: cgColliderGroupId[];
    scene?: cgScene | null;

    transform?: cgTransformInit;
    transformInit?: cgTransformInit;
    transformId?: ChoreoGraphId;

    [key: string]: any;

    enter?: (comparison: cgCollider, collider: cgCollider) => void;
    exit?: (comparison: cgCollider, collider: cgCollider) => void;
  }

  interface cgRectangleCollider extends cgColliderBase {
    readonly type: "rectangle";
    readonly physicsCapable: true;

    width: number;
    height: number;
  }

  interface cgRectangleColliderInit extends cgColliderInitBase {
    type: "rectangle";
    width: number;
    height: number;
  }

  interface cgCircleCollider extends cgColliderBase {
    readonly type: "circle";
    readonly physicsCapable: true;

    radius: number;
  }

  interface cgCircleColliderInit extends cgColliderInitBase {
    type: "circle";
    radius: number;
  }

  interface cgPointCollider extends cgColliderBase {
    readonly type: "point";
    readonly physicsCapable: true;
  }

  interface cgPointColliderInit extends cgColliderInitBase {
    type: "point";
  }

  interface cgRaycastCollider extends cgColliderBase {
    readonly type: "raycast";
    readonly physicsCapable: false;

    dx: number;
    dy: number;
    readonly collidedDistance: number;
    readonly collidedCollider: cgCollider | null;
    readonly collidedX: number;
    readonly collidedY: number;
    readonly unitVectorX: number;
    readonly unitVectorY: number;
  }

  interface cgRaycastColliderInit extends cgColliderInitBase {
    type: "raycast";
    dx?: number;
    dy?: number;
  }

  type cgCollider = cgRectangleCollider | cgCircleCollider | cgPointCollider | cgRaycastCollider;

  type cgColliderInit = cgRectangleColliderInit | cgCircleColliderInit | cgPointColliderInit | cgRaycastColliderInit;

  type cgObjectRigidBody = {
    readonly manifest: {
      type: 'Animator';
      key: string;
      master: true;
      functions: {
        update: true;
        delete: true;
      };
    };

    /** X Velocity */
    xv: number;
    /** Y Velocity */
    yv: number;
    collider: cgCollider;
    drag: number;
    dragX: number | null;
    dragY: number | null;
    mass: number;
    bounce: boolean;
    minimumVelocity: number;

    deleteColliderWithObject: boolean;
  }

  interface cgObjectRigidBodyInit extends cgObjectComponentInitBase {

  }

  interface cgObjectComponentMap {
    RigidBody: cgObjectRigidBody;
  }

  interface cgObjectComponentInitMap {
    RigidBody: cgObjectRigidBodyInit;
  }
}