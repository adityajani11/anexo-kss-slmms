import React, { useEffect, useState } from "react";
import axios from "axios";
import { Download, BookOpen, Search, Eye } from "lucide-react";
import Swal from "sweetalert2";
import { Spin, message } from "antd";

export default function MyMaterial() {
  const [materials, setMaterials] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const base = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser || !storedUser.standardId) {
          Swal.fire(
            "Error",
            "User information missing. Please log in again.",
            "error"
          );
          return;
        }

        const res = await axios.get(
          `${base}/materials/by-standard/${storedUser.standardId}`
        );

        if (res.data.success && res.data.data.length > 0) {
          setMaterials(res.data.data);
          setFiltered(res.data.data);
        } else {
          message.info(
            res.data.message || "No material found for your standard."
          );
          setMaterials([]);
          setFiltered([]);
        }
      } catch (err) {
        console.error(err);
        message.error("Something went wrong while fetching materials.");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  // Search filter
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      materials.filter(
        (m) =>
          m.title?.toLowerCase().includes(q) ||
          m.subjectId?.name?.toLowerCase().includes(q) ||
          m.categoryId?.name?.toLowerCase().includes(q)
      )
    );
  }, [search, materials]);

  // View file (open inline)
  const handleView = (record) => {
    if (!record._id) {
      return Swal.fire("Error", "No file available to view.", "error");
    }

    const fileUrl = `${base}/materials/${record._id}`;
    window.open(fileUrl, "_blank");
  };

  // Download with confirmation + loader + auto-close loader
  const handleDownload = async (record) => {
    if (!record._id) {
      return Swal.fire("Error", "No file available to download.", "error");
    }

    const downloadUrl = `${base}/materials/${record._id}`;

    const confirm = await Swal.fire({
      title: "Download Material?",
      text: `Do you want to download "${record.title}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Yes, Download",
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: "Preparing download...",
      text: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // Fetch file as blob (prevents auto-open)
      const response = await fetch(downloadUrl, { method: "GET" });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create temp link
      const link = document.createElement("a");
      link.href = url;
      link.download = record.title.replace(/\s+/g, "_") + ".pdf";
      document.body.appendChild(link);

      // Trigger browser download
      link.click();

      // CLEANUP
      Swal.close();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Download started",
        showConfirmButton: false,
        timer: 1200,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to download file.", "error");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          📘 My Materials
        </h1>

        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject, or category..."
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          />
        </div>
      </div>

      {/* Loader */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" tip="Loading materials..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          No materials found.
        </div>
      ) : (
        // Material grid
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((m) => (
            <div
              key={m._id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-5 border-b">
                <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">
                  {m.title}
                </h2>

                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Subject:</span>{" "}
                    {m.subjectId?.name || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Category:</span>{" "}
                    {m.categoryId?.name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Footer Section */}
              <div className="p-5 mt-auto flex flex-col gap-3">
                <p className="text-xs text-gray-500">
                  📅 Uploaded on{" "}
                  {new Date(m.createdAt).toLocaleDateString("en-IN")}
                </p>

                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={() => handleView(m)}
                    className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-xl hover:bg-green-100 transition"
                  >
                    <Eye size={16} /> View
                  </button>

                  <button
                    onClick={() => handleDownload(m)}
                    className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
                  >
                    <Download size={16} /> Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
