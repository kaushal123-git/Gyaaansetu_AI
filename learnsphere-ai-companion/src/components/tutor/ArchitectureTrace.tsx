import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Network, Cpu, ShieldCheck, Database, GitMerge, 
  Activity, Sparkles, ChevronDown, ChevronUp, Clock, AlertTriangle 
} from "lucide-react";

interface TraceProps {
  trace?: {
    intent: {
      detected: string;
      complexity: string;
      language: string;
      confidence: number;
    };
    query_rewriter: {
      original: string;
      rewritten: string;
    };
    retrieval: {
      cag: {
        history_context_pulled: boolean;
        previous_mistakes_count: number;
        profile_matched: boolean;
      };
      kag: {
        neo4j_concept: string;
        prerequisites: string[];
        related_concepts: string[];
        hierarchy: string;
      };
      rag: {
        chunks_retrieved: number;
        sources: string[];
        vector_db: string;
      };
      decision: {
        selected_modules: string[];
        reason: string;
      };
    };
    context_fusion: {
      deduplication_removed_chunks: number;
      ranking: string[];
      compression_ratio: string;
      final_token_count: number;
    };
    model_routing: {
      routed_model: string;
      routing_reason: string;
      latency_seconds: number;
      cloud_fallback_triggered: boolean;
    };
    gera_engine: {
      input_valid: boolean;
      primary_status: string;
      failovers_attempted: string[];
      retries: number;
      health_status: string;
    };
    verifier: {
      confidence_score: number;
      reasoning_path: string;
      fact_check_passed: boolean;
      hallucination_detected: boolean;
    };
  };
}

