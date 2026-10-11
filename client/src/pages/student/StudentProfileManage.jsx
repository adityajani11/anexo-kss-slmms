// src/pages/student/ManageProfile.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Spin } from "antd";

export default function ManageProfile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [standards, setStandards] = useState([]);

  const [form, setForm] = useState({
    username: "",
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
  const base = import.meta.env.VITE_API_BASE_URL || "";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchInitial = async () => {
      try {
        // fetch standards for select & stream logic
        const stdRes = await axios.get(`${base}/standards`);
        const stdItems =
          Array.isArray(stdRes.data?.data?.items) &&
          stdRes.data.data.items.length
            ? stdRes.data.data.items
            : Array.isArray(stdRes.data?.data) && stdRes.data.data.length
            ? stdRes.data.data
            : Array.isArray(stdRes.data)
            ? stdRes.data
            : [];
        setStandards(stdItems);

        // fetch student
        const res = await axios.get(`${base}/students/${user.id}`);
        if (res.data?.success && res.data.data) {
          const s = res.data.data;
          setStudent(s);
          setForm({
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
          });
        } else {
          console.error("Failed to load student profile");
        }
      } catch (err) {
        console.error("Error fetching profile/standards", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [base]);

  // find selected standard object
  const selectedStandard = standards.find((st) => st._id === form.standardId);
  const showStream =
    selectedStandard && Number(selectedStandard.standard) >= 10;

  // --- Validation ---
  const validate = () => {
    const e = {};
    if (!form.username?.trim()) e.username = "Username is required";
    if (!form.fullName?.trim()) e.fullName = "Full name is required";
    if (!form.city?.trim()) e.city = "City is required";
    if (!form.district?.trim()) e.district = "District is required";
    if (!form.schoolName?.trim()) e.schoolName = "School name is required";
    if (!form.contactNumber?.toString().trim())
      e.contactNumber = "Contact number is required";
    else if (!/^[0-9]{10}$/.test(form.contactNumber.toString()))
      e.contactNumber = "Enter a valid 10-digit number";

    if (!form.whatsappNumber?.toString().trim())
      e.whatsappNumber = "WhatsApp number is required";
    else if (!/^[0-9]{10}$/.test(form.whatsappNumber.toString()))
      e.whatsappNumber = "Enter a valid 10-digit number";

    if (!form.gender?.trim()) e.gender = "Gender is required";
    if (!form.cast?.trim()) e.cast = "Cast is required";
    if (!form.category?.trim()) e.category = "Category is required";

    // stream only if shown and required by you (here optional)
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // --- Save profile with SweetAlert confirm ---
  const handleSave = async () => {
    if (!validate()) {
      Swal.fire({
        icon: "error",
        title: "Validation error",
        text: "Please fix the highlighted fields.",
      });
      return;
    }

    const confirmation = await Swal.fire({
      title: "Save changes?",
      text: "Do you want to update your profile information?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, save",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563EB",
    });

    if (!confirmation.isConfirmed) return;

    setSaving(true);
    try {
      // prepare payload (omit fields that shouldn't be sent as undefined)
      const payload = {
        username: form.username,
        fullName: form.fullName,
        city: form.city,
        district: form.district,
        schoolName: form.schoolName,
        // standardId intentionally left (but locked); include if backend expects it
        standardId: form.standardId,
        contactNumber: form.contactNumber,
        whatsappNumber: form.whatsappNumber,
        gender: form.gender,
        cast: form.cast,
        category: form.category,
        stream: form.stream,
      };

      const res = await axios.put(`${base}/students/${student._id}`, payload);

      if (res.data?.success) {
        // update local state & storage
        setStudent((prev) => ({ ...prev, ...payload }));
        const user = JSON.parse(localStorage.getItem("user")) || {};
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            fullName: payload.fullName || user.fullName,
          })
        );

        Swal.fire({
          title: "Saved",
          text: "Your profile has been updated.",
          icon: "success",
          confirmButtonColor: "#2563EB",
        });
      } else {
        Swal.fire({
          title: "Error",
          text: res.data?.error || "Failed to update profile",
          icon: "error",
        });
      }
    } catch (err) {
      console.error("Failed to update profile", err);
      Swal.fire({
        title: "Error",
        text: err.response?.data?.error || "Something went wrong",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Change Password modal ---
  const handleChangePassword = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Change password",
      html:
        '<input id="swal-new-pass" type="password" class="swal2-input" placeholder="New password">' +
        '<input id="swal-confirm-pass" type="password" class="swal2-input" placeholder="Confirm password">',
      showCancelButton: true,
      confirmButtonText: "Next",
      preConfirm: () => {
        const newPass = document.getElementById("swal-new-pass").value;
        const confirm = document.getElementById("swal-confirm-pass").value;

        if (!newPass || newPass.length < 6) {
          Swal.showValidationMessage("Password must be at least 6 characters");
          return false;
        }

        if (newPass !== confirm) {
          Swal.showValidationMessage("Passwords do not match");
          return false;
        }

        return { newPass };
      },
    });

    if (!formValues) return;

    setChangingPassword(true);

    try {
      // 1. Send OTP
      await axios.post(`${base}/students/${student._id}/send-otp`);

      // 2. Ask OTP from user
      const { value: otp } = await Swal.fire({
        title: "Enter OTP",
        input: "text",
        inputPlaceholder: "6-digit OTP",
        showCancelButton: true,
      });

      if (!otp) return;

      // 3. Change password
      const res = await axios.put(
        `${base}/students/${student._id}/change-password`,
        {
          newPassword: formValues.newPass,
          otp,
        }
      );

      if (res.data?.success) {
        Swal.fire("Success", "Password changed successfully", "success");
      } else {
        Swal.fire("Error", res.data?.message, "error");
      }
    } catch (err) {
      Swal.fire(
        "Error",
        "Password change process failed! Please try again.",
        "error"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // --- Input change handler ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-fit p-6">
        <Spin size="large" />
      </div>
    );

  if (!student)
    return (
      <div className="min-h-fit flex justify-center items-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
          <p className="text-sm text-gray-600">
            Could not load your profile. Please login again.
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-fit flex justify-center items-start">
      <div className="w-full bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Manage Your Profile
          </h1>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition text-sm"
            >
              {changingPassword ? "Processing..." : "Change Password"}
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username - Used for login
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.username ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Username"
                maxLength={30}
              />
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.fullName ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Full name"
                maxLength={50}
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Standard (locked) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Standard
              </label>
              <select
                name="standardId"
                value={form.standardId}
                disabled
                className="w-full p-3 rounded-xl border border-gray-300 bg-gray-100 cursor-not-allowed"
              >
                <option value="">Not assigned</option>
                {standards.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.standard}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Standard can not be changed. Please contact admin.
              </p>
            </div>

            {/* Stream (conditional) */}
            {showStream && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stream
                </label>
                <select
                  name="stream"
                  value={form.stream}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select stream</option>
                  <option value="SCIENCE">SCIENCE</option>
                  <option value="COMMERCE">COMMERCE</option>
                  <option value="ARTS">ARTS</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            )}

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.city ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Eg. Keshod, Kevadra"
                maxLength={50}
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                District
              </label>
              <input
                name="district"
                value={form.district}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.district ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Eg. Junagadh"
                maxLength={50}
              />
              {errors.district && (
                <p className="text-red-500 text-sm mt-1">{errors.district}</p>
              )}
            </div>

            {/* School Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                School Name
              </label>
              <input
                name="schoolName"
                value={form.schoolName}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.schoolName ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Eg. Krishna School Keshod"
                maxLength={50}
              />
              {errors.schoolName && (
                <p className="text-red-500 text-sm mt-1">{errors.schoolName}</p>
              )}
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Number
              </label>
              <input
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.contactNumber ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="10-digit contact number"
                inputMode="numeric"
                maxLength={10}
              />
              {errors.contactNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.contactNumber}
                </p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                WhatsApp Number
              </label>
              <input
                name="whatsappNumber"
                value={form.whatsappNumber}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.whatsappNumber ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="10-digit WhatsApp number"
                inputMode="numeric"
                maxLength={10}
              />
              {errors.whatsappNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.whatsappNumber}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.gender ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
              )}
            </div>

            {/* Cast */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Cast
              </label>
              <input
                name="cast"
                value={form.cast}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.cast ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
                placeholder="Eg. Patel"
                maxLength={20}
              />
              {errors.cast && (
                <p className="text-red-500 text-sm mt-1">{errors.cast}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`w-full p-3 rounded-xl border ${
                  errors.category ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC">OBC</option>
                <option value="OPEN">OPEN</option>
                <option value="OTHER">OTHER</option>
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                // keep UX consistent: maybe go back
                window.history.back();
              }}
              className="px-5 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
