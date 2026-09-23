import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sparkles,
  Bot,
  Send,
  X,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Zap,
  Trash2,
  Minimize2,
  Database,
  Activity,
  Boxes,
  RotateCcw,
  Server,
  LineChart,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  actionLink?: {
    label: string;
    path: string;
  };
}

const KNOWLEDGE_RESPONSES: {
  keywords: string[];
  reply: string;
  codeSnippet?: { language: string; code: string };
  actionLink?: { label: string; path: string };
}[] = [
    {
      keywords: ["hi", "hello", "hey", "bonjour", "salut", "coucou"],
      reply:
        "Hello! How can I assist you with your ML models, deployments, or drift monitoring today? You can ask me to generate CLI commands, explain pipelines, or inspect system health.",
      actionLink: { label: "Go to Dashboard Console", path: "/app" },
    },
    {
      keywords: ["deploy", "docker", "serving", "container", "production"],
      reply:
        "To deploy a model in MLite, you can use the CLI or the Dashboard. MLite builds a container runtime with sub-50ms latency and automatic health probes.",
      codeSnippet: {
        language: "bash",
        code: `# Deploy a registered model via CLI\nmlite deployments create \\\n  --model fraud-detector \\\n  --version 1.0.0 \\\n  --port 8001 \\\n  --replicas 2`,
      },
      actionLink: { label: "View Deployments", path: "/app/deployments" },
    },
    {
      keywords: ["drift", "evidently", "ks", "statistical", "monitor", "alert"],
      reply:
        "MLite integrates Evidently AI for real-time drift monitoring. We run Kolmogorov-Smirnov tests on numerical distributions and Population Stability Index (PSI) on categorical features.",
      codeSnippet: {
        language: "bash",
        code: `# Trigger on-demand drift analysis\nmlite monitoring check-drift \\\n  --dataset-current s3://datasets/current.parquet \\\n  --dataset-reference s3://datasets/reference.parquet`,
      },
      actionLink: { label: "Open Monitoring & Drift", path: "/app/monitoring" },
    },
    {
      keywords: ["rollback", "recovery", "failure", "crash", "auto-rollback"],
      reply:
        "Automated rollbacks trigger when consecutive health probes fail (HTTP 500 or timeout > 5000ms) or severe drift exceeds threshold (p < 0.05). Zero downtime is guaranteed via traffic redirection.",
      codeSnippet: {
        language: "bash",
        code: `# Manual rollback to previous stable checkpoint\nmlite deployments rollback \\\n  --deployment-id dep_fraud_8001 \\\n  --to-version v1.2.0`,
      },
      actionLink: { label: "Check Alerts & Rollback", path: "/app/alerts" },
    },
    {
      keywords: ["dataset", "minio", "s3", "version", "sha256", "data"],
      reply:
        "Datasets in MLite are immutably versioned using SHA-256 checksums and synced with MinIO S3 object storage for reproducible training runs.",
      codeSnippet: {
        language: "bash",
        code: `# Register and hash a new dataset\nmlite datasets register \\\n  --name customer_churn \\\n  --path ./data/churn_2026.csv`,
      },
      actionLink: { label: "Inspect Datasets", path: "/app/datasets" },
    },
    {
      keywords: ["mlflow", "experiment", "metrics", "loss", "accuracy", "track"],
      reply:
        "MLite includes full MLflow tracking out of the box. Metrics, hyper-parameters, and model artifacts are logged automatically.",
      codeSnippet: {
        language: "python",
        code: `import mlflow\n\nwith mlflow.start_run():\n    mlflow.log_param("learning_rate", 0.01)\n    mlflow.log_metric("accuracy", 0.984)\n    mlflow.xgboost.log_model(model, "model")`,
      },
      actionLink: { label: "View Experiments", path: "/app/experiments" },
    },
    {
      keywords: ["rbac", "role", "security", "token", "key", "admin", "permission"],
      reply:
        "MLite enforces 4-tier Role-Based Access Control: ADMIN (full access), MAINTAINER (model promotions), DEVELOPER (training & logs), and VIEWER (read-only audit).",
      codeSnippet: {
        language: "bash",
        code: `# Generate a scoped API key\nmlite auth create-key --role DEVELOPER --name "ci-pipeline"`,
      },
      actionLink: { label: "Audit & Governance", path: "/app/audit" },
    },
    {
      keywords: ["cli", "command", "init", "install", "tool"],
      reply:
        "The MLite CLI is available in Python. You can initialize projects, deploy models, and stream logs directly from your terminal.",
      codeSnippet: {
        language: "bash",
        code: `# Initialize a new MLOps project\nmlite init my-project\ncd my-project\nmlite status`,
      },
      actionLink: { label: "Explore Dashboard", path: "/app" },
    },
  ];

