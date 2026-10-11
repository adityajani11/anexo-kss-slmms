import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Logo from "../assets/logo-trans.png";
import {
  LayoutDashboard,
  Users,
  LogOut,
  GraduationCap,
  FileQuestion,
  Layers,
  FolderOpen,
  X,
  EyeIcon,
  Settings,
} from "lucide-react";

export default function Sidebar({ panelType, onAddStaff, onClose }) {
  const navigate = useNavigate();
  const commonClasses =
    "flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer transition hover:bg-indigo-100 text-gray-700 hover:text-indigo-700";
  const activeClasses = "bg-indigo-100 text-indigo-700 font-semibold";

  // Logout handler
  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",
      background: "#fff",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        Swal.fire({
          title: "Logged out!",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        navigate("/");
      }
    });
  };

  const menuItems = {
    admin: [
      {
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
        to: "/admin/dashboard",
      },
      {
        label: "Manage Staff",
        icon: <Users size={18} />,
        to: "/admin/manage-staff",
      },
      {
        label: "Manage Student",
        icon: <GraduationCap size={18} />,
        to: "/admin/manage-student",
      },
      {
        label: "Manage MCQs",
        icon: <FileQuestion size={18} />,
        to: "/admin/manage-mcqs",
      },
      {
        label: "Manage Academics",
        icon: <FolderOpen size={18} />,
        to: "/admin/manage-academics",
      },
      {
        label: "Generated Papers",
        icon: <Layers size={18} />,
        to: "/admin/my-generated-papers",
      },
      {
        label: "Manage Materials",
        icon: <FolderOpen size={18} />,
        to: "/admin/manage-materials",
      },
      {
        label: "Settings",
        icon: <Settings size={18} />,
        to: "/admin/settings",
      },
    ],
    staff: [
      {
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
        to: "/staff/dashboard",
      },
      {
        label: "Manage Student",
        icon: <GraduationCap size={18} />,
        to: "/staff/manage-student",
      },
      {
        label: "Manage MCQs",
        icon: <FileQuestion size={18} />,
        to: "/staff/manage-mcqs",
      },
      {
        label: "Generated Papers",
        icon: <Layers size={18} />,
        to: "/staff/my-generated-papers",
      },
      {
        label: "Manage Materials",
        icon: <FolderOpen size={18} />,
        to: "/staff/manage-materials",
      },
      {
        label: "Change Password",
        icon: <EyeIcon size={18} />,
        to: "/staff/change-password",
      },
    ],
    student: [
      {
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
        to: "/student/dashboard",
      },
      {
        label: "View All MCQs",
        icon: <FileQuestion size={18} />,
        to: "/student/view-mcqs",
      },
      {
        label: "My Materials",
        icon: <FolderOpen size={18} />,
        to: "/student/my-materials",
      },
      {
        label: "My Generated Papers",
        icon: <Layers size={18} />,
        to: "/student/my-generated-papers",
      },
      {
        label: "Test History",
        icon: <Layers size={18} />,
        to: "/student/test-history",
      },
      {
        label: "Manage Profile",
        icon: <FolderOpen size={18} />,
        to: "/student/manage-profile",
      },
    ],
  };

  const items = menuItems[panelType] || [];

  return (
    <aside className="w-64 bg-white shadow-xl rounded-r-2xl p-5 flex flex-col h-screen overflow-y-auto sticky top-0">
      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:hidden text-gray-600 hover:text-indigo-700"
      >
        <X size={22} />
      </button>

      {/* Logo + School Name */}
      <div className="flex flex-col items-center gap-2 pt-2 border-b pb-4">
        <img src={Logo} alt="Logo" className="w-14 h-14 object-contain" />
        <p className="text-md font-semibold text-gray-600 text-center">
          Krishna School Group
        </p>
      </div>

      <nav className="flex flex-col gap-2 pt-4">
        {items.map((item, idx) =>
          item.to ? (
            <NavLink
              key={idx}
              to={item.to}
              className={({ isActive }) =>
                `${commonClasses} ${isActive ? activeClasses : ""}`
              }
              onClick={onClose} // auto-close sidebar on mobile after clicking
            >
              {item.icon}
              <span className="text-base font-medium">{item.label}</span>
            </NavLink>
          ) : (
            <div
              key={idx}
              onClick={item.action || (() => {})}
              className={commonClasses}
            >
              {item.icon}
              <span className="text-base font-medium">{item.label}</span>
            </div>
          )
        )}
      </nav>

      {/* Logout button at bottom */}
      <div className="border-t pt-4 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-3 rounded-lg cursor-pointer transition bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
