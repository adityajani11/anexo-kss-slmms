const fs = require("fs");
const path = require("path");
const katex = require("katex");

function buildHTML(mcqs, pdfHeading = "", includeAnswers, includeExplanations) {
  const katexCSS = fs.readFileSync(
    require.resolve("katex/dist/katex.min.css"),
    "utf8"
  );

  const nilkanthFontPath = path.join(__dirname, "../fonts/Nilkanth.ttf");
  const nilkanthFontBase64 = fs
    .readFileSync(nilkanthFontPath)
    .toString("base64");

  const safeHeading = pdfHeading?.trim() || "";

  function buildS3ImageURL(key) {
    if (!key) return null;

    const clean = String(key).replace(/\\/g, "/").trim();
    if (!clean || clean === "null" || clean === "undefined") return null;

    const base = process.env.BASE_URL || "http://localhost:5000/api/v1";
    return `${base}/mcqs/image?key=${encodeURIComponent(clean)}`;
  }

  const header = `
  <!DOCTYPE html>
  <html lang="gu">
  <head>
    <meta charset="UTF-8" />
    <title>${safeHeading}</title>
    <style>
      @font-face {
        font-family: 'Nilkanth';
        src: url(data:font/truetype;charset=utf-8;base64,${nilkanthFontBase64}) format('truetype');
      }

      @page {
       margin: 12mm;
      }

      .footer {
        position: fixed;
        bottom: 10px;
        right: 20px;
        font-size: 12px;
        color: #444;
      }

      body {
        font-family: sans-serif;
        line-height: 1.6;
        color: #000;
        font-size: 14px;
        margin: 20px 30px;
        position: relative;
      }

      body::before {
        content: "KRISHNA SCHOOL GROUP";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 60px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.08);
        z-index: -2;
        white-space: nowrap;
        pointer-events: none;
      }

      body::after {
        content: "";
        position: fixed;
        top: 0px;
        bottom: 0px;
        left: 0px;
        right: 0px;
        border: 2px solid #444;
        z-index: -1;
        pointer-events: none;
      }

      .guj {
	font-family: 'Nilkanth' !important;
	font-weight: normal;
	font-style: normal;
	}
      .latin { font-family: sans-serif; }

      .header {
        text-align: center;
        margin-bottom: 25px;
      }

      .school-name {
        font-weight: bold;
        font-size: 20px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #111;
      }

      .pdf-heading {
        font-size: 16px;
        font-weight: 600;
        margin-top: 4px;
        color: #333;
      }

      .divider {
        width: 100%;
        height: 1px;
        background: #222;
        margin: 8px auto 12px auto;
      }

      .columns {
        column-count: 2;
        column-gap: 40px;
        column-rule: 2px solid #ccc;
        column-fill: auto;
      }

      .mcq { break-inside: avoid; margin-bottom: 18px; padding-bottom: 8px; }
      .q { font-weight: 500; margin-bottom: 5px; }

      .mcq-img {
        display: block;
        max-width: 80%;
        height: auto;
        margin: 8px auto 12px auto;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      .opts { margin-left: 20px; margin-top: 2px; }
      .opt { margin: 2px 0; }

      .opt-img {
        display: block;
        max-width: 70%;
        height: auto;
        margin-top: 4px;
        margin-left: 25px;
        border: 1px solid #ccc;
        border-radius: 3px;
      }

      .ans { color: green; font-style: italic; margin-top: 3px; }
      .exp { margin-top: 5px; }

      ${katexCSS}
    </style>
  </head>
  <body>
    <div class="header">
      <div class="school-name">KRISHNA SCHOOL GROUP</div>
      <div class="divider"></div>
      <div class="pdf-heading">${wrapGujarati(safeHeading)}</div>
    </div>

    <div class="columns">
  `;

  let content = "";

  mcqs.forEach((mcq, i) => {
    const q = wrapGujarati(renderKaTeXInline(mcq.question.text || ""));

    // Build full image URL for question image
    let qImage = buildS3ImageURL(mcq.question?.image);

    const qImageTag = qImage
      ? `<img src="${qImage}" class="mcq-img" alt="MCQ Image" />`
      : "";

    const opts = mcq.options
      .map((o, idx) => {
        const optText = wrapGujarati(renderKaTeXInline(o.label || ""));
        let optImage = buildS3ImageURL(o.image);

        const optImgTag = optImage
          ? `<img src="${optImage}" class="opt-img" alt="Option Image" />`
          : "";

        return `<div class="opt"><span class="latin">(${String.fromCharCode(
          65 + idx
        )})</span> ${optText} ${optImgTag}</div>`;
      })
      .join("");

    // Answer & Explanation (conditionally rendered)
    let answerBlock = "";
    if (includeAnswers === true) {
      const ansIdx = mcq.options.findIndex((o) => o.isCorrect);
      const ansLetter = ansIdx >= 0 ? String.fromCharCode(65 + ansIdx) : "?";
      answerBlock += `<div class="ans"><span class="latin">Ans: ${ansLetter}</span></div>`;
    }

    let explanationBlock = "";
    if (includeExplanations === true && mcq.explanation) {
      const exp = wrapGujarati(renderKaTeXInline(mcq.explanation));
      explanationBlock = `<div class="exp"><b class="guj">સમજૂતી:</b> ${exp}</div>`;
    }

    content += `
      <div class="mcq">
        <div class="q"><b>${i + 1}.</b> ${q}</div>
        ${qImageTag}
        <div class="opts">${opts}</div>
        ${answerBlock}
        ${explanationBlock}
      </div>
    `;
  });

  return header + content + "</div></body></html>";
}

/* ---------- KaTeX Inline Renderer ---------- */
function renderKaTeXInline(text) {
  return text.replace(/\$([^$]+)\$/g, (match, math) => {
    try {
      return katex.renderToString(math.trim(), {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      return match;
    }
  });
}

/* ---------- Gujarati Text Wrapper ---------- */
function wrapGujarati(text) {
  return text.replace(/([\u0A80-\u0AFF]+)/g, "<span class='guj'>$1</span>");
}

module.exports = { buildHTML, wrapGujarati, renderKaTeXInline };
