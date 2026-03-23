import * as React from "react"
import { useState } from "react"
import axios from "axios"

const API = "http://localhost:8000"

interface User {
  id: string
  email: string
  username: string
  provider?: string
  created_at?: string
}

interface AuthProps {
  onLogin: (user: User, token: string) => void
}

const Icon = ({ name, fill = false, size = 24, color }: { name: string; fill?: boolean; size?: number; color?: string }) => (
  <span style={{ fontFamily: "Material Symbols Outlined", fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0", fontSize: `${size}px`, lineHeight: 1, display: "inline-flex", color, userSelect: "none" as const, flexShrink: 0 }}>{name}</span>
)

export default function Auth({ onLogin }: AuthProps) {
  const [tab, setTab] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const reset = () => { setError(""); setSuccess(""); }

  const handleLogin = async () => {
    reset()
    if (!email || !password) { setError("Please fill in all fields"); return }
    setLoading(true)
    try {
      const res = await axios.post<{ token: string; user: User }>(`${API}/auth/login`, { email, password })
      localStorage.setItem("docmind_token", res.data.token)
      localStorage.setItem("docmind_user", JSON.stringify(res.data.user))
      onLogin(res.data.user, res.data.token)
    } catch (e: unknown) {
      const detail =
        axios.isAxiosError(e) && typeof e.response?.data === "object" && e.response?.data
          ? (e.response.data as { detail?: string }).detail
          : undefined
      setError(detail || "Invalid email or password")
    }
    setLoading(false)
  }

  const handleSignup = async () => {
    reset()
    if (!email || !username || !password || !confirmPassword) { setError("Please fill in all fields"); return }
    if (password !== confirmPassword) { setError("Passwords do not match"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    setLoading(true)
    try {
      const res = await axios.post<{ token: string; user: User }>(`${API}/auth/register`, { email, username, password })
      localStorage.setItem("docmind_token", res.data.token)
      localStorage.setItem("docmind_user", JSON.stringify(res.data.user))
      setSuccess("Account created! Signing you in...")
      setTimeout(() => onLogin(res.data.user, res.data.token), 1000)
    } catch (e: unknown) {
      const detail =
        axios.isAxiosError(e) && typeof e.response?.data === "object" && e.response?.data
          ? (e.response.data as { detail?: string }).detail
          : undefined
      setError(detail || "Registration failed")
    }
    setLoading(false)
  }

  const handleOAuth = (provider: string) => {
    setError(`${provider} OAuth coming soon! Use email for now.`)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0b1326; color:#dae2fd; font-family:'Inter',sans-serif; }
        .auth-input { width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px 16px 14px 44px; color:#dae2fd; font-size:14px; font-family:'Inter',sans-serif; outline:none; transition:all 0.2s; }
        .auth-input:focus { border-color:rgba(59,130,246,0.5); background:rgba(59,130,246,0.05); }
        .auth-input::placeholder { color:rgba(194,198,214,0.35); }
        .oauth-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:13px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#dae2fd; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .oauth-btn:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15); }
        .submit-btn { width:100%; padding:15px; border-radius:12px; background:#3B82F6; border:none; color:white; font-size:15px; font-weight:700; cursor:pointer; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .submit-btn:hover:not(:disabled) { background:#2563eb; transform:translateY(-1px); box-shadow:0 8px 24px rgba(37,99,235,0.4); }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .tab { flex:1; padding:12px; border:none; background:none; color:#8c909f; font-size:14px; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .tab.active { color:#3B82F6; border-bottom-color:#3B82F6; }
        .tab:hover:not(.active) { color:#dae2fd; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation:fadeIn 0.4s ease forwards; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float { animation:float 4s ease infinite; }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#0b1326", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", position:"relative", overflow:"hidden" }}>

        {/* Background glow effects */}
        <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"600px", height:"600px", background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"500px", height:"500px", background:"radial-gradient(circle,rgba(37,99,235,0.06) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div className="fade-in" style={{ width:"100%", maxWidth:"440px" }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:"40px" }}>
            <div className="float" style={{ width:"64px", height:"64px", background:"linear-gradient(135deg,#3B82F6,#2563eb)", borderRadius:"18px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 12px 32px rgba(37,99,235,0.4)" }}>
              <Icon name="psychology" fill size={34} color="white" />
            </div>
            <h1 style={{ fontFamily:"Manrope,sans-serif", fontWeight:800, fontSize:"28px", color:"white", letterSpacing:"-0.02em" }}>DocMind AI</h1>
            <p style={{ fontSize:"13px", color:"#8c909f", marginTop:"6px" }}>Your intelligent document assistant</p>
          </div>

          {/* Card */}
          <div style={{ background:"rgba(19,27,46,0.9)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"24px", overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,0.4)" }}>

            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"0 8px" }}>
              <button className={`tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); reset() }}>Sign In</button>
              <button className={`tab${tab === "signup" ? " active" : ""}`} onClick={() => { setTab("signup"); reset() }}>Create Account</button>
            </div>

            <div style={{ padding:"32px" }}>

              {/* OAuth Buttons */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"24px" }}>
                {[
                  { provider:"Google", icon:"https://www.svgrepo.com/show/475656/google-color.svg" },
                  { provider:"GitHub", icon:"https://www.svgrepo.com/show/512317/github-142.svg" },
                  { provider:"Microsoft", icon:"https://www.svgrepo.com/show/448874/microsoft.svg" },
                  { provider:"Apple", icon:"https://www.svgrepo.com/show/452200/apple.svg" },
                ].map(({ provider, icon }) => (
                  <button key={provider} className="oauth-btn" onClick={() => handleOAuth(provider)}>
                    <img src={icon} alt={provider} style={{ width:"18px", height:"18px", filter: provider === "GitHub" || provider === "Apple" ? "invert(1)" : "none" }} />
                    {provider}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"24px" }}>
                <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.07)" }} />
                <span style={{ fontSize:"12px", color:"#8c909f", fontWeight:600 }}>OR CONTINUE WITH EMAIL</span>
                <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.07)" }} />
              </div>

              {/* Error / Success */}
              {error && (
                <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <Icon name="error" fill size={18} color="#ef4444" />
                  <span style={{ fontSize:"13px", color:"#fca5a5" }}>{error}</span>
                </div>
              )}
              {success && (
                <div style={{ background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <Icon name="check_circle" fill size={18} color="#4ade80" />
                  <span style={{ fontSize:"13px", color:"#86efac" }}>{success}</span>
                </div>
              )}

              {/* Form Fields */}
              <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"20px" }}>

                {/* Username (signup only) */}
                {tab === "signup" && (
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                      <Icon name="person" size={18} color="#8c909f" />
                    </div>
                    <input className="auth-input" type="text" placeholder="Full name" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} />
                  </div>
                )}

                {/* Email */}
                <div style={{ position:"relative" }}>
                  <div style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <Icon name="mail" size={18} color="#8c909f" />
                  </div>
                  <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignup())} />
                </div>

                {/* Password */}
                <div style={{ position:"relative" }}>
                  <div style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <Icon name="lock" size={18} color="#8c909f" />
                  </div>
                  <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignup())} style={{ paddingRight:"44px" }} />
                  <button onClick={() => setShowPassword(p => !p)} style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} color="#8c909f" />
                  </button>
                </div>

                {/* Confirm Password (signup only) */}
                {tab === "signup" && (
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                      <Icon name="lock_reset" size={18} color="#8c909f" />
                    </div>
                    <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} />
                  </div>
                )}
              </div>

              {/* Forgot password (login only) */}
              {tab === "login" && (
                <div style={{ textAlign:"right", marginBottom:"20px", marginTop:"-6px" }}>
                  <button onClick={() => setError("Password reset coming soon!")} style={{ background:"none", border:"none", color:"#3B82F6", fontSize:"13px", cursor:"pointer", fontWeight:600 }}>Forgot password?</button>
                </div>
              )}

              {/* Submit */}
              <button className="submit-btn" onClick={tab === "login" ? handleLogin : handleSignup} disabled={loading}>
                {loading ? "Please wait..." : tab === "login" ? "Sign In to DocMind" : "Create My Account"}
              </button>

              {/* Terms (signup only) */}
              {tab === "signup" && (
                <p style={{ fontSize:"11px", color:"#8c909f", textAlign:"center", marginTop:"16px", lineHeight:1.6 }}>
                  By creating an account you agree to our{" "}
                  <button style={{ background:"none", border:"none", color:"#3B82F6", cursor:"pointer", fontSize:"11px" }}>Terms of Service</button>
                  {" "}and{" "}
                  <button style={{ background:"none", border:"none", color:"#3B82F6", cursor:"pointer", fontSize:"11px" }}>Privacy Policy</button>
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <p style={{ textAlign:"center", fontSize:"12px", color:"rgba(194,198,214,0.3)", marginTop:"24px" }}>
            DocMind AI · Powered by Claude · Built with ❤️
          </p>
        </div>
      </div>
    </>
  )
}