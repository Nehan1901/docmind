import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Auth from './Auth.tsx'

interface User {
  id: string
  email: string
  username: string
  provider?: string
  created_at?: string
}

export function Root() {
  // Load auth state once during initialization (avoids setState-in-effect warnings).
  const [user, setUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem("docmind_token")
    const savedUser = localStorage.getItem("docmind_user")
    if (!savedToken || !savedUser) return null
    try {
      return JSON.parse(savedUser) as User
    } catch {
      return null
    }
  })

  const handleLogin = (userData: User, userToken: string) => {
    // Auth.tsx already writes these, but we reference token to satisfy linting.
    localStorage.setItem("docmind_token", userToken)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem("docmind_token")
    localStorage.removeItem("docmind_user")
    setUser(null)
  }

  if (!user) return <Auth onLogin={handleLogin} />
  return <App user={user} onLogout={handleLogout} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)