import React, { useState, useEffect } from "react";
import axios from "axios";
import StaffForm from "../../components/StaffForm";
import StatsCard from "../../components/StatsCard";
import {
  Users,
  GraduationCap,
  FileQuestion,
  BookOpen,
  Layers,
  Grid,
} from "lucide-react";

export default function AdminDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({
    staff: "N/A",
    students: "N/A",
    mcqs: "N/A",
    subjects: "N/A",
    categories: "N/A",
    standards: "N/A",
  });
  const [loading, setLoading] = useState(true);
  const base = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${base}/staff/getAllCounts`);
        if (res.data?.success && res.data?.data) {
          setStats(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Staff",
      value: stats.staff,
      icon: <Users size={28} />,
      color: "from-indigo-200 to-indigo-400",
    },
    {
      title: "Total Students",
      value: stats.students,
      icon: <GraduationCap size={28} />,
      color: "from-emerald-200 to-emerald-400",
    },
    {
      title: "Total MCQs",
      value: stats.mcqs,
      icon: <FileQuestion size={28} />,
      color: "from-rose-200 to-pink-400",
    },
    {
      title: "Total Subjects",
      value: stats.subjects,
      icon: <BookOpen size={28} />,
      color: "from-yellow-200 to-orange-300",
    },
    {
      title: "Total Categories",
      value: stats.categories,
      icon: <Layers size={28} />,
      color: "from-sky-200 to-cyan-300",
    },
    {
      title: "Total Standards",
      value: stats.standards,
      icon: <Grid size={28} />,
      color: "from-teal-200 to-green-300",
    },
  ];

  return (
    <div className="min-h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 tracking-tight">
            Welcome, Admin
          </h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-lg">
            Here’s an overview of your system statistics.
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-6 border border-green-200 shadow-sm">
          {success}
        </div>
      )}

      {showForm && (
        <StaffForm
          onClose={() => setShowForm(false)}
          onSuccess={(msg) => setSuccess(msg)}
        />
      )}

      {/* Statistics Section */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {statCards.map((stat, idx) => (
          <StatsCard key={idx} {...stat} loading={loading} />
        ))}
      </section>
    </div>
  );
}
