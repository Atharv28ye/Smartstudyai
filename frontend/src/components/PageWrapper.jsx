import { motion } from "framer-motion";

export default function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="relative w-full min-h-screen overflow-x-hidden overflow-y-auto p-0 m-0"
    >
      {/* 🔮 Aesthetic Animated Blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-purple-400 opacity-25 rounded-full blur-3xl animate-pulse top-[-120px] left-[-120px]" />
        <div className="absolute w-[400px] h-[400px] bg-blue-300 opacity-20 rounded-full blur-2xl animate-ping top-[40%] left-[60%]" />
        <div className="absolute w-[350px] h-[350px] bg-pink-300 opacity-20 rounded-full blur-2xl animate-pulse bottom-[-100px] right-[-100px]" />
      </div>

      {children}
    </motion.div>
  );
}
