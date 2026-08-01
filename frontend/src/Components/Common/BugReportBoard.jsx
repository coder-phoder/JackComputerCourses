import axios from 'axios'
import { Bug, ImagePlus, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BugImageGallery from './BugImageGallery'
import BugStatusBadge from './BugStatusBadge'
import { formatBugDateTime, getBugDecisionAt, getBugDecisionLabel, isHistoryBug } from './bugStatus'
import { MAX_BUG_IMAGES, compressImageFile } from '../../utils/bugImages'

const ACCENTS = {
  blue: {
    field: 'focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/40',
    button: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300',
  },
  indigo: {
    field: 'focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900/40',
    button: 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300',
  },
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const BugRow = ({ bug, apiBaseUrl, onAuthError }) => {
  const decidedAt = getBugDecisionAt(bug)

  return (
    <li className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{bug.title}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Reported on {formatBugDateTime(bug.createdAt)}
            {decidedAt ? ` · ${getBugDecisionLabel(bug)} on ${formatBugDateTime(decidedAt)}` : ''}
          </p>
        </div>
        <BugStatusBadge status={bug.status} />
      </div>

      {bug.description ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {bug.description}
        </p>
      ) : null}

      <BugImageGallery
        imagesUrl={`${apiBaseUrl}/${bug._id}/images`}
        count={bug.imageCount}
        onAuthError={onAuthError}
      />
    </li>
  )
}

// Shared by the user and faculty bug pages: both roles report and read back their
// own bugs against the same API shape, only the endpoint and accent differ.
const BugReportBoard = ({ apiBaseUrl, accent = 'blue', onAuthError }) => {
  const accentClasses = ACCENTS[accent] || ACCENTS.blue
  const [bugs, setBugs] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [processingImages, setProcessingImages] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequestError = useCallback((requestError, fallback) => {
    if (isAuthError(requestError)) {
      onAuthError?.()
      return
    }

    setError(getErrorMessage(requestError, fallback))
  }, [onAuthError])

  const openBugs = useMemo(() => bugs.filter((bug) => !isHistoryBug(bug)), [bugs])
  const historyBugs = useMemo(() => bugs.filter(isHistoryBug), [bugs])

  useEffect(() => {
    let isActive = true

    const fetchBugs = async () => {
      try {
        const response = await axios.get(apiBaseUrl, { withCredentials: true })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load bug reports')
        }

        if (isActive) {
          setBugs(response.data?.data?.bugs || [])
        }
      } catch (fetchError) {
        if (isActive) {
          handleRequestError(fetchError, 'Unable to load your bug reports.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchBugs()

    return () => {
      isActive = false
    }
  }, [apiBaseUrl, handleRequestError])

  const handleSelectImages = async (event) => {
    const files = Array.from(event.target.files || [])

    // The picker keeps the chosen file, so it is reset to allow re-selecting one.
    event.target.value = ''

    if (!files.length) {
      return
    }

    if (images.length + files.length > MAX_BUG_IMAGES) {
      setError(`You can attach up to ${MAX_BUG_IMAGES} images.`)
      return
    }

    setProcessingImages(true)
    setError('')

    try {
      const compressed = await Promise.all(files.map((file) => compressImageFile(file)))

      setImages((currentImages) => [...currentImages, ...compressed])
    } catch (imageError) {
      setError(getErrorMessage(imageError, 'Unable to read the selected images.'))
    } finally {
      setProcessingImages(false)
    }
  }

  const handleRemoveImage = (index) => {
    setImages((currentImages) => currentImages.filter((_, imageIndex) => imageIndex !== index))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setError('Bug name is required.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await axios.post(apiBaseUrl, {
        title: trimmedTitle,
        description: description.trim(),
        images,
      }, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to report the bug')
      }

      setBugs((currentBugs) => [response.data.data.bug, ...currentBugs])
      setTitle('')
      setDescription('')
      setImages([])
      setSuccess('Bug reported. The admin will review it shortly.')
    } catch (submitError) {
      handleRequestError(submitError, 'Unable to report the bug. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Report a Bug</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tell us what went wrong. Screenshots help us fix it faster.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="bug-title" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Bug name <span className="text-red-600">*</span>
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={submitting}
              maxLength={150}
              className={`mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:ring-4 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${accentClasses.field}`}
              placeholder="Short summary of the bug"
            />
          </div>

          <div>
            <label htmlFor="bug-description" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="bug-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={submitting}
              maxLength={2000}
              className={`mt-2 w-full resize-y rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:ring-4 disabled:bg-slate-100 dark:disabled:bg-slate-800 ${accentClasses.field}`}
              placeholder="What were you doing when it happened?"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Images <span className="text-slate-400">(optional, up to {MAX_BUG_IMAGES})</span>
            </span>

            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:border-slate-400 dark:hover:border-slate-500">
              {processingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {processingImages ? 'Processing...' : 'Add screenshots'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleSelectImages}
                disabled={submitting || processingImages || images.length >= MAX_BUG_IMAGES}
              />
            </label>

            {images.length ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <div key={`${image.name}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <img src={image.dataUrl} alt={image.name} className="h-16 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      aria-label={`Remove ${image.name}`}
                      className="absolute right-1 top-1 rounded-md bg-slate-900/80 p-1 text-white transition hover:bg-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting || processingImages}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${accentClasses.button}`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
            {submitting ? 'Reporting...' : 'Report Bug'}
          </button>
        </form>

        {error ? (
          <p className="mt-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        ) : null}
      </section>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Open Reports</h2>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {openBugs.length} waiting
            </span>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your bug reports...
            </p>
          ) : null}

          {!loading && !openBugs.length ? (
            <p className="px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
              You have no bug reports waiting on the admin.
            </p>
          ) : null}

          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {openBugs.map((bug) => (
              <BugRow key={bug._id} bug={bug} apiBaseUrl={apiBaseUrl} onAuthError={onAuthError} />
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">History</h2>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {historyBugs.length} decided
            </span>
          </div>

          {!loading && !historyBugs.length ? (
            <p className="px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
              Resolved and declined reports will appear here.
            </p>
          ) : null}

          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {historyBugs.map((bug) => (
              <BugRow key={bug._id} bug={bug} apiBaseUrl={apiBaseUrl} onAuthError={onAuthError} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default BugReportBoard
