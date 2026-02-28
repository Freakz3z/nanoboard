import { useTranslation } from "react-i18next";
import { MessageSquare, Clock, Search } from "lucide-react";
import EmptyState from "../EmptyState";

interface ChatSession {
  id: string;
  name: string;
  title: string;
  modified: number;
  size: number;
}

interface SessionListProps {
  sessions: ChatSession[];
  selectedSession: ChatSession | null;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onSelect: (session: ChatSession) => void;
  formatSize: (bytes: number) => string;
  formatTimestamp: (timestamp: number, t: any, i18n: any) => string;
}

export default function SessionList({
  sessions,
  selectedSession,
  searchQuery,
  isLoading,
  onSearchChange,
  onSelect,
  formatSize,
  formatTimestamp,
}: SessionListProps) {
  const { t, i18n } = useTranslation();

  const filteredSessions = sessions.filter((session) => {
    const query = searchQuery.toLowerCase();
    return (
      session.name.toLowerCase().includes(query) ||
      (session.title && session.title.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          icon={searchQuery ? Search : MessageSquare}
          title={searchQuery ? t("workspace.noMatchingSessions") : t("workspace.noSessions")}
          description={searchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noSessionsDesc")}
        />
      ) : (
        filteredSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelect(session)}
            className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedSession?.id === session.id
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"
            }`}
          >
            <div className="flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-green-500 dark:text-green-400" />
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
                  {formatTimestamp(session.modified, t, i18n)}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
