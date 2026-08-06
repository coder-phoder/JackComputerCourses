import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useTheme } from '../../Context/ThemeContext'
import { createRenderer, detectWebGLSupport, disposeScene, prefersReducedMotion } from '../../utils/webgl'

// The floor under every public page: a wireframe landscape running to a horizon with a
// thin fall of code glyphs above it. It is drawn once, behind the whole site, and reacts
// to two things only — where the pointer is, and how far down the page the reader has
// come. Scrolling flattens and dims it, so the further into the writing you are the less
// there is behind the words.

const GLYPHS = ['0', '1', '<', '>', '/', '\\', '{', '}', ';', '=', '+', '*', '#', '[', ']', '$']
const ATLAS_CELL = 64
const ATLAS_GRID = 4

// Columns of falling glyphs, and how many glyphs make up one trail.
const COLUMNS = 150
const PER_COLUMN = 12

// The landscape is a grid of line segments; these are its size in world units and in
// cells. Enough cells to read as a mesh, few enough to stay one draw call of thin lines.
const TERRAIN_WIDTH = 300
const TERRAIN_DEPTH = 420
const TERRAIN_COLS = 84
const TERRAIN_ROWS = 88

const CAMERA_Z = 46
const HALF_FOV_TAN = 0.577

const PALETTE = {
  dark: {
    terrain: [0x1e3a8a, 0x3b82f6, 0x67e8f9],
    rain: [0x1d4ed8, 0x38bdf8, 0xd8fdff],
    terrainOpacity: 1.15,
    rainOpacity: 0.85,
    additive: true,
  },
  light: {
    terrain: [0x94a3b8, 0x6366f1, 0x0ea5e9],
    rain: [0xc7d2fe, 0x6366f1, 0x1e3a8a],
    terrainOpacity: 0.5,
    rainOpacity: 0.32,
    additive: false,
  },
}

