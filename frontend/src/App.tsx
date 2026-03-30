import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

// const API = "docmind-production.up.railway.app";
const API = "http://localhost:8000";


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
  fileData?: string;
}

type Modal = "none" | "settings" | "help" | "privacy" | "docinfo" | "search";
type StreamTarget = { type: "append" } | { type: "replace"; index: number };
type ToastVariant = "success" | "info";

interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface RecentDoc {
  name: string;
  pages: number;
  lastMessage: string;
  lastChatAt: Date;
}

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

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "yesterday"
  return `${diffDays}d ago`
}

interface AppProps {
  user: { id: string; email: string; username: string };
  onLogout: () => void;
}

type ThemeMode = "dark" | "light";

interface ThemeTokens {
  bg: string;
  sidebar: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  inputBg: string;
  glass: string;
  accentAlt: string;
  accentSoft: string;
  accentBorder: string;
  accentGradient: string;
  bodyOverlay: string;
  modalOverlay: string;
  pdfBg: string;
  shadow: string;
  shadowStrong: string;
  sidebarShadow: string;
  cardShadow: string;
  inputBorder: string;
  hover: string;
  hoverStrong: string;
  hoverAccent: string;
  textSoft: string;
  textStamp: string;
  textDim: string;
  success: string;
  successSoft: string;
  successBg: string;
  successBorder: string;
  danger: string;
  dangerSoft: string;
  dangerBg: string;
  dangerBorder: string;
  divider: string;
  dividerSoft: string;
  headerBg: string;
  footerFade: string;
  glow: string;
}

const themeTokens: Record<ThemeMode, ThemeTokens> = {
  dark: {
    bg: "#0b1326",
    sidebar: "#0e1629",
    card: "#131b2e",
    cardAlt: "#1a233a",
    border: "rgba(255,255,255,0.06)",
    text: "#dae2fd",
    textMuted: "#8c909f",
    accent: "#3B82F6",
    inputBg: "rgba(26,35,58,0.88)",
    glass: "rgba(34,42,61,0.45)",
    accentAlt: "#2563eb",
    accentSoft: "rgba(59,130,246,0.1)",
    accentBorder: "rgba(59,130,246,0.2)",
    accentGradient: "linear-gradient(135deg,#3B82F6,#2563eb)",
    bodyOverlay: "rgba(0,0,0,0.78)",
    modalOverlay: "rgba(0,0,0,0.85)",
    pdfBg: "#060e20",
    shadow: "0 14px 40px rgba(0,0,0,0.3)",
    shadowStrong: "0 32px 80px rgba(0,0,0,0.6)",
    sidebarShadow: "none",
    cardShadow: "none",
    inputBorder: "1px solid rgba(255,255,255,0.09)",
    hover: "rgba(255,255,255,0.04)",
    hoverStrong: "rgba(255,255,255,0.07)",
    hoverAccent: "rgba(59,130,246,0.18)",
    textSoft: "rgba(218,226,253,0.82)",
    textStamp: "rgba(218,226,253,0.3)",
    textDim: "rgba(218,226,253,0.45)",
    success: "#4ade80",
    successSoft: "#86efac",
    successBg: "rgba(74,222,128,0.1)",
    successBorder: "rgba(74,222,128,0.2)",
    danger: "#ef4444",
    dangerSoft: "#fca5a5",
    dangerBg: "rgba(239,68,68,0.08)",
    dangerBorder: "rgba(239,68,68,0.2)",
    divider: "rgba(255,255,255,0.06)",
    dividerSoft: "rgba(255,255,255,0.04)",
    headerBg: "rgba(11,19,38,0.9)",
    footerFade: "linear-gradient(to top,#0b1326 50%,transparent)",
    glow: "linear-gradient(to right,rgba(59,130,246,0.18),rgba(37,99,235,0.18))",
  },
  light: {
    bg: "#f0f4ff",
    sidebar: "#ffffff",
    card: "#ffffff",
    cardAlt: "#f8faff",
    border: "rgba(0,0,0,0.08)",
    text: "#1a2340",
    textMuted: "#6b7280",
    accent: "#2563eb",
    inputBg: "#ffffff",
    glass: "rgba(255,255,255,0.9)",
    accentAlt: "#1d4ed8",
    accentSoft: "rgba(37,99,235,0.08)",
    accentBorder: "rgba(37,99,235,0.18)",
    accentGradient: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    bodyOverlay: "rgba(15,23,42,0.16)",
    modalOverlay: "rgba(15,23,42,0.22)",
    pdfBg: "#edf3ff",
    shadow: "0 14px 40px rgba(15,23,42,0.12)",
    shadowStrong: "0 24px 60px rgba(15,23,42,0.16)",
    sidebarShadow: "2px 0 12px rgba(0,0,0,0.06)",
    cardShadow: "0 2px 8px rgba(0,0,0,0.06)",
    inputBorder: "1px solid rgba(0,0,0,0.12)",
    hover: "rgba(26,35,64,0.04)",
    hoverStrong: "rgba(26,35,64,0.08)",
    hoverAccent: "rgba(37,99,235,0.14)",
    textSoft: "rgba(26,35,64,0.78)",
    textStamp: "rgba(26,35,64,0.3)",
    textDim: "rgba(26,35,64,0.45)",
    success: "#16a34a",
    successSoft: "#15803d",
    successBg: "rgba(34,197,94,0.1)",
    successBorder: "rgba(34,197,94,0.18)",
    danger: "#dc2626",
    dangerSoft: "#b91c1c",
    dangerBg: "rgba(220,38,38,0.08)",
    dangerBorder: "rgba(220,38,38,0.18)",
    divider: "rgba(0,0,0,0.08)",
    dividerSoft: "rgba(0,0,0,0.05)",
    headerBg: "rgba(240,244,255,0.9)",
    footerFade: "linear-gradient(to top,rgba(240,244,255,0.96) 50%,transparent)",
    glow: "linear-gradient(to right,rgba(37,99,235,0.12),rgba(29,78,216,0.12))",
  },
};

