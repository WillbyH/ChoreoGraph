let totalFireflies = 0;
const swarms = [];

cg.createGraphic({
  type : "arc",
  radius : 0.3,
  colour : "#ebff54",
  fill : true
},"firefly");

function createFireflies(x,y,r,count,scene) {
  for (let i=0;i<count;i++) {
    const theta = Math.random()*2*Math.PI;
    const firefly = cg.createObject({
      transformInit : {
        x : x + Math.cos(theta)*(r*Math.random()-0.5),
        y : y + Math.sin(theta)*(r*Math.random()-0.5),
      },
      target : [x + (Math.random()-0.5)*r, y + (Math.random()-0.5)*r],
      blinkRate : Math.random()*3000 + 2000,
      swarmIndex : swarms.length
    },"firefly" + totalFireflies)
    .attach("Graphic",{
      graphic : cg.graphics.firefly,
      collection : "entities",
      transformInit : {o:0.3}
    })
    .attach("Script",{
      updateScript : (object) => {
        const swarm = swarms[object.swarmIndex];
        if (swarm.lastCalculatedPDFH != ChoreoGraph.frame) {
          swarm.playerDistanceFromHome = Math.sqrt(
            (swarm.home[0] - cg.objects.player.transform.x) * (swarm.home[0] - cg.objects.player.transform.x) +
            (swarm.home[1] - cg.objects.player.transform.y) * (swarm.home[1] - cg.objects.player.transform.y)
          );
          swarm.lastCalculatedPDFH = ChoreoGraph.frame;
        }
        const distanceFromTarget = Math.sqrt(
          (object.target[0] - object.transform.x) * (object.target[0] - object.transform.x) +
          (object.target[1] - object.transform.y) * (object.target[1] - object.transform.y)
        );
        if (distanceFromTarget < 1) {
          const theta = Math.random()*2*Math.PI;
          object.target = [
            swarm.home[0] + Math.cos(theta)*(swarm.homeRadius*Math.random()-0.5),
            swarm.home[1] + Math.sin(theta)*(swarm.homeRadius*Math.random()-0.5),
          ];
        } else {
          let dir = [object.target[0] - object.transform.x, object.target[1] - object.transform.y];
          const mag = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
          if (mag == 0) { return; }
          dir[0] /= mag;
          dir[1] /= mag;

          if (cg.timeDelta > cg.settings.core.inactiveTime * 3) { return; }
          object.transform.x += dir[0] * 0.001 * cg.timeDelta;
          object.transform.y += dir[1] * 0.001 * cg.timeDelta;
        }
        const phase = (cg.clock % object.blinkRate) / object.blinkRate;
        let brightness;
        if (phase < 0.5) {
          brightness = phase * 2;
        } else {
          brightness = (1 - phase) * 2;
        }
        if (swarm.playerDistanceFromHome < swarm.homeRadius) {
          brightness *= (swarm.playerDistanceFromHome / swarm.homeRadius * 2) * 0.5;
        }
        object.Graphic.transform.o = brightness;
        object.light.brightness = brightness;
      }
    });

    firefly.light = cg.Lighting.createLight({
      type : "spot",
      transformInit : {parent:firefly.transform},
      outerRadius : 3,
      innerRadius : 2,
      brightness : 1,
      occlude : false,
      hexColour : "#ebff54"
    },"fireflyLight");

    scene.items.lighting.graphic.lights.push(firefly.light);

    scene.addObject(firefly);
    totalFireflies++;
  }

  swarms.push({
    playerDistanceFromHome : 0,
    lastCalculatedPDFH : -1,
    home : [x,y],
    homeRadius : r,
  });
}