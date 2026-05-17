import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Trash2, Activity, Clock, Server, FileText, Globe, Code2 } from 'lucide-react';

export default function App() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  }, []);

  const clearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all logs?")) return;
    try {
      await fetch('http://localhost:8000/api/logs', { method: 'DELETE' });
      setLogs([]);
      setSelectedLogId(null);
      fetchStats();
    } catch (e) {
      console.error("Failed to clear logs:", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLogs, fetchStats]);

  const getMethodColor = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'POST': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PUT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'PATCH': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-emerald-400';
    if (status >= 300 && status < 400) return 'text-blue-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    if (status >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  const tryFormatJSON = (str) => {
    if (!str) return '';
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const selectedLog = logs.find(l => l.id === selectedLogId);

  return (
    <div className="flex h-screen bg-black text-gray-300 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800/60 flex flex-col shadow-xl z-10 shrink-0">
        <div className="p-6 border-b border-gray-800/60">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="text-2xl">👻</span> Phantom
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-wider">Traffic Proxy</p>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-8">
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-gray-400 mb-1 text-sm font-medium">
                <Activity className="w-4 h-4 text-indigo-400" />
                Live Requests
              </div>
              <div className="text-4xl font-bold text-white tracking-tight">
                {stats?.total_requests || 0}
              </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-gray-400 mb-1 text-sm font-medium">
                <Clock className="w-4 h-4 text-emerald-400" />
                Avg Response
              </div>
              <div className="text-2xl font-semibold text-gray-100 flex items-baseline gap-1">
                {stats?.average_response_time_ms || 0} <span className="text-sm text-gray-500 font-normal">ms</span>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                autoRefresh 
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20' 
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-Refresh
              </div>
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-gray-600'}`} />
            </button>
            
            <button 
              onClick={clearLogs}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent z-10" />
        
        <div className="flex-1 overflow-auto bg-[#0a0a0c]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-md z-10 border-b border-gray-800/60 shadow-sm">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Path</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {logs.map(log => (
                <tr 
                  key={log.id} 
                  onClick={() => setSelectedLogId(log.id)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    selectedLogId === log.id 
                      ? 'bg-indigo-500/10' 
                      : 'hover:bg-gray-900/40'
                  }`}
                >
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-400 group-hover:text-gray-300">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getMethodColor(log.method)}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-gray-200 truncate max-w-[200px] xl:max-w-[400px]">
                    {log.path}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-current ${getStatusColor(log.res_status)}`} />
                      <span className={`text-sm font-medium ${getStatusColor(log.res_status)}`}>
                        {log.res_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-400 text-right group-hover:text-gray-300 font-mono">
                    {log.res_time_ms}ms
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-24 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Globe className="w-8 h-8 text-gray-700 opacity-50" />
                      <p>No traffic recorded yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedLog && (
        <div className="w-1/3 min-w-[400px] bg-gray-950 border-l border-gray-800/60 flex flex-col shadow-2xl shrink-0 transition-all duration-300">
          <div className="p-5 border-b border-gray-800/60 flex items-center justify-between bg-gray-900/20">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Request Details
            </h2>
            <button 
              onClick={() => setSelectedLogId(null)}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
            {/* Header section */}
            <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-gray-800/50">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getMethodColor(selectedLog.method)}`}>
                {selectedLog.method}
              </span>
              <span className="font-mono text-sm text-gray-300 break-all">{selectedLog.path}</span>
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2 uppercase tracking-wider">
                <Server className="w-4 h-4" /> Request
              </h3>
              
              <div className="space-y-2">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider">Headers</h4>
                <div className="bg-[#0f0f13] border border-gray-800 rounded-lg p-3 overflow-auto max-h-48 custom-scrollbar">
                  <pre className="text-xs text-gray-300 font-mono">
                    {tryFormatJSON(selectedLog.req_headers)}
                  </pre>
                </div>
              </div>

              {selectedLog.req_body && (
                <div className="space-y-2">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider">Body</h4>
                  <div className="bg-[#0f0f13] border border-gray-800 rounded-lg p-3 overflow-auto max-h-48 custom-scrollbar">
                    <pre className="text-xs text-emerald-400 font-mono">
                      {tryFormatJSON(selectedLog.req_body)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-800/60" />

            {/* Response Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 uppercase tracking-wider">
                  <Code2 className="w-4 h-4" /> Response
                </h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`font-medium ${getStatusColor(selectedLog.res_status)}`}>
                    {selectedLog.res_status}
                  </span>
                  <span className="text-gray-500 font-mono text-xs border border-gray-800 rounded px-1.5 py-0.5">
                    {selectedLog.res_time_ms}ms
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider">Body</h4>
                <div className="bg-[#0f0f13] border border-gray-800 rounded-lg p-3 overflow-auto max-h-96 custom-scrollbar">
                  <pre className="text-xs text-sky-300 font-mono break-all whitespace-pre-wrap">
                    {tryFormatJSON(selectedLog.res_body) || '(Empty Response)'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
