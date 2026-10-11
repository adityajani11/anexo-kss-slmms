import React, { useState, useMemo } from "react";
import { Card, Button, Modal, Image, Tag, Tooltip, message } from "antd";
import {
  EditOutlined,
  PictureOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import axios from "axios";
import Swal from "sweetalert2";

// KaTeX auto-render (we'll pre-render into strings, not mutate live DOM)
import renderMathInElement from "katex/contrib/auto-render/auto-render";
import "katex/dist/katex.min.css";

export default function MCQCard({
  mcq,
  onEdit,
  onDeleted,
  setPreview,
  isSelectedForPaper = false,
  toggleSelectForPaper = () => {},
  allowSelection = false,
  selectedStandard = null,
  selectedSubject = null,
}) {
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);

  const baseURL = import.meta.env.VITE_API_BASE_URL || "";
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // ---- Build MCQ Image URL helper
  const buildMCQImageURL = (key) => {
    if (!key) return null;

    const clean = String(key).trim();
    if (!clean || clean === "null" || clean === "undefined") return null;

    return `${baseURL}/mcqs/image?key=${encodeURIComponent(clean)}`;
  };

  const questionImage = buildMCQImageURL(mcq?.question?.image);

  const standard = mcq?.standardId?.standard || "-";
  const subject = mcq?.subjectId?.name || "-";
  const category = mcq?.categoryId?.name || "-";

  // ---- KaTeX pre-render helper (convert $..$ inside arbitrary HTML to HTML with <span class="katex">..)
  const renderMathHTML = (html) => {
    if (!html) return "";
    // guard for SSR or very early mounts
    if (typeof window === "undefined" || typeof document === "undefined")
      return html;

    const el = document.createElement("div");
    el.innerHTML = html;
    try {
      renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
      return el.innerHTML;
    } catch {
      // if KaTeX fails for any reason, fall back to original
      return html;
    }
  };

  // ---- Pre-render question/option/explanation to stable HTML strings
  const questionHTML = useMemo(
    () => renderMathHTML(mcq?.question?.text || ""),
    [mcq?.question?.text]
  );

  const optionHTMLs = useMemo(
    () => (mcq?.options || []).map((o) => renderMathHTML(o?.label || "")),
    [mcq?.options]
  );

  const explanationHTML = useMemo(
    () => renderMathHTML(mcq?.explanation || ""),
    [mcq?.explanation]
  );

  const handleDelete = async () => {
    try {
      const res = await axios.delete(`${apiBase}/mcqs/${mcq._id}/hard`);
      if (res.data?.success) {
        onDeleted && onDeleted(mcq._id);
      } else {
        message.error(res.data?.error || "Failed to delete MCQ");
      }
    } catch {
      message.error("Error deleting MCQ");
    }
  };

  const showDeleteConfirm = () => {
    Swal.fire({
      title: "Delete this MCQ?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then((result) => result.isConfirmed && handleDelete());
  };

  // Determine if checkbox should be enabled for this MCQ
  const checkboxEnabled =
    allowSelection &&
    selectedStandard &&
    selectedSubject &&
    mcq?.standardId?._id === selectedStandard &&
    mcq?.subjectId?._id === selectedSubject;

  const FullMCQContent = (
    <>
      {/* QUESTION */}
      <div
        className="text-gray-900 text-base leading-relaxed"
        style={{ fontFamily: mcq?.question?.font || "inherit" }}
        dangerouslySetInnerHTML={{ __html: questionHTML }}
      />

      {questionImage && (
        <Image
          src={questionImage}
          className="mt-3 rounded cursor-zoom-in max-h-60 object-contain"
          preview={false}
          onClick={() => setPreview({ visible: true, src: questionImage })}
        />
      )}

      {/* OPTIONS */}
      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mt-5 mb-2">
        Options
      </h4>

      <div className="space-y-2">
        {mcq.options.map((opt, index) => {
          const optImg = buildMCQImageURL(opt.image);

          const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
          `${encodeURIComponent(opt.image)}`;

          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-md border transition ${
                opt.isCorrect
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {/* A/B/C/D Circle */}
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${
                  opt.isCorrect
                    ? "bg-green-600 text-white"
                    : "bg-gray-300 text-gray-800"
                }`}
              >
                {optionLetter}
              </div>

              {/* Option Text (pre-rendered math) */}
              <div className="flex-1">
                <div
                  className="text-gray-800"
                  dangerouslySetInnerHTML={{ __html: optionHTMLs[index] }}
                />
              </div>

              {/* Option Image */}
              {optImg && (
                <Image
                  src={optImg}
                  width={50}
                  height={50}
                  className="object-contain rounded cursor-zoom-in"
                  preview={false}
                  onClick={() => setPreview({ visible: true, src: optImg })}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* EXPLANATION */}
      {mcq.explanation && (
        <div className="mt-5 p-3 bg-blue-50 border border-blue-300 rounded text-gray-800">
          <strong>Explanation:</strong>
          <div
            className="mt-1"
            dangerouslySetInnerHTML={{ __html: explanationHTML }}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      {/* MOBILE PREVIEW CARD */}
      <Card
        hoverable
        className="block md:hidden shadow-sm rounded-lg mb-4"
        onClick={() => setIsFullModalOpen(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className="line-clamp-2 text-gray-900 font-medium flex-1"
            dangerouslySetInnerHTML={{ __html: questionHTML }}
          />
          {allowSelection && (
            <div onClick={(e) => e.stopPropagation()} className="ml-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelectedForPaper}
                  onChange={() => {
                    if (checkboxEnabled) toggleSelectForPaper(mcq._id);
                  }}
                  disabled={!checkboxEnabled}
                />
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* DESKTOP FULL CARD */}
      <Card
        hoverable
        className="hidden md:block w-full mb-4 rounded-lg shadow-sm"
        bodyStyle={{ padding: 0 }}
      >
        <div className="p-5 border-b border-gray-200">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                <Tag color="blue">Std {standard}</Tag>
                <Tag color="purple">{subject}</Tag>
                <Tag color="geekblue">{category}</Tag>
              </div>
              {FullMCQContent}
            </div>

            <div className="flex flex-col gap-2 items-end">
              {allowSelection && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelectedForPaper}
                      onChange={() => {
                        if (checkboxEnabled) toggleSelectForPaper(mcq._id);
                      }}
                      disabled={!checkboxEnabled}
                    />
                    <span className="text-sm ml-1">Select</span>
                  </label>
                </div>
              )}

              {questionImage && (
                <Tooltip title="View Image">
                  <Button
                    size="small"
                    icon={<PictureOutlined />}
                    onClick={() =>
                      setPreview({ visible: true, src: questionImage })
                    }
                  />
                </Tooltip>
              )}
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(mcq)}
              />
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={showDeleteConfirm}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* FULL MCQ MODAL (MOBILE) */}
      <Modal
        open={isFullModalOpen}
        onCancel={() => setIsFullModalOpen(false)}
        footer={null}
        centered
        width={800}
      >
        {FullMCQContent}
      </Modal>
    </>
  );
}
