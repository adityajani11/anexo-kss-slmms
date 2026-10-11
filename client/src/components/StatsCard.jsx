import React from "react";

export default function StatsCard({ title, value, icon, color, loading }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${color} text-gray-800 rounded-2xl shadow-md p-6 flex items-center justify-between group transition-all duration-500`}
    >
      {/* White wipe hover effect */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/30 transition-all duration-500 ease-out"></div>

      <div className="relative z-10">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-600">
          {title}
        </p>
        <h2 className="text-4xl font-bold mt-1 text-gray-900">
          {loading ? (
            <span className="animate-pulse text-gray-500">...</span>
          ) : (
            value
          )}
        </h2>
      </div>

      <div className="relative z-10 opacity-80">{icon}</div>
    </div>
  );
}
