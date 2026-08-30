(function () {
  "use strict";

  var VERT = "attribute vec2 a_pos;\nvoid main(){gl_Position=vec4(a_pos,0.0,1.0);}";

  var FRAG = {
    molten: "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform float u_time;\nuniform vec2 u_res;\n\nfloat hash21(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nvec2 hash22(vec2 p) {\n  vec2 n = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));\n  return fract(sin(n) * 43758.5453);\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  float a = hash21(i);\n  float b = hash21(i + vec2(1.0, 0.0));\n  float c = hash21(i + vec2(0.0, 1.0));\n  float d = hash21(i + vec2(1.0, 1.0));\n  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\nfloat fbm(vec2 p) {\n  float v = 0.0;\n  float a = 0.5;\n  vec2 q = p;\n  for (int k = 0; k < 5; k++) {\n    v += a * noise(q);\n    q = q * 2.07 + vec2(11.3, 5.7);\n    a *= 0.5;\n  }\n  return v;\n}\nfloat voronoi_edge(vec2 p) {\n  vec2 n = floor(p);\n  vec2 f = fract(p);\n  float md = 8.0;\n  vec2 mr = vec2(0.0);\n  vec2 mg = vec2(0.0);\n  for (int j = -1; j <= 1; j++) {\n    for (int i = -1; i <= 1; i++) {\n      vec2 g = vec2(float(i), float(j));\n      vec2 o = hash22(n + g);\n      vec2 r = g + o - f;\n      float d = dot(r, r);\n      if (d < md) {\n        md = d;\n        mr = r;\n        mg = g;\n      }\n    }\n  }\n  float ed = 8.0;\n  for (int j = -2; j <= 2; j++) {\n    for (int i = -2; i <= 2; i++) {\n      vec2 g = mg + vec2(float(i), float(j));\n      vec2 o = hash22(n + g);\n      vec2 r = g + o - f;\n      vec2 diff = r - mr;\n      float len2 = dot(diff, diff);\n      if (len2 > 1.0e-6) {\n        ed = min(ed, dot(0.5 * (mr + r), diff * inversesqrt(len2)));\n      }\n    }\n  }\n  return ed;\n}\nvec3 magma_col(float h) {\n  float x = clamp(h, 0.0, 1.0);\n  vec3 c0 = vec3(0.05, 0.008, 0.002);\n  vec3 c1 = vec3(0.42, 0.035, 0.008);\n  vec3 c2 = vec3(0.92, 0.18, 0.015);\n  vec3 c3 = vec3(1.0, 0.52, 0.08);\n  vec3 c4 = vec3(1.0, 0.88, 0.42);\n  if (x < 0.22) return mix(c0, c1, x / 0.22);\n  if (x < 0.50) return mix(c1, c2, (x - 0.22) / 0.28);\n  if (x < 0.78) return mix(c2, c3, (x - 0.50) / 0.28);\n  return mix(c3, c4, (x - 0.78) / 0.22);\n}\nvoid main() {\n  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);\n  float t = u_time;\n  float aspect = u_res.x / max(u_res.y, 1.0);\n  vec2 p = vec2(uv.x * aspect, uv.y);\n  vec2 warp = vec2(fbm(p * 2.4 + vec2(2.1, 0.4)) - 0.5, fbm(p * 2.4 + vec2(8.7, 3.2)) - 0.5);\n  vec2 pw = p + warp * 0.085;\n  float v1 = voronoi_edge(pw * 5.4 + vec2(0.6, 1.2));\n  float v2 = voronoi_edge(pw * 11.0 + vec2(4.8, 0.3));\n  float plates = min(v1, v2 * 0.72 + 0.02);\n  float meander = 0.28 + 0.10 * sin(p.y * 7.2 + 0.85) + 0.035 * sin(p.y * 18.0 + 1.4);\n  float rift = abs(p.x - meander) - 0.012 * (0.6 + fbm(vec2(p.y * 6.0, 2.0)));\n  float trib = abs(p.x - (0.12 + 0.06 * sin(p.y * 9.5 + 2.2))) - 0.004;\n  float trib2 = abs(p.x - (0.44 + 0.05 * sin(p.y * 11.0))) - 0.0035;\n  float channel = min(rift, min(trib, trib2) + 0.008);\n  float crackW = 0.028 + 0.012 * fbm(p * 8.0);\n  float seams = 1.0 - smoothstep(0.0, crackW, plates);\n  float riftFill = 1.0 - smoothstep(-0.006, 0.034, channel);\n  float cracks = max(seams * 0.85, riftFill);\n  float flow = fbm(vec2(p.x * 9.0, p.y * 4.2 - t * 0.18) + warp * 1.6);\n  float pulse = 0.82 + 0.18 * sin(t * 0.7 + p.y * 5.0 + flow * 4.0);\n  float heat = cracks * (0.55 + 0.45 * flow) * pulse;\n  heat += riftFill * (0.35 + 0.40 * flow);\n  heat = clamp(heat, 0.0, 1.0);\n  float bloom = exp(-max(plates, 0.0) * 14.0) * 0.55\n              + exp(-max(channel, 0.0) * 9.0) * 0.85\n              + exp(-max(plates, 0.0) * 4.5) * 0.22;\n  heat = clamp(heat + bloom * 0.38, 0.0, 1.35);\n  float crustN = fbm(p * 22.0 + vec2(3.0, 1.0));\n  float grit = fbm(p * 54.0);\n  vec3 basalt = vec3(0.016, 0.013, 0.011)\n             + crustN * vec3(0.028, 0.022, 0.018)\n             + grit * vec3(0.012, 0.010, 0.008);\n  float raised = smoothstep(0.03, 0.09, plates) * (1.0 - smoothstep(0.09, 0.20, plates));\n  basalt += vec3(0.045, 0.032, 0.022) * raised * (0.4 + crustN);\n  float ash = fbm(p * 7.0 + vec2(9.0, 2.0));\n  basalt = mix(basalt, vec3(0.035, 0.028, 0.024), ash * 0.22 * (1.0 - cracks));\n  vec3 lava = magma_col(heat);\n  float core = pow(clamp(heat, 0.0, 1.0), 3.2);\n  vec3 col = mix(basalt, lava, clamp(heat * 1.15, 0.0, 1.0));\n  col += vec3(1.0, 0.55, 0.12) * bloom * 0.22;\n  col += vec3(1.0, 0.82, 0.28) * core * 0.55;\n  col += vec3(0.55, 0.10, 0.02) * pow(clamp(bloom, 0.0, 1.0), 1.6) * 0.18;\n  float vig = smoothstep(1.15, 0.22, length((uv - vec2(0.5, 0.52)) * vec2(1.15, 1.0)));\n  col *= 0.55 + 0.45 * vig;\n  col *= vec3(1.04, 0.98, 0.90);\n  gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.0)), 1.0);\n}\n",
    aurora: "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform float u_time;\nuniform vec2 u_res;\n\nfloat hash(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  return mix(\n    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),\n    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),\n    u.y\n  );\n}\nfloat fbm(vec2 p) {\n  float v = 0.0;\n  float a = 0.5;\n  vec2 x = p;\n  for (int i = 0; i < 3; i++) {\n    v += a * noise(x);\n    x = x * 2.07 + vec2(11.3, 5.7);\n    a *= 0.5;\n  }\n  return v;\n}\nvoid main() {\n  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);\n  float t = u_time;\n  float x = uv.x;\n  float y = 1.0 - uv.y;\n  vec3 col = mix(vec3(0.006, 0.008, 0.022), vec3(0.016, 0.020, 0.052), y);\n  col = mix(col, vec3(0.045, 0.028, 0.075), smoothstep(0.58, 1.0, y) * 0.40);\n  vec2 g = uv * vec2(64.0, 114.0);\n  vec2 id = floor(g);\n  vec2 fc = fract(g) - 0.5;\n  float h = hash(id);\n  float tw = 0.55 + 0.45 * sin(t * 1.6 + h * 38.0);\n  float star = smoothstep(0.030, 0.0, length(fc)) * step(0.875, h) * tw * (0.30 + 0.70 * hash(id + 4.2));\n  col += vec3(0.80, 0.86, 1.0) * star * smoothstep(0.12, 0.30, y);\n  vec3 aur = vec3(0.0);\n  for (int i = 0; i < 4; i++) {\n    float fi = float(i);\n    float n = fbm(vec2(x * (1.7 + fi * 0.38) + t * (0.11 + fi * 0.035), y * 0.52 + fi * 1.65 + t * 0.045));\n    float nx = x + (n - 0.5) * (0.24 + fi * 0.07);\n    float ridge = 0.5 + 0.5 * sin(nx * (7.4 + fi * 2.2) + t * (0.17 + fi * 0.06) + fi * 1.25);\n    float sheet = pow(ridge, 9.0 + fi * 1.8);\n    float height = smoothstep(0.10, 0.24, y) * smoothstep(0.96, 0.40, y);\n    float glow = sheet * height * pow(max(n * 0.5 + ridge * 0.5, 0.0), 1.25);\n    float veil = pow(n, 1.55) * height * 0.52;\n    float fringe = pow(ridge, 4.0) * (1.0 - pow(ridge, 7.0)) * height;\n    float k = clamp(y * 1.12 - 0.12 + fi * 0.04, 0.0, 1.0);\n    vec3 tone = mix(vec3(0.16, 0.95, 0.38), mix(vec3(0.22, 0.82, 0.78), vec3(0.68, 0.22, 1.0), k), k);\n    aur += tone * (glow * (0.88 - fi * 0.12) + veil * 0.26);\n    aur += vec3(0.72, 0.24, 0.95) * fringe * (0.28 - fi * 0.04);\n  }\n  col += aur;\n  col += vec3(0.10, 0.48, 0.24) * pow(clamp(aur.g, 0.0, 1.0), 1.7) * 0.22;\n  float hill = 0.075 + 0.028 * sin(x * 6.4 + 0.4) + 0.016 * sin(x * 13.5 + 1.7);\n  float ground = smoothstep(hill + 0.018, hill - 0.006, y);\n  col = mix(col, vec3(0.004, 0.006, 0.012), ground);\n  float hz = exp(-abs(y - hill - 0.02) * 22.0) * clamp(aur.g + aur.b, 0.0, 1.0);\n  col += vec3(0.07, 0.20, 0.12) * hz * 0.32 * (1.0 - ground);\n  float vig = smoothstep(1.18, 0.32, length((uv - vec2(0.5, 0.52)) * vec2(1.12, 0.92)));\n  col *= 0.58 + 0.42 * vig;\n  gl_FragColor = vec4(col, 1.0);\n}\n",
    caustics: "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform float u_time;\nuniform vec2 u_res;\n\nfloat hash21(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nvec2 hash22(vec2 p) {\n  float n = sin(dot(p, vec2(127.1, 311.7))) * 43758.5453;\n  return fract(vec2(n, n * 1.215));\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  return mix(\n    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),\n    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),\n    u.y\n  );\n}\nfloat fbm(vec2 p) {\n  float v = 0.0;\n  float a = 0.5;\n  vec2 q = p;\n  for (int i = 0; i < 4; i++) {\n    v += a * noise(q);\n    q = q * 2.07 + vec2(1.7, 9.2);\n    a *= 0.5;\n  }\n  return v;\n}\nfloat causticLattice(vec2 p, float t) {\n  vec2 q = p;\n  q += vec2(sin(q.y * 2.85 + t * 0.62) * 0.22, cos(q.x * 2.55 - t * 0.48) * 0.22);\n  q += vec2(sin(q.y * 5.4 - t * 0.37) * 0.09, cos(q.x * 4.8 + t * 0.41) * 0.09);\n  float w1 = sin(q.x * 7.4 + t * 0.55);\n  float w2 = sin(q.y * 6.6 - t * 0.47);\n  float w3 = sin((q.x + q.y) * 5.15 + t * 0.31);\n  float w4 = sin((q.x - q.y) * 5.85 - t * 0.39);\n  float cell = abs(w1 * w2) * 0.58 + abs(w3 * w4) * 0.42;\n  float web = pow(max(1.0 - cell, 0.0), 4.2);\n  vec2 r = vec2(q.x * 0.766 - q.y * 0.643, q.x * 0.643 + q.y * 0.766);\n  r += vec2(sin(t * 0.29 + 0.8), cos(t * 0.24)) * 0.35;\n  float w5 = sin(r.x * 10.6 + t * 0.72);\n  float w6 = sin(r.y * 9.4 - t * 0.64);\n  float web2 = pow(max(1.0 - abs(w5 * w6), 0.0), 5.1);\n  vec2 s = p * 1.35 + vec2(0.4, -0.2);\n  s += vec2(cos(s.y * 3.2 + t * 0.44), sin(s.x * 3.6 - t * 0.51)) * 0.16;\n  float w7 = sin(s.x * 4.8 - t * 0.28);\n  float w8 = sin(s.y * 5.3 + t * 0.33);\n  float web3 = pow(max(1.0 - abs(w7) * abs(w8), 0.0), 3.6);\n  return clamp(web * 0.70 + web2 * 0.48 + web3 * 0.28, 0.0, 1.5);\n}\nfloat godrays(vec2 uv, float t) {\n  vec2 src = vec2(0.46, -0.08);\n  vec2 d = uv - src;\n  float ang = atan(d.x, d.y + 0.02);\n  float dist = length(d * vec2(1.15, 0.72));\n  float s1 = pow(max(sin(ang * 10.0 + t * 0.13) * 0.5 + 0.5, 0.0), 3.6);\n  float s2 = pow(max(sin(ang * 6.4 - t * 0.09 + 1.7) * 0.5 + 0.5, 0.0), 5.2);\n  float s3 = pow(max(sin(ang * 15.5 + t * 0.07 + 0.4) * 0.5 + 0.5, 0.0), 8.0);\n  float shafts = s1 * 0.62 + s2 * 0.38 + s3 * 0.22;\n  float fall = exp(-dist * 1.05) * smoothstep(1.15, 0.04, uv.y);\n  float haze = 0.18 + 0.82 * shafts;\n  return haze * fall;\n}\nfloat silt(vec2 uv, float t) {\n  float acc = 0.0;\n  vec2 scale = vec2(42.0, 74.0);\n  float drift = t * 0.04;\n  for (int i = 0; i < 3; i++) {\n    float fi = float(i);\n    vec2 g = uv * scale + vec2(fi * 13.1, drift * (0.6 + fi * 0.35));\n    vec2 id = floor(g);\n    vec2 f = fract(g) - 0.5;\n    float n = hash21(id + vec2(fi * 19.0, 3.0));\n    vec2 j = hash22(id + 7.0);\n    float r = 0.012 + n * 0.028;\n    float spark = smoothstep(r, 0.0, length(f - (j - 0.5) * 0.42));\n    acc += spark * step(0.86 + fi * 0.03, n) * (0.35 + 0.65 * n);\n    scale *= 1.85;\n  }\n  return clamp(acc, 0.0, 1.0);\n}\nvoid main() {\n  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);\n  float t = u_time;\n  float aspect = u_res.x / max(u_res.y, 1.0);\n  vec2 p = vec2((uv.x - 0.5) / max(aspect, 0.001), uv.y);\n  float depth = clamp(uv.y, 0.0, 1.0);\n  vec3 abyss = vec3(0.004, 0.018, 0.055);\n  vec3 deep = vec3(0.008, 0.055, 0.118);\n  vec3 mid = vec3(0.018, 0.145, 0.210);\n  vec3 near = vec3(0.055, 0.320, 0.355);\n  vec3 col = abyss;\n  col = mix(col, deep, smoothstep(1.0, 0.62, depth));\n  col = mix(col, mid, smoothstep(0.72, 0.28, depth));\n  col = mix(col, near, smoothstep(0.32, 0.0, depth) * 0.85);\n  float vol = fbm(uv * vec2(3.2, 5.6) + vec2(t * 0.03, 0.0));\n  col *= 0.88 + 0.18 * vol;\n  col += vec3(0.01, 0.04, 0.05) * vol * (1.0 - depth);\n  vec2 latUv = vec2(p.x * 1.15, uv.y * 2.05 + 0.15);\n  float cau = causticLattice(latUv, t);\n  float cauDeep = causticLattice(latUv * 0.62 + vec2(2.4, 1.1), t * 0.7 + 1.8);\n  float depthGate = exp(-depth * 1.55) * (0.35 + 0.65 * smoothstep(1.0, 0.18, depth));\n  float cauAmt = (cau * 0.78 + cauDeep * 0.32) * depthGate;\n  vec3 cauCol = vec3(0.28, 0.92, 0.86);\n  vec3 cauHot = vec3(0.72, 0.98, 0.94);\n  col += cauCol * cauAmt * 0.72;\n  col += cauHot * pow(clamp(cauAmt, 0.0, 1.0), 3.2) * 0.55;\n  float rays = godrays(uv, t);\n  vec3 rayCol = vec3(0.38, 0.88, 0.84);\n  col += rayCol * rays * 0.55;\n  col += vec3(0.70, 0.96, 0.93) * pow(rays, 2.4) * 0.35;\n  col += cauCol * rays * cauAmt * 0.40;\n  float surf = smoothstep(0.22, 0.0, depth);\n  float swell = sin(uv.x * 18.0 + t * 0.9) * 0.012 + sin(uv.x * 9.0 - t * 0.55) * 0.018;\n  float meniscus = smoothstep(0.055 + swell, 0.0, depth);\n  col += vec3(0.42, 0.86, 0.82) * surf * 0.38;\n  col += vec3(0.85, 0.98, 0.96) * meniscus * 0.62;\n  float glitter = pow(max(causticLattice(vec2(uv.x * 8.0, uv.y * 14.0), t * 1.1), 0.0), 6.0);\n  col += vec3(0.90, 1.0, 0.98) * glitter * surf * 0.45;\n  float motes = silt(uv, t);\n  col += vec3(0.55, 0.82, 0.80) * motes * (0.18 + 0.22 * (1.0 - depth));\n  float vig = smoothstep(1.25, 0.22, length(vec2((uv.x - 0.5) * 1.15, (uv.y - 0.28) * 0.85)));\n  col *= 0.62 + 0.38 * vig;\n  col += vec3(0.03, 0.10, 0.12) * (1.0 - vig) * 0.15;\n  col = mix(col, vec3(col.b * 0.55, col.g, col.b * 1.05 + col.g * 0.08), 0.18);\n  col = clamp(col, vec3(0.0), vec3(1.0));\n  gl_FragColor = vec4(col, 1.0);\n}\n",
    "oil-film": "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform float u_time;\nuniform vec2 u_res;\n\nfloat hash21(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  float a = hash21(i);\n  float b = hash21(i + vec2(1.0, 0.0));\n  float c = hash21(i + vec2(0.0, 1.0));\n  float d = hash21(i + vec2(1.0, 1.0));\n  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\nfloat fbm(vec2 p) {\n  vec2 q = p;\n  float v = 0.0;\n  v += 0.50000 * noise(q); q = q * 2.04 + vec2(1.7, 9.2);\n  v += 0.25000 * noise(q); q = q * 2.03 + vec2(8.3, 2.8);\n  v += 0.12500 * noise(q); q = q * 2.01 + vec2(3.1, 5.4);\n  v += 0.06250 * noise(q); q = q * 2.05 + vec2(7.9, 1.6);\n  v += 0.03125 * noise(q);\n  return v;\n}\nvec2 rot(vec2 p, float a) {\n  float c = cos(a);\n  float s = sin(a);\n  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);\n}\nvec2 vortex(vec2 p, vec2 c, float k) {\n  vec2 d = p - c;\n  float r = length(d) + 0.020;\n  return rot(d, k / r) + c;\n}\nvec3 interference(float d) {\n  float tau = max(d, 0.0);\n  float r = 0.5 - 0.5 * cos(6.283185 * tau / 0.655);\n  float g = 0.5 - 0.5 * cos(6.283185 * tau / 0.538);\n  float b = 0.5 - 0.5 * cos(6.283185 * tau / 0.428);\n  return vec3(r, g, b);\n}\nvoid main() {\n  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);\n  float t = u_time;\n  float aspect = u_res.x / max(u_res.y, 1.0);\n  vec2 p = (uv - vec2(0.49, 0.51)) * vec2(aspect, 1.0);\n  p = vortex(p, vec2(-0.03, 0.08), 0.24 + 0.03 * sin(t * 0.31));\n  p = vortex(p, vec2(0.17, -0.23), -0.14);\n  p = vortex(p, vec2(-0.19, -0.35), 0.09);\n  float drift = t * 0.047;\n  vec2 q = p * 2.25 + vec2(drift * 0.55, -drift * 0.28);\n  vec2 w1 = vec2(\n    fbm(q * 1.12 + vec2(0.20, t * 0.06)),\n    fbm(q * 1.12 + vec2(5.70, -t * 0.05))\n  );\n  q += (w1 - vec2(0.5)) * 0.98;\n  vec2 w2 = vec2(\n    fbm(q * 2.48 + vec2(t * 0.04, 1.80)),\n    fbm(q * 2.48 + vec2(8.20, t * 0.033))\n  );\n  q += (w2 - vec2(0.5)) * 0.50;\n  vec2 w3 = vec2(\n    fbm(q * 5.20 + vec2(2.4, 0.7)),\n    fbm(q * 5.20 + vec2(0.9, 4.1))\n  );\n  q += (w3 - vec2(0.5)) * 0.17;\n  float thick = fbm(q * 3.45 + vec2(0.15, -0.22));\n  thick = mix(thick, fbm(q * 6.9 + w2 * 1.45), 0.30);\n  thick = pow(clamp(thick, 0.0, 1.0), 1.48);\n  float contour = sin(thick * 24.0 + fbm(q * 8.2) * 2.6);\n  float filament = abs(contour);\n  float optical = 0.05 + thick * 2.95 + contour * 0.07;\n  vec3 col = interference(optical);\n  col = pow(col, vec3(0.86, 1.08, 0.88));\n  float lime = clamp(col.g - max(col.r, col.b) * 0.90, 0.0, 1.0);\n  col = mix(col, vec3(0.07, 0.60, 0.63), lime);\n  float goldw = clamp(min(col.r, col.g * 1.20) - col.b * 1.05, 0.0, 1.0);\n  col = mix(col, vec3(0.95, 0.70, 0.16), goldw * 0.70);\n  float magw = clamp(min(col.r, col.b) - col.g * 0.80, 0.0, 1.0);\n  col = mix(col, vec3(0.90, 0.07, 0.52), magw * 0.42);\n  float tealw = clamp(min(col.g, col.b) - col.r * 0.75, 0.0, 1.0);\n  col = mix(col, vec3(0.05, 0.68, 0.64), tealw * 0.58);\n  float firstGold = smoothstep(0.26, 0.33, thick) * (1.0 - smoothstep(0.40, 0.48, thick));\n  float petrol = smoothstep(0.48, 0.56, thick) * (1.0 - smoothstep(0.66, 0.78, thick));\n  float magBand = smoothstep(0.36, 0.44, thick) * (1.0 - smoothstep(0.52, 0.60, thick));\n  col = mix(col, vec3(0.93, 0.68, 0.14), firstGold * 0.55);\n  col = mix(col, vec3(0.04, 0.67, 0.63), petrol * 0.50);\n  col = mix(col, vec3(0.88, 0.08, 0.50), magBand * 0.40);\n  col.g *= mix(0.58, 1.0, clamp(col.r * 0.65 + col.b * 0.85, 0.0, 1.0));\n  col *= vec3(1.10, 0.92, 1.04);\n  float well = smoothstep(0.14, 0.40, thick);\n  vec3 water = vec3(0.007, 0.008, 0.012);\n  vec3 toxic = vec3(0.06, 0.012, 0.040);\n  col = mix(mix(water, toxic, 0.24 * thick), col, well);\n  float ridge = pow(1.0 - filament, 11.0) * well;\n  col += vec3(0.92, 0.64, 0.16) * ridge * 0.26;\n  col += vec3(0.72, 0.08, 0.42) * pow(thick, 4.5) * 0.09;\n  float sheen = pow(clamp(1.0 - abs(uv.y - 0.40 - 0.05 * sin(uv.x * 5.5 + t)) * 2.0, 0.0, 1.0), 16.0);\n  col += vec3(0.52, 0.36, 0.22) * sheen * 0.055 * well;\n  float vig = smoothstep(0.96, 0.16, length(p * vec2(1.16, 0.90)));\n  col *= 0.55 + 0.45 * vig;\n  col = pow(clamp(col, vec3(0.0), vec3(1.18)), vec3(0.93));\n  gl_FragColor = vec4(col, 1.0);\n}\n",
    "curl-trap": "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform float u_time;\nuniform vec2 u_res;\n\nfloat hash21(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  float a = hash21(i);\n  float b = hash21(i + vec2(1.0, 0.0));\n  float c = hash21(i + vec2(0.0, 1.0));\n  float d = hash21(i + vec2(1.0, 1.0));\n  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\nfloat fbm(vec2 p) {\n  float v = 0.0;\n  float a = 0.5;\n  vec2 q = p;\n  for (int k = 0; k < 5; k++) {\n    v += a * noise(q);\n    q = q * 2.07 + vec2(11.3, 5.7);\n    a *= 0.5;\n  }\n  return v;\n}\nvec2 curl(vec2 p, float e) {\n  float nL = fbm(p - vec2(e, 0.0));\n  float nR = fbm(p + vec2(e, 0.0));\n  float nD = fbm(p - vec2(0.0, e));\n  float nU = fbm(p + vec2(0.0, e));\n  return vec2(nU - nD, nL - nR) / (2.0 * e);\n}\nvec3 palette(float h) {\n  float x = fract(h);\n  vec3 c0 = vec3(1.00, 0.10, 0.58);\n  vec3 c1 = vec3(1.00, 0.74, 0.08);\n  vec3 c2 = vec3(1.00, 0.28, 0.16);\n  vec3 c3 = vec3(0.06, 0.94, 0.78);\n  vec3 c4 = vec3(0.78, 0.16, 1.00);\n  if (x < 0.25) return mix(c0, c1, x / 0.25);\n  if (x < 0.50) return mix(c1, c2, (x - 0.25) / 0.25);\n  if (x < 0.75) return mix(c2, c3, (x - 0.50) / 0.25);\n  return mix(c3, c4, (x - 0.75) / 0.25);\n}\nvec2 rot(vec2 p, float a) {\n  float c = cos(a);\n  float s = sin(a);\n  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);\n}\nfloat tanh1(float x) {\n  float e = exp(clamp(x * 2.0, -16.0, 16.0));\n  return (e - 1.0) / (e + 1.0);\n}\nvoid main() {\n  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);\n  float t = u_time;\n  vec2 p = (uv - vec2(0.5)) * vec2(0.5625, 1.0) * 2.20;\n  p = rot(p, t * 0.17);\n\n  vec2 pot = p * 1.28 + vec2(t * 0.38, -t * 0.27);\n  vec2 flow = curl(pot, 0.020);\n  p += normalize(flow + vec2(0.0001, 0.0)) * 0.18 * tanh1(length(flow) * 0.08);\n\n  vec2 pot2 = p * 2.55 + vec2(-t * 0.46, t * 0.21) + flow * 0.12;\n  vec2 flow2 = curl(pot2, 0.014);\n  p += flow2 * 0.055;\n\n  float ang = t * 0.73;\n  vec2 c = vec2(-0.54 + 0.24 * cos(ang), 0.52 + 0.20 * sin(ang * 0.71 + 0.35));\n\n  vec2 z = p;\n  float trapA = 4.0;\n  float trapC = 4.0;\n  float trapP = 4.0;\n  float trapR = 4.0;\n  vec2 lastZ = p;\n\n  for (int i = 0; i < 16; i++) {\n    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;\n    float r = length(z);\n    trapA = min(trapA, min(abs(z.x), abs(z.y)));\n    trapC = min(trapC, abs(r - 0.62));\n    trapP = min(trapP, length(z - vec2(0.38 * sin(t * 0.61), 0.28 * cos(t * 0.43))));\n    trapR = min(trapR, r);\n    lastZ = z;\n    if (r > 12.0) break;\n  }\n\n  float filA = exp(-trapA * 16.0);\n  float filC = exp(-trapC * 13.0);\n  float filP = exp(-trapP * 20.0);\n  float filaments = max(filA, max(filC * 0.88, filP * 0.72));\n\n  float ribbon = abs(sin(fbm(p * 2.35 + vec2(t * 0.19, -t * 0.11)) * 6.28318 + t * 0.92));\n  float filR = pow(1.0 - ribbon, 10.0);\n\n  float hue = trapA * 2.2 + trapC * 1.5 + t * 0.14 + length(p) * 0.16 + atan(lastZ.y, lastZ.x) * 0.08;\n  vec3 col = palette(hue);\n  col = mix(col, palette(hue + 0.34), filC);\n  col = mix(col, vec3(1.0, 0.86, 0.32), filP * 0.58);\n  col = mix(col, palette(hue + 0.58 + t * 0.05), filR * 0.45);\n\n  float field = exp(-trapR * 0.48) * 0.28;\n  col = col * (0.22 + 0.92 * filaments + 0.55 * filR);\n  col += palette(hue + 0.5) * field;\n  col += vec3(1.0, 0.52, 0.82) * pow(filaments, 2.2) * 0.70;\n  col += vec3(1.0, 0.90, 0.40) * pow(filA, 3.0) * 0.50;\n  col += vec3(1.0, 0.45, 0.22) * pow(filR, 2.6) * 0.28;\n\n  vec3 bg = vec3(0.07, 0.018, 0.038);\n  float cover = clamp(0.18 + filaments * 1.35 + field * 1.7 + filR * 0.55, 0.0, 1.0);\n  col = mix(bg, col, cover);\n\n  float vig = smoothstep(1.22, 0.26, length((uv - vec2(0.5)) * vec2(1.14, 1.0)));\n  col *= 0.64 + 0.36 * vig;\n  col = pow(clamp(col, vec3(0.0), vec3(1.40)), vec3(0.86));\n  gl_FragColor = vec4(col, 1.0);\n}\n",
    heatmap: "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform float u_time;\nuniform vec2 u_res;\n\nfloat hash21(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n  float a = hash21(i);\n  float b = hash21(i + vec2(1.0, 0.0));\n  float c = hash21(i + vec2(0.0, 1.0));\n  float d = hash21(i + vec2(1.0, 1.0));\n  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\nfloat blob(vec2 uv, vec2 c, vec2 stretch, float k) {\n  vec2 d = (uv - c) * stretch;\n  return exp(-dot(d, d) * k);\n}\nvoid main() {\n  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);\n  float t = u_time;\n  vec3 bg = mix(vec3(0.008, 0.063, 0.078), vec3(0.016, 0.094, 0.125), uv.y);\n  vec2 scale = vec2(22.0, 28.0);\n  vec2 gp = uv * scale;\n  vec2 cell = floor(gp);\n  vec2 gf = fract(gp);\n  float aveX = step(0.78, fract(abs(sin(cell.x * 12.9898) * 43758.5453)));\n  float aveY = step(0.82, fract(abs(sin(cell.y * 78.233) * 23421.631)));\n  float lineW = mix(0.035, 0.078, max(aveX, aveY));\n  float vx = min(gf.x, 1.0 - gf.x);\n  float hy = min(gf.y, 1.0 - gf.y);\n  float street = 1.0 - smoothstep(0.0, lineW, min(vx, hy));\n  float block = 0.04 + 0.10 * hash21(cell);\n  float act = 0.0;\n  act += 1.00 * blob(uv, vec2(0.55 + 0.045 * sin(t * 0.17), 0.48 + 0.030 * cos(t * 0.13)), vec2(1.55, 1.85), 3.4);\n  act += 0.78 * blob(uv, vec2(0.72 + 0.030 * cos(t * 0.11), 0.40 + 0.040 * sin(t * 0.15)), vec2(2.05, 2.35), 4.1);\n  act += 0.58 * blob(uv, vec2(0.28 + 0.050 * sin(t * 0.09), 0.62 + 0.028 * cos(t * 0.19)), vec2(1.75, 2.15), 3.7);\n  act += 0.42 * blob(uv, vec2(0.40 + 0.022 * cos(t * 0.21), 0.22 + 0.038 * sin(t * 0.12)), vec2(2.00, 2.55), 4.5);\n  act += 0.32 * blob(uv, vec2(0.18 + 0.018 * sin(t * 0.14 + 1.2), 0.36 + 0.022 * cos(t * 0.16)), vec2(2.20, 2.40), 5.0);\n  float pulse = 0.84 + 0.16 * sin(t * 0.75 + act * 5.0);\n  act *= pulse;\n  float wash = 0.42 * blob(uv, vec2(0.58 + 0.02 * sin(t * 0.08), 0.45), vec2(1.25, 1.12), 1.55);\n  float traffic = noise(vec2(cell.x * 0.35 + t * 0.55, cell.y * 0.55 - t * 0.22));\n  float heat = clamp(act + wash * 0.55 + street * traffic * 0.18, 0.0, 1.25);\n  vec3 teal = vec3(0.00, 0.62, 0.52);\n  vec3 amber = vec3(1.00, 0.55, 0.12);\n  vec3 orange = vec3(1.00, 0.31, 0.05);\n  vec3 hot = vec3(1.00, 0.86, 0.42);\n  vec3 col = bg + vec3(0.01, 0.03, 0.035) * block;\n  col += teal * street * (0.16 + 0.50 * heat);\n  col += teal * wash * 0.22;\n  col = mix(col, orange, clamp(heat * 0.90, 0.0, 1.0) * (0.28 + 0.72 * street));\n  col = mix(col, amber, clamp((heat - 0.32) * 1.45, 0.0, 1.0) * 0.72);\n  col += hot * pow(clamp(heat, 0.0, 1.0), 2.8) * (0.40 + 0.45 * street);\n  col += vec3(1.0, 0.42, 0.08) * street * pow(clamp(heat, 0.0, 1.0), 1.55) * 0.32;\n  float vig = smoothstep(1.22, 0.28, length((uv - vec2(0.52, 0.46)) * vec2(1.12, 0.95)));\n  col *= 0.62 + 0.38 * vig;\n  gl_FragColor = vec4(clamp(col, vec3(0.0), vec3(1.0)), 1.0);\n}\n"
  };

  var OFFSET = {
    molten: 1.6,
    aurora: 2.0,
    caustics: 2.4,
    "oil-film": 1.9,
    "curl-trap": 1.4,
    heatmap: 0.8
  };

  var MAX_DPR = 1.75;
  var MAX_DIM = 1280;

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh) || "compile failed";
      gl.deleteShader(sh);
      throw new Error(log);
    }
    return sh;
  }

  function link(gl, vs, fs) {
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(prog) || "link failed";
      gl.deleteProgram(prog);
      throw new Error(log);
    }
    return prog;
  }

  function makeWorld(canvas, id) {
    var src = FRAG[id];
    if (!src) return null;
    var opts = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    };
    var gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    if (!gl) return null;
    var prog;
    try {
      prog = link(gl, compile(gl, gl.VERTEX_SHADER, VERT), compile(gl, gl.FRAGMENT_SHADER, src));
    } catch (err) {
      canvas.style.visibility = "hidden";
      return null;
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a_pos");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uRes = gl.getUniformLocation(prog, "u_res");
    var world = {
      canvas: canvas,
      gl: gl,
      prog: prog,
      loc: loc,
      uTime: uTime,
      uRes: uRes,
      visible: false,
      lost: false,
      w: 0,
      h: 0,
      offset: OFFSET[id] || 0,
      resize: function () {
        var cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 1;
        var cssH = canvas.clientHeight || canvas.parentElement.clientHeight || 1;
        var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        var tw = Math.round(cssW * dpr);
        var th = Math.round(cssH * dpr);
        var scale = Math.min(1, MAX_DIM / Math.max(tw, th));
        tw = Math.max(1, Math.round(tw * scale));
        th = Math.max(1, Math.round(th * scale));
        if (tw === world.w && th === world.h) return;
        world.w = tw;
        world.h = th;
        canvas.width = tw;
        canvas.height = th;
      },
      draw: function (now) {
        if (world.lost || !world.visible) return;
        world.resize();
        var g = world.gl;
        g.viewport(0, 0, world.w, world.h);
        g.useProgram(world.prog);
        g.bindBuffer(g.ARRAY_BUFFER, buf);
        g.enableVertexAttribArray(world.loc);
        g.vertexAttribPointer(world.loc, 2, g.FLOAT, false, 0, 0);
        g.uniform1f(world.uTime, now * 0.001 + world.offset);
        g.uniform2f(world.uRes, world.w, world.h);
        g.drawArrays(g.TRIANGLES, 0, 3);
      }
    };
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      world.lost = true;
      canvas.style.visibility = "hidden";
    });
    canvas.addEventListener("webglcontextrestored", function () {
      canvas.style.visibility = "hidden";
    });
    return world;
  }

  function boot() {
    var nodes = document.querySelectorAll("canvas.gl");
    var worlds = [];
    for (var i = 0; i < nodes.length; i++) {
      var c = nodes[i];
      var w = makeWorld(c, c.getAttribute("data-world"));
      if (w) worlds.push(w);
      else c.style.visibility = "hidden";
    }
    if (!worlds.length) return;

    var raf = 0;
    function tick(now) {
      raf = 0;
      var any = false;
      for (var i = 0; i < worlds.length; i++) {
        if (worlds[i].visible && !worlds[i].lost && !pageHidden) {
          worlds[i].draw(now);
          any = true;
        }
      }
      if (any) raf = requestAnimationFrame(tick);
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        for (var j = 0; j < worlds.length; j++) {
          if (worlds[j].canvas === e.target || worlds[j].canvas.parentElement === e.target) {
            worlds[j].visible = e.isIntersecting && e.intersectionRatio > 0.04;
          }
        }
      }
      kick();
    }, { root: document.getElementById("feed"), threshold: [0, 0.04, 0.15, 0.5, 1] });

    for (var i = 0; i < worlds.length; i++) {
      io.observe(worlds[i].canvas.parentElement || worlds[i].canvas);
    }

    var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(function () {
      for (var i = 0; i < worlds.length; i++) {
        worlds[i].w = 0;
        if (worlds[i].visible) worlds[i].resize();
      }
      kick();
    }) : null;
    for (var i = 0; i < worlds.length; i++) {
      if (ro) ro.observe(worlds[i].canvas);
    }

    var pageHidden = false;
    document.addEventListener("visibilitychange", function () {
      pageHidden = document.hidden;
      if (!pageHidden) kick();
    });

    // First slide is on screen before IO may fire.
    worlds[0].visible = true;
    kick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