function ProfileDropdown({
  user,
  onLogout,
  onClose,
  T,
}: {
  user: AppProps["user"];
  onLogout: () => void;
  onClose: () => void;
  T: ThemeTokens;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "56px",
        right: "0",
        width: "240px",
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: "16px",
        boxShadow: T.shadowStrong,
        zIndex: 200,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px",
          borderBottom: `1px solid ${T.divider}`,
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
            background: T.accentGradient,
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
              color: "#ffffff",
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
              color: T.text,
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
              color: T.textMuted,
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
              color: T.textSoft,
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter,sans-serif",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = T.hover)
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Icon name={item.icon} color={T.textMuted} />
            {item.label}
          </button>
        ))}
        <div
          style={{
            height: "1px",
            background: T.divider,
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
            color: T.dangerSoft,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter,sans-serif",
            textAlign: "left",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = T.dangerBg)
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <Icon name="logout" color={T.danger} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function PdfViewer({
  fileData,
  docName,
  T,
}: {
  fileData: string;
  docName: string;
  T: ThemeTokens;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const blob = base64ToBlob(fileData)
    const url = URL.createObjectURL(blob)
    let revoked = false
    Promise.resolve().then(() => {
      if (!revoked) setBlobUrl(url)
    })
    return () => {
      revoked = true
      URL.revokeObjectURL(url)
    }
  }, [fileData])

  if (!blobUrl) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", opacity:0.4 }}>
      <p style={{ color:T.textMuted, fontSize:"14px" }}>Loading preview...</p>
    </div>
  )

  return (
    <iframe
      src={blobUrl}
      style={{ width:"100%", height:"100%", border:"none" }}
      title={docName}
    />
  )
}

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(";base64,")
  const contentType = parts[0].split(":")[1]
  const raw = window.atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  return new Blob([uInt8Array], { type: contentType })
}