// One canvas holding every glyph, so the whole fall is a single Points draw sampling a
// 4x4 atlas rather than sixteen textures.
const createGlyphAtlas = () => {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_CELL * ATLAS_GRID
  canvas.height = ATLAS_CELL * ATLAS_GRID

  const context = canvas.getContext('2d')
  context.font = '500 42px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#ffffff'

  GLYPHS.forEach((glyph, index) => {
    context.fillText(
      glyph,
      ((index % ATLAS_GRID) * ATLAS_CELL) + (ATLAS_CELL / 2),
      (Math.floor(index / ATLAS_GRID) * ATLAS_CELL) + (ATLAS_CELL / 2),
    )
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  return texture
}

// Columns are spread through the camera's frustum rather than across a flat slab, so the
// fall stays evenly dense on screen instead of thinning out towards the viewer.
const createRain = (texture) => {
  const count = COLUMNS * PER_COLUMN
  const positions = new Float32Array(count * 3)
  const glyph = new Float32Array(count)
  const trailIndex = new Float32Array(count)
  const speed = new Float32Array(count)
  const seed = new Float32Array(count)
  const span = new Float32Array(count)
  const gap = new Float32Array(count)

  let cursor = 0

  for (let column = 0; column < COLUMNS; column += 1) {
    const z = -112 + (Math.random() * 128)
    const depth = CAMERA_Z - z
    const columnSpan = depth * HALF_FOV_TAN * 2.5
    const x = (Math.random() * 2 - 1) * depth * HALF_FOV_TAN * 1.35
    const columnSpeed = (4 + (Math.random() * 9)) * (depth / CAMERA_Z) * 0.72
    const columnSeed = Math.random() * columnSpan

    for (let step = 0; step < PER_COLUMN; step += 1) {
      positions[cursor * 3] = x
      positions[(cursor * 3) + 2] = z
      glyph[cursor] = Math.floor(Math.random() * GLYPHS.length)
      trailIndex[cursor] = step / (PER_COLUMN - 1)
      speed[cursor] = columnSpeed
      seed[cursor] = columnSeed
      span[cursor] = columnSpan
      gap[cursor] = depth * 0.046
      cursor += 1
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aGlyph', new THREE.BufferAttribute(glyph, 1))
  geometry.setAttribute('aTrail', new THREE.BufferAttribute(trailIndex, 1))
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  geometry.setAttribute('aSpan', new THREE.BufferAttribute(span, 1))
  geometry.setAttribute('aGap', new THREE.BufferAttribute(gap, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -40), 400)

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uSize: { value: 30 },
      uAtlas: { value: texture },
      uTail: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHead: { value: new THREE.Color() },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      attribute float aGlyph;
      attribute float aTrail;
      attribute float aSpeed;
      attribute float aSeed;
      attribute float aSpan;
      attribute float aGap;
      varying float vGlyph;
      varying float vTrail;
      varying float vDepth;

      void main() {
        vec3 p = position;
        float fall = mod(uTime * aSpeed + aSeed, aSpan);
        p.y = mod(p.y - aTrail * 13.0 * aGap - fall + aSpan * 0.5, aSpan) - aSpan * 0.5;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (34.0 / max(1.0, -mv.z));

        vGlyph = aGlyph;
        vTrail = aTrail;
        vDepth = -mv.z;
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas;
      uniform vec3 uTail;
      uniform vec3 uMid;
      uniform vec3 uHead;
      uniform float uOpacity;
      varying float vGlyph;
      varying float vTrail;
      varying float vDepth;

      void main() {
        vec2 point = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
        float column = mod(vGlyph, 4.0);
        float row = floor(vGlyph / 4.0);
        vec2 uv = vec2((column + point.x) * 0.25, (3.0 - row + point.y) * 0.25);

        float mask = texture2D(uAtlas, uv).a;
        if (mask < 0.04) discard;

        float bright = 1.0 - vTrail;
        vec3 tint = mix(uTail, uMid, smoothstep(0.0, 0.75, bright));
        tint = mix(tint, uHead, smoothstep(0.86, 1.0, bright));

        float fog = exp(-pow(vDepth * 0.0128, 2.0));
        gl_FragColor = vec4(tint, mask * (0.16 + bright * 0.9) * fog * uOpacity);
      }
    `,
  })

  return new THREE.Points(geometry, material)
}

// A grid of line segments displaced in the vertex shader — the whole landscape moves
// without a single vertex being touched on the CPU.
const createTerrain = () => {
  const segments = []
  const xAt = (i) => (-TERRAIN_WIDTH / 2) + ((TERRAIN_WIDTH * i) / TERRAIN_COLS)
  const zAt = (j) => 70 - ((TERRAIN_DEPTH * j) / TERRAIN_ROWS)

  for (let row = 0; row <= TERRAIN_ROWS; row += 1) {
    for (let col = 0; col < TERRAIN_COLS; col += 1) {
      segments.push(xAt(col), 0, zAt(row), xAt(col + 1), 0, zAt(row))
    }
  }

  for (let col = 0; col <= TERRAIN_COLS; col += 1) {
    for (let row = 0; row < TERRAIN_ROWS; row += 1) {
      segments.push(xAt(col), 0, zAt(row), xAt(col), 0, zAt(row + 1))
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments), 3))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -110), 400)

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 1 },
      uOpacity: { value: 0 },
      uLow: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHigh: { value: new THREE.Color() },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uAmp;
      varying float vHeight;
      varying float vDepth;

      void main() {
        vec3 p = position;
        float height = sin(p.x * 0.052 + uTime * 0.85) * 2.1
                     + sin(p.z * 0.068 - uTime * 1.10) * 2.7
                     + sin((p.x * 0.6 + p.z * 0.9) * 0.041 + uTime * 0.5) * 3.3;

        p.y += height * uAmp;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        vHeight = height;
        vDepth = -mv.z;
      }
    `,
    fragmentShader: `
      uniform vec3 uLow;
      uniform vec3 uMid;
      uniform vec3 uHigh;
      uniform float uOpacity;
      varying float vHeight;
      varying float vDepth;

      void main() {
        float level = smoothstep(-5.0, 5.5, vHeight);
        vec3 tint = mix(uLow, uMid, smoothstep(0.0, 0.72, level));
        tint = mix(tint, uHigh, smoothstep(0.78, 1.0, level));

        float near = 1.0 - smoothstep(24.0, 92.0, vDepth);
        float fade = exp(-pow(vDepth * 0.0062, 2.4));
        gl_FragColor = vec4(tint, (0.20 + level * 0.80 + near * 0.34) * fade * uOpacity);
      }
    `,
  })

  const terrain = new THREE.LineSegments(geometry, material)
  terrain.position.y = -19

  return terrain
}

const LandingBackground = () => {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const [supports3D] = useState(detectWebGLSupport)
  const { isDark } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !supports3D) {
      return undefined
    }

    const renderer = createRenderer(THREE, {
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })

    if (!renderer) {
      return undefined
    }

    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 460)
    camera.position.set(0, 0, CAMERA_Z)

    const terrain = createTerrain()
    const rain = createRain(createGlyphAtlas())
    scene.add(terrain, rain)

    const handleResize = () => {
      const width = window.innerWidth
      const height = Math.max(window.innerHeight, 1)

      // A phone renders the same scene into a far denser screen, so it is given a lower
      // ceiling on pixel ratio than a laptop.
      renderer.setPixelRatio(Math.min(width < 760 ? 1.25 : 1.6, window.devicePixelRatio || 1))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      rain.material.uniforms.uSize.value = width < 760 ? 20 : 30
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const pointer = { x: 0, y: 0 }
    const handlePointer = (event) => {
      pointer.x = ((event.clientX / window.innerWidth) * 2) - 1
      pointer.y = ((event.clientY / window.innerHeight) * 2) - 1
    }

    window.addEventListener('pointermove', handlePointer, { passive: true })

    // Colours are the one thing the reader can change while the scene is running, so
    // they are set from outside the build rather than baked into it.
    const applyTheme = (dark) => {
      const palette = dark ? PALETTE.dark : PALETTE.light
      const blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending

      terrain.material.uniforms.uLow.value.setHex(palette.terrain[0])
      terrain.material.uniforms.uMid.value.setHex(palette.terrain[1])
      terrain.material.uniforms.uHigh.value.setHex(palette.terrain[2])
      rain.material.uniforms.uTail.value.setHex(palette.rain[0])
      rain.material.uniforms.uMid.value.setHex(palette.rain[1])
      rain.material.uniforms.uHead.value.setHex(palette.rain[2])

      terrain.material.blending = blending
      rain.material.blending = blending
      terrain.material.needsUpdate = true
      rain.material.needsUpdate = true

      sceneRef.current.terrainOpacity = palette.terrainOpacity
      sceneRef.current.rainOpacity = palette.rainOpacity

      // With motion turned off there is no loop to pick the new colours up, so the one
      // frame that exists is drawn again. Assigned below, once it is known whether this
      // is a still scene at all.
      sceneRef.current.repaint?.()
    }

    sceneRef.current = { applyTheme, terrainOpacity: 1, rainOpacity: 1 }
    applyTheme(document.documentElement.classList.contains('dark'))

    const clock = new THREE.Clock()
    const isStill = prefersReducedMotion()
    let frameId = null
    let cameraX = 0
    let cameraY = 0
    let terrainFade = 0
    let rainFade = 0
    let settled = false

    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame)

      // A tab in the background is still a tab that costs a GPU frame.
      if (document.hidden) {
        return
      }

      const delta = Math.min(0.05, clock.getDelta())
      const scrolled = Math.min(1, (window.scrollY || 0) / Math.max(1, window.innerHeight))
      const { terrainOpacity, rainOpacity } = sceneRef.current

      // Everything below eases towards a target rather than jumping to it, so a theme
      // switch or a fast scroll is a movement and not a cut.
      const targetTerrain = terrainOpacity * (1 - (scrolled * 0.55))
      const targetRain = rainOpacity * (1 - (scrolled * 0.72))

      if (!settled) {
        settled = true
        terrainFade = targetTerrain
        rainFade = targetRain
      }

      terrainFade += (targetTerrain - terrainFade) * Math.min(1, delta * 3)
      rainFade += (targetRain - rainFade) * Math.min(1, delta * 3)

      const targetX = pointer.x * 4.2
      const targetY = -pointer.y * 2.6
      cameraX += (targetX - cameraX) * Math.min(1, delta * 2.2)
      cameraY += (targetY - cameraY) * Math.min(1, delta * 2.2)

      terrain.material.uniforms.uTime.value += delta * (1 + (scrolled * 1.5))
      terrain.material.uniforms.uAmp.value = 1.45
      terrain.material.uniforms.uOpacity.value = terrainFade
      rain.material.uniforms.uTime.value += delta * (0.7 + (scrolled * 1.2))
      rain.material.uniforms.uOpacity.value = rainFade

      camera.position.set((cameraX * 0.85), 13 + (cameraY * 0.7) - (scrolled * 7), 36 - (scrolled * 16))
      camera.lookAt(0, -4 + (cameraY * 0.3), -110)

      renderer.render(scene, camera)
    }

    if (isStill) {
      const drawStillFrame = () => {
        terrain.material.uniforms.uTime.value = 12
        terrain.material.uniforms.uAmp.value = 1.45
        terrain.material.uniforms.uOpacity.value = sceneRef.current.terrainOpacity
        rain.material.uniforms.uTime.value = 12
        rain.material.uniforms.uOpacity.value = sceneRef.current.rainOpacity
        camera.position.set(0, 13, 36)
        camera.lookAt(0, -4, -110)
        renderer.render(scene, camera)
      }

      sceneRef.current.repaint = drawStillFrame
      drawStillFrame()
    } else {
      renderFrame()
    }

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

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

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Colour first, in CSS, so the page is never a blank slab while WebGL starts —
          and so a machine without WebGL still gets a lit background. */}
      <div className="absolute inset-0 bg-slate-50 dark:bg-[#020617]" />

      <div className="animate-aurora absolute -top-1/4 left-[-10%] h-[70vh] w-[70vw] rounded-full bg-blue-300/40 blur-[120px] dark:bg-blue-600/20" />
      <div
        className="animate-aurora absolute right-[-15%] top-[10%] h-[60vh] w-[55vw] rounded-full bg-indigo-300/40 blur-[120px] dark:bg-indigo-600/20"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="animate-aurora absolute bottom-[-20%] left-[20%] h-[60vh] w-[60vw] rounded-full bg-cyan-200/40 blur-[130px] dark:bg-cyan-500/12"
        style={{ animationDelay: '-12s' }}
      />

      {supports3D ? <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" /> : null}

      {/* Reading layer: the scene is pulled down behind the text on the left, where the
          headlines sit, and left bright on the right where the cards float. */}
      <div className="absolute inset-0 bg-linear-to-r from-slate-50 via-slate-50/60 to-transparent dark:from-[#020617] dark:via-[#020617]/70" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-slate-50 to-transparent dark:from-[#020617]" />
    </div>
  )
}

export default LandingBackground
