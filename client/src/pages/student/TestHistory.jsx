import React, { useEffect, useState } from "react";
import axios from "axios";
import { Spin } from "antd";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

export default function TestHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [openGroups, setOpenGroups] = useState({});
  const base = import.meta.env.VITE_API_BASE_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${base}/exam-attempts/history`, {
        params: { studentId: user.id || user._id },
      });

      if (res.data.success) {
        const grouped = {};
        (res.data.data || []).forEach((item) => {
          const pid = item.paperId?._id || "unknown";
          if (!grouped[pid]) grouped[pid] = [];
          grouped[pid].push(item);
        });
        setHistory(grouped);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleGroup = (paperId) =>
    setOpenGroups((prev) => ({ ...prev, [paperId]: !prev[paperId] }));

  const handleDeleteAll = async (paperId) => {
    const confirm = await Swal.fire({
      title: "Delete All Attempts?",
      text: "This will permanently delete all attempts for this paper.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete All",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(
        `${base}/exam-attempts/delete-all/${user.id}/${paperId}`
      );
      Swal.fire("Deleted!", "All attempts removed.", "success");
      loadHistory();
    } catch {
      Swal.fire(
        "Error",
        "Failed to delete attempts. If you are getting same error, please try to delete particular attempt",
        "error"
      );
    }
  };

  const handleDeleteOne = async (attemptId, paperId) => {
    const confirm = await Swal.fire({
      title: "Delete Attempt?",
      text: "Are you sure you want to delete this attempt?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(
        `${base}/exam-attempts/delete/${user.id}/${attemptId}`
      );
      Swal.fire("Deleted!", "Attempt removed.", "success");
      loadHistory();
    } catch {
      Swal.fire("Error", "Failed to delete attempt.", "error");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );

  const paperIds = Object.keys(history);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 bg-white p-5 rounded-2xl shadow-md border border-gray-200 flex items-center gap-3">
        🧾 My Test History
      </h2>

      {paperIds.length === 0 ? (
        <div className="text-center bg-white p-10 rounded-2xl shadow-md border border-gray-200">
          <div className="text-5xl mb-3">🕓</div>
          <h3 className="text-xl font-semibold text-gray-700">
            No Attempts Yet
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Start a live exam to see your results appear here! ✨
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {paperIds.map((paperId) => {
            const attempts = history[paperId];
            const paperTitle = attempts[0]?.paperId?.title || "Untitled Paper";
            const isOpen = openGroups[paperId];

            return (
              <div
                key={paperId}
                className="bg-white shadow-lg border border-gray-200 rounded-2xl overflow-hidden transition hover:shadow-xl"
              >
                {/* Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleGroup(paperId)}
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
                      📘 {paperTitle}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {attempts.length} attempt{attempts.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAll(paperId);
                      }}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                    {isOpen ? (
                      <ChevronUp size={22} />
                    ) : (
                      <ChevronDown size={22} />
                    )}
                  </div>
                </div>

                {/* Body */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {attempts.map((h, idx) => {
                        const timeTaken =
                          h.startedAt && h.submittedAt
                            ? Math.round(
                                (new Date(h.submittedAt) -
                                  new Date(h.startedAt)) /
                                  1000
                              )
                            : 0;
                        const minutes = Math.floor(timeTaken / 60);
                        const seconds = timeTaken % 60;

                        return (
                          <div
                            key={h._id}
                            className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                              idx < attempts.length - 1
                                ? "border-b border-gray-100"
                                : ""
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-gray-700 text-sm">
                                🧮 <strong>Score:</strong>{" "}
                                <span className="font-semibold">
                                  {h.score?.total}/{h.score?.max}
                                </span>{" "}
                                (
                                {Math.round(
                                  (h.score?.total / h.score?.max) * 100
                                )}
                                %)
                              </p>

                              <p className="text-gray-500 text-xs mt-1">
                                🕒 <strong>Started:</strong>{" "}
                                {new Date(h.startedAt).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: true,
                                })}
                              </p>

                              <p className="text-gray-500 text-xs">
                                ✅ <strong>Submitted:</strong>{" "}
                                {new Date(h.submittedAt).toLocaleString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </p>
                            </div>

                            <div className="flex items-center flex-wrap sm:flex-nowrap gap-3">
                              <div className="text-sm font-medium text-gray-700">
                                ⏱️ {minutes}m {seconds}s
                              </div>

                              <button
                                onClick={() =>
                                  navigate(`/student/exam-result/${h._id}`)
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm shadow hover:bg-blue-700 transition"
                              >
                                View Result
                              </button>

                              <button
                                onClick={() => handleDeleteOne(h._id, paperId)}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
