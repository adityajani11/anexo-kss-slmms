import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Spin } from "antd";
import { useNavigate } from "react-router-dom";

export default function SelectMCQs() {
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    standardId: "",
    subjectIds: [],
    categoryId: "",
    totalMarks: 10,
    title: "",
  });

  const base = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const [stdRes, subRes, catRes] = await Promise.all([
          axios.get(`${base}/standards`),
          axios.get(`${base}/subjects`),
          axios.get(`${base}/categories`),
        ]);
        setStandards(stdRes.data.data || []);
        setSubjects(subRes.data.data || []);
        setCategories(catRes.data.data || []);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load master data", "error");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubjectSelect = (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const already = prev.subjectIds.includes(value);
      return {
        ...prev,
        subjectIds: already
          ? prev.subjectIds.filter((id) => id !== value)
          : [...prev.subjectIds, value],
      };
    });
  };

  const handleGenerate = async () => {
    if (!form.title || !form.standardId || !form.categoryId) {
      Swal.fire("Warning", "Please fill all required fields", "warning");
      return;
    }
    if (form.totalMarks > 120) {
      Swal.fire("Warning", "Marks cannot exceed 120", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${base}/papers/generate`, form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data.success) {
        Swal.fire("Success", "Paper generated successfully!", "success");
        navigate(`/student/give-test/${res.data.data._id}`);
      } else {
        Swal.fire(
          "Error",
          res.data.error || "Failed to generate paper",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Server error while generating paper", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Loading..." />
      </div>
    );

  return (
    <div className="max-w-xl mx-auto bg-white shadow rounded p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Select MCQs and Generate Paper
      </h2>

      <div className="mb-3">
        <label className="block mb-1 font-medium">Title *</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium">Standard *</label>
        <select
          name="standardId"
          value={form.standardId}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">-- Select Standard --</option>
          {standards.map((s) => (
            <option key={s._id} value={s._id}>
              {s.standard}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium">Subjects (Multiple)</label>
        <div className="grid grid-cols-2 gap-2">
          {subjects.map((sub) => (
            <label key={sub._id} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={sub._id}
                checked={form.subjectIds.includes(sub._id)}
                onChange={handleSubjectSelect}
              />
              {sub.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium">Category *</label>
        <select
          name="categoryId"
          value={form.categoryId}
          onChange={handleChange}
          className="w-full border rounded p-2"
        >
          <option value="">-- Select Category --</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 font-medium">Total Marks *</label>
        <input
          type="number"
          name="totalMarks"
          value={form.totalMarks}
          onChange={handleChange}
          min={1}
          max={120}
          className="w-full border rounded p-2"
        />
      </div>

      <button
        onClick={handleGenerate}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Generate Paper
      </button>
    </div>
  );
}
