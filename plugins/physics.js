ChoreoGraph.plugin({
  name : "Physics",
  key : "Physics",
  version : "1.1",

  globalPackage : new class cgPhysics {

    Collider = class cgCollider {
      trigger = false; // Physics operations (false) vs just checks (true)
      static = false; // An intent that this collider will never move or change shape
      manual = false; // Excludes this from collision orders
      groups = [0];

      transform = null;
      collided = false;
      resolutionVector = [0,0];
      collidedFrame = -1;
      collisions = [];
      memory = [];
      affiliations = [];

      enter = null;
      exit = null;
      collide = null;

      constructor(colliderInit,cg) {
        this.cg = cg;
      };

      getPosition() {
        let cx = this.transform.x;
        let cy = this.transform.y;
        let cr = this.transform.r;
        let cax = this.transform.ax;
        let cay = this.transform.ay;
        if (cr!=0) {
          let rad = cr*Math.PI/180;
          cx += cax*Math.cos(rad) - cay*Math.sin(rad);
          cy += cax*Math.sin(rad) + cay*Math.cos(rad);
        } else {
          cx += cax;
          cy += cay;
        }
        return [cx,cy];
      };
    };

    colliderTypes = {
      rectangle : "RectangleCollider",
      circle : "CircleCollider",
      point : "PointCollider",
      raycast : "RaycastCollider"
    };

    colliderCompatability = {
      rectangle : {
        rectangle : ["rectangleRectangle",false],
        circle : ["circleRectangle",true],
        point : ["pointRectangle",true],
        raycast : ["raycastRectangle",true]
      },
      circle : {
        circle : ["circleCircle",false],
        rectangle : ["circleRectangle",false],
        point : ["pointCircle",true],
        raycast : ["raycastCircle",true]
      },
      point : {
        rectangle : ["pointRectangle",false],
        circle : ["pointCircle",false]
      },
      raycast : {
        rectangle : ["raycastRectangle",false],
        circle : ["raycastCircle",false]
      }
    };

    RectangleCollider = class cgRectangleCollider extends this.Collider {
      type = "rectangle";
      physicsCapable = true;

      width = 100;
      height = 100;

      draw(c) {
        let opacity = this.cg.Physics.setDebugStyles(this,c);
        c.beginPath();
        c.rect(-this.width/2, -this.height/2, this.width, this.height);
        c.globalAlpha = 1;
        c.stroke();
        c.globalAlpha = opacity;
        c.fill();
      };
    };

    CircleCollider = class cgCircleCollider extends this.Collider {
      type = "circle";
      physicsCapable = true;

      radius = 50;

      draw(c) {
        let opacity = this.cg.Physics.setDebugStyles(this,c);
        c.beginPath();
        c.arc(0, 0, this.radius, 0, Math.PI * 2);
        c.globalAlpha = 1;
        c.stroke();
        c.globalAlpha = opacity;
        c.fill();
      }
    };

    PointCollider = class cgPointCollider extends this.Collider {
      type = "point";
      physicsCapable = true;

      draw(c) {
        this.cg.Physics.setDebugStyles(this,c);
        c.globalAlpha = 1;
        c.beginPath();
        c.moveTo(0, 6);
        c.lineTo(0, -6);
        c.moveTo(6, 0);
        c.lineTo(-6, 0);
        c.stroke();
      }
    };

    RaycastCollider = class cgRaycastCollider extends this.Collider {
      type = "raycast";
      physicsCapable = false;

      dx = 0;
      dy = 0;
      collidedDistance = -1;
      collidedCollider = null;
      collidedX = 0;
      collidedY = 0;
      unitVectorX = 0;
      unitVectorY = 0;

      draw(c) {
        this.cg.Physics.setDebugStyles(this,c);
        let size = this.cg.settings.core.debugCGScale;
        c.beginPath();
        c.moveTo(-this.unitVectorY*10*size, this.unitVectorX*10*size);
        c.lineTo(-this.unitVectorY*-10*size, this.unitVectorX*-10*size);
        c.moveTo(0, 0);
        if (this.collided) {
          let x = this.unitVectorX*this.collidedDistance;
          let y = this.unitVectorY*this.collidedDistance;
          c.lineTo(x, y);
          c.moveTo(x, y+6*size);
          c.lineTo(x, y-6*size);
          c.moveTo(6*size+x, y);
          c.lineTo(-6*size+x, y);
          c.stroke();
          c.setLineDash([5*size, 5*size]);
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(this.dx,this.dy)
        } else {
          c.moveTo(0, 0);
          c.lineTo(this.dx, this.dy);
        }
        c.globalAlpha = 1;
        c.stroke();
      }
    };

    instanceObject = class cgInstancePhysics {
      colliders = {};
      hasActivatedDebugLoop = false;
      triggerCollisionOrder = [];
      physicsCollisionOrder = [];

      iterationNumber = 0;
      collisionChecks = 0;

      constructor(cg) {
        this.cg = cg;
      }

      setDebugStyles(collider,c) {
        let style = this.cg.settings.physics.debug.style;
        if (collider.collided) {
          c.strokeStyle = style.colours.collided;
          c.fillStyle = style.colours.collided;
        } else if (collider.trigger) {
          c.strokeStyle = style.colours.trigger;
          c.fillStyle = style.colours.trigger;
        } else {
          c.strokeStyle = style.colours.physics;
          c.fillStyle = style.colours.physics;
        }
        c.lineWidth = style.outlineWidth * collider.cg.settings.core.debugCGScale;
        return style.opacity;
      };

      calibrateCollisionOrder() {
        this.triggerCollisionOrder = [];
        this.physicsCollisionOrder = [];
        for (let colliderId of this.cg.keys.colliders) {
          let collider = this.cg.Physics.colliders[colliderId];
          collider.affiliations = [];
        }
        for (let mi=0;mi<this.cg.keys.colliders.length;mi++) {
          for (let ci=mi+1;ci<this.cg.keys.colliders.length;ci++) {
            let mId = this.cg.keys.colliders[mi];
            let cId = this.cg.keys.colliders[ci];
            let collider = this.cg.Physics.colliders[mId];
            let comparison = this.cg.Physics.colliders[cId];
            if (collider.static && comparison.static) { continue; } // Don't compare two static colliders
            let compatible = Object.keys(ChoreoGraph.Physics.colliderCompatability[collider.type]).includes(comparison.type);
            if (!compatible) { continue; } // Don't compare incompatible colliders
            let sharesAGroup = false;
            for (let group of collider.groups) {
              if (comparison.groups.includes(group)) {
                sharesAGroup = true;
                break;
              }
            }
            if (!sharesAGroup) { continue; } // Don't compare colliders that don't share a group
            collider.affiliations.push(comparison);
            comparison.affiliations.push(collider);
            if (collider.trigger || comparison.trigger) {
              if (collider.static || comparison.static) { continue; } // Don't compare static colliders with triggers
              this.triggerCollisionOrder.push([collider, comparison]);
            } else {
              if (collider.manual || comparison.manual) { continue; } // Don't physics compare excluded colliders
              this.physicsCollisionOrder.push([collider, comparison]);
            }
          }
        }
      };

      createCollider(colliderInit={}, id=ChoreoGraph.id.get()) {
        if (this.cg.keys.colliders.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
        let type = colliderInit.type;
        if (type === undefined) { console.warn("createCollider requires a collider type"); return; }
        delete colliderInit.type;
        if (ChoreoGraph.Physics.colliderTypes[type] === undefined) {
          console.warn('Unknown collider type: "' + type + '". Valid types:',Object.keys(ChoreoGraph.Physics.colliderTypes).join(", "));
          return;
        }
        let newCollider = new ChoreoGraph.Physics[ChoreoGraph.Physics.colliderTypes[type]](colliderInit,this.cg);
        newCollider.id = id;
        newCollider.cg = this.cg;
        ChoreoGraph.initTransform(this.cg,newCollider,colliderInit);
        if (colliderInit.physicsCapable !== undefined) {
          delete colliderInit.physicsCapable;
          console.warn("physicsCapable is readonly in createCollider",id);
        }
        ChoreoGraph.applyAttributes(newCollider,colliderInit);
        if (!newCollider.physicsCapable && !newCollider.trigger) {
          newCollider.trigger = true;
          if (colliderInit.trigger === false) {
            console.warn("Collider type " + newCollider.type + " is not physics capable.",id);
          }
        }
        if (newCollider.trigger && newCollider.static) {
          console.warn("Colliders cannot be static and trigger at the same time.",id);
          newCollider.static = false;
        }
        this.colliders[id] = newCollider;
        this.cg.keys.colliders.push(id);
        if (cg.ready) {
          this.cg.Physics.calibrateCollisionOrder();
        }
        return newCollider;
      };

      createCollidersFromTilemap(tilemap,layerIndex=0,targetTileId,xo=0,yo=0) {
        if (tilemap===undefined) { console.warn("No Tilemap provided in createCollidersFromTileMap"); return; }
        let pool = [];
        for (let chunk of tilemap.chunks) {
          if (chunk.layers[layerIndex]==undefined) { continue; }
          for (let t=0;t<chunk.layers[layerIndex].tiles.length;t++) {
            let tileId = chunk.layers[layerIndex].tiles[t];
            if (tileId===targetTileId||(tileId!=null&&targetTileId===undefined)) {
              let x = t % chunk.width + chunk.x;
              let y = Math.floor(t / chunk.width) + chunk.y;
              pool.push(x+","+y);
            }
          }
        }
        let colliderNumber = 0;
        let colliderGroupName = tilemap.id;
        while (pool.length>0) {
          let biggestArea = 0;
          let biggestPool = [];
          let biggestWidth = 0;
          let biggestHeight = 0;
          let biggestStart = "";
          for (let i=0;i<pool.length;i++) { // Go through every tile in the pool and find which has the largest rectangle
            let start = pool[i];
            let x = parseInt(start.split(",")[0]);
            let y = parseInt(start.split(",")[1]);
            let width = 1;
            let height = 1;
            let area = 1;
            let currentPool = [pool[i]];
            let found = true;
            while (found) { // While this tile has its rectangle still growing
              let foundVertical = true;
              let foundHorizontal = false;
              let potentialVertPool = [];
              let potentialHorPool = [];
              // Check vertically down
              for (let j=0;j<width;j++) { // Check below each bottom tile
                if (pool.indexOf((x+j)+","+(y+height))!=-1) {
                  potentialVertPool.push((x+j)+","+(y+height));
                } else {
                  foundVertical = false;
                }
              }
              if (foundVertical==false) {
                foundHorizontal = true;
                for (let j=0;j<height;j++) { // Check to the right of each right tile
                  if (pool.indexOf((x+width)+","+(y+j))!=-1) {
                    potentialHorPool.push((x+width)+","+(y+j));
                  } else {
                    foundHorizontal = false;
                  }
                }
              }
              if (foundVertical==false&&foundHorizontal==false) { // If neither direction can be expanded
                found = false;
              } else if (foundVertical) { // If the vertical direction can be expanded
                for (let j=0;j<potentialVertPool.length;j++) {
                  currentPool.push(potentialVertPool[j]);
                }
                height++;
              } else if (foundHorizontal) { // If the horizontal direction can be expanded
                for (let j=0;j<potentialHorPool.length;j++) {
                  currentPool.push(potentialHorPool[j]);
                }
                width++;
              }
            }
            area = width*height;
            if (area>biggestArea) {
              biggestArea = area;
              biggestPool = currentPool;
              biggestWidth = width;
              biggestHeight = height;
              biggestStart = start;
            }
          }
          // By this point all the biggest values should have the largest rectangle
          for (let i=0;i<biggestPool.length;i++) {
            pool.splice(pool.indexOf(biggestPool[i]),1);
          }
          let biggestX = parseInt(biggestStart.split(",")[0]);
          let biggestY = parseInt(biggestStart.split(",")[1]);
          let x = biggestX*tilemap.tileWidth + tilemap.tileWidth/2;
          let y = biggestY*tilemap.tileHeight + tilemap.tileHeight/2;
          let cx = x+(tilemap.tileWidth*biggestWidth)/2-tilemap.tileWidth/2;
          let cy = y+(tilemap.tileHeight*biggestHeight)/2-tilemap.tileHeight/2;
          this.createCollider({
            static : true,
            type : "rectangle",
            width : tilemap.tileWidth * biggestWidth,
            height : tilemap.tileHeight * biggestHeight,
            transformInit : { x: cx, y: cy }
          }, colliderGroupName + "_" + colliderNumber);
          colliderNumber++;
        }
      };
    };

    detections = {
      rectangleRectangle(colliderA, colliderB, getVector) {
        let [acx,axy] = colliderA.getPosition();
        let [bcx,bcy] = colliderB.getPosition();
        let x1 = acx - colliderA.width/2;
        let y1 = axy - colliderA.height/2;
        let x2 = bcx - colliderB.width/2;
        let y2 = bcy - colliderB.height/2;
        let collided = (x1 < x2 + colliderB.width && x1 + colliderA.width > x2 && y1 < y2 + colliderB.height && y1 + colliderA.height > y2);
        let vector = [0,0];
        if (getVector&&collided) {
          let dx = (acx - bcx);
          let dy = (axy - bcy);
          let overlapX = colliderA.width/2 + colliderB.width/2 - Math.abs(dx);
          let overlapY = colliderA.height/2 + colliderB.height/2 - Math.abs(dy);
          if (overlapX < overlapY) {
            vector = [overlapX*(dx>0?1:-1), 0];
          } else {
            vector = [0, overlapY*(dy>0?1:-1)];
          }
        }
        return [collided, vector];
      },
      circleCircle(colliderA, colliderB, getVector) {
        let [acx,axy] = colliderA.getPosition();
        let [bcx,bcy] = colliderB.getPosition();
        let dx = acx - bcx;
        let dy = axy - bcy;
        let rc = colliderA.radius + colliderB.radius;
        let collided = rc**2 > dx**2 + dy**2;
        let vector = [0,0];
        if (getVector&&collided) {
          let overlap = rc - Math.sqrt(dx**2 + dy**2)+0.1;
          vector = [dx*(overlap/rc), dy*(overlap/rc)];
        }
        return [collided, vector];
      },
      circleRectangle(circle, rectangle, getVector) {
        let [cx,cy] = circle.getPosition();
        let [rx,ry] = rectangle.getPosition();
        let hw = rectangle.width * 0.5;
        let hh = rectangle.height * 0.5;

        if (rx===cx&&ry===cy) {
          return [true,[0,0]];
        }

        let dx = cx - Math.max(rx - hw, Math.min(cx, rx + hw));
        let dy = cy - Math.max(ry - hh, Math.min(cy, ry + hh));

        let collided = dx**2 + dy**2 < circle.radius**2;
        let vector = [0,0];
        if (getVector&&collided) {
          if (dx===0&&dy===0) {
            let left = cx - (rx - hw);
            let right = (rx + hw) - cx;
            let top = cy - (ry - hh);
            let bottom = (ry + hh) - cy;
            let minX = Math.min(left, right);
            let minY = Math.min(top, bottom);
            if (minX < minY) {
              if (left < right) {
                vector = [-(left + circle.radius), 0];
              } else {
                vector = [right + circle.radius, 0];
              }
            } else {
              if (top < bottom) {
                vector = [0, -(top + circle.radius)];
              } else {
                vector = [0, bottom + circle.radius];
              }
            }
          } else {
            let length = Math.sqrt(dx**2 + dy**2);
            let overlap = circle.radius - length + circle.radius * 0.001;
            let xInfluence = dx / length;
            let yInfluence = dy / length;
            vector = [overlap * xInfluence, overlap * yInfluence];
          }
        }

        return [collided, vector];
      },
      pointRectangle(point, rectangle, getVector) {
        let [px,py] = point.getPosition();
        let [rx,ry] = rectangle.getPosition();
        let hw = rectangle.width * 0.5;
        let hh = rectangle.height * 0.5;

        let collided = px > rx - hw && px < rx + hw && py > ry - hh && py < ry + hh;

        let vector = [0,0];
        if (getVector&&collided) {
          let dx = px - rx;
          let dy = py - ry;
          let overlapX = hw - Math.abs(dx);
          let overlapY = hh - Math.abs(dy);
          if (overlapX < overlapY) {
            vector = [overlapX*(dx>0?1:-1), 0];
          } else {
            vector = [0, overlapY*(dy>0?1:-1)];
          }
        }
        return [collided, vector];
      },
      pointCircle(point, circle, getVector) {
        let [px,py] = point.getPosition();
        let [cx,cy] = circle.getPosition();
        let dx = px - cx;
        let dy = py - cy;
        let collided = dx**2 + dy**2 < circle.radius**2;
        let vector = [0,0];
        if (getVector&&collided) {
          let overlap = circle.radius - Math.sqrt(dx**2 + dy**2)+0.1;
          vector = [dx*(overlap/circle.radius), dy*(overlap/circle.radius)];
        }
        return [collided, vector];
      },
      raycastCircle(raycast, circle) {
        let [rayX,rayY] = raycast.getPosition();
        let [cirX,cirY] = circle.getPosition();
        let collided = Math.sqrt((rayX-cirX)**2+(rayY-cirY)**2)<circle.radius;
        let newDistance = 0;
        let newXCollision = rayX;
        let newYCollision = rayY;

        if (collided==false) {
          let cirVecX = cirX - rayX; // Vector from ray to circle x
          let cirVecY = cirY - rayY; // Vector from ray to circle y
          let magRay = Math.sqrt(raycast.dx*raycast.dx+raycast.dy*raycast.dy); // Magnitude of ray vector
          let magCir = Math.sqrt(cirVecX**2 + cirVecY**2); // Magnitude of circle centre vector
          let unitVx, unitVy;
          if (magRay!=0) {
            unitVx = raycast.dx/magRay; // Unit vector of ray x
            unitVy = raycast.dy/magRay; // Unit vector of ray y
          } else {
            unitVx = 0;
            unitVy = 0;
          }
          let a = cirVecX * unitVx + cirVecY * unitVy; // Projection of circle vector onto ray vector
          let b = magCir**2 - a**2; // Distance from circle to ray
          let f = Math.sqrt(circle.radius**2 - b);
          let t = a-f;

          raycast.unitVectorX = unitVx;
          raycast.unitVectorY = unitVy;

          collided = t > 0 && t < magRay;
          if (collided) {
            newDistance = t;
            newXCollision = rayX + unitVx*t;
            newYCollision = rayY + unitVy*t;
          }
        }
        if (collided&&raycast.collidedCollider!==circle) {
          collided = ChoreoGraph.Physics.raycastReevaluate(raycast,newDistance);
          if (collided) {
            ChoreoGraph.Physics.setRaycastData(raycast,circle,newDistance,newXCollision,newYCollision);
          }
        } else if (collided) {
          ChoreoGraph.Physics.setRaycastData(raycast,circle,newDistance,newXCollision,newYCollision);
        }
        return [collided, null];
      },
      raycastRectangle(raycast, rectangle) {
        let [rayX,rayY] = raycast.getPosition();
        let [recX,recY] = rectangle.getPosition();
        let recHW = rectangle.width*0.5;
        let recHH = rectangle.height*0.5;
        let collided = rayX>recX-recHW&&rayX<recX+recHW&&rayY<recY+recHH&&rayY>recY-recHH; // if the ray is inside the rectangle
        let top = recY + recHH;
        let bottom = recY - recHH;
        let left = recX - recHW;
        let right = recX + recHW;
        let m = raycast.dy/raycast.dx;
        let c = rayY - m*rayX;
        let newDistance = 0;
        let newXCollision = rayX;
        let newYCollision = rayY;
        if (collided==false) {
          if (raycast.dx>0) { // Check left side
            if (rayX+raycast.dx>left) { // If ray is horizontally across the left side
              let y = m*(left)+c;
              let within = (raycast.dy>0&&y>rayY)||(raycast.dy<0&&y<rayY);
              if (y<top&&y>bottom&&within) {
                collided = true;
                newDistance = Math.sqrt((rayX-left)**2+(rayY-y)**2);
                newXCollision = left;
                newYCollision = y;
              }
            }
          } else { // Check right side
            if (rayX+raycast.dx<right) { // If ray is horizontally across the right side
              let y = m*(right)+c;
              let within = (raycast.dy>0&&y>rayY)||(raycast.dy<0&&y<rayY);
              if (y<top&&y>bottom&&within) {
                collided = true;
                newDistance = Math.sqrt((rayX-right)**2+(rayY-y)**2);
                newXCollision = right;
                newYCollision = y;
              }
            }
          }
        }
        if (collided==false) {
          if (raycast.dy>0) { // Check bottom side
            if (rayY+raycast.dy>bottom) { // If ray is vertically across the bottom side
              let x = (bottom-c)/m;
              let within = (raycast.dx>0&&x>rayX)||(raycast.dx<0&&x<rayX);
              if (x<right&&x>left&&within) {
                collided = true;
                newDistance = Math.sqrt((rayX-x)**2+(rayY-bottom)**2);
                newXCollision = x;
                newYCollision = bottom;
              }
            }
          } else { // Check top side
            if (rayY+raycast.dy<top) { // If ray is vertically across the top side
              let x = (top-c)/m;
              let within = (raycast.dx>0&&x>rayX)||(raycast.dx<0&&x<rayX);
              if (x<right&&x>left&&within) {
                collided = true;
                newDistance = Math.sqrt((rayX-x)**2+(rayY-top)**2);
                newXCollision = x;
                newYCollision = top;
              }
            }
          }
        }
        if (collided&&raycast.collidedCollider!==rectangle) {
          collided = ChoreoGraph.Physics.raycastReevaluate(raycast,newDistance);
          if (collided) {
            ChoreoGraph.Physics.setRaycastData(raycast,rectangle,newDistance,newXCollision,newYCollision);
          }
        } else if (collided) {
          ChoreoGraph.Physics.setRaycastData(raycast,rectangle,newDistance,newXCollision,newYCollision);
        }
        return [collided, null];
      }
    };

    raycastReevaluate(raycast,distance) {
      if (raycast.collided) {
        if (raycast.collidedDistance>distance) {
          raycast.collidedCollider.collisions = raycast.collidedCollider.collisions.filter(collider => collider.id!=raycast.id);
          raycast.collisions = raycast.collisions.filter(collider => collider.id!=raycast.collidedCollider.id);
          if (raycast.collidedCollider.collisions.length==0) { raycast.collidedCollider.collided = false; }
        } else {
          return false;
        }
      }
      return true;
    };

    setRaycastData(raycast,collider,distance,x,y) {
      raycast.collidedDistance = distance;
      raycast.collidedCollider = collider;
      raycast.collidedX = x;
      raycast.collidedY = y;
      if (distance!=0) {
        let [rx,ry] = raycast.getPosition();
        raycast.unitVectorX = (x - rx)/distance;
        raycast.unitVectorY = (y - ry)/distance;
      }
    }

    processCollision(colliderA, colliderB, getVector) {
      const compatability = ChoreoGraph.Physics.colliderCompatability[colliderA.type][colliderB.type];
      const detectionFunction = ChoreoGraph.Physics.detections[compatability[0]];
      const flip = compatability[1];
      let collided, vector;
      if (flip) {
        [collided,vector] = detectionFunction(colliderB, colliderA, getVector);
      } else {
        [collided,vector] = detectionFunction(colliderA, colliderB, getVector);
      }
      if (collided) {
        colliderA.collided = true;
        colliderB.collided = true;
        if (colliderA.collide !== null) { colliderA.collide(colliderB, vector); }
        if (colliderB.collide !== null) { colliderB.collide(colliderA, vector); }
      } else {
        if (colliderA.collidedFrame !== ChoreoGraph.frame) { colliderA.collided = false; }
        if (colliderB.collidedFrame !== ChoreoGraph.frame) { colliderB.collided = false; }
      }
      return [collided, vector, flip];
    };

    triggerProcessingLoop(cg) {
      cg.Physics.iterationNumber = 0;
      cg.Physics.collisionChecks = 0;

      for (let pairs of cg.Physics.triggerCollisionOrder) {
        const colliderA = pairs[0];
        const colliderB = pairs[1];

        if (colliderA.collidedFrame !== ChoreoGraph.frame) { colliderA.collisions.length = 0; }
        if (colliderB.collidedFrame !== ChoreoGraph.frame) { colliderB.collisions.length = 0; }

        const [collided] = ChoreoGraph.Physics.processCollision(colliderA, colliderB, false);
        if (collided) {
          colliderA.collided = true;
          colliderB.collided = true;
          colliderA.collidedFrame = ChoreoGraph.frame;
          colliderB.collidedFrame = ChoreoGraph.frame;
          colliderA.collisions.push(colliderB);
          colliderB.collisions.push(colliderA);
        } else {
          if (colliderA.collidedFrame !== ChoreoGraph.frame) { colliderA.collided = false; }
          if (colliderB.collidedFrame !== ChoreoGraph.frame) { colliderB.collided = false; }
        }
        cg.Physics.collisionChecks++;
      }
    };

    physicsProcessingLoop(cg,whitelist=null) {
      let collidersToResolve = [];
      let nextWhitelist = [];

      // FIND COLLISIONS AND RESOLUTIONS
      for (let pairs of cg.Physics.physicsCollisionOrder) {
        const colliderA = pairs[0];
        const colliderB = pairs[1];

        if (whitelist!== null) {
          if (!whitelist.includes(colliderA.id) && !whitelist.includes(colliderB.id)) { continue; }
        }

        const [collided,vector,flip] = ChoreoGraph.Physics.processCollision(colliderA, colliderB, true);
        cg.Physics.collisionChecks++;

        if (!collided) { continue; }

        if (colliderA.static&&!colliderB.static) {
          if (flip) {
            if (colliderB.resolutionVector[0]==0) { colliderB.resolutionVector[0] += vector[0]; }
            if (colliderB.resolutionVector[1]==0) { colliderB.resolutionVector[1] += vector[1]; }
          } else {
            if (colliderB.resolutionVector[0]==0) { colliderB.resolutionVector[0] -= vector[0]; }
            if (colliderB.resolutionVector[1]==0) { colliderB.resolutionVector[1] -= vector[1]; }
          }
          if (!collidersToResolve.includes(colliderB.id)) { collidersToResolve.push(colliderB.id); }
          colliderB.collidedFrame = ChoreoGraph.frame;
        } else if (!colliderA.static&&colliderB.static) {
          if (flip) {
            if (colliderA.resolutionVector[0]==0) { colliderA.resolutionVector[0] -= vector[0]; }
            if (colliderA.resolutionVector[1]==0) { colliderA.resolutionVector[1] -= vector[1]; }
          } else {
            if (colliderA.resolutionVector[0]==0) { colliderA.resolutionVector[0] += vector[0]; }
            if (colliderA.resolutionVector[1]==0) { colliderA.resolutionVector[1] += vector[1]; }
          }
          if (!collidersToResolve.includes(colliderA.id)) { collidersToResolve.push(colliderA.id); }
          colliderA.collidedFrame = ChoreoGraph.frame;
        } else {
          if (flip) {
            if (colliderA.resolutionVector[0]==0) { colliderA.resolutionVector[0] -= vector[0]; }
            if (colliderA.resolutionVector[1]==0) { colliderA.resolutionVector[1] -= vector[1]; }
            if (colliderB.resolutionVector[0]==0) { colliderB.resolutionVector[0] += vector[0]; }
            if (colliderB.resolutionVector[1]==0) { colliderB.resolutionVector[1] += vector[1]; }
          } else {
            if (colliderA.resolutionVector[0]==0) { colliderA.resolutionVector[0] += vector[0]; }
            if (colliderA.resolutionVector[1]==0) { colliderA.resolutionVector[1] += vector[1]; }
            if (colliderB.resolutionVector[0]==0) { colliderB.resolutionVector[0] -= vector[0]; }
            if (colliderB.resolutionVector[1]==0) { colliderB.resolutionVector[1] -= vector[1]; }
          }
          if (!collidersToResolve.includes(colliderA.id)) { collidersToResolve.push(colliderA.id); nextWhitelist.push(colliderA.id); }
          if (!collidersToResolve.includes(colliderB.id)) { collidersToResolve.push(colliderB.id); nextWhitelist.push(colliderB.id); }
          colliderA.collidedFrame = ChoreoGraph.frame;
          colliderB.collidedFrame = ChoreoGraph.frame;
        }
      }

      // RESOLVE BASIC PHYSICS COLLISIONS
      for (const id of collidersToResolve) {
        const collider = cg.Physics.colliders[id];

        collider.transform.x += collider.resolutionVector[0];
        collider.transform.y += collider.resolutionVector[1];
        collider.resolutionVector[0] = 0;
        collider.resolutionVector[1] = 0;
      }

      if (cg.Physics.iterationNumber < cg.settings.physics.maximumIterations-1 && nextWhitelist.length > 0) {
        cg.Physics.iterationNumber++;
        ChoreoGraph.Physics.physicsProcessingLoop(cg,nextWhitelist);
      }

      // TRIGGER CALLBACKS
      for (let colliderId of cg.keys.colliders) {
        let collider = cg.Physics.colliders[colliderId];
        if (collider.trigger) {
          let accounted = [];
          for (let comparison of collider.collisions) {
            accounted.push(comparison);
            if (collider.memory.includes(comparison)) {
              if (collider.collide!==null) {
                collider.collide(comparison);
              }
              continue;
            } else {
              if (collider.enter!==null) {
                collider.enter(comparison);
              }
              collider.memory.push(comparison);
            }
          }
          for (let comparison of collider.memory) {
            if (!accounted.includes(comparison)) {
              if (collider.exit!==null) {
                collider.exit(comparison);
              }
              collider.memory = collider.memory.filter(c => c.id !== comparison.id);
            }
          }
        }
      }
    };

    physicsDebugLoop(cg) {
      if (!cg.settings.physics.debug.active) { return; }
      for (let canvasId of cg.keys.canvases) {
        const canvas = cg.canvases[canvasId];
        if (canvas.hideDebugOverlays) { continue; }
        if (canvas.camera==null) { continue; }
        const c = canvas.c;
        for (let colliderId of cg.keys.colliders) {
          let collider = cg.Physics.colliders[colliderId];
          if (collider.transform===null) { continue; }
          c.save();
          let [cx,cy] = collider.getPosition();
          ChoreoGraph.transformContext(canvas.camera,cx,cy);
          collider.draw(c);
          c.restore();
        }

        if (cg.Develop===undefined) { return; }

        let text = `${(cg.Physics.iterationNumber+1)} iteration(s) ${cg.Physics.collisionChecks} check${cg.Physics.collisionChecks===1?"":"s"}`;
        cg.Develop.drawTopLeftText(cg,canvas,text);
      }
    };
  },

  instanceStart(cg) {
    cg.Physics.calibrateCollisionOrder();
  },

  instanceConnect(cg) {
    cg.Physics = new ChoreoGraph.Physics.instanceObject(cg);
    cg.keys.colliders = [];

    cg.processLoops.push(ChoreoGraph.Physics.triggerProcessingLoop);
    cg.predrawLoops.push(ChoreoGraph.Physics.physicsProcessingLoop);

    cg.attachSettings("physics",{
      maximumIterations : 10,
      gravity : 9.8,

      debug : new class {
        style = {
          outlineWidth : 2,
          opacity : 0.2,

          colours : {
            physics : "#00ffff",
            trigger : "#ff9900",
            collided : "#ff0000"
          }
        }

        #cg = cg;
        #active = false;
        set active(value) {
          this.#active = value;
          if (value&&!this.#cg.Physics.hasActivatedDebugLoop) {
            this.#cg.Physics.hasActivatedDebugLoop = true;
            this.#cg.debugLoops.push(ChoreoGraph.Physics.physicsDebugLoop);
          }
        }
        get active() { return this.#active; }
      }
    });

    if (cg.Develop!==undefined) {
      cg.Develop.interfaceItems.push({
        type : "UIToggleButton",
        activeText : "Physics Debug",
        inactiveText : "Physics Debug",
        activated : cg.settings.physics.debug,
        onActive : (cg) => { cg.settings.physics.debug.active = true; },
        onInactive : (cg) => { cg.settings.physics.debug.active = false; },
      });
    };
  }
});

ChoreoGraph.ObjectComponents.RigidBody = class cgObjectRidigBody {
  manifest = {
    type : "RigidBody",
    key : "RigidBody",
    master : true,
    functions : {
      update : true
    }
  }

  gravityScale = 0;
  xv = 0;
  yv = 0;
  collider = null;
  drag = 0;
  mass = 1;
  bounce = false;
  minimumVelocity = 0.00000001;

  constructor(componentInit,object) {
    ChoreoGraph.initObjectComponent(this,componentInit);
    if (this.collider===null) {
      console.warn("RigidBody component requires a collider on object:",object.id);
      return;
    }
    if (this.collider.static) {
      console.warn("Static colliders are not compatible with RigidBody components on object:",this.object.id);
      return;
    }

    delete object.cg.transforms[this.collider.transform.id];
    ChoreoGraph.id.release(this.collider.transform.id);
    this.collider.transform = object.transform;
    this.collider.manual = true;
    this.collider.rigidbody = this;

    if (object.cg.ready) {
      object.cg.Physics.calibrateCollisionOrder();
    }
  };

  update(scene) {
    if (this.collider === null) { return; }
    if (this.collider.static) { return; }

    if (scene.cg.timeDelta>this.cg.settings.core.inactiveTime) {
      return
    }

    let timeDeltaSeconds = scene.cg.timeDelta / 1000;
    this.yv += scene.cg.settings.physics.gravity * this.gravityScale * timeDeltaSeconds;
    let dx = this.xv * timeDeltaSeconds;
    let dy = this.yv * timeDeltaSeconds;
    this.collider.transform.x += dx;
    this.collider.transform.y += dy;

    this.xv *= (1 - this.drag * timeDeltaSeconds);
    this.yv *= (1 - this.drag * timeDeltaSeconds);

    let resolutions = [];

    for (let comparison of this.collider.affiliations) {
      if (comparison.trigger) { continue; }
      const [collided,vector,flip] = ChoreoGraph.Physics.processCollision(this.collider, comparison, true);
      cg.Physics.collisionChecks++;

      if (!collided) { continue; }

      if (comparison.static) {
        if (flip) {
          if (this.collider.resolutionVector[0]==0) { this.collider.resolutionVector[0] -= vector[0]; }
          if (this.collider.resolutionVector[1]==0) { this.collider.resolutionVector[1] -= vector[1]; }
        } else {
          if (this.collider.resolutionVector[0]==0) { this.collider.resolutionVector[0] += vector[0]; }
          if (this.collider.resolutionVector[1]==0) { this.collider.resolutionVector[1] += vector[1]; }
        }
        this.collider.collidedFrame = ChoreoGraph.frame;
        comparison.collidedFrame = ChoreoGraph.frame;
      } else {
        if (flip) {
          if (this.collider.resolutionVector[0]==0) { this.collider.resolutionVector[0] -= vector[0]; }
          if (this.collider.resolutionVector[1]==0) { this.collider.resolutionVector[1] -= vector[1]; }
          if (comparison.resolutionVector[0]==0) { comparison.resolutionVector[0] += vector[0]; }
          if (comparison.resolutionVector[1]==0) { comparison.resolutionVector[1] += vector[1]; }
        } else {
          if (this.collider.resolutionVector[0]==0) { this.collider.resolutionVector[0] += vector[0]; }
          if (this.collider.resolutionVector[1]==0) { this.collider.resolutionVector[1] += vector[1]; }
          if (comparison.resolutionVector[0]==0) { comparison.resolutionVector[0] -= vector[0]; }
          if (comparison.resolutionVector[1]==0) { comparison.resolutionVector[1] -= vector[1]; }
        }
        this.collider.collidedFrame = ChoreoGraph.frame;
        comparison.collidedFrame = ChoreoGraph.frame;
      }
      resolutions.push([comparison,flip]);
    }

    function resetResolutionVectors(collider,comparison) {
      collider.resolutionVector[0] = 0;
      collider.resolutionVector[1] = 0;
      comparison.resolutionVector[0] = 0;
      comparison.resolutionVector[1] = 0;
    }

    for (const [collider,flip] of resolutions) {
      if (collider.static) {
        if (flip) {
          this.collider.transform.x -= this.collider.resolutionVector[0];
          this.collider.transform.y -= this.collider.resolutionVector[1];
        } else {
          this.collider.transform.x += this.collider.resolutionVector[0];
          this.collider.transform.y += this.collider.resolutionVector[1];
        }
      } else {
        collider.transform.x += collider.resolutionVector[0];
        collider.transform.y += collider.resolutionVector[1];
      }

      if (collider.rigidbody === undefined) {
        if (this.bounce) {
          if (this.collider.resolutionVector[0] != 0) { this.xv *= -1; }
          if (this.collider.resolutionVector[1] != 0) { this.yv *= -1; }
        } else {
          this.xv = 0;
          this.yv = 0;
        }
        resetResolutionVectors(this.collider,collider);
        continue;
      }
      if (!this.bounce) {
        this.xv = 0;
        this.yv = 0;
        collider.rigidbody.xv = 0;
        collider.rigidbody.yv = 0;
        resetResolutionVectors(this.collider,collider);
        continue;
      }

      let mrb = this;
      let crb = collider.rigidbody;

      let mmx = mrb.xv * mrb.mass;
      let mmy = mrb.yv * mrb.mass;
      let cmx = crb.xv * crb.mass;
      let cmy = crb.yv * crb.mass;

      let totalX = mmx + cmx;
      let totalY = mmy + cmy;

      mrb.xv = totalX * (1 / (mrb.mass + crb.mass));
      mrb.yv = totalY * (1 / (mrb.mass + crb.mass));
      crb.xv = totalX * -(1 / (mrb.mass + crb.mass));
      crb.yv = totalY * -(1 / (mrb.mass + crb.mass));

      let mmag = Math.sqrt(mrb.xv**2 + mrb.yv**2);
      let cmag = Math.sqrt(crb.xv**2 + crb.yv**2);

      let separationVector;
      if ((this.collider.type=="circle"||this.collider.type=="point") && (collider.type=="circle"||collider.type=="point")) {
        let [acx,acy] = this.collider.getPosition();
        let [bcx,bcy] = collider.getPosition();
        separationVector = [acx - bcx, acy - bcy];
      } else {
        separationVector = [this.collider.resolutionVector[0],this.collider.resolutionVector[1]];
      }
      let unsqrted = separationVector[0]**2 + separationVector[1]**2;

      if (unsqrted!=0) {
        let separationMagnitude = Math.sqrt(unsqrted);
        let separationUnitX = separationVector[0] / separationMagnitude;
        let separationUnitY = separationVector[1] / separationMagnitude;

        mrb.xv = (mmag * separationUnitX);
        mrb.yv = (mmag * separationUnitY);
        crb.xv = (cmag * -separationUnitX);
        crb.yv = (cmag * -separationUnitY);
      }

      resetResolutionVectors(this.collider,collider);
    }

    if (Math.abs(this.xv) < this.minimumVelocity) { this.xv = 0; }
    if (Math.abs(this.yv) < this.minimumVelocity) { this.yv = 0; }
  }
};