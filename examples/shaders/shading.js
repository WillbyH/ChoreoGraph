const cg = ChoreoGraph.instantiate();

cg.createCamera({
  scaleMode : "pixels"
},"main")
.addScene(cg.createScene({},"main"));

cg.createCanvas({element:document.getElementsByTagName("canvas")[0]},"main")
.resizeWithSelf()
.setCamera(cg.cameras.main);

let background = cg.createGraphic({type:"shader",width:cg.cw,height:cg.ch,drawCallback:function(gl,graphic){
  gl.uniform1f(graphic.timeLocation, cg.clock/1000);
  gl.uniform2f(graphic.resolutionLocation, graphic.width, graphic.height);
}},"background");

cg.createImage({file : "Super Perlin 3 - 128x128.png"},"perlin3")
.onLoad = function(image) {
  background.createShader(`
    precision mediump float;

    attribute vec2 position;

    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  `
    precision mediump float;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform sampler2D tex;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      uv.y += sin(uv.x * 3.14 * 5.) / 10.;

      vec2 sampleA = vec2(uv.x, uv.y + u_time);
      vec2 sampleB = vec2(uv.x, uv.y + u_time * 0.5);

      sampleA = fract(sampleA * u_resolution / 600.0);
      sampleB = fract(sampleB * u_resolution / 800.0);

      vec4 colorA = texture2D(tex, sampleA);
      vec4 colorB = texture2D(tex, sampleB);

      float phase = sin(uv.y);

      vec4 color = mix(colorA, colorB, phase);

      vec4 colourA = vec4(.67, .65, .90, 1.);
      vec4 colourB = vec4(.16, .16, .80, 1.);

      float average = (color.r + color.g + color.b) / 3.0;
      color = mix(colourA, colourB, average);

      gl_FragColor = color;
    }
  `);
  let gl = background.gl;
  background.timeLocation = gl.getUniformLocation(background.program, "u_time");
  background.resolutionLocation = gl.getUniformLocation(background.program, "u_resolution");
  background.texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, background.texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.bindTexture(gl.TEXTURE_2D, background.texture);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.image);
}

cg.scenes.main.createItem("graphic",{
  graphic : cg.graphics.background
},"background");

cg.createGraphic({type:"shader",width:120,height:120,drawCallback:function(gl,graphic){
  gl.uniform1f(graphic.uniforms.u_time, cg.clock);
}},"singleShader")
.createShader(`
  precision mediump float;

  attribute vec2 position;
  varying vec2 v_texCoords;

  void main() {
    v_texCoords = (position + 1.) / 2.;
    gl_Position = vec4(position, 0., 1.);
  }
`,
`
  precision mediump float;

  const float radius = .38;
  varying vec2 v_texCoords;
  uniform float u_time;

  float sdOctogon( in vec2 p, in float r )
  {
      const vec3 k = vec3(-0.9238795325, 0.3826834323, 0.4142135623 );
      p = abs(p);
      p -= 2.0*min(dot(vec2( k.x,k.y),p),0.0)*vec2( k.x,k.y);
      p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
      p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
      return length(p)*sign(p.y);
  }

  void main() {
    vec2 uv = v_texCoords;

    float savedY = uv.y;
    uv.y += sin(uv.x * 3.14 * 10. + u_time / 500.) / 15.;
    uv.x += sin(uv.y * 3.14 * 10. + u_time / 500.) / 15.;

    float d = sdOctogon(uv - vec2(.5, .5), radius);

    float a = smoothstep(0., .05, d);
    a = 1. - a;

    vec3 tlColor = vec3(1.0, 0.0, 0.0);
    vec3 brColor = vec3(0.0, 0.0, 1.0);
    vec3 color = mix(tlColor, brColor, uv.x);

    color = color * a;

    gl_FragColor = vec4(color, a);
  }
`);
cg.graphics.singleShader.declareUniform("u_time");

cg.scenes.main.createItem("graphic",{
  graphic : cg.graphics.singleShader,
  transform : cg.createTransform({canvasSpaceXAnchor:0.2,canvasSpaceYAnchor:0.5,r:10,CGSpace:false})
},"single");

cg.callbacks.listen("core","resize",(canvas) => {
  cg.graphics.background.setSize(canvas.width, canvas.height);
  cg.camera.canvasSpaceScale = canvas.width / 400;
})

cg.Shaders.createCanvas({element:document.createElement("canvas"),redrawCanvas : cg.canvas},"shaderCanvas");

cg.Shaders.shaderCanvases.shaderCanvas.addSource({
  source : cg.canvases.main.element,
  fragmentShaderCode : `
    precision mediump float;

    varying vec2 texCoords;
    uniform sampler2D textureSampler;

    void main() {
      vec4 color = texture2D(textureSampler, texCoords);

      color = floor(color * 8.) / 8.;

      gl_FragColor = color;
    }
  `
});

ChoreoGraph.start();