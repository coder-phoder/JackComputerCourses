// Three of the screens on this site draw with WebGL — the sign-in transition, the
// background of the public pages and the scroll-driven scene inside them. All three
// have to answer the same two questions before they start: can this machine draw at
// all, and has the reader asked for stillness. Both are answered here once.

export const prefersReducedMotion = () => (
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
)

let webGLSupport = null

// Probed once per session so a component can pick its fallback while rendering,
// instead of discovering the failure inside an effect.
export const detectWebGLSupport = () => {
  if (webGLSupport !== null) {
    return webGLSupport
  }

  try {
    const probe = document.createElement('canvas')

    webGLSupport = Boolean(
      window.WebGLRenderingContext
      && (probe.getContext('webgl') || probe.getContext('experimental-webgl')),
    )
  } catch {
    webGLSupport = false
  }

  return webGLSupport
}

// Context creation can still fail after a successful probe — a lost GPU, or too many
// live contexts on one page. Every scene here is decoration, so a failure returns null
// and the caller renders the page without it.
export const createRenderer = (THREE, options) => {
  try {
    return new THREE.WebGLRenderer(options)
  } catch {
    return null
  }
}

// A scene is built from geometries, materials and textures that the garbage collector
// cannot reach — they live on the GPU. Every scene in the app is torn down through
// this, so none of them can leak by forgetting one of the three.
export const disposeScene = (scene) => {
  scene.traverse((object) => {
    object.geometry?.dispose()

    const materials = Array.isArray(object.material) ? object.material : [object.material]

    materials.forEach((material) => {
      if (!material) {
        return
      }

      Object.values(material).forEach((value) => {
        if (value && value.isTexture) {
          value.dispose()
        }
      })

      // A hand-written shader keeps its textures inside uniforms, where the sweep
      // above cannot see them.
      Object.values(material.uniforms || {}).forEach((uniform) => {
        if (uniform?.value?.isTexture) {
          uniform.value.dispose()
        }
      })

      material.dispose()
    })
  })
}
