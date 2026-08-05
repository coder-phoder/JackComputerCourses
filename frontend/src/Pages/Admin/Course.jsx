import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AdminChapterForm from '../../Components/Admin/AdminChapterForm'
import AdminChapterList from '../../Components/Admin/AdminChapterList'
import AdminCourseSummary from '../../Components/Admin/AdminCourseSummary'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import PageTour from '../../Components/Tour/PageTour'
import getAdminCoursePageTour from '../Tour/Admin/AdminCoursePageTour'
import { useAuth } from '../../Context/AuthContext'
import { useConfirm } from '../../Context/ConfirmContext'
import { sumChapterDurationSeconds } from '../../utils/courseDuration'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const emptyChapterForm = {
  name: '',
  playlistUrl: '',
  order: '',
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const sortChapters = (chapters) => [...chapters].sort((first, second) => {
  const firstOrder = Number.isFinite(Number(first.order)) ? Number(first.order) : 0
  const secondOrder = Number.isFinite(Number(second.order)) ? Number(second.order) : 0

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder
  }

  return new Date(first.createdAt || 0) - new Date(second.createdAt || 0)
})

const getVideoCount = (chapters) => chapters.reduce((total, chapter) => (
  total + (chapter.videos?.length || chapter.videoCount || 0)
), 0)

// The summary's totals are re-derived from the chapters the page already holds, so adding,
// deleting or re-syncing one moves them immediately instead of after another fetch.
const getCourseTotals = (chapters) => ({
  chapterCount: chapters.length,
  videoCount: getVideoCount(chapters),
  totalDurationSeconds: sumChapterDurationSeconds(chapters),
})

const getChapterForm = (chapter) => ({
  name: chapter.name || '',
  playlistUrl: chapter.playlistUrl || '',
  order: Number.isFinite(Number(chapter.order)) ? String(chapter.order) : '',
})

const parseChapterOrder = (value) => {
  const trimmedValue = String(value || '').trim()

  if (!trimmedValue) {
    return undefined
  }

  const order = Number(trimmedValue)

  if (!Number.isInteger(order) || order < 0) {
    return null
  }

  return order
}

