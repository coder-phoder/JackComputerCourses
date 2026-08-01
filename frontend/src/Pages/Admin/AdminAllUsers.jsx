import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
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

const getUserName = (user) => String(user?.name || '').trim()

const sortUsers = (first, second) => {
  const nameComparison = getUserName(first).localeCompare(getUserName(second))

  return nameComparison || first.phone.localeCompare(second.phone)
}

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
    () => [...users].sort(sortUsers),
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
    const name = form.name.trim()

    if (!name || !phone || !form.password) {
      setError('Name, phone and password are required.')
      return
    }

    setSaving(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users`, {
        name,
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
      name: getUserName(user),
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
    const name = editingForm.name.trim()

    if (!name || !phone) {
      setError('Name and phone are required.')
      return
    }

    setSaving(true)

    try {
      const payload = {}

      if (phone) {
        payload.phone = phone
      }

      if (name) {
        payload.name = name
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
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">All Users</h1>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
          >
            {loadingUsers ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            {editingUser ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit User</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {getUserName(editingUser) || editingUser.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEditingUser}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Name
                    </label>
                    <input
                      id="edit-name"
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
                    <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Phone
                    </label>
                    <input
                      id="edit-phone"
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
                    <label htmlFor="edit-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      New Password
                    </label>
                    <PasswordInput
                      id="edit-password"
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create User</h2>

                <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="create-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Name
                    </label>
                    <input
                      id="create-name"
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
                    <label htmlFor="create-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Phone
                    </label>
                    <input
                      id="create-phone"
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
                    <label htmlFor="create-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Password
                    </label>
                    <PasswordInput
                      id="create-password"
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
                    {saving ? 'Creating...' : 'Create User'}
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Users</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {sortedUsers.length} total
              </span>
            </div>

            {loadingUsers ? (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading users...
              </div>
            ) : sortedUsers.length ? (
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
                    {sortedUsers.map((user) => {
                      const isEditing = editingUserId === user._id
                      const isDeleting = deletingUserId === user._id
                      const userName = getUserName(user)

                      return (
                        <tr key={user._id} className={isEditing ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : undefined}>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {userName || 'Unnamed user'}
                            </span>
                            {isEditing ? (
                              <span className="ml-3 rounded-full bg-indigo-100 dark:bg-indigo-950/50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                Editing
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {user.phone}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditingUser(user)}
                                disabled={saving || Boolean(deletingUserId)}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                              >
                                {isEditing ? 'Selected' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                disabled={saving || isDeleting}
                                className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
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
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
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
