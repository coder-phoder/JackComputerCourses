import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const normalizePhone = (value) => String(value || '').trim()

const getUserName = (user) => String(user?.name || '').trim()

const sortUsers = (first, second) => {
  const nameComparison = getUserName(first).localeCompare(getUserName(second))

  return nameComparison || first.phone.localeCompare(second.phone)
}

const parsePhoneInput = (value) => (
  String(value || '')
    .split(',')
    .map((phone) => phone.trim())
    .filter(Boolean)
)

const CourseAccessPage = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [accessPhones, setAccessPhones] = useState([])
  const [users, setUsers] = useState([])
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [phoneInput, setPhoneInput] = useState('')
  const [busyAccessKey, setBusyAccessKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessPhoneSet = useMemo(() => (
    new Set(accessPhones.map(normalizePhone).filter(Boolean))
  ), [accessPhones])

  const accessUsers = useMemo(() => (
    accessPhones
      .map((phone) => {
        const normalizedPhone = normalizePhone(phone)
        const matchingUser = users.find((user) => normalizePhone(user.phone) === normalizedPhone)

        return matchingUser || {
          _id: normalizedPhone,
          name: '',
          phone: normalizedPhone,
        }
      })
      .filter((user) => user.phone)
      .sort(sortUsers)
  ), [accessPhones, users])

  const availableUsers = useMemo(() => (
    users
      .filter((user) => !accessPhoneSet.has(normalizePhone(user.phone)))
      .sort(sortUsers)
  ), [accessPhoneSet, users])

  const applyAccessData = useCallback((data = {}) => {
    setAccessPhones(data.allowedUserPhones || [])

    if (data.course) {
      setCourse(data.course)
    }
  }, [])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const fetchAccessData = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingAccess(true)
      setError('')
    }

    try {
      const [accessResponse, usersResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/courses/${courseId}/access`, {
          withCredentials: true,
        }),
        axios.get(`${API_BASE_URL}/admin/users`, {
          withCredentials: true,
        }),
      ])

      if (!accessResponse.data?.success) {
        throw new Error(accessResponse.data?.message || 'Unable to fetch course access')
      }

      if (!usersResponse.data?.success) {
        throw new Error(usersResponse.data?.message || 'Unable to fetch users')
      }

      if (shouldUpdate()) {
        applyAccessData(accessResponse.data?.data)
        setUsers(usersResponse.data?.data?.users || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to load course access. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingAccess(false)
      }
    }
  }, [applyAccessData, courseId])

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
        await fetchAccessData({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchAccessData, setAuth])

  const grantAccess = async (phones, successMessage = 'Course access granted successfully.') => {
    const normalizedPhones = phones.map(normalizePhone).filter(Boolean)

    if (!normalizedPhones.length) {
      setError('Enter at least one phone number.')
      setSuccess('')
      return
    }

    resetMessages()
    setBusyAccessKey(`add:${normalizedPhones.join(',')}`)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/courses/${courseId}/access`,
        { phones: normalizedPhones },
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to add course access')
      }

      applyAccessData(response.data?.data)
      setPhoneInput('')
      setSuccess(successMessage)
    } catch (grantError) {
      setError(getErrorMessage(grantError, 'Unable to add course access. Please try again.'))
    } finally {
      setBusyAccessKey('')
    }
  }

  const removeAccess = async (phone) => {
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return
    }

    resetMessages()
    setBusyAccessKey(`remove:${normalizedPhone}`)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/courses/${courseId}/access`, {
        data: { phones: [normalizedPhone] },
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to remove course access')
      }

      applyAccessData(response.data?.data)
      setSuccess('Course access removed successfully.')
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'Unable to remove course access. Please try again.'))
    } finally {
      setBusyAccessKey('')
    }
  }

  const handleGrantSubmit = (event) => {
    event.preventDefault()
    grantAccess(parsePhoneInput(phoneInput))
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
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to={`/admin/courses/${courseId}`}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Back to course
          </Link>
          <Link
            to="/admin/courses"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Back to courses
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              User Access
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {course?.title || 'Course Access'}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => fetchAccessData()}
            disabled={loadingAccess || Boolean(busyAccessKey)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {loadingAccess ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </p>
        ) : null}

        {loadingAccess ? (
          <section className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Loading course access...</p>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Grant Access</h2>

              <form onSubmit={handleGrantSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="access-phone" className="block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    id="access-phone"
                    type="text"
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                    disabled={Boolean(busyAccessKey)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
                    placeholder="9876543210"
                  />
                </div>

                <button
                  type="submit"
                  disabled={Boolean(busyAccessKey)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {busyAccessKey.startsWith('add:') ? 'Granting...' : 'Grant Access'}
                </button>
              </form>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900">Available Users</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {availableUsers.length}
                  </span>
                </div>

                {availableUsers.length ? (
                  <div className="mt-3 max-h-105 space-y-2 overflow-y-auto pr-1">
                    {availableUsers.map((user) => {
                      const addKey = `add:${normalizePhone(user.phone)}`
                      const userName = getUserName(user)

                      return (
                        <div
                          key={user._id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {userName || user.phone}
                            </p>
                            {userName ? (
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                                {user.phone}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => grantAccess([user.phone], `Access granted to ${user.phone}.`)}
                            disabled={Boolean(busyAccessKey)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:text-indigo-300"
                          >
                            {busyAccessKey === addKey ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                    All existing users already have access.
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">Users With Access</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {accessUsers.length} total
                </span>
              </div>

              {accessUsers.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {accessUsers.map((user) => {
                        const removeKey = `remove:${normalizePhone(user.phone)}`
                        const userName = getUserName(user)

                        return (
                          <tr key={user._id}>
                            <td className="px-6 py-4 align-top">
                              <span className="text-sm font-semibold text-slate-900">
                                {userName || 'Unknown user'}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className="text-sm font-semibold text-slate-700">
                                {user.phone}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeAccess(user.phone)}
                                  disabled={Boolean(busyAccessKey)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300"
                                >
                                  {busyAccessKey === removeKey ? 'Removing...' : 'Remove'}
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
                  No users have access to this course yet.
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default CourseAccessPage
