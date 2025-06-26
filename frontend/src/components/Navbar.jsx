import { Link } from "react-router-dom";
import { Bot, BookOpen, Home, FileText, Layers3 } from "lucide-react"; // <-- added Layers3 icon for Flashcards

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-pink-100/70 backdrop-blur-md border-b border-pink-200 shadow-sm px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-extrabold tracking-wide bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 text-transparent bg-clip-text hover:scale-105 transition-transform"
        >
          SmartStudy <span className="font-black">AI</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-5 text-sm font-medium text-pink-600">
          <Link to="/" className="flex items-center gap-1 hover:text-pink-800 transition">
            <Home size={16} /> Home
          </Link>
          <Link to="/summary" className="flex items-center gap-1 hover:text-pink-800 transition">
            <FileText size={16} /> Summary
          </Link>
          <Link to="/quiz" className="flex items-center gap-1 hover:text-pink-800 transition">
            <BookOpen size={16} /> Quiz
          </Link>
          <Link to="/chatbot" className="flex items-center gap-1 hover:text-pink-800 transition">
            <Bot size={16} /> Chatbot
          </Link>
          <Link to="/flashcards" className="flex items-center gap-1 hover:text-pink-800 transition">
            <Layers3 size={16} /> Flashcards
          </Link>
        </nav>
      </div>
    </header>
  );
}
