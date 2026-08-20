"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ type: "PROJECT" | "REPORT" | "SYSTEM"; code?: string; name?: string }>;
}

interface AIAssistantDrawerProps {
  activeProjectId?: string;
  activeProjectName?: string;
}

export function AIAssistantDrawer({ activeProjectId, activeProjectName }: AIAssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Xin chào! Tôi là Trợ lý AI Read-Only của hệ thống ERP Xây dựng. Tôi có thể giúp bạn tra cứu nhanh danh sách công trình, tóm tắt tiến độ, báo cáo hiện trường, vật tư và công việc cần xử lý trong phạm vi quyền hạn của bạn.",
    },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          activeProjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorText = data.error?.message || "Không thể tải phản hồi từ trợ lý AI.";
        setErrorMsg(errorText);
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${errorText}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: "assistant",
            content: data.content,
            sources: data.sources,
          },
        ]);
      }
    } catch {
      setErrorMsg("Lỗi kết nối tới máy chủ AI. Vui lòng kiểm tra lại mạng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: "Đã tạo phiên trò chuyện mới. Tôi có thể hỗ trợ gì cho bạn?",
      },
    ]);
    setErrorMsg(null);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105"
        title="Mở Trợ lý AI"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Trợ lý AI ERP</span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md md:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    Trợ lý AI Read-Only
                    <span className="text-[10px] uppercase font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      An toàn
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 truncate max-w-[240px]">
                    {activeProjectName
                      ? `Ngữ cảnh: ${activeProjectName}`
                      : "Phạm vi: Toàn quyền được phân công"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Xóa phiên chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleQuickPrompt("Tôi đang phụ trách những công trình nào?")}
                className="text-xs bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors"
              >
                📋 Dự án của tôi
              </button>
              <button
                onClick={() => handleQuickPrompt("Tóm tắt thông tin công trình")}
                className="text-xs bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors"
              >
                📊 Tóm tắt công trình
              </button>
              <button
                onClick={() => handleQuickPrompt("Các báo cáo hiện trường gần nhất?")}
                className="text-xs bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors"
              >
                📝 Báo cáo hiện trường
              </button>
              <button
                onClick={() => handleQuickPrompt("Tình hình tồn kho vật tư công trình?")}
                className="text-xs bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors"
              >
                📦 Tồn kho vật tư
              </button>
              <button
                onClick={() => handleQuickPrompt("Tôi có công việc gì cần xử lý?")}
                className="text-xs bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors"
              >
                ⏳ Việc cần xử lý
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Sources Badge */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex flex-wrap gap-1.5">
                        {msg.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded shadow-xs"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-500" />
                            {s.code || s.name || s.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-xs text-gray-400 ml-1">Đang tra cứu dữ liệu...</span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi về tiến độ, báo cáo, vật tư..."
                  disabled={isLoading}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2.5 rounded-xl transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Trợ lý AI chỉ đọc dữ liệu theo phân quyền • Không thể ghi hoặc xóa dữ liệu
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
