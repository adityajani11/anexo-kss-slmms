import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

const roles = ["admin", "staff", "student"];

export default function ForgotPasswordModal({ onClose }) {
  const base = import.meta.env.VITE_API_BASE_URL;

  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = request, 2 = verify, 3 = reset password
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ============================
  // RESET PASSWORD
  // ============================
  const resetPassword = async () => {
    if (!newPassword || !confirmPassword)
      return Swal.fire("Required", "Please enter both passwords", "warning");

    if (newPassword !== confirmPassword)
      return Swal.fire("Mismatch", "Passwords do not match", "error");

    try {
      setLoading(true);

      await axios.post(`${base}/forgot-password/reset-password`, {
        role,
        username,
        newPassword,
      });

      Swal.fire("Success", "Password reset successfully!", "success");
      onClose();
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to reset password",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // 1) REQUEST OTP
  // ============================
  const sendOtp = async () => {
    if (!username.trim() || !contactNumber.trim()) {
      return Swal.fire(
        "Required",
        "Enter username & contact number",
        "warning"
      );
    }

    try {
      setLoading(true);

      const res = await axios.post(`${base}/forgot-password/request`, {
        role,
        username,
        contactNumber,
      });

      Swal.fire("OTP Sent!", res.data.message, "success");
      setStep(2);
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to send OTP",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // 2) VERIFY OTP
  // ============================
  const verifyOtp = async () => {
    if (!otp.trim()) {
      return Swal.fire("Required", "Enter OTP", "warning");
    }

    try {
      setLoading(true);

      const res = await axios.post(`${base}/forgot-password/verify`, {
        role,
        username,
        otp,
      });

      if (res.data.success) {
        Swal.fire("Verified!", "OTP verified successfully", "success");
        setStep(3); // Go directly to reset password
      } else {
        Swal.fire("Invalid", "Wrong OTP", "error");
      }
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Verification failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative"
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-center text-indigo-700 mb-4">
          Forgot Password
        </h2>

        <AnimatePresence mode="wait">
          {/* STEP 1: ENTER INFO */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Role */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Select Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Username */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enter Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="username"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enter Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="9876543210"
                />
              </div>

              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </motion.div>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <p className="text-center text-gray-700">
                OTP sent to <b>{contactNumber}</b>
              </p>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1 tracking-widest text-center text-lg"
                />
              </div>

              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 transition"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </motion.div>
          )}

          {/* STEP 3: RESET PASSWORD */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                onClick={resetPassword}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition"
              >
                {loading ? "Saving..." : "Reset Password"}
              </button>

              <p className="text-center text-gray-600 text-sm">
                After resetting, you can login with your new password.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
