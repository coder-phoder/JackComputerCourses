import axios from 'axios'
import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import AdminFacultyLogHistory from '../../Components/Admin/AdminFacultyLogHistory'
import ActionMenu from '../../Components/Common/ActionMenu'
import PasswordInput from '../../Components/Common/PasswordInput'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const emptyForm = {
  name: '',
  phone: '',
  password: '',
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const getFacultyName = (faculty) => String(faculty?.name || '').trim()

const sortFaculties = (first, second) => {
  const nameComparison = getFacultyName(first).localeCompare(getFacultyName(second))

  return nameComparison || first.phone.localeCompare(second.phone)
}

const AdminAllFaculties = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [faculties, setFaculties] = useState([])
  const [loadingFaculties, setLoadingFaculties] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingFacultyId, setEditingFacultyId] = useState('')
  const [editingForm, setEditingForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingFacultyId, setDeletingFacultyId] = useState('')
  const [historyFaculty, setHistoryFaculty] = useState(null)

  const sortedFaculties = useMemo(
    () => [...faculties].sort(sortFaculties),
    [faculties],
  )
  const editingFaculty = useMemo(
    () => faculties.find((faculty) => faculty._id === editingFacultyId) || null,
    [editingFacultyId, faculties],
  )

  const fetchFaculties = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingFaculties(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/faculties`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch faculties')
      }

      if (shouldUpdate()) {
        setFaculties(response.data?.data?.faculties || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch faculties. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingFaculties(false)
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
        await fetchFaculties({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchFaculties, setAuth])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleEditingFormChange = (event) => {
    const { name, value } = event.target

    setEditingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleCreateFaculty = async (event) => {
    event.preventDefault()
    resetMessages()

    const name = form.name.trim()
    const phone = form.phone.trim()

    if (!name || !phone || !form.password.trim()) {
      setError('Name, phone and password are required.')
      return
    }

    setSaving(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/faculties`, {
        name,
        phone,
        password: form.password,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to create faculty')
      }

      const createdFaculty = response.data?.data?.faculty

      if (createdFaculty) {
        setFaculties((currentFaculties) => [...currentFaculties, createdFaculty])
      } else {
        await fetchFaculties()
      }

      setForm(emptyForm)
      setSuccess('Faculty created successfully.')
    } catch (createError) {
      setError(getErrorMessage(createError, 'Unable to create faculty. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const startEditingFaculty = (faculty) => {
    resetMessages()
    setEditingFacultyId(faculty._id)
    setEditingForm({
      name: getFacultyName(faculty),
      phone: faculty.phone,
      password: '',
    })
  }

  const cancelEditingFaculty = () => {
    setEditingFacultyId('')
    setEditingForm(emptyForm)
  }

  const handleUpdateFaculty = async (event) => {
    event.preventDefault()
    resetMessages()

    const name = editingForm.name.trim()
    const phone = editingForm.phone.trim()

    if (!name || !phone) {
      setError('Name and phone are required.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name,
        phone,
      }

      if (editingForm.password.trim()) {
        payload.password = editingForm.password
      }

      const response = await axios.patch(
        `${API_BASE_URL}/admin/faculties/${editingFacultyId}`,
        payload,
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update faculty')
      }

      const updatedFaculty = response.data?.data?.faculty

      if (updatedFaculty) {
        setFaculties((currentFaculties) => currentFaculties.map((faculty) => (
          faculty._id === editingFacultyId ? updatedFaculty : faculty
        )))
      } else {
        await fetchFaculties()
      }

      cancelEditingFaculty()
      setSuccess('Faculty updated successfully.')
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Unable to update faculty. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFaculty = async (faculty) => {
    resetMessages()

    const confirmed = window.confirm(`Delete faculty ${faculty.phone}?`)

    if (!confirmed) {
      return
    }

    setDeletingFacultyId(faculty._id)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/faculties/${faculty._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete faculty')
      }

      setFaculties((currentFaculties) => (
        currentFaculties.filter((currentFaculty) => currentFaculty._id !== faculty._id)
      ))
      if (editingFacultyId === faculty._id) {
        cancelEditingFaculty()
      }
      setSuccess('Faculty deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete faculty. Please try again.'))
    } finally {
      setDeletingFacultyId('')
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
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">All Faculties</h1>
          </div>
          <button
            type="button"
            onClick={fetchFaculties}
            disabled={loadingFaculties}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
          >
            {loadingFaculties ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            {editingFaculty ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Faculty</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {getFacultyName(editingFaculty) || editingFaculty.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditingFaculty}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleUpdateFaculty} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="edit-faculty-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Name
                    </label>
                    <input
                      id="edit-faculty-name"
                      name="name"
                      type="text"
                      value={editingForm.name}
                      onChange={handleEditingFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-faculty-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Phone
                    </label>
                    <input
                      id="edit-faculty-phone"
                      name="phone"
                      type="tel"
                      value={editingForm.phone}
                      onChange={handleEditingFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-faculty-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      New Password
                    </label>
                    <PasswordInput
                      id="edit-faculty-password"
                      name="password"
                      value={editingForm.password}
                      onChange={handleEditingFormChange}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Faculty</h2>

                <form onSubmit={handleCreateFaculty} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="create-faculty-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Name
                    </label>
                    <input
                      id="create-faculty-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="create-faculty-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Phone
                    </label>
                    <input
                      id="create-faculty-phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="create-faculty-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Password
                    </label>
                    <PasswordInput
                      id="create-faculty-password"
                      name="password"
                      value={form.password}
                      onChange={handleFormChange}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="Enter password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {saving ? 'Creating...' : 'Create Faculty'}
                  </button>
                </form>
              </>
            )}

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

          <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Faculties</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {sortedFaculties.length} total
              </span>
            </div>

            {loadingFaculties ? (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading faculties...
              </div>
            ) : sortedFaculties.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {sortedFaculties.map((faculty) => {
                      const isEditing = editingFacultyId === faculty._id
                      const isDeleting = deletingFacultyId === faculty._id
                      const facultyName = getFacultyName(faculty)

                      return (
                        <tr key={faculty._id} className={isEditing ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : undefined}>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {facultyName || 'Unnamed faculty'}
                            </span>
                            {isEditing ? (
                              <span className="ml-3 rounded-full bg-indigo-100 dark:bg-indigo-950/50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                Editing
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {faculty.phone}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setHistoryFaculty(faculty)}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                History
                              </button>
                              <ActionMenu
                                label={`Settings for ${facultyName || faculty.phone}`}
                                busy={isDeleting}
                                disabled={saving || Boolean(deletingFacultyId)}
                                actions={[
                                  {
                                    key: 'edit',
                                    label: 'Edit faculty',
                                    icon: Pencil,
                                    onClick: () => startEditingFaculty(faculty),
                                  },
                                  {
                                    key: 'delete',
                                    label: 'Delete faculty',
                                    icon: Trash2,
                                    danger: true,
                                    onClick: () => handleDeleteFaculty(faculty),
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                No faculties found.
              </div>
            )}
          </section>
        </div>
      </main>

      {historyFaculty ? (
        <AdminFacultyLogHistory faculty={historyFaculty} onClose={() => setHistoryFaculty(null)} />
      ) : null}
    </div>
  )
}

export default AdminAllFaculties
