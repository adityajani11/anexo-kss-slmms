import React, { useEffect, useRef, useState } from "react";
import "mathlive";

export default function MathEditor({ value, onChange }) {
  const ref = useRef(null);
  const [mode, setMode] = useState("text"); // "text" or "math"

  useEffect(() => {
    const el = ref.current;

    const baseOptions = {
      smartFence: false,
      removeExtraneousSpaces: false,
      letterShapeStyle: "upright",
    };

    if (mode === "math") {
      el.setOptions({
        ...baseOptions,
        defaultMode: "math",
        smartMode: true,
      });
    } else {
      el.setOptions({
        ...baseOptions,
        defaultMode: "text",
        smartMode: false,
      });
    }

    // Always update the value on input
    const handleInput = () => {
      const content = mode === "math" ? el.getValue("latex") : el.value; // ensure LaTeX in math mode
      onChange(content);
    };
    el.addEventListener("input", handleInput);

    return () => el.removeEventListener("input", handleInput);
  }, [mode, onChange]);

  const insertSymbol = (cmd) => {
    const el = ref.current;
    if (!el) return;
    if (mode === "math") {
      // For math mode, insert LaTeX command
      el.executeCommand("insert", cmd);
    } else {
      // In text mode, insert literal visible symbol or command text
      el.executeCommand("insert", cmd.replace(/\\/g, ""));
    }
    el.focus();
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "math" ? "text" : "math"))}
          className={`px-3 py-1 rounded text-sm font-medium border ${
            mode === "math"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-gray-100 text-gray-800 border-gray-400"
          }`}
        >
          {mode === "math" ? "Math Mode (LaTeX)" : "Text Mode"}
        </button>

        <span className="text-xs text-gray-500">
          {mode === "math"
            ? "Type LaTeX commands, e.g. \\alpha, 10^{\\circ}"
            : "Type Gujarati / English text"}
        </span>
      </div>

      {/* Editable Math Field */}
      <math-field
        ref={ref}
        default-mode={mode}
        style={{
          width: "100%",
          minHeight: "80px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px",
          background: "white",
          fontSize: "18px",
          "--selection-background-color": "transparent",
          "--highlight-background-color": "transparent",
          "--mathlive-selection-background-color": "transparent",
          "--mathlive-suggestion-background-color": "transparent",
          "--caret-color": "#111",
        }}
        spellCheck="false"
      >
        {value}
      </math-field>
    </div>
  );
}