const Course = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const confirm = useConfirm()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [chapterForm, setChapterForm] = useState(emptyChapterForm)
  const [editingChapterId, setEditingChapterId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingChapter, setSavingChapter] = useState(false)
  const [deletingChapterId, setDeletingChapterId] = useState('')
  const [syncingChapterId, setSyncingChapterId] = useState('')

  const editingChapter = useMemo(
    () => chapters.find((chapter) => chapter._id === editingChapterId) || null,
    [chapters, editingChapterId],
  )

  const setCourseAndChapters = useCallback((nextCourse, nextChapters) => {
    const sortedChapters = sortChapters(nextChapters || [])

    setCourse(nextCourse ? { ...nextCourse, ...getCourseTotals(sortedChapters) } : null)
    setChapters(sortedChapters)
  }, [])

  const updateChapters = useCallback((nextChapters) => {
    const sortedChapters = sortChapters(nextChapters)

    setChapters(sortedChapters)
    setCourse((currentCourse) => (currentCourse
      ? { ...currentCourse, ...getCourseTotals(sortedChapters) }
      : currentCourse))
  }, [])

  const fetchCourse = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourse(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/courses/${courseId}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch course')
      }

      if (shouldUpdate()) {
        setCourseAndChapters(
          response.data?.data?.course || null,
          response.data?.data?.chapters || [],
        )
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch course. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingCourse(false)
      }
    }
  }, [courseId, setCourseAndChapters])

  useEffect(() => {
    let isActive = true

    const verifyAdmin = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
          withCredentials: true,
        })

        const admin = response.data?.data?.admin

        if (!response.data?.success || admin?.role !== 'admin') {
          throw new Error('Unauthorized admin')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'admin',
          phone: admin.phone,
          token: null,
        })
        setIsAuthorized(true)
        await fetchCourse({ shouldUpdate: () => isActive })
      } catch {
        if (!isActive) {
          return
        }

        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyAdmin()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchCourse, setAuth])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleChapterFormChange = (event) => {
    const { name, value } = event.target

    setChapterForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const cancelEditingChapter = () => {
    setEditingChapterId('')
    setChapterForm(emptyChapterForm)
  }

  const startEditingChapter = (chapter) => {
    resetMessages()
    setEditingChapterId(chapter._id)
    setChapterForm(getChapterForm(chapter))
  }

  const handleSaveChapter = async (event) => {
    event.preventDefault()
    resetMessages()

    const name = chapterForm.name.trim()
    const playlistUrl = chapterForm.playlistUrl.trim()
    const order = parseChapterOrder(chapterForm.order)

    if (!name) {
      setError('Chapter name is required.')
      return
    }

    if (!playlistUrl) {
      setError('YouTube playlist link is required.')
      return
    }

    if (order === null) {
      setError('Chapter order must be a non-negative integer.')
      return
    }

    const payload = { name, playlistUrl }

    if (order !== undefined) {
      payload.order = order
    }

    const isEditing = Boolean(editingChapterId)
    setSavingChapter(true)

    try {
      const response = isEditing
        ? await axios.patch(
          `${API_BASE_URL}/admin/courses/${courseId}/chapters/${editingChapterId}`,
          payload,
          { withCredentials: true },
        )
        : await axios.post(`${API_BASE_URL}/admin/courses/${courseId}/chapters`, payload, {
          withCredentials: true,
        })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save chapter')
      }

      const savedChapter = response.data?.data?.chapter

      if (savedChapter) {
        updateChapters(isEditing
          ? chapters.map((chapter) => (
            chapter._id === editingChapterId ? savedChapter : chapter
          ))
          : [...chapters, savedChapter])
      } else {
        await fetchCourse()
      }

      setChapterForm(emptyChapterForm)
      setEditingChapterId('')
      setSuccess(isEditing ? 'Chapter updated successfully.' : 'Chapter created successfully.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save chapter. Please try again.'))
    } finally {
      setSavingChapter(false)
    }
  }

  const handleDeleteChapter = async (chapter) => {
    resetMessages()

    const confirmed = await confirm({
      title: 'Delete this chapter?',
      description: 'The chapter leaves the course for everyone enrolled in it, and the progress recorded against it goes with it.',
      subject: chapter.name,
      confirmLabel: 'Delete chapter',
    })

    if (!confirmed) {
      return
    }

    setDeletingChapterId(chapter._id)

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin/courses/${courseId}/chapters/${chapter._id}`,
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete chapter')
      }

      updateChapters(chapters.filter((currentChapter) => currentChapter._id !== chapter._id))

      if (editingChapterId === chapter._id) {
        cancelEditingChapter()
      }

      setSuccess('Chapter deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete chapter. Please try again.'))
    } finally {
      setDeletingChapterId('')
    }
  }

  const handleSyncChapter = async (chapter) => {
    resetMessages()
    setSyncingChapterId(chapter._id)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/courses/${courseId}/chapters/${chapter._id}/sync-videos`,
        {},
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to sync videos')
      }

      const syncedChapter = response.data?.data?.chapter

      if (syncedChapter) {
        updateChapters(chapters.map((currentChapter) => (
          currentChapter._id === chapter._id ? syncedChapter : currentChapter
        )))
      } else {
        await fetchCourse()
      }

      setSuccess('Chapter videos synced successfully.')
    } catch (syncError) {
      setError(getErrorMessage(syncError, 'Unable to sync chapter videos. Please try again.'))
    } finally {
      setSyncingChapterId('')
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            to="/admin/courses"
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Back to courses
          </Link>
          {course && !course.isOpenToAll ? (
            <Link
              to={`/admin/courses/${courseId}/access`}
              data-tour="admin-course-access"
              className="inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              User Access
            </Link>
          ) : null}
          {course ? (
            <Link
              to={`/admin/courses/${courseId}/notes`}
              data-tour="admin-course-notes"
              className="inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Manage Notes
            </Link>
          ) : null}

          {/* Held back until the course is read: which stops the walkthrough has
              depends on whether this one is open to all. */}
          {course ? (
            <PageTour
              steps={getAdminCoursePageTour({ canManageAccess: !course.isOpenToAll })}
            />
          ) : null}
        </div>

        {loadingCourse ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading course...
          </div>
        ) : course ? (
          <>
            <AdminCourseSummary course={course} />

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <AdminChapterForm
                chapterForm={chapterForm}
                editingChapter={editingChapter}
                error={error}
                savingChapter={savingChapter}
                success={success}
                onCancel={cancelEditingChapter}
                onChange={handleChapterFormChange}
                onSubmit={handleSaveChapter}
              />

              <AdminChapterList
                chapters={chapters}
                deletingChapterId={deletingChapterId}
                editingChapterId={editingChapterId}
                savingChapter={savingChapter}
                syncingChapterId={syncingChapterId}
                onDeleteChapter={handleDeleteChapter}
                onEditChapter={startEditingChapter}
                onSyncChapter={handleSyncChapter}
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-6 py-12 text-center text-sm font-semibold text-red-700 dark:text-red-300">
            Course not found.
          </div>
        )}
      </main>
    </div>
  )
}

export default Course
