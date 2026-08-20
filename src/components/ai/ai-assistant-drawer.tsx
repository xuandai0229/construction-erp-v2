"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Bot, ExternalLink, RefreshCw, Send, Sparkles, ThumbsDown, ThumbsUp, User, X } from "lucide-react";
import { deriveAIUIContext, getAIModuleLabel } from "@/lib/ai/context/ai-ui-context";
import type { AISource, AIProviderMode } from "@/lib/ai/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AISource[];
  traceId?: string;
  asOf?: string;
  qualityFlags?: string[];
  coverageSummary?: string;
}

interface AIAssistantDrawerProps {
  activeProjectId?: string;
  activeProjectCode?: string;
  activeProjectName?: string;
  userRole: string;
  providerStatus: {
    mode: AIProviderMode;
    provider: "mock" | "openai";
    available: boolean;
    remote: boolean;
    mock: boolean;
    blockedReason?: "BLOCKED_NO_KEY";
  };
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Tôi là Copilot briefing xây dựng read-only. Tôi chỉ dùng dữ liệu ERP trong phạm vi quyền của bạn, nêu rõ dữ liệu thiếu và đính kèm nguồn có thể mở.",
};

export function AIAssistantDrawer({
  activeProjectId,
  activeProjectCode,
  activeProjectName,
  userRole,
  providerStatus,
}: AIAssistantDrawerProps) {
  const pathname = usePathname();
  const uiContext = useMemo(() => deriveAIUIContext(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [conversationId, setConversationId] = useState<string>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const statusLabel = providerStatus.blockedReason === "BLOCKED_NO_KEY"
    ? "Remote bị khóa"
    : providerStatus.mock
      ? "Mô phỏng local"
      : "OpenAI Remote";

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;
    const userMessage: Message = { id: `user_${Date.now()}`, role: "user", content: query };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          activeProjectId,
          conversationId,
          uiContext,
        }),
      });
      const data = await response.json();
      if (data.conversationId) setConversationId(data.conversationId);
      const assistantMessage: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: data.content || data.error?.message || "Không có phản hồi.",
        sources: data.sources,
        traceId: data.traceId,
        asOf: data.contextSnapshot?.effectiveTime,
        qualityFlags: data.qualityFlags,
        coverageSummary: data.coverageSummary,
      };
      setMessages((previous) => [...previous, assistantMessage]);
      if (!response.ok || !data.success) setErrorMsg(data.error?.message || "Không thể hoàn thành yêu cầu.");
    } catch {
      const message = "Không kết nối được tới API AI. Không có fallback sang dữ liệu giả.";
      setErrorMsg(message);
      setMessages((previous) => [...previous, { id: `err_${Date.now()}`, role: "assistant", content: message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async (message: Message, type: "HELPFUL" | "UNHELPFUL") => {
    if (!message.traceId) return;
    await fetch("/api/v1/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traceId: message.traceId, conversationId, type }),
    }).catch(() => undefined);
  };

  const clearChat = () => {
    setMessages([{ ...WELCOME, id: `welcome_${Date.now()}` }]);
    setConversationId(undefined);
    setErrorMsg(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-white shadow-lg transition hover:bg-slate-800"
        aria-label="Mở Trợ lý AI"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden text-sm font-medium sm:inline">Copilot công trường</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Trợ lý AI read-only">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <header className="border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="rounded-lg bg-slate-900 p-2 text-white"><Bot className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-950">Contextual Construction Copilot</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      <span className={`rounded border px-1.5 py-0.5 ${providerStatus.blockedReason ? "border-amber-300 bg-amber-50 text-amber-800" : providerStatus.mock ? "border-sky-300 bg-sky-50 text-sky-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>{statusLabel}</span>
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600">{getAIModuleLabel(uiContext.module)}</span>
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600">{userRole}</span>
                    </div>
                    <p className="mt-1.5 truncate text-xs text-slate-500">
                      {activeProjectName ? `[${activeProjectCode || activeProjectId}] ${activeProjectName}` : "Chưa chọn công trình — sẽ hỏi lại khi cần"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={clearChat} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" aria-label="Tạo cuộc trò chuyện mới"><RefreshCw className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" aria-label="Đóng Trợ lý AI"><X className="h-5 w-5" /></button>
                </div>
              </div>
            </header>

            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5">
              {[
                "Tình hình hôm nay?",
                "Tóm tắt tiến độ công trình",
                "Báo cáo hiện trường gần nhất?",
                "Tình hình tồn kho vật tư?",
                "Tôi có việc gì cần xử lý?",
              ].map((prompt) => (
                <button key={prompt} type="button" onClick={() => handleSendMessage(prompt)} disabled={isLoading} className="whitespace-nowrap rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50">{prompt}</button>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"><Bot className="h-4 w-4" /></div>}
                  <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-none bg-blue-700 text-white" : "rounded-bl-none bg-slate-100 text-slate-800"}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.coverageSummary && <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500">Phạm vi: {message.coverageSummary}</p>}
                    {message.qualityFlags && message.qualityFlags.length > 0 && (
                      <p className="mt-1 text-[11px] text-amber-700">Chất lượng dữ liệu: {message.qualityFlags.join(", ")}</p>
                    )}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2.5 border-t border-slate-200 pt-2">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Nguồn ERP</p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.sources.map((source) => source.route ? (
                            <a key={`${source.sourceType}:${source.recordId}`} href={source.route} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-blue-700 hover:border-blue-300" title={`Cập nhật: ${source.asOf}`}>
                              <ExternalLink className="h-3 w-3" />{source.label}
                            </a>
                          ) : (
                            <span key={`${source.sourceType}:${source.recordId}`} className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">{source.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {message.role === "assistant" && message.traceId && (
                      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span>{message.asOf ? `As of ${new Date(message.asOf).toLocaleString("vi-VN")}` : ""}</span>
                        <span className="flex gap-1">
                          <button type="button" onClick={() => submitFeedback(message, "HELPFUL")} aria-label="Phản hồi hữu ích" className="rounded p-1 hover:bg-white"><ThumbsUp className="h-3 w-3" /></button>
                          <button type="button" onClick={() => submitFeedback(message, "UNHELPFUL")} aria-label="Phản hồi không hữu ích" className="rounded p-1 hover:bg-white"><ThumbsDown className="h-3 w-3" /></button>
                        </span>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700"><User className="h-4 w-4" /></div>}
                </div>
              ))}
              {isLoading && <div className="flex items-center gap-3 text-sm text-slate-500"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white"><Bot className="h-4 w-4" /></div>Đang truy vấn nguồn ERP read-only…</div>}
              {errorMsg && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{errorMsg}</span></div>}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={(event) => { event.preventDefault(); handleSendMessage(); }} className="border-t border-slate-200 bg-white p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSendMessage(); } }}
                  placeholder="Hỏi về tiến độ, hiện trường, vật tư…"
                  disabled={isLoading}
                  rows={2}
                  maxLength={2000}
                  aria-label="Nhập câu hỏi cho Trợ lý AI"
                  className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50"
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="rounded-xl bg-blue-700 p-3 text-white hover:bg-blue-800 disabled:bg-slate-300" aria-label="Gửi câu hỏi"><Send className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">Read-only · tối đa 5 tool/turn · không có silent mock trong Remote</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
