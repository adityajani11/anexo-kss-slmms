import React, { useState } from "react";
import axios from "axios";
import Loader from "./Loader";

export default function StaffForm({ onClose, onSuccess, existingData }) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const [staffData, setStaffData] = useState(
    existingData || {
      username: "",
      fullName: "",
      email: "",
      contactNumber: "",
      gender: "",
      password: "",
      notes: "",
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setStaffData({ ...staffData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const { username, fullName, email, contactNumber, gender, password } =
      staffData;
    if (
      !username ||
      !fullName ||
      !email ||
      !contactNumber ||
      !gender ||
      (!existingData && !password)
    )
      return "Please fill in all required fields.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Invalid email format.";

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(contactNumber))
      return "Contact number must be 10 digits.";

    if (!existingData && password.length < 6)
      return "Password must be at least 6 characters long.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = { ...staffData, role: "staff" };

      if (existingData && existingData._id) {
        await axios.put(`${base}/staff/${existingData._id}`, payload);
        onSuccess("Staff account updated successfully.");
      } else {
        await axios.post(`${base}/staff/`, payload);
        onSuccess("Staff account created successfully.");
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Error saving staff account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {loading && <Loader message="Saving staff account…" />}

      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        {existingData && existingData._id
          ? "Edit Staff Account"
          : "Staff Account"}
      </h2>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 border border-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {[
          {
            label: "Username",
            name: "username",
            type: "text",
            maxLength: "40",
          },
          {
            label: "Full Name",
            name: "fullName",
            type: "text",
            maxLength: "50",
          },
          { label: "Email", name: "email", type: "email", maxLength: "50" },
          {
            label: "Contact Number",
            name: "contactNumber",
            type: "text",
            maxLength: "10",
          },
          {
            label: "Password",
            name: "password",
            type: "password",
            hidden: existingData && existingData._id,
            maxLength: "50",
          },
        ]
          .filter((f) => !f.hidden)
          .map((field) => (
            <div key={field.name}>
              <label className="block font-medium text-gray-700">
                {field.label} *
              </label>
              <input
                type={field.type}
                name={field.name}
                placeholder={`Enter ${field.label}`}
                value={staffData[field.name]}
                maxLength={field.maxLength}
                onChange={handleChange}
                className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          ))}

        <div>
          <label className="block font-medium text-gray-700">Gender *</label>
          <select
            name="gender"
            value={staffData.gender}
            onChange={handleChange}
            className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={staffData.notes}
            onChange={handleChange}
            rows={3}
            maxLength={300}
            className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="md:col-span-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-200 cursor-pointer hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {loading
              ? "Saving..."
              : existingData && existingData._id
              ? "Update Staff"
              : "Create Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}
