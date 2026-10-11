import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Spin, Switch, Select, Tag, Checkbox, Input, Pagination } from "antd";
import katex from "katex";
import "katex/dist/katex.min.css";
import { ChevronUp, ChevronDown } from "lucide-react";

const { Option } = Select;
const { Search } = Input;

// Set limit for MCQs
const maxMcqsLimit = 120;

/* ---------- Utility: Render text with KaTeX parsing (pure) ---------- */
function renderMathToNodes(text = "") {
  if (!text) return null;
  try {
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
    return parts.map((part, idx) => {
      const inlineMatch = part.match(/^\$([^$]+)\$$/);
      const blockMatch = part.match(/^\$\$([^$]+)\$\$$/);
      if (blockMatch) {
        const html = katex.renderToString(blockMatch[1], {
          throwOnError: false,
          displayMode: true,
        });
        return (
          <div
            key={idx}
            className="inline-block my-1"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } else if (inlineMatch) {
        const html = katex.renderToString(inlineMatch[1], {
          throwOnError: false,
          displayMode: false,
          strict: false,
        });
        return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
      } else {
        return <span key={idx}>{part}</span>;
      }
    });
  } catch (err) {
    console.warn("KaTeX render error:", err);
    return <>{text}</>;
  }
}

/* ---------- Memoized KaTeX component ---------- */
const MathText = React.memo(function MathText({
  text = "",
  className = "",
  style = {},
}) {
  const nodes = useMemo(() => renderMathToNodes(text), [text]);
  return (
    <span className={className} style={style}>
      {nodes}
    </span>
  );
});

export default function ViewAllMCQs() {
  /** =========================
   * STATES
   * ========================= */
  const [mcqs, setMcqs] = useState([]);
  const [showAnswers, setShowAnswers] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedMCQs, setSelectedMCQs] = useState([]);
  const [isBarExpanded, setIsBarExpanded] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingMcqs, setLoadingMcqs] = useState(false);

  const [actionLoadingPdf, setActionLoadingPdf] = useState(false);
  const [actionLoadingSave, setActionLoadingSave] = useState(false);

  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [mcqsReady, setMcqsReady] = useState(false);

  const [randomCount, setRandomCount] = useState(null);
  const [showRandomDropdown, setShowRandomDropdown] = useState(false);

  const [randomLoading, setRandomLoading] = useState(false);

  const initializedRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const fetchAbortControllerRef = useRef(null);

  const base = import.meta.env.VITE_API_BASE_URL;
  const fileBase = base.replace("/api/v1", "");
  const user = JSON.parse(localStorage.getItem("user"));

  const isOverLimit = selectedMCQs.length > maxMcqsLimit;
  const isAtLimit = selectedMCQs.length === maxMcqsLimit;

  /** =========================
   * INITIAL LOAD
   * ========================= */
  useEffect(() => {
    if (!user?.standardId) {
      Swal.fire(
        "⚠️ Missing Data",
        "Standard ID not found. Please log in again.",
        "warning"
      );
      setLoadingLookups(false);
      return;
    }
    fetchLookupData();
  }, []);

  const fetchLookupData = async () => {
    setLoadingLookups(true);
    initializedRef.current = false;

    try {
      const [subRes, catRes] = await Promise.all([
        axios.get(`${base}/subjects`),
        axios.get(`${base}/categories`),
      ]);

      const subs = subRes?.data?.data || [];
      const cats = catRes?.data?.data || [];

      setSubjects(subs);
      setCategories(cats);

      const defaultSubject = subs.length > 0 ? subs[0]._id : null;

      setSelectedSubject(defaultSubject);
      setSelectedCategory(null);
      setPage(1);

      /** FIRST MCQ FETCH */
      await fetchMCQs({
        p: 1,
        lim: limit,
        subjectId: defaultSubject,
        categoryId: null,
      });
      initializedRef.current = true;
      setHasFetchedOnce(true);
    } catch (err) {
      console.error("Lookup fetch error:", err);
    } finally {
      setLoadingLookups(false);
    }
  };

  /** =========================
   * FETCH MCQS (WITH CANCEL)
   * ========================= */
  const fetchMCQs = async ({
    p = page,
    lim = limit,
    subjectId = selectedSubject,
    categoryId = selectedCategory,
    q = searchTerm,
  } = {}) => {
    if (!user?.standardId) return;

    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortControllerRef.current = controller;

    setLoadingMcqs(true);
    try {
      const res = await axios.get(
        `${base}/mcqs/by-standard/${user.standardId}`,
        {
          params: { page: p, limit: lim, subjectId, categoryId, q },
          signal: controller.signal,
        }
      );

      const data = res?.data?.data || [];
      const tot = res?.data?.total ?? data.length;

      setMcqs(data);
      setTotal(Number(tot));

      Promise.resolve().then(() => {
        setMcqsReady(true);
      });
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("MCQ fetch error:", err);
        setMcqs([]);
        setTotal(0);
      }
    } finally {
      setLoadingMcqs(false);
      fetchAbortControllerRef.current = null;
    }
  };

  /** =========================
   * AUTO FETCH ON FILTER/PAGE CHANGE
   * ========================= */
  useEffect(() => {
    if (!initializedRef.current) return;
    setMcqsReady(false);
    fetchMCQs({ p: page, lim: limit });
  }, [page, limit, selectedSubject, selectedCategory]);

  /** =========================
   * SEARCH DEBOUNCE
   * ========================= */
  useEffect(() => {
    if (!initializedRef.current) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      fetchMCQs({ p: 1, lim: limit, q: searchTerm });
    }, 450);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  /** =========================
   * HELPERS
   * ========================= */
  const getImageUrl = (key) => {
    if (!key) return null;

    const clean = String(key).trim();
    if (!clean || clean === "null" || clean === "undefined") return null;

    return `${base}/mcqs/image?key=${encodeURIComponent(clean)}`;
  };

  // Choose random MCQs (of given MCQ limit)
  const handleRandomPick = async (count) => {
    setShowRandomDropdown(false);

    try {
      setRandomLoading(true);

      const res = await axios.get(
        `${base}/mcqs/random/by-standard/${user.standardId}`,
        {
          params: {
            subjectId: selectedSubject,
            categoryId: selectedCategory,
            q: searchTerm,
            limit: count,
          },
        }
      );

      const data = res.data?.data || [];
      const randomIds = data.map((m) => m._id);

      // ✅ Apply hard limit
      const cappedIds = randomIds.slice(0, maxMcqsLimit);

      if (data.length < count) {
        await Swal.fire(
          "ℹ️ Limited MCQs",
          `Only ${data.length} MCQs available. You can continue.`,
          "info"
        );
      }

      if (randomIds.length > maxMcqsLimit) {
        await Swal.fire(
          "⚠️ Limit Applied",
          `Max allowed is ${maxMcqsLimit} MCQs. Selected only ${maxMcqsLimit}.`,
          "warning"
        );
      }

      // ✅ Save capped selection
      setSelectedMCQs(cappedIds);
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Error", "Failed to fetch random MCQs.", "error");
    } finally {
      setRandomLoading(false);
    }
  };

  const toggleMCQSelection = (mcqId) => {
    setSelectedMCQs((prev) => {
      if (prev.includes(mcqId)) {
        return prev.filter((id) => id !== mcqId);
      }
      if (prev.length >= maxMcqsLimit) {
        Swal.fire(
          "⚠️ Limit Reached",
          `Max ${maxMcqsLimit} MCQs allowed.`,
          "warning"
        );
        return prev;
      }
      return [...prev, mcqId];
    });
  };

  /** =========================
   * PDF DOWNLOAD
   * ========================= */
  const handleDownloadPDF = async () => {
    if (selectedMCQs.length === 0)
      return Swal.fire("⚠️ No MCQs Selected", "Select at least one.", "info");

    const confirm = await Swal.fire({
      title: "Download PDF?",
      showCancelButton: true,
      icon: "question",
    });

    if (!confirm.isConfirmed) return;

    setActionLoadingPdf(true);
    try {
      const response = await axios.post(
        `${base}/mcqs/pdf`,
        {
          mcqIds: selectedMCQs,
          pdfHeading: "MCQ Paper",
          includeAnswers: showAnswers,
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = showAnswers
        ? "MCQs_With_Answers.pdf"
        : "MCQs_Without_Answers.pdf";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire("❌ Error", "PDF generation failed.", "error");
    } finally {
      setActionLoadingPdf(false);
    }
  };

  /** =========================
   * SAVE PAPER
   * ========================= */
  const handleSavePaper = async () => {
    if (selectedMCQs.length === 0)
      return Swal.fire("⚠️ No MCQs Selected", "Select at least one.", "info");

    if (!selectedSubject)
      return Swal.fire(
        "⚠️ Subject Required",
        "Select subject first.",
        "warning"
      );

    const { value: title } = await Swal.fire({
      title: "Paper Title",
      input: "text",
      showCancelButton: true,
    });

    if (!title) return;

    setActionLoadingSave(true);
    try {
      await axios.post(`${base}/papers/generate`, {
        mcqs: selectedMCQs,
        pdfHeading: title,
        includeAnswers: showAnswers,
        title,
        studentId: user?._id || user?.id,
        standardId: user?.standard?._id || user?.standardId,
        subjectId: selectedSubject,
      });

      Swal.fire("Saved!", `Paper "${title}" saved successfully.`, "success");
    } catch (err) {
      Swal.fire(
        "❌ Error",
        err.response?.data?.error || "Failed to save.",
        "error"
      );
    } finally {
      setActionLoadingSave(false);
    }
  };

  /** =========================
   * FIXED RENDER CONDITION (NO FLICKER)
   * ========================= */
  const shouldShowLoader = loadingLookups || loadingMcqs || !hasFetchedOnce;

  /** =========================
   * RENDER
   * ========================= */
  return (
    <div className="min-h-fit">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center justify-between sm:justify-start gap-2">
            📘 <span>View All MCQs</span>
            <button
              onClick={() => setIsBarExpanded((p) => !p)}
              className="sm:hidden text-gray-600 hover:text-blue-600 transition ml-auto"
            >
              {isBarExpanded ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
          </h1>

          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">
              {showAnswers ? "Showing Answers" : "🙈 Hidden Answers"}
            </span>
            <Switch
              checked={showAnswers}
              onChange={(v) => setShowAnswers(v)}
              className="scale-110"
            />
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
          isBarExpanded
            ? "max-h-[500px] opacity-100 mb-6"
            : "max-h-0 opacity-0 sm:max-h-none sm:opacity-100 sm:mb-6"
        }`}
      >
        <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedSubject}
              className="min-w-[180px]"
              onChange={(v) => {
                setSelectedSubject(v || null);
                setSelectedMCQs([]);
                setPage(1);
              }}
            >
              {subjects.map((s) => (
                <Option key={s._id} value={s._id}>
                  {s.name}
                </Option>
              ))}
            </Select>

            <Select
              allowClear
              placeholder="Category"
              className="min-w-[180px]"
              value={selectedCategory}
              onChange={(v) => {
                setSelectedCategory(v || null);
                setSelectedMCQs([]);
                setPage(1);
              }}
            >
              <Option value={null}>All Categories</Option>
              {categories.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name}
                </Option>
              ))}
            </Select>

            <Search
              placeholder="Search MCQs"
              className="min-w-[220px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedSubject(subjects[0]?._id || null);
              setSearchTerm("");
              setSelectedMCQs([]);
              setPage(1);
            }}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md"
          >
            🔄 Reset Filters
          </button>
        </div>
      </div>

      {/* ====== MAIN CONTENT AREA ====== */}
      {shouldShowLoader ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : mcqs.length === 0 ? (
        <div className="text-center text-gray-500 text-lg bg-white p-10 rounded-2xl shadow-sm">
          😕 No MCQs found.
        </div>
      ) : (
        <>
          {/* GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-28">
            {mcqs.map((mcq, index) => {
              const globalIndex = (page - 1) * limit + index;
              const isSelected = selectedMCQs.includes(mcq._id);

              const fontFamily =
                mcq.question?.font === "Nilkanth"
                  ? "Nilkanth"
                  : mcq.question?.font === "HareKrishna"
                  ? "HareKrishna"
                  : "inherit";

              return (
                <div
                  key={mcq._id}
                  className={`relative bg-white p-5 rounded-2xl shadow hover:shadow-lg transition-all border ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-300"
                      : "border-gray-200"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleMCQSelection(mcq._id)}
                    disabled={!isSelected && isAtLimit}
                    className="absolute top-3 right-3"
                  />

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {mcq.categoryId && (
                      <Tag color="blue" className="px-2 py-1">
                        📂 {mcq.categoryId.name}
                      </Tag>
                    )}
                    {mcq.subjectId && (
                      <Tag color="green" className="px-2 py-1">
                        📘 {mcq.subjectId.name}
                      </Tag>
                    )}
                  </div>

                  {/* Question */}
                  <h2 className="text-lg font-semibold text-gray-800 flex gap-2">
                    <span className="text-blue-600">{globalIndex + 1}.</span>
                    <span style={{ fontFamily }}>
                      <MathText text={mcq.question?.text} />
                    </span>
                  </h2>

                  {mcq.question?.image && (
                    <img
                      src={getImageUrl(mcq.question.image)}
                      className="mt-3 rounded-lg border w-full object-contain max-h-52"
                    />
                  )}

                  {/* Options */}
                  <div className="mt-3 space-y-2">
                    {mcq.options.map((opt, idx) => {
                      const isCorrect = opt.isCorrect && showAnswers;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center p-2 rounded-xl border ${
                            isCorrect
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200"
                          }`}
                        >
                          <span className="font-medium mr-2 text-gray-700">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <div className="flex-1 text-gray-800">
                            {opt.label && (
                              <span style={{ fontFamily }}>
                                <MathText text={opt.label} />
                              </span>
                            )}
                            {opt.image && (
                              <img
                                src={getImageUrl(opt.image)}
                                className="mt-1 rounded-lg w-full object-contain max-h-32"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {showAnswers && mcq.explanation && (
                    <div className="mt-3 bg-gray-50 p-2 rounded-lg text-sm text-gray-600">
                      💡 <strong>સમજૂતી :</strong>{" "}
                      <MathText text={mcq.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-4 pb-40">
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              onChange={(p, lim) => {
                setPage(p);
                setLimit(lim);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              showSizeChanger
              pageSizeOptions={["6", "12", "24", "48"]}
            />
          </div>

          {/* Floating Bar */}
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[95%] sm:w-auto bg-gradient-to-r from-blue-50/60 via-white/60 to-blue-100/50 backdrop-blur-lg border border-blue-300/40 shadow-2xl px-4 py-3 rounded-2xl">
            <div className="flex justify-between items-center">
              <span
                className={`font-medium ${isOverLimit ? "text-red-600" : ""}`}
              >
                🧩 {selectedMCQs.length}/{maxMcqsLimit} MCQs Selected
              </span>

              <button
                onClick={() => setIsBarExpanded((p) => !p)}
                className="text-gray-600 hover:text-blue-700"
              >
                {isBarExpanded ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronUp size={20} />
                )}
              </button>
            </div>

            {isOverLimit && (
              <p className="text-center text-sm text-red-600 mt-1 animate-pulse">
                ⚠️ Max {maxMcqsLimit} MCQs
              </p>
            )}

            <div
              className={`transition-all overflow-hidden ${
                isBarExpanded
                  ? "max-h-48 opacity-100 mt-3"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                {showRandomDropdown && (
                  <div className="mt-3 flex justify-center sm:justify-start">
                    <Select
                      value={randomCount}
                      placeholder="Select count"
                      autoFocus
                      style={{ width: 120 }}
                      onChange={(val) => {
                        setRandomCount(val);
                        handleRandomPick(val);
                      }}
                      onBlur={() =>
                        setTimeout(() => setShowRandomDropdown(false), 200)
                      }
                    >
                      <Option value={25}>25 MCQs</Option>
                      <Option value={40}>40 MCQs</Option>
                      <Option value={50}>50 MCQs</Option>
                      <Option value={80}>80 MCQs</Option>
                      <Option value={120}>120 MCQs</Option>
                    </Select>
                  </div>
                )}

                <button
                  onClick={() => {
                    setRandomCount(null);
                    setShowRandomDropdown(true);
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm shadow-md bg-orange-500 hover:bg-orange-600 text-white"
                >
                  🎲 Random Select
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isOverLimit || actionLoadingPdf}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-md ${
                    isOverLimit
                      ? "bg-gray-300 text-gray-500"
                      : "bg-blue-600/90 hover:bg-blue-700 text-white"
                  }`}
                >
                  {actionLoadingPdf ? (
                    <span className="flex items-center gap-2">
                      <Spin size="small" /> Preparing...
                    </span>
                  ) : (
                    "🧾 Save as PDF"
                  )}
                </button>

                <button
                  onClick={handleSavePaper}
                  disabled={
                    !selectedSubject || isOverLimit || actionLoadingSave
                  }
                  className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-md ${
                    !selectedSubject || isOverLimit
                      ? "bg-gray-300 text-gray-500"
                      : "bg-purple-600/90 hover:bg-purple-700 text-white"
                  }`}
                >
                  {actionLoadingSave ? (
                    <span className="flex items-center gap-2">
                      <Spin size="small" /> Saving...
                    </span>
                  ) : (
                    "💾 Save as Draft Paper"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
