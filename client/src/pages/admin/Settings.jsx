import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import bcrypt from "bcryptjs";
import PasswordModal from "../../components/PasswordModal";

export default function Settings() {
  const base = import.meta.env.VITE_API_BASE_URL;

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentConfirm, setStudentConfirm] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newContact, setNewContact] = useState("");
  const [show, setShow] = useState(false);

  const resetAll = () => {
    setAdminPassword("");
    setAdminConfirm("");
    setStudentPassword("");
    setStudentConfirm("");
    setShow(false);
  };

  // ===== Validators =====
  const isValidPassword = (p) => p.length >= 6;
  const isValidUsername = (u) => u.length > 0 && u.length <= 40;
  const isValidContact = (c) => /^\d{10}$/.test(c);

  // ===== OTP Helper =====
  const startOtpFlow = async (purpose, callback) => {
    const ask = await Swal.fire({
      title: "Send OTP?",
      text: "OTP will be sent to WhatsApp",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Send OTP",
    });

    if (!ask.isConfirmed) return;

    try {
      await axios.post(`${base}/admin/send-otp`, { purpose });

      let finalOtp = null;

      await Swal.fire({
        title: "OTP Verification",
        html: `<input id="otp-input" class="swal2-input" maxlength="6" placeholder="Enter OTP"/>`,
        showCancelButton: true,
        confirmButtonText: "Verify OTP",
        preConfirm: () => {
          const otp = document.getElementById("otp-input").value;
          if (!otp) {
            Swal.showValidationMessage("Enter OTP");
            return false;
          }
          finalOtp = otp;
        },
      });

      if (!finalOtp) return;
      await callback(finalOtp);
    } catch {
      Swal.fire("Error", "OTP process failed", "error");
    }
  };

  // ===== Updates =====
  const handlePasswordChange = async (type) => {
    const isAdmin = type === "ADMIN_LOGIN";
    const pass = isAdmin ? adminPassword : studentPassword;
    const confirm = isAdmin ? adminConfirm : studentConfirm;

    if (!isValidPassword(pass)) {
      return Swal.fire(
        "Error",
        "Password must be at least 6 characters",
        "error"
      );
    }
    if (pass !== confirm) {
      return Swal.fire("Error", "Passwords do not match", "error");
    }

    await startOtpFlow("PASSWORD_RESET", async (otp) => {
      const hash = await bcrypt.hash(pass, 10);

      const res = await axios.post(`${base}/admin/verify-otp-update-password`, {
        otp,
        passwordHash: hash,
        type,
      });

      if (res.data.success) {
        Swal.fire("Success", "Password updated", "success");
        resetAll();
        setShowAdminModal(false);
        setShowStudentModal(false);
      }
    });
  };

  const handleUsernameUpdate = async () => {
    if (!isValidUsername(newUsername)) {
      return Swal.fire("Error", "Username must be 1 - 40 characters", "error");
    }

    await startOtpFlow("PROFILE_UPDATE", async (otp) => {
      const res = await axios.post(`${base}/admin/verify-otp-update-profile`, {
        otp,
        username: newUsername,
      });

      if (res.data.success) {
        Swal.fire("Success", res.data.message, "success");
        setShowUsernameModal(false);
        setNewUsername("");
      }
    });
  };

  const handleContactUpdate = async () => {
    if (!isValidContact(newContact)) {
      return Swal.fire("Error", "Contact must be exactly 10 digits", "error");
    }

    await startOtpFlow("PROFILE_UPDATE", async (otp) => {
      const res = await axios.post(`${base}/admin/verify-otp-update-profile`, {
        otp,
        contactNumber: newContact,
      });

      if (res.data.success) {
        Swal.fire("Success", res.data.message, "success");
        setShowContactModal(false);
        setNewContact("");
      }
    });
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Admin Security Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Security Password",
            desc: "Change delete password",
            icon: "🔐",
            onClick: () => setShowStudentModal(true),
          },
          {
            title: "Admin Login Password",
            desc: "Change login password",
            icon: "🛡️",
            onClick: () => setShowAdminModal(true),
          },
          {
            title: "Username",
            desc: "Change login username",
            icon: "👤",
            onClick: () => setShowUsernameModal(true),
          },
          {
            title: "Contact Number",
            desc: "Change WhatsApp number",
            icon: "📱",
            onClick: () => setShowContactModal(true),
          },
        ].map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {card.title}
              </h3>
            </div>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Password Modals */}
      {showStudentModal && (
        <PasswordModal
          title="Change Student Delete Password"
          pass={studentPassword}
          confirm={studentConfirm}
          setPass={setStudentPassword}
          setConfirm={setStudentConfirm}
          show={show}
          setShow={setShow}
          onSubmit={() => handlePasswordChange("STUDENT_DELETE")}
          onClose={() => {
            resetAll();
            setShowStudentModal(false);
          }}
        />
      )}

      {showAdminModal && (
        <PasswordModal
          title="Change Admin Login Password"
          pass={adminPassword}
          confirm={adminConfirm}
          setPass={setAdminPassword}
          setConfirm={setAdminConfirm}
          show={show}
          setShow={setShow}
          onSubmit={() => handlePasswordChange("ADMIN_LOGIN")}
          onClose={() => {
            resetAll();
            setShowAdminModal(false);
          }}
        />
      )}

      {/* Animated Modals */}
      {showUsernameModal && (
        <AnimatedModal
          title="Update Username"
          value={newUsername}
          onChange={setNewUsername}
          onClose={() => setShowUsernameModal(false)}
          onSubmit={handleUsernameUpdate}
        />
      )}

      {showContactModal && (
        <AnimatedModal
          title="Update Contact Number"
          value={newContact}
          onChange={setNewContact}
          onClose={() => setShowContactModal(false)}
          onSubmit={handleContactUpdate}
        />
      )}
    </>
  );
}

// ===== Animated Modal =====
function AnimatedModal({ title, value, onChange, onClose, onSubmit }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setOpen(true), 10);
  }, []);

  const closeWithAnimation = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={`bg-white p-6 rounded-2xl w-full max-w-md transform transition-all duration-200 ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>

        <input
          type="text"
          className="w-full border p-2 rounded mb-4 focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={closeWithAnimation}
            className="px-4 py-2 bg-gray-100 rounded"
          >
            Cancel
          </button>

          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
