import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./ProtectedRoute";

import AdminLayout from "./layouts/AdminLayout";
import StaffLayout from "./layouts/StaffLayout";
import StudentLayout from "./layouts/StudentLayout";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageStaff from "./pages/admin/ManageStaff";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import ManageStudent from "./pages/admin/ManageStudent";
import AcademicManagement from "./pages/admin/AcademicManagement";
import ManageMCQ from "./pages/admin/ManageMCQ";
import ManageMaterial from "./pages/admin/ManageMaterial";
import StudentForm from "./components/StudentForm";
import StudentProfileManage from "./pages/student/StudentProfileManage";
import MyMaterials from "./pages/student/MyMaterials";
import GiveMCQTest from "./pages/student/GiveMCQTest";
import MyGeneratedPapers from "./pages/student/MyGeneratedPapers";
import MyGeneratedPapersStaffAdmin from "./pages/admin/MyGeneratedPapersStaffAdmin";
import TestHistory from "./pages/student/TestHistory";
import SelectMCQs from "./components/SelectMCQs";
import ViewAllMCQs from "./pages/student/ViewAllMCQs";
import Settings from "./pages/admin/Settings";
import ExamResultPreview from "./pages/student/ExamResultPreview";
import ChangePassword from "./pages/staff/ChangePassword";

import AdminRegister from "./pages/admin/AdminRegister";

import "katex/dist/katex.min.css";

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<Login />} />

      {/* Route for student register */}
      <Route path="/student/register" element={<StudentForm />} />

      {/* Route for admin register */}
      <Route path="/register-admin" element={<AdminRegister />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="manage-staff" element={<ManageStaff />} />
        <Route path="manage-student" element={<ManageStudent />} />
        <Route path="manage-academics" element={<AcademicManagement />} />
        <Route path="manage-mcqs" element={<ManageMCQ />} />
        <Route
          path="my-generated-papers"
          element={<MyGeneratedPapersStaffAdmin />}
        />
        <Route path="manage-materials" element={<ManageMaterial />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Staff Routes */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="manage-student" element={<ManageStudent />} />
        <Route path="manage-mcqs" element={<ManageMCQ />} />
        <Route
          path="my-generated-papers"
          element={<MyGeneratedPapersStaffAdmin />}
        />
        <Route path="manage-materials" element={<ManageMaterial />} />
        <Route path="change-password" element={<ChangePassword />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="manage-profile" element={<StudentProfileManage />} />
        <Route path="my-materials" element={<MyMaterials />} />
        <Route path="view-mcqs" element={<ViewAllMCQs />} />
        <Route path="give-mcq-test" element={<GiveMCQTest />} />
        <Route path="my-generated-papers" element={<MyGeneratedPapers />} />
        <Route path="test-history" element={<TestHistory />} />
        <Route path="select-mcqs" element={<SelectMCQs />} />
        <Route path="exam-result/:attemptId" element={<ExamResultPreview />} />
      </Route>
    </Routes>
  );
}

export default App;