interface SuggestedQuestion {
  icon: React.ElementType;
  label: string;
  query: string;
}

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    icon: Server,
    label: "Deploy model to Docker",
    query: "How do I deploy a model to Docker with sub-50ms serving?",
  },
  {
    icon: LineChart,
    label: "Detect data drift",
    query: "How does Evidently AI drift detection work?",
  },
  {
    icon: RotateCcw,
    label: "Configure auto-rollback",
    query: "How does automated rollback recover failing models?",
  },
  {
    icon: ShieldCheck,
    label: "RBAC & API Keys",
    query: "What are the RBAC security roles and permissions?",
  },
];

export const AIAgentWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "agent",
      text: "Welcome to **MLite AI Copilot**. I am your autonomous MLOps assistant. Ask me anything about deploying models, detecting drift, or managing pipelines.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to parse **bold** and `code` into real JSX elements without raw asterisks
  const renderFormattedText = (text: string, isUser: boolean) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const content = part.slice(2, -2);
        return (
          <strong
            key={index}
            className={`font-bold ${isUser ? "text-white" : "text-slate-900"}`}
          >
            {content}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        const content = part.slice(1, -1);
        return (
          <code
            key={index}
            className={`px-1.5 py-0.5 rounded-md font-mono text-[10.5px] font-semibold ${isUser
                ? "bg-white/20 text-white"
                : "bg-[#EBF8F4] text-[#1A7456] border border-[#BCE9DA]"
              }`}
          >
            {content}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMessage: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsTyping(true);

    // Analyze intent and match with domain knowledge
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const matched = KNOWLEDGE_RESPONSES.find((item) =>
        item.keywords.some((kw) => {
          if (kw.length <= 3) {
            // For short words like 'hi', match whole words
            const regex = new RegExp(`\\b${kw}\\b`, "i");
            return regex.test(lowerQuery);
          }
          return lowerQuery.includes(kw);
        })
      );

      let responseMessage: Message;

      if (matched) {
        responseMessage = {
          id: "agent-" + Date.now(),
          sender: "agent",
          text: matched.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          codeSnippet: matched.codeSnippet,
          actionLink: matched.actionLink,
        };
      } else {
        responseMessage = {
          id: "agent-" + Date.now(),
          sender: "agent",
          text: `MLite manages end-to-end model lifecycles with verified data lineage, sub-50ms inference runtimes, and real-time Evidently AI drift guards. You can query models or trigger commands directly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          codeSnippet: {
            language: "bash",
            code: `# Check system and component health\nmlite status --all\nmlite models list`,
          },
          actionLink: { label: "Go to System Overview", path: "/app" },
        };
      }

      setMessages((prev) => [...prev, responseMessage]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className={`w-[92vw] sm:w-[420px] bg-white border border-slate-200/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 mb-4 backdrop-blur-xl ${isMinimized ? "h-16" : "h-[560px]"
            }`}
          style={{
            boxShadow: "0 20px 50px -10px rgba(11, 30, 45, 0.25), 0 0 0 1px rgba(59, 180, 140, 0.2)",
          }}
        >
          {/* Header */}
          <div className="h-16 px-4 bg-gradient-to-r from-slate-900 via-[#0B1E2D] to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#3BB48C] to-teal-400 p-0.5 flex items-center justify-center shadow-md shadow-[#3BB48C]/30">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#3BB48C]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#3BB48C] border-2 border-slate-900 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white tracking-tight">MLite AI Agent</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#3BB48C]/20 text-[#3BB48C] font-bold border border-[#3BB48C]/30">
                    COPILOT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Autonomous MLOps Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: "welcome-1",
                      sender: "agent",
                      text: "Conversation cleared. How can I assist with your models or pipeline?",
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ])
                }
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-[#F9FBFA] via-white to-slate-50/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                  >
                    {/* Avatar */}
                    {msg.sender === "agent" ? (
                      <div className="w-7 h-7 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4 text-[#1A7456]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold shadow-2xs">
                        U
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${msg.sender === "user"
                          ? "bg-gradient-to-r from-[#3BB48C] to-[#2FA07B] text-white font-medium shadow-md shadow-[#3BB48C]/20 rounded-tr-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 shadow-xs rounded-tl-xs"
                        }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {renderFormattedText(msg.text, msg.sender === "user")}
                      </div>

                      {/* Code Snippet Card */}
                      {msg.codeSnippet && (
                        <div className="mt-2.5 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden text-[11px]">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 text-slate-400 border-b border-slate-700/60 font-mono text-[10px]">
                            <span className="flex items-center gap-1">
                              <Terminal className="w-3 h-3 text-[#3BB48C]" />
                              {msg.codeSnippet.language}
                            </span>
                            <button
                              onClick={() => handleCopyCode(msg.id, msg.codeSnippet!.code)}
                              className="flex items-center gap-1 hover:text-white transition cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-[#3BB48C]" />
                                  <span className="text-[#3BB48C] font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-3 font-mono text-[#3BB48C] overflow-x-auto text-[10.5px] leading-snug">
                            {msg.codeSnippet.code}
                          </pre>
                        </div>
                      )}

                      {/* Action Link button */}
                      {msg.actionLink && (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate(msg.actionLink!.path);
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#EBF8F4] text-[#1A7456] hover:bg-[#D5F2E8] font-bold text-[11px] border border-[#BCE9DA] transition-all cursor-pointer shadow-2xs"
                        >
                          <span>{msg.actionLink.label}</span>
                          <ArrowRight className="w-3 h-3 text-[#1A7456]" />
                        </button>
                      )}

                      <div className="text-[9px] text-slate-400 mt-1.5 font-mono text-right">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[#EBF8F4] border border-[#BCE9DA] flex items-center justify-center shrink-0 shadow-2xs">
                      <Bot className="w-4 h-4 text-[#1A7456]" />
                    </div>
                    <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3BB48C] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Pills with Brand Icons */}
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {SUGGESTED_QUESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      className="shrink-0 flex items-center gap-1.5 text-[10.5px] font-semibold px-3 py-1.5 rounded-full bg-white hover:bg-[#EBF8F4] hover:text-[#1A7456] hover:border-[#3BB48C] border border-slate-200 text-slate-700 transition shadow-2xs cursor-pointer group"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#3BB48C] group-hover:scale-110 transition-transform" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask MLite AI about models, drift, or CLI..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3BB48C] focus:bg-white focus:ring-2 focus:ring-[#3BB48C]/15 transition"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuery.trim() || isTyping}
                  className="w-10 h-10 rounded-2xl bg-[#3BB48C] hover:bg-[#329F7B] disabled:opacity-40 text-white flex items-center justify-center transition shadow-md shadow-[#3BB48C]/25 cursor-pointer shrink-0 hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Floating Launcher Trigger Pill ── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isMinimized) setIsMinimized(false);
        }}
        className="group relative flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-full bg-slate-900 hover:bg-[#0B1E2D] text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 cursor-pointer border border-[#3BB48C]/40"
        style={{
          boxShadow: "0 10px 30px -5px rgba(11, 30, 45, 0.4), 0 0 20px rgba(59, 180, 140, 0.25)",
        }}
      >
        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-[#3BB48C] to-teal-300 text-white p-1">
          <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
        </div>
        <span className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5">
          Ask MLite AI
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3BB48C] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3BB48C]" />
          </span>
        </span>
      </button>
    </div>
  );
};