function DocPreviewModal({
  docName,
  fileData,
  onClose,
  T,
}: {
  docName: string
  fileData?: string
  onClose: () => void
  T: ThemeTokens
}) {

  const handleDownload = () => {
    if (!fileData) return
    const link = document.createElement("a")
    link.href = fileData
    link.download = docName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const handleViewFullPage = () => {
    if (!fileData) return
    const blob = base64ToBlob(fileData)
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  return (
    <div style={{ position:"fixed", inset:0, background:T.modalOverlay, backdropFilter:"blur(6px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}
      onClick={onClose}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"24px", width:"100%", maxWidth:"700px", height:"85vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:T.shadowStrong }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${T.divider}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"36px", height:"36px", background:T.accent, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="description" color="#ffffff" size={20} />
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:"14px", color:T.text, maxWidth:"340px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{docName}</p>
              <p style={{ fontSize:"11px", color:T.textMuted }}>PDF Document · Click outside to close</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", width:"32px", height:"32px", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* PDF Preview */}
<div style={{ flex:1, overflow:"hidden", background:T.pdfBg }}>
  {fileData ? (
    <PdfViewer fileData={fileData} docName={docName} T={T} />
  ) : (
    <div style={{ display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      height:"100%", gap:"16px", padding:"32px",
      textAlign:"center" }}>
      <div style={{ width:"56px", height:"56px",
        background:"rgba(59,130,246,0.1)",
        borderRadius:"16px", display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <Icon name="upload_file" size={28} color="#3B82F6" />
      </div>
      <div>
        <p style={{ fontWeight:700, fontSize:"15px",
          color:T.text, marginBottom:"8px" }}>
          Re-upload to enable preview
        </p>
        <p style={{ fontSize:"13px", color:T.textMuted,
          lineHeight:1.6 }}>
          PDF preview requires the file to be uploaded
          in the current session. Your chat history
          is fully preserved.
        </p>
      </div>
      <button
        onClick={onClose}
        style={{ background:"#3B82F6", border:"none",
          borderRadius:"10px", padding:"10px 24px",
          color:"white", fontWeight:700, fontSize:"13px",
          cursor:"pointer" }}>
        Got it
      </button>
    </div>
  )}
</div>

        {/* Footer */}
        <div style={{ display:"flex", gap:"12px", padding:"16px 24px", borderTop:`1px solid ${T.divider}`, flexShrink:0 }}>
          <button onClick={fileData ? handleViewFullPage : undefined} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:"12px", borderRadius:"12px", background:T.accentSoft, border:`1px solid ${T.accentBorder}`, color:T.accent, fontSize:"13px", fontWeight:700, opacity: fileData ? 1 : 0.4,
    cursor: fileData ? "pointer" : "not-allowed" }}>
            <Icon name="open_in_new" size={16} color={T.accent} />
            View Full Page
          </button>
          <button onClick={fileData ? handleDownload : undefined} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:"12px", borderRadius:"12px", background:T.accent, border:"none", color:"#ffffff", fontSize:"13px", fontWeight:700, opacity: fileData ? 1 : 0.4,
    cursor: fileData ? "pointer" : "not-allowed" }}>
            <Icon name="download" size={16} color="#ffffff" />
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App({ user, onLogout }: AppProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("docmind_theme");
    return savedTheme === "light" ? "light" : "dark";
  });
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [docHistoryCounts, setDocHistoryCounts] = useState<Record<string, number>>({});
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [activeNav, setActiveNav] = useState<"library" | "recent">("library");
  const [storageReady, setStorageReady] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<Modal>("none");
  const [docSearch, setDocSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults] = useState<
    { answer: string; doc: string; sources: { page: number; doc: string }[] }[]
  >([]);
  const [searching] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docSearchRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)
  const T = themeTokens[theme];
  const previewFileData = useMemo(() => {
    if (!previewDoc) return undefined
    return docs.find(d => d.name === previewDoc)?.fileData
  }, [previewDoc, docs]);

  const handleLogout = () => {
    onLogout();
  };

  const showToast = (message: string, variant: ToastVariant) => {
    setToast({ id: Date.now(), message, variant });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("docmind_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem("docmind_theme", theme);
    document.body.style.background = T.bg;
    return () => {
      document.body.style.background = "";
    };
  }, [theme, T.bg]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!storageReady) return;
    if (selectedDoc) {
      localStorage.setItem("docmind_lastDoc", selectedDoc);
    }
  }, [selectedDoc, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    if (docs.length > 0) {
      const toSave = docs.map((d) => ({
        name: d.name,
        pages: d.pages,
        uploadedAt:
          d.uploadedAt instanceof Date
            ? d.uploadedAt.toISOString()
            : new Date().toISOString(),
      }));
      localStorage.setItem("docmind_docs", JSON.stringify(toSave));
    } else {
      localStorage.removeItem("docmind_docs");
    }
  }, [docs, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    if (recentDocs.length > 0) {
      localStorage.setItem(
        "docmind_recent",
        JSON.stringify(
          recentDocs.map((d) => ({
            ...d,
            lastChatAt: d.lastChatAt.toISOString(),
          })),
        ),
      );
    } else {
      localStorage.removeItem("docmind_recent");
    }
  }, [recentDocs, storageReady]);

  const loadHistory = useCallback(async (docName: string) => {
    const token = localStorage.getItem("docmind_token");
    if (!token) {
      setMessages([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    try {
      const res = await axios.get(
        `${API}/history/${encodeURIComponent(docName)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.messages && res.data.messages.length > 0) {
        const loaded: Message[] = res.data.messages.map((m: any) => ({
          role: m.role as "user" | "ai",
          text: m.content,
          sources: m.sources || [],
          timestamp: new Date(m.created_at),
          liked: false,
        }));
        setMessages(loaded);
        setDocHistoryCounts((prev) => ({ ...prev, [docName]: loaded.length }));
        showToast("Conversation restored", "info");
      } else {
        setMessages([]);
        setDocHistoryCounts((prev) => ({ ...prev, [docName]: 0 }));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
      setMessages([]);
      setDocHistoryCounts((prev) => ({ ...prev, [docName]: 0 }));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadUserDocuments = useCallback(async () => {
    const token = localStorage.getItem("docmind_token")
    if (!token) {
      setLoadingDocs(false)
      return
    }
    setLoadingDocs(true)
    try {
      const res = await axios.get(`${API}/user/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.documents && res.data.documents.length > 0) {
        const restoredDocs = res.data.documents.map(
          (d: any) => ({
            name: d.name,
            pages: 0,
            uploadedAt: new Date(d.last_active),
            fileData: undefined
          })
        )
        setDocs(restoredDocs)
        setRecentDocs([])
        setDocHistoryCounts(
          Object.fromEntries(
            res.data.documents.map((d: any) => [d.name, d.message_count || 0]),
          ),
        )

        const lastDoc = localStorage.getItem("docmind_lastDoc")
        const docToSelect = lastDoc &&
          res.data.documents.find((d: any) => d.name === lastDoc)
          ? lastDoc
          : res.data.documents[0].name

        setSelectedDoc(docToSelect)
        void loadHistory(docToSelect)
      } else {
        setDocs([])
        setRecentDocs([])
        setSelectedDoc(null)
      }
    } catch (err) {
      console.error("Failed to load user documents:", err)
    } finally {
      setLoadingDocs(false)
      setStorageReady(true)
    }
  }, [loadHistory]);

  const handleDocSwitch = useCallback((newDocName: string) => {
    if (selectedDoc && selectedDoc !== newDocName) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        setRecentDocs((prev) => {
          const filtered = prev.filter((d) => d.name !== selectedDoc);
          return [
            {
              name: selectedDoc,
              pages: docs.find((d) => d.name === selectedDoc)?.pages || 0,
              lastMessage:
                lastMsg.text.length > 60
                  ? `${lastMsg.text.slice(0, 60)}...`
                  : lastMsg.text,
              lastChatAt: new Date(),
            },
            ...filtered,
          ].slice(0, 10);
        });
      }
    }
    setSelectedDoc(newDocName);
    void loadHistory(newDocName);
  }, [docs, loadHistory, messages, selectedDoc]);

  useEffect(() => {
    const token = localStorage.getItem("docmind_token")
    if (!token) {
      setLoadingDocs(false)
      return
    }

    void loadUserDocuments()
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pdf")) { alert("Only PDF files are supported."); return }
    setDocSearch("")
    if (docs.find(d => d.name === file.name)) { handleDocSwitch(file.name); return }
    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await axios.post(`${API}/upload`, formData, {
        onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total)) }
      })
      // Read as base64 for preview
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      setDocs(prev => {
        const exists = prev.find(d => d.name === file.name)
        if (exists) {
          return prev.map(d => d.name === file.name ? {
            ...d,
            pages: res.data.pages,
            fileData: fileData,
            uploadedAt: new Date()
          } : d)
        } else {
          return [...prev, {
            name: file.name,
            pages: res.data.pages,
            uploadedAt: new Date(),
            fileData: fileData
          }]
        }
      })
      handleDocSwitch(file.name)
    } catch { alert("Upload failed. Make sure backend is running.") }
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [docs, handleDocSwitch])

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
    setDocHistoryCounts((prev) => {
      const updated = { ...prev };
      delete updated[docName];
      return updated;
    });
    if (selectedDoc === docName) {
      const remaining = docs.filter((d) => d.name !== docName);
      const nextDoc =
        remaining.length > 0 ? remaining[remaining.length - 1].name : null;
      if (nextDoc) {
        handleDocSwitch(nextDoc);
      } else {
        setSelectedDoc(null);
        setMessages([]);
        localStorage.removeItem("docmind_lastDoc");
      }
    }
  };

  const updateStreamMessage = (
    target: StreamTarget,
    updater: (message: Message) => Message,
  ) => {
    setMessages((prev) => {
      const updated = [...prev];
      const index =
        target.type === "replace" ? target.index : updated.length - 1;
      if (index < 0 || index >= updated.length) return prev;
      updated[index] = updater(updated[index]);
      return updated;
    });
  };

  const parseSseData = (eventBlock: string) =>
    eventBlock
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => {
        const value = line.slice(5);
        return value.startsWith(" ") ? value.slice(1) : value;
      })
      .join("\n");

  const streamAnswer = async (query: string, target: StreamTarget) => {
    setLoading(true);
    setIsStreaming(false);
    let fullText = "";
    let finalSources: { page: number; doc: string }[] = [];

    try {
      const response = await fetch(`${API}/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, doc_name: selectedDoc }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming response body is unavailable.");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        while (buffer.includes("\n\n")) {
          const boundary = buffer.indexOf("\n\n");
          const eventBlock = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          if (!eventBlock.trim()) continue;

          const data = parseSseData(eventBlock);
          if (!data) continue;

          if (data === "[DONE]") {
            setIsStreaming(false);
            setLoading(false);
            return { completed: true, text: fullText, sources: finalSources };
          }

          if (data.startsWith("[SOURCES]")) {
            const payload = JSON.parse(data.slice("[SOURCES]".length));
            finalSources = payload.sources || [];
            updateStreamMessage(target, (message) => ({
              ...message,
              sources: finalSources,
            }));
            continue;
          }

          setIsStreaming(true);
          fullText += data;
          updateStreamMessage(target, (message) => ({
            ...message,
            text: message.text + data,
          }));
        }
      }

      throw new Error("Stream ended before completion.");
    } catch {
      updateStreamMessage(target, (message) => ({
        ...message,
        text:
          target.type === "replace"
            ? "Regeneration failed."
            : "Something went wrong. Please try again.",
        sources: [],
      }));
      return { completed: false, text: "", sources: [] as { page: number; doc: string }[] };
    } finally {
      setIsStreaming(false);
      setLoading(false);
      setStreamingMessageIndex(null);
    }
  };

  const handleAsk = async (q?: string) => {
    const query = q || question;
    if (!query.trim() || !selectedDoc) return;
    const targetIndex = messages.length + 1;
    const userMsg: Message = {
      role: "user",
      text: query,
      timestamp: new Date(),
    };
    const aiMsg: Message = {
      role: "ai",
      text: "",
      sources: [],
      timestamp: new Date(),
    };
    setStreamingMessageIndex(targetIndex);
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setQuestion("");
    const result = await streamAnswer(query, { type: "append" });
    if (result.completed) {
      const token = localStorage.getItem("docmind_token");
      if (token && selectedDoc) {
        axios.post(
          `${API}/history`,
          {
            doc_name: selectedDoc,
            role: "user",
            content: query,
            sources: [],
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ).catch((err) => console.error("Failed to save user msg:", err));

        axios.post(
          `${API}/history`,
          {
            doc_name: selectedDoc,
            role: "ai",
            content: result.text,
            sources: result.sources || [],
          },
          { headers: { Authorization: `Bearer ${token}` } },
        )
        .then(() => {
          setDocHistoryCounts((prev) => ({
            ...prev,
            [selectedDoc]: (prev[selectedDoc] || 0) + 2,
          }));
        })
        .catch((err) => console.error("Failed to save AI msg:", err));
      }
    }
  };

  const handleRegenerate = async (index: number) => {
    const userMsg = messages[index - 1];
    if (!userMsg || userMsg.role !== "user" || !selectedDoc) return;
    setStreamingMessageIndex(index);
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        text: "",
        sources: [],
        timestamp: new Date(),
      };
      return updated;
    });
    await streamAnswer(userMsg.text, { type: "replace", index });
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

  const handleMultiSearch = () => {};

  const closeModal = () => {
    setModal("none");
  };

  const selectedDocInfo = docs.find((d) => d.name === selectedDoc);
  const filteredDocs = docSearch
    ? docs.filter((d) =>
        d.name.toLowerCase().includes(docSearch.toLowerCase()))
    : docs.slice(-4);
  const filteredRecentDocs = docSearch
    ? recentDocs.filter((d) =>
        d.name.toLowerCase().includes(docSearch.toLowerCase()))
    : recentDocs;
  const quickActions = [
    "Summarize Key Points",
    "Identify Risky Clauses",
    "Extract Data Table",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        :root{--bg:${T.bg};--bg-sidebar:${T.sidebar};--bg-card:${T.card};--bg-card-alt:${T.cardAlt};--bg-header:${T.headerBg};--bg-msg-user:${T.cardAlt};--bg-input:${T.inputBg};--bg-pdf:${T.pdfBg};--text:${T.text};--text2:${T.textMuted};--text-soft:${T.textSoft};--text-muted:${T.textDim};--text-stamp:${T.textStamp};--border:${T.border};--border2:${T.divider};--border3:${T.border};--border4:${T.inputBorder.replace('1px solid ','')};--border-i:${T.inputBorder.replace('1px solid ','')};--glass:${T.glass};--hover:${T.hover};--hover2:${T.hover};--hover3:${T.hoverStrong};--hover4:${T.hoverStrong};--accent:${T.accent};--accent-alt:${T.accentAlt};--accent-soft:${T.accentSoft};--accent-border:${T.accentBorder};--overlay:${T.bodyOverlay};--hoverAccent:${T.hoverAccent};--success:${T.success};--success-bg:${T.successBg};--danger:${T.danger};--danger-bg:${T.dangerBg};--card-shadow:${T.cardShadow};--sidebar-shadow:${T.sidebarShadow};--panel-shadow:${T.shadow};--send-glow:${theme === "light" ? "0 4px 12px rgba(37,99,235,0.25)" : "0 6px 20px rgba(37,99,235,0.4)"}}

        *{margin:0;padding:0;box-sizing:border-box}
        body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--accent-soft);border-radius:4px}
        .glass{background:var(--glass);backdrop-filter:blur(10px);border:1px solid var(--border2);box-shadow:var(--card-shadow)}
        .upload-zone{border:2px dashed var(--accent-border);border-radius:16px;padding:24px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;transition:all 0.2s;background:transparent}
        .upload-zone:hover,.upload-zone.drag{background:var(--accent-soft)!important;border-color:var(--accent)!important;box-shadow:0 0 24px var(--accent-soft)}
        .doc-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:all 0.2s;border:1px solid transparent}
        .doc-item:hover{background:var(--hover)}
        .doc-item.active{background:var(--accent-soft);border-color:var(--accent-border)}
        .doc-history-badge{display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:3px 8px;border-radius:999px;background:var(--hover);border:1px solid var(--border2);color:var(--text2);font-size:10px;font-weight:700}
        .remove-btn{opacity:1;transition:opacity 0.2s;background:none;border:none;cursor:pointer;color:var(--text2);display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;flex-shrink:0}
        .remove-btn:hover{background:var(--danger-bg)!important;color:var(--danger)!important}
        .doc-item:hover .remove-btn{opacity:1}
        .nav-link{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:12px;color:var(--text2);font-size:14px;background:none;border:none;cursor:pointer;transition:all 0.2s;text-align:left;text-decoration:none;width:100%}
        .nav-link:hover{background:var(--hover2)!important;color:var(--text)!important}
        .icon-btn{width:40px;height:40px;border-radius:50%;background:none;border:none;color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
        .icon-btn:hover:not(:disabled){background:var(--hover3)!important;color:var(--accent)!important}
        .icon-btn:disabled{opacity:0.35;cursor:not-allowed}
        .citation{display:flex;align-items:center;gap:7px;background:var(--accent-soft);padding:6px 14px;border-radius:999px;border:1px solid var(--accent-border);cursor:pointer;transition:all 0.2s}
        .citation:hover{background:var(--hoverAccent)!important}
        .action-btn{display:flex;align-items:center;gap:7px;background:none;border:none;color:var(--text2);cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;transition:color 0.2s;padding:4px 0}
        .action-btn:hover{color:var(--accent)!important}
        .quick-btn{padding:8px 16px;border-radius:999px;background:var(--bg-card-alt);border:1px solid var(--border2);color:var(--text2);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif}
        .quick-btn:hover:not(:disabled){background:var(--accent-soft)!important;color:var(--accent)!important;border-color:var(--accent-border)!important}
        .quick-btn:disabled{opacity:0.3;cursor:not-allowed}
        .send-btn{width:52px;height:52px;background:var(--accent);border:none;border-radius:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--send-glow);transition:all 0.2s;flex-shrink:0}
        .send-btn:hover:not(:disabled){background:var(--accent-alt)!important;transform:scale(1.05)}
        .send-btn:active:not(:disabled){transform:scale(0.95)}
        .send-btn:disabled{opacity:0.4;cursor:not-allowed}
        .input-wrap:focus-within .iglow{opacity:1!important}
        .input-wrap:focus-within .ibox{border-color:var(--accent)!important;background:var(--bg-card-alt)!important}
        .modal-overlay{position:fixed;inset:0;background:var(--overlay);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px}
        .modal-box{background:var(--bg-card);border:1px solid var(--border3);border-radius:24px;width:100%;max-width:600px;max-height:88vh;overflow-y:auto;padding:40px;position:relative;color:var(--text);box-shadow:var(--card-shadow)}
        .modal-close{background:none;border:none;color:var(--text2);cursor:pointer;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;transition:background 0.2s}
        .modal-close:hover{background:var(--hover4)!important}
        .setting-row{display:flex;align-items:center;justify-content:space-between;padding:13px 12px;border-radius:12px;transition:background 0.15s;margin-bottom:3px}
        .setting-row:hover{background:var(--hover)!important}
        .progress-bar{height:3px;background:var(--accent-soft);border-radius:2px;overflow:hidden;margin-top:10px}
        .progress-fill{height:100%;background:linear-gradient(to right,var(--accent),var(--accent-alt));border-radius:2px;transition:width 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:fadeIn 0.25s ease forwards}
        @keyframes pulse{0%,100%{opacity:0.25}50%{opacity:1}}
        .dot{width:8px;height:8px;background:var(--accent);border-radius:50%;animation:pulse 1.4s ease infinite}
        .dot:nth-child(2){animation-delay:0.2s}
        .dot:nth-child(3){animation-delay:0.4s}
        .history-skeleton{background:var(--glass);border:1px solid var(--border2);border-radius:20px;overflow:hidden;position:relative}
        .history-skeleton::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);animation:shimmer 1.4s infinite}
        @keyframes shimmer{100%{transform:translateX(100%)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .cursor{display:inline-block;animation:blink 1s infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{display:inline-flex;animation:spin 0.8s linear infinite}
        .toast{position:fixed;right:24px;bottom:24px;z-index:220;display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:16px;box-shadow:var(--panel-shadow);backdrop-filter:blur(12px);border:1px solid var(--border2);animation:fadeIn 0.2s ease forwards}
        .toast.success{background:var(--success-bg);color:var(--success)}
        .toast.info{background:var(--accent-soft);color:var(--accent)}
        input::placeholder{color:var(--text-muted)}
        input:focus{outline:none}
        .search-result{background:var(--accent-soft);border:1px solid var(--accent-border);border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:var(--card-shadow)}
        .doc-badge{display:inline-flex;align-items:center;gap:6px;background:var(--accent-soft);border:1px solid var(--accent-border);padding:5px 12px;border-radius:999px;margin-bottom:12px}
        .preview-btn:hover{background:var(--hoverAccent)!important;}
        `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* ── SIDEBAR ── */}
        <aside
          style={{
            width: sidebarOpen ? "300px" : "0px",
            minWidth: sidebarOpen ? "300px" : "0px",
            background: T.sidebar,
            borderRight: sidebarOpen
              ? `1px solid ${T.border}`
              : "none",
            boxShadow: sidebarOpen ? T.sidebarShadow : "none",
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
                    background: T.accentGradient,
                    borderRadius: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 20px rgba(37,99,235,0.35)",
                  }}
                >
                  <Icon name="psychology" fill size={24} color="#ffffff" />
                </div>
                <div>
                  <h1
                    style={{
                      fontFamily: "Manrope,sans-serif",
                      fontWeight: 800,
                      fontSize: "19px",
                      color: T.text,
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
                      color: "var(--accent)",
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
                        ? "var(--accent-border)"
                        : "var(--accent-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon
                      name={dragOver ? "file_download" : "cloud_upload"}
                      color="var(--accent)"
                      size={22}
                    />
                  </div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "var(--text)",
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
                      color: "var(--text2)",
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
                        <span style={{ fontSize: "11px", color: "var(--text2)" }}>
                          Uploading...
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--accent)",
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

              <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "14px",
                  }}
                >
                  {[
                    { id: "library", label: "Library", icon: "folder" },
                    { id: "recent", label: "Recent", icon: "history" },
                  ].map((tab) => {
                    const isActive = activeNav === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveNav(tab.id as "library" | "recent")
                          setDocSearch("")
                        }}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          border: `1px solid ${isActive ? "var(--accent-border)" : "transparent"}`,
                          background: isActive ? "var(--hover)" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--text2)",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <Icon
                          name={tab.icon}
                          fill={isActive}
                          size={18}
                          color={isActive ? "var(--accent)" : "var(--text2)"}
                        />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ padding:"0 16px", marginBottom:"10px" }}>
                  <div style={{ display:"flex", alignItems:"center",
                    gap:"8px", background:T.inputBg,
                    border:`1px solid ${T.border}`,
                    borderRadius:"10px", padding:"8px 12px" }}>
                    <Icon name="search" size={15} color={T.textMuted} />
                    <input
                      ref={docSearchRef}
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      placeholder={
                        activeNav === "library"
                          ? "Search documents..."
                          : "Search recent documents..."
                      }
                      style={{ background:"transparent", border:"none",
                        outline:"none", color:T.text, fontSize:"12px",
                        fontFamily:"Inter,sans-serif", flex:1,
                        width:"100%" }}
                    />
                    {docSearch && (
                      <button onClick={() => setDocSearch("")}
                        style={{ background:"none", border:"none",
                          cursor:"pointer", display:"flex",
                          color:T.textMuted }}>
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {activeNav === "library" && (
                  <>
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
                          color: T.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                        }}
                      >
                        Documents ({docs.length})
                      </p>
                    </div>
                    {loadingDocs ? (
                      <div style={{ padding:"12px 16px" }}>
                        {[1,2,3].map(i => (
                          <div key={i} style={{
                            height:"52px",
                            background:T.hover,
                            borderRadius:"12px",
                            marginBottom:"6px",
                            animation: "pulse 1.5s ease infinite"
                          }} />
                        ))}
                      </div>
                    ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      {filteredDocs.map((doc) => (
                        <div
                          key={doc.name}
                          className={`doc-item${selectedDoc === doc.name ? " active" : ""}`}
                          onClick={() => {
                            handleDocSwitch(doc.name);
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              background:
                                selectedDoc === doc.name
                                  ? "var(--accent)"
                                  : "var(--accent-soft)",
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
                                selectedDoc === doc.name ? "#ffffff" : "var(--accent)"
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
                                    ? "var(--text)"
                                    : "var(--text-soft)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {doc.name}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "var(--accent)",
                                }}
                              >
                                {doc.pages} pages
                              </p>
                              {(docHistoryCounts[doc.name] || 0) > 0 && (
                                <span className="doc-history-badge">
                                  <Icon name="chat_bubble" size={11} color="var(--text2)" />
                                  {docHistoryCounts[doc.name]}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedDoc === doc.name && (
                            <Icon
                              name="check_circle"
                              fill
                              size={14}
                              color="var(--success)"
                            />
                          )}
                          <button
                            className="preview-btn"
                            onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc.name); }}
                            title={doc.fileData ? "Preview PDF" : "Re-upload to enable preview"}
                            style={{
                              background: "var(--accent-soft)",
                              border: "1px solid var(--accent-border)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "26px",
                              height: "26px",
                              borderRadius: "7px",
                              flexShrink: 0,
                              transition: "all 0.2s",
                              opacity: doc.fileData ? 1 : 0.6,
                            }}
                          >
                            <Icon name="visibility" size={14} color="var(--accent)" />
                          </button>
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
                      {filteredDocs.length === 0 && (
                        <div
                          style={{
                            padding: "16px",
                            textAlign: "center",
                            opacity: 0.4,
                          }}
                        >
                          <Icon name="upload_file" size={32} color={T.textMuted} />
                          <p
                            style={{
                              fontSize: "12px",
                              color: T.textMuted,
                              marginTop: "8px",
                            }}
                          >
                            {docSearch ? "No matching documents" : "Upload a PDF to start"}
                          </p>
                        </div>
                      )}
                    </div>
                    )}
                  </>
                )}

                {activeNav === "recent" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {filteredRecentDocs.map((doc) => (
                      <div
                        key={doc.name}
                        onClick={() => {
                          const inLibrary = docs.find((d) => d.name === doc.name)
                          if (inLibrary) {
                            setSelectedDoc(doc.name)
                            void loadHistory(doc.name)
                            setActiveNav("library")
                          } else {
                            setDocs((prev) => [...prev, {
                              name: doc.name,
                              pages: doc.pages,
                              uploadedAt: new Date(),
                              fileData: undefined
                            }])
                            setSelectedDoc(doc.name)
                            void loadHistory(doc.name)
                            setActiveNav("library")
                          }
                        }}
                        style={{
                          display:"flex", flexDirection:"column",
                          padding:"10px 12px", borderRadius:"12px",
                          cursor:"pointer", marginBottom:"4px",
                          background: selectedDoc === doc.name
                            ? "rgba(59,130,246,0.1)" : "transparent",
                          border: selectedDoc === doc.name
                            ? "1px solid rgba(59,130,246,0.2)"
                            : "1px solid transparent",
                          transition:"all 0.2s"
                        }}
                        onMouseEnter={e => {
                          if (selectedDoc !== doc.name)
                            e.currentTarget.style.background = T.hover
                        }}
                        onMouseLeave={e => {
                          if (selectedDoc !== doc.name)
                            e.currentTarget.style.background = "transparent"
                        }}
                      >
                        <div style={{ display:"flex",
                          alignItems:"center", gap:"8px",
                          marginBottom:"4px" }}>
                          <Icon name="article" size={14} color={T.textMuted} />
                          <span style={{ fontSize:"12px", fontWeight:600,
                            color:T.text, flex:1, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {doc.name}
                          </span>
                          <span style={{ fontSize:"10px",
                            color:T.textMuted,
                            whiteSpace:"nowrap" }}>
                            {getRelativeTime(doc.lastChatAt)}
                          </span>
                        </div>
                        <p style={{ fontSize:"11px", color:T.textMuted,
                          overflow:"hidden", textOverflow:"ellipsis",
                          whiteSpace:"nowrap", paddingLeft:"22px" }}>
                          {doc.lastMessage}
                        </p>
                        {!docs.find(d => d.name === doc.name) && (
                          <span style={{ fontSize:"10px",
                            color:"rgba(59,130,246,0.6)",
                            paddingLeft:"22px", marginTop:"2px" }}>
                            Re-upload to enable preview
                          </span>
                        )}
                      </div>
                    ))}
                    {filteredRecentDocs.length === 0 && (
                      <div
                        style={{
                          padding:"24px 16px",
                          textAlign:"center",
                          opacity:0.4
                        }}
                      >
                        <Icon name="history" size={32} color={T.textMuted} />
                        <p style={{ fontSize:"12px", color:T.textMuted,
                          marginTop:"8px" }}>
                          {docSearch
                            ? "No matching recent documents"
                            : "Switch between documents to build history"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  borderTop: "1px solid var(--border2)",
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
            background: T.bg,
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
              borderBottom: `1px solid ${T.border}`,
              background: T.headerBg,
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
                    background: T.accentSoft,
                    border: `1px solid ${T.accentBorder}`,
                    borderRadius: "999px",
                    padding: "7px 16px 7px 10px",
                  }}
                >
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      background: T.accent,
                      borderRadius: "7px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="description" color="#ffffff" size={14} />
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: T.text,
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
                      color: T.accent,
                      fontWeight: 600,
                      background: T.hoverAccent,
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {selectedDocInfo.pages}p
                  </span>
                  <Icon name="check_circle" fill size={14} color={T.success} />
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
                  <Icon name="psychology" fill size={20} color={T.accent} />
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: T.text,
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
                onClick={() => {
                  setSidebarOpen(true)
                  setActiveNav("library")
                  setDocSearch("")
                  setTimeout(() => docSearchRef.current?.focus(), 300)
                }}
                disabled={docs.length === 0}
                title="Search documents"
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
              <button
                className="icon-btn"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              >
                <Icon
                  name={theme === "dark" ? "wb_sunny" : "dark_mode"}
                  size={20}
                />
              </button>
              <div
                onClick={() => setShowProfile((p) => !p)}
                title="Account"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: T.accentGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  marginLeft: "6px",
                  boxShadow: `0 4px 12px ${T.accentSoft}`,
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#ffffff",
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
                    onLogout={handleLogout}
                    onClose={() => setShowProfile(false)}
                    T={T}
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
              {historyLoading && (
                <>
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      style={{ display: "flex", gap: "16px", width: "100%" }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          flexShrink: 0,
                          background: T.accentSoft,
                          borderRadius: "11px",
                        }}
                      />
                      <div
                        className="history-skeleton"
                        style={{
                          flex: 1,
                          height: item === 1 ? "144px" : "112px",
                        }}
                      />
                    </div>
                  ))}
                </>
              )}

              {!historyLoading && messages.length === 0 && (
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
                      background: T.accentGradient,
                      borderRadius: "17px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="psychology" fill size={30} color="#ffffff" />
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
                  <p style={{ fontSize: "13px", color: "var(--text2)" }}>
                    {docs.length > 1
                      ? `${docs.length} documents loaded · use Search All to query across all`
                      : "DocMind answers with source page citations"}
                  </p>
                </div>
              )}

              {!historyLoading && messages.map((msg, i) => {
                const isPendingStreamMessage =
                  msg.role === "ai" &&
                  loading &&
                  !isStreaming &&
                  i === streamingMessageIndex &&
                  msg.text === "";

                if (isPendingStreamMessage) return null;

                return (
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
                          background: T.cardAlt,
                          padding: "15px 22px",
                          borderRadius: "20px 20px 4px 20px",
                          maxWidth: "70%",
                          border: `1px solid ${T.border}`,
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
                          color: T.textMuted,
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
                          background: T.accentGradient,
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
                          color="#ffffff"
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
                            {isStreaming && i === streamingMessageIndex && (
                              <span className="cursor">|</span>
                            )}
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
                                      color="var(--accent)"
                                    />
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "var(--accent)",
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
                                color: msg.liked ? "var(--accent)" : "var(--text2)",
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
                                color: copied === i ? "var(--success)" : "var(--text2)",
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
                              color: T.textMuted,
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
              )})}

              {!historyLoading && loading && !isStreaming && (
                <div className="msg" style={{ display: "flex", gap: "16px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      flexShrink: 0,
                      background: T.accentGradient,
                      borderRadius: "11px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "3px",
                    }}
                  >
                    <Icon name="auto_awesome" fill size={19} color="#ffffff" />
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
              background: T.footerFade,
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
                      T.glow,
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
                    background: T.inputBg,
                    backdropFilter: "blur(20px)",
                    borderRadius: "24px",
                    padding: "8px 8px 8px 24px",
                    border: `1px solid ${T.border}`,
                    boxShadow: "0 14px 40px rgba(0,0,0,0.3)",
                    transition: "all 0.3s",
                  }}
                >
                  <Icon name="search" color="var(--text2)" size={20} />
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
                      color: "var(--text)",
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
                    <Icon name="send" fill size={20} color="#ffffff" />
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
                    color: "var(--text2)",
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
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-border)",
                    padding: "5px 12px",
                    borderRadius: "999px",
                  }}
                >
                  <Icon name="description" size={13} color="var(--accent)" />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--accent)",
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
                  background: "var(--hover)",
                  border: "1px solid var(--border4)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "var(--text)",
                  fontSize: "14px",
                  fontFamily: "Inter,sans-serif",
                }}
              />
              <button
                onClick={handleMultiSearch}
                disabled={!searchQuery.trim() || searching || docs.length === 0}
                style={{
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "0 22px",
                  color: "#ffffff",
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
                    <Icon name="refresh" size={17} color="#ffffff" />
                  </span>
                ) : (
                  <Icon name="search" size={17} color="#ffffff" />
                )}
                {searching ? "Searching..." : "Search All"}
              </button>
            </div>

            {searching && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "var(--text2)",
                  fontSize: "13px",
                }}
              >
                Searching across {docs.length} documents...
              </div>
            )}

            {searchResults.map((result, i) => (
              <div key={i} className="search-result">
                <div className="doc-badge">
                  <Icon name="description" size={13} color="var(--accent)" />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {result.doc}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.75,
                    color: "var(--text)",
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
                        <Icon name="bookmark" fill size={11} color="var(--accent)" />
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "var(--accent)",
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
                background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)",
                borderRadius: "16px",
                padding: "18px",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  background: "var(--accent)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="description" color="#ffffff" size={24} />
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "var(--text)",
                    marginBottom: "5px",
                  }}
                >
                  {selectedDoc}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--success)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Icon name="check_circle" fill size={14} color="var(--success)" />
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
                style={{ borderBottom: `1px solid ${T.dividerSoft}` }}
              >
                <span style={{ fontSize: "13px", color: "var(--text2)" }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text)",
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
                    color: T.textMuted,
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
                      handleDocSwitch(doc.name);
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
                          ? "var(--accent-soft)"
                          : "transparent",
                      border:
                        doc.name === selectedDoc
                          ? "1px solid var(--accent-border)"
                          : "1px solid transparent",
                      marginBottom: "5px",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon
                      name="article"
                      size={17}
                      color={doc.name === selectedDoc ? "var(--accent)" : "var(--text2)"}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: doc.name === selectedDoc ? "var(--text)" : "var(--text2)",
                        flex: 1,
                      }}
                    >
                      {doc.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text2)" }}>
                      {doc.pages}p
                    </span>
                    {doc.name === selectedDoc && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--accent)",
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
                  { label: "Theme", value: theme === "dark" ? "Dark Mode" : "Light Mode", icon: theme === "dark" ? "dark_mode" : "wb_sunny" },
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
                    action: async () => {
                      if (!selectedDoc) return;
                      try {
                        await axios.delete(
                          `${API}/history/${encodeURIComponent(selectedDoc)}`,
                          { headers: getAuthHeaders() },
                        );
                      } catch {
                        /* ignore history deletion failures */
                      }
                      setMessages([]);
                      setDocHistoryCounts((prev) => ({
                        ...prev,
                        [selectedDoc]: 0,
                      }));
                      showToast("Conversation cleared", "success");
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
                      setRecentDocs([]);
                      setDocHistoryCounts({});
                      setSelectedDoc(null);
                      setMessages([]);
                      localStorage.removeItem("docmind_lastDoc");
                      localStorage.removeItem("docmind_docs");
                      localStorage.removeItem("docmind_recent");
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
                    color: T.textMuted,
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
                        <Icon name={item.icon} color="var(--accent)" size={19} />
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>
                          {item.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: item.danger ? "var(--danger)" : "var(--text2)",
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
                  background: "var(--hover)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: "1px solid var(--border2)",
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
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>Q.</span>
                  {faq.q}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.75,
                    color: "var(--text2)",
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
                color: "var(--text2)",
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
                      background: "var(--hoverAccent)",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      color: "var(--accent)",
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
                    color: "var(--text2)",
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
          key={`${previewDoc}-${previewFileData ? 'hasData' : 'noData'}`}
          docName={previewDoc}
          fileData={previewFileData}
          onClose={() => setPreviewDoc(null)}
          T={T}
        />
      )}
      {toast && (
        <div className={`toast ${toast.variant}`}>
          <Icon
            name={toast.variant === "success" ? "check_circle" : "info"}
            fill
            size={18}
            color={toast.variant === "success" ? "var(--success)" : "var(--accent)"}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: toast.variant === "success" ? "var(--success)" : "var(--accent)",
            }}
          >
            {toast.message}
          </span>
        </div>
      )}
    </>
  );
}
