import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function ExamResultPreview() {
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const base = import.meta.env.VITE_API_BASE_URL;

  // ----------------------------
  // SAFE MATH RENDER (IMAGES SAFE)
  // ----------------------------
  const renderMathHTML = (raw) => {
    if (!raw) return raw;

    // Skip if HTML contains <img> to avoid breaking image tags
    if (raw.includes("<img") || raw.includes("uploads\\mcq")) {
      return raw;
    }

    const mathRegex = /(\${1,2})([^$]+?)\1/g;

    return raw.replace(mathRegex, (match, delimiter, content) => {
      try {
        const isDisplay = delimiter === "$$";
        return katex.renderToString(content.trim(), {
          displayMode: isDisplay,
          throwOnError: false,
          strict: false,
        });
      } catch {
        return match;
      }
    });
  };

  // ----------------------------
  // LOAD ATTEMPT DATA
  // ----------------------------
  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      const res = await axios.get(`${base}/exams/attempt/${attemptId}`);
      setAttempt(res?.data?.data?.attempt);
      setMcqs(res?.data?.data?.mcqs || []);
    } catch (err) {
      console.log("Error loading result:", err);
    }
    setLoading(false);
  };

  // ----------------------------
  // UI LOADING
  // ----------------------------
  if (loading) return <Loader />;

  if (!attempt) {
    return (
      <div className="p-6 bg-white rounded-xl text-center">
        <p className="text-lg font-semibold mb-4">No Attempt Found</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-700 text-white rounded"
        >
          ← Back
        </button>
      </div>
    );
  }

  // ----------------------------
  // SCORE CALCULATION
  // ----------------------------
  const total = attempt.score?.total || 0;
  const max = attempt.score?.max || 0;
  const percent = max > 0 ? Math.round((total / max) * 100) : 0;

  // ----------------------------
  // TIME CALCULATION
  // ----------------------------
  const started = new Date(attempt.startedAt);
  const submitted = new Date(attempt.submittedAt);
  const diffSec = Math.round((submitted - started) / 1000);
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;

  // ----------------------------
  // PATH NORMALIZATION
  // ----------------------------
  const getImageUrl = (img) => {
    if (!img) return null;

    // normalize slashes
    const key = img.trim();

    if (!key || key === "null" || key === "undefined") return null;

    // Build S3 proxy URL
    return `${base}/mcqs/image?key=${encodeURIComponent(key)}`;
  };

  return (
    <>
      {/* BACK BUTTON */}
      <button
        onClick={() => window.history.back()}
        className="mb-4 px-4 py-2 bg-gray-700 text-white rounded"
      >
        ← Back
      </button>

      {/* CARD */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        {/* TITLE */}
        <h2 className="text-xl font-semibold mb-4">
          {attempt.paperId?.title || "Exam Result"}
        </h2>

        {/* BADGES */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            Score: {total}/{max}
          </span>

          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            {percent}% Correct
          </span>

          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
            Time: {minutes}m {seconds}s
          </span>

          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
            Date: {started.toLocaleDateString("en-GB")}
          </span>
        </div>

        {/* MCQ LIST */}
        <div className="space-y-6">
          {mcqs
            .filter((mcq) => mcq && mcq.question && Array.isArray(mcq.options))
            .map((mcq, idx) => {
              const selected = mcq.selectedIndex;
              const correctIndex = mcq.options.findIndex((o) => o.isCorrect);

              return (
                <div
                  key={mcq._id || idx}
                  className="border p-4 rounded break-words"
                >
                  {/* QUESTION */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="font-medium text-[15px] leading-relaxed flex-1">
                      {idx + 1}.{" "}
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderMathHTML(mcq.question.text),
                        }}
                      />
                    </div>

                    <div className="flex-shrink-0">
                      {mcq.correct ? (
                        <span className="text-green-600 font-bold">✔</span>
                      ) : (
                        <span className="text-red-600 font-bold">✘</span>
                      )}
                    </div>
                  </div>

                  {mcq.question.image && (
                    <img
                      src={getImageUrl(mcq.question.image)}
                      alt="question"
                      className="mt-2 w-full max-w-[320px] md:max-w-[400px] h-auto rounded"
                    />
                  )}

                  {/* OPTIONS */}
                  <div className="ml-6 mt-2 space-y-1">
                    {mcq.options.map((opt, i) => {
                      const bg =
                        i === selected
                          ? mcq.correct
                            ? "bg-green-100"
                            : "bg-red-100"
                          : "";

                      return (
                        <div
                          key={i}
                          className={`p-2 rounded text-[14px] leading-relaxed ${bg}`}
                        >
                          ({String.fromCharCode(65 + i)}){" "}
                          <span
                            dangerouslySetInnerHTML={{
                              __html: renderMathHTML(opt.label),
                            }}
                          />
                          {opt.image && (
                            <img
                              src={getImageUrl(opt.image)}
                              alt="option"
                              className="mt-1 w-full max-w-[150px] md:max-w-[200px] h-auto rounded"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* CORRECT ANSWER */}
                  <div className="mt-2 text-sm">
                    <b>Correct Answer:</b>{" "}
                    {String.fromCharCode(65 + correctIndex)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
