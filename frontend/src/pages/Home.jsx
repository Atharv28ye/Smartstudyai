import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#ffe6f0] via-[#fefbd8] to-[#d8fff2] px-4">
      {/* Funky Floating Blobs */}
      <div className="absolute top-[-150px] left-[-150px] w-[300px] h-[300px] bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-ping"></div>
      <div className="absolute bottom-[150px] left-[100px] w-[200px] h-[200px] bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-bounce"></div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-transparent bg-clip-text drop-shadow-sm">
          SmartStudy AI ✨
        </h1>
        <p className="mt-4 text-lg md:text-xl text-rose-800 font-medium">
          Study smarter with AI — fast, clean, focused 🧠📘⚡
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/summary">
            <button className="bg-pink-500 text-white px-6 py-3 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200">
              📄 Try Summarizer
            </button>
          </Link>
          <Link to="/quiz">
            <button className="bg-rose-500 text-white px-6 py-3 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200">
              🧠 Generate Quizzes
            </button>
          </Link>
          <Link to="/chatbot">
            <button className="bg-orange-500 text-white px-6 py-3 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200">
              🤖 Talk to AI
            </button>
          </Link>
          <Link to="/flashcards">
            <button className="bg-fuchsia-500 text-white px-6 py-3 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200">
              🃏 Explore Flashcards
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="relative z-10 mt-16 text-center text-sm text-gray-500 pb-4">
        Made for learners like you · © 2025 SmartStudy AI
      </footer>
    </div>
  );
}
