import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000";

const METHOD_COLORS = {
  GET:    { bg: "#1a3a5c", text: "#60a5fa", border: "#2563eb" },
  POST:   { bg: "#1a3d2e", text: "#34d399", border: "#059669" },
  DELETE: { bg: "#3d1a1a", text: "#f87171", border: "#dc2626" },
  PUT:    { bg: "#3d2e1a", text: "#fbbf24", border: "#d97706" },
  PATCH:  { bg: "#3d2a1a", text: "#fb923c", border: "#ea580c" },
};

const getStatusColor = (code) => {
  if (!code) return "#6b7280";
  if (code < 300) return "#34d399";
  if (code < 400) return "#60a5fa";
  if (code < 500) return "#fb923c";
  return "#f87171";
};

const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function App() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, avg_response_time: 0 });
  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/logs`),
        fetch(`${API}/api/stats`),
      ]);
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();
      setLogs(logsData);
      setStats(statsData);
    } catch (e) {
      console.error("Failed to fetch:", e);
    }
  }, []);

  const clearLogs = async () => {
    setLoading(true);
    await fetch(`${API}/api/logs`, { method: "DELETE" });
    setLogs([]);
    setSelected(null);
    setStats({ total: 0, avg_response_time: 0 });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const methodStyle = (method) => {
    const c = METHOD_COLORS[method] || { bg: "#2a2a3e", text: "#a78bfa", border: "#7c3aed" };
    return {
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      borderRadius: "4px",
      padding: "2px 8px",
      fontSize: "11px",
      fontWeight: "600",
      fontFamily: "monospace",
      letterSpacing: "0.05em",
    };
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      background: "#0d0d14",
      color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      overflow: "hidden",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: "240px",
        minWidth: "240px",
        background: "#13131f",
        borderRight: "1px solid #1e1e30",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        gap: "24px",
      }}>
        {/* Logo */}
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", letterSpacing: "-0.5px" }}>
            👻 Phantom
          </div>
          <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.15em", marginTop: "4px" }}>
            TRAFFIC PROXY
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <StatCard label="Live Requests" value={stats.total || 0} />
          <StatCard label="Avg Response" value={`${Math.round(stats.avg_response_time || 0)}ms`} />
        </div>

        {/* Method breakdown */}
        {stats.by_method && Object.keys(stats.by_method).length > 0 && (
          <div>
            <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "8px" }}>
              BY METHOD
            </div>
            {Object.entries(stats.by_method).map(([method, count]) => (
              <div key={method} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={methodStyle(method)}>{method}</span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? "#1a3a1a" : "#1e1e2e",
              color: autoRefresh ? "#34d399" : "#6b7280",
              border: `1px solid ${autoRefresh ? "#059669" : "#2a2a3e"}`,
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "10px" }}>{autoRefresh ? "⬤" : "○"}</span>
            Auto-Refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={clearLogs}
            disabled={loading}
            style={{
              background: "#1e1a1a",
              color: "#f87171",
              border: "1px solid #3d1a1a",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🗑 Clear All Logs
          </button>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header bar */}
        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid #1e1e30",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#13131f",
        }}>
          <span style={{ fontSize: "12px", color: "#4a4a6a", letterSpacing: "0.1em" }}>
            INTERCEPTED TRAFFIC
          </span>
          <span style={{
            fontSize: "11px",
            color: autoRefresh ? "#34d399" : "#4a4a6a",
            display: "flex", alignItems: "center", gap: "5px"
          }}>
            {autoRefresh && <span style={{ animation: "pulse 1.5s infinite" }}>⬤</span>}
            {autoRefresh ? "Live" : "Paused"}
          </span>
        </div>

        {/* Table + Detail panel */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Traffic Table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {logs.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", color: "#2a2a3e", gap: "12px"
              }}>
                <div style={{ fontSize: "48px" }}>👻</div>
                <div style={{ fontSize: "14px" }}>No traffic recorded yet</div>
                <div style={{ fontSize: "12px", color: "#1e1e30" }}>
                  Visit http://localhost:8080/posts to capture traffic
                </div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0d0d14", position: "sticky", top: 0 }}>
                    {["Timestamp", "Method", "Path", "Status", "Time"].map(h => (
                      <th key={h} style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "10px",
                        color: "#4a4a6a",
                        letterSpacing: "0.1em",
                        borderBottom: "1px solid #1e1e30",
                        fontWeight: "500",
                      }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(selected?.id === log.id ? null : log)}
                      style={{
                        borderBottom: "1px solid #1a1a28",
                        cursor: "pointer",
                        background: selected?.id === log.id ? "#1a1a2e" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (selected?.id !== log.id) e.currentTarget.style.background = "#16162a" }}
                      onMouseLeave={e => { if (selected?.id !== log.id) e.currentTarget.style.background = "transparent" }}
                    >
                      <td style={{ padding: "10px 16px", fontSize: "12px", color: "#4a4a6a" }}>
                        {timeAgo(log.timestamp)}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={methodStyle(log.method)}>{log.method}</span>
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "12px", color: "#a0aec0", fontFamily: "monospace" }}>
                        {log.path}
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: "600", color: getStatusColor(log.res_status) }}>
                        {log.res_status}
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "12px", color: "#4a4a6a" }}>
                        {log.res_time_ms ? `${Math.round(log.res_time_ms)}ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{
              width: "380px",
              minWidth: "380px",
              borderLeft: "1px solid #1e1e30",
              background: "#13131f",
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#4a4a6a", letterSpacing: "0.1em" }}>REQUEST DETAIL</span>
                <button onClick={() => setSelected(null)} style={{
                  background: "none", border: "none", color: "#4a4a6a",
                  cursor: "pointer", fontSize: "16px", lineHeight: 1
                }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={methodStyle(selected.method)}>{selected.method}</span>
                <span style={{ fontSize: "12px", color: "#a0aec0", fontFamily: "monospace" }}>{selected.path}</span>
              </div>

              <DetailSection title="STATUS">
                <span style={{ color: getStatusColor(selected.res_status), fontWeight: "600" }}>
                  {selected.res_status}
                </span>
                <span style={{ color: "#4a4a6a", marginLeft: "12px", fontSize: "12px" }}>
                  {selected.res_time_ms ? `${Math.round(selected.res_time_ms)}ms` : ""}
                </span>
              </DetailSection>

              {selected.req_headers && (
                <DetailSection title="REQUEST HEADERS">
                  <CodeBlock content={selected.req_headers} />
                </DetailSection>
              )}

              {selected.req_body && (
                <DetailSection title="REQUEST BODY">
                  <CodeBlock content={selected.req_body} />
                </DetailSection>
              )}

              {selected.res_body && (
                <DetailSection title="RESPONSE BODY">
                  <CodeBlock content={selected.res_body} />
                </DetailSection>
              )}
            </div>
          )}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d14; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: "#0d0d14",
      border: "1px solid #1e1e30",
      borderRadius: "8px",
      padding: "12px 14px",
    }}>
      <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "4px" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: "20px", fontWeight: "700", color: "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "8px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ content }) {
  let formatted = content;
  try { formatted = JSON.stringify(JSON.parse(content), null, 2); } catch {}
  return (
    <pre style={{
      background: "#0d0d14",
      border: "1px solid #1e1e30",
      borderRadius: "6px",
      padding: "12px",
      fontSize: "11px",
      color: "#a0aec0",
      overflowX: "auto",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      maxHeight: "200px",
      overflowY: "auto",
    }}>{formatted}</pre>
  );
}