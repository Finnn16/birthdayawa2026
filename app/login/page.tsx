"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, email, password, username }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoEmoji}>❤️</span>
          <h1 style={styles.logoText}>MoodTrack</h1>
        </div>
        <p style={styles.sub}>HAIII SAYAANG COBA DIISI YAA MWAAH!!</p>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(mode === "login" ? styles.tabActive : {}),
            }}
            onClick={() => setMode("login")}
          >
            Masuk
          </button>
          <button
            style={{
              ...styles.tab,
              ...(mode === "register" ? styles.tabActive : {}),
            }}
            onClick={() => setMode("register")}
          >
            Daftar
          </button>
        </div>

        {mode === "register" && (
          <input
            style={styles.input}
            placeholder="Username lo"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "..." : mode === "login" ? "Masuk" : "Daftar"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(ellipse at 50% 0%, rgba(200,255,87,0.06) 0%, transparent 60%)",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "40px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  logoEmoji: { fontSize: 28 },
  logoText: {
    fontSize: 24,
    fontFamily: "var(--font-casual)",
    fontWeight: 700,
    color: "var(--accent)",
  },
  sub: {
    fontSize: 14,
    color: "var(--text-muted)",
    marginBottom: 8,
    fontFamily: "var(--font-casual)",
    fontWeight: 500,
  },
  tabs: {
    display: "flex",
    background: "var(--surface2)",
    borderRadius: "var(--radius-sm)",
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: "8px 0",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontFamily: "var(--font-casual)",
    fontSize: 14,
    transition: "all 0.2s",
    fontWeight: 500,
  },
  tabActive: {
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    fontFamily: "var(--font-casual)",
    fontSize: 15,
    outline: "none",
    fontWeight: 500,
  },
  error: { fontSize: 13, color: "var(--red)", padding: "4px 0" },
  btn: {
    marginTop: 4,
    padding: "14px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "var(--accent)",
    color: "#0d0d0f",
    fontFamily: "var(--font-casual)",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
};
