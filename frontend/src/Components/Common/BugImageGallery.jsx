import axios from 'axios'
import { ImageIcon, Loader2, X } from 'lucide-react'
import { useState } from 'react'

// Image payloads are excluded from the bug list responses, so they are fetched
// once per bug the first time somebody opens the gallery.
const BugImageGallery = ({ imagesUrl, count, onAuthError }) => {
  const [images, setImages] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  if (!count) {
    return null
  }

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    setIsOpen(true)

    if (images) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.get(imagesUrl, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load images')
      }

      setImages(response.data?.data?.images || [])
    } catch (fetchError) {
      if ([401, 403].includes(fetchError?.response?.status)) {
        onAuthError?.()
        return
      }

      setError(fetchError?.response?.data?.message || fetchError.message || 'Unable to load images.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500"
      >
        <ImageIcon className="h-4 w-4" />
        {isOpen ? 'Hide images' : `View ${count} image${count > 1 ? 's' : ''}`}
      </button>

      {isOpen ? (
        <div className="mt-3">
          {loading ? (
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading images...
            </p>
          ) : null}

          {error ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-300">{error}</p>
          ) : null}

          {images?.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((image, index) => (
                <button
                  key={`${image.name}-${index}`}
                  type="button"
                  onClick={() => setPreview(image)}
                  className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 transition hover:border-slate-400 dark:hover:border-slate-500"
                >
                  <img
                    src={image.dataUrl}
                    alt={image.name || `Bug screenshot ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative max-h-full w-full max-w-3xl overflow-auto rounded-xl bg-white dark:bg-slate-900 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {preview.name || 'Bug screenshot'}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close image preview"
                className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 transition hover:border-slate-400 dark:hover:border-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={preview.dataUrl}
              alt={preview.name || 'Bug screenshot'}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default BugImageGallery
