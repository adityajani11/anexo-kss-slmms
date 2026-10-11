import React, { useEffect, useState } from "react";

export default function PasswordModal({
  title,
  pass,
  setPass,
  confirm,
  setConfirm,
  show,
  setShow,
  onSubmit,
  onClose,
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation AFTER mount
    setTimeout(() => setAnimate(true), 10);
  }, []);

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center 
        bg-black/40 backdrop-blur-sm z-50 
        transition-opacity duration-300
        ${animate ? "opacity-100" : "opacity-0"}
      `}
    >
      <div
        className={`
          bg-white p-6 rounded-xl w-96 shadow-xl
          transform transition-all duration-300
          ${
            animate
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-3"
          }
        `}
      >
        <h2 className="text-xl font-semibold mb-4">{title}</h2>

        <div className="mb-3">
          <label className="font-medium">New Password:</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className="w-full p-2 border rounded"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <span
              className="absolute right-3 top-2 cursor-pointer"
              onClick={() => setShow(!show)}
            >
              {show ? "Hide" : "Show"}
            </span>
          </div>
        </div>

        <div className="mb-3">
          <label className="font-medium">Confirm Password:</label>
          <input
            type={show ? "text" : "password"}
            className="w-full p-2 border rounded"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded"
          >
            Close
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
