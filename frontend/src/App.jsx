import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import FAQ from './pages/FAQ'
import CustomerLayout from './components/customer/CustomerLayout'
import Dashboard from './pages/customer/Dashboard'
import QuizList from './pages/customer/QuizList'
import QuizAttempt from './pages/customer/QuizAttempt'
import Results from './pages/customer/Results'
import Certificate from './pages/customer/Certificate'
import History from './pages/customer/History'
import Profile from './pages/customer/Profile'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/DashboardOverview'
import ManageCategories from './pages/admin/ManageCategories'
import ManageQuestions from './pages/admin/ManageQuestions'
import ManageSuppliers from './pages/admin/ManageSuppliers'
import AllResults from './pages/admin/AllResults'
import ManageFAQs from './pages/admin/ManageFAQs'
import SupplierLayout from './components/supplier/SupplierLayout'
import SupplierDashboardOverview from './pages/supplier/DashboardOverview'
import MyQuestions from './pages/supplier/MyQuestions'
import AddQuestion from './pages/supplier/AddQuestion'

// /login and /register are done as of Phase 5 — see pages/Login.jsx and
// pages/Register.jsx. / is Phase 9 — see pages/Home.jsx, which has its
// own real navbar (logo, category links, "Register to Start" CTA) per
// context.md Section 2's Homepage spec, replacing the global placeholder
// <nav> this file used to render above every route. /customer/* is Phase
// 6, /admin/* is Phase 7, and /supplier/* is Phase 8 — all three done
// below as nested route trees under their own layout, each with its own
// sidebar + logout built in — see ProtectedRoute.jsx's own comment on
// this exact pattern. /faq is Phase 10 — a public page, so it sits
// alongside / /login /register rather than under any role's protected
// tree; /admin/faqs (same phase) is that page's admin-managed backend,
// nested under the existing /admin ProtectedRoute + AdminLayout like
// every other admin page.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/faq" element={<FAQ />} />
          <Route
            path="/admin"
            element={<ProtectedRoute allowedRoles={['admin']} />}
          >
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="categories" element={<ManageCategories />} />
              <Route path="questions" element={<ManageQuestions />} />
              <Route path="suppliers" element={<ManageSuppliers />} />
              <Route path="results" element={<AllResults />} />
              <Route path="faqs" element={<ManageFAQs />} />
            </Route>
          </Route>
          <Route
            path="/supplier"
            element={<ProtectedRoute allowedRoles={['supplier']} />}
          >
            <Route element={<SupplierLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SupplierDashboardOverview />} />
              <Route path="questions" element={<MyQuestions />} />
              <Route path="add-question" element={<AddQuestion />} />
            </Route>
          </Route>
          <Route
            path="/customer"
            element={<ProtectedRoute allowedRoles={['customer']} />}
          >
            <Route element={<CustomerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="quizzes" element={<QuizList />} />
              <Route path="quiz/:categoryId/:difficulty" element={<QuizAttempt />} />
              <Route path="results/:id" element={<Results />} />
              <Route path="certificate/:resultId" element={<Certificate />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
