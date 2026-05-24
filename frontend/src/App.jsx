import { useState, useEffect, useCallback, useMemo } from "react";

const API = "http://localhost:8000";
const PROXY = "http://localhost:8080";

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

const STATUS_FILTERS = [
  { label: "ALL", fn: () => true },
  { label: "2xx", fn: (c) => c >= 200 && c < 300 },
  { label: "3xx", fn: (c) => c >= 300 && c < 400 },
  { label: "4xx", fn: (c) => c >= 400 && c < 500 },
  { label: "5xx", fn: (c) => c >= 500 },
];

const ERROR_CODES = [
  { label: "None", value: null },
  { label: "400", value: 400 },
  { label: "401", value: 401 },
  { label: "403", value: 403 },
  { label: "404", value: 404 },
  { label: "429", value: 429 },
  { label: "500", value: 500 },
  { label: "502", value: 502 },
  { label: "503", value: 503 },
];

export default function App() {
  const [logs, setLogs]         = useState([]);
  const [stats, setStats]       = useState({ total_requests: 0, average_response_time_ms: 0, methods: {} });
  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading]   = useState(false);

  // Filter state
  const [search, setSearch]           = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Chaos state
  const [chaos, setChaos] = useState({
    enabled: false,
    latency_ms: 0,
    error_code: null,
    path_filter: "",
  });
  const [chaosLoading, setChaosLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/api/logs`),
        fetch(`${API}/api/stats`),
      ]);
      setLogs(await logsRes.json());
      setStats(await statsRes.json());
    } catch (e) { console.error("Fetch error:", e); }
  }, []);

  const fetchChaos = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/api/chaos`);
      setChaos(await res.json());
    } catch (e) { console.error("Chaos fetch error:", e); }
  }, []);

  const saveChaos = async (newChaos) => {
    setChaosLoading(true);
    try {
      await fetch(`${PROXY}/api/chaos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChaos),
      });
      setChaos(newChaos);
    } catch (e) { console.error("Chaos save error:", e); }
    setChaosLoading(false);
  };

  const clearLogs = async () => {
    setLoading(true);
    await fetch(`${API}/api/logs`, { method: "DELETE" });
    setLogs([]); setSelected(null);
    setStats({ total_requests: 0, average_response_time_ms: 0, methods: {} });
    setSearch(""); setMethodFilter("ALL"); setStatusFilter("ALL");
    setLoading(false);
  };

  useEffect(() => { fetchData(); fetchChaos(); }, [fetchData, fetchChaos]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const filteredLogs = useMemo(() => {
    const statusFn = STATUS_FILTERS.find(f => f.label === statusFilter)?.fn || (() => true);
    return logs.filter(log => {
      const matchSearch = search === "" || log.path?.toLowerCase().includes(search.toLowerCase());
      const matchMethod = methodFilter === "ALL" || log.method === methodFilter;
      const matchStatus = statusFilter === "ALL" || statusFn(log.res_status);
      return matchSearch && matchMethod && matchStatus;
    });
  }, [logs, search, methodFilter, statusFilter]);

  const availableMethods = useMemo(() =>
    ["ALL", ...new Set(logs.map(l => l.method).filter(Boolean))],
  [logs]);

  const methodStyle = (method) => {
    const c = METHOD_COLORS[method] || { bg: "#2a2a3e", text: "#a78bfa", border: "#7c3aed" };
    return {
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: "4px", padding: "2px 8px", fontSize: "11px",
      fontWeight: "600", fontFamily: "monospace", letterSpacing: "0.05em",
    };
  };

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: "#0d0d14", color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflow: "hidden",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: "260px", minWidth: "260px", background: "#13131f",
        borderRight: "1px solid #1e1e30", display: "flex",
        flexDirection: "column", padding: "24px 16px", gap: "20px", overflowY: "auto",
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
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <StatCard label="Live Requests" value={stats.total_requests || 0} />
          <StatCard label="Avg Response" value={`${Math.round(stats.average_response_time_ms || 0)}ms`} />
          <StatCard label="Showing" value={`${filteredLogs.length} / ${logs.length}`} />
        </div>

        {/* Method breakdown */}
        {stats.methods && Object.keys(stats.methods).length > 0 && (
          <div>
            <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "8px" }}>BY METHOD</div>
            {Object.entries(stats.methods).map(([method, count]) => (
              <div key={method} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={methodStyle(method)}>{method}</span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Chaos Injector Panel ── */}
        <div style={{
          background: "#0d0d14",
          border: `1px solid ${chaos.enabled ? "#dc2626" : "#1e1e30"}`,
          borderRadius: "10px", padding: "14px",
          transition: "border-color 0.3s",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: chaos.enabled ? "#f87171" : "#e2e8f0" }}>
                ⚡ Chaos Injector
              </div>
              <div style={{ fontSize: "10px", color: "#4a4a6a", marginTop: "2px" }}>
                {chaos.enabled ? "ACTIVE — breaking things" : "off"}
              </div>
            </div>
            {/* Toggle */}
            <div
              onClick={() => saveChaos({ ...chaos, enabled: !chaos.enabled })}
              style={{
                width: "40px", height: "22px", borderRadius: "11px",
                background: chaos.enabled ? "#dc2626" : "#2a2a3e",
                cursor: "pointer", position: "relative", transition: "background 0.3s",
                border: `1px solid ${chaos.enabled ? "#ef4444" : "#3a3a5e"}`,
              }}
            >
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%",
                background: "#fff", position: "absolute",
                top: "2px", left: chaos.enabled ? "20px" : "2px",
                transition: "left 0.3s",
              }} />
            </div>
          </div>

          {/* Latency slider */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em" }}>LATENCY</span>
              <span style={{ fontSize: "11px", color: chaos.latency_ms > 0 ? "#fbbf24" : "#4a4a6a", fontWeight: "600" }}>
                {chaos.latency_ms}ms
              </span>
            </div>
            <input
              type="range" min="0" max="5000" step="100"
              value={chaos.latency_ms}
              onChange={e => setChaos({ ...chaos, latency_ms: parseInt(e.target.value) })}
              onMouseUp={e => saveChaos({ ...chaos, latency_ms: parseInt(e.target.value) })}
              style={{ width: "100%", accentColor: "#fbbf24", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#2a2a3e" }}>
              <span>0ms</span><span>2.5s</span><span>5s</span>
            </div>
          </div>

          {/* Error code picker */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "6px" }}>
              FORCE ERROR
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {ERROR_CODES.map(ec => {
                const active = chaos.error_code === ec.value;
                const isError = ec.value >= 400;
                return (
                  <button key={ec.label}
                    onClick={() => saveChaos({ ...chaos, error_code: ec.value })}
                    style={{
                      background: active ? (isError ? "#dc2626" : "#2a2a3e") : "#13131f",
                      color: active ? "#fff" : (isError ? "#f87171" : "#6b7280"),
                      border: `1px solid ${active ? (isError ? "#ef4444" : "#3a3a5e") : "#1e1e30"}`,
                      borderRadius: "4px", padding: "3px 7px", fontSize: "11px",
                      cursor: "pointer", fontFamily: "monospace", fontWeight: "600",
                      transition: "all 0.15s",
                    }}
                  >{ec.label}</button>
                );
              })}
            </div>
          </div>

          {/* Path filter */}
          <div>
            <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "6px" }}>
              PATH FILTER <span style={{ color: "#2a2a3e" }}>(leave blank for all)</span>
            </div>
            <input
              type="text" placeholder="/posts"
              value={chaos.path_filter}
              onChange={e => setChaos({ ...chaos, path_filter: e.target.value })}
              onBlur={e => saveChaos({ ...chaos, path_filter: e.target.value })}
              style={{
                width: "100%", background: "#13131f", border: "1px solid #1e1e30",
                borderRadius: "6px", padding: "6px 10px", color: "#e2e8f0",
                fontSize: "12px", outline: "none", fontFamily: "monospace",
              }}
            />
          </div>

          {/* Active chaos summary */}
          {chaos.enabled && (
            <div style={{
              marginTop: "12px", padding: "8px 10px",
              background: "#1e0a0a", border: "1px solid #3d1a1a",
              borderRadius: "6px", fontSize: "11px", color: "#f87171",
            }}>
              {chaos.latency_ms > 0 && <div>⏱ +{chaos.latency_ms}ms delay</div>}
              {chaos.error_code && <div>💥 Forcing {chaos.error_code} errors</div>}
              {chaos.path_filter && <div>🎯 Only on paths with "{chaos.path_filter}"</div>}
              {!chaos.latency_ms && !chaos.error_code && <div>⚠️ Enable latency or error above</div>}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{
            background: autoRefresh ? "#1a3a1a" : "#1e1e2e",
            color: autoRefresh ? "#34d399" : "#6b7280",
            border: `1px solid ${autoRefresh ? "#059669" : "#2a2a3e"}`,
            borderRadius: "6px", padding: "8px 12px", fontSize: "12px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span style={{ fontSize: "10px" }}>{autoRefresh ? "⬤" : "○"}</span>
            Auto-Refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button onClick={clearLogs} disabled={loading} style={{
            background: "#1e1a1a", color: "#f87171",
            border: "1px solid #3d1a1a", borderRadius: "6px",
            padding: "8px 12px", fontSize: "12px", cursor: "pointer",
          }}>🗑 Clear All Logs</button>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "12px 24px", borderBottom: "1px solid #1e1e30",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#13131f",
        }}>
          <span style={{ fontSize: "12px", color: "#4a4a6a", letterSpacing: "0.1em" }}>INTERCEPTED TRAFFIC</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {chaos.enabled && (
              <span style={{
                fontSize: "11px", color: "#f87171",
                background: "#1e0a0a", border: "1px solid #3d1a1a",
                borderRadius: "4px", padding: "2px 8px",
                animation: "pulse 1.5s infinite",
              }}>⚡ CHAOS ACTIVE</span>
            )}
            <span style={{ fontSize: "11px", color: autoRefresh ? "#34d399" : "#4a4a6a", display: "flex", alignItems: "center", gap: "5px" }}>
              {autoRefresh && <span style={{ animation: "pulse 1.5s infinite" }}>⬤</span>}
              {autoRefresh ? "Live" : "Paused"}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          padding: "10px 24px", borderBottom: "1px solid #1e1e30",
          background: "#0f0f1a", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <div style={{ position: "relative", flex: "1", minWidth: "160px", maxWidth: "280px" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4a4a6a", fontSize: "12px" }}>🔍</span>
            <input
              type="text" placeholder="Search paths..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", background: "#13131f", border: "1px solid #1e1e30",
                borderRadius: "6px", padding: "6px 10px 6px 30px",
                color: "#e2e8f0", fontSize: "12px", outline: "none", fontFamily: "monospace",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#4a4a6a", cursor: "pointer", fontSize: "12px",
              }}>✕</button>
            )}
          </div>

          <div style={{ width: "1px", height: "20px", background: "#1e1e30" }} />

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em" }}>METHOD</span>
            {availableMethods.map(m => {
              const active = methodFilter === m;
              const c = METHOD_COLORS[m] || { text: "#a78bfa", border: "#7c3aed" };
              return (
                <button key={m} onClick={() => setMethodFilter(m)} style={{
                  background: active ? (c.text) : "#13131f",
                  color: active ? "#000" : c.text,
                  border: `1px solid ${c.border || "#7c3aed"}`,
                  borderRadius: "4px", padding: "3px 8px", fontSize: "11px",
                  fontWeight: "600", cursor: "pointer", fontFamily: "monospace",
                }}>{m}</button>
              );
            })}
          </div>

          <div style={{ width: "1px", height: "20px", background: "#1e1e30" }} />

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em" }}>STATUS</span>
            {STATUS_FILTERS.map(f => {
              const colors = { ALL: { text: "#a78bfa", border: "#7c3aed" }, "2xx": { text: "#34d399", border: "#059669" }, "3xx": { text: "#60a5fa", border: "#2563eb" }, "4xx": { text: "#fb923c", border: "#ea580c" }, "5xx": { text: "#f87171", border: "#dc2626" } };
              const c = colors[f.label];
              const active = statusFilter === f.label;
              return (
                <button key={f.label} onClick={() => setStatusFilter(f.label)} style={{
                  background: active ? c.text : "#13131f",
                  color: active ? "#000" : c.text,
                  border: `1px solid ${c.border}`,
                  borderRadius: "4px", padding: "3px 8px", fontSize: "11px",
                  fontWeight: "600", cursor: "pointer", fontFamily: "monospace",
                }}>{f.label}</button>
              );
            })}
          </div>

          {(search || methodFilter !== "ALL" || statusFilter !== "ALL") && (
            <button onClick={() => { setSearch(""); setMethodFilter("ALL"); setStatusFilter("ALL"); }} style={{
              background: "none", border: "1px solid #2a2a3e", borderRadius: "4px",
              color: "#4a4a6a", fontSize: "11px", padding: "3px 8px", cursor: "pointer", marginLeft: "auto",
            }}>Reset</button>
          )}
        </div>

        {/* Table + Detail */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredLogs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#2a2a3e", gap: "12px" }}>
                <div style={{ fontSize: "48px" }}>👻</div>
                <div style={{ fontSize: "14px" }}>{logs.length === 0 ? "No traffic recorded yet" : "No results match your filters"}</div>
                {logs.length === 0 && <div style={{ fontSize: "12px", color: "#1e1e30" }}>Visit http://localhost:8080/posts to capture traffic</div>}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0d0d14", position: "sticky", top: 0, zIndex: 1 }}>
                    {["Timestamp", "Method", "Path", "Status", "Time", "Chaos"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", borderBottom: "1px solid #1e1e30", fontWeight: "500" }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const isChaos = log.res_body?.includes('"phantom":true');
                    return (
                      <tr key={log.id}
                        onClick={() => setSelected(selected?.id === log.id ? null : log)}
                        style={{
                          borderBottom: "1px solid #1a1a28", cursor: "pointer",
                          background: selected?.id === log.id ? "#1a1a2e" : isChaos ? "#1a0a0a" : "transparent",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { if (selected?.id !== log.id) e.currentTarget.style.background = "#16162a" }}
                        onMouseLeave={e => { if (selected?.id !== log.id) e.currentTarget.style.background = isChaos ? "#1a0a0a" : "transparent" }}
                      >
                        <td style={{ padding: "10px 16px", fontSize: "12px", color: "#4a4a6a" }}>{timeAgo(log.timestamp)}</td>
                        <td style={{ padding: "10px 16px" }}><span style={methodStyle(log.method)}>{log.method}</span></td>
                        <td style={{ padding: "10px 16px", fontSize: "12px", color: "#a0aec0", fontFamily: "monospace" }}>
                          {search ? (
                            log.path.split(new RegExp(`(${search})`, "gi")).map((part, i) =>
                              part.toLowerCase() === search.toLowerCase()
                                ? <mark key={i} style={{ background: "#fbbf24", color: "#000", borderRadius: "2px" }}>{part}</mark>
                                : part
                            )
                          ) : log.path}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: "600", color: getStatusColor(log.res_status) }}>{log.res_status}</td>
                        <td style={{ padding: "10px 16px", fontSize: "12px", color: "#4a4a6a" }}>{log.res_time_ms ? `${Math.round(log.res_time_ms)}ms` : "—"}</td>
                        <td style={{ padding: "10px 16px", fontSize: "11px", color: "#f87171" }}>{isChaos ? "⚡" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{
              width: "380px", minWidth: "380px", borderLeft: "1px solid #1e1e30",
              background: "#13131f", overflowY: "auto", padding: "20px",
              display: "flex", flexDirection: "column", gap: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#4a4a6a", letterSpacing: "0.1em" }}>REQUEST DETAIL</span>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#4a4a6a", cursor: "pointer", fontSize: "16px" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={methodStyle(selected.method)}>{selected.method}</span>
                <span style={{ fontSize: "12px", color: "#a0aec0", fontFamily: "monospace" }}>{selected.path}</span>
              </div>
              <DetailSection title="STATUS">
                <span style={{ color: getStatusColor(selected.res_status), fontWeight: "600" }}>{selected.res_status}</span>
                <span style={{ color: "#4a4a6a", marginLeft: "12px", fontSize: "12px" }}>{selected.res_time_ms ? `${Math.round(selected.res_time_ms)}ms` : ""}</span>
              </DetailSection>
              {selected.req_headers && <DetailSection title="REQUEST HEADERS"><CodeBlock content={selected.req_headers} /></DetailSection>}
              {selected.req_body && <DetailSection title="REQUEST BODY"><CodeBlock content={selected.req_body} /></DetailSection>}
              {selected.res_body && <DetailSection title="RESPONSE BODY"><CodeBlock content={selected.res_body} /></DetailSection>}
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
        input::placeholder { color: #4a4a6a; }
        input:focus { border-color: #7c3aed !important; }
        input[type=range] { height: 4px; }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "#0d0d14", border: "1px solid #1e1e30", borderRadius: "8px", padding: "12px 14px" }}>
      <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "4px" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: "20px", fontWeight: "700", color: "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#4a4a6a", letterSpacing: "0.1em", marginBottom: "8px" }}>{title}</div>
      {children}
    </div>
  );
}

function CodeBlock({ content }) {
  let formatted = content;
  try { formatted = JSON.stringify(JSON.parse(content), null, 2); } catch {}
  return (
    <pre style={{
      background: "#0d0d14", border: "1px solid #1e1e30", borderRadius: "6px",
      padding: "12px", fontSize: "11px", color: "#a0aec0", overflowX: "auto",
      whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "200px", overflowY: "auto",
    }}>{formatted}</pre>
  );
}