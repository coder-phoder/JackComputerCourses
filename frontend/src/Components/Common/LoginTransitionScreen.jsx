import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createRenderer, detectWebGLSupport, disposeScene, prefersReducedMotion } from '../../utils/webgl'

const DEFAULT_STAGES = [
  'Verifying your credentials',
  'Preparing your workspace',
  'Almost there',
]

const STAGE_INTERVAL_MS = 1000
const PARTICLE_COUNT = 700

const createParticles = () => {
  const positions = new Float32Array(PARTICLE_COUNT * 3)

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    // Spread the points over a spherical shell so the cloud reads as a volume.
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos((Math.random() * 2) - 1)
    const radius = 2.9 + (Math.random() * 1.4)

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[index * 3 + 2] = radius * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  return geometry
}

const LoginTransitionScreen = ({ title = 'Signing you in', stages = DEFAULT_STAGES }) => {
  const mountRef = useRef(null)
  const [stageIndex, setStageIndex] = useState(0)
  const [supports3D] = useState(detectWebGLSupport)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, stages.length - 1))
    }, STAGE_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [stages.length])

  useEffect(() => {
    const mount = mountRef.current

    if (!mount || !supports3D) {
      return undefined
    }

    const getSize = () => ({
      width: Math.max(mount.clientWidth, 1),
      height: Math.max(mount.clientHeight, 1),
    })

    // The brand, progress bar and status text carry the screen on their own, so a
    // context that cannot be created bails out quietly rather than break the sign in.
    const renderer = createRenderer(THREE, { alpha: true, antialias: true })

    if (!renderer) {
      return undefined
    }

    const { width, height } = getSize()

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.z = 7.4

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 1),
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.55,
        metalness: 0.45,
        roughness: 0.25,
        flatShading: true,
      }),
    )

    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.05, 1),
      new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      }),
    )

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.7,
    })
    const ringGeometry = new THREE.TorusGeometry(3, 0.012, 12, 160)

    const ringA = new THREE.Mesh(ringGeometry, ringMaterial)
    ringA.rotation.x = Math.PI / 2.4

    const ringB = new THREE.Mesh(ringGeometry, ringMaterial)
    ringB.rotation.y = Math.PI / 2.8
    ringB.rotation.z = Math.PI / 5

    const particles = new THREE.Points(
      createParticles(),
      new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.035,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      }),
    )

    const blueLight = new THREE.PointLight(0x3b82f6, 90, 40)
    blueLight.position.set(5, 4, 6)

    const indigoLight = new THREE.PointLight(0x6366f1, 70, 40)
    indigoLight.position.set(-6, -3, 4)

    scene.add(core, shell, ringA, ringB, particles, blueLight, indigoLight)
    scene.add(new THREE.AmbientLight(0x94a3b8, 1.1))

    const handleResize = () => {
      const nextSize = getSize()

      camera.aspect = nextSize.width / nextSize.height
      camera.updateProjectionMatrix()
      renderer.setSize(nextSize.width, nextSize.height)
    }

    window.addEventListener('resize', handleResize)

    const timer = new THREE.Timer()
    const isStatic = prefersReducedMotion()
    let frameId = null

    const renderFrame = () => {
      timer.update()

      const elapsed = timer.getElapsed()

      core.rotation.x = elapsed * 0.45
      core.rotation.y = elapsed * 0.62
      core.scale.setScalar(1 + (Math.sin(elapsed * 2.1) * 0.06))

      shell.rotation.x = elapsed * -0.24
      shell.rotation.y = elapsed * 0.31

      ringA.rotation.z = elapsed * 0.7
      ringB.rotation.x = elapsed * 0.55

      particles.rotation.y = elapsed * 0.09
      particles.rotation.x = Math.sin(elapsed * 0.22) * 0.16

      camera.position.x = Math.sin(elapsed * 0.35) * 0.45
      camera.position.y = Math.cos(elapsed * 0.28) * 0.35
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(renderFrame)
    }

    if (isStatic) {
      core.rotation.set(-0.35, 0.6, 0)
      renderer.render(scene, camera)
    } else {
      renderFrame()
    }

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      window.removeEventListener('resize', handleResize)
      timer.dispose()
      disposeScene(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [supports3D])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 via-white to-blue-50 font-sans dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
    >
      <div className="relative flex h-72 w-72 items-center justify-center sm:h-96 sm:w-96">
        <div ref={mountRef} className="h-full w-full" />
        {supports3D ? null : (
          <Loader2 className="absolute h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
        )}
      </div>

      <div className="-mt-4 flex w-full max-w-xs flex-col items-center gap-4 px-6 sm:-mt-8">
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
          Jack<span className="text-blue-600">Courses</span>
        </span>

        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {title}
        </p>

        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="auth-progress h-full w-full rounded-full bg-linear-to-r from-blue-500 to-indigo-500" />
        </div>

        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {stages[stageIndex]}
        </p>
      </div>
    </div>
  )
}

export default LoginTransitionScreen
