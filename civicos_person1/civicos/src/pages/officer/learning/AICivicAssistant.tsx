import React, { useState, useRef, useEffect } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { backendService, SystemStatusSummary } from '../../../services/backendService';
import {
  Bot,
  User,
  Send,
  Database,
  Server,
  Cpu,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'ollama' | 'factual_engine' | 'fallback' | 'database';
  model?: string;
  dataSource?: string;
  recordsReferenced?: string[];
  intent?: string;
  timestamp: string;
}

export const AICivicAssistant: React.FC = () => {
  const { incidents } = useMccStore();

  const [systemStatus, setSystemStatus] = useState<SystemStatusSummary | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello Officer. I am your **CivicOS AI Operations Assistant**, connected live to municipal database records and spatial telemetry.\n\nYou can ask me regarding:\n• Inter-departmental coordination needs\n• Unassigned complaint backlogs\n• Ward incident loads and critical hazards\n• Department workloads and fleet resource availability',
      source: 'database',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const status = await backendService.checkAIStatus();
      setSystemStatus(status);
    } catch {
      setSystemStatus(null);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await backendService.chatWithAssistant(text, {
        totalIncidents: incidents.length,
        criticalCount: incidents.filter(i => i.severity === 'Critical').length
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.content,
          source: res.source as any,
          model: res.model,
          dataSource: res.dataSource,
          recordsReferenced: res.recordsReferenced,
          intent: res.intent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to communicate with the intelligence backend (${err?.message || 'Connection error'}). Please verify that the Express backend is running on port 5000.`,
          source: 'fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const standardQuestions = [
    'Which incidents require multiple departments?',
    'How many incidents are currently unassigned?',
    'Which department has the highest workload?',
    'Show high-priority incidents.',
    'Which wards have the highest incident counts?',
    'What are today\'s critical incidents?',
    'What resources are currently available in the fleet?',
    'Which wards have recurring problems?'
  ];

  const backendOnline = systemStatus?.backend?.status === 'online';
  const dbStatus = systemStatus?.database?.type || 'Checking...';
  const isPostgresLive = systemStatus?.database?.status === 'connected';
  const recordCount = systemStatus?.database?.totalIncidents ?? incidents.length;
  const llmOnline = systemStatus?.llm?.available ?? false;
  const llmModel = systemStatus?.llm?.model || 'llama3.2:latest';
  const factualReady = systemStatus?.factualEngine?.available ?? false;

  return (
    <div className="space-y-4 p-4 h-[calc(100vh-100px)] flex flex-col">
      {/* HEADER WITH MULTI-SYSTEM STATUS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">AI Civic Operations Assistant</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                Module H • Decision Support
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium">
              Factually grounded co-pilot for rapid situational triage, ward workload queries and inter-agency intelligence
            </p>
          </div>

          <button
            onClick={refreshStatus}
            disabled={isRefreshingStatus}
            className="text-[11px] font-semibold text-slate-500 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
          >
            {isRefreshingStatus ? 'Probing...' : 'Refresh Status'}
          </button>
        </div>

        {/* 4 TRUTHFUL SYSTEM STATUS INDICATORS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {/* 1. Backend Connectivity */}
          <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <Server className={`w-3.5 h-3.5 ${backendOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-slate-400">Backend API</div>
              <div className="font-semibold text-slate-800 flex items-center space-x-1">
                <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{backendOnline ? 'Online (:5000)' : 'Offline'}</span>
              </div>
            </div>
          </div>

          {/* 2. Database Connectivity */}
          <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <Database className={`w-3.5 h-3.5 ${isPostgresLive ? 'text-emerald-600' : backendOnline ? 'text-amber-600' : 'text-rose-600'}`} />
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-slate-400">Database Layer</div>
              <div className="font-semibold text-slate-800 flex items-center space-x-1 truncate" title={`${dbStatus} (${recordCount} records)`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPostgresLive ? 'bg-emerald-500' : backendOnline ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <span className="truncate">{backendOnline ? `${dbStatus} (${recordCount} recs)` : 'Unavailable'}</span>
              </div>
            </div>
          </div>

          {/* 3. Ollama / LLM Connectivity */}
          <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <Cpu className={`w-3.5 h-3.5 ${llmOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-slate-400">Local LLM</div>
              <div className="font-semibold text-slate-800 flex items-center space-x-1 truncate" title={systemStatus?.llm?.message || 'Offline'}>
                <span className={`w-1.5 h-1.5 rounded-full ${llmOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="truncate">{llmOnline ? `Ollama (${llmModel})` : 'Offline (No local daemon)'}</span>
              </div>
            </div>
          </div>

          {/* 4. Factual Grounding Engine */}
          <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <Sparkles className={`w-3.5 h-3.5 ${factualReady ? 'text-purple-600' : 'text-slate-400'}`} />
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold text-slate-400">Query Engine</div>
              <div className="font-semibold text-slate-800 flex items-center space-x-1">
                <span className={`w-1.5 h-1.5 rounded-full ${factualReady ? 'bg-purple-500' : 'bg-slate-300'}`} />
                <span>{factualReady ? 'DB-Grounded Ready' : 'Unavailable'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
        {/* Messages Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-line font-sans">
                    {msg.content}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 px-1 text-[10px] text-slate-400">
                  <span>{msg.timestamp}</span>

                  {msg.source && (
                    <span className="flex items-center space-x-1 font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                      {msg.source === 'ollama' ? (
                        <>
                          <Cpu className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Ollama LLM ({msg.model})</span>
                        </>
                      ) : msg.source === 'factual_engine' ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-purple-600" />
                          <span>DB Grounded ({msg.dataSource || dbStatus})</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-2.5 h-2.5 text-blue-600" />
                          <span>CivicOS Database</span>
                        </>
                      )}
                    </span>
                  )}

                  {msg.recordsReferenced && msg.recordsReferenced.length > 0 && (
                    <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-mono">
                      Ref: {msg.recordsReferenced.slice(0, 3).join(', ')}{msg.recordsReferenced.length > 3 ? ` +${msg.recordsReferenced.length - 3}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center space-x-2 text-slate-500 text-xs p-3 bg-purple-50/50 rounded-xl border border-purple-100 w-fit">
              <Bot className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="font-medium">Querying live database records and synthesizing verified operational answer...</span>
            </div>
          )}
        </div>

        {/* PROMPT PILLS & INPUT BOX */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 flex-shrink-0">
          {/* Quick-Prompt Pills */}
          <div className="flex flex-wrap gap-1.5">
            {standardQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(q)}
                disabled={isTyping}
                className="px-2.5 py-1 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition disabled:opacity-50 text-left"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Text input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(input);
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask the AI Civic Assistant anything about municipal status, incidents, wards..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
              className="flex-1 p-2.5 px-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AICivicAssistant;