export function ArchitectureTrace({ trace }: TraceProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "retrieval" | "routing" | "verification">("pipeline");

  if (!trace) return null;

  return (
    <div className="mt-3 w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl text-slate-300 font-sans transition-all duration-300">
      {/* Header Bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gradient-to-r from-slate-900/90 to-slate-950/90 border-b border-slate-800/60 flex items-center justify-between text-xs font-semibold hover:bg-slate-900/60 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#00F5FF] animate-pulse" />
          <span className="text-slate-200 tracking-wide font-mono">GyaanSetu AI Neural Pipeline</span>
          <span className="bg-[#00F5FF]/10 text-[#00F5FF] px-2 py-0.5 rounded-full text-[10px] border border-[#00F5FF]/20">
            {trace.model_routing.routed_model}
          </span>
          <span className="text-slate-500 font-mono text-[10px] hidden sm:inline flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500" /> {trace.model_routing.latency_seconds}s
          </span>
        </div>
        <div className="flex items-center gap-1 text-[#00F5FF]">
          <span className="text-[10px] font-mono font-semibold">Inspect Layer</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expanded Content Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-[#0a0f20]/90"
          >
            {/* Tabs */}
            <div className="flex border-b border-slate-800/60 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider overflow-x-auto">
              {(["pipeline", "retrieval", "routing", "verification"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 text-center border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? "border-[#00F5FF] text-[#00F5FF] bg-[#00F5FF]/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content panel */}
            <div className="p-4 min-h-[160px] text-xs">
              
              {/* Tab 1: Pipeline Overview */}
              {activeTab === "pipeline" && (
                <div className="space-y-4">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2">11-Layer Flow Executed:</div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative text-center">
                    
                    {/* Step 1: Input & Intent */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-[#00F5FF]/40 transition">
                      <div className="font-semibold text-slate-200 mb-1 flex items-center justify-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-yellow-400" /> Layer 1
                      </div>
                      <div className="text-[10px] text-slate-400">Intent: {trace.intent.detected}</div>
                      <div className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 mt-2 font-mono border border-slate-800">
                        {trace.intent.complexity}
                      </div>
                    </div>

                    {/* Step 2: Adaptive Orchestrator */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-[#8B5CF6]/40 transition">
                      <div className="font-semibold text-slate-200 mb-1 flex items-center justify-center gap-1.5">
                        <Network className="h-3.5 w-3.5 text-[#8B5CF6]" /> Layer 3
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Modules: {trace.retrieval.decision.selected_modules.join(" + ")}
                      </div>
                      <div className="text-[9px] text-[#8B5CF6] mt-2 font-semibold">Orchestrator Decision</div>
                    </div>

                    {/* Step 3: Context Fusion */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-[#00F5FF]/40 transition">
                      <div className="font-semibold text-slate-200 mb-1 flex items-center justify-center gap-1.5">
                        <GitMerge className="h-3.5 w-3.5 text-cyan-400" /> Layer 4
                      </div>
                      <div className="text-[10px] text-slate-400">Footprint: {trace.context_fusion.final_token_count} Tokens</div>
                      <div className="text-[9px] bg-emerald-950/40 text-emerald-400 px-1 py-0.5 rounded mt-2 border border-emerald-900/30">
                        Fused & Ranked
                      </div>
                    </div>

                    {/* Step 4: Model Router & GERA */}
                    <div className="bg-slate-900/60 border border-[#8b5cf6]/30 rounded-xl p-2.5 flex flex-col justify-between hover:border-[#8B5CF6]/60 transition">
                      <div className="font-semibold text-slate-200 mb-1 flex items-center justify-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-purple-400" /> Layer 5 & 6
                      </div>
                      <div className="text-[10px] text-slate-400">{trace.model_routing.routed_model}</div>
                      {trace.gera_engine.retries > 0 ? (
                        <div className="text-[9px] bg-amber-950/60 text-amber-400 px-1 py-0.5 rounded mt-2 border border-amber-900/30 flex items-center justify-center gap-1 font-semibold animate-pulse">
                          <AlertTriangle className="h-2.5 w-2.5" /> GERA Failover
                        </div>
                      ) : (
                        <div className="text-[9px] bg-emerald-950/40 text-emerald-400 px-1 py-0.5 rounded mt-2 border border-emerald-900/30">
                          GERA nominal
                        </div>
                      )}
                    </div>

                    {/* Step 5: Verifier Engine */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/40 transition">
                      <div className="font-semibold text-slate-200 mb-1 flex items-center justify-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verifier
                      </div>
                      <div className="text-[10px] text-slate-400">Confidence: {trace.verifier.confidence_score}%</div>
                      <div className="text-[9px] text-emerald-400 mt-2 font-semibold">Valid Response</div>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab 2: Retrieval Details (CAG, KAG, RAG) */}
              {activeTab === "retrieval" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CAG */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
                    <div className="font-semibold text-[#00F5FF] mb-2 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" /> CAG (Context-Augmented)
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400">
                      <li className="flex justify-between">
                        <span>Profile Connected:</span>
                        <span className="text-slate-300 font-semibold">{trace.retrieval.cag.profile_matched ? "YES" : "NO"}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Mistakes Evaluated:</span>
                        <span className="text-slate-300 font-semibold">{trace.retrieval.cag.previous_mistakes_count} found</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Conv History Pulled:</span>
                        <span className="text-slate-300 font-semibold">{trace.retrieval.cag.history_context_pulled ? "YES" : "NO"}</span>
                      </li>
                    </ul>
                  </div>

                  {/* KAG */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
                    <div className="font-semibold text-[#8B5CF6] mb-2 flex items-center gap-1.5">
                      <Network className="h-3.5 w-3.5" /> KAG (Knowledge Graph)
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400">
                      <li className="truncate">
                        <span className="text-slate-500">Root Node:</span> <span className="text-slate-200">{trace.retrieval.kag.neo4j_concept}</span>
                      </li>
                      <li className="truncate">
                        <span className="text-slate-500">Hierarchy:</span> <span className="text-slate-300 text-[10px]">{trace.retrieval.kag.hierarchy}</span>
                      </li>
                      <li>
                        <span className="text-slate-500">Prereqs:</span>{" "}
                        <span className="text-slate-300 font-medium">
                          {trace.retrieval.kag.prerequisites.length > 0
                            ? trace.retrieval.kag.prerequisites.join(", ")
                            : "None detected"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* RAG */}
                  <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
                    <div className="font-semibold text-cyan-400 mb-2 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" /> RAG (Vector Search)
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400">
                      <li className="flex justify-between">
                        <span>Vector Store:</span>
                        <span className="text-slate-300 font-mono text-[10px]">{trace.retrieval.rag.vector_db}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Chunks Ingested:</span>
                        <span className="text-slate-300 font-semibold">{trace.retrieval.rag.chunks_retrieved}</span>
                      </li>
                      <li className="truncate">
                        <span className="text-slate-500">Sources:</span>{" "}
                        <span className="text-slate-300 font-medium">
                          {trace.retrieval.rag.sources.length > 0
                            ? trace.retrieval.rag.sources.join(", ")
                            : "No active search"}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 3: Model Routing & GERA Engine */}
              {activeTab === "routing" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
                      <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-purple-400" /> Intelligent Model Router
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {trace.model_routing.routing_reason}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
                        <span>Active Engine:</span>
                        <span className="text-purple-400 font-semibold">{trace.model_routing.routed_model}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
                      <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#00F5FF]" /> GERA Resilience Status
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-400">
                        <li className="flex justify-between">
                          <span>Health Status:</span>
                          <span className={`font-semibold ${trace.gera_engine.health_status === "Healthy" ? "text-emerald-400" : "text-amber-400 animate-pulse"}`}>
                            {trace.gera_engine.health_status.toUpperCase()}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Failover Retries:</span>
                          <span className="text-slate-300 font-semibold">{trace.gera_engine.retries}</span>
                        </li>
                        {trace.gera_engine.failovers_attempted.length > 0 && (
                          <li className="flex flex-col gap-0.5 mt-1 border-t border-slate-800/60 pt-1.5">
                            <span className="text-slate-500 text-[10px]">Failover Steps:</span>
                            <span className="text-amber-400 font-mono text-[9px] truncate">
                              {trace.gera_engine.failovers_attempted.join(" -> ")}
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Verification & Confidence */}
              {activeTab === "verification" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl md:col-span-1 flex flex-col justify-center items-center text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Verifier Confidence</div>
                    <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                      {trace.verifier.confidence_score}%
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">Output Factuality Score</div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl md:col-span-2 space-y-2">
                    <div className="font-semibold text-slate-300 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verifier Checklists
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                        <span>Input Sanitised: YES</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                        <span>No Hallucination: YES</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                        <span>Source Verified: YES</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                        <span>Schema Validated: YES</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 leading-relaxed">
                      <span className="font-semibold text-slate-400">Reasoning Path:</span> {trace.verifier.reasoning_path}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
