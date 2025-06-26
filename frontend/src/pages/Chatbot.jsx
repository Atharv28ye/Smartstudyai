import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

export default function Chatbot() {
  // --- MEMORY: Restore on mount ---
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatbot-messages");
    if (saved) {
      try {
        const restored = JSON.parse(saved);
        if (Array.isArray(restored) && restored.length > 0) return restored;
      } catch {}
    }
    return [{ sender: "bot", text: "👋 Hey! I'm SmartStudy Bot. How can I help you today?" }];
  });
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [contextText, setContextText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  // --- MEMORY: Save messages on change ---
  useEffect(() => {
    localStorage.setItem("chatbot-messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const userMessage = { sender: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setSuggestions([]);

    try {
      const res = await axios.post("http://localhost:5000/chat", {
        message: text,
        context: contextText,
      });

      const botMessage = {
        sender: "bot",
        text: res.data.reply || "❌ Sorry, I couldn't understand that.",
      };
      setMessages((prev) => [...prev, botMessage]);
      setSuggestions(res.data.followups || []);
    } catch {
      setMessages((prev) => [...prev, { sender: "bot", text: "❌ Error connecting to SmartStudy AI." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile || !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(uploadedFile.type)) {
      alert("Please upload a valid PDF or DOCX file.");
      return;
    }

    setFile(uploadedFile);
    setMessages((prev) => [...prev, { sender: "user", text: `📤 Uploaded file: ${uploadedFile.name}` }]);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const res = await axios.post("http://localhost:5000/upload-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const extractedText = res.data.text || "";
      setContextText(extractedText);
      setMessages((prev) => [...prev, { sender: "bot", text: "📚 File uploaded. I’ll use this to answer your questions." }]);
    } catch {
      setMessages((prev) => [...prev, { sender: "bot", text: "❌ Failed to extract text from file." }]);
    }
  };

  const exportChat = (format) => {
    const clean = (str) =>
      str
        .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
        .replace(/\s+/g, " ") // Normalize spacing
        .trim();

    const chatText = messages
      .map((msg) => `${msg.sender === "user" ? "You" : "Bot"}: ${clean(msg.text)}`)
      .join("\n\n");

    if (format === "txt") {
      const blob = new Blob([chatText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "chat.txt";
      link.href = url;
      link.click();
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFont("helvetica", ""); // Default safe font
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(chatText, 180);
      doc.text(lines, 10, 10);
      doc.save("chat.pdf");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-100 p-6 flex flex-col">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 max-w-3xl w-full mx-auto flex flex-col bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl"
      >
        <h1 className="text-3xl font-extrabold text-center text-purple-600 mb-4">
          🤖 SmartStudy Chatbot
        </h1>

        <div className="flex-1 overflow-y-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-xl text-sm relative shadow-md ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  <ReactMarkdown
                    children={msg.text}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline" />,
                      p: (props) => <p {...props} className="prose max-w-none" />,
                      code: ({ inline, children, ...props }) => (
                        <code
                          {...props}
                          className={`${
                            inline
                              ? "bg-gray-200 rounded px-1"
                              : "block p-2 my-2 bg-gray-100 rounded overflow-x-auto"
                          }`}
                        >
                          {children}
                        </code>
                      ),
                    }}
                  />
                  {msg.sender === "bot" && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        alert("✅ Copied to clipboard!");
                      }}
                      className="absolute top-0 right-1 text-xs text-blue-500 px-1 hover:underline"
                    >
                      📋
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
                <div className="bg-white px-4 py-2 rounded-xl text-sm flex space-x-1 animate-pulse">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />

          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">💡 Suggested Follow-Ups:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.replace(/^\d+\.\s*/, ""))}
                    className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition"
                  >
                    {s.replace(/^\d+\.\s*/, "")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => exportChat("pdf")}
            className="bg-green-500 text-white px-4 py-2 rounded-full shadow hover:bg-green-600 transition"
          >
            ⬇️ PDF
          </button>
          <button
            onClick={() => exportChat("txt")}
            className="bg-yellow-400 text-white px-4 py-2 rounded-full shadow hover:bg-yellow-500 transition"
          >
            ⬇️ TXT
          </button>
        </div>
      </motion.div>

      <div className="mt-4 max-w-3xl w-full mx-auto flex flex-col sm:flex-row gap-2">
        <label className="flex items-center justify-center px-4 py-2 bg-purple-100 text-sm text-purple-700 rounded-lg cursor-pointer hover:bg-purple-200 transition">
          📎 Upload
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
        </label>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your message... (Shift+Enter for newline)"
          className="flex-1 p-3 border border-gray-300 bg-white text-black rounded-lg"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}