import axios from 'axios'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AuthLoadingScreen from '../../Components/Common/AuthLoadingScreen'
import PageTour from '../../Components/Tour/PageTour'
import UserNavbar from '../../Components/User/UserNavbar'
import UserProfileGroup from '../../Components/User/Profile/UserProfileGroup'
import UserProfileLockedRow from '../../Components/User/Profile/UserProfileLockedRow'
import UserProfileRow from '../../Components/User/Profile/UserProfileRow'
import UserProfileSaveBar from '../../Components/User/Profile/UserProfileSaveBar'
import UserProfileSidebar from '../../Components/User/Profile/UserProfileSidebar'
import UserReviewsPanel from '../../Components/User/Review/UserReviewsPanel'
import userProfilePageTour from '../Tour/User/UserProfilePageTour'
import { useAuth } from '../../Context/AuthContext'
import { fadeUp, staggerParent } from '../../utils/motion'
import {
  ACCOUNT_ROWS,
  EMPTY_PROFILE,
  PROFILE_FIELDS,
  PROFILE_SECTIONS,
  countFilled,
  getField,
  getFieldSection,
  getSectionProgress,
  toFormValues,
  validateProfile,
} from '../../utils/profileFields'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const SAVED_MESSAGE_MS = 3500

const ACCOUNT_SECTION_ID = 'account'

// The two stops on the rail that are not a group of profile fields: what the institute
// holds and cannot be edited here, and what the account has said about the institute.
const REVIEWS_SECTION_ID = 'reviews'

const UserProfilePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [account, setAccount] = useState(null)
  const [form, setForm] = useState(EMPTY_PROFILE)
  // What the server last confirmed. Saving is offered only against a real change, and
  // a failed save leaves this untouched so the page still knows what is stored.
  const [savedForm, setSavedForm] = useState(EMPTY_PROFILE)
  // Which rows are open for editing. Several may be, so filling a group in is one pass
  // down it rather than a row opened and closed for every line.
  const [openRows, setOpenRows] = useState({})
  // A rule is quoted back under the row that broke it once that row has been left, or
  // once saving has been asked for. Typing into an empty form is not a mistake yet.
  const [touched, setTouched] = useState({})
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  // The rail picks what the panel shows, and only that group is mounted, so the page
  // never grows past the screen it opened in.
  const [activeSection, setActiveSection] = useState(ACCOUNT_SECTION_ID)

  useEffect(() => {
    let isActive = true

    const loadProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          withCredentials: true,
        })

        const user = response.data?.data?.user

        if (!response.data?.success || user?.role !== 'user') {
          throw new Error('Unauthorized user')
        }

        if (!isActive) {
          return
        }

        const profile = toFormValues(user.profile)

        setAuth({
          role: 'user',
          phone: user.phone,
          token: null,
        })
        setAccount(user)
        setForm(profile)
        setSavedForm(profile)
        setIsAuthorized(true)
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

    loadProfile()

    return () => {
      isActive = false
    }
  }, [clearAuth, setAuth])

  // A session that has run out is the same answer wherever the page notices it: on the
  // first load, on a save, or under the reviews the panel loads for itself.
  const handleAuthError = useCallback(() => {
    clearAuth()
    setIsAuthorized(false)
  }, [clearAuth])

  const errors = useMemo(() => validateProfile(form), [form])
  const invalidCount = Object.keys(errors).length

  const filledCount = useMemo(() => countFilled(form), [form])
  const percent = Math.round((filledCount / PROFILE_FIELDS.length) * 100)

  const isDirty = useMemo(
    () => PROFILE_FIELDS.some((field) => form[field].trim() !== savedForm[field]),
    [form, savedForm],
  )

  // A rule is only worth quoting back once the row has been left or saving has been
  // asked for, so the same test decides what a row says and what the rail marks.
  const showsError = useCallback(
    (name) => Boolean((touched[name] || saveAttempted) && errors[name]),
    [errors, saveAttempted, touched],
  )

  // Only one group is on screen, so the rail has to carry the other groups' news: a
  // save held up by a row two groups away is otherwise a disabled button and no way
  // of knowing which group to open.
  const navItems = useMemo(() => [
    { id: ACCOUNT_SECTION_ID, label: 'Account', count: '' },
    ...PROFILE_SECTIONS.map((section) => {
      const progress = getSectionProgress(section, form)

      return {
        id: section.id,
        label: section.title,
        count: `${progress.filled}/${progress.total}`,
        hasError: section.fields.some((field) => showsError(field.name)),
      }
    }),
    // Reviews are not a form the page saves, so this stop carries no count and nothing
    // in it can hold the save bar up.
    { id: REVIEWS_SECTION_ID, label: 'My reviews', count: '' },
  ], [form, showsError])

  // A stop that describes a group cannot light it while another one is showing, so the
  // walkthrough is handed the switch and opens each group on its way into the stop.
  const tourSteps = useMemo(
    () => userProfilePageTour.map((step) => (
      step.section ? { ...step, onEnter: () => setActiveSection(step.section) } : step
    )),
    [],
  )

  // A form left half typed is worth one browser prompt. It is hung off the change
  // rather than off the page, so a saved form closes as quietly as an untouched one.
  useEffect(() => {
    if (!isDirty) {
      return undefined
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    if (!saved) {
      return undefined
    }

    const timer = setTimeout(() => setSaved(false), SAVED_MESSAGE_MS)

    return () => clearTimeout(timer)
  }, [saved])

  const handleToggleRow = (name) => {
    setOpenRows((currentRows) => ({
      ...currentRows,
      [name]: !currentRows[name],
    }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    const field = getField(name)

    setSaved(false)
    setError('')
    setForm((currentForm) => ({
      ...currentForm,
      // A number the server will only take as digits is cleaned as it is typed, so a
      // pasted phone number with spaces in it is not an error to read and correct.
      [name]: field?.digitsOnly ? value.replace(/\D/g, '') : value,
    }))
  }

  const handleBlur = (event) => {
    const { name } = event.target

    setTouched((currentTouched) => ({
      ...currentTouched,
      [name]: true,
    }))
  }

  const handleDiscard = () => {
    setForm(savedForm)
    setTouched({})
    setSaveAttempted(false)
    setSaved(false)
    setError('')
  }

  const handleSubmit = useCallback(async (event) => {
    event?.preventDefault()

    setSaveAttempted(true)

    // Nothing is sent while a row still breaks its own rule. The first of them may
    // well be in a group that is not showing, so the panel is switched to it and the
    // row opened — mounting an open row is what puts the cursor in it.
    const currentErrors = validateProfile(form)
    const firstInvalid = PROFILE_FIELDS.find((field) => currentErrors[field])

    if (firstInvalid) {
      setActiveSection(getFieldSection(firstInvalid))
      setOpenRows((currentRows) => ({
        ...currentRows,
        [firstInvalid]: true,
      }))
      return
    }

    setSaving(true)
    setSaved(false)
    setError('')

    try {
      const response = await axios.patch(`${API_BASE_URL}/user/profile`, form, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save your details')
      }

      // The server trims and lowercases as it stores, so the rows are refilled from
      // what it kept rather than from what was typed.
      const profile = toFormValues(response.data?.data?.user?.profile)

      setForm(profile)
      setSavedForm(profile)
      setTouched({})
      setSaveAttempted(false)
      // A saved page goes back to being a record of what is held, so the rows that
      // were opened to type in are closed again.
      setOpenRows({})
      setSaved(true)
    } catch (saveError) {
      if ([401, 403].includes(saveError?.response?.status)) {
        handleAuthError()
        return
      }

      setError(saveError?.response?.data?.message || 'Unable to save your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, handleAuthError])

  // A long form is a page people save from the keyboard, and the browser's own answer
  // to that key is to write the page to disk, which is never what was meant here.
  useEffect(() => {
    if (!isAuthorized) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key !== 's' || !(event.metaKey || event.ctrlKey)) {
        return
      }

      event.preventDefault()

      if (isDirty && !saving) {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, isAuthorized, isDirty, saving])

  if (checkingAuth) {
    return <AuthLoadingScreen />
  }

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  const activeGroup = PROFILE_SECTIONS.find((section) => section.id === activeSection)
  const isReviewsSection = activeSection === REVIEWS_SECTION_ID

  const accountValues = {
    name: account?.name || 'Student',
    phone: account?.phone || auth.phone,
    memberId: account?._id ? account._id.slice(-8).toUpperCase() : 'SECURE',
  }

  return (
    // The page is the screen: the rail, the panel and the save bar hold their places,
    // and only a group taller than the room left for it scrolls, inside itself. Below
    // the two column breakpoint there is no room for that, so the page flows again.
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans lg:h-screen lg:overflow-hidden dark:bg-slate-950">
      <div className="shrink-0">
        <UserNavbar />
      </div>

      {/* One setting hands the whole page over to a reader who asked for less motion,
          so no row below has to carry the check itself. */}
      <MotionConfig reducedMotion="user">
        <motion.div
          variants={staggerParent(0.08)}
          initial="hidden"
          animate="visible"
          className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12 lg:px-8"
        >
          <UserProfileSidebar
            items={navItems}
            activeItem={activeSection}
            onSelect={setActiveSection}
            filled={filledCount}
            total={PROFILE_FIELDS.length}
            percent={percent}
          >
            <PageTour steps={tourSteps} />
          </UserProfileSidebar>

          <motion.form
            variants={fadeUp}
            onSubmit={handleSubmit}
            noValidate
            className="flex min-w-0 flex-col gap-5 lg:min-h-0"
          >
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeGroup ? (
                    <UserProfileGroup
                      tourId={`profile-${activeGroup.id}`}
                      title={activeGroup.title}
                      description={activeGroup.hint}
                    >
                      {activeGroup.fields.map((field) => (
                        <UserProfileRow
                          key={field.name}
                          field={field}
                          value={form[field.name]}
                          error={showsError(field.name) ? errors[field.name] : ''}
                          disabled={saving}
                          isOpen={Boolean(openRows[field.name])}
                          onToggle={() => handleToggleRow(field.name)}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      ))}
                    </UserProfileGroup>
                  ) : isReviewsSection ? (
                    <UserProfileGroup
                      tourId="profile-reviews"
                      title="My reviews"
                      description="What you have said about the institute. Yours to edit or delete whenever you like."
                    >
                      <UserReviewsPanel onAuthError={handleAuthError} />
                    </UserProfileGroup>
                  ) : (
                    <UserProfileGroup
                      tourId="profile-account"
                      title="Account"
                      description="You sign in with your phone number. These are held by the institute."
                    >
                      {ACCOUNT_ROWS.map((row) => (
                        <UserProfileLockedRow
                          key={row.key}
                          Icon={row.Icon}
                          label={row.label}
                          value={accountValues[row.key]}
                        />
                      ))}
                    </UserProfileGroup>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error ? (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex shrink-0 items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>

            {/* The bar saves the profile form, and a review is saved as it is written,
                so the reviews stop stands on its own without it. Anything typed into a
                group is still held while it is away from the screen. */}
            {isReviewsSection ? null : (
              <UserProfileSaveBar
                filled={filledCount}
                total={PROFILE_FIELDS.length}
                percent={percent}
                isDirty={isDirty}
                saving={saving}
                saved={saved}
                invalidCount={(saveAttempted || Object.keys(touched).length) ? invalidCount : 0}
                onDiscard={handleDiscard}
              />
            )}
          </motion.form>
        </motion.div>
      </MotionConfig>

      {/* Saving is confirmed where the eye already is, whichever group is open. */}
      <AnimatePresence>
        {saved ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed right-4 top-20 z-40 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-xl dark:border-emerald-900/60 dark:bg-slate-900"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CircleCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Profile saved</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filledCount} of {PROFILE_FIELDS.length} details are with the institute.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default UserProfilePage
