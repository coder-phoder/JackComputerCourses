// Bug screenshots are stored as base64 data URLs, so they are downscaled in the
// browser first. A raw phone screenshot is several MB; this keeps each one small
// enough to travel inside the JSON request and sit comfortably in one document.
export const MAX_BUG_IMAGES = 4

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.82

export const compressImageFile = (file) => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error(`${file.name} is not an image`))
    return
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()

  image.onload = () => {
    URL.revokeObjectURL(objectUrl)

    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')

    canvas.width = Math.max(Math.round(image.width * scale), 1)
    canvas.height = Math.max(Math.round(image.height * scale), 1)

    const context = canvas.getContext('2d')

    if (!context) {
      reject(new Error('This browser cannot process images'))
      return
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    resolve({
      name: file.name,
      dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
    })
  }

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error(`${file.name} could not be read`))
  }

  image.src = objectUrl
})
