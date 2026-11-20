export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>404 - Page not found</h1>
        <p style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>The page you requested does not exist.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 16, padding: "10px 16px", borderRadius: 8, background: "#2563eb", color: "#fff", textDecoration: "none", fontSize: 14 }}>
          Return home
        </a>
      </div>
    </main>
  );
}
