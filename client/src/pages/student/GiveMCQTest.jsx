import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import { Spin } from "antd";

export default function GiveMCQTest() {
  const { paperId } = useParams();
  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const base = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token");

  const getImageUrl = (img) => {
    if (!img) return null;

    const key = img.trim();
    if (!key || key === "null" || key === "undefined") return null;

    return `${base}/mcqs/image?key=${encodeURIComponent(key)}`;
  };

  // Fetch paginated MCQs
  const fetchMCQs = async (pageNum = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(`${base}/mcqs/?page=${pageNum}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setMcqs(res.data.data || []);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      } else {
        console.error("Error", res.data.error || "Failed to fetch MCQs");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleSelect = (mcqId, optionLabel) => {
    setAnswers((prev) => ({ ...prev, [mcqId]: optionLabel }));
  };

  // Submit paper
  const handleSubmit = async () => {
    const totalAnswered = Object.keys(answers).length;
    const totalQuestions = mcqs.length;

    if (totalAnswered < totalQuestions) {
      const confirm = await Swal.fire({
        title: "Incomplete!",
        text: `You answered ${totalAnswered}/${totalQuestions} questions. Submit anyway?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Submit",
        cancelButtonText: "Cancel",
      });
      if (!confirm.isConfirmed) return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${base}/papers/submit`,
        { paperId, answers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Swal.fire(
          "Submitted!",
          "Your answers have been submitted successfully.",
          "success"
        );
        navigate("/student/history");
      } else {
        console.error("Error", res.data.error || "Submission failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const handleNext = () => {
    if (page < totalPages) fetchMCQs(page + 1);
  };
  const handlePrev = () => {
    if (page > 1) fetchMCQs(page - 1);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Loading..." />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto bg-white shadow rounded p-6 mt-8">
      <h2 className="text-2xl font-semibold mb-4">
        {paper ? paper.title : "Practice MCQs"}
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Total Pages: {totalPages} | Current Page: {page}
      </p>

      {/* ✅ Show message when no MCQs are found */}
      {mcqs.length === 0 ? (
        <div className="text-center text-gray-500 text-lg py-10">
          No MCQs Found
        </div>
      ) : (
        <>
          {mcqs.map((q, i) => (
            <div key={q._id} className="mb-8 border-b pb-4">
              <div
                className="font-medium mb-3 text-lg"
                dangerouslySetInnerHTML={{
                  __html: `${i + 1}. ${q.question.text}`,
                }}
              ></div>

              {q.question.image && (
                <img
                  src={getImageUrl(q.question.image)}
                  alt="Question"
                  className="mb-3 max-h-40 rounded"
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt) => (
                  <label
                    key={opt._id}
                    className={`border rounded-lg p-2 cursor-pointer flex items-center gap-2 transition ${
                      answers[q._id] === opt.label
                        ? "border-green-600 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q._id}
                      checked={answers[q._id] === opt.label}
                      onChange={() => handleSelect(q._id, opt.label)}
                      className="mr-2"
                    />
                    <span>{opt.label}</span>
                    {opt.image && (
                      <img
                        src={getImageUrl(opt.image)}
                        alt="Option"
                        className="max-h-10 rounded"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className={`px-4 py-2 rounded ${
                page <= 1
                  ? "bg-gray-300"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className={`px-4 py-2 rounded ${
                page >= totalPages
                  ? "bg-gray-300"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Next
            </button>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
            >
              Submit Paper
            </button>
          </div>
        </>
      )}
    </div>
  );
}
