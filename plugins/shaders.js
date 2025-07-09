ChoreoGraph.plugin({
  name : "Shaders",
  key : "Shaders",
  version : "1.0",

  globalPackage : new class cgShaders {
    debug = true;

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

    createVertexAndFragmentShader(gl, vertexShaderCode, fragmentShaderCode) {
      if (vertexShaderCode===undefined) {
        vertexShaderCode = ChoreoGraph.Shaders.defaultVertexShaderCode;
      }

      if (fragmentShaderCode===undefined) {
        fragmentShaderCode = ChoreoGraph.Shaders.defaultFragmentShaderCode;
      }

      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vertexShaderCode);
      gl.compileShader(vertexShader);
      if (ChoreoGraph.Shaders.debug && gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) === false) {
        console.error("Vertex shader compile error:\n" + gl.getShaderInfoLog(vertexShader));
        return;
      }

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fragmentShaderCode);
      gl.compileShader(fragmentShader);
      if (ChoreoGraph.Shaders.debug && gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) === false) {
        console.error("Fragment shader compile error:\n" + gl.getShaderInfoLog(fragmentShader));
        return;
      }

      return [vertexShader, fragmentShader];
    };

    ShaderCanvasSource = class cgShaderCanvasSource {
      program = null;
      texture = null;
      shaderCanvas = null;
      sourceCanvas = null;

      lastWidth = 0;
      lastHeight = 0;

      uniforms = {};

      constructor(init,shaderCanvas) {
        const gl = shaderCanvas.gl;
        this.shaderCanvas = shaderCanvas;
        if (init.source === undefined) {
          console.error("ShaderCanvasSource requires a source canvas.");
          return;
        } else {
          this.sourceCanvas = init.source;
          delete init.source;
        }

        // CREATE SHADERS
        const [vertexShader, fragmentShader] = ChoreoGraph.Shaders.createVertexAndFragmentShader(gl, init.vertexShaderCode, init.fragmentShaderCode);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        gl.useProgram(this.program);
        if (ChoreoGraph.Shaders.debug) {
          gl.validateProgram(this.program);
          if (gl.getProgramParameter(this.program, gl.VALIDATE_STATUS) === false) {
            console.error("Program validation error:\n" + gl.getProgramInfoLog(this.program));
            return;
          }
        }

        if (init.uniforms !== undefined) {
          for (let uniformName in init.uniforms) {
            this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
            let type = init.uniforms[uniformName][0];
            let value = init.uniforms[uniformName][1];
            gl["uniform"+type](this.uniforms[uniformName], value);
          }
          delete init.uniforms;
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
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };

      calibrateSize() {
        const gl = this.shaderCanvas.gl;
        this.lastWidth = this.sourceCanvas.width;
        this.lastHeight = this.sourceCanvas.height;
        this.shaderCanvas.width = this.sourceCanvas.width;
        this.shaderCanvas.height = this.sourceCanvas.height;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.sourceCanvas.width, this.sourceCanvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      };
    };

    ShaderCanvas = class cgShadersCanvas {
      width = 600;
      height = 400;

      element = null;
      clearColor = {r:0,g:0,b:0,a:0};
      sources = [];

      gl = null;

      parentElement = null;
      redrawCanvas = null;

      constructor(init,cg) {
        ChoreoGraph.applyAttributes(this,init);
        this.element.width = this.width;
        this.element.height = this.height;
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
          if (source.lastWidth !== source.sourceCanvas.width || source.lastHeight !== source.sourceCanvas.height) {
            source.calibrateSize();
            this.element.width = source.sourceCanvas.width;
            this.element.height = source.sourceCanvas.height;
            this.width = source.sourceCanvas.width;
            this.height = source.sourceCanvas.height;
            gl.viewport(0, 0, this.width, this.height);
          }
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.sourceCanvas);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        if (this.redrawCanvas!=null) {
          let cgCanvas = this.redrawCanvas;
          cgCanvas.c.resetTransform();
          cgCanvas.c.drawImage(this.element, 0, 0, this.width, this.height);
        }
      };
    }
    InstanceObject = class cgInstanceShaders {
      shaderCanvases = {};

      updateIndex = -1;

      constructor(cg) {
        this.cg = cg;
      }

      createCanvas(canvasInit={},id=ChoreoGraph.id.get()) {
        if (this.cg.keys.shaderCanvases.includes(id)) { id += "-" + ChoreoGraph.id.get(); }
        let newCanvas = new ChoreoGraph.Shaders.ShaderCanvas(canvasInit,this);
        newCanvas.id = id;
        newCanvas.cg = this.cg;
        this.cg.Shaders.shaderCanvases[newCanvas.id] = newCanvas;
        this.cg.keys.shaderCanvases.push(newCanvas.id);
        return newCanvas;
      };

      updateShaderCanvases(cg) {
        if (cg.Shaders.updateIndex < cg.overlayLoops.length - 1) {
          cg.overlayLoops.splice(cg.overlayLoops.indexOf(cg.Shaders.updateShaderCanvases), 1);
          cg.overlayLoops.push(cg.Shaders.updateShaderCanvases);
        }
        for (let i=0;i<cg.keys.shaderCanvases.length;i++) {
          let canvas = cg.Shaders.shaderCanvases[cg.keys.shaderCanvases[i]];
          canvas.draw();
        }
      };
    };
  },

  instanceConnect(cg) {
    cg.Shaders = new ChoreoGraph.Shaders.InstanceObject(cg);
    cg.keys.shaderCanvases = [];

    cg.overlayLoops.push(cg.Shaders.updateShaderCanvases);
    cg.Shaders.updateIndex = cg.overlayLoops.indexOf(cg.Shaders.updateShaderCanvases);

    cg.graphicTypes.shader = new class ShaderGraphic {
      setup(init,cg) {
        this.width = init.width || 100;
        this.height = init.height || 100;
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.gl = this.canvas.getContext("webgl",{
          alpha : true,
          premultiplyAlpha : false,
          preserveDrawingBuffer : true,
        });

        if (init.clearColor === undefined) {
          init.clearColor = {r:0,g:0,b:0,a:0};
        }

        this.gl.clearColor(init.clearColor.r, init.clearColor.g, init.clearColor.b, init.clearColor.a);

        this.program = null;
        this.drawCallback = null;

        this.createShader = function(vertexShaderCode, fragmentShaderCode) {
          const [vertexShader, fragmentShader] = ChoreoGraph.Shaders.createVertexAndFragmentShader(this.gl, vertexShaderCode, fragmentShaderCode);

          this.program = this.gl.createProgram();
          this.gl.attachShader(this.program, vertexShader);
          this.gl.attachShader(this.program, fragmentShader);
          this.gl.linkProgram(this.program);

          this.gl.useProgram(this.program);
          if (ChoreoGraph.Shaders.debug) {
            this.gl.validateProgram(this.program);
            if (this.gl.getProgramParameter(this.program, this.gl.VALIDATE_STATUS) === false) {
              console.error("Program validation error:\n" + this.gl.getProgramInfoLog(this.program));
              return;
            }
          }

          let triangles = new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]);
          const vertexBuffer = this.gl.createBuffer();
          this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, triangles, this.gl.STATIC_DRAW);
          const positionLocation = this.gl.getAttribLocation(this.program, "position");
          this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
          this.gl.enableVertexAttribArray(positionLocation);

          return this;
        };

        this.uniforms = {};

        this.declareUniform = function(name) {
          this.uniforms[name] = this.gl.getUniformLocation(this.program, name);
        };

        this.setSize = function(width, height) {
          if (this.width === width && this.height === height) {
            return;
          }
          this.width = width;
          this.height = height;
          this.canvas.width = width;
          this.canvas.height = height;
          this.gl.viewport(0, 0, width, height);
          this.gl.scissor(0, 0, width, height);
        }
      };
      draw(c,ax,ay) {
        if (!this.program) {
          return;
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        if (this.drawCallback) {
          this.drawCallback(this.gl, this);
        }

        c.drawImage(this.canvas, ax-this.width*0.5, ay-this.height*0.5, this.width, this.height);
      };

      getBounds() {
        return [this.width,this.height,0,0];
      };
    };
  }
});