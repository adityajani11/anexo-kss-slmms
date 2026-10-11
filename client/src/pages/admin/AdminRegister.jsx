import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function AdminRegister() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    contactNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const base = import.meta.env.VITE_API_BASE_URL;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password || !form.contactNumber) {
      return Swal.fire("Error", "All fields are required", "error");
    }

    setLoading(true);
    try {
      const res = await axios.post(`${base}/admin/register`, form);

      Swal.fire("Success", res.data.message, "success");
      setForm({ username: "", password: "", contactNumber: "" });
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          Register Admin (One Time Setup)
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring focus:outline-none"
              placeholder="Enter admin username"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring focus:outline-none"
              placeholder="Enter strong password"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Contact Number</label>
            <input
              type="text"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring focus:outline-none"
              placeholder="WhatsApp number"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg mt-2"
          >
            {loading ? "Registering..." : "Register Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
