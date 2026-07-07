import { type ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Search, Command, Menu, Sparkles, HelpCircle, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { checkBackendHealth } from "../../lib/api/ai.service";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Student");
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "ollama_offline" | "offline">("checking");
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("gyaansetu_user");
    if (!user) {
      navigate({ to: "/auth" });
    } else {
      setAuthorized(true);
      try {
        const parsed = JSON.parse(user);
        if (parsed?.name) setUserName(parsed.name.split(" ")[0]);
      } catch (_) {}
    }
  }, [navigate]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    const verifyHealth = async () => {
      try {
        const health = await checkBackendHealth();
        if (!active) return;
        if (health.status === "offline") {
          setAiStatus("offline");
        } else if (!health.ollama_connected) {
          setAiStatus("ollama_offline");
        } else {
          setAiStatus("online");
        }
      } catch {
        if (active) setAiStatus("offline");
      }
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 10000); // Check health every 10s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white shadow-lg border border-slate-200/60 flex items-center justify-center">
            <img src="/Gyaansetu AI logo.png" alt="GyaanSetu AI" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-indigo-400"
                style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/10 text-slate-800">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 min-h-16 flex items-center gap-3 px-4 lg:px-8 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-sm shadow-slate-100/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl p-2 transition-all duration-200 mr-1"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xl">
            <div className="bg-slate-100/80 border border-slate-200/80 flex-1 flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm hover:border-indigo-300/60 hover:bg-white transition-all duration-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:shadow-sm focus-within:shadow-indigo-100">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                placeholder="Search a tool, topic, course, or saved note"
                className="flex-1 bg-transparent outline-none placeholder:text-slate-400 text-slate-700 text-sm"
                aria-label="Search GyaanSetu"
              />
              <kbd className="hidden md:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 font-mono shadow-sm">
                <Command className="h-3 w-3" /> K
              </kbd>
            </div>
          </div>
          <div className="lg:hidden min-w-0">
            <div className="text-xs font-semibold text-slate-500">GyaanSetu AI</div>
            <div className="truncate text-sm font-bold text-slate-800">Hi, {userName}</div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {/* Dynamic AI Status Badge */}
            <button 
              onClick={() => setShowStatusModal(true)}
              className={`hidden sm:flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                aiStatus === "online" 
                  ? "bg-emerald-50 border-emerald-200/60 text-emerald-600 hover:bg-emerald-100/60" 
                  : aiStatus === "ollama_offline"
                  ? "bg-amber-50 border-amber-200/60 text-amber-600 hover:bg-amber-100/60"
                  : aiStatus === "offline"
                  ? "bg-rose-50 border-rose-200/60 text-rose-600 hover:bg-rose-100/60"
                  : "bg-slate-50 border-slate-200/60 text-slate-500"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${
                aiStatus === "online" 
                  ? "bg-emerald-500 animate-pulse" 
                  : aiStatus === "ollama_offline"
                  ? "bg-amber-500 animate-pulse"
                  : aiStatus === "offline"
                  ? "bg-rose-500 animate-pulse"
                  : "bg-slate-400"
              }`} />
              <span>
                {aiStatus === "online" && "AI Engine Online"}
                {aiStatus === "ollama_offline" && "Ollama Offline"}
                {aiStatus === "offline" && "AI Server Offline"}
                {aiStatus === "checking" && "Checking AI..."}
              </span>
            </button>

            <button className="hidden sm:inline-flex bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl p-2 transition-all duration-200" aria-label="Help">
              <HelpCircle className="h-4 w-4" />
            </button>
            <button className="relative bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl p-2 transition-all duration-200" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <div className="hidden sm:flex bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-medium items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hi, {userName}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>

      {/* AI Connection Status Help Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowStatusModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl z-50 text-slate-800"
            >
              <button 
                onClick={() => setShowStatusModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
              
              <h3 className="font-display font-bold text-lg text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                AI Connection Diagnosis
              </h3>
              
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className={`h-2.5 w-2.5 rounded-full mt-1.5 ${
                    aiStatus === "online" ? "bg-emerald-500" : aiStatus === "ollama_offline" ? "bg-amber-500" : aiStatus === "offline" ? "bg-rose-500" : "bg-slate-400"
                  }`} />
                  <div>
                    <div className="font-semibold text-slate-800">
                      {aiStatus === "online" && "AI Status: Fully Connected"}
                      {aiStatus === "ollama_offline" && "AI Status: Ollama Service Offline"}
                      {aiStatus === "offline" && "AI Status: FastAPI Server Offline"}
                      {aiStatus === "checking" && "AI Status: Checking local models..."}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {aiStatus === "online" && "Your local Llama 3.1 & pipeline are running and fully responsive."}
                      {aiStatus === "ollama_offline" && "FastAPI server is running, but cannot communicate with local Ollama service."}
                      {aiStatus === "offline" && "No connection found. GyaanSetu's local backend on port 8000 is not running."}
                      {aiStatus === "checking" && "Pinging local servers for status update..."}
                    </div>
                  </div>
                </div>

                {aiStatus !== "online" && (
                  <div className="space-y-3">
                    <p className="font-medium text-slate-700">How to start local AI services:</p>
                    <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-600">
                      {aiStatus === "offline" && (
                        <li>
                          Make sure the offline AI backend is started. Open a <strong>PowerShell</strong> terminal in the project directory:
                          <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono select-all">
                            .\start-all.ps1
                          </pre>
                        </li>
                      )}
                      <li>
                        Ensure <strong>Ollama</strong> is installed and running in your taskbar.
                      </li>
                      <li>
                        Confirm the LLM models (<code>llama3.1:8b</code>, <code>deepseek-r1</code>, <code>gemma3</code>) are pulled locally:
                        <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono select-all">
                          ollama pull llama3.1:8b
                        </pre>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowStatusModal(false)}
                className="mt-6 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold transition hover:bg-indigo-700 hover:scale-[1.02]"
              >
                Close Diagnosis
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
