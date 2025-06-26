import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Navbar from "./components/Navbar";
import PageWrapper from "./components/PageWrapper";
import LoadingSpinner from "./components/LoadingSpinner";

import Home from "./pages/Home";
import Chatbot from "./pages/Chatbot";
import Summary from "./pages/Summary";
import Quiz from "./pages/Quiz";
import Flashcards from "./pages/Flashcards"; // ✅ Added Flashcards import

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <PageWrapper>
                <Home />
              </PageWrapper>
            </PageTransition>
          }
        />
        <Route
          path="/chatbot"
          element={
            <PageTransition>
              <PageWrapper>
                <Chatbot />
              </PageWrapper>
            </PageTransition>
          }
        />
        <Route
          path="/summary"
          element={
            <PageTransition>
              <PageWrapper>
                <Summary />
              </PageWrapper>
            </PageTransition>
          }
        />
        <Route
          path="/quiz"
          element={
            <PageTransition>
              <PageWrapper>
                <Quiz />
              </PageWrapper>
            </PageTransition>
          }
        />
        <Route
          path="/flashcards"
          element={
            <PageTransition>
              <PageWrapper>
                <Flashcards />
              </PageWrapper>
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />
      <Suspense fallback={<LoadingSpinner />}>
        <AnimatedRoutes />
      </Suspense>
    </Router>
  );
}
