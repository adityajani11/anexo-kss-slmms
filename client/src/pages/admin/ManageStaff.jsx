import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Swal from "sweetalert2";
import Loader from "../../components/Loader";
import { Eye, Edit, Trash2, UserPlus, Search, Power } from "lucide-react";
import StaffForm from "../../components/StaffForm";

export default function ManageStaff() {
  const [staffList, setStaffList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");
  const base = import.meta.env.VITE_API_BASE_URL;

  // Fetch staff data
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${base}/staff/`);
      const data =
        Array.isArray(res.data?.data?.items) && res.data?.data?.items.length
          ? res.data.data.items
          : [];
      setStaffList(data);
      setFilteredList(data);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      Swal.fire("Error", "Unable to load staff data.", "error");
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    document.body.style.overflow = editData ? "hidden" : "auto";
  }, [editData]);

  // Search filter
  useEffect(() => {
    const query = search.toLowerCase();
    const filtered = staffList.filter(
      (s) =>
        s.username?.toLowerCase().includes(query) ||
        s.contactNumber?.toString().includes(query)
    );
    setFilteredList(filtered);
  }, [search, staffList]);

  // Handlers
  const handleView = (staff) => {
    const infoHtml = `
      <div style="text-align:left;line-height:1.7;">
        <p><b>Full Name:</b> ${staff.fullName || "-"}</p>
        <p><b>Email:</b> ${staff.email || "-"}</p>
        <p><b>Gender:</b> ${staff.gender || "-"}</p>
        <p><b>Role:</b> ${staff.role || "-"}</p>
        <p><b>Notes:</b> ${staff.notes || "-"}</p>
        <p><b>Disabled:</b> ${staff.isDisabled ? "Yes" : "No"}</p>
        <p><b>Created At:</b> ${
          staff.createdAt
            ? new Date(staff.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })
            : "-"
        }</p>
        <p><b>Updated At:</b> ${
          staff.updatedAt
            ? new Date(staff.updatedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })
            : "-"
        }</p>
      </div>
    `;
    Swal.fire({
      title: `<strong>${staff.username || "Staff Details"}</strong>`,
      html: infoHtml,
      icon: "info",
      confirmButtonText: "Close",
      customClass: { popup: "rounded-2xl shadow-lg" },
    });
  };

  const handleDelete = async (id) => {
    // 1. Initial confirmation
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This action will permanently delete the staff record. You will need to enter your administrative password to proceed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e3342f",
    });

    if (confirm.isConfirmed) {
      // 2. Prompt for password
      const { value: password } = await Swal.fire({
        title: "Enter Password",
        input: "password",
        inputLabel: "Administrative Password",
        inputPlaceholder: "Enter your password to authorize deletion",
        inputAttributes: {
          maxlength: 50,
          autocapitalize: "off",
          autocorrect: "off",
        },
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Verify & Delete",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        customClass: {
          popup: "rounded-2xl shadow-lg",
        },
        inputValidator: (value) => {
          if (!value) {
            return "You need to enter a password to proceed!";
          }
        },
      });

      if (password) {
        try {
          // 3. Verify the password
          Swal.fire({
            title: "Verifying Password...",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          // Staff password check API
          const verifyRes = await axios.post(
            `${base}/admin/verify-additional-password`,
            { password }
          );

          if (verifyRes.data?.success) {
            // Password verified successfully, proceed to deletion
            Swal.fire({
              title: "Deleting Staff...",
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              },
            });

            // 4. Delete the staff record
            await axios.delete(`${base}/staff/${id}`);

            Swal.fire("Deleted!", "Staff record has been removed.", "success");
            fetchStaff();
          } else {
            // Should not happen if API throws error for failure, but as a fallback
            Swal.fire(
              "Verification Failed",
              "Incorrect password provided.",
              "error"
            );
          }
        } catch (err) {
          console.error("Deletion/Verification error:", err);

          // Handle specific API error message if available, otherwise general error
          const errorMsg =
            err.response?.data?.message ||
            "Failed to verify password or delete staff.";

          Swal.fire("Error", errorMsg, "error");
        }
      } else if (password === "") {
        // User closed the second prompt or didn't enter anything
        Swal.fire("Cancelled", "Staff deletion cancelled.", "info");
      }
    }
  };

  const handleEditSuccess = (msg) => {
    Swal.fire("Success", msg, "success");
    setEditData(null);
    fetchStaff();
  };

  const handleToggleDisable = async (staff) => {
    const action = staff.isDisabled ? "enable" : "disable";

    const confirm = await Swal.fire({
      title: `Are you sure you want to ${action} this user?`,
      text: `This will ${
        action === "disable" ? "restrict" : "allow"
      } their access.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${action} it!`,
      cancelButtonText: "Cancel",
      confirmButtonColor: action === "disable" ? "#e3342f" : "#16a34a",
    });

    if (confirm.isConfirmed) {
      try {
        await axios.patch(`${base}/staff/${staff._id}/toggle-disable`);
        Swal.fire(
          "Updated!",
          `Staff has been ${action === "disable" ? "disabled" : "enabled"}.`,
          "success"
        );
        fetchStaff();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to update staff status.", "error");
      }
    }
  };

  return (
    <div className="min-h-auto px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">
          Manage Staff
        </h1>
        <button
          onClick={() => setEditData({})}
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-all"
        >
          <UserPlus size={18} />
          <span>Add Staff</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center bg-white rounded-xl shadow-sm border px-3 py-2 mb-6 w-full sm:w-1/2">
        <Search className="text-gray-400 mr-2" size={18} />
        <input
          type="text"
          placeholder="Search by username or contact number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full outline-none bg-transparent text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Loader / No Data */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 py-20 text-center text-gray-500">
          No staff records found.
        </div>
      ) : (
        <>
          {/* Table for md+ screens */}
          <div className="hidden sm:block bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-transparent py-4 px-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                Staff Directory
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700 border-collapse">
                <thead className="bg-gray-100 text-gray-800 font-medium">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">#</th>
                    <th className="px-6 py-3 text-left whitespace-nowrap">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left whitespace-nowrap">
                      E-mail
                    </th>
                    <th className="px-6 py-3 text-left whitespace-nowrap">
                      Contact Number
                    </th>
                    <th className="px-6 py-3 text-center whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((staff, idx) => (
                    <tr
                      key={staff._id || idx}
                      className={`border-t transition-colors ${
                        staff.isDisabled ? "bg-red-50" : "hover:bg-indigo-50/40"
                      }`}
                    >
                      <td className="px-6 py-4">{idx + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {staff.username || "-"}
                      </td>
                      <td className="px-6 py-4 break-words max-w-[200px]">
                        {staff.email || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {staff.contactNumber || "-"}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-4 text-gray-600">
                        <button
                          onClick={() => handleView(staff)}
                          className="hover:text-indigo-600 transition-colors"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => setEditData(staff)}
                          className="hover:text-green-600 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(staff._id)}
                          className="hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleDisable(staff)}
                          className={`hover:text-${
                            staff.isDisabled ? "green" : "yellow"
                          }-600 transition-colors`}
                          title={
                            staff.isDisabled ? "Enable User" : "Disable User"
                          }
                        >
                          <Power size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card layout for sm and below */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filteredList.map((staff, idx) => (
              <div
                key={staff._id || idx}
                className={`rounded-xl shadow-md border p-4 transition-all ${
                  staff.isDisabled
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {staff.username}
                    </p>
                    <p className="text-sm text-gray-600">
                      <b>Email:</b> {staff.email || "-"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <b>Contact:</b> {staff.contactNumber || "-"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-gray-600">
                    <button
                      onClick={() => handleView(staff)}
                      className="hover:text-indigo-600"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => setEditData(staff)}
                      className="hover:text-green-600"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(staff._id)}
                      className="hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleDisable(staff)}
                      className={`hover:text-${
                        staff.isDisabled ? "green" : "yellow"
                      }-600 transition-colors`}
                      title={staff.isDisabled ? "Enable User" : "Disable User"}
                    >
                      <Power size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Form */}
      <AnimatePresence>
        {editData && (
          <motion.div
            key="staffModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          >
            <motion.div
              key="staffForm"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative bg-white rounded-2xl shadow-lg w-[90%] sm:w-[600px] max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setEditData(null)}
                className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <StaffForm
                existingData={editData}
                onClose={() => setEditData(null)}
                onSuccess={handleEditSuccess}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
