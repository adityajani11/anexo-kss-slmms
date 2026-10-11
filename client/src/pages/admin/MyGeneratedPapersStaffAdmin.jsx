// src/pages/admin/MyGeneratedPapersStaffAdmin.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Spin } from "antd";
import { Download, Trash2 } from "lucide-react";

export default function MyGeneratedPapersStaffAdmin() {
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState([]);
  const base = import.meta.env.VITE_API_BASE_URL || "";

  // fetch papers (GENERATED) and keep only StaffAdmin created ones
  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${base}/papers/fetch?type=GENERATED`);
      const list = res.data?.data || [];
      const adminPapers = list.filter(
        (p) =>
          p.createdByModel === "StaffAdmin" || p.createdByModel === "staffAdmin"
      );

      // sort by createdAt descending if present, else keep order
      adminPapers.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setPapers(adminPapers);
    } catch (err) {
      console.error("Fetch admin papers error:", err);
      Swal.fire("❌ Error", "Unable to load papers.", "error");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Download choice dialog (With Answers / Without)
  const openDownloadChoiceSwal = async (paper) => {
    const { value: selection } = await Swal.fire({
      title: "📄 Download Paper",
      html: `
        <div style="text-align:left">
          <label style="display:block;margin-bottom:8px;font-weight:600">Choose file type</label>
          <select id="pdfOption" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd">
            <option value="withAnswers" selected>With Answers (and Explanations)</option>
            <option value="withoutAnswers">Without Answers</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Download",
      preConfirm: () => document.getElementById("pdfOption")?.value,
    });

    if (!selection) return;
    const includeAnswers = selection === "withAnswers";
    downloadPaper(paper, includeAnswers);
  };

  const downloadPaper = async (paper, includeAnswers = true) => {
    try {
      Swal.fire({
        title: "⏳ Preparing PDF...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const url = `${base}/papers/${paper._id}/download-generated?answers=${includeAnswers}`;

      // axios download
      const resp = await axios.get(url, {
        responseType: "blob",
        headers: { Accept: "application/pdf" },
      });

      // convert blob
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);

      // safe filename
      const safeName = (paper.title || "paper")
        .replace(/[^\w\-_. ]+/g, "")
        .replace(/\s+/g, "_");

      link.download = `${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      Swal.close();
      Swal.fire("🎉 Downloaded", "Your paper has been downloaded.", "success");
    } catch (err) {
      console.error("Download error:", err);
      Swal.fire("❌ Error", "Failed to download paper.", "error");
    }
  };

  const handleDelete = async (paper) => {
    const confirm = await Swal.fire({
      title: "🗑️ Delete this paper?",
      html: `<div style="text-align:left">Are you sure you want to delete "<strong>${paper.title}</strong>"? This will remove the entry and the generated file.</div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: "Deleting...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await axios.delete(`${base}/papers/delete-generated-paper/${paper._id}`);
      Swal.close();
      Swal.fire("✅ Deleted", "Paper deleted successfully.", "success");
      // refresh list
      fetchPapers();
    } catch (err) {
      console.error("Delete paper error:", err);
      Swal.fire("❌ Error", "Failed to delete paper.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Loading generated papers..." />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 flex items-center gap-2 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        🧾 Generated Papers
      </h2>

      {papers.length === 0 ? (
        <div className="text-center bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-10">
          <div className="text-4xl mb-3">😕</div>
          <div className="text-gray-700 text-lg font-medium">
            No generated papers found.
          </div>
          <div className="text-gray-500 text-sm mt-2">
            Create a new paper from MCQs section.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((p) => (
            <div
              key={p._id}
              className="p-4 bg-white rounded-2xl shadow hover:shadow-lg border border-gray-100 flex flex-col justify-between"
            >
              <div>
                {/* Title */}
                <div className="font-semibold text-base sm:text-lg mb-2">
                  {p.title || "Untitled Paper"} 📘
                </div>

                {/* Subjects */}
                <div className="text-sm text-gray-700 mb-1">
                  <strong>Subjects:</strong>{" "}
                  {Array.isArray(p.subjectIds) && p.subjectIds.length
                    ? p.subjectIds
                        .map((s) =>
                          typeof s === "string" ? s : s?.name || " - "
                        )
                        .join(", ")
                    : " - "}
                </div>

                {/* Total Marks */}
                <div className="text-sm text-gray-700">
                  <strong>Total Marks:</strong>{" "}
                  {p.totalMarks ?? p.items?.length ?? 0}
                </div>

                {/* Generated By */}
                <div className="text-sm text-gray-700">
                  <strong>Generated By:</strong>{" "}
                  {p.createdBy?.fullName || "ADMIN"}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openDownloadChoiceSwal(p)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download
                </button>

                <button
                  onClick={() => handleDelete(p)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
