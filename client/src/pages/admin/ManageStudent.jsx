import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Search,
  Filter,
  AlertTriangle,
} from "lucide-react";
import Loader from "../../components/Loader";
import StudentForm from "../../components/StudentForm";
import { deleteWithPassword } from "../../utils/deleteWithPassword";

export default function ManageStudent() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete Student Data (bulk, by standard) state
  const [deleteDataModalOpen, setDeleteDataModalOpen] = useState(false);
  const [allStandards, setAllStandards] = useState([]);
  const [standardToDelete, setStandardToDelete] = useState("");

  const searchKeys = ["city", "district", "schoolName", "cast"];

  // search / filter UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOptions, setSearchOptions] = useState({
    city: false,
    district: false,
    schoolName: false,
    cast: false,
  });
  const [filterStandard, setFilterStandard] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const base = import.meta.env.VITE_API_BASE_URL;

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // helper: build query params to send to backend
  const buildParams = useCallback(() => {
    const params = {
      page,
      limit,
    };

    // standard & gender filters
    if (filterStandard) params.standardId = filterStandard;
    if (filterGender) params.gender = filterGender;

    // search behaviour: always set `search` for name/username search
    if (debouncedSearch && debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();

      // if user checked specific fields, also send them explicitly so backend can apply to those fields
      if (searchOptions.city) params.city = debouncedSearch.trim();
      if (searchOptions.district) params.district = debouncedSearch.trim();
      if (searchOptions.schoolName) params.schoolName = debouncedSearch.trim();
      if (searchOptions.cast) params.cast = debouncedSearch.trim();
    }

    // include disabled toggle if you ever add it
    // params.includeDisabled = true/false

    return params;
  }, [
    page,
    limit,
    debouncedSearch,
    filterStandard,
    filterGender,
    searchOptions,
  ]);

  // fetch paginated students from server
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const res = await axios.get(`${base}/students`, { params });
      const data = res.data?.data || {};
      setStudents(data.items || []);
      setTotal(data.total || 0);
      // sync backend page & limit if backend adjusts them
      if (data.page && data.page !== page) setPage(data.page);
      if (data.limit && data.limit !== limit) setLimit(data.limit);
    } catch (err) {
      console.error("Failed to fetch students", err);
      Swal.fire("Error", "Failed to load students", "error");
    } finally {
      setLoading(false);
    }
  }, [base, buildParams, page, limit]);

  // initial & reactive fetch
  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStudents]);

  // when page/limit changes, fetch
  useEffect(() => {
    fetchStudents();
  }, [page, limit]);

  // debounce search input to avoid frequent requests
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // when filters/search change, reset to page 1 and fetch
  useEffect(() => {
    setPage(1);
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    filterStandard,
    filterGender,
    JSON.stringify(searchOptions),
  ]);

  useEffect(() => {
    document.body.style.overflow =
      editModalOpen || deleteDataModalOpen ? "hidden" : "auto";
  }, [editModalOpen, deleteDataModalOpen]);

  // fetch the full standards list (used by the Delete Student Data dropdown)
  useEffect(() => {
    const fetchAllStandards = async () => {
      try {
        const res = await axios.get(`${base}/standards`);
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setAllStandards(list);
      } catch (err) {
        console.error("Failed to fetch standards", err);
      }
    };
    fetchAllStandards();
  }, [base]);

  // view / edit / delete (delete flow kept same as your implementation)
  const handleView = (student) => {
    Swal.fire({
      icon: "info",
      title: `<strong>${student.fullName}</strong>`,
      html: `
      <div style="text-align: left; line-height: 1.6;">
        <p><b>Username:</b> ${student.username || "N/A"}</p>
        <p><b>City:</b> ${student.city || "N/A"}</p>
        <p><b>District:</b> ${student.district || "N/A"}</p>
        <p><b>School Name:</b> ${student.schoolName || "N/A"}</p>
        <p><b>Standard:</b> ${student.standardId?.standard || "N/A"}</p>
        ${
          student.stream
            ? `<p><b>Stream:</b> ${student.stream}</p>`
            : `<p><b>Stream:</b> -</p>`
        }
        <p><b>Gender:</b> ${student.gender || "N/A"}</p>
        <p><b>Cast:</b> ${student.cast || "N/A"}</p>
        <p><b>Category:</b> ${student.category || "N/A"}</p>
        <p><b>Contact:</b> ${student.contactNumber || "N/A"}</p>
        <p><b>WhatsApp:</b> ${student.whatsappNumber || "N/A"}</p>
        <p><b>Registered On:</b> ${
          student.createdAt
            ? new Date(student.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })
            : "N/A"
        }</p>
      </div>
    `,
      confirmButtonColor: "#2563eb",
    });
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    const { value: password } = await Swal.fire({
      title: "Enter Delete Password",
      input: "password",
      inputLabel: "This action requires admin delete password",
      inputPlaceholder: "Enter delete password",
      inputAttributes: { autocapitalize: "off", autocorrect: "off" },
      showCancelButton: true,
      confirmButtonText: "Verify",
    });

    if (!password) return;

    try {
      setLoading(true);
      const verifyRes = await axios.post(
        `${base}/admin/verify-additional-password`,
        { password }
      );
      if (!verifyRes.data.success) {
        Swal.fire("Denied", "Invalid delete password!", "error");
        return;
      }

      const confirm = await Swal.fire({
        title: "Are you sure?",
        text: "This student record will be deleted permanently!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete!",
      });

      if (!confirm.isConfirmed) return;

      await axios.delete(`${base}/students/${id}/hard`);
      Swal.fire("Deleted!", "Student record has been deleted.", "success");
      fetchStudents();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to verify or delete student", "error");
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete: all students of a selected standard + their papers/test history
  const handleDeleteStudentData = () => {
    if (!standardToDelete) return;
    const std = allStandards.find((s) => s._id === standardToDelete);
    const label = std ? `Standard ${std.standard}` : "the selected standard";

    deleteWithPassword({
      base,
      deleteUrl: `${base}/students/by-standard/${standardToDelete}/hard`,
      fetchCallback: () => {
        fetchStudents();
        setDeleteDataModalOpen(false);
        setStandardToDelete("");
      },
      itemName: `all students of ${label} (their generated papers, test history & related data)`,
    });
  };

  // EXPORTS
  // 1) Server CSV stream (efficient) — opens new tab to trigger streaming download
  const downloadCSV = () => {
    const params = buildParams();
    params.format = "csv";
    const qs = new URLSearchParams(params).toString();
    const url = `${base}/students/export?${qs}`;
    window.open(url, "_blank");
  };

  // 2) PDF export: request JSON from server then build PDF client-side
  const downloadPDF = async () => {
    const params = buildParams();
    params.format = "json";

    Swal.fire({
      title: "Preparing PDF...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await axios.get(`${base}/students/export`, {
        params,
        responseType: "json",
      });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) {
        Swal.fire("No data", "No students to export", "info");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "A4",
      });
      doc.setFontSize(14);
      doc.text("Student List", 40, 40);

      const tableColumn = [
        "#",
        "Full Name",
        "Username",
        "City",
        "District",
        "School Name",
        "Standard",
        "Stream",
        "Gender",
        "Cast",
        "Category",
        "Contact Number",
        "WhatsApp Number",
      ];

      const tableRows = data.map((s, i) => [
        i + 1,
        s.fullName || "N/A",
        s.username || "N/A",
        s.city || "N/A",
        s.district || "N/A",
        s.schoolName || "N/A",
        s.standardId?.standard || "N/A",
        s.stream || "-",
        s.gender || "N/A",
        s.cast || "N/A",
        s.category || "N/A",
        s.contactNumber || "N/A",
        s.whatsappNumber || "N/A",
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 4 },
        margin: { top: 50, bottom: 30 },
      });

      doc.save("STUDENTS.pdf");
    } catch (err) {
      console.error("PDF export failed", err);
      Swal.fire("Error", "PDF export failed", "error");
    } finally {
      Swal.close();
    }
  };

  // 3) Excel (XLSX) — fetch JSON from server then convert to XLSX client-side.
  // NOTE: for very large datasets prefer server-side Excel generation (exceljs + background job).
  const downloadExcel = async () => {
    const params = buildParams();
    params.format = "json";

    const proceed = await Swal.fire({
      title: "Download Excel?",
      text: "This will fetch all matching students from server. For very large exports this may take time. Continue?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, download",
    });
    if (!proceed.isConfirmed) return;

    Swal.fire({
      title: "Preparing Excel...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await axios.get(`${base}/students/export`, {
        params,
        responseType: "json",
      });
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) {
        Swal.fire("No data", "No students to export", "info");
        return;
      }

      const wsData = data.map((s, i) => ({
        "#": i + 1,
        "Full Name": s.fullName || "N/A",
        Username: s.username || "N/A",
        City: s.city || "N/A",
        District: s.district || "N/A",
        "School Name": s.schoolName || "N/A",
        Standard: s.standardId?.standard || "N/A",
        Stream: s.stream || "-",
        Gender: s.gender || "N/A",
        Cast: s.cast || "N/A",
        Category: s.category || "N/A",
        "Contact Number": s.contactNumber || "N/A",
        "WhatsApp Number": s.whatsappNumber || "N/A",
        "Registered On": s.createdAt
          ? new Date(s.createdAt).toLocaleString("en-IN")
          : "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(wsData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      // auto width
      const columnWidths = Object.keys(wsData[0] || {}).map((key) => ({
        wch: Math.max(key.length + 2, 15),
      }));
      worksheet["!cols"] = columnWidths;

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "STUDENTS.xlsx");
    } catch (err) {
      console.error("Excel export failed", err);
      Swal.fire("Error", "Excel export failed", "error");
    } finally {
      Swal.close();
    }
  };

  if (loading) return <Loader />;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">
          Manage Students
        </h1>

        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={downloadPDF}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all bg-red-100 hover:bg-red-200 text-red-700`}
          >
            PDF
          </button>

          <button
            onClick={downloadExcel}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all bg-green-100 hover:bg-green-200 text-green-700`}
          >
            Excel
          </button>

          <button
            onClick={() => {
              setSelectedStudent(null);
              setEditModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
          >
            <UserPlus size={18} />
            <span>Add Student</span>
          </button>

          <button
            onClick={() => setDeleteDataModalOpen(true)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
          >
            <AlertTriangle size={18} />
            <span>Delete Student Data</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg transition-all"
          >
            <Filter size={18} />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {/* Collapsible Filters */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showFilters ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              {Object.keys(searchOptions).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchOptions[key]}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      setSearchOptions(
                        searchKeys.reduce((acc, k) => {
                          acc[k] = k === key ? checked : false;
                          return acc;
                        }, {})
                      );
                    }}
                    className="accent-indigo-600"
                  />
                  Search by {key === "schoolName" ? "school" : key}
                </label>
              ))}
            </div>

            <div className="flex flex-wrap p-2 gap-3">
              <select
                value={filterStandard}
                onChange={(e) => setFilterStandard(e.target.value)}
                className="border cursor-pointer border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Standards</option>
                {[...new Set(students.map((s) => s.standardId?.standard))].map(
                  (std) =>
                    std && (
                      <option key={std} value={std}>
                        {std}
                      </option>
                    )
                )}
              </select>

              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="border cursor-pointer border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 🧾 Student Table */}
      {students.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg text-gray-500 text-lg shadow-sm">
          No students found.
        </div>
      ) : (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-indigo-100">
                <tr className="text-left">
                  <th className="p-3">#</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">City</th>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Standard</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr
                    key={student._id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-3">{(page - 1) * limit + index + 1}</td>
                    <td className="p-3">{student.fullName || "N/A"}</td>
                    <td className="p-3">{student.city || "N/A"}</td>
                    <td className="p-3">{student.schoolName || "N/A"}</td>
                    <td className="p-3">
                      {student.standardId?.standard || "N/A"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleView(student)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-green-600 hover:text-green-800"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden grid grid-cols-1 gap-3">
            {students.map((student) => (
              <div
                key={student._id}
                className="border p-3 rounded-lg shadow-sm bg-white flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    {student.fullName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {student.city} • {student.schoolName}
                  </p>
                  <p className="text-sm">
                    <b>Standard:</b> {student.standardId?.standard || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <button
                    onClick={() => handleView(student)}
                    className="text-blue-600 hover:text-blue-800 transition"
                    title="View"
                  >
                    <Eye size={22} />
                  </button>
                  <button
                    onClick={() => handleEdit(student)}
                    className="text-green-600 hover:text-green-800 transition"
                    title="Edit"
                  >
                    <Edit size={22} />
                  </button>
                  <button
                    onClick={() => handleDelete(student._id)}
                    className="text-red-600 hover:text-red-800 transition"
                    title="Delete"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Responsive Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Showing text */}
        <div className="text-sm text-gray-700 text-center sm:text-left">
          Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of{" "}
          {total}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col xs:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Buttons + Page Number (scrollable on mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full xs:w-auto py-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded whitespace-nowrap disabled:opacity-50"
            >
              Prev
            </button>

            <span className="px-3 py-1 whitespace-nowrap text-gray-700">
              Page {page}
            </span>

            <button
              onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
              disabled={page * limit >= total}
              className="px-3 py-1 border rounded whitespace-nowrap disabled:opacity-50"
            >
              Next
            </button>
          </div>

          {/* Limit Selector */}
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="border rounded px-3 py-1 text-sm w-full xs:w-auto"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence>
        {editModalOpen && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          >
            <motion.div
              key="content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative bg-white rounded-2xl shadow-lg w-[90%] sm:w-[600px] max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setEditModalOpen(false)}
                className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <StudentForm
                editingStudent={selectedStudent}
                onClose={() => setEditModalOpen(false)}
                onSave={() => {
                  setEditModalOpen(false);
                  fetchStudents();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteDataModalOpen && (
          <motion.div
            key="delete-data-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          >
            <motion.div
              key="delete-data-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative bg-white rounded-2xl shadow-lg w-[90%] sm:w-[480px] p-6"
            >
              <button
                onClick={() => {
                  setDeleteDataModalOpen(false);
                  setStandardToDelete("");
                }}
                className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>

              <h2 className="text-xl font-semibold text-red-600 flex items-center gap-2 mb-2">
                <AlertTriangle size={22} />
                Delete Student Data
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete{" "}
                <b>all students in the selected standard</b>, along with
                their generated papers, test history, and other related
                data. This action cannot be undone.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Standard
              </label>
              <select
                value={standardToDelete}
                onChange={(e) => setStandardToDelete(e.target.value)}
                className="w-full border cursor-pointer border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">-- Select Standard --</option>
                {allStandards.map((std) => (
                  <option key={std._id} value={std._id}>
                    Standard {std.standard}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setDeleteDataModalOpen(false);
                    setStandardToDelete("");
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudentData}
                  disabled={!standardToDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
