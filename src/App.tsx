import { Routes, Route } from 'react-router-dom'
import { Toaster, ToasterProvider } from './components/ui/Toaster'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Pages
import { LandingPage } from './pages/LandingPage'
import { SignInPage } from './pages/auth/SignInPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { DashboardPage } from './pages/DashboardPage'
import { JobsPage } from './pages/JobsPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { CandidatesPage } from './pages/CandidatesPage'
import { CandidateProfilePage } from './pages/CandidateProfilePage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { ProfileSettingsPage } from './pages/ProfileSettingsPage'
import { EmployerProfilePage } from './pages/EmployerProfilePage'
import { NewJobPage } from './pages/NewJobPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <ToasterProvider>
      <AuthProvider>
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/signin" element={<SignInPage />} />
        <Route path="/auth/signup" element={<SignUpPage />} />
        
        {/* Protected routes with layout */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <JobsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/jobs/new"
            element={
              <ProtectedRoute requiredRole="employer">
                <NewJobPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute>
                <JobDetailPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/candidates"
            element={
              <ProtectedRoute>
                <CandidatesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/candidates/:id"
            element={
              <ProtectedRoute requiredRole="employer">
                <CandidateProfilePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/applications"
            element={
              <ProtectedRoute requiredRole="employer">
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/my-applications"
            element={
              <ProtectedRoute requiredRole="candidate">
                <CandidateApplicationsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute>
                <ApplicationDetailPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettingsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/company-profile"
            element={
              <ProtectedRoute requiredRole="employer">
                <EmployerProfilePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        
        {/* 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
        
        <Toaster />
      </AuthProvider>
    </ToasterProvider>
  )
}

export default App