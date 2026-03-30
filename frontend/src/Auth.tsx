import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";

const API = "http://localhost:8000";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";

interface User {
  id: string;
  email: string;
  username: string;
  provider?: string;
  created_at?: string;
}

interface AuthProps {
  onLogin: (user: User, token: string) => void;
}

type ThemeMode = "dark" | "light";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              shape?: string;
              text?: string;
              width?: number;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleIdentityScript = () => {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

const authThemes = {
  dark: {
    bg: "#0b1326",
    gradient:
      "linear-gradient(135deg, #0b1326 0%, #101a33 50%, #0e1629 100%)",
    card: "rgba(19,27,46,0.9)",
    cardBorder: "1px solid rgba(255,255,255,0.07)",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "1px solid rgba(255,255,255,0.1)",
    text: "#dae2fd",
    textMuted: "#8c909f",
    accent: "#3B82F6",
    accentAlt: "#2563eb",
    hover: "rgba(255,255,255,0.08)",
    oauthBg: "rgba(255,255,255,0.04)",
    oauthBorder: "1px solid rgba(255,255,255,0.08)",
    orbA: "radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)",
    orbB: "radial-gradient(circle,rgba(37,99,235,0.06) 0%,transparent 70%)",
    shadow: "0 24px 64px rgba(0,0,0,0.4)",
  },
  light: {
    bg: "#f0f4ff",
    gradient:
      "linear-gradient(135deg, #e8eeff 0%, #f0f4ff 50%, #e8f0ff 100%)",
    card: "#ffffff",
    cardBorder: "1px solid rgba(0,0,0,0.08)",
    inputBg: "#f8faff",
    inputBorder: "1px solid rgba(0,0,0,0.1)",
    text: "#1a2340",
    textMuted: "#6b7280",
    accent: "#2563eb",
    accentAlt: "#1d4ed8",
    hover: "rgba(26,35,64,0.06)",
    oauthBg: "#ffffff",
    oauthBorder: "1px solid rgba(0,0,0,0.1)",
    orbA: "radial-gradient(circle,rgba(37,99,235,0.08) 0%,transparent 70%)",
    orbB: "radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)",
    shadow: "0 18px 48px rgba(15,23,42,0.12)",
  },
} as const;

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

export default function Auth({ onLogin }: AuthProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [theme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("docmind_theme");
    return savedTheme === "light" ? "light" : "dark";
  });
  const googleButtonHostRef = useRef<HTMLDivElement | null>(null);
  const T = authThemes[theme];

  const msalInstance = useMemo(
    () =>
      new PublicClientApplication({
        auth: {
          clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
          authority: "https://login.microsoftonline.com/common",
          redirectUri: window.location.origin,
        },
      }),
    [],
  );

  const persistAuth = (user: User, token: string) => {
    localStorage.setItem("docmind_token", token);
    localStorage.setItem("docmind_user", JSON.stringify(user));
    onLogin(user, token);
  };

  const reset = () => {
    setError("");
    setSuccess("");
  };

  const handleGoogleCallback = async (response: { credential?: string }) => {
    if (!response.credential) {
      setError("Google sign-in did not return a credential.");
      return;
    }

    reset();
    setLoading(true);
    try {
      const res = await axios.post<{ token: string; user: User }>(
        `${API}/auth/google`,
        { credential: response.credential },
      );
      persistAuth(res.data.user, res.data.token);
    } catch (e: unknown) {
      const detail =
        axios.isAxiosError(e) && typeof e.response?.data === "object" && e.response?.data
          ? (e.response.data as { detail?: string }).detail
          : undefined;
      setError(detail || "Google sign-in failed.");
    }
    setLoading(false);
  };

  useEffect(() => {
    document.body.style.background = T.bg;
    return () => {
      document.body.style.background = "";
    };
  }, [T.bg]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Missing VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    let cancelled = false;
    const initializeGoogle = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !window.google?.accounts.id || !googleButtonHostRef.current) return;

        const width = Math.max(Math.round(googleButtonHostRef.current.getBoundingClientRect().width), 180);
        googleButtonHostRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(googleButtonHostRef.current, {
          type: "standard",
          theme: theme === "light" ? "outline" : "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width,
        });
        setGoogleReady(true);
      } catch (e) {
        if (!cancelled) {
          setGoogleReady(false);
          setError(e instanceof Error ? e.message : "Failed to load Google sign-in.");
        }
      }
    };

    void initializeGoogle();
    return () => {
      cancelled = true;
      setGoogleReady(false);
    };
  }, [theme]);

  const handleLogin = async () => {
    reset();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post<{ token: string; user: User }>(
        `${API}/auth/login`,
        { email, password },
      );
      persistAuth(res.data.user, res.data.token);
    } catch (e: unknown) {
      const detail =
        axios.isAxiosError(e) && typeof e.response?.data === "object" && e.response?.data
          ? (e.response.data as { detail?: string }).detail
          : undefined;
      setError(detail || "Invalid email or password");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    reset();
    if (!email || !username || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post<{ token: string; user: User }>(
        `${API}/auth/register`,
        { email, username, password },
      );
      localStorage.setItem("docmind_token", res.data.token);
      localStorage.setItem("docmind_user", JSON.stringify(res.data.user));
      setSuccess("Account created! Signing you in...");
      setTimeout(() => onLogin(res.data.user, res.data.token), 1000);
    } catch (e: unknown) {
      const detail =
        axios.isAxiosError(e) && typeof e.response?.data === "object" && e.response?.data
          ? (e.response.data as { detail?: string }).detail
          : undefined;
      setError(detail || "Registration failed");
    }
    setLoading(false);
  };

  const handleGoogleSignIn = () => {
    reset();
    if (!googleReady || !window.google?.accounts.id) {
      setError("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    window.google.accounts.id.prompt();
  };

  const handleMicrosoftSignIn = async () => {
    reset();
    if (!import.meta.env.VITE_MICROSOFT_CLIENT_ID) {
      setError("Missing VITE_MICROSOFT_CLIENT_ID.");
      return;
    }

    setLoading(true);
    try {
      await msalInstance.initialize();
      const login = await msalInstance.loginPopup({
        scopes: ["openid", "profile", "email"],
      });
      const account = login.account;
      if (!account?.username) throw new Error("Microsoft account email missing.");

      const name = account.name || account.username.split("@")[0];
      const accessToken = login.idToken || "";
      const res = await axios.post<{ token: string; user: User }>(
        `${API}/auth/microsoft`,
        {
          email: account.username,
          name,
          accessToken,
        },
      );
      persistAuth(res.data.user, res.data.token);
    } catch (e: unknown) {
      const detail =
        axios.isAxiosError(e) && typeof e.response?.data === "object" && e.response?.data
          ? (e.response.data as { detail?: string }).detail
          : e instanceof Error
            ? e.message
            : undefined;
      setError(detail || "Microsoft sign-in failed.");
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:${T.bg}; color:${T.text}; font-family:'Inter',sans-serif; }
        .auth-input { width:100%; background:${T.inputBg}; border:${T.inputBorder}; border-radius:12px; padding:14px 16px 14px 44px; color:${T.text}; font-size:14px; font-family:'Inter',sans-serif; outline:none; transition:all 0.2s; }
        .auth-input:focus { border-color:${T.accent}; background:${theme === "light" ? "#ffffff" : "rgba(59,130,246,0.05)"}; }
        .auth-input::placeholder { color:${T.textMuted}; opacity:0.7; }
        .oauth-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:13px; border-radius:12px; background:${T.oauthBg}; border:${T.oauthBorder}; color:${T.text}; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .oauth-btn:hover { background:${T.hover}; border-color:${T.accent}; }
        .submit-btn { width:100%; padding:15px; border-radius:12px; background:${T.accent}; border:none; color:#ffffff; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .submit-btn:hover:not(:disabled) { background:${T.accentAlt}; transform:translateY(-1px); box-shadow:0 8px 24px ${theme === "light" ? "rgba(37,99,235,0.22)" : "rgba(37,99,235,0.4)"}; }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .tab { flex:1; padding:12px; border:none; background:none; color:${T.textMuted}; font-size:14px; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .tab.active { color:${T.accent}; border-bottom-color:${T.accent}; }
        .tab:hover:not(.active) { color:${T.text}; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation:fadeIn 0.4s ease forwards; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float { animation:float 4s ease infinite; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: T.gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "600px",
            height: "600px",
            background: T.orbA,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "500px",
            height: "500px",
            background: T.orbB,
            pointerEvents: "none",
          }}
        />

        <div className="fade-in" style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              className="float"
              style={{
                width: "64px",
                height: "64px",
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentAlt})`,
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: theme === "light" ? "0 12px 32px rgba(37,99,235,0.18)" : "0 12px 32px rgba(37,99,235,0.4)",
              }}
            >
              <Icon name="psychology" fill size={34} color="#ffffff" />
            </div>
            <h1
              style={{
                fontFamily: "Manrope,sans-serif",
                fontWeight: 800,
                fontSize: "28px",
                color: T.text,
                letterSpacing: "-0.02em",
              }}
            >
              DocMind AI
            </h1>
            <p style={{ fontSize: "13px", color: T.textMuted, marginTop: "6px" }}>
              Your intelligent document assistant
            </p>
          </div>

          <div
            style={{
              background: T.card,
              border: T.cardBorder,
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: T.shadow,
            }}
          >
            <div style={{ display: "flex", borderBottom: T.cardBorder, padding: "0 8px" }}>
              <button
                className={`tab${tab === "login" ? " active" : ""}`}
                onClick={() => {
                  setTab("login");
                  reset();
                }}
              >
                Sign In
              </button>
              <button
                className={`tab${tab === "signup" ? " active" : ""}`}
                onClick={() => {
                  setTab("signup");
                  reset();
                }}
              >
                Create Account
              </button>
            </div>

            <div style={{ padding: "32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
                <div style={{ position: "relative" }}>
                  <button className="oauth-btn" onClick={!googleReady ? handleGoogleSignIn : undefined} disabled={loading}>
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                      style={{ width: "18px", height: "18px" }}
                    />
                    Google
                  </button>
                  <div
                    ref={googleButtonHostRef}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: googleReady ? 0.01 : 0,
                      overflow: "hidden",
                      borderRadius: "12px",
                    }}
                  />
                </div>
                <button className="oauth-btn" onClick={handleMicrosoftSignIn} disabled={loading}>
                  <img
                    src="https://www.svgrepo.com/show/448874/microsoft.svg"
                    alt="Microsoft"
                    style={{ width: "18px", height: "18px" }}
                  />
                  Microsoft
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ flex: 1, height: "1px", background: T.cardBorder.replace("1px solid ", "") }} />
                <span style={{ fontSize: "12px", color: T.textMuted, fontWeight: 600 }}>
                  OR CONTINUE WITH EMAIL
                </span>
                <div style={{ flex: 1, height: "1px", background: T.cardBorder.replace("1px solid ", "") }} />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Icon name="error" fill size={18} color="#ef4444" />
                  <span style={{ fontSize: "13px", color: theme === "light" ? "#b91c1c" : "#fca5a5" }}>{error}</span>
                </div>
              )}

              {success && (
                <div
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Icon name="check_circle" fill size={18} color={theme === "light" ? "#15803d" : "#4ade80"} />
                  <span style={{ fontSize: "13px", color: theme === "light" ? "#166534" : "#86efac" }}>{success}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                {tab === "signup" && (
                  <div style={{ position: "relative" }}>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Full name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    />
                  </div>
                )}

                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <Icon name="mail" size={18} color={T.textMuted} />
                  </div>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignup())}
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <Icon name="lock" size={18} color={T.textMuted} />
                  </div>
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignup())}
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    onClick={() => setShowPassword((p) => !p)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} color={T.textMuted} />
                  </button>
                </div>

                {tab === "signup" && (
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                      <Icon name="lock_reset" size={18} color={T.textMuted} />
                    </div>
                    <input
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    />
                  </div>
                )}
              </div>

              {tab === "login" && (
                <div style={{ textAlign: "right", marginBottom: "20px", marginTop: "-6px" }}>
                  <button
                    onClick={() => setError("Password reset coming soon!")}
                    style={{ background: "none", border: "none", color: T.accent, fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button className="submit-btn" onClick={tab === "login" ? handleLogin : handleSignup} disabled={loading}>
                {loading ? "Please wait..." : tab === "login" ? "Sign In to DocMind" : "Create My Account"}
              </button>

              {tab === "signup" && (
                <p style={{ fontSize: "11px", color: T.textMuted, textAlign: "center", marginTop: "16px", lineHeight: 1.6 }}>
                  By creating an account you agree to our{" "}
                  <button style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: "11px" }}>Terms of Service</button>{" "}
                  and{" "}
                  <button style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: "11px" }}>Privacy Policy</button>
                </p>
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "12px", color: T.textMuted, marginTop: "24px", opacity: 0.7 }}>
            DocMind AI · Powered by Claude · Built for document Q&A
          </p>
        </div>
      </div>
    </>
  );
}
