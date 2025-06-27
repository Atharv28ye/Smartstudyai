import { useState, useEffect } from "react";
import api from "../api/axios";

// Quiz fetch
const getQuiz = async (text, count, difficulty) => {
  try {
    const res = await api.post(
      "/generate-quiz",
      { text, count, difficulty },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const quizData = res.data.quiz;
    return Array.isArray(quizData) ? quizData : [];
  } catch (err) {
    console.error("Quiz fetch failed", err);
    return [];
  }
};


// Hint fetch
const getHint = async (question, context) => {
  try {
    const res = await api.post("/generate-hint", { question, context });
    return res.data.hint;
  } catch (err) {
    console.error("Hint fetch failed", err);
    return "Hint unavailable.";
  }
};

// File upload & text extraction
const uploadAndExtractText = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post("/upload-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.text || "";
  } catch (err) {
    console.error("Text extraction failed", err);
    return "";
  }
};

export default function Quiz() {
  // --- MEMORY: Restore state on mount ---
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [hints, setHints] = useState({});
  const [explanations, setExplanations] = useState({});
  const [loading, setLoading] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("quiz-state");
    if (saved) {
      try {
        const {
          quiz,
          feedback,
          hints,
          explanations,
          numQuestions,
          difficulty,
          showScore,
          textInput,
        } = JSON.parse(saved);
        setQuiz(quiz || []);
        setFeedback(feedback || {});
        setHints(hints || {});
        setExplanations(explanations || {});
        setNumQuestions(numQuestions || 5);
        setDifficulty(difficulty || "medium");
        setShowScore(showScore || false);
        setTextInput(textInput || "");
      } catch (e) {
        // ignore errors
      }
    }
  }, []);

  // --- MEMORY: Save state when quiz or answers change ---
  useEffect(() => {
    if (quiz.length > 0) {
      localStorage.setItem(
        "quiz-state",
        JSON.stringify({
          quiz,
          feedback,
          hints,
          explanations,
          numQuestions,
          difficulty,
          showScore,
          textInput,
        })
      );
    }
  }, [quiz, feedback, hints, explanations, numQuestions, difficulty, showScore, textInput]);

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    const isValid =
      uploadedFile &&
      ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(uploadedFile.type);

    if (!isValid) {
      alert("Please upload a valid PDF or DOCX file.");
      return;
    }

    setFile(uploadedFile);
    const extractedText = await uploadAndExtractText(uploadedFile);
    if (extractedText) {
      setTextInput(extractedText);
    } else {
      alert("Failed to extract text from the uploaded file.");
    }
  };

  const handleGenerateQuiz = async () => {
    if (!textInput.trim()) {
      alert("Please enter some text to generate quiz.");
      return;
    }
    setLoading(true);
    const quizData = await getQuiz(textInput, numQuestions, difficulty);
    setQuiz(quizData);
    setFeedback({});
    setHints({});
    setExplanations({});
    setShowScore(false);
    setLoading(false);
  };

  const handleOptionClick = (qIndex, selected) => {
    const correct = quiz[qIndex].correct_answer;
    setFeedback((prev) => ({
      ...prev,
      [qIndex]: {
        selected,
        correct,
        isCorrect: selected === correct,
      },
    }));
  };

  const handleHintClick = async (qIndex) => {
    const question = quiz[qIndex].question;
    const hint = await getHint(question, textInput);
    setHints((prev) => ({ ...prev, [qIndex]: hint }));
  };

  const handleExplainClick = async (qIndex) => {
    const q = quiz[qIndex];
    const user = feedback[qIndex];
    if (!user) return;
    try {
      const res = await api.post("/explain-answer", {
        question: q.question,
        correct_answer: q.correct_answer,
        user_answer: user.selected,
        context: textInput,
      });
      setExplanations((prev) => ({ ...prev, [qIndex]: res.data.explanation }));
    } catch {
      setExplanations((prev) => ({
        ...prev,
        [qIndex]: "❌ Explanation could not be fetched.",
      }));
    }
  };

  const handleShowScore = () => setShowScore(true);
  const handleRetake = () => {
    setFeedback({});
    setHints({});
    setExplanations({});
    setShowScore(false);
    // Optionally clear localStorage for quiz-state on retake:
    // localStorage.removeItem("quiz-state");
  };

  const correctCount = Object.values(feedback).filter((f) => f.isCorrect).length;
  const progress = (Object.keys(feedback).length / quiz.length) * 100;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-pink-50 via-yellow-50 to-green-100 text-gray-800">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-purple-700 mb-6 drop-shadow-sm">
          🧠 Smart AI Quiz
        </h1>

        {/* File Upload */}
        <label className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-pink-400 bg-pink-50 p-6 text-center text-pink-600 hover:bg-pink-100 transition mb-4 shadow-sm">
          <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
          {file ? <p>📎 {file.name}</p> : <p>Click or drag a .pdf or .docx file here to upload</p>}
        </label>

        {/* Text Input */}
        <textarea
          className="w-full h-40 p-4 border border-pink-200 rounded-xl bg-white text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-400 placeholder:text-gray-400 shadow-inner"
          placeholder="Or paste your study content here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">No. of Questions</label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-purple-300 bg-white"
            >
              {[5, 10, 15, 20].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-2 rounded-lg border border-purple-300 bg-white"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateQuiz}
          disabled={loading}
          className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition mb-6"
        >
          {loading ? "Generating..." : "Generate Quiz"}
        </button>

        {quiz.length > 0 && (
          <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {/* Quiz Cards */}
        {quiz.map((q, index) => (
          <div
            key={index}
            className="mb-6 p-5 bg-white border border-purple-200 rounded-2xl shadow-md transition"
          >
            <p className="font-semibold text-lg text-purple-700 mb-3">{index + 1}. {q.question}</p>

            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const user = feedback[index];
                const isSelected = user?.selected === opt;
                const isCorrect = user?.correct === opt;
                const isRight = isSelected && user?.isCorrect;
                const isWrong = isSelected && !user?.isCorrect;

                let bgClass = "bg-gray-50 border border-gray-200";
                if (isRight) bgClass = "bg-green-100 border border-green-300 text-green-800";
                else if (isWrong) bgClass = "bg-red-100 border border-red-300 text-red-800";
                else if (!isSelected && isCorrect) bgClass = "bg-green-50 border border-green-200";

                return (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(index, opt)}
                    className={`w-full text-left px-4 py-2 rounded-lg ${bgClass} hover:bg-purple-100 transition`}
                    disabled={user}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleHintClick(index)}
              className="mt-3 text-sm text-pink-600 underline hover:text-pink-800"
            >
              Show Hint
            </button>
            {hints[index] && (
              <div className="mt-2 text-sm text-purple-800">💡 Hint: {hints[index]}</div>
            )}

            {feedback[index] && (
              <>
                <div className="mt-3 text-sm font-semibold">
                  {feedback[index].isCorrect ? (
                    <span className="text-green-700">✅ Correct!</span>
                  ) : (
                    <span className="text-red-600">
                      ❌ Incorrect! Correct Answer: <strong>{feedback[index].correct}</strong>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleExplainClick(index)}
                  className="mt-2 text-sm text-blue-600 underline hover:text-blue-800"
                >
                  Explain Answer
                </button>
                {explanations[index] && (
                  <div className="mt-2 text-sm text-blue-800">🧠 {explanations[index]}</div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Score and Retake */}
        {quiz.length > 0 && (
          <div className="text-center space-y-4 mt-10">
            <button
              onClick={handleShowScore}
              className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
            >
              Show Score
            </button>
            {showScore && (
              <div className="text-lg font-bold text-purple-700">
                ✅ You scored {correctCount} out of {quiz.length}
              </div>
            )}
            <button
              onClick={handleRetake}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Retake Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}