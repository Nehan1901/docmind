import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

const API = "docmind-production.up.railway.app";

interface Message {
  role: "user" | "ai";
  text: string;
  sources?: { page: number; doc: string }[];
  liked?: boolean;
  timestamp: Date;
}

interface DocInfo {
  name: string;
  pages: number;
  uploadedAt: Date;
}

type Modal = "none" | "settings" | "help" | "privacy" | "docinfo" | "search";

// Icon component using Material Symbols
const Icon = ({
  name,
  fill = false,
  size = 24,
  color,
}: {
  name: string;
  fill?: boolean;
  size?: number;
  color?: string;
}) => (
  <span
    style={{
      fontFamily: "Material Symbols Outlined",
      fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
      fontSize: `${size}px`,
      lineHeight: 1,
      display: "inline-flex",
      color,
      userSelect: "none" as const,
      flexShrink: 0,
    }}
  >
    {name}
  </span>
);

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface AppProps {
  user: { id: string; email: string; username: string };
  onLogout: () => void;
}

function ProfileDropdown({
  user,
  onLogout,
  onClose,
}: {
  user: AppProps["user"];
  onLogout: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "56px",
        right: "0",
        width: "240px",
        background: "#131b2e",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        zIndex: 200,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg,#3B82F6,#2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "white",
              fontFamily: "Manrope,sans-serif",
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: "14px",
              color: "#dae2fd",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.username}
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "#8c909f",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </p>
        </div>
      </div>
      <div style={{ padding: "8px" }}>
        {[
          { icon: "person", label: "Edit Profile" },
          { icon: "key", label: "Change Password" },
          { icon: "notifications", label: "Notifications" },
          { icon: "help_outline", label: "Help & Support" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={onClose}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "none",
              border: "none",
              color: "#c2c6d6",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter,sans-serif",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Icon name={item.icon} color="#8c909f" />
            {item.label}
          </button>
        ))}
        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.06)",
            margin: "6px 0",
          }}
        />
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderRadius: "10px",
            background: "none",
            border: "none",
            color: "#fca5a5",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter,sans-serif",
            textAlign: "left",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <Icon name="logout" color="#ef4444" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function DocPreviewModal({
  docName,
  onClose,
}: {
  docName: string;
  onClose: () => void;
}) {
  const pdfUrl = `https://docmind-production.up.railway.app/document/${encodeURIComponent(docName)}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#131b2e",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#3B82F6",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="description" color="white" size={20} />
            </div>
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#dae2fd",
                  maxWidth: "320px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {docName}
              </p>
              <p style={{ fontSize: "11px", color: "#8c909f" }}>PDF Document</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8c909f",
              cursor: "pointer",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* PDF Preview */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            background: "#0b1326",
            minHeight: "400px",
          }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=0`}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "400px",
              border: "none",
            }}
            title={docName}
          />
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "#3B82F6",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            <Icon name="open_in_new" size={16} color="#3B82F6" />
            View Full Page
          </a>
          <a
            href={pdfUrl}
            download={docName}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "12px",
              background: "#3B82F6",
              border: "none",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            <Icon name="download" size={16} color="white" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App({ user, onLogout }: AppProps) {
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<Modal>("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { answer: string; doc: string; sources: { page: number; doc: string }[] }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".pdf")) {
        alert("Only PDF files are supported.");
        return;
      }
      if (docs.find((d) => d.name === file.name)) {
        setSelectedDoc(file.name);
        return;
      }
      setUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await axios.post(`${API}/upload`, formData, {
          onUploadProgress: (e) => {
            if (e.total)
              setUploadProgress(Math.round((e.loaded * 100) / e.total));
          },
        });
        setDocs((prev) => [
          ...prev,
          { name: file.name, pages: res.data.pages, uploadedAt: new Date() },
        ]);
        setSelectedDoc(file.name);
        setMessages([]);
      } catch {
        alert("Upload failed. Make sure backend is running.");
      }
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [docs],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  const removeDoc = (docName: string) => {
    setDocs((prev) => prev.filter((d) => d.name !== docName));
    if (selectedDoc === docName) {
      const remaining = docs.filter((d) => d.name !== docName);
      setSelectedDoc(
        remaining.length > 0 ? remaining[remaining.length - 1].name : null,
      );
      setMessages([]);
    }
  };

  const handleAsk = async (q?: string) => {
    const query = q || question;
    if (!query.trim() || !selectedDoc) return;
    const userMsg: Message = {
      role: "user",
      text: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/query`, {
        question: query,
        doc_name: selectedDoc,
      });
      const aiMsg: Message = {
        role: "ai",
        text: res.data.answer,
        sources: res.data.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    }
    setLoading(false);
  };

  // Multi-doc search: queries ALL docs and returns answers with source doc
  const handleMultiSearch = async () => {
    if (!searchQuery.trim() || docs.length === 0) return;
    setSearching(true);
    setSearchResults([]);
    const results: {
      answer: string;
      doc: string;
      sources: { page: number; doc: string }[];
    }[] = [];
    for (const doc of docs) {
      try {
        const res = await axios.post(`${API}/query`, {
          question: searchQuery,
          doc_name: doc.name,
        });
        if (res.data.answer && !res.data.answer.includes("couldn't find")) {
          results.push({
            answer: res.data.answer,
            doc: doc.name,
            sources: res.data.sources || [],
          });
        }
      } catch {
        /* skip failed docs */
      }
    }
    setSearchResults(
      results.length > 0
        ? results
        : [
          {
            answer:
              "No relevant information found across any uploaded documents.",
            doc: "All Documents",
            sources: [],
          },
        ],
    );
    setSearching(false);
  };

  const handleRegenerate = async (index: number) => {
    const userMsg = messages[index - 1];
    if (!userMsg || userMsg.role !== "user" || !selectedDoc) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/query`, {
        question: userMsg.text,
        doc_name: selectedDoc,
      });
      setMessages((prev) => {
        const u = [...prev];
        u[index] = {
          role: "ai",
          text: res.data.answer,
          sources: res.data.sources,
          timestamp: new Date(),
        };
        return u;
      });
    } catch {
      setMessages((prev) => {
        const u = [...prev];
        u[index] = { ...u[index], text: "Regeneration failed." };
        return u;
      });
    }
    setLoading(false);
  };

  const handleLike = (i: number) =>
    setMessages((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, liked: !m.liked } : m)),
    );

  const copyText = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  const closeModal = () => {
    setModal("none");
    setSearchQuery("");
    setSearchResults([]);
  };

  const selectedDocInfo = docs.find((d) => d.name === selectedDoc);
  const quickActions = [
    "Summarize Key Points",
    "Identify Risky Clauses",
    "Extract Data Table",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0b1326;color:#dae2fd;font-family:'Inter',sans-serif}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.25);border-radius:4px}
        .glass{background:rgba(34,42,61,0.45);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.06)}
        .upload-zone{border:2px dashed rgba(59,130,246,0.25);border-radius:16px;padding:24px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;transition:all 0.2s;background:transparent}
        .upload-zone:hover,.upload-zone.drag{background:rgba(59,130,246,0.06)!important;border-color:rgba(59,130,246,0.5)!important;box-shadow:0 0 24px rgba(59,130,246,0.12)}
        .doc-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:all 0.2s;border:1px solid transparent}
        .doc-item:hover{background:rgba(255,255,255,0.04)}
        .doc-item.active{background:rgba(59,130,246,0.1);border-color:rgba(59,130,246,0.2)}
        .remove-btn{opacity:0;transition:opacity 0.2s;background:none;border:none;cursor:pointer;color:#8c909f;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;flex-shrink:0}
        .remove-btn:hover{background:rgba(239,68,68,0.15)!important;color:#ef4444!important}
        .doc-item:hover .remove-btn{opacity:1}
        .nav-link{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:12px;color:#8c909f;font-size:14px;background:none;border:none;cursor:pointer;transition:all 0.2s;text-align:left;text-decoration:none;width:100%}
        .nav-link:hover{background:rgba(255,255,255,0.05)!important;color:#dae2fd!important}
        .icon-btn{width:40px;height:40px;border-radius:50%;background:none;border:none;color:#8c909f;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
        .icon-btn:hover:not(:disabled){background:rgba(255,255,255,0.07)!important;color:#3B82F6!important}
        .icon-btn:disabled{opacity:0.35;cursor:not-allowed}
        .citation{display:flex;align-items:center;gap:7px;background:rgba(59,130,246,0.1);padding:6px 14px;border-radius:999px;border:1px solid rgba(59,130,246,0.2);cursor:pointer;transition:all 0.2s}
        .citation:hover{background:rgba(59,130,246,0.2)!important}
        .action-btn{display:flex;align-items:center;gap:7px;background:none;border:none;color:#8c909f;cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;transition:color 0.2s;padding:4px 0}
        .action-btn:hover{color:#3B82F6!important}
        .quick-btn{padding:8px 16px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07);color:#8c909f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif}
        .quick-btn:hover:not(:disabled){background:rgba(59,130,246,0.1)!important;color:#3B82F6!important;border-color:rgba(59,130,246,0.3)!important}
        .quick-btn:disabled{opacity:0.3;cursor:not-allowed}
        .send-btn{width:52px;height:52px;background:#3B82F6;border:none;border-radius:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 20px rgba(37,99,235,0.4);transition:all 0.2s;flex-shrink:0}
        .send-btn:hover:not(:disabled){background:#2563eb!important;transform:scale(1.05)}
        .send-btn:active:not(:disabled){transform:scale(0.95)}
        .send-btn:disabled{opacity:0.4;cursor:not-allowed}
        .input-wrap:focus-within .iglow{opacity:1!important}
        .input-wrap:focus-within .ibox{border-color:rgba(59,130,246,0.5)!important;background:#1a233a!important}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px}
        .modal-box{background:#131b2e;border:1px solid rgba(255,255,255,0.08);border-radius:24px;width:100%;max-width:600px;max-height:88vh;overflow-y:auto;padding:40px;position:relative}
        .modal-close{background:none;border:none;color:#8c909f;cursor:pointer;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;transition:background 0.2s}
        .modal-close:hover{background:rgba(255,255,255,0.1)!important}
        .setting-row{display:flex;align-items:center;justify-content:space-between;padding:13px 12px;border-radius:12px;transition:background 0.15s;margin-bottom:3px}
        .setting-row:hover{background:rgba(255,255,255,0.04)!important}
        .progress-bar{height:3px;background:rgba(59,130,246,0.2);border-radius:2px;overflow:hidden;margin-top:10px}
        .progress-fill{height:100%;background:linear-gradient(to right,#3B82F6,#60a5fa);border-radius:2px;transition:width 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:fadeIn 0.25s ease forwards}
        @keyframes pulse{0%,100%{opacity:0.25}50%{opacity:1}}
        .dot{width:8px;height:8px;background:#3B82F6;border-radius:50%;animation:pulse 1.4s ease infinite}
        .dot:nth-child(2){animation-delay:0.2s}
        .dot:nth-child(3){animation-delay:0.4s}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{display:inline-flex;animation:spin 0.8s linear infinite}
        input::placeholder{color:rgba(194,198,214,0.35)}
        input:focus{outline:none}
        .search-result{background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.15);border-radius:14px;padding:20px;margin-bottom:16px}
        .doc-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);padding:5px 12px;border-radius:999px;margin-bottom:12px}
        .preview-btn:hover { background:rgba(59,130,246,0.2)!important; }      
        `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* ── SIDEBAR ── */}
        <aside
          style={{
            width: sidebarOpen ? "300px" : "0px",
            minWidth: sidebarOpen ? "300px" : "0px",
            background: "#0e1629",
            borderRight: sidebarOpen
              ? "1px solid rgba(255,255,255,0.05)"
              : "none",
            display: "flex",
            flexDirection: "column",
            padding: sidebarOpen ? "28px 0" : "0",
            overflow: "hidden",
            transition: "all 0.3s ease",
            flexShrink: 0,
            zIndex: 40,
          }}
        >
          {sidebarOpen && (
            <>
              {/* Brand */}
              <div
                style={{
                  padding: "0 24px",
                  marginBottom: "32px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    minWidth: "44px",
                    background: "linear-gradient(135deg,#3B82F6,#2563eb)",
                    borderRadius: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 20px rgba(37,99,235,0.35)",
                  }}
                >
                  <Icon name="psychology" fill size={24} color="white" />
                </div>
                <div>
                  <h1
                    style={{
                      fontFamily: "Manrope,sans-serif",
                      fontWeight: 800,
                      fontSize: "19px",
                      color: "white",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    DocMind AI
                  </h1>
                  <p
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#3B82F6",
                      textTransform: "uppercase",
                      letterSpacing: "0.22em",
                      marginTop: "5px",
                    }}
                  >
                    Digital Curator
                  </p>
                </div>
              </div>

              {/* Upload Zone */}
              <div style={{ padding: "0 20px", marginBottom: "24px" }}>
                <div
                  className={`upload-zone${dragOver ? " drag" : ""}`}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: dragOver
                        ? "rgba(59,130,246,0.15)"
                        : "rgba(59,130,246,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon
                      name={dragOver ? "file_download" : "cloud_upload"}
                      color="#3B82F6"
                      size={22}
                    />
                  </div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#dae2fd",
                      marginBottom: "3px",
                    }}
                  >
                    {uploading
                      ? "Processing..."
                      : dragOver
                        ? "Drop to upload"
                        : "Upload Document"}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#8c909f",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 600,
                    }}
                  >
                    {uploading ? "" : "Click or drag & drop · PDF only"}
                  </p>
                  {uploading && (
                    <div style={{ width: "100%", marginTop: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#8c909f" }}>
                          Uploading...
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#3B82F6",
                            fontWeight: 700,
                          }}
                        >
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={handleFileInput}
                />
              </div>

              {/* Documents List */}
              {docs.length > 0 && (
                <div style={{ padding: "0 20px", marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                      paddingLeft: "4px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "rgba(194,198,214,0.5)",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                      }}
                    >
                      Documents ({docs.length})
                    </p>
                    <button
                      onClick={() => setModal("search")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        color: "#3B82F6",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      <Icon name="manage_search" size={15} color="#3B82F6" />
                      Search all
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {docs.map((doc) => (
                      <div
                        key={doc.name}
                        className={`doc-item${selectedDoc === doc.name ? " active" : ""}`}
                        onClick={() => {
                          setSelectedDoc(doc.name);
                          setMessages([]);
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            background:
                              selectedDoc === doc.name
                                ? "#3B82F6"
                                : "rgba(59,130,246,0.1)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.2s",
                          }}
                        >
                          <Icon
                            name="description"
                            color={
                              selectedDoc === doc.name ? "white" : "#3B82F6"
                            }
                            size={16}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color:
                                selectedDoc === doc.name
                                  ? "#dae2fd"
                                  : "#a0aec0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {doc.name}
                          </p>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "rgba(59,130,246,0.7)",
                            }}
                          >
                            {doc.pages} pages
                          </p>
                        </div>
                        {selectedDoc === doc.name && (
                          <Icon
                            name="check_circle"
                            fill
                            size={14}
                            color="#4ade80"
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDoc(doc.name);
                          }}
                          title="Preview document"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0,
                            transition: "opacity 0.2s",
                            padding: "2px",
                          }}
                          className="preview-btn"
                        >
                          <Icon name="visibility" size={14} color="#8c909f" />
                        </button>{" "}
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDoc(doc.name);
                          }}
                          title="Remove document"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nav */}
              <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(194,198,214,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    marginBottom: "10px",
                    paddingLeft: "16px",
                  }}
                >
                  Navigation
                </p>
                <a
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    color: "#3B82F6",
                    fontWeight: 600,
                    fontSize: "13px",
                    textDecoration: "none",
                    marginBottom: "3px",
                  }}
                >
                  <Icon name="folder" fill size={18} color="#3B82F6" />
                  Library
                </a>
                <a href="#" className="nav-link" style={{ fontSize: "13px" }}>
                  <Icon name="history" size={18} />
                  Recent
                </a>
              </nav>

              {/* Footer */}
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  padding: "14px 16px 0",
                }}
              >
                {[
                  {
                    icon: "settings",
                    label: "Settings",
                    action: () => setModal("settings"),
                  },
                  {
                    icon: "help_outline",
                    label: "Help Center",
                    action: () => setModal("help"),
                  },
                  {
                    icon: "privacy_tip",
                    label: "Privacy Policy",
                    action: () => setModal("privacy"),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="nav-link"
                    onClick={item.action}
                    style={{ marginBottom: "2px", fontSize: "13px" }}
                  >
                    <Icon name={item.icon} size={18} />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ── MAIN ── */}
        <main
          style={{
            flex: 1,
            background: "#0b1326",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── HEADER ── */}
          <header
            style={{
              height: "68px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 36px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(11,19,38,0.9)",
              backdropFilter: "blur(16px)",
              flexShrink: 0,
            }}
          >
            {/* Left: menu toggle */}
            <button
              className="icon-btn"
              onClick={() => setSidebarOpen((p) => !p)}
              style={{ borderRadius: "10px" }}
            >
              <Icon name={sidebarOpen ? "menu_open" : "menu"} />
            </button>

            {/* Center: doc badge */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {selectedDocInfo ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.18)",
                    borderRadius: "999px",
                    padding: "7px 16px 7px 10px",
                  }}
                >
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      background: "#3B82F6",
                      borderRadius: "7px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="description" color="white" size={14} />
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#dae2fd",
                      fontFamily: "Manrope,sans-serif",
                      maxWidth: "260px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedDocInfo.name}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(59,130,246,0.8)",
                      fontWeight: 600,
                      background: "rgba(59,130,246,0.12)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {selectedDocInfo.pages}p
                  </span>
                  <Icon name="check_circle" fill size={14} color="#4ade80" />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: 0.45,
                  }}
                >
                  <Icon name="psychology" fill size={20} color="#3B82F6" />
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#dae2fd",
                      fontFamily: "Manrope,sans-serif",
                    }}
                  >
                    DocMind AI
                  </span>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                position: "relative",
              }}
            >
              <button
                className="icon-btn"
                onClick={() => docs.length > 0 && setModal("search")}
                disabled={docs.length === 0}
                title="Search across all documents"
              >
                <Icon name="manage_search" size={20} />
              </button>
              <button
                className="icon-btn"
                onClick={() => selectedDoc && setModal("docinfo")}
                disabled={!selectedDoc}
                title="Document info"
              >
                <Icon name="description" size={20} />
              </button>
              <div
                onClick={() => setShowProfile((p) => !p)}
                title="Account"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#3B82F6,#2563eb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  marginLeft: "6px",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "white",
                    fontFamily: "Manrope,sans-serif",
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              {showProfile && (
                <>
                  <div
                    onClick={() => setShowProfile(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 199 }}
                  />
                  <ProfileDropdown
                    user={user}
                    onLogout={onLogout}
                    onClose={() => setShowProfile(false)}
                  />
                </>
              )}
            </div>
          </header>

          {/* Messages */}
          <section style={{ flex: 1, overflowY: "auto", padding: "36px" }}>
            <div
              style={{
                maxWidth: "840px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: "36px",
                paddingBottom: "60px",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "340px",
                    gap: "14px",
                    opacity: 0.35,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      background: "linear-gradient(135deg,#3B82F6,#2563eb)",
                      borderRadius: "17px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="psychology" fill size={30} color="white" />
                  </div>
                  <p
                    style={{
                      fontFamily: "Manrope,sans-serif",
                      fontWeight: 800,
                      fontSize: "19px",
                    }}
                  >
                    {selectedDoc
                      ? "Ask anything about your document"
                      : "Upload a document to get started"}
                  </p>
                  <p style={{ fontSize: "13px", color: "#8c909f" }}>
                    {docs.length > 1
                      ? `${docs.length} documents loaded · use Search All to query across all`
                      : "DocMind answers with source page citations"}
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="msg">
                  {msg.role === "user" ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          background: "#1a233a",
                          padding: "15px 22px",
                          borderRadius: "20px 20px 4px 20px",
                          maxWidth: "70%",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            lineHeight: 1.65,
                            fontWeight: 500,
                          }}
                        >
                          {msg.text}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "rgba(194,198,214,0.3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                          fontWeight: 700,
                          marginRight: "4px",
                        }}
                      >
                        You · {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{ display: "flex", gap: "16px", width: "100%" }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          flexShrink: 0,
                          background: "linear-gradient(135deg,#3B82F6,#2563eb)",
                          borderRadius: "11px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 6px 18px rgba(37,99,235,0.3)",
                          marginTop: "3px",
                        }}
                      >
                        <Icon
                          name="auto_awesome"
                          fill
                          size={19}
                          color="white"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          className="glass"
                          style={{
                            padding: "24px 32px",
                            borderRadius: "20px 20px 20px 4px",
                            boxShadow: "0 14px 40px rgba(0,0,0,0.22)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "14px",
                              lineHeight: 1.8,
                              fontWeight: 500,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {msg.text}
                          </p>
                          {msg.sources && msg.sources.length > 0 && (
                            <div
                              style={{
                                marginTop: "18px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "7px",
                              }}
                            >
                              {[...new Set(msg.sources.map((s) => s.page))].map(
                                (page) => (
                                  <div key={page} className="citation">
                                    <Icon
                                      name="bookmark"
                                      fill
                                      size={12}
                                      color="#3B82F6"
                                    />
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#3B82F6",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                      }}
                                    >
                                      Page {page}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "10px",
                            paddingLeft: "4px",
                          }}
                        >
                          <div style={{ display: "flex", gap: "16px" }}>
                            <button
                              className="action-btn"
                              onClick={() => handleLike(i)}
                              style={{
                                color: msg.liked ? "#3B82F6" : "#8c909f",
                              }}
                            >
                              <Icon
                                name="thumb_up"
                                fill={!!msg.liked}
                                size={15}
                              />
                              {msg.liked ? "Liked!" : "Helpful"}
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => copyText(msg.text, i)}
                              style={{
                                color: copied === i ? "#4ade80" : "#8c909f",
                              }}
                            >
                              <Icon
                                name={copied === i ? "check" : "content_copy"}
                                size={15}
                              />
                              {copied === i ? "Copied!" : "Copy"}
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => !loading && handleRegenerate(i)}
                              style={{
                                opacity: loading ? 0.4 : 1,
                                cursor: loading ? "not-allowed" : "pointer",
                              }}
                            >
                              <Icon name="refresh" size={15} />
                              Regenerate
                            </button>
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "rgba(194,198,214,0.3)",
                              fontWeight: 600,
                            }}
                          >
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="msg" style={{ display: "flex", gap: "16px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      flexShrink: 0,
                      background: "linear-gradient(135deg,#3B82F6,#2563eb)",
                      borderRadius: "11px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "3px",
                    }}
                  >
                    <Icon name="auto_awesome" fill size={19} color="white" />
                  </div>
                  <div
                    className="glass"
                    style={{
                      padding: "20px 26px",
                      borderRadius: "20px 20px 20px 4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </section>

          {/* Footer Input */}
          <footer
            style={{
              padding: "10px 36px 24px",
              background: "linear-gradient(to top,#0b1326 50%,transparent)",
              flexShrink: 0,
            }}
          >
            <div style={{ maxWidth: "840px", margin: "0 auto" }}>
              <div
                className="input-wrap"
                style={{ position: "relative", marginBottom: "14px" }}
              >
                <div
                  className="iglow"
                  style={{
                    position: "absolute",
                    inset: "-4px",
                    background:
                      "linear-gradient(to right,rgba(59,130,246,0.18),rgba(37,99,235,0.18))",
                    borderRadius: "32px",
                    filter: "blur(12px)",
                    opacity: 0,
                    transition: "opacity 0.3s",
                    pointerEvents: "none",
                  }}
                />
                <div
                  className="ibox"
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(26,35,58,0.88)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "24px",
                    padding: "8px 8px 8px 24px",
                    border: "1px solid rgba(255,255,255,0.09)",
                    boxShadow: "0 14px 40px rgba(0,0,0,0.3)",
                    transition: "all 0.3s",
                  }}
                >
                  <Icon name="search" color="#8c909f" size={20} />
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleAsk()
                    }
                    placeholder={
                      selectedDoc
                        ? "Ask anything about your document..."
                        : "Upload a document first..."
                    }
                    disabled={!selectedDoc || loading}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#dae2fd",
                      fontSize: "14px",
                      fontWeight: 500,
                      fontFamily: "Inter,sans-serif",
                      padding: "16px 14px",
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={() => handleAsk()}
                    disabled={!selectedDoc || !question.trim() || loading}
                    style={{
                      opacity:
                        !selectedDoc || !question.trim() || loading ? 0.4 : 1,
                    }}
                  >
                    <Icon name="send" fill size={20} color="white" />
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "7px",
                }}
              >
                {quickActions.map((a) => (
                  <button
                    key={a}
                    className="quick-btn"
                    onClick={() => handleAsk(a)}
                    disabled={!selectedDoc || loading}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* ── MULTI-DOC SEARCH MODAL ── */}
      {modal === "search" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "Manrope,sans-serif",
                    fontWeight: 800,
                    fontSize: "22px",
                  }}
                >
                  Search All Documents
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#8c909f",
                    marginTop: "4px",
                  }}
                >
                  {docs.length} document{docs.length !== 1 ? "s" : ""} loaded ·
                  answers will show source doc
                </p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>

            {/* Doc chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
                margin: "18px 0",
              }}
            >
              {docs.map((doc) => (
                <div
                  key={doc.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.18)",
                    padding: "5px 12px",
                    borderRadius: "999px",
                  }}
                >
                  <Icon name="description" size={13} color="#3B82F6" />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#3B82F6",
                    }}
                  >
                    {doc.name}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "22px" }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMultiSearch()}
                placeholder="Ask a question across all documents..."
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "#dae2fd",
                  fontSize: "14px",
                  fontFamily: "Inter,sans-serif",
                }}
              />
              <button
                onClick={handleMultiSearch}
                disabled={!searchQuery.trim() || searching || docs.length === 0}
                style={{
                  background: "#3B82F6",
                  border: "none",
                  borderRadius: "12px",
                  padding: "0 22px",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  opacity: !searchQuery.trim() || searching ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  fontFamily: "Inter,sans-serif",
                }}
              >
                {searching ? (
                  <span className="spin">
                    <Icon name="refresh" size={17} color="white" />
                  </span>
                ) : (
                  <Icon name="search" size={17} color="white" />
                )}
                {searching ? "Searching..." : "Search All"}
              </button>
            </div>

            {searching && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#8c909f",
                  fontSize: "13px",
                }}
              >
                Searching across {docs.length} documents...
              </div>
            )}

            {searchResults.map((result, i) => (
              <div key={i} className="search-result">
                <div className="doc-badge">
                  <Icon name="description" size={13} color="#3B82F6" />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#3B82F6",
                    }}
                  >
                    {result.doc}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.75,
                    color: "#dae2fd",
                  }}
                >
                  {result.answer}
                </p>
                {result.sources.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "12px",
                    }}
                  >
                    {[
                      ...new Set(
                        result.sources.map(
                          (s: { page: number; doc: string }) => s.page,
                        ),
                      ),
                    ].map((page: number) => (
                      <div key={page} className="citation">
                        <Icon name="bookmark" fill size={11} color="#3B82F6" />
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#3B82F6",
                            textTransform: "uppercase",
                          }}
                        >
                          Page {page}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DOC INFO MODAL ── */}
      {modal === "docinfo" && selectedDoc && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Manrope,sans-serif",
                  fontWeight: 800,
                  fontSize: "22px",
                }}
              >
                Document Info
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.15)",
                borderRadius: "16px",
                padding: "18px",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  background: "#3B82F6",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="description" color="white" size={24} />
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#dae2fd",
                    marginBottom: "5px",
                  }}
                >
                  {selectedDoc}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#4ade80",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Icon name="check_circle" fill size={14} color="#4ade80" />
                  Processed & Ready
                </p>
              </div>
            </div>
            {[
              { label: "File Name", value: selectedDoc },
              {
                label: "Total Pages",
                value: `${selectedDocInfo?.pages || "N/A"} pages`,
              },
              { label: "File Type", value: "PDF Document" },
              { label: "Storage", value: "Local ChromaDB" },
              {
                label: "Uploaded",
                value: selectedDocInfo
                  ? selectedDocInfo.uploadedAt.toLocaleTimeString()
                  : "N/A",
              },
              {
                label: "Questions Asked",
                value: `${messages.filter((m) => m.role === "user").length}`,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="setting-row"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span style={{ fontSize: "13px", color: "#8c909f" }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#dae2fd",
                    fontWeight: 600,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
            {docs.length > 1 && (
              <div style={{ marginTop: "22px" }}>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(194,198,214,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "10px",
                  }}
                >
                  All Documents
                </p>
                {docs.map((doc) => (
                  <div
                    key={doc.name}
                    onClick={() => {
                      setSelectedDoc(doc.name);
                      setMessages([]);
                      closeModal();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background:
                        doc.name === selectedDoc
                          ? "rgba(59,130,246,0.1)"
                          : "transparent",
                      border:
                        doc.name === selectedDoc
                          ? "1px solid rgba(59,130,246,0.2)"
                          : "1px solid transparent",
                      marginBottom: "5px",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon
                      name="article"
                      size={17}
                      color={doc.name === selectedDoc ? "#3B82F6" : "#8c909f"}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: doc.name === selectedDoc ? "#dae2fd" : "#8c909f",
                        flex: 1,
                      }}
                    >
                      {doc.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "#8c909f" }}>
                      {doc.pages}p
                    </span>
                    {doc.name === selectedDoc && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#3B82F6",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {modal === "settings" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "28px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Manrope,sans-serif",
                  fontWeight: 800,
                  fontSize: "22px",
                }}
              >
                Settings
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>
            {[
              {
                section: "Appearance",
                items: [
                  { label: "Theme", value: "Dark Mode", icon: "dark_mode" },
                  { label: "Language", value: "English", icon: "language" },
                ],
              },
              {
                section: "AI Behaviour",
                items: [
                  { label: "Response Style", value: "Detailed", icon: "tune" },
                  {
                    label: "Citation Mode",
                    value: "Always show pages",
                    icon: "bookmark",
                  },
                  {
                    label: "Model",
                    value: "Claude Sonnet",
                    icon: "psychology",
                  },
                ],
              },
              {
                section: "Data",
                items: [
                  {
                    label: "Clear Chat History",
                    value: "Click to clear",
                    icon: "delete_sweep",
                    danger: true,
                    action: () => {
                      setMessages([]);
                      closeModal();
                    },
                  },
                  {
                    label: "Remove All Documents",
                    value: "Click to remove",
                    icon: "folder_delete",
                    danger: true,
                    action: () => {
                      setDocs([]);
                      setSelectedDoc(null);
                      setMessages([]);
                      closeModal();
                    },
                  },
                ],
              },
            ].map((group) => (
              <div key={group.section} style={{ marginBottom: "22px" }}>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(194,198,214,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    marginBottom: "8px",
                  }}
                >
                  {group.section}
                </p>
                {group.items.map(
                  (item: {
                    label: string;
                    value: string;
                    icon: string;
                    danger?: boolean;
                    action?: () => void;
                  }) => (
                    <div
                      key={item.label}
                      className="setting-row"
                      onClick={item.action}
                      style={{ cursor: item.action ? "pointer" : "default" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <Icon name={item.icon} color="#3B82F6" size={19} />
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>
                          {item.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: item.danger ? "#ef4444" : "#8c909f",
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HELP CENTER MODAL ── */}
      {modal === "help" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Manrope,sans-serif",
                  fontWeight: 800,
                  fontSize: "22px",
                }}
              >
                Help Center
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>
            {[
              {
                q: "How do I upload a document?",
                a: "Click the upload zone in the sidebar or drag & drop a PDF directly onto it. DocMind processes and embeds it automatically into the vector database.",
              },
              {
                q: "Can I upload multiple documents?",
                a: "Yes! Upload as many PDFs as you need. All documents are listed in the sidebar. Click any to switch to it, or use 'Search All' to query across all documents at once.",
              },
              {
                q: "How does multi-document search work?",
                a: "Click 'Search All' in the sidebar or the search icon in the header. Your question is sent to each document separately and results are shown with the source document clearly labeled.",
              },
              {
                q: "What do the page citation badges mean?",
                a: "The blue 'Page X' badges below each AI answer show exactly which pages the answer came from so you can verify in the original document.",
              },
              {
                q: "How do I remove a document?",
                a: "Hover over any document in the sidebar list and click the ✕ button that appears on the right side of the document row.",
              },
              {
                q: "What are the Quick Action buttons?",
                a: "Summarize Key Points, Identify Risky Clauses, and Extract Data Table are one-click prompts that run common document analysis tasks instantly.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "14px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "13px",
                    marginBottom: "7px",
                    display: "flex",
                    gap: "9px",
                  }}
                >
                  <span style={{ color: "#3B82F6", flexShrink: 0 }}>Q.</span>
                  {faq.q}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.75,
                    color: "#8c909f",
                    paddingLeft: "20px",
                  }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRIVACY MODAL ── */}
      {modal === "privacy" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Manrope,sans-serif",
                  fontWeight: 800,
                  fontSize: "22px",
                }}
              >
                Privacy Policy
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>
            <p
              style={{
                fontSize: "11px",
                color: "#8c909f",
                marginBottom: "22px",
              }}
            >
              Last updated: March 2026
            </p>
            {[
              {
                title: "Data Collection",
                body: "DocMind processes your PDFs locally. Documents are chunked, embedded, and stored in a local ChromaDB vector database on your machine. No document content is sent to external servers beyond AI inference.",
              },
              {
                title: "AI Processing",
                body: "Your questions and relevant document excerpts are sent to the Anthropic Claude API to generate responses. Anthropic's privacy policy applies. DocMind does not store query history permanently.",
              },
              {
                title: "Local Storage",
                body: "All embeddings are in the local chroma_db folder and uploads in the uploads folder inside the backend. Deleting these folders removes all your data completely.",
              },
              {
                title: "Third-Party Services",
                body: "Only the Anthropic Claude API is used for AI responses. No analytics, advertising or other third-party services have access to your data.",
              },
              {
                title: "Your Rights",
                body: "Delete all documents and history anytime via Settings → Data. Stopping the backend server clears all data from active memory immediately.",
              },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: "18px" }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      background: "rgba(59,130,246,0.14)",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      color: "#3B82F6",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  {s.title}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.8,
                    color: "#8c909f",
                    paddingLeft: "31px",
                  }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {previewDoc && (
        <DocPreviewModal
          docName={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}
