ChoreoGraph.plugin({
  name: "Physics",
  key: "Physics",
  version: "1.0",
  settings: {
    "showColliders" : false,
    "additionalColliderInformation" : false,
    "outlineWidth" : 1,
    "physicsCol" : "#00ffff",
    "triggerCol" : "#ff9900",
    "collidedCol" : "#ff0000",
    "opacity" : 0.2
  },
  getCollision(collider, comparison, getVector=false) {
    let detect = ChoreoGraph.plugins.Physics.detect;
    let collided = false;
    let forwardVector = [0,0];
    let backwardVector = [0,0];
    let vector = [0,0];
    if (collider.type=="rectangle"&&comparison.type=="rectangle") {
      [collided,vector] = detect.rectRect(collider, comparison, getVector);
      forwardVector = vector;
      backwardVector = [-vector[0], -vector[1]];
    } else if (collider.type=="circle"&&comparison.type=="circle") {
      [collided,vector] = detect.circleCircle(collider, comparison, getVector);
      forwardVector = vector;
      backwardVector = [-vector[0], -vector[1]];
    } else if (collider.type=="circle"&&comparison.type=="rectangle") {
      [collided,vector] = detect.circleRect(collider, comparison, getVector);
      forwardVector = vector;
      backwardVector = [-vector[0], -vector[1]];
    } else if (collider.type=="rectangle"&&comparison.type=="circle") {
      [collided,vector] = detect.circleRect(comparison, collider, getVector);
      forwardVector = [-vector[0], -vector[1]];
      backwardVector = vector;
    } else if (collider.type=="point"&&comparison.type=="rectangle") {
      [collided,vector] = detect.pointRect(collider, comparison, getVector);
      forwardVector = vector;
      backwardVector = [-vector[0], -vector[1]];
    } else if (collider.type=="rectangle"&&comparison.type=="point") {
      [collided,vector] = detect.pointRect(comparison, collider, getVector);
      forwardVector = [-vector[0], -vector[1]];
      backwardVector = vector;
    } else if (collider.type=="point"&&comparison.type=="circle") {
      [collided,vector] = detect.pointCircle(collider, comparison, getVector);
      forwardVector = vector;
      backwardVector = [-vector[0], -vector[1]];
    } else if (collider.type=="circle"&&comparison.type=="point") {
      [collided,vector] = detect.pointCircle(comparison, collider, getVector);
      forwardVector = [-vector[0], -vector[1]];
      backwardVector = vector;
    } else if (collider.type=="raycast"&&comparison.type=="circle") {
      [collided,vector] = detect.raycastCircle(collider, comparison);
    } else if (collider.type=="circle"&&comparison.type=="raycast") {
      [collided,vector] = detect.raycastCircle(comparison, collider);
    } else if (collider.type=="raycast"&&comparison.type=="rectangle") {
      [collided,vector] = detect.raycastRectangle(collider, comparison);
    } else if (collider.type=="rectangle"&&comparison.type=="raycast") {
      [collided,vector] = detect.raycastRectangle(comparison, collider);
    }
    return [collided,forwardVector,backwardVector];
  },
  processCollision(collider, comparison, getVector, cg) {
    // Reset Collisions
    if (collider.collided&&collider.collidedOn!=ChoreoGraph.run) { collider.collided = false; collider.collisions = []; collider.resolutionVector = [0,0]; }
    if (comparison.collided&&comparison.collidedOn!=ChoreoGraph.run) { comparison.collided = false; comparison.collisions = []; comparison.resolutionVector = [0,0]; }
    // Get information about the comparison of the two colliders
    let [collided,forwardVector,backwardVector] = ChoreoGraph.plugins.Physics.getCollision(collider,comparison,getVector);
    let resolve = !(collider.trigger||comparison.trigger)
    if (collided) {
      collider.collided = true;
      collider.collidedOn = ChoreoGraph.run;
      
      if (!collider.collisions.includes(comparison)) { collider.collisions.push(comparison); }
      comparison.collided = true;
      comparison.collidedOn = ChoreoGraph.run;
      if (!comparison.collisions.includes(collider)) { comparison.collisions.push(collider); }
      if (resolve) { // Physics
        if (collider.collide!=null) { collider.collide(comparison); }
        if (comparison.collide!=null) { comparison.collide(collider); }
        if (forwardVector[0]!=0) { collider.resolutionVector[0] = forwardVector[0]; }
        if (forwardVector[1]!=0) { collider.resolutionVector[1] = forwardVector[1]; }
        if (backwardVector[0]!=0) { comparison.resolutionVector[0] = backwardVector[0]; }
        if (backwardVector[1]!=0) { comparison.resolutionVector[1] = backwardVector[1]; }
      }
    }
  },
  processTriggerChanges(collider, cg) {
    let collisionIds = collider.collisions.map(collider => collider.id);
    for (let id of collisionIds) {
      if (!collider.memory.includes(id)) { // If this collision is new
        let comparison = cg.colliders[id];
        if (collider.enter!=null) { collider.enter(comparison); }
        if (comparison.enter!=null) { comparison.enter(collider);
          comparison.memory = comparison.collisions.map(collider => collider.id);
        }
      }
    }
    for (let id of collider.memory) {
      if (!collisionIds.includes(id)) { // If this collision has ended
        let comparison = cg.colliders[id];
        if (collider?.exit!=null) { collider.exit(comparison,0,comparison,collider.memory); }
        if (comparison?.exit!=null) { comparison.exit(collider,1);
          comparison.memory = comparison.collisions.map(collider => collider.id);
        }
      }
    }
    collider.memory = collisionIds;
  },
  instanceExternalLoops: [function checkCollisions(cg) {
    let settings = ChoreoGraph.plugins.Physics.settings;
    for (let check of cg.collisionOrder) {
      // Collision Check Information
      let collider = check[0];
      let comparison = check[1];
      let getVector = check[2];
      ChoreoGraph.plugins.Physics.processCollision(collider, comparison, getVector, cg);
    }
    for (let id in cg.colliders) {
      let collider = cg.colliders[id];
      if (collider.trigger) {
        ChoreoGraph.plugins.Physics.processTriggerChanges(collider, cg);
      }
    }
    if (settings.showColliders) {
      for (let key in cg.colliders) {
        let collider = cg.colliders[key];
        cg.c.save();
        ChoreoGraph.transformContext(cg,collider.x,collider.y);
        collider.draw();
        if (settings.additionalColliderInformation) {
          cg.c.globalAlpha = 1;
          cg.c.font = 1/cg.z*20+"px Arial";
          cg.c.textBaseline = "middle";
          cg.c.textAlign = "center";
          cg.c.fillStyle = "#999999";
          if (collider.resolutionVector[0]!=0||collider.resolutionVector[1]!=0) {
            cg.c.fillText(collider.resolutionVector,0,-7*(1/cg.z));
          }
          cg.c.fillText(collider.groups,0,7*(1/cg.z));
        }
        cg.c.restore();
      }
    }
  }],
  detect: {
    rectRect(collider1, collider2, getVector=false) {
      let x1 = collider1.x - collider1.width/2;
      let y1 = collider1.y - collider1.height/2;
      let x2 = collider2.x - collider2.width/2;
      let y2 = collider2.y - collider2.height/2;
      let collided = (x1 < x2 + collider2.width && x1 + collider1.width > x2 && y1 < y2 + collider2.height && y1 + collider1.height > y2);
      let vector = [0,0];
      if (getVector&&collided) {
        let dx = (collider1.x - collider2.x);
        let dy = (collider1.y - collider2.y);
        let overlapX = collider1.width/2 + collider2.width/2 - Math.abs(dx);
        let overlapY = collider1.height/2 + collider2.height/2 - Math.abs(dy);
        if (overlapX < overlapY) {
          vector = [overlapX*(dx>0?1:-1), 0];
        } else {
          vector = [0, overlapY*(dy>0?1:-1)];
        }
      }
      return [collided, vector];
    },
    circleCircle(collider1, collider2, getVector=false) {
      let dx = collider1.x - collider2.x;
      let dy = collider1.y - collider2.y;
      let rc = collider1.radius + collider2.radius;
      let collided = rc**2 > dx**2 + dy**2;
      let vector = [0,0];
      if (getVector&&collided) {
        let overlap = rc - Math.sqrt(dx**2 + dy**2)+0.1;
        vector = [dx*(overlap/rc), dy*(overlap/rc)];
      }
      return [collided, vector];
    },
    circleRect(circle, rectangle, getVector=false) {
      let dx = circle.x - Math.max(rectangle.x - rectangle.width/2, Math.min(circle.x, rectangle.x + rectangle.width/2));
      let dy = circle.y - Math.max(rectangle.y - rectangle.height/2, Math.min(circle.y, rectangle.y + rectangle.height/2));
      let collided = dx**2 + dy**2 < circle.radius**2;
      let vector = [0,0];
      if (getVector&&collided) {
        let overlap = circle.radius - Math.sqrt(dx**2 + dy**2)+0.1;
        vector = [dx*(overlap/circle.radius), dy*(overlap/circle.radius)];
      }
      return [collided, vector];
    },
    pointRect(point, rectangle, getVector=false) {
      let collided = point.x > rectangle.x - rectangle.width/2 && point.x < rectangle.x + rectangle.width/2 && point.y > rectangle.y - rectangle.height/2 && point.y < rectangle.y + rectangle.height/2;
      let vector = [0,0];
      if (getVector&&collided) {
        let dx = point.x - rectangle.x;
        let dy = point.y - rectangle.y;
        let overlapX = rectangle.width/2 - Math.abs(dx);
        let overlapY = rectangle.height/2 - Math.abs(dy);
        if (overlapX < overlapY) {
          vector = [overlapX*(dx>0?1:-1), 0];
        } else {
          vector = [0, overlapY*(dy>0?1:-1)];
        }
      }
      return [collided, vector];
    },
    pointCircle(point, circle, getVector=false) {
      let dx = point.x - circle.x;
      let dy = point.y - circle.y;
      let collided = dx**2 + dy**2 < circle.radius**2;
      let vector = [0,0];
      if (getVector&&collided) {
        let overlap = circle.radius - Math.sqrt(dx**2 + dy**2)+0.1;
        vector = [dx*(overlap/circle.radius), dy*(overlap/circle.radius)];
      }
      return [collided, vector];
    },
    raycastCircle(raycast, circle) {
      let rayX = raycast.x;
      let rayY = raycast.y;
      let cirX = circle.x;
      let cirY = circle.y;
      let collided = Math.sqrt((rayX-cirX)**2+(rayY-cirY)**2)<circle.radius;
      let newDistance = 0;
      let newXCollision = rayX;
      let newYCollision = rayY;

      if (collided==false) {
        let CirVecx = circle.x - raycast.x; // Vector from ray to circle x
        let CirVecy = circle.y - raycast.y; // Vector from ray to circle y
        let magRay = Math.sqrt(raycast.dx*raycast.dx+raycast.dy*raycast.dy); // Magnitude of ray vector
        let magCir = Math.sqrt(CirVecx**2 + CirVecy**2); // Magnitude of circle centre vector
        let unitVx = raycast.dx/magRay; // Unit vector of ray x
        let unitVy = raycast.dy/magRay; // Unit vector of ray y
        let a = CirVecx * unitVx + CirVecy * unitVy; // Projection of circle vector onto ray vector
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
      if (collided&&raycast.collided&&raycast.collidedDistance>newDistance) { // If this collision is closer than the previous one, undo the further collision
        raycast.collidedCollider.collisions = raycast.collidedCollider.collisions.filter(collider => collider.id!=raycast.id);
        if (raycast.collidedCollider.collisions.length==0) { raycast.collidedCollider.collided = false; }
      } else if (raycast.collided&&raycast.collidedDistance<newDistance) {
        collided = false;
      }
      if (collided) {
        raycast.collidedDistance = newDistance;
        raycast.collidedCollider = circle;
        raycast.collidedX = newXCollision;
        raycast.collidedY = newYCollision;
      }
      return [collided, [0,0]];
    },
    raycastRectangle(raycast, rectangle) {
      let rayX = raycast.x;
      let rayY = raycast.y;
      let recX = rectangle.x;
      let recY = rectangle.y;
      let recW = rectangle.width;
      let recH = rectangle.height;
      let collided = rayX>recX-recW/2&&rayX<recX+recW/2&&rayY<recY+recH/2&&rayY>recY-recH/2; // if the ray is inside the rectangle
      let top = rectangle.y + rectangle.height/2;
      let bottom = rectangle.y - rectangle.height/2;
      let left = rectangle.x - rectangle.width/2;
      let right = rectangle.x + rectangle.width/2;
      let m = raycast.dy/raycast.dx;
      let c = raycast.y - m*raycast.x;
      let newDistance = 0;
      let newXCollision = rayX;
      let newYCollision = rayY;
      if (raycast.dx>0&&collided==false) { // Check left side
        if (raycast.x+raycast.dx>left) { // If ray is horizontally across the left side
          let y = m*(left)+c;
          let within = (raycast.dy>0&&y>rayY)||(raycast.dy<0&&y<rayY);
          if (y<top&&y>bottom&&within) {
            collided = true;
            newDistance = Math.sqrt((raycast.x-left)**2+(raycast.y-y)**2);
            newXCollision = left;
            newYCollision = y;
          }
        }
      } else if (collided==false) { // Check right side
        if (raycast.x+raycast.dx<right) { // If ray is horizontally across the right side
          let y = m*(right)+c;
          let within = (raycast.dy>0&&y>rayY)||(raycast.dy<0&&y<rayY);
          if (y<top&&y>bottom&&within) {
            collided = true;
            newDistance = Math.sqrt((raycast.x-right)**2+(raycast.y-y)**2);
            newXCollision = right;
            newYCollision = y;
          }
        }
      }
      if (raycast.dy>0&&collided==false) { // Check bottom side
        if (raycast.y+raycast.dy>bottom) { // If ray is vertically across the bottom side
          let x = (bottom-c)/m;
          let within = (raycast.dx>0&&x>rayX)||(raycast.dx<0&&x<rayX);
          if (x<right&&x>left&&within) {
            collided = true;
            newDistance = Math.sqrt((raycast.x-x)**2+(raycast.y-bottom)**2);
            newXCollision = x;
            newYCollision = bottom;
          }
        }
      } else if (collided==false) { // Check top side
        if (raycast.y+raycast.dy<top) { // If ray is vertically across the top side
          let x = (top-c)/m;
          let within = (raycast.dx>0&&x>rayX)||(raycast.dx<0&&x<rayX);
          if (x<right&&x>left&&within) {
            collided = true;
            newDistance = Math.sqrt((raycast.x-x)**2+(raycast.y-top)**2);
            newXCollision = x;
            newYCollision = top;
          }
        }
      }
      if (collided&&raycast.collided&&raycast.collidedDistance>newDistance) { // If this collision is closer than the previous one, undo the further collision
        // At this instance the "collidedCollider" is not going to be the final collision
        raycast.collidedCollider.collisions = raycast.collidedCollider.collisions.filter(collider => collider.id!=raycast.id);
        raycast.collisions = raycast.collisions.filter(collider => collider.id!=raycast.collidedCollider.id);
        if (raycast.collidedCollider.collisions.length==0) { raycast.collidedCollider.collided = false; }
      } else if (raycast.collided&&raycast.collidedDistance<newDistance) {
        collided = false;
      }
      if (collided) {
        raycast.collidedDistance = newDistance;
        raycast.collidedCollider = rectangle;
        raycast.collidedX = newXCollision;
        raycast.collidedY = newYCollision;
        if (newDistance!=0) {
          raycast.unitVectorX = (newXCollision - raycast.x)/newDistance;
          raycast.unitVectorY = (newYCollision - raycast.y)/newDistance;
        }
      }
      return [collided, [0,0]];
    },
    canCompare(collider1, collider2) {
      let alphabeticalType1 = collider1.type;
      let alphabeticalType2 = collider2.type;
      if (collider1.type.localeCompare(collider2.type)===1) {
        alphabeticalType1 = collider2.type;
        alphabeticalType2 = collider1.type;
      }
      if (alphabeticalType1=="rectangle"&&alphabeticalType2=="rectangle") { return true; }
      else if (alphabeticalType1=="circle"&&alphabeticalType2=="circle") { return true; }
      else if (alphabeticalType1=="circle"&&alphabeticalType2=="rectangle") { return true; }
      else if (alphabeticalType1=="circle"&&alphabeticalType2=="raycast") { return true; }
      else if (alphabeticalType1=="circle"&&alphabeticalType2=="point") { return true; }
      else if (alphabeticalType1=="raycast"&&alphabeticalType2=="rectangle") { return true; }
      else if (alphabeticalType1=="raycast"&&alphabeticalType2=="raycast") { return false; }
      else if (alphabeticalType1=="raycast"&&alphabeticalType2=="point") { return false; }
      else if (alphabeticalType1=="rectangle"&&alphabeticalType2=="point") { return true; }
      else if (alphabeticalType1=="point"&&alphabeticalType2=="point") { return false; }
      else { console.warn("Unknown collider comparison",collider1,collider2); return false; }
    }
  },
  instanceConnect(cg) {
    cg.colliders = {};
    cg.colliderCount = 0;
    cg.colliderIds = [];
    cg.collisionOrder = []; // Order of collisions checks
    cg.calibrateCollisionOrder = function () {
      this.collisionOrder = [];
      for (let mi=0;mi<cg.colliderCount;mi++) { // Main Key
        let mid = cg.colliderIds[mi];
        let collider = cg.colliders[mid];
        for (let ci=mi+1;ci<cg.colliderCount;ci++) { // Comparison Key
          let cid = cg.colliderIds[ci];
          let comparison = cg.colliders[cid];

          if (collider.exclude&&comparison.trigger==false) { continue; } // Triggers should be compared to every collider
          if (comparison.exclude&&collider.trigger==false) { continue; }
          if (collider.static&&comparison.static) { continue; } // Two static colliders should never be compared
          if (ChoreoGraph.plugins.Physics.detect.canCompare(collider,comparison)==false) { continue; } // Hardcoded manual override
          let sharesAGroup = false;
          for (let group of collider.groups) { if (comparison.groups.includes(group)) { sharesAGroup = true; break; } }
          if (!sharesAGroup) { continue; }

          let requireResolution = false;  
          if (collider.trigger==false&&comparison.trigger==false) { requireResolution = true; } // A resolution should be calculated for any two vectors where neither are triggers
          this.collisionOrder.push([collider, comparison, requireResolution]);
        }
      }
    }
    cg.createCollider = function(colliderInit) {
      let newCollider = null;
      if (colliderInit!=undefined) {
        if (colliderInit.type=="rectangle") {
          newCollider = new ChoreoGraph.plugins.Physics.RectangleCollider();
        } else if (colliderInit.type=="circle") {
          newCollider = new ChoreoGraph.plugins.Physics.CircleCollider();
        } else if (colliderInit.type=="point") {
          newCollider = new ChoreoGraph.plugins.Physics.PointCollider();
        } else if (colliderInit.type=="raycast") {
          newCollider = new ChoreoGraph.plugins.Physics.RaycastCollider();
        } else {
          console.error("Unknown collider type: " + colliderInit.type);
          return;
        }

        newCollider.collidedOn = 0; // Run/frame that this Collider last collided on

        newCollider.object = null;

        if (newCollider.trigger!==true) { newCollider.trigger = false; } // If true this collider will not do any physics calculations and will only trigger events
        newCollider.static = false; // If true this collider will not be checked against other static colliders
        newCollider.exclude = false; // If true this Collider will not be checked against any other non-trigger collider
        newCollider.groups = [0]; // Groups that this Collider belongs to

        newCollider.collided = false; // If true this Collider is currently colliding with another Collider
        newCollider.collisions = []; // A list of Colliders that this Collider is currently colliding with
        newCollider.resolutionVector = [0,0]; // The resolution vector for the collision
        newCollider.memory = []; // A list of previous collisions
        newCollider.x = 0;
        newCollider.y = 0;

        newCollider.enter = null;
        newCollider.exit = null;
        newCollider.collide = null;

        newCollider.ChoreoGraph = this;
        for (let key in colliderInit) {
          newCollider[key] = colliderInit[key];
        }
        if (newCollider.id===undefined) { newCollider.id = "collider_" + ChoreoGraph.createId(5); }
        this.colliders[newCollider.id] = newCollider;
        this.colliderIds.push(newCollider.id);
        this.colliderCount++;
      }
      this.calibrateCollisionOrder();
      return newCollider;
    }
    if (ChoreoGraph.plugins.TileMaps!==undefined) {

      cg.createCollidersFromTileMap = function(TileMap,xo=0,yo=0,layer=0) {
        if (TileMap===undefined) { console.warn("No TileMap given in createCollidersFromTileMap"); return; }
        let pool = [];
        for (let chunk of TileMap.chunks) {
          if (chunk.layers[layer]==undefined) { continue; }
          for (let t=0; t<chunk.layers[layer].length; t++) {
            let tileNum = chunk.layers[layer][t];
            if (tileNum!=0) {
              let x = t % chunk.width + chunk.x;
              let y = Math.floor(t / chunk.width) + chunk.y;
              pool.push(x+","+y);
            }
          }
        }
        let colliderNumber = 0;
        let colliderGroupName = TileMap.id;
        while (pool.length>0) {
          biggestArea = 0;
          biggestPool = [];
          biggestWidth = 0;
          biggestHeight = 0;
          biggestStart = "";
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
          let topLeftX = xo - (TileMap.tileWidth*TileMap.width)/2;
          let topLeftY = yo - (TileMap.tileHeight*TileMap.height)/2;
          let x = topLeftX + biggestX*TileMap.tileWidth + TileMap.tileWidth/2;
          let y = topLeftY + biggestY*TileMap.tileHeight + TileMap.tileHeight/2;
          let cx = x+(TileMap.tileWidth*biggestWidth)/2-TileMap.tileWidth/2;
          let cy = y+(TileMap.tileHeight*biggestHeight)/2-TileMap.tileHeight/2;
          cg.createCollider({type:"rectangle",id:colliderGroupName+"_"+colliderNumber,x:cx,y:cy,width:TileMap.tileWidth*biggestWidth,height:TileMap.tileHeight*biggestHeight,trigger:false,static:true});
          colliderNumber++;
        }
      }
    }
  },
  setStyles(collider,cg) {
    let settings = ChoreoGraph.plugins.Physics.settings;
    if (collider.collided) {
      cg.c.strokeStyle = settings.collidedCol;
      cg.c.fillStyle = settings.collidedCol;
    } else if (collider.trigger) {
      cg.c.strokeStyle = settings.triggerCol;
      cg.c.fillStyle = settings.triggerCol;
    } else {
      cg.c.strokeStyle = settings.physicsCol;
      cg.c.fillStyle = settings.physicsCol;
    }
    cg.c.lineWidth = settings.outlineWidth;
  },
  RectangleCollider: class RectangleCollider {
    type = "rectangle";
    width = 100;
    height = 100;
    draw() {
      let cg = this.ChoreoGraph;
      ChoreoGraph.plugins.Physics.setStyles(this,cg);
      cg.c.beginPath();
      cg.c.rect(-this.width/2, -this.height/2, this.width, this.height);
      cg.c.globalAlpha = 1;
      cg.c.stroke();
      cg.c.globalAlpha = ChoreoGraph.plugins.Physics.settings.opacity;
      cg.c.fill();
    }
  },
  CircleCollider: class CircleCollider {
    type = "circle";
    radius = 50;
    draw() {
      let cg = this.ChoreoGraph;
      ChoreoGraph.plugins.Physics.setStyles(this,cg);
      cg.c.beginPath();
      cg.c.arc(0, 0, this.radius, 0, 2*Math.PI);
      cg.c.globalAlpha = 1;
      cg.c.stroke();
      cg.c.globalAlpha = ChoreoGraph.plugins.Physics.settings.opacity;
      cg.c.fill();
    }
  },
  PointCollider: class PointCollider {
    type = "point";
    draw() {
      let cg = this.ChoreoGraph;
      ChoreoGraph.plugins.Physics.setStyles(this,cg);
      cg.c.beginPath();
      cg.c.moveTo(0, 6);
      cg.c.lineTo(0, -6);
      cg.c.moveTo(6, 0);
      cg.c.lineTo(-6, 0);
      cg.c.globalAlpha = 1;
      cg.c.stroke();
    }
  },
  RaycastCollider: class RaycastCollider {
    type = "raycast";
    dx = 1;
    dy = 1;

    trigger = true;
    collidedDistance = -1;
    collidedCollider = null;
    collidedX = 0;
    collidedY = 0;
    unitVectorX = 0;
    unitVectorY = 0;
    draw() {
      let cg = this.ChoreoGraph;
      let settings = ChoreoGraph.plugins.Physics.settings;
      cg.c.lineWidth = settings.outlineWidth;
      cg.c.beginPath();
      cg.c.moveTo(-this.unitVectorY*10, this.unitVectorX*10);
      cg.c.lineTo(-this.unitVectorY*-10, this.unitVectorX*-10);
      cg.c.moveTo(0, 0);
      if (this.collided) {
        cg.c.strokeStyle = settings.collidedCol;
        let x = this.unitVectorX*this.collidedDistance;
        let y = this.unitVectorY*this.collidedDistance;
        cg.c.lineTo(x, y);
        cg.c.moveTo(x, y+6);
        cg.c.lineTo(x, y-6);
        cg.c.moveTo(6+x, y);
        cg.c.lineTo(-6+x, y);
        cg.c.stroke();
        cg.c.setLineDash([5, 5]);
        cg.c.strokeStyle = settings.triggerCol;
        cg.c.beginPath();
        cg.c.moveTo(x, y);
        cg.c.lineTo(this.dx,this.dy)
      } else {
        cg.c.strokeStyle = settings.triggerCol;
        cg.c.moveTo(0, 0);
        cg.c.lineTo(this.dx, this.dy);
      }
      cg.c.globalAlpha = 1;
      cg.c.stroke();
    }
  }
});
ChoreoGraph.ObjectComponents.Collider = class Collider {
  manifest = {
    title : "Collider",
    master : false,
    keyOverride : "",
    update : true,
    collapse : true
  }
  collider = null;
  deleteColliderOnCollapse = true;
  ox = 0; // Offset X
  oy = 0; // Offset Y

  constructor(componentInit, object) {
    ChoreoGraph.initObjectComponent(this, componentInit);
    if (this.collider!=null) {
      this.collider.object = object;
      this.collider.moveFunction = function(mx, my) {
        if (object.RigidBody!=undefined) {
          if (Math.abs(mx)>Math.abs(my)) {
            if (mx>0&&object.RigidBody.xv<0) {
              object.RigidBody.xv = 0;
            }
          } else {
            if (my>0&&object.RigidBody.yv>0) {
              object.RigidBody.yv = 0;
            }
          }
        }
        object.Transform.x -= mx;
        object.Transform.y -= my;
      }
    } else {
      console.warn("Collider Component created without a Collider",this.id)
    }
  }
  update(object) {
    this.collider.x = object.Transform.x + this.ox;
    this.collider.y = object.Transform.y + this.oy;
  }
  collapse() {
    if (this.deleteColliderOnCollapse&&this.collider!=null) {
      ChoreoGraph.releaseId(this.collider.id.replace("collider_",""));
      delete this.collider.ChoreoGraph.colliders[this.collider.id];
      this.collider.ChoreoGraph.colliderIds = this.collider.ChoreoGraph.colliderIds.filter(id => id!=this.collider.id);
      this.collider.ChoreoGraph.colliderCount--;
      this.collider.ChoreoGraph.calibrateCollisionOrder();
    }
  }
}

ChoreoGraph.ObjectComponents.RigidBody = class RigidBody {
  manifest = {
    title : "RigidBody",
    master : true,
    keyOverride : "",
    update : true
  }
  gravity = 9.8;
  xv = 0; // X Velocity
  yv = 0; // Y Velocity
  bounce = false;
  collider = null;
  colliderComponent = null;
  useColliderForPhysics = false;

  constructor(componentInit, object) {
    ChoreoGraph.initObjectComponent(this, componentInit);
    if (this.collider==null) {
      this.colliderComponent = object.getComponent("Collider");
      if (this.colliderComponent!=null) {
        this.collider = this.colliderComponent.collider;
      }
    }
    if (this.collider!=null) {
      if (this.useColliderForPhysics) {
        this.collider.trigger = false;
        this.collider.exclude = true;
      }
    }
  }
  update(object) {
    let cg = object.ChoreoGraph;
    let timeDeltaSeconds = cg.timeDelta/1000;
    if (cg.timeDelta>object.ChoreoGraph.settings.inactiveTime) {
      return
    }
    this.yv += (this.gravity*timeDeltaSeconds);
    let dx = this.xv*timeDeltaSeconds;
    let dy = this.yv*timeDeltaSeconds;
    object.Transform.x += dx;
    object.Transform.y += dy;

    if (this.useColliderForPhysics&&this.collider!=null) {
      this.colliderComponent.update(object);
      for (let key in object.ChoreoGraph.colliders) {
        let comparison = object.ChoreoGraph.colliders[key];
        if (comparison==this.collider||comparison.trigger) { continue; }
        ChoreoGraph.plugins.Physics.processCollision(this.collider, comparison, true, object.ChoreoGraph);
      }
      if (this.useColliderForPhysics&&this.collider.collided) {
        if (this.collider.resolutionVector[0]!=0) {
          dx = this.collider.resolutionVector[0];
          if (this.bounce) {
            if (dx>0&&this.xv<0) { this.xv *= -1; }
            else if (dx<0&&this.xv>0) { this.xv *= -1; }
          } else {
            if (dx>0&&this.xv<0) { this.xv = 0; }
            else if (dx<0&&this.xv>0) { this.xv = 0; }
          }
          object.Transform.x += dx;
        }
        if (this.collider.resolutionVector[1]!=0) {
          dy = this.collider.resolutionVector[1];
          if (this.bounce) {
            if (dy>0&&this.yv<0) { this.yv *= -1; }
            else if (dy<0&&this.yv>0) { this.yv *= -1; }
          } else {
            if (dy>0&&this.yv<0) { this.yv = 0; }
            else if (dy<0&&this.yv>0) { this.yv = 0; }
          }
          object.Transform.y += dy;
        }
      }
      this.colliderComponent.update(object);
    }
  }
}
// Willby - 2024