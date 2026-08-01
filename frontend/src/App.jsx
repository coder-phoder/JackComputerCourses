import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import AuthLoadingScreen from './Components/Common/AuthLoadingScreen'
import { AuthProvider, fetchRoleProfile, useAuth } from './Context/AuthContext'
import { ThemeProvider } from './Context/ThemeContext'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import NotFoundPage from './Pages/Common/NotFoundPage'
import RegisterPage from './Pages/Common/RegisterPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserCoursesPage from './Pages/User/UserCoursesPage'
import UserCoursePlayerPage from './Pages/User/UserCoursePlayerPage'
import UserIdePage from './Pages/User/UserIdePage'
import UserBug from './Pages/User/UserBug'
import AdminHomePage from './Pages/Admin/AdminHomePage'
import AdminAllUsers from './Pages/Admin/AdminAllUsers'
import AdminAllFaculties from './Pages/Admin/AdminAllFaculties'
import AdminCourses from './Pages/Admin/AdminCourses'
import Course from './Pages/Admin/Course'
import CourseAccessPage from './Pages/Admin/CourseAccessPage'
import AdminNotes from './Pages/Admin/AdminNotes'
import AdminTopicNotes from './Pages/Admin/AdminTopicNotes'
import AdminBugs from './Pages/Admin/AdminBugs'
import FacultyHomePage from './Pages/Faculty/FacultyHomePage'
import FacultyCoursesPage from './Pages/Faculty/FacultyCoursesPage'
import FacultyCoursePage from './Pages/Faculty/FacultyCoursePage'
import FacultyCourseNotes from './Pages/Faculty/FacultyCourseNotes'
import FacultyTopicNotes from './Pages/Faculty/FacultyTopicNotes'
import FacultyIdePage from './Pages/Faculty/FacultyIdePage'
import FacultyQueries from './Pages/Faculty/FacultyQueries'
import FacultyBug from './Pages/Faculty/FacultyBug'
import SharedIDE from './Components/IDE/SharedIDE'
import { SELF_REGISTRATION_ENABLED } from './utils/featureFlags'

const getLoginState = (location) => ({
  from: {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  },
})

const ProtectedRoute = ({ role, children }) => {
  const location = useLocation()
  const { clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let isActive = true

    const verifyAccess = async () => {
      const profile = await fetchRoleProfile(role)

      if (!isActive) {
        return
      }

      if (profile) {
        setAuth({
          role,
          phone: profile.phone,
          token: null,
        })
        setIsAuthorized(true)
      } else {
        clearAuth()
        setIsAuthorized(false)
      }

      setCheckingAuth(false)
    }

    verifyAccess()

    return () => {
      isActive = false
    }
  }, [clearAuth, role, setAuth])

  if (checkingAuth) {
    return <AuthLoadingScreen />
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace state={getLoginState(location)} />
  }

  return children
}

const protect = (role, element) => (
  <ProtectedRoute role={role}>
    {element}
  </ProtectedRoute>
)

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/register"
              element={SELF_REGISTRATION_ENABLED ? <RegisterPage /> : <Navigate to="/login" replace />}
            />
            <Route path="/shared-ide/:token" element={<SharedIDE />} />
            <Route path="/user/home" element={protect('user', <UserHomePage />)} />
            <Route path="/user/courses" element={protect('user', <UserCoursesPage />)} />
            <Route path="/user/courses/:courseId/player" element={protect('user', <UserCoursePlayerPage />)} />
            <Route path="/user/ide" element={protect('user', <UserIdePage />)} />
            <Route path="/user/bugs" element={protect('user', <UserBug />)} />
            <Route path="/faculty/home" element={protect('faculty', <FacultyHomePage />)} />
            <Route path="/faculty/courses" element={protect('faculty', <FacultyCoursesPage />)} />
            <Route path="/faculty/courses/:courseId" element={protect('faculty', <FacultyCoursePage />)} />
            <Route path="/faculty/ide" element={protect('faculty', <FacultyIdePage />)} />
            <Route path="/faculty/queries" element={protect('faculty', <FacultyQueries />)} />
            <Route path="/faculty/notes" element={protect('faculty', <FacultyTopicNotes />)} />
            <Route path="/faculty/notes/:courseId" element={protect('faculty', <FacultyCourseNotes />)} />
            <Route path="/faculty/topic-notes" element={protect('faculty', <FacultyTopicNotes />)} />
            <Route path="/faculty/bugs" element={protect('faculty', <FacultyBug />)} />
            <Route path="/admin/home" element={protect('admin', <AdminHomePage />)} />
            <Route path="/admin/users" element={protect('admin', <AdminAllUsers />)} />
            <Route path="/admin/faculties" element={protect('admin', <AdminAllFaculties />)} />
            <Route path="/admin/courses" element={protect('admin', <AdminCourses />)} />
            <Route path="/admin/topic-notes" element={protect('admin', <AdminTopicNotes />)} />
            <Route path="/admin/bugs" element={protect('admin', <AdminBugs />)} />
            <Route path="/admin/courses/:courseId/access" element={protect('admin', <CourseAccessPage />)} />
            <Route path="/admin/courses/:courseId/notes" element={protect('admin', <AdminNotes />)} />
            <Route path="/admin/courses/:courseId" element={protect('admin', <Course />)} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
