import React from "react";
import Loader from "./Loader";
import MCQCard from "./MCQCard";
import { Image } from "antd";

export default function MCQList({
  mcqs,
  loading,
  onEdit,
  onDeleted,
  preview,
  setPreview,

  // Filters passed from parent
  selectedFilters,
  setSelectedFilters,
  standards = [],
  subjects = [],
  categories = [],
  searchQuery,
  setSearchQuery,

  selectedForPaper = new Set(),
  toggleSelectForPaper = () => {},
  allowSelection = false,
  selectedStandard = null,
  selectedSubject = null,
}) {
  // ---------------------------
  // ALWAYS VISIBLE FILTER BAR
  // ---------------------------
  const FiltersBar = (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* Standard */}
      <select
        className="border p-2 rounded"
        value={selectedFilters.standard || ""}
        onChange={(e) =>
          setSelectedFilters((p) => ({
            ...p,
            standard: e.target.value || null,
          }))
        }
      >
        {standards.map((s) => (
          <option key={s._id} value={s._id}>
            Standard {s.standard}
          </option>
        ))}
      </select>

      {/* Subject */}
      <select
        className="border p-2 rounded"
        value={selectedFilters.subject || ""}
        onChange={(e) =>
          setSelectedFilters((p) => ({
            ...p,
            subject: e.target.value || null,
          }))
        }
      >
        {subjects.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Category */}
      <select
        className="border p-2 rounded"
        value={selectedFilters.category || ""}
        onChange={(e) =>
          setSelectedFilters((p) => ({
            ...p,
            category: e.target.value || null,
          }))
        }
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Search */}
      <input
        type="text"
        className="border p-2 rounded"
        placeholder="Search MCQ..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  // ---------------------------
  // LOADING
  // ---------------------------
  if (loading) {
    return (
      <>
        {FiltersBar}
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      </>
    );
  }

  // ---------------------------
  // EMPTY STATE (filters must remain)
  // ---------------------------
  if (!mcqs || mcqs.length === 0) {
    return (
      <>
        {FiltersBar}
        <div className="text-center py-10 text-gray-600 text-lg">
          No MCQs found
        </div>

        {/* Needed for preview group (hidden unless clicked) */}
        <Image.PreviewGroup
          preview={{
            visible: preview.visible,
            onVisibleChange: (vis) =>
              setPreview((p) => ({ ...p, visible: vis })),
            zIndex: 999,
          }}
        >
          <Image src={preview.src} style={{ display: "none" }} />
        </Image.PreviewGroup>
      </>
    );
  }

  // ---------------------------
  // NORMAL LIST
  // ---------------------------
  return (
    <>
      {FiltersBar}

      {/* MCQ Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {mcqs.map((mcq) => (
          <MCQCard
            key={mcq._id}
            mcq={mcq}
            onEdit={onEdit}
            onDeleted={onDeleted}
            setPreview={setPreview}
            isSelectedForPaper={selectedForPaper.has(mcq._id)}
            toggleSelectForPaper={toggleSelectForPaper}
            allowSelection={allowSelection}
            selectedStandard={selectedStandard}
            selectedSubject={selectedSubject}
          />
        ))}
      </div>

      {/* Global Image Preview Group */}
      <Image.PreviewGroup
        preview={{
          visible: preview.visible,
          onVisibleChange: (vis) => setPreview((p) => ({ ...p, visible: vis })),
          zIndex: 999,
        }}
      >
        <Image src={preview.src} style={{ display: "none" }} />
      </Image.PreviewGroup>
    </>
  );
}
