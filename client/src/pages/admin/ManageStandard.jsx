import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Trash2, PlusCircle } from "lucide-react";
import Loader from "../../components/Loader";
import { deleteWithPassword } from "../../utils/deleteWithPassword";

export default function ManageStandards() {
  const [standards, setStandards] = useState([]);
  const [newStandard, setNewStandard] = useState("");
  const [loading, setLoading] = useState(true);
  const base = import.meta.env.VITE_API_BASE_URL;

  // Fetch standards
  const fetchStandards = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${base}/standards`);
      const data = res.data?.data || [];
      setStandards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch standards:", error);
      Swal.fire("Error", "Failed to load standards", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandards();
  }, []);

  // Add new standard
  const handleAddStandard = async (e) => {
    e.preventDefault();
    const standardNum = Number(newStandard);

    if (!standardNum || standardNum < 8 || standardNum > 12) {
      Swal.fire(
        "Invalid Input",
        "Standard must be between 8 and 12",
        "warning"
      );
      return;
    }

    try {
      const res = await axios.post(`${base}/standards`, {
        standard: standardNum,
      });

      if (res.data.success) {
        Swal.fire(
          "Added!",
          `Standard ${standardNum} added successfully`,
          "success"
        );
        setNewStandard("");
        fetchStandards();
      } else {
        Swal.fire("Error", res.data.message || "Something went wrong", "error");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "";
      if (msg.toLowerCase().includes("exists")) {
        Swal.fire("Duplicate", "This standard already exists", "info");
      } else {
        Swal.fire("Error", msg || "Failed to add standard", "error");
      }
    }
  };

  // Delete standard with admin password verification
  const handleDeleteStandard = (id) => {
    deleteWithPassword({
      base,
      deleteUrl: `${base}/standards/${id}/hard`,
      fetchCallback: fetchStandards,
      itemName: "Standard",
    });
  };

  return (
    <div className="px-2">
      {/* Header + Add Form */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">
          Manage Standards
        </h1>

        <form
          onSubmit={handleAddStandard}
          className="flex items-center gap-3 w-full sm:w-auto"
        >
          <input
            type="number"
            min="8"
            max="12"
            placeholder="Enter standard (8 - 12)"
            value={newStandard}
            onChange={(e) => setNewStandard(e.target.value)}
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
      ) : standards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500 text-lg shadow-sm">
          No standards found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {standards.map((std) => (
            <div
              key={std._id}
              className="bg-white border rounded-xl p-5 shadow-md hover:shadow-lg transition transform hover:-translate-y-1"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Standard {std.standard}
              </h2>

              <button
                onClick={() => handleDeleteStandard(std._id)}
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
