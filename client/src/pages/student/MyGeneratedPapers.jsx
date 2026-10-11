// ✅ src/pages/student/MyGeneratedPapers.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Spin } from "antd";
import {
  FileText,
  Download,
  PlayCircle,
  XCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Utility to build full image URLs safely
const buildImageURL = (base, key) => {
  if (!key) return null;

  const cleanKey = String(key).replace(/\\/g, "/").trim();
  if (!cleanKey || cleanKey === "null" || cleanKey === "undefined") return null;

  return `${base}/mcqs/image?key=${encodeURIComponent(cleanKey)}`;
};

/* ---------- Enhanced KaTeX + Image + Gujarati Renderer ---------- */
const renderSafeKatex = (content = "") => {
  if (!content) return "";

  // --- 1️⃣ Preserve <img> tags safely, escape other HTML ---
  let sanitized = content
    .replace(/<img(.*?)>/g, (match) => `[[IMG${match}IMG]]`) // temp mark images
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/\[\[IMG(.*?)IMG\]\]/g, "<img$1>"); // restore allowed <img> tags

  // --- 2️⃣ Detect any math syntax ---
  const hasMath =
    /(\$+.*\$+|\\frac|\\sqrt|\\sum|\\int|\\pi|\\theta|\\sin|\\cos|\\tan|\\begin{)/.test(
      sanitized
    );
  if (!hasMath) return sanitized;

  try {
    // --- 3️⃣ Split block and inline math separately ---
    // Block: $$...$$ or \[...\]
    sanitized = sanitized.replace(
      /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g,
      (_, a, b) =>
        `<span class="katex-block">${katex.renderToString(a || b, {
          throwOnError: false,
          displayMode: true,
          trust: true,
          strict: false,
        })}</span>`
    );

    // Inline: $...$ or \(..\)
    sanitized = sanitized.replace(
      /\$(.+?)\$|\\\((.+?)\\\)/g,
      (_, a, b) =>
        `<span class="katex-inline">${katex.renderToString(a || b, {
          throwOnError: false,
          displayMode: false,
          trust: true,
          strict: false,
        })}</span>`
    );

    return sanitized;
  } catch (err) {
    console.warn("KaTeX render error:", err.message);
    return sanitized;
  }
};

/* ---------- Hook: Post-render math correction ---------- */
const useRenderKatex = (deps = []) => {
  useEffect(() => {
    const katexNodes = document.querySelectorAll(".katex-inline, .katex-block");
    katexNodes.forEach((node) => {
      // KaTeX is already rendered in renderSafeKatex, this ensures reflow consistency
      node.style.display = node.classList.contains("katex-block")
        ? "block"
        : "inline";
    });
  }, deps);
};

function LiveExamModal({
  activeExam,
  examMCQs,
  answers,
  setAnswers,
  timer,
  formatTime,
  handleCancelExam,
  handleSubmitExam,
  renderSafeKatex,
}) {
  useRenderKatex([examMCQs]); // reflow KaTeX whenever MCQs change

  const base = import.meta.env.VITE_API_BASE_URL;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-[95%] max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">
          🧠 Live Exam: {activeExam.title}
        </h3>
        <p className="text-gray-600 mb-4">
          ⏱️ Time Elapsed:{" "}
          <span className="font-semibold text-blue-600">
            {formatTime(timer)}
          </span>
        </p>

        {examMCQs.map((mcq) => (
          <div
            key={mcq._id}
            className="border border-gray-200 rounded-xl p-4 mb-4"
          >
            {/* ---------- Question Text ---------- */}
            <div
              className="font-medium mb-3 text-[15px] leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderSafeKatex(mcq.question?.text || ""),
              }}
            />

            {/* ---------- Question Image ---------- */}
            {mcq.question?.image && (
              <div className="my-3 text-center">
                <img
                  src={buildImageURL(base, mcq.question.image)}
                  alt="question"
                  className="max-h-48 mx-auto rounded-lg border object-contain"
                />
              </div>
            )}

            {/* ---------- Options ---------- */}
            {mcq.options.map((opt, i) => (
              <label
                key={i}
                className={`block px-3 py-2 rounded-lg border mb-2 cursor-pointer transition ${
                  answers[mcq._id] === i
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={mcq._id}
                  checked={answers[mcq._id] === i}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [mcq._id]: i }))
                  }
                  className="mr-2"
                />

                {/* Option text */}
                <span
                  dangerouslySetInnerHTML={{
                    __html: renderSafeKatex(opt.label || ""),
                  }}
                />

                {/* Option image */}
                {opt.image && (
                  <div className="mt-2 text-center">
                    <img
                      src={buildImageURL(base, opt.image)}
                      alt={`option-${i}`}
                      className="max-h-32 mx-auto rounded-lg border object-contain"
                    />
                  </div>
                )}
              </label>
            ))}
          </div>
        ))}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancelExam}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <XCircle size={18} /> Cancel
          </button>
          <button
            onClick={handleSubmitExam}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle size={18} /> Submit Exam
          </button>
        </div>
      </div>
    </div>
  );
}

const MemoizedLiveExamModal = React.memo(LiveExamModal);

/* ---------- Main Page ---------- */
export default function MyGeneratedPapers() {
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [examMCQs, setExamMCQs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [examStartTime, setExamStartTime] = useState(null);
  const base = import.meta.env.VITE_API_BASE_URL;
  const user = JSON.parse(localStorage.getItem("user"));
  const timerRef = useRef(null);

  /* ---------- Load Papers ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${base}/papers/mine`, {
          params: { studentId: user?.id || user?._id },
        });
        if (res.data.success) setPapers(res.data.data || []);
      } catch (err) {
        console.error(err);
        Swal.fire("⚠️ Error", "Unable to load your papers!", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ---------- Resume Exam (if stored) ---------- */
  useEffect(() => {
    const storedExam = localStorage.getItem("liveExam");
    if (!storedExam || !papers.length) return; // 🧠 Only run if both exist

    try {
      const { paperId, startTime } = JSON.parse(storedExam);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setExamStartTime(startTime);
      setTimer(elapsed);

      const foundPaper = papers.find((paperItem) => paperItem._id === paperId);
      if (foundPaper) {
        loadExamMCQs(foundPaper);
      }
    } catch (err) {
      console.error("Error resuming exam:", err);
    }
  }, [papers]);

  /* ---------- Controlled Timer ---------- */
  useEffect(() => {
    if (activeExam) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeExam]);

  /* ---------- Load Exam MCQs ---------- */
  const loadExamMCQs = async (paper) => {
    try {
      setActiveExam(paper);
      Swal.fire({
        title: "⏳ Loading exam...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await axios.get(`${base}/papers/${paper._id}/mcqs`);
      if (res.data.success) {
        setExamMCQs(res.data.data || []);
        Swal.close();
      } else throw new Error();
    } catch (err) {
      Swal.fire("❌ Error", "Unable to load exam questions!", "error");
      setActiveExam(null);
    }
  };

  /* ---------- Start Live Exam ---------- */
  const handleStartLiveExam = async (paper) => {
    const confirm = await Swal.fire({
      title: "🧠 Start Live Exam?",
      text: `Do you want to start live exam for "${paper.title}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Start!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });
    if (!confirm.isConfirmed) return;

    localStorage.setItem(
      "liveExam",
      JSON.stringify({ paperId: paper._id, startTime: Date.now() })
    );

    setExamStartTime(Date.now());
    setTimer(0);
    await loadExamMCQs(paper);
  };

  /* ---------- Submit Exam ---------- */
  const handleSubmitExam = async () => {
    const confirm = await Swal.fire({
      title: "✅ Submit Exam?",
      text: "Are you sure you want to submit your live exam?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Submit",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
    });
    if (!confirm.isConfirmed) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const payload = {
        studentId: user.id || user._id,
        paperId: activeExam._id,
        timeTakenSeconds: timer,
        responses: Object.entries(answers).map(([mcqId, selectedIndex]) => ({
          mcqId,
          selectedIndex,
        })),
      };

      Swal.fire({
        title: "💾 Saving your attempt...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await axios.post(`${base}/exam-attempts/submit`, payload);
      Swal.close();

      if (res.data.success) {
        const result = res.data.data;
        localStorage.removeItem("liveExam");
        setActiveExam(null);
        setAnswers({});
        setTimer(0);

        Swal.fire({
          title: "🎯 Exam Completed!",
          html: `
            <div style="text-align:left;font-size:15px">
              <p>✅ <b>Correct Answers:</b> ${result.correctCount} / ${
            result.totalQuestions
          }</p>
              <p>🕒 <b>Time Taken:</b> ${Math.floor(result.timeTaken / 60)}m ${
            result.timeTaken % 60
          }s</p>
              <p>📊 <b>Score:</b> ${result.scorePercent}%</p>
            </div>`,
          icon: "success",
          confirmButtonText: "OK",
          confirmButtonColor: "#2563eb",
        });
      } else {
        throw new Error(res.data.message || "Failed to save attempt");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Error", "Unable to submit your exam. Try again.", "error");
    }
  };

  /* ---------- Cancel Exam ---------- */
  const handleCancelExam = async () => {
    const confirm = await Swal.fire({
      title: "❌ Cancel Exam?",
      text: "This will discard your current live exam session.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Cancel",
      cancelButtonText: "No",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    localStorage.removeItem("liveExam");
    setActiveExam(null);
    setTimer(0);
    setAnswers({});
    Swal.fire("🛑 Cancelled", "Your live exam has been cancelled.", "info");
  };

  /* ---------- Handle Download ---------- */
  const handleDownload = async (paper) => {
    const paperId = paper._id;

    const { value: selection } = await Swal.fire({
      title: "📄 Select PDF Type",
      html: `
      <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
        <label for='pdfOption' style="font-size:15px;font-weight:500;color:#333;">
          Choose download type:
        </label>
        <select id='pdfOption' style="padding:10px;border-radius:10px;border:1px solid #ccc;font-size:15px;">
          <option value='withAnswers' selected>With Answers (and Explanations)</option>
          <option value='withoutAnswers'>❌ Without Answers</option>
        </select>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "📥 Download",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      preConfirm: () => document.getElementById("pdfOption").value,
    });

    if (!selection) return;
    const includeAnswers = selection === "withAnswers";

    Swal.fire({
      title: "⏳ Preparing your paper...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const url = `${base}/papers/${paperId}/download?studentId=${user?.id}&answers=${includeAnswers}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Failed");

      const blob = await resp.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${paper.title?.replace(/\s+/g, "_") || "paper"}.pdf`;
      link.click();

      Swal.close();
      Swal.fire("🎉 Success", "Your paper has been downloaded!", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Error", "Failed to download paper. Try again.", "error");
    }
  };

  /* ---------- Delete Paper ---------- */
  const handleDeletePaper = async (paper) => {
    const confirm = await Swal.fire({
      title: "🗑️ Delete Paper?",
      text: `Are you sure you want to delete "${paper.title}"? This will remove all Exam Attempts too. This cannot be undone.`,
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

      await axios.delete(`${base}/papers/delete/${user.id}/${paper._id}`);

      Swal.close();
      Swal.fire("✅ Deleted", "Paper deleted successfully.", "success");

      // Reload papers
      const res = await axios.get(`${base}/papers/mine`, {
        params: { studentId: user?._id || user?.id },
      });
      if (res.data.success) setPapers(res.data.data || []);
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Error", "Failed to delete paper. Try again.", "error");
    }
  };

  /* ---------- Format Time ---------- */
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h ? `${h}h ` : ""}${m}m ${s}s`;
  };

  /* ---------- Render ---------- */
  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Loading your papers..." />
      </div>
    );

  return (
    <>
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 flex items-center gap-2 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        🧾 My Generated Papers
      </h2>

      {papers.length === 0 ? (
        <div className="text-center bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-10">
          <div className="text-4xl mb-3">😕</div>
          <div className="text-gray-700 text-lg font-medium">
            No papers found yet.
          </div>
          <div className="text-gray-500 text-sm mt-2">
            Try generating one from the MCQ section! ✨
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((p) => (
            <div
              key={p._id}
              className="p-4 bg-white rounded-2xl shadow hover:shadow-lg border border-gray-100 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                    <FileText className="text-blue-500" size={28} />
                  </div>
                  <div className="flex flex-col">
                    <div className="font-semibold text-base sm:text-lg">
                      {p.title || "Untitled Paper"} 📘
                    </div>
                    <div className="text-gray-600 text-sm mt-1">
                      🧮 Marks:{" "}
                      <span className="font-medium">{p.totalMarks}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      🕒 Created: {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* ✅ Delete icon */}
                <button
                  onClick={() => handleDeletePaper(p)}
                  className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                  title="Delete this paper"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                  onClick={() => handleDownload(p)}
                >
                  <Download size={18} />
                  Download
                </button>

                <button
                  className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
                  onClick={() => handleStartLiveExam(p)}
                >
                  <PlayCircle size={18} />
                  Prepare for Live Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Live Exam Modal ---------- */}
      {activeExam && (
        <MemoizedLiveExamModal
          activeExam={activeExam}
          examMCQs={examMCQs}
          answers={answers}
          setAnswers={setAnswers}
          timer={timer}
          formatTime={formatTime}
          handleCancelExam={handleCancelExam}
          handleSubmitExam={handleSubmitExam}
          renderSafeKatex={renderSafeKatex}
        />
      )}
    </>
  );
}
