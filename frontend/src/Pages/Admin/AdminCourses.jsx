import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AdminCourseForm from '../../Components/Admin/AdminCourseForm'
import AdminCourseList from '../../Components/Admin/AdminCourseList'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const emptyCourseForm = {
  title: '',
  slug: '',
  duration: '',
  price: '',
  shortDescription: '',
  description: '',
  thumbnailUrl: '',
  category: '',
  level: '',
  language: '',
  tags: '',
  highlights: '',
  prerequisites: '',
  isPublished: false,
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const toListInput = (value) => (
  Array.isArray(value) ? value.join(', ') : ''
)

const parseListInput = (value) => (
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
)

const getCourseForm = (course) => ({
  title: course.title || '',
  slug: course.slug || '',
  duration: course.duration || '',
  price: Number.isFinite(Number(course.price)) ? String(course.price) : '',
  shortDescription: course.shortDescription || '',
  description: course.description || '',
  thumbnailUrl: course.thumbnailUrl || '',
  category: course.category || '',
  level: course.level || '',
  language: course.language || '',
  tags: toListInput(course.tags),
  highlights: toListInput(course.highlights),
  prerequisites: toListInput(course.prerequisites),
  isPublished: Boolean(course.isPublished),
})

const buildCoursePayload = (form, isEditing) => {
  const title = form.title.trim()
  const slug = form.slug.trim()
  const duration = form.duration.trim()
  const description = form.description.trim()
  const price = Number(form.price)

  if (!title) {
    return { error: 'Title is required.' }
  }

  if (isEditing && !slug) {
    return { error: 'Slug is required.' }
  }

  if (!duration) {
    return { error: 'Duration is required.' }
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Price must be a non-negative number.' }
  }

  if (!description) {
    return { error: 'Description is required.' }
  }

  const payload = {
    title,
    duration,
    price,
    description,
    shortDescription: form.shortDescription.trim(),
    thumbnailUrl: form.thumbnailUrl.trim(),
    category: form.category.trim(),
    level: form.level.trim(),
    language: form.language.trim(),
    tags: parseListInput(form.tags),
    highlights: parseListInput(form.highlights),
    prerequisites: parseListInput(form.prerequisites),
    isPublished: Boolean(form.isPublished),
  }

  if (slug) {
    payload.slug = slug
  }

  return { payload }
}

const AdminCourses = () => {
  const navigate = useNavigate()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [courseForm, setCourseForm] = useState(emptyCourseForm)
  const [editingCourseId, setEditingCourseId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingCourseId, setDeletingCourseId] = useState('')

  const sortedCourses = useMemo(
    () => [...courses].sort((first, second) => (
      new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
    )),
    [courses],
  )
  const editingCourse = useMemo(
    () => courses.find((course) => course._id === editingCourseId) || null,
    [courses, editingCourseId],
  )

  const fetchCourses = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourses(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/courses`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch courses')
      }

      if (shouldUpdate()) {
        setCourses(response.data?.data?.courses || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch courses. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingCourses(false)
      }
    }
  }, [])

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
        await fetchCourses({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchCourses, setAuth])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleCourseFormChange = (event) => {
    const { checked, name, type, value } = event.target

    setCourseForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const cancelEditingCourse = () => {
    setEditingCourseId('')
    setCourseForm(emptyCourseForm)
  }

  const startEditingCourse = (course) => {
    resetMessages()
    setEditingCourseId(course._id)
    setCourseForm(getCourseForm(course))
  }

  const handleSaveCourse = async (event) => {
    event.preventDefault()
    resetMessages()

    const isEditing = Boolean(editingCourseId)
    const { error: payloadError, payload } = buildCoursePayload(courseForm, isEditing)

    if (payloadError) {
      setError(payloadError)
      return
    }

    setSaving(true)

    try {
      const response = isEditing
        ? await axios.patch(`${API_BASE_URL}/admin/courses/${editingCourseId}`, payload, {
          withCredentials: true,
        })
        : await axios.post(`${API_BASE_URL}/admin/courses`, payload, {
          withCredentials: true,
        })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save course')
      }

      const savedCourse = response.data?.data?.course

      if (savedCourse) {
        setCourses((currentCourses) => {
          if (!isEditing) {
            return [savedCourse, ...currentCourses]
          }

          return currentCourses.map((course) => (
            course._id === editingCourseId
              ? {
                ...course,
                ...savedCourse,
                chapterCount: course.chapterCount,
                videoCount: course.videoCount,
              }
              : course
          ))
        })
      } else {
        await fetchCourses()
      }

      setCourseForm(emptyCourseForm)
      setEditingCourseId('')
      setSuccess(isEditing ? 'Course updated successfully.' : 'Course created successfully.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save course. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (course) => {
    resetMessages()

    const confirmed = window.confirm(`Delete course ${course.title}?`)

    if (!confirmed) {
      return
    }

    setDeletingCourseId(course._id)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/courses/${course._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete course')
      }

      setCourses((currentCourses) => (
        currentCourses.filter((currentCourse) => currentCourse._id !== course._id)
      ))

      if (editingCourseId === course._id) {
        cancelEditingCourse()
      }

      setSuccess('Course deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete course. Please try again.'))
    } finally {
      setDeletingCourseId('')
    }
  }

  const openCourse = (course) => {
    navigate(`/admin/courses/${course._id}`)
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm font-semibold text-slate-600">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AdminNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Courses</h1>
          </div>
          <button
            type="button"
            onClick={fetchCourses}
            disabled={loadingCourses}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {loadingCourses ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <AdminCourseForm
            courseForm={courseForm}
            editingCourse={editingCourse}
            error={error}
            saving={saving}
            success={success}
            onCancel={cancelEditingCourse}
            onChange={handleCourseFormChange}
            onSubmit={handleSaveCourse}
          />

          <AdminCourseList
            courses={sortedCourses}
            deletingCourseId={deletingCourseId}
            editingCourseId={editingCourseId}
            loadingCourses={loadingCourses}
            saving={saving}
            onDeleteCourse={handleDeleteCourse}
            onEditCourse={startEditingCourse}
            onOpenCourse={openCourse}
          />
        </div>
      </main>
    </div>
  )
}

export default AdminCourses
