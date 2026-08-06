import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../Context/ThemeContext'
import { SCROLL_CHAPTERS } from '../../utils/landingContent'
import { EASE_OUT } from '../../utils/motion'
import { createRenderer, detectWebGLSupport, disposeScene, prefersReducedMotion } from '../../utils/webgl'

// The one thing on the site that is played rather than read. The section is three
// screens tall and its stage is pinned to the viewport, so scrolling through it does not
// move the stage — it moves the object standing on it. One number, the fraction of the
// section that has gone past, drives the whole scene: the core's noise, the cage around
// it, the halo, the camera, and which chapter of the story is on screen. Nothing here
// runs on a timer, so a reader who stops scrolling stops the scene.

const HALO_COUNT = 1400

const PALETTE = {
  dark: {
    core: [0x1e40af, 0x22d3ee],
    cage: [0x3b82f6, 0xa5f3fc],
    halo: 0x93c5fd,
    coreOpacity: 0.42,
    cageOpacity: 0.5,
    haloOpacity: 0.75,
    additive: true,
  },
  light: {
    core: [0x4f46e5, 0x0ea5e9],
    cage: [0x4338ca, 0x0891b2],
    halo: 0x4f46e5,
    coreOpacity: 0.5,
    cageOpacity: 0.66,
    haloOpacity: 0.5,
    additive: false,
  },
}

// Ashima Arts' simplex noise, the standard compact implementation. It gives the core a
// surface that boils rather than pulses, which is what keeps it from looking like a
// scaling sphere.
const SIMPLEX_NOISE = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;

    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`

const CORE_VERTEX = `
  ${SIMPLEX_NOISE}

  uniform float uTime;
  uniform float uAmp;
  uniform float uDetail;
  varying float vDisp;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void main() {
    float base = snoise((normal * 1.5) + vec3(uTime * 0.22));
    float ridge = snoise((normal * uDetail) - vec3(uTime * 0.16));
    float disp = ((base * 0.68) + (ridge * 0.32)) * uAmp;

    vec3 displaced = position + (normal * disp);
    vec4 world = modelMatrix * vec4(displaced, 1.0);

    gl_Position = projectionMatrix * viewMatrix * world;

    vDisp = disp;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - world.xyz);
  }
`

const CORE_FRAGMENT = `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform float uOpacity;
  uniform float uRim;
  varying float vDisp;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void main() {
    float facing = clamp(dot(normalize(vNormalW), normalize(vViewW)), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.4);

    vec3 tint = mix(uLow, uHigh, smoothstep(-0.35, 0.5, vDisp));
    tint += fresnel * uRim;

    gl_FragColor = vec4(tint, uOpacity * (0.28 + fresnel * 0.85));
  }
`

const HALO_VERTEX = `
  uniform float uTime;
  uniform float uSpread;
  uniform float uSize;
  attribute float aSeed;
  varying float vFade;

  void main() {
    vec3 p = position * (1.0 + uSpread * (0.35 + aSeed * 0.85));

    float swirl = uTime * (0.12 + aSeed * 0.22);
    float s = sin(swirl);
    float c = cos(swirl);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.6 + aSeed * 9.0) * 0.12;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + aSeed) * (6.0 / max(1.0, -mv.z));

    vFade = 0.35 + aSeed * 0.65;
  }
`

const HALO_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float soft = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, soft * vFade * uOpacity);
  }
`

const createCore = () => {
  const geometry = new THREE.IcosahedronGeometry(1.35, 16)

  const shell = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.2 },
      uDetail: { value: 3.4 },
      uOpacity: { value: 0.4 },
      uRim: { value: 0.9 },
      uLow: { value: new THREE.Color() },
      uHigh: { value: new THREE.Color() },
    },
    vertexShader: CORE_VERTEX,
    fragmentShader: CORE_FRAGMENT,
  }))

  // The same displaced surface drawn again as wire, a touch larger and a touch slower,
  // so the object reads as a structure rather than a bubble.
  const lattice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 5), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    wireframe: true,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.2 },
      uDetail: { value: 2.6 },
      uOpacity: { value: 0.5 },
      uRim: { value: 0.5 },
      uLow: { value: new THREE.Color() },
      uHigh: { value: new THREE.Color() },
    },
    vertexShader: CORE_VERTEX,
    fragmentShader: CORE_FRAGMENT,
  }))

  return { shell, lattice }
}

