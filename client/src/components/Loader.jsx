import React from "react";

export default function Loader({ message = "Loading…" }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/25 z-50">
      <div className="flex flex-col items-center gap-3 bg-white/95 p-4 rounded-lg shadow-md">
        <svg
          width="40"
          height="40"
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#6366f1"
            d="M25 5A20 20 0 1 0 45 25"
            stroke="#c7d2fe"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="25" cy="5" r="3" fill="#6366f1">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 25 25"
              to="360 25 25"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        <div className="text-gray-900 text-sm">{message}</div>
      </div>
    </div>
  );
}
