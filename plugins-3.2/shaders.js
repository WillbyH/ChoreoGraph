ChoreoGraph.plugin({
  name : "Shaders",
  key : "Shaders",
  version : "1.0",

  globalPackage : new class cgShaders {
    defaultVertexShaderCode = `
      precision mediump float;

      attribute vec2 position;
      varying vec2 texCoords;

      void main() {
        texCoords = (position + 1.0) / 2.0;
        texCoords.y = 1.0 - texCoords.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    defaultFragmentShaderCode = `
      precision mediump float;

      varying vec2 texCoords;
      uniform sampler2D textureSampler;

      void main() {
        vec4 color = texture2D(textureSampler, texCoords);

        gl_FragColor = color;
      }
    `;

    ShaderCanvasSource = class cgShaderCanvasSource {
      source = null;
      program = null;
      texture = null;

      constructor(init,canvas) {
        const gl = canvas.gl;

        // CREATE SHADERS
        let vertexShaderCode;
        if (init.vertexShader===undefined) {
          vertexShaderCode = ChoreoGraph.Shaders.defaultVertexShaderCode;
        } else {
          vertexShaderCode = init.vertexShader;
        }

        let fragmentShaderCode;
        if (init.fragmentShader===undefined) {
          fragmentShaderCode = ChoreoGraph.Shaders.defaultFragmentShaderCode;
        } else {
          fragmentShaderCode = init.fragmentShader;
        }

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderCode);
        gl.compileShader(vertexShader);
        if (gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) === false) {
          console.error("Vertex shader compile error:\n" + gl.getShaderInfoLog(vertexShader));
          return;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderCode);
        gl.compileShader(fragmentShader);
        if (gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) === false) {
          console.error("Fragment shader compile error:\n" + gl.getShaderInfoLog(fragmentShader));
          return;
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        gl.useProgram(this.program);
        if (cg.settings.shaders.debug) {
          gl.validateProgram(this.program);
          if (gl.getProgramParameter(this.program, gl.VALIDATE_STATUS) === false) {
            console.error("Program validation error:\n" + gl.getProgramInfoLog(this.program));
            return;
          }
        }

        // SET UP TEXTURE
        const VERTICES = new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, "position");
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        this.texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
    };
    Canvas = class cgShadersCanvas {
      width = 600;
      height = 400;

      clearColor = {r:1,g:1,b:1,a:1};

      sources = [];

      parentElement = null;

      constructor(init,cg) {
        ChoreoGraph.applyAttributes(this,init);
        if (document.getElementsByTagName("canvas")[0].style.width != "") {
          this.width = element.width;
        } else {
          this.element.width = this.width;
        }
        if (document.getElementsByTagName("canvas")[0].style.height != "") {
          this.height = element.height;
        } else {
          this.element.height = this.height;
        }
        this.gl = this.element.getContext("webgl");

        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      };

      setupParentElement(parentElement) {
        let ro = new ResizeObserver(entries => {
          for (let entry of entries) {
            let cr = entry.contentRect;
            let copyContent = document.createElement("canvas");
            copyContent.width = cr.width;
            copyContent.height = cr.height;
            this.element.width = cr.width;
            this.element.height = cr.height
            this.width = cr.width;
            this.height = cr.height;
            this.gl.viewport(0, 0, this.width, this.height);
            this.draw();
          }
        });
        ro.observe(parentElement);
      };

      addSource(sourceInit={}) {
        let newSource = new ChoreoGraph.Shaders.ShaderCanvasSource(sourceInit,this);
        ChoreoGraph.applyAttributes(newSource,sourceInit);
        this.sources.push(newSource);
        return newSource;
      };

      draw() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (let source of this.sources) {
          gl.useProgram(source.program);
          gl.bindTexture(gl.TEXTURE_2D, source.texture);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.source);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      };
    }
    instanceObject = class cgInstanceShaders {
      canvases = {};

      constructor(cg) {
        this.cg = cg;
      }

      createCanvas(canvasInit={},id=ChoreoGraph.id.get()) {
        if (this.cg.keys.shaderCanvases.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
        let newCanvas = new ChoreoGraph.Shaders.Canvas(canvasInit,this);
        newCanvas.id = id;
        newCanvas.cg = this.cg;
        this.cg.Shaders.canvases[newCanvas.id] = newCanvas;
        this.cg.keys.shaderCanvases.push(newCanvas.id);
        return newCanvas;
      };

      updateShaderCanvases(cg) {
        for (let i=0;i<cg.keys.shaderCanvases.length;i++) {
          let canvas = cg.Shaders.canvases[cg.keys.shaderCanvases[i]];
          canvas.draw();
        }
      };
    };
  },

  instanceConnect(cg) {
    cg.Shaders = new ChoreoGraph.Shaders.instanceObject(cg);
    cg.keys.shaderCanvases = [];

    cg.attachSettings("shaders",{
      debug : false
    });

    cg.overlayLoops.push(cg.Shaders.updateShaderCanvases);
  }
});