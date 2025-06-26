import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";
import { Link } from "react-router-dom";

// Helper for shuffling an array
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Flashcards() {
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numCards, setNumCards] = useState(5);
  const [knownCards, setKnownCards] = useState([]);
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editHint, setEditHint] = useState("");
  const [editExplanation, setEditExplanation] = useState("");

  // --- MEMORY: Restore on mount ---
  useEffect(() => {
    const saved = localStorage.getItem("flashcards-state");
    if (saved) {
      try {
        const {
          cards,
          currentIdx,
          knownCards,
          numCards,
          textInput
        } = JSON.parse(saved);
        setCards(cards || []);
        setCurrentIdx(currentIdx || 0);
        setKnownCards(knownCards || []);
        setNumCards(numCards || 5);
        setTextInput(textInput || "");
      } catch (e) {
        // ignore errors
      }
    }
  }, []);

  // --- MEMORY: Save when state changes ---
  useEffect(() => {
    // Only save if cards exist
    if (cards.length > 0) {
      localStorage.setItem(
        "flashcards-state",
        JSON.stringify({
          cards,
          currentIdx,
          knownCards,
          numCards,
          textInput
        })
      );
    }
  }, [cards, currentIdx, knownCards, numCards, textInput]);

  // Handles file selection
  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    const isValid =
      uploadedFile &&
      [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ].includes(uploadedFile.type);

    if (!isValid) {
      alert("Please upload a valid PDF, DOCX, or TXT file.");
      return;
    }
    setFile(uploadedFile);
  };

  const handleTextInput = (e) => setTextInput(e.target.value);

  const handleGenerateFlashcards = async () => {
    if (!textInput.trim() && !file) {
      alert("Please provide some text or upload a file.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("text", textInput);
    formData.append("count", numCards);
    if (file) {
      formData.append("file", file);
    }

    try {
      const res = await api.post("/flashcards", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.flashcards && Array.isArray(res.data.flashcards)) {
        setCards(res.data.flashcards);
        setCurrentIdx(0);
        setShowAnswer(false);
        setKnownCards([]);
      } else {
        alert(res.data.error || "No flashcards generated.");
        setCards([]);
      }
    } catch (err) {
      alert(
        err.response?.data?.error ||
          err.message ||
          "Failed to generate flashcards."
      );
      setCards([]);
    }
    setLoading(false);
  };

  const handleFlip = () => setShowAnswer((prev) => !prev);

  // Auto Mark as Known on navigating away
  const markCurrentAsKnown = () => {
    if (!knownCards.includes(currentIdx)) {
      setKnownCards([...knownCards, currentIdx]);
    }
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (cards.length === 0) return;
    markCurrentAsKnown();
    setCurrentIdx((prev) => (prev + 1) % cards.length);
    setShowAnswer(false);
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (cards.length === 0) return;
    markCurrentAsKnown();
    setCurrentIdx((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
    setShowAnswer(false);
  };

  const handleShuffle = () => {
    const shuffled = shuffleArray(cards);
    setCards(shuffled);
    setCurrentIdx(0);
    setShowAnswer(false);
    setKnownCards([]);
  };

  // --- Add/Edit/Delete Logic ---
  const openAddEditModal = (idx = null) => {
    setEditIdx(idx);
    if (idx === null) {
      setEditQuestion("");
      setEditAnswer("");
      setEditHint("");
      setEditExplanation("");
    } else {
      const card = cards[idx];
      setEditQuestion(card.question || "");
      setEditAnswer(card.answer || "");
      setEditHint(card.hint || "");
      setEditExplanation(card.explanation || "");
    }
    setShowAddEdit(true);
  };

  const closeAddEditModal = () => {
    setShowAddEdit(false);
    setEditIdx(null);
  };

  const handleAddEditSubmit = (e) => {
    e.preventDefault();
    const newCard = {
      question: editQuestion,
      answer: editAnswer,
      hint: editHint,
      explanation: editExplanation,
    };
    let updatedCards;
    if (editIdx === null) {
      updatedCards = [...cards, newCard];
      setCards(updatedCards);
      setCurrentIdx(updatedCards.length - 1);
    } else {
      updatedCards = cards.map((c, idx) => (idx === editIdx ? newCard : c));
      setCards(updatedCards);
    }
    closeAddEditModal();
  };

  const handleDeleteCard = (idx) => {
    if (!window.confirm("Delete this card?")) return;
    const updatedCards = cards.filter((_, i) => i !== idx);
    setCards(updatedCards);
    setCurrentIdx((prev) =>
      prev >= updatedCards.length ? updatedCards.length - 1 : prev
    );
    setKnownCards(knownCards.filter((k) => k !== idx));
  };

  const card = cards[currentIdx];

  // Progress tracking
  const progress = cards.length
    ? Math.round((knownCards.length / cards.length) * 100)
    : 0;

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-pink-100 via-yellow-100 to-green-100 items-center justify-start overflow-hidden px-2">
      {/* Header with Home button on extreme left */}
      <header className="w-full flex items-center px-4 py-4 mb-6 bg-transparent">
        <Link to="/" className="flex items-center">
          <button
            className="bg-white border border-fuchsia-200 text-fuchsia-600 px-6 py-2 rounded-full shadow font-extrabold text-lg sm:text-xl hover:scale-105 transition"
          >
            ⬅ Home
          </button>
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full flex flex-col items-center"
      >
        <div className="w-full max-w-lg mx-auto flex flex-col items-center">
          {/* Flashcards heading centered */}
          <div className="flex flex-col items-center mb-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
              className="mb-2"
            >
              <div className="w-12 h-12 bg-violet-400 rounded-md shadow-lg mb-2 flex items-center justify-center">
                <span role="img" aria-label="flashcard" className="text-3xl">🃏</span>
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-violet-500 drop-shadow text-center mb-2">
              Flashcards
            </h1>
            <p className="mb-2 text-lg md:text-xl text-purple-900 font-medium text-center">
              Master concepts, one card at a time!
            </p>
          </div>

          {/* File Upload */}
          <label className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-violet-400 bg-violet-50 p-4 text-center text-violet-600 hover:bg-violet-100 transition mb-4 shadow-sm">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <p>📎 {file.name}</p>
            ) : (
              <p>Click or drag a .pdf, .docx, or .txt file here to upload</p>
            )}
          </label>

          {/* Text Input */}
          <textarea
            className="w-full h-32 p-4 border border-violet-200 rounded-xl bg-white text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-400 shadow-inner resize-none"
            placeholder="Or paste your study content here..."
            value={textInput}
            onChange={handleTextInput}
          />

          {/* No of Flashcards + Add Flashcard button (same row) */}
          <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-end gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-violet-700 mb-1">
                No. of Flashcards
              </label>
              <select
                value={numCards}
                onChange={(e) => setNumCards(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-violet-300 bg-white shadow"
              >
                {[5, 10, 15, 20].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => openAddEditModal(null)}
              className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white px-8 py-3 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200 font-semibold flex-shrink-0 text-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl">➕</span> Add Flashcard
            </button>
          </div>

          {/* Generate Button */}
          <div className="mb-8 w-full flex justify-center">
            <button
              onClick={handleGenerateFlashcards}
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-violet-400 to-fuchsia-500 text-white font-semibold py-3 px-10 rounded-xl shadow hover:bg-fuchsia-700 transition text-lg"
            >
              {loading ? "Generating..." : "Generate Flashcards"}
            </button>
          </div>

          {/* Progress Bar */}
          {cards.length > 0 && (
            <div className="mb-7 w-full flex items-center gap-3">
              <div className="w-full bg-violet-100 h-3 rounded-full">
                <div
                  className="bg-violet-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-violet-700 min-w-[60px] text-right">
                {knownCards.length}/{cards.length}{" "}
                <span className="hidden sm:inline">known</span>
              </span>
            </div>
          )}

          {/* Flashcard */}
          {cards.length > 0 ? (
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 16 }}
              className="my-8 w-full"
            >
              <div className="flex justify-between items-center mb-2 text-violet-700 font-semibold">
                <span>
                  Card {currentIdx + 1} of {cards.length}
                </span>
                <span className="text-xs text-violet-400">
                  Click card to flip 👆
                </span>
                <button
                  onClick={handleShuffle}
                  className="bg-yellow-400 text-white px-4 py-2 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200 font-semibold ml-2"
                  style={{ minWidth: "80px" }}
                  disabled={cards.length < 2}
                >
                  🔀 Shuffle
                </button>
              </div>
              {/* Flashcard Flip */}
              <div className="
                relative
                w-full
                min-h-[370px]
                max-w-3xl
                mx-auto
                bg-white
                border
                border-violet-200
                rounded-3xl
                shadow-2xl
                py-16
                px-16
                flex flex-col items-center justify-center
                perspective cursor-pointer select-none
              "
                tabIndex={0}
                aria-label="Flashcard. Click or press space to flip."
                onClick={handleFlip}
                onKeyDown={e => {
                  if (e.key === " " || e.key === "Enter") handleFlip();
                  if (e.key === "ArrowRight") handleNext();
                  if (e.key === "ArrowLeft") handlePrev();
                }}
              >
                <div
                  className="absolute w-full h-full left-0 top-0 transition-transform duration-500"
                  style={{
                    transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {/* Front Side */}
                  <div
                    className="absolute w-full h-full flex flex-col items-center justify-center"
                    style={{
                      backfaceVisibility: "hidden",
                      zIndex: showAnswer ? 1 : 2,
                    }}
                  >
                    <div className="text-2xl font-bold mb-2 text-violet-700">
                      Question:
                    </div>
                    <div className="mb-2 text-center text-violet-900 font-semibold text-lg">
                      {card?.question ? card.question : <span className="text-red-400">No question</span>}
                    </div>
                    {card?.hint && (
                      <div className="italic text-violet-600 text-base mt-2">
                        <span className="font-bold">Hint:</span> {card.hint}
                      </div>
                    )}
                    <div className="text-gray-400 text-xs mt-4">
                      Click or press Space/Enter to see Answer
                    </div>
                  </div>
                  {/* Back Side */}
                  <div
                    className="absolute w-full h-full flex flex-col items-center justify-center"
                    style={{
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      zIndex: showAnswer ? 2 : 1,
                    }}
                  >
                    <div className="text-2xl font-bold mb-2 text-violet-600">
                      Answer:
                    </div>
                    <div className="mb-2 text-center text-violet-800 font-semibold text-lg">
                      {card?.answer ? card.answer : <span className="text-red-400">No answer</span>}
                    </div>
                    {card?.explanation && (
                      <div className="text-violet-700 text-base mt-2">
                        <span className="font-bold">Explanation:</span> {card.explanation}
                      </div>
                    )}
                    <div className="text-gray-400 text-xs mt-4">
                      Click or press Space/Enter to see Question
                    </div>
                  </div>
                </div>
              </div>
              {/* Card Controls */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6">
                <button
                  onClick={handlePrev}
                  className="px-6 py-2 bg-violet-100 text-violet-600 rounded-full font-semibold hover:bg-violet-200 shadow-md transition"
                  aria-label="Previous card"
                >
                  ⬅ Prev
                </button>
                <button
                  onClick={() => openAddEditModal(currentIdx)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 shadow-md transition"
                  aria-label="Edit card"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteCard(currentIdx)}
                  className="px-6 py-2 bg-red-100 text-red-600 rounded-full font-semibold hover:bg-red-200 shadow-md transition"
                  aria-label="Delete card"
                >
                  🗑 Delete
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-violet-100 text-violet-600 rounded-full font-semibold hover:bg-violet-200 shadow-md transition"
                  aria-label="Next card"
                >
                  Next ➡
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-violet-600 mt-10">
              No flashcards available. Enter text or upload a file to generate, or{" "}
              <button className="underline text-violet-800" onClick={() => openAddEditModal(null)}>
                add manually
              </button>
              .
            </div>
          )}
        </div>
        {/* Add/Edit Modal */}
        {showAddEdit && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleAddEditSubmit}
              className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl border-2 border-violet-200"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-extrabold mb-4 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-transparent bg-clip-text">
                {editIdx === null ? "Add New" : "Edit"} Flashcard
              </h2>
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-violet-700">Question</label>
                <input
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-violet-400"
                  type="text"
                  value={editQuestion}
                  onChange={e => setEditQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-violet-700">Answer</label>
                <input
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-violet-400"
                  type="text"
                  value={editAnswer}
                  onChange={e => setEditAnswer(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-violet-700">Hint</label>
                <input
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-violet-400"
                  type="text"
                  value={editHint}
                  onChange={e => setEditHint(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-violet-700">Explanation</label>
                <input
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-violet-400"
                  type="text"
                  value={editExplanation}
                  onChange={e => setEditExplanation(e.target.value)}
                />
              </div>
              <div className="flex justify-between gap-2 mt-6">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-fuchsia-400 to-violet-500 text-white px-5 py-2 rounded-full font-semibold hover:bg-fuchsia-600 transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={closeAddEditModal}
                  className="bg-gray-200 px-5 py-2 rounded-full font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </motion.div>
      {/* Footer */}
      <footer className="relative z-10 mt-16 text-center text-sm text-gray-500 pb-4">
        Made for learners like you · © 2025 SmartStudy AI
      </footer>
      <style>{`
        .perspective { perspective: 1000px; }
        ::-webkit-scrollbar { display: none; }
        html { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
}