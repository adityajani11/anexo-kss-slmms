import React, { useState, useEffect } from "react";
import axios from "axios";
import bcrypt from "bcryptjs";
import Swal from "sweetalert2";
import { Spin } from "antd";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentForm({ onClose, onSave, editingStudent }) {
  const [loading, setLoading] = useState(false);
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const [standards, setStandards] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    city: "",
    district: "",
    schoolName: "",
    standardId: "",
    contactNumber: "",
    whatsappNumber: "",
    gender: "",
    cast: "",
    category: "",
    stream: "",
  });

  const [errors, setErrors] = useState({});

  // ------------------------------
  // Fetch Standards + Setup Editing
  // ------------------------------
  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const res = await axios.get(`${base}/standards`);
        const list = Array.isArray(res.data?.data?.items)
          ? res.data.data.items
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setStandards(list);
      } catch (error) {
        console.error("Failed to fetch standards", error);
        setStandards([]);
      }
    };

    fetchStandards();

    if (editingStudent) {
      const s = editingStudent;
      setFormData({
        username: s.username || "",
        fullName: s.fullName || "",
        city: s.city || "",
        district: s.district || "",
        schoolName: s.schoolName || "",
        standardId: s.standardId?._id || s.standardId || "",
        contactNumber: s.contactNumber || "",
        whatsappNumber: s.whatsappNumber || "",
        gender: s.gender || "",
        cast: s.cast || "",
        category: s.category || "",
        stream: s.stream || "",

        // admins can leave password blank to keep unchanged
        password: "",
        confirmPassword: "",
      });
    }
  }, [editingStudent, base]);

  // ------------------------------
  // Field Validation (same as ManageProfile)
  // ------------------------------
  const validate = () => {
    const e = {};

    // privacy policy agreement
    if (!agreed) e.agreed = "You must agree to the Privacy Policy";

    if (!formData.username.trim()) e.username = "Username is required";
    if (!formData.fullName.trim()) e.fullName = "Full name is required";

    if (!formData.city.trim()) e.city = "City is required";
    if (!formData.district.trim()) e.district = "District is required";
    if (!formData.schoolName.trim()) e.schoolName = "School name is required";

    // Contact
    if (!formData.contactNumber.toString().trim())
      e.contactNumber = "Contact number is required";
    else if (!/^[0-9]{10}$/.test(formData.contactNumber))
      e.contactNumber = "Enter a valid 10-digit number";

    // Whatsapp
    if (!formData.whatsappNumber.toString().trim())
      e.whatsappNumber = "WhatsApp number is required";
    else if (!/^[0-9]{10}$/.test(formData.whatsappNumber))
      e.whatsappNumber = "Enter a valid 10-digit number";

    if (!formData.gender) e.gender = "Gender is required";
    if (!formData.cast.trim()) e.cast = "Cast is required";
    if (!formData.category.trim()) e.category = "Category is required";

    // Password validation (Admin only)
    if (!editingStudent || formData.password.trim() !== "") {
      if (formData.password !== formData.confirmPassword)
        e.confirmPassword = "Passwords do not match";
      if (formData.password.length < 6)
        e.password = "Password must be at least 6 characters";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ------------------------------
  // Submit (Create / Update)
  // ------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      Swal.fire("Validation Error", "Please fix form errors.", "error");
      return;
    }

    try {
      setLoading(true);
      let payload = { ...formData };

      // Always lowercase username
      payload.username = payload.username.toLowerCase();

      // Password handling
      if (!editingStudent || formData.password.trim() !== "") {
        payload.password = formData.password;
      } else {
        delete payload.password;
      }

      delete payload.confirmPassword;
      delete payload.passwordHash;

      // Clean optional fields
      if (!payload.gender) delete payload.gender;
      if (!payload.category) delete payload.category;
      if (!payload.cast) delete payload.cast;
      if (!payload.stream) delete payload.stream;

      if (editingStudent) {
        await axios.put(`${base}/students/${editingStudent._id}`, payload);
        Swal.fire("Success", "Account updated successfully!", "success");
      } else {
        await axios.post(`${base}/students`, payload);
        Swal.fire("Success", "Account created successfully!", "success");
      }

      onSave?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Something went wrong!",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // Stream Logic
  // ------------------------------
  const selectedStandard = standards.find(
    (std) => std._id === formData.standardId
  );
  const showStream =
    selectedStandard && Number(selectedStandard.standard) >= 10;

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-md space-y-4 max-w-full sm:max-w-2xl mx-auto"
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {editingStudent ? "Update Student" : "Create Student Account"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* USERNAME */}
        <InputField
          label="Username (Login)"
          name="username"
          placeholder="Enter username (small letters)"
          value={formData.username}
          onChange={setFormData}
          error={errors.username}
          maxLength={30}
        />

        {/* PASSWORD */}
        <PasswordField
          label="Password"
          name="password"
          placeholder={
            editingStudent ? "Leave blank to keep unchanged" : "Enter password"
          }
          value={formData.password}
          onChange={setFormData}
          error={errors.password}
          required={!editingStudent}
        />

        {/* CONFIRM */}
        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          placeholder={
            editingStudent
              ? "Leave blank to keep unchanged"
              : "Confirm password"
          }
          value={formData.confirmPassword}
          onChange={setFormData}
          error={errors.confirmPassword}
          required={!editingStudent}
        />

        {/* FULL NAME */}
        <InputField
          label="Full Name"
          name="fullName"
          placeholder="Enter Full Name"
          value={formData.fullName}
          onChange={setFormData}
          error={errors.fullName}
          maxLength={50}
        />

        {/* CITY */}
        <InputField
          label="City"
          name="city"
          placeholder="Eg. Keshod"
          value={formData.city}
          onChange={setFormData}
          error={errors.city}
          maxLength={50}
        />

        {/* DISTRICT */}
        <InputField
          label="District"
          name="district"
          placeholder="Eg. Junagadh"
          value={formData.district}
          onChange={setFormData}
          error={errors.district}
          maxLength={50}
        />

        {/* SCHOOL NAME */}
        <InputField
          label="School Name"
          name="schoolName"
          placeholder="Eg. Krishna School Keshod"
          value={formData.schoolName}
          onChange={setFormData}
          error={errors.schoolName}
          maxLength={50}
        />

        {/* STANDARD */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Standard
          </label>
          <select
            name="standardId"
            value={formData.standardId}
            onChange={(e) =>
              setFormData((p) => ({ ...p, standardId: e.target.value }))
            }
            required
            disabled={!!editingStudent}
            className="w-full border border-gray-300 rounded-lg p-2 mt-1 disabled:bg-gray-100"
          >
            <option value="">Select Standard</option>
            {standards.map((std) => (
              <option key={std._id} value={std._id}>
                {std.standard}
              </option>
            ))}
          </select>
        </div>

        {/* STREAM */}
        {showStream && (
          <SelectField
            label="Stream"
            name="stream"
            value={formData.stream}
            onChange={setFormData}
            options={["SCIENCE", "COMMERCE", "ARTS", "OTHER"]}
          />
        )}

        {/* CONTACT */}
        <InputField
          label="Contact Number"
          name="contactNumber"
          placeholder="Eg. 1234567890"
          value={formData.contactNumber}
          onChange={setFormData}
          error={errors.contactNumber}
          maxLength={10}
          inputMode="numeric"
        />

        {/* WHATSAPP */}
        <InputField
          label="WhatsApp Number"
          name="whatsappNumber"
          placeholder="Eg. 1234567890"
          value={formData.whatsappNumber}
          onChange={setFormData}
          error={errors.whatsappNumber}
          maxLength={10}
          inputMode="numeric"
        />

        {/* GENDER */}
        <SelectField
          label="Gender"
          name="gender"
          value={formData.gender}
          onChange={setFormData}
          error={errors.gender}
          options={["Male", "Female"]}
        />

        {/* CAST */}
        <InputField
          label="Cast"
          name="cast"
          placeholder="Eg. Patel"
          value={formData.cast}
          onChange={setFormData}
          error={errors.cast}
          maxLength={20}
        />

        {/* CATEGORY */}
        <SelectField
          label="Category"
          name="category"
          value={formData.category}
          onChange={setFormData}
          error={errors.category}
          options={["SC", "ST", "OBC", "OPEN", "OTHER"]}
        />
      </div>

      {/* PRIVACY POLICY AGREEMENT */}
      <div className="flex items-start gap-2 mt-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
        />

        <label className="text-sm text-gray-700">
          I have read and agree to the{" "}
          <button
            type="button"
            onClick={() => setShowPolicy(true)}
            className="text-blue-600 hover:underline"
          >
            Privacy Policy
          </button>
        </label>
      </div>

      {errors.agreed && (
        <p className="text-red-500 text-sm mt-1">{errors.agreed}</p>
      )}

      {/* BUTTONS */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : window.history.back())}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? (
            <Spin size="small" />
          ) : editingStudent ? (
            "Update"
          ) : (
            "Register"
          )}
        </button>
      </div>
      {/* PRIVACY POLICY MODAL */}
      <AnimatePresence>
        {showPolicy && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowPolicy(false)}
                className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>

              <h1 className="text-2xl font-semibold mb-2">Privacy Policy</h1>
              <p className="text-gray-600 text-sm mb-6">
                Last Updated: 25/11/2025
              </p>

              <div className="mt-6 text-gray-700 space-y-6">
                <p>
                  This Privacy Policy describes how we collect, use, store,
                  share, and protect personal data for the Student Learning
                  Material Management System.
                </p>

                <section>
                  <h2 className="text-xl font-semibold mt-4">1. Who We Are</h2>
                  <p className="mt-2">
                    We operate an online platform for managing learning
                    materials, MCQs, exams, and academic resources for students
                    and staff.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    2. Information We Collect
                  </h2>
                  <p className="mt-2">
                    We collect personal data you provide (name, email, standard,
                    uploads, etc.) and automatically collected information (IP,
                    device, logs, cookies).
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    3. Why We Collect Your Data
                  </h2>
                  <p className="mt-2">
                    To create and manage accounts, enable MCQ/exam
                    functionality, store exam history, provide support, and
                    improve the platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    4. Sharing of Personal Data
                  </h2>
                  <p className="mt-2">
                    We share data with internal authorized staff and third-party
                    processors (hosting). We do not sell personal data.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    5. Data Retention & Deletion
                  </h2>
                  <p className="mt-2">
                    We retain data for academic and legal purposes. Account
                    deletion requests are honored subject to security/audit
                    exceptions.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">6. Your Rights</h2>
                  <p className="mt-2">
                    You can request access, correction, deletion, withdraw
                    consent, and lodge complaints by contacting us.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    7. Data Security
                  </h2>
                  <p className="mt-2">
                    We use encryption, hashing, access control, and other
                    safeguards to protect your data.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">8. Cookies</h2>
                  <p className="mt-2">
                    We use cookies for session management and analytics. Users
                    may disable cookies in their browser settings.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    9. Children’s Privacy
                  </h2>
                  <p className="mt-2">
                    Use by minors should be under parental or institutional
                    supervision.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">
                    10. Updates to This Policy
                  </h2>
                  <p className="mt-2">
                    We may update this policy from time to time. The revised
                    date will be posted above.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-4">Contact</h2>
                  <p className="mt-2">
                    Email:{" "}
                    <a
                      href="mailto:viralrramani@gmail.com"
                      className="text-blue-600"
                    >
                      viralrramani@gmail.com
                    </a>
                    <br />
                    Phone:{" "}
                    <a href="tel:+919824500853" className="text-blue-600">
                      +91 98245 00853
                    </a>
                  </p>
                </section>
              </div>

              <footer className="mt-10 border-t pt-4 text-sm text-gray-500">
                This Privacy Policy template is for general informational use
                only and is not legal advice.
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

/* ---------------------------
   Reusable Input Components
---------------------------- */
function InputField({ label, name, value, onChange, error, ...rest }) {
  const handleChange = (e) => {
    let val = e.target.value;

    if (name === "username") {
      val = val.toLowerCase(); // enforce live lowercase
    }

    onChange((p) => ({ ...p, [name]: val }));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...rest}
        name={name}
        value={value}
        onChange={handleChange}
        className={`w-full border rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

function PasswordField({ label, name, value, onChange, error, ...rest }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="password"
        name={name}
        value={value}
        onChange={(e) => onChange((p) => ({ ...p, [name]: e.target.value }))}
        {...rest}
        className={`w-full border rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, error, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange((p) => ({ ...p, [name]: e.target.value }))}
        className={`w-full border rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      >
        <option value="">Select</option>
        {options.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
