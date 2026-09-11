import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'

import ProtectedRoute from './components/shared/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'


/* =========================
   CUSTOMER
========================= */

import CustomerLayout from './components/customer/CustomerLayout'
import Dashboard from './pages/customer/Dashboard'
import QuizList from './pages/customer/QuizList'
import QuizDifficulty from './pages/customer/QuizDifficulty'
import QuizAttempt from './pages/customer/QuizAttempt'
import Results from './pages/customer/Results'
import Certificate from './pages/customer/Certificate'
import History from './pages/customer/History'
import Profile from './pages/customer/Profile'


/* =========================
   ADMIN
========================= */

import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/DashboardOverview'
import ManageCategories from './pages/admin/ManageCategories'
import ManageQuestions from './pages/admin/ManageQuestions'
import ManageSuppliers from './pages/admin/ManageSuppliers'
import AllResults from './pages/admin/AllResults'


/* =========================
   SUPPLIER
========================= */

import SupplierLayout from './components/supplier/SupplierLayout'
import SupplierDashboardOverview from './pages/supplier/DashboardOverview'
import MyQuestions from './pages/supplier/MyQuestions'
import AddQuestion from './pages/supplier/AddQuestion'
import SupplierProfile from './pages/supplier/Profile'


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* =========================
              PUBLIC
          ========================= */}

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


          {/* =========================
              ADMIN
          ========================= */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={['admin']}
              />
            }
          >
            <Route element={<AdminLayout />}>

              <Route
                index
                element={
                  <Navigate
                    to="dashboard"
                    replace
                  />
                }
              />

              <Route
                path="dashboard"
                element={<AdminDashboard />}
              />

              <Route
                path="categories"
                element={<ManageCategories />}
              />

              <Route
                path="questions"
                element={<ManageQuestions />}
              />

              <Route
                path="suppliers"
                element={<ManageSuppliers />}
              />

              <Route
                path="results"
                element={<AllResults />}
              />

            </Route>
          </Route>


          {/* =========================
              SUPPLIER
          ========================= */}

          <Route
            path="/supplier"
            element={
              <ProtectedRoute
                allowedRoles={['supplier']}
              />
            }
          >
            <Route element={<SupplierLayout />}>

              <Route
                index
                element={
                  <Navigate
                    to="dashboard"
                    replace
                  />
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
                element={<MyQuestions />}
              />

              <Route
                path="add-question"
                element={<AddQuestion />}
              />

              <Route
                path="profile"
                element={<SupplierProfile />}
              />

            </Route>
          </Route>


          {/* =========================
              CUSTOMER
          ========================= */}

          <Route
            path="/customer"
            element={
              <ProtectedRoute
                allowedRoles={['customer']}
              />
            }
          >
            <Route element={<CustomerLayout />}>

              <Route
                index
                element={
                  <Navigate
                    to="dashboard"
                    replace
                  />
                }
              />

              <Route
                path="dashboard"
                element={<Dashboard />}
              />

              <Route
                path="quizzes"
                element={<QuizList />}
              />

              {/* IMPORTANT:
                  Category → Difficulty selection
              */}
              <Route
                path="quiz-difficulty/:categoryId"
                element={<QuizDifficulty />}
              />

              {/* Actual quiz */}
              <Route
                path="quiz/:categoryId/:difficulty"
                element={<QuizAttempt />}
              />

              <Route
                path="results/:id"
                element={<Results />}
              />

              <Route
                path="certificate/:resultId"
                element={<Certificate />}
              />

              <Route
                path="history"
                element={<History />}
              />

              <Route
                path="profile"
                element={<Profile />}
              />

            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App