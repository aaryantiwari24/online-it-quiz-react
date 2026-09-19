import { Routes, Route } from 'react-router-dom'

// Public pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

// Admin
import AdminLayout from './components/admin/AdminLayout'
import DashboardOverview from './pages/admin/DashboardOverview'
import ManageCustomers from './pages/admin/ManageCustomers'
import ManageSuppliers from './pages/admin/ManageSuppliers'
import ManageCategories from './pages/admin/ManageCategories'
import AllResults from './pages/admin/AllResults'
import ManageCertificates from './pages/admin/ManageCertificates'
import AdminProfile from './pages/admin/AdminProfile'
import AdminCertificate from './pages/admin/AdminCertificate'

// Supplier
import SupplierLayout from './components/supplier/SupplierLayout'
import SupplierDashboardOverview from './pages/supplier/DashboardOverview'
import MyQuestions from './pages/supplier/MyQuestions'
import AddQuestion from './pages/supplier/AddQuestion'
import SupplierProfile from './pages/supplier/Profile'

// Customer
import CustomerLayout from './components/customer/CustomerLayout'
import CustomerDashboardOverview from './pages/customer/Dashboard'
import QuizCategories from './pages/customer/QuizList'
import QuizDifficulty from './pages/customer/QuizDifficulty'
import Quiz from './pages/customer/QuizAttempt'
import Result from './pages/customer/Results'
import Certificate from './pages/customer/Certificate'
import History from './pages/customer/History'
import CustomerProfile from './pages/customer/Profile'

// Shared
import ProtectedRoute from './components/shared/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* ==================== PUBLIC ==================== */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />


      {/* ==================== ADMIN ==================== */}

      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']} />
        }
      >
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={
              <DashboardOverview />
            }
          />

          <Route
            path="dashboard"
            element={
              <DashboardOverview />
            }
          />

          <Route
            path="customers"
            element={
              <ManageCustomers />
            }
          />

          <Route
            path="suppliers"
            element={
              <ManageSuppliers />
            }
          />

          <Route
            path="categories"
            element={
              <ManageCategories />
            }
          />

          <Route
            path="results"
            element={
              <AllResults />
            }
          />

          <Route
            path="certificates"
            element={
              <ManageCertificates />
            }
          />

          {/* View a specific certificate */}
          <Route
            path="certificates/:resultId"
            element={
              <AdminCertificate />
            }
          />

          <Route
            path="profile"
            element={
              <AdminProfile />
            }
          />
        </Route>
      </Route>


      {/* ==================== SUPPLIER ==================== */}

      <Route
        element={
          <ProtectedRoute allowedRoles={['supplier']} />
        }
      >
        <Route
          path="/supplier"
          element={<SupplierLayout />}
        >
          <Route
            index
            element={
              <SupplierDashboardOverview />
            }
          />

          <Route
            path="dashboard"
            element={
              <SupplierDashboardOverview />
            }
          />

          <Route
            path="questions"
            element={
              <MyQuestions />
            }
          />

          <Route
            path="add-question"
            element={
              <AddQuestion />
            }
          />

          <Route
            path="profile"
            element={
              <SupplierProfile />
            }
          />
        </Route>
      </Route>


      {/* ==================== CUSTOMER ==================== */}

      <Route
        element={
          <ProtectedRoute allowedRoles={['customer']} />
        }
      >
        <Route
          path="/customer"
          element={<CustomerLayout />}
        >
          <Route
            index
            element={
              <CustomerDashboardOverview />
            }
          />

          <Route
            path="dashboard"
            element={
              <CustomerDashboardOverview />
            }
          />

          <Route
            path="quizzes"
            element={
              <QuizCategories />
            }
          />

          <Route
            path="quiz-difficulty/:categoryId"
            element={
              <QuizDifficulty />
            }
          />

          <Route
            path="quiz/:categoryId/:difficulty"
            element={
              <Quiz />
            }
          />

          <Route
            path="results/:id"
            element={
              <Result />
            }
          />

          <Route
            path="certificate/:resultId"
            element={
              <Certificate />
            }
          />

          <Route
            path="history"
            element={
              <History />
            }
          />

          <Route
            path="profile"
            element={
              <CustomerProfile />
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App