// src/pages/staff/ChangePassword.jsx
import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function ChangePassword() {
  const [step, setStep] = useState("FORM"); // FORM → OTP
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const base = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token");

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    if (!newPassword || !confirmNewPassword) {
      return Swal.fire("Error", "Please fill all fields", "error");
    }

    if (newPassword !== confirmNewPassword) {
      return Swal.fire("Error", "New passwords do not match", "error");
    }

    try {
      setLoading(true);

      const res = await axios.post(
        `${base}/staff/change-password/request-otp`,
        {
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Swal.fire("OTP Sent", res.data.message, "success");
      setStep("OTP");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Change Password
  const handleVerifyOtp = async () => {
    if (!otp) return Swal.fire("Error", "Enter OTP", "error");

    try {
      setLoading(true);

      const res = await axios.post(
        `${base}/staff/change-password/verify-otp`,
        {
          newPassword,
          otp,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Swal.fire("Success", res.data.message, "success");

      // Reset all fields
      setNewPassword("");
      setConfirmNewPassword("");
      setOtp("");
      setStep("FORM");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Change Password</h2>

      {step === "FORM" && (
        <>
          <label className="block mb-2">New Password</label>
          <input
            type="password"
            className="w-full border p-2 mb-3"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <label className="block mb-2">Confirm New Password</label>
          <input
            type="password"
            className="w-full border p-2 mb-3"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
          />

          <button
            onClick={handleRequestOtp}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            {loading ? "Processing..." : "Request OTP"}
          </button>
        </>
      )}

      {step === "OTP" && (
        <>
          <label className="block mb-2">Enter OTP</label>
          <input
            type="text"
            className="w-full border p-2 mb-3"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <button
            onClick={handleVerifyOtp}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded w-full"
          >
            {loading ? "Verifying..." : "Verify OTP & Change Password"}
          </button>
        </>
      )}
    </div>
  );
}
