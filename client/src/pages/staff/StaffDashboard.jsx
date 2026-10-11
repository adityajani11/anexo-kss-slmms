import React, { useState, useEffect } from "react";
import axios from "axios";
import StatsCard from "../../components/StatsCard";
import {
  GraduationCap,
  FileQuestion,
  BookOpen,
  Layers,
  Grid,
} from "lucide-react";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
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

  const staffUser = localStorage.getItem("user");
  const staffUserName = staffUser ? JSON.parse(staffUser)?.fullName : "Staff";

  return (
    <div className="min-h-fit">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 tracking-tight">
            Welcome, {staffUserName?.toString()?.toUpperCase()}!
          </h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-lg">
            Here’s an overview of your academic statistics.
          </p>
        </div>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {statCards.map((stat, idx) => (
          <StatsCard key={idx} {...stat} loading={loading} />
        ))}
      </section>
    </div>
  );
}
