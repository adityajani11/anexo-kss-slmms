import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Trash2, PlusCircle } from "lucide-react";
import Loader from "../../components/Loader";
import { deleteWithPassword } from "../../utils/deleteWithPassword";

export default function ManageCategory() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const base = import.meta.env.VITE_API_BASE_URL;

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${base}/categories`);
      const data = res.data?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      Swal.fire("Error", "Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategory.trim();

    if (!trimmed) {
      Swal.fire("Invalid Input", "Category name cannot be empty", "warning");
      return;
    }

    try {
      const res = await axios.post(`${base}/categories`, { name: trimmed });
      if (res.data.success) {
        Swal.fire(
          "Added!",
          `Category "${trimmed}" added successfully`,
          "success"
        );
        setNewCategory("");
        fetchCategories();
      } else {
        Swal.fire("Error", res.data.message || "Something went wrong", "error");
      }
    } catch (error) {
      const msg = error.response?.data?.error || "";
      if (msg.toLowerCase().includes("duplicate")) {
        Swal.fire("Duplicate", "This category already exists", "info");
      } else {
        Swal.fire("Error", msg || "Failed to add category", "error");
      }
    }
  };

  // Hard delete with admin additional password verification
  const handleDeleteCategory = (id) => {
    deleteWithPassword({
      base,
      deleteUrl: `${base}/categories/${id}/hard`,
      fetchCallback: fetchCategories,
      itemName: "Category",
    });
  };

  return (
    <div className="px-2">
      {/* Header + Add Form */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
          Manage Categories
        </h1>

        <form
          onSubmit={handleAddCategory}
          className="flex items-center gap-3 w-full sm:w-auto"
        >
          <input
            type="text"
            placeholder="Enter category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <PlusCircle size={16} />
            Add
          </button>
        </form>
      </div>

      {/* Loader / No Data / List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500 text-lg shadow-sm">
          No categories found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white border rounded-xl p-5 shadow-md hover:shadow-lg transition transform hover:-translate-y-1"
            >
              <h2 className="text-lg font-semibold text-gray-800 capitalize mb-4">
                {cat.name}
              </h2>

              <button
                onClick={() => handleDeleteCategory(cat._id)}
                className="flex justify-center items-center gap-1 px-2.5 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium transition w-full"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
