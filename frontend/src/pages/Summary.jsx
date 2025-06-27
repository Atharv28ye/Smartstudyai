import { useState, useEffect } from "react";
import api from "../api/axios";
import jsPDF from "jspdf";

export default function Summary() {
  // --- MEMORY: Restore on mount ---
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState(() => {
    const saved = localStorage.getItem("summary-state");
    if (saved) {
      try {
        const { textInput } = JSON.parse(saved);
        return textInput || "";
      } catch {}
    }
    return "";
  });
  const [style, setStyle] = useState(() => {
    const saved = localStorage.getItem("summary-state");
    if (saved) {
      try {
        const { style } = JSON.parse(saved);
        return style || "concise";
      } catch {}
    }
    return "concise";
  });
  const [summary, setSummary] = useState(() => {
    const saved = localStorage.getItem("summary-state");
    if (saved) {
      try {
        const { summary } = JSON.parse(saved);
        return summary || "";
      } catch {}
    }
    return "";
  });
  const [loading, setLoading] = useState(false);

  // --- MEMORY: Save on change ---
  useEffect(() => {
    localStorage.setItem(
      "summary-state",
      JSON.stringify({ textInput, style, summary })
    );
  }, [textInput, style, summary]);

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (
      !uploadedFile ||
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(uploadedFile.type)
    ) {
      alert("Please upload a valid PDF or DOCX file.");
      return;
    }
    setFile(uploadedFile);
    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const res = await api.post("/upload-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTextInput(res.data.text || "");
    } catch {
      alert("Failed to extract text from file.");
    }
  };

  const handleGenerateSummary = async () => {
    if (!textInput.trim()) return alert("Please enter or upload text.");
    setLoading(true);
    try {
      const res = await api.post("/generate-summary", {
        text: textInput,
        style,
      });
      setSummary(res.data.summary || "No summary received.");
    } catch (err) {
  console.error("Summary error:", err);
  alert("Failed to generate summary.");
}
 finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const maxLineWidth = pageWidth - margin * 2;

    // Split text to fit the page width
    const lines = doc.splitTextToSize(summary, maxLineWidth);

    let y = 20; // vertical start

    lines.forEach((line) => {
      doc.text(margin, y, line);
      y += 10; // line height
    });

    doc.save("summary.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-violet-50 to-sky-100 p-6 flex items-center justify-center relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-rose-300 opacity-20 blur-2xl rounded-full animate-ping" />
        <div className="absolute bottom-10 right-1/3 w-[250px] h-[250px] bg-purple-200 opacity-30 blur-2xl rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-[60%] w-[250px] h-[250px] bg-sky-200 opacity-25 blur-2xl rounded-full animate-float" />
      </div>

      {/* Form Card */}
      <div className="w-full max-w-3xl bg-violet-100/70 backdrop-blur-md rounded-xl shadow-xl p-8 ...">
        <h1 className="text-3xl font-bold text-purple-700 text-center mb-2">
          📄 AI Text Summarizer
        </h1>

        {/* File Upload */}
        <label className="block cursor-pointer bg-purple-50 hover:bg-purple-100 border border-dashed border-purple-300 text-purple-600 text-center p-4 rounded-lg transition">
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? `📎 ${file.name}` : "Click or drag a .pdf or .docx file here"}
        </label>

        {/* Textarea */}
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="w-full h-40 p-4 rounded-md border border-purple-200 bg-white focus:outline-none placeholder-purple-300"
          placeholder="Or paste text here..."
        />

        {/* Style Dropdown */}
        <div>
          <label className="text-purple-600 font-medium">
            Select Summarization Style
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full mt-1 p-2 border border-purple-300 bg-white rounded-md"
          >
            <option value="concise">🧠 Concise</option>
            <option value="detailed">📚 Detailed</option>
            <option value="numbered">🔢 Numbered Points</option>
            <option value="simplified">🧒 Simplified</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateSummary}
          className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition"
        >
          {loading ? "Generating..." : "Generate Summary"}
        </button>

        {/* Output Summary */}
        {summary && (
          <div className="mt-6 bg-purple-50 border border-purple-200 p-4 rounded-md space-y-3">
            <h2 className="text-lg font-semibold text-purple-700">📝 Summary Output</h2>
            <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => navigator.clipboard.writeText(summary)}
                className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 text-sm"
              >
                📋 Copy
              </button>
              <button
                onClick={downloadPDF}
                className="bg-yellow-500 text-white px-4 py-1 rounded hover:bg-yellow-600 text-sm"
              >
                📥 Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}