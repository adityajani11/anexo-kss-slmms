import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "../components/Loader";
import logo from "../assets/logo-trans.png";
import StudentForm from "../components/StudentForm";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

const roles = ["admin", "staff", "student"];

export default function Login() {
  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const navigate = useNavigate();

  // Auto-clear error after 2 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const roleEndpoint = role === "student" ? "students" : role;
      let url = `${base}/${roleEndpoint}/login`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");

      const { token, user } = data.data || data;
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));

      navigate(`/${role}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const roleWelcome = {
    admin: "Manage the system with ease",
    staff: "Access your teaching tools",
    student: "Start your learning journey",
  };

  const roleDescriptions = {
    admin:
      "Comprehensive system control and user management at your fingertips.",
    staff: "Streamline your teaching workflow with powerful educational tools.",
    student:
      "Discover, learn, and grow with our interactive learning platform.",
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden relative">
      {loading && <Loader message="Signing in…" />}

      {/* LEFT SIDE (Gradient Info) */}
      <div className="hidden lg:flex w-8/12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-center w-full h-full p-8">
          <div className="text-center max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                  {roleWelcome[role]}
                </h1>
                <p className="text-lg text-white/90 mb-8">
                  {roleDescriptions[role]}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE (Login Form) */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
            <div className="text-center mb-4">
              <img
                src={logo}
                alt="Logo"
                className="mx-auto mb-3 max-w-[100px] h-auto"
              />
              <h2 className="text-xl font-bold text-gray-900">
                Krishna School Keshod
              </h2>
            </div>
            {/* Role Selection */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm">
                Login as
              </label>
              <div className="grid grid-cols-3 gap-1">
                {roles.map((r) => (
                  <label
                    key={r}
                    className={`cursor-pointer transition-all duration-200 ${
                      role === r
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    } border-2 rounded-lg p-2 text-center font-medium`}
                  >
                    <input
                      type="radio"
                      value={r.toLowerCase()}
                      checked={role === r.toLowerCase()}
                      onChange={(e) => setRole(e.target.value)}
                      className="sr-only"
                    />
                    <div className="capitalize text-sm">{r}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1 text-md">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your username"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1 text-md">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all cursor-pointer"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Forgot Password?
                </button>
              </div>
            </form>

            {/* Student Note */}
            {role === "student" && (
              <div className="mt-3 text-center text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-3">
                <p>
                  If any query or trouble in register / login then please
                  contact us on
                </p>
                <p className="mt-1 font-semibold text-indigo-700">
                  +91 98245 00853
                </p>
              </div>
            )}

            {/* Show Create Account button only for Students */}
            {role === "student" && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowStudentForm(true)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Create New Account
                </button>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error-message"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                  className="mt-4 text-red-600 text-center text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ===== STUDENT FORM MODAL ===== */}
      <AnimatePresence>
        {showStudentForm && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowStudentForm(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
              <StudentForm onClose={() => setShowStudentForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FORGOT PASSWORD MODAL ===== */}
      <AnimatePresence>
        {showForgotPassword && (
          <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
