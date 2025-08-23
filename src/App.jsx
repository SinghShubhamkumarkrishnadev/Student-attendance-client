import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HodLogin from "./pages/HodLogin";
import HodRegister from "./pages/HodRegister";
import HodDashboard from "./pages/HodDashboard";
import ProfessorsPage from "./pages/ProfessorsPage";
import ClassesPage from "./pages/ClassesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AssignProfessorsPage from "./pages/AssignProfessorsPage";
import StudentsPage from "./pages/StudentsPage";
import AssignStudentsPage from "./pages/AssignStudentsPage";

function App() {
  return (
    <Router>
      <Routes>

        <Route
          path="/hod/assign-students"
          element={
            <ProtectedRoute>
              <AssignStudentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hod/students"
          element={
            <ProtectedRoute>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hod/assign-professors"
          element={
            <ProtectedRoute>
              <AssignProfessorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hod/dashboard"
          element={
            <ProtectedRoute>
              <HodDashboard />
            </ProtectedRoute>
          }
        />

        {/* Professors & Classes Pages */}
        <Route
          path="/hod/professors"
          element={
            <ProtectedRoute>
              <ProfessorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hod/classes"
          element={
            <ProtectedRoute>
              <ClassesPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to HOD login */}
        <Route path="/" element={<Navigate to="/hod/login" />} />

        {/* HOD Authentication */}
        <Route path="/hod/login" element={<HodLogin />} />
        <Route path="/hod/register" element={<HodRegister />} />

        {/* fallback */}
        <Route
          path="*"
          element={
            <h1 className="text-center mt-10 text-red-600 text-2xl">
              404 🚫 Page Not Found
            </h1>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
