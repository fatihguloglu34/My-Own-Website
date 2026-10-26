(function () {
  const canvas = document.getElementById("topo");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });

  if (!gl) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  const vertexSource = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const fragmentSource = `
    precision highp float;

    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uMouseAmt;
    uniform vec2 uPeak;
    uniform float uPeakAmt;
    uniform float uAmp;
    uniform float uScroll;
    uniform float uVignette;
    uniform vec3 uBg;
    uniform vec3 uTeal;
    uniform vec3 uAccent;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 frag = gl_FragCoord.xy;
      vec2 p = (frag - 0.5 * uRes) / uRes.y;
      p.y -= uScroll;
      float t = uTime * 0.045;

      vec2 warp = vec2(snoise(vec3(p * 0.7, t)), snoise(vec3(p * 0.7 + 5.2, t)));
      float amber = snoise(vec3(p * 0.85 + warp * 0.7, t * 0.8));
      float teal = snoise(vec3(p * 0.75 - warp * 0.6 + 3.7, t * 0.65));
      float band = snoise(vec3(p.x * 1.6, p.y * 0.5 + warp.y, t * 1.2));

      amber = smoothstep(0.05, 0.95, amber);
      teal = smoothstep(-0.1, 0.9, teal);
      band = smoothstep(0.35, 1.0, band);

      float dk = length((frag - uPeak) / uRes.y);
      float dm = length((frag - uMouse) / uRes.y);
      float peak = exp(-dk * dk * 5.5) * uPeakAmt;
      float mouse = exp(-dm * dm * 9.0) * uMouseAmt;

      vec3 col = uBg;
      col = mix(col, uTeal, teal * 0.55 * uAmp);
      col = mix(col, uAccent, amber * 0.2 * uAmp);
      col = mix(col, uAccent, band * 0.12 * uAmp);
      col = mix(col, uAccent, peak * 0.32 * uAmp);
      col = mix(col, uAccent, mouse * 0.17);
      col = mix(col, uTeal * 1.6, mouse * 0.08);

      vec2 q = frag / uRes;
      float vig = smoothstep(1.2, 0.25, length((q - 0.5) * vec2(1.0, 1.25)));
      col = mix(col, col * vig, uVignette);

      col += (hash(frag + uTime) - 0.5) / 255.0 * 1.5;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    document.documentElement.classList.add("no-webgl");
    return;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ["uRes", "uTime", "uMouse", "uMouseAmt", "uPeak", "uPeakAmt", "uAmp", "uScroll", "uVignette", "uBg", "uTeal", "uAccent"].forEach((name) => {
    u[name] = gl.getUniformLocation(program, name);
  });

  const state = {
    scale: 1,
    width: 0,
    height: 0,
    mouse: { x: -9999, y: -9999, tx: -9999, ty: -9999, amt: 0, tamt: 0 },
    peak: { x: 0, y: 0, tx: 0, ty: 0, amt: 0, tamt: 0 },
    amp: 0,
    tamp: 1,
    scroll: 0,
    vignette: 0.4,
    colors: { bg: [0, 0, 0], teal: [0, 0.3, 0.3], accent: [1, 0.7, 0] },
    start: performance.now(),
  };

  function hexToRgb(hex) {
    hex = hex.trim().replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function readColors() {
    const css = getComputedStyle(document.documentElement);
    state.colors.bg = hexToRgb(css.getPropertyValue("--topo-bg") || "#071114");
    state.colors.teal = hexToRgb(css.getPropertyValue("--topo-teal") || "#0f5a5f");
    state.colors.accent = hexToRgb(css.getPropertyValue("--topo-accent") || "#f2b705");
    state.vignette = document.documentElement.getAttribute("data-theme") === "light" ? 0 : 0.4;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    state.scale = 0.5;
    state.width = Math.round(cssW * state.scale);
    state.height = Math.round(cssH * state.scale);
    canvas.width = state.width;
    canvas.height = state.height;
    gl.viewport(0, 0, state.width, state.height);
  }

  function draw(now) {
    const s = state;
    const time = reduceMotion ? 30 : (now - s.start) / 1000;
    const k = reduceMotion ? 1 : 0.07;

    s.mouse.x += (s.mouse.tx - s.mouse.x) * 0.08;
    s.mouse.y += (s.mouse.ty - s.mouse.y) * 0.08;
    s.mouse.amt += (s.mouse.tamt - s.mouse.amt) * 0.04;
    s.peak.x += (s.peak.tx - s.peak.x) * k;
    s.peak.y += (s.peak.ty - s.peak.y) * k;
    s.peak.amt += (s.peak.tamt - s.peak.amt) * k;
    s.amp += (s.tamp - s.amp) * (reduceMotion ? 1 : 0.04);

    gl.uniform2f(u.uRes, s.width, s.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform2f(u.uMouse, s.mouse.x * s.scale, s.height - s.mouse.y * s.scale);
    gl.uniform1f(u.uMouseAmt, s.mouse.amt);
    gl.uniform2f(u.uPeak, s.peak.x * s.scale, s.height - s.peak.y * s.scale);
    gl.uniform1f(u.uPeakAmt, s.peak.amt);
    gl.uniform1f(u.uAmp, s.amp);
    gl.uniform1f(u.uScroll, s.scroll);
    gl.uniform1f(u.uVignette, s.vignette);
    gl.uniform3fv(u.uBg, s.colors.bg);
    gl.uniform3fv(u.uTeal, s.colors.teal);
    gl.uniform3fv(u.uAccent, s.colors.accent);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    draw(now);
    requestAnimationFrame(loop);
  }

  readColors();
  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) draw(performance.now());
  });

  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      state.mouse.tx = e.clientX;
      state.mouse.ty = e.clientY;
      if (state.mouse.x < -999) {
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
      }
      state.mouse.tamt = 1;
    }, { passive: true });

    document.addEventListener("pointerleave", () => {
      state.mouse.tamt = 0;
    });
  }

  if (reduceMotion) {
    state.amp = state.tamp;
    draw(performance.now());
  } else {
    requestAnimationFrame(loop);
  }
  canvas.classList.add("is-ready");

  window.Topo = {
    setPeak(x, y, amt) {
      state.peak.tx = x;
      state.peak.ty = y;
      state.peak.tamt = amt;
      if (state.peak.x === 0 && state.peak.y === 0) {
        state.peak.x = x;
        state.peak.y = y;
      }
      if (reduceMotion) draw(performance.now());
    },
    setAmp(amp) {
      state.tamp = amp;
    },
    setScroll(px) {
      state.scroll = (px / Math.max(1, window.innerHeight)) * 0.12;
    },
    refreshColors() {
      readColors();
      draw(performance.now());
    },
  };
})();
