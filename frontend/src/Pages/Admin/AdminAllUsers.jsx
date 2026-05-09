import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const emptyForm = {
  phone: '',
  password: '',
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const AdminAllUsers = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingUserId, setEditingUserId] = useState('')
  const [editingForm, setEditingForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')

  const sortedUsers = useMemo(
    () => [...users].sort((first, second) => first.phone.localeCompare(second.phone)),
    [users],
  )
  const editingUser = useMemo(
    () => users.find((user) => user._id === editingUserId) || null,
    [editingUserId, users],
  )

  const fetchUsers = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingUsers(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch users')
      }

      if (shouldUpdate()) {
        setUsers(response.data?.data?.users || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch users. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingUsers(false)
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
        await fetchUsers({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchUsers, setAuth])

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

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    resetMessages()

    const phone = form.phone.trim()

    if (!phone || !form.password) {
      setError('Phone and password are required.')
      return
    }

    setSaving(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users`, {
        phone,
        password: form.password,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to create user')
      }

      const createdUser = response.data?.data?.user

      if (createdUser) {
        setUsers((currentUsers) => [...currentUsers, createdUser])
      } else {
        await fetchUsers()
      }

      setForm(emptyForm)
      setSuccess('User created successfully.')
    } catch (createError) {
      setError(getErrorMessage(createError, 'Unable to create user. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const startEditingUser = (user) => {
    resetMessages()
    setEditingUserId(user._id)
    setEditingForm({
      phone: user.phone,
      password: '',
    })
  }

  const cancelEditingUser = () => {
    setEditingUserId('')
    setEditingForm(emptyForm)
  }

  const handleUpdateUser = async (event) => {
    event.preventDefault()
    resetMessages()

    const phone = editingForm.phone.trim()

    if (!phone) {
      setError('Phone is required.')
      return
    }

    setSaving(true)

    try {
      const payload = {}

      if (phone) {
        payload.phone = phone
      }

      if (editingForm.password) {
        payload.password = editingForm.password
      }

      const response = await axios.patch(`${API_BASE_URL}/admin/users/${editingUserId}`, payload, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update user')
      }

      const updatedUser = response.data?.data?.user

      if (updatedUser) {
        setUsers((currentUsers) => currentUsers.map((user) => (
          user._id === editingUserId ? updatedUser : user
        )))
      } else {
        await fetchUsers()
      }

      cancelEditingUser()
      setSuccess('User updated successfully.')
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Unable to update user. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (user) => {
    resetMessages()

    const confirmed = window.confirm(`Delete user ${user.phone}?`)

    if (!confirmed) {
      return
    }

    setDeletingUserId(user._id)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/users/${user._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete user')
      }

      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser._id !== user._id))
      if (editingUserId === user._id) {
        cancelEditingUser()
      }
      setSuccess('User deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete user. Please try again.'))
    } finally {
      setDeletingUserId('')
    }
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
            <h1 className="mt-2 text-3xl font-bold text-slate-900">All Users</h1>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {loadingUsers ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {editingUser ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Edit User</h2>
                    <p className="mt-1 text-sm text-slate-500">{editingUser.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditingUser}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700">
                      Phone
                    </label>
                    <input
                      id="edit-phone"
                      name="phone"
                      type="tel"
                      value={editingForm.phone}
                      onChange={handleEditingFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-password" className="block text-sm font-medium text-slate-700">
                      New Password
                    </label>
                    <input
                      id="edit-password"
                      name="password"
                      type="password"
                      value={editingForm.password}
                      onChange={handleEditingFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900">Create User</h2>

                <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="create-phone" className="block text-sm font-medium text-slate-700">
                      Phone
                    </label>
                    <input
                      id="create-phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="create-password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <input
                      id="create-password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleFormChange}
                      disabled={saving}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                      placeholder="Enter password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {saving ? 'Creating...' : 'Create User'}
                  </button>
                </form>
              </>
            )}

            {error ? (
              <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </p>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">Users</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {sortedUsers.length} total
              </span>
            </div>

            {loadingUsers ? (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
                Loading users...
              </div>
            ) : sortedUsers.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {sortedUsers.map((user) => {
                      const isEditing = editingUserId === user._id
                      const isDeleting = deletingUserId === user._id

                      return (
                        <tr key={user._id} className={isEditing ? 'bg-indigo-50/40' : undefined}>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-900">
                              {user.phone}
                            </span>
                            {isEditing ? (
                              <span className="ml-3 rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
                                Editing
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingUser(user)}
                                disabled={saving || Boolean(deletingUserId)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                {isEditing ? 'Selected' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                disabled={saving || isDeleting}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300"
                              >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
                No users found.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminAllUsers
