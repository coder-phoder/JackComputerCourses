import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './Context/AuthContext'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import UserHomePage from './Pages/User/UserHomePage'
import AdminHomePage from './Pages/Admin/AdminHomePage'
import AdminAllUsers from './Pages/Admin/AdminAllUsers'
import AdminCourses from './Pages/Admin/AdminCourses'

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/user/home" element={<UserHomePage />} />
          <Route path="/admin/home" element={<AdminHomePage />} />
          <Route path="/admin/users" element={<AdminAllUsers />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