const createHalo = () => {
  const positions = new Float32Array(HALO_COUNT * 3)
  const seeds = new Float32Array(HALO_COUNT)

  for (let index = 0; index < HALO_COUNT; index += 1) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos((Math.random() * 2) - 1)
    const radius = 1.9 + (Math.random() * 0.5)

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[(index * 3) + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72
    positions[(index * 3) + 2] = radius * Math.cos(phi)
    seeds[index] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  return new THREE.Points(geometry, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSpread: { value: 0 },
      uSize: { value: 9 },
      uOpacity: { value: 0.7 },
      uColor: { value: new THREE.Color() },
    },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
  }))
}

const ScrollStage = () => {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const targetRef = useRef(0)
  const [activeChapter, setActiveChapter] = useState(0)
  const [supports3D] = useState(detectWebGLSupport)
  const { isDark } = useTheme()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const railScale = useTransform(scrollYProgress, [0, 1], [0.04, 1])

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    targetRef.current = value

    const next = Math.min(
      SCROLL_CHAPTERS.length - 1,
      Math.max(0, Math.floor(value * SCROLL_CHAPTERS.length)),
    )

    setActiveChapter((current) => (current === next ? current : next))
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current

    if (!canvas || !section || !supports3D) {
      return undefined
    }

    const renderer = createRenderer(THREE, {
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })

    if (!renderer) {
      return undefined
    }

    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60)
    camera.position.set(0, 0, 7.4)

    const group = new THREE.Group()
    const { shell, lattice } = createCore()
    const halo = createHalo()

    group.add(shell, lattice, halo)
    scene.add(group)

    const shaded = [shell.material, lattice.material]

    const handleResize = () => {
      const width = Math.max(canvas.clientWidth, 1)
      const height = Math.max(canvas.clientHeight, 1)

      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      halo.material.uniforms.uSize.value = width < 720 ? 6 : 9

      // Wide enough for two columns: the object moves out of the words and takes the
      // right half of the stage. Narrower than that, it sits behind them.
      group.position.x = width >= 1024 ? 1.9 : 0
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const pointer = { x: 0, y: 0 }
    const handlePointer = (event) => {
      const bounds = canvas.getBoundingClientRect()

      pointer.x = (((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2) - 1
      pointer.y = (((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2) - 1
    }

    window.addEventListener('pointermove', handlePointer, { passive: true })

    const applyTheme = (dark) => {
      const palette = dark ? PALETTE.dark : PALETTE.light
      const blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending

      shell.material.uniforms.uLow.value.setHex(palette.core[0])
      shell.material.uniforms.uHigh.value.setHex(palette.core[1])
      lattice.material.uniforms.uLow.value.setHex(palette.cage[0])
      lattice.material.uniforms.uHigh.value.setHex(palette.cage[1])
      halo.material.uniforms.uColor.value.setHex(palette.halo)

      shell.material.uniforms.uRim.value = dark ? 0.9 : 0.25
      lattice.material.uniforms.uRim.value = dark ? 0.5 : 0.15

      shaded.concat(halo.material).forEach((material) => {
        material.blending = blending
        material.needsUpdate = true
      })

      sceneRef.current.palette = palette
    }

    sceneRef.current = { applyTheme, palette: PALETTE.dark }
    applyTheme(document.documentElement.classList.contains('dark'))

    // The stage is one of two WebGL scenes on the page, so it only draws while it is
    // actually on screen.
    let onScreen = true
    const observer = new IntersectionObserver(
      ([entry]) => { onScreen = entry.isIntersecting },
      { rootMargin: '10% 0px' },
    )

    observer.observe(section)

    const clock = new THREE.Clock()
    const isStill = prefersReducedMotion()
    let frameId = null
    let eased = 0
    let cameraX = 0
    let cameraY = 0

    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame)

      const delta = Math.min(0.05, clock.getDelta())

      if (!onScreen || document.hidden) {
        return
      }

      // Scroll is jumpy — a wheel notch is a step, not a slide. Easing towards the
      // reader's position is what turns those steps back into one movement.
      eased += (targetRef.current - eased) * Math.min(1, delta * (isStill ? 30 : 4.2))

      const { palette } = sceneRef.current
      const arc = Math.sin(eased * Math.PI)

      shaded.forEach((material, index) => {
        if (!isStill) {
          material.uniforms.uTime.value += delta * (index === 0 ? 1 : 0.6)
        }

        material.uniforms.uAmp.value = 0.12 + (arc * 0.46) + (eased * 0.1)
      })

      shell.material.uniforms.uOpacity.value = palette.coreOpacity * (0.6 + (arc * 0.6))
      lattice.material.uniforms.uOpacity.value = palette.cageOpacity * (1 - (eased * 0.35))

      if (!isStill) {
        halo.material.uniforms.uTime.value += delta
      }

      halo.material.uniforms.uSpread.value = 0.15 + (eased * 1.35)
      halo.material.uniforms.uOpacity.value = palette.haloOpacity * (0.35 + (arc * 0.8))

      group.rotation.y = eased * Math.PI * 2.1
      group.rotation.x = (arc * 0.42) - 0.12
      group.scale.setScalar(0.92 + (eased * 0.24))

      cameraX += ((pointer.x * 0.55) - cameraX) * Math.min(1, delta * 2)
      cameraY += ((-pointer.y * 0.42) - cameraY) * Math.min(1, delta * 2)

      camera.position.set(cameraX, cameraY, 7.6 - (eased * 1.7))
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    renderFrame()

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      observer.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', handlePointer)
      sceneRef.current = null
      disposeScene(scene)
      renderer.dispose()
    }
  }, [supports3D])

  useEffect(() => {
    sceneRef.current?.applyTheme(isDark)
  }, [isDark])

  const chapter = SCROLL_CHAPTERS[activeChapter]

  return (
    <section
      ref={sectionRef}
      aria-label="How a course runs, from your first line of code to your last project"
      className="relative h-[320vh]"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="h-full w-full" />
          {/* On a narrow screen the object is behind the chapter, so the chapter gets
              a floor to stand on. */}
          <div className="absolute inset-0 bg-slate-50/70 dark:bg-[#020617]/70 lg:hidden" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
          <div className="flex items-start gap-6">
            {/* The rail is the scrub bar: it fills exactly as far as the section has
                been read, and its dots light as their chapter comes up. */}
            <div className="relative hidden h-56 w-px shrink-0 bg-slate-300 dark:bg-slate-700 sm:block">
              <motion.div
                style={{ scaleY: railScale }}
                className="absolute inset-x-0 top-0 h-full origin-top bg-linear-to-b from-blue-500 to-cyan-400"
              />
              {SCROLL_CHAPTERS.map((item, index) => (
                <span
                  key={item.tag}
                  style={{ top: `${(index / (SCROLL_CHAPTERS.length - 1)) * 100}%` }}
                  className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500 ${
                    index <= activeChapter
                      ? 'scale-125 border-cyan-300 bg-cyan-300 shadow-[0_0_16px_2px_rgb(34_211_238/0.6)]'
                      : 'border-slate-400 bg-slate-200 dark:border-slate-600 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="min-h-[19rem] flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={chapter.tag}
                  initial={{ opacity: 0, y: 26, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -26, filter: 'blur(6px)' }}
                  transition={{ duration: 0.55, ease: EASE_OUT }}
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-600 dark:text-cyan-300">
                    {chapter.tag}
                  </p>

                  <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    {chapter.title}
                  </h2>

                  <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                    {chapter.body}
                  </p>

                  <div className="mt-8 inline-flex items-baseline gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-5 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{chapter.stat}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{chapter.statNote}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrollStage
