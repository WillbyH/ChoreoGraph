ChoreoGraph.plugin({
  name: "Visualisation",
  key: "Visualisation",
  version: "1.1",
  v: new class Visualisation {
    constructor() {
      this.animations = {
        "active" : false, // Shows lines along the animations
        "pathColours" : ["#0000ff","#ff0000","#00ff00"], // Odd Lerps, Even Lerps, Keyframes
        "style" : {c:"#00ff00",font:"Arial",width:2},
        "markers" : true, // Symbols relating to triggers
        "markerColours" : {S:"#ff00ff",E:"#00ff00",C:"#0000ff",B:"#ff0000",V:"#00ffff",unknown:"#00ff00"}, // Colours for each type of trigger
        "markerStyle" : {size:20,fontSize:25,font:"Arial",offset:[0,0],opacity:0.7},
        "directionalMarkings" : false,
        "directionalMarkingLength" : 10
      },
      this.buttons =  { // Shows the shape/hitbox of onscreen buttons
        "active" : false,
        "opacity" : 0.4,
        "clickedTime" : 300, // Time in ms that the button fades out for
        "style" : {
          "font": "12px Arial",
          "textColour": "#000000",
          "bgNormal": "#ffffff",
          "bgInactive": "#000000",
          "bgHover": "#ff0000",
          "bgClicked": "#000000"
        }
      },
      this.blocks = { // Draws lines with changing colours along the animation path
        "active" : false,
        "animations" : {},
        "showNullMarkers" : false, // Show markers for null blocks
        "colours" : ["#f9f51d","#f54242","#6e6c0c","#feb01d","#ff0000","#855b0d"] // A-Clear A-Blocked A-Overridden B-Clear B-Blocked B-Overridden
      },
      this.objectAnnotation = { // Draws text on objects
        "active" : false,
        "offset" : [0,-40],
        "key" : ["Animator","part"],
        "style" : {
          "textColour": "#ffff00",
          "font": "30px Arial"
        }
      }
      this.camera = {
        "active" : false,
        "colour" : "#76f562"
      }
    }
    drawAnimations(cg) {
      cg.c.font = this.animations.style.font;
  
      let markers = [];
      let paths = [];
      let keyFrames = [];
      let lastPosition = [0,0];
      for (let animid in cg.animations) { // Collect all positions
        let path = [];
        let xi = undefined;
        let yi = undefined;
        let zi = undefined;
        for (let k=0;k<cg.animations[animid].keys.length;k++) {
          if (JSON.stringify(cg.animations[animid].keys[k])==JSON.stringify(cg.settings.animation.animationLinks.x)) { xi = k; }
          if (JSON.stringify(cg.animations[animid].keys[k])==JSON.stringify(cg.settings.animation.animationLinks.y)) { yi = k; }
          if (JSON.stringify(cg.animations[animid].keys[k])==JSON.stringify(cg.settings.animation.animationLinks.r)) { zi = k; }
        }
  
        for (let f = 0; f < cg.animations[animid].data.length; f++) {
          let frame = cg.animations[animid].data[f];
          if (frame.length==0) { continue; }
          if ((typeof(frame[0])=="number")&&xi!=undefined&&yi!=undefined) {
            let x = cg.getTransX(frame[xi]);
            let y = cg.getTransY(frame[yi]);
            let r = 0;
            if (zi!=undefined) { r = frame[zi]; }
            keyFrames.push([x,y,r]);
            path.push([x,y,r]);
            lastPosition = [x,y,r];
          } else if (typeof(frame[0])=="string") {
            let colour = this.animations.markerColours.unknown;
            if (this.animations.markerColours[frame[0].toUpperCase()]!=undefined) { colour = this.animations.markerColours[frame[0].toUpperCase()]; }
            markers.push({x:lastPosition[0],y:lastPosition[1],c:colour,t:frame[1]});
          }
        }
        paths.push(path);
      }
  
      let oddLerps = [];
      let evenLerps = [];
  
      for (let p = 0; p < paths.length; p++) { // Find lerp paths
        for (let f = 0; f < paths[p].length; f++) {
          if (f!=0) {
            if (f%2) {
              oddLerps.push([lastPosition,paths[p][f]]);
            } else {
              evenLerps.push([lastPosition,paths[p][f]]);
            }
          }
          lastPosition = paths[p][f];
        }
      }
  
      cg.c.lineWidth = this.animations.style.width; // Odd lerps
      cg.c.strokeStyle = this.animations.pathColours[0];
      cg.c.beginPath();
      for (let p = 0; p < oddLerps.length; p++) {
        cg.c.moveTo(oddLerps[p][0][0], oddLerps[p][0][1]);
        cg.c.lineTo(oddLerps[p][1][0], oddLerps[p][1][1]);
      }
      cg.c.stroke();
  
      cg.c.strokeStyle = this.animations.pathColours[1]; // Even lerps
      cg.c.beginPath();
      for (let p = 0; p < evenLerps.length; p++) {
        cg.c.moveTo(evenLerps[p][0][0], evenLerps[p][0][1]);
        cg.c.lineTo(evenLerps[p][1][0], evenLerps[p][1][1]);
      }
      cg.c.stroke();
  
      cg.c.strokeStyle = this.animations.pathColours[2];
      cg.c.fillStyle = this.animations.pathColours[2]; // Keyframe dots
      for (let k = 0; k < keyFrames.length; k++) {
        cg.c.fillRect(keyFrames[k][0]-this.animations.style.width/2,keyFrames[k][1]-this.animations.style.width/2,this.animations.style.width,this.animations.style.width);
        if (this.animations.directionalMarkings) { // Directional markings
          let rotation = keyFrames[k][2];
          cg.c.beginPath();
          cg.c.moveTo(keyFrames[k][0],keyFrames[k][1]);
          cg.c.lineTo(parseFloat((keyFrames[k][0]+(this.animations.directionalMarkingLength*cg.z)*Math.cos(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)), parseFloat((keyFrames[k][1]-(this.animations.directionalMarkingLength*cg.z)*Math.sin(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)));
          cg.c.stroke();
          cg.c.beginPath();
          cg.c.arc(parseFloat((keyFrames[k][0]+(this.animations.directionalMarkingLength*cg.z)*Math.cos(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)), parseFloat((keyFrames[k][1]-(this.animations.directionalMarkingLength*cg.z)*Math.sin(ChoreoGraph.degreeToRadianStandard(rotation))).toFixed(2)),this.animations.style.width,0,2*Math.PI);
          cg.c.fill();
        }
      }
  
      cg.c.textAlign = "center";
      cg.c.font = this.animations.markerStyle.fontSize + "px " + this.animations.markerStyle.font;
      cg.c.textBaseline = "middle";
      if (this.animations.markers) {
        for (let m = 0; m < markers.length; m++) {
          cg.c.fillStyle = markers[m].c;
          cg.c.globalAlpha = this.animations.markerStyle.opacity;
          cg.c.beginPath();
          cg.c.arc(markers[m].x,markers[m].y,this.animations.markerStyle.size,0,2*Math.PI);
          cg.c.fill();
          cg.c.globalAlpha = 1;
          let split = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(markers[m].c); // Decide if marker text colour is white or black by background
          if (split!=null) {
            let rbg = split ? split.map(i => parseInt(i, 16)).slice(1) : null;
            if (rbg[0]*0.299+rbg[1]*0.587+rbg[2]*0.114<186) { cg.c.fillStyle = "#ffffff"; } 
            else { cg.c.fillStyle = "#000000"; }
          } else { cg.c.fillStyle = "#ffffff"; }
          cg.c.textBaseline = "middle";
          cg.c.fillText(markers[m].t, markers[m].x+this.animations.markerStyle.offset[0]*cg.z, markers[m].y+this.animations.markerStyle.offset[1]*cg.z,this.animations.markerStyle.size*4*cg.z);
        }
      }
    }
    drawButtons(cg) {
      cg.c.font = this.buttons.style.font;
      cg.c.globalAlpha = this.buttons.opacity;
      // DRAW SHAPES
      for (let f in cg.buttons) {
        let button = cg.buttons[f];
        cg.c.fillStyle = this.buttons.style.bgNormal;
        if (cg.buttonChecks[button.check]==false){cg.c.fillStyle=this.buttons.style.bgInactive;}
        if (button.hovered){cg.c.fillStyle=this.buttons.style.bgHover;}
        if (button.pressed){cg.c.fillStyle=this.buttons.style.bgClicked;}
        if (ChoreoGraph.nowint-button.upTime<this.buttons.clickedTime) {
          cg.c.fillStyle = ChoreoGraph.colourLerp(this.buttons.style.bgClicked,cg.c.fillStyle,(ChoreoGraph.nowint-cg.buttons[f].upTime)/this.buttons.clickedTime);
        }
        cg.c.save();
        ChoreoGraph.transformContext(cg,button.x,button.y,0,1,1,button.CGSpace,false,false,button.canvasSpaceXAnchor,button.canvasSpaceYAnchor);

        if (button.type=="rect") {
          cg.c.fillRect(-button.width/2, -button.height/2, button.width, button.height);
        } else if (button.type=="circle") {
          cg.c.beginPath();
          cg.c.arc(0, 0, button.radius, 0, 2 * Math.PI);
          cg.c.fill();
        } else if (button.type=="polygon") {
          cg.c.beginPath();
          cg.c.moveTo(button.path[0][0], button.path[0][1]);
          for (let i=1;i<button.path.length;i++) {
            cg.c.lineTo(button.path[i][0], button.path[i][1]);
          }
          cg.c.fill();
        }
        cg.c.restore();
      }
      // DRAW TITLES
      cg.c.globalAlpha = 1;
      cg.c.textAlign = "center";
      cg.c.textBaseline = "middle";
      cg.c.fillStyle = this.buttons.style.textColour;
      for (let f in cg.buttons) { 
        let button = cg.buttons[f];
        cg.c.save();
        ChoreoGraph.transformContext(cg,button.x,button.y,0,1,1,button.CGSpace,false,false,button.canvasSpaceXAnchor,button.canvasSpaceYAnchor);

        if (button.type=="rect") {
          cg.c.fillText(f, 0, 0, button.width);
        } else if (button.type=="circle") {
          cg.c.fillText(f, 0, 0, button.radius*2);
        } else if (button.type=="polygon") {
          cg.c.fillText(f, 0, 0);
        }
        cg.c.restore();
      }
    }
    drawObjectAnnotation(cg) {
      let h = cg.ch;
      let w = cg.cw;
      let z = cg.z;
      cg.c.font = this.objectAnnotation.style.font;
      cg.c.fillStyle = this.objectAnnotation.style.textColour;
      cg.c.textAlign = "center";
      cg.c.textBaseline = "middle";
      for (let id in cg.objects) {
        let object = cg.objects[id];
        if (object.Transform!=undefined) {
          let annotation = this.objectAnnotation.key.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object);
          if (annotation==undefined) { continue; }
          cg.c.fillText(annotation, cg.getTransX(object.Transform.x+this.objectAnnotation.offset[0]), cg.getTransY(object.Transform.y+this.objectAnnotation.offset[1]));
        }
      }
    }
    drawBlocks(cg) {
      cg.c.strokeStyle = this.blocks.colours[0];
      let last_x_y = [0,0];
      let colourtoggle = true;
      let current_block = "null";
      for (let animNum in this.blocks.animations[cg.id]) {
        let Anim = this.blocks.animations[cg.id][animNum];
        let path = Anim.data;
        if (path.length!=0) {
          cg.c.lineWidth = 10;
          cg.c.beginPath()
          for (let f = 0; f < path.length; f++) {
            let frame_d = path[f];
            if ((typeof(frame_d[0])=="number")) { // On keyframes
              if (current_block!="null") { cg.c.lineTo(cg.getTransX(frame_d[0]), cg.getTransY(frame_d[1])); }
            } else if (frame_d[0]=="b") {
              current_block = frame_d[1];
              if (current_block==null) {
                current_block = "null";
              }
              cg.c.stroke()
              cg.c.beginPath()
              if (colourtoggle) {
                if (cg.blocks[current_block.toString()].override) { cg.c.strokeStyle = this.blocks.colours[2];
                } else if (cg.blocks[current_block.toString()].clear) { cg.c.strokeStyle = this.blocks.colours[0]; } else { cg.c.strokeStyle = this.blocks.colours[1]; }
              }
              else {
                if (cg.blocks[current_block.toString()].override) { cg.c.strokeStyle = this.blocks.colours[5];
                } else if (cg.blocks[current_block.toString()].clear) { 
                  cg.c.strokeStyle = this.blocks.colours[3]; } else { cg.c.strokeStyle = this.blocks.colours[4]; }
              }
              colourtoggle = (!(colourtoggle));
              cg.c.moveTo(cg.getTransX(last_x_y[0]), cg.getTransY(last_x_y[1]));
            }
            last_x_y = [frame_d[0], frame_d[1]];
          }
        }
        cg.c.stroke()
      }
      // Indicator Circles
      for (let animid in cg.animations) {
        let pat = cg.animations[animid].data;
        let last_x_y = [0,0];
        if (pat.length!=0) {
          for (let i = 0; i < pat.length; i++) {
            if (pat[i][1]==null&&!this.blocks.showNullMarkers) { continue; }
            if (pat[i][0]=="b") {
              cg.c.fillStyle = "red";
              cg.c.beginPath();
              cg.c.arc(cg.getTransX(last_x_y[0]),cg.getTransY(last_x_y[1]),10,0,Math.PI*2);
              cg.c.fill();
              cg.c.fillStyle = "white";
              cg.c.font = "bold 13px Arial";
              cg.c.textAlign = "center";
              cg.c.textBaseline = "middle";
              cg.c.fillText(pat[i][1],cg.getTransX(last_x_y[0]),cg.getTransY(last_x_y[1])+1,30)
            } else if (typeof(pat[i][0])=="number") {
              last_x_y = [pat[i][0], pat[i][1]];
            }
          }
        }
      }
    }
    drawCamera(cg) {
      let centreX = cg.getTransX(cg.camera.x);
      let centreY = cg.getTransY(cg.camera.y);
      let cameraWidth = cg.cw;
      let cameraHeight = cg.ch;
      let scaler = 1;
      if (cg.camera.scaleMode=="pixels") {
        scaler = cg.camera.z*cg.camera.scale;
      } else if (cg.camera.scaleMode=="maximum") {
        if (cg.cw*(cg.camera.WHRatio)>cg.ch*(1-cg.camera.WHRatio)) {
          scaler = cg.camera.z*(cg.cw/cg.camera.maximumSize);
        } else {
          scaler = cg.camera.z*(cg.ch/cg.camera.maximumSize);
        }
      }
      cameraWidth = cameraWidth/scaler*cg.z;
      cameraHeight = cameraHeight/scaler*cg.z;
      cg.c.strokeStyle = this.camera.colour;
      cg.c.lineWidth = 1.5;
      cg.c.strokeRect(centreX-cameraWidth/2,centreY-cameraHeight/2,cameraWidth,cameraHeight);
      cg.c.beginPath();
      cg.c.moveTo(centreX-cameraWidth/2,centreY-cameraHeight/2);
      cg.c.lineTo(centreX+cameraWidth/2,centreY+cameraHeight/2);
      cg.c.moveTo(centreX-cameraWidth/2,centreY+cameraHeight/2);
      cg.c.lineTo(centreX+cameraWidth/2,centreY-cameraHeight/2);
      cg.c.stroke();
    }
  },
  instanceExternalLoops: [function VisualisationLoop(cg) {
    cg.c.save();
    cg.c.resetTransform();
    if (ChoreoGraph.plugins.Visualisation.v.animations.active) { ChoreoGraph.plugins.Visualisation.v.drawAnimations(cg); }
    if (ChoreoGraph.plugins.Visualisation.v.objectAnnotation.active) { ChoreoGraph.plugins.Visualisation.v.drawObjectAnnotation(cg); }
    if (ChoreoGraph.plugins.Visualisation.v.blocks.active) { ChoreoGraph.plugins.Visualisation.v.drawBlocks(cg); }
    cg.c.restore();
    if (ChoreoGraph.plugins.Visualisation.v.buttons.active) { ChoreoGraph.plugins.Visualisation.v.drawButtons(cg); }
    if (ChoreoGraph.plugins.Visualisation.v.camera.active) { ChoreoGraph.plugins.Visualisation.v.drawCamera(cg); }
  }]
});
// Willby - 2024