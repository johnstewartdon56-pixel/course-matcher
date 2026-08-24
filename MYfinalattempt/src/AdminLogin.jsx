import { useState } from "react";
import { supabase } from "./supabaseClient.js";

export default function AdminLogin({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onLoggedIn();
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Admin Login</h1>
      <p style={{ color: "#667085", fontSize: 14 }}>Staff access only.</p>

      <label style={{ fontWeight: 700, fontSize: 13 }}>Email</label>
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #E4E7EC", marginTop: 6, marginBottom: 14, boxSizing: "border-box" }}
      />

      <label style={{ fontWeight: 700, fontSize: 13 }}>Password</label>
      <input
        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #E4E7EC", marginTop: 6, marginBottom: 14, boxSizing: "border-box" }}
      />

      {error && <p style={{ color: "#D92D20", fontSize: 13 }}>{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: "100%", padding: 14, borderRadius: 999, border: "none",
          background: "#101828", color: "#fff", fontWeight: 800, cursor: "pointer",
        }}
      >
        {loading ? "Logging in..." : "Log in"}
      </button>
    </div>
  );
}
