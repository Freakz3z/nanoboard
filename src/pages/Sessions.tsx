import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { chatSessionApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  MessageSquare,
  Clock,
  FileText,
  User,
  Bot,
  Settings,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatSession {
  id: string;
  name: string;
  title: string;
  modified: number;
  size: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

export default function Sessions() {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setIsLoading(true);
    try {
      const result = await chatSessionApi.list();
      if (result.sessions) {
        setSessions(result.sessions);
      }
    } catch (error) {
      toast.showError(t("chatSessions.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  async function selectSession(session: ChatSession) {
    setSelectedSession(session);
    setMessages([]);
    setIsLoadingContent(true);

    try {
      const result = await chatSessionApi.getContent(session.id);
      if (result.success) {
        setMessages(result.messages || []);
      } else {
        toast.showError(result.message || t("chatSessions.loadContentFailed"));
      }
    } catch (error) {
      toast.showError(t("chatSessions.loadContentFailed"));
    } finally {
      setIsLoadingContent(false);
    }
  }

  function formatTimestamp(timestamp: number): string {
    if (!timestamp) return t("chatSessions.unknown");
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? t("chatSessions.justNow") : t("chatSessions.minutesAgo", { count: minutes });
      }
      return t("chatSessions.hoursAgo", { count: hours });
    } else if (days === 1) {
      return t("chatSessions.yesterday");
    } else if (days < 7) {
      return t("chatSessions.daysAgo", { count: days });
    } else {
      return date.toLocaleDateString(i18n.language === "en" ? "en-US" : "zh-CN");
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // 自动滚动到底部
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 获取消息样式配置 - 玻璃质感
  function getMessageStyle(role: string) {
    // 统一使用相同的气泡样式
    const bubbleStyle = "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200/50 dark:border-gray-700/50";

    switch (role) {
      case "user":
        return {
          container: "justify-end",
          bubble: bubbleStyle,
          icon: User,
          label: t("chatSessions.user"),
          labelClass: "text-gray-600 dark:text-gray-400",
        };
      case "assistant":
        return {
          container: "justify-start",
          bubble: bubbleStyle,
          icon: Bot,
          label: t("chatSessions.assistant"),
          labelClass: "text-gray-600 dark:text-gray-400",
        };
      case "system":
        return {
          container: "justify-center",
          bubble: bubbleStyle,
          icon: Settings,
          label: t("chatSessions.system"),
          labelClass: "text-gray-600 dark:text-gray-400",
        };
      default:
        return {
          container: "justify-start",
          bubble: bubbleStyle,
          icon: MessageSquare,
          label: role,
          labelClass: "text-gray-600 dark:text-gray-400",
        };
    }
  }

  // 渲染单条消息
  function renderMessage(message: ChatMessage, index: number) {
    const style = getMessageStyle(message.role);
    const Icon = style.icon;

    return (
      <div key={index} className={`flex ${style.container} mb-4 min-w-0`}>
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${style.bubble} min-w-0 overflow-hidden`}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className={`text-sm font-medium ${style.labelClass}`}>
              {style.label}
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-pre:my-2 prose-pre:bg-gray-800/50 dark:prose-pre:bg-gray-900/50 prose-pre:overflow-x-auto prose-code:text-inherit prose-table:text-sm prose-table:block prose-table:overflow-x-auto prose-th:bg-gray-100/50 dark:prose-th:bg-gray-700/50 prose-th:p-2 prose-td:p-2 prose-thead:border-b prose-tbody:border-collapse break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg-base dark:to-dark-bg-sidebar transition-colors duration-200">
      {/* 页面头部 */}
      <div className="border-b border-gray-200/50 dark:border-dark-border-subtle bg-white/80 dark:bg-dark-bg-card/80 backdrop-blur-xl flex-shrink-0 transition-colors duration-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {t("chatSessions.title")}
          </h1>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 左侧会话列表 */}
        <div className="w-80 border-r border-gray-200/50 dark:border-dark-border-subtle flex flex-col bg-white/60 dark:bg-dark-bg-card/60 backdrop-blur-xl overflow-hidden transition-colors duration-200">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title={t("chatSessions.noSessions")}
                description={t("chatSessions.noSessionsDesc")}
              />
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedSession?.id === session.id
                      ? "bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-sm border border-blue-300/50 dark:border-blue-500/50"
                      : "hover:bg-white/60 dark:hover:bg-dark-bg-hover/60 border border-transparent"
                  }`}
                >
                  <div className="flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm">
                      {session.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate mt-0.5">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                      <span>{formatSize(session.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(session.modified)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧会话内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent transition-colors duration-200">
          {selectedSession ? (
            <>
              {/* 头部 */}
              <div className="bg-white/60 dark:bg-dark-bg-card/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                    {selectedSession.name}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-dark-text-muted ml-auto">
                    {formatSize(selectedSession.size)} · {formatTimestamp(selectedSession.modified)}
                  </span>
                </div>
              </div>

              {/* 消息区域 */}
              <div className="flex-1 min-h-0 overflow-hidden p-6">
                {isLoadingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={FileText}
                      title={t("chatSessions.noMessages")}
                      description={t("chatSessions.noMessagesDesc")}
                    />
                  </div>
                ) : (
                  <div
                    ref={messagesContainerRef}
                    className="h-full overflow-y-auto overflow-x-hidden bg-white/40 dark:bg-dark-bg-card/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-dark-border-subtle/50 p-6 scrollbar-thin"
                  >
                    {messages.map((msg, idx) => renderMessage(msg, idx))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={FileText}
                title={t("chatSessions.selectSession")}
                description={t("chatSessions.selectSessionDesc")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
