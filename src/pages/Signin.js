import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button disabled={busy} style={styles.button}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {msg && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 8,
              background: msg.type === "error" ? "#fdeaea" : "#e8f7ed",
              border: `1px solid ${
                msg.type === "error" ? "#f0c2c2" : "#b3e6c3"
              }`,
            }}
          >
            {msg.text}
          </div>
        )}
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "60vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  card: {
    width: 360,
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    background: "#fff",
    boxShadow: "0 2px 12px rgba(0,0,0,.05)",
  },
  label: { marginTop: 8, fontWeight: 600 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
  },
  button: {
    marginTop: 12,
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
};
