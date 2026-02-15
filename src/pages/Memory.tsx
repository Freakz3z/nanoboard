import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { sessionApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  Brain,
  Search,
  Trash2,
  Clock,
  Save,
  X,
  Edit3,
  FileText,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Memory as MemoryType } from "../types";

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function Memory() {
  const { t, i18n } = useTranslation();
  const [memories, setMemories] = useState<MemoryType[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryType | null>(null);
  const [memoryContent, setMemoryContent] = useState<string>("");
  const [editingContent, setEditingContent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  // ...existing code...

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const toast = useToast();

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    setIsLoading(true);
    try {
      const result = await sessionApi.list();
      if (result.sessions) {
        setMemories(result.sessions);
      }
    } catch (error) {
      toast.showError(t("memory.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  async function selectMemory(memory: MemoryType) {
    if (isEditing && editingContent !== memoryContent) {
      // 使用 ConfirmDialog 替代 window.confirm
      setConfirmDialog({
        isOpen: true,
        title: t("memory.unsavedChanges"),
        message: t("memory.unsavedChanges"),
        onConfirm: async () => {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
          await loadSelectedMemory(memory);
        },
      });
      return;
    }

    await loadSelectedMemory(memory);
  }

  async function loadSelectedMemory(memory: MemoryType) {
    setSelectedMemory(memory);
    setIsEditing(false);

    try {
      const result = await sessionApi.getMemory(memory.id);
      if (result.content !== undefined) {
        setMemoryContent(result.content);
        setEditingContent(result.content);
      } else {
        setMemoryContent("");
        setEditingContent("");
      }
    } catch (error) {
      toast.showError(t("memory.loadContentFailed"));
    }
  }

  function startEdit() {
    setIsEditing(true);
    setEditingContent(memoryContent);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditingContent(memoryContent);
  }

  async function saveMemory() {
    if (!selectedMemory) return;

    try {
      const result = await sessionApi.saveMemory(selectedMemory.id, editingContent);
      if (result.success) {
        toast.showSuccess(t("memory.saved"));
        setMemoryContent(editingContent);
        setIsEditing(false);
        await loadMemories();
      } else {
        toast.showError(result.message || t("memory.saveFailed"));
      }
    } catch (error) {
      toast.showError(t("memory.saveFailed"));
    }
  }

  async function deleteMemory(memory: MemoryType) {
    setConfirmDialog({
      isOpen: true,
      title: t("memory.deleteMemory"),
      message: t("memory.deleteConfirm", { name: memory.name }),
      onConfirm: async () => {
        try {
          const result = await sessionApi.delete(memory.id);
          if (result.success) {
            toast.showSuccess(t("memory.deleted"));
            if (selectedMemory?.id === memory.id) {
              setSelectedMemory(null);
              setMemoryContent("");
              setEditingContent("");
              setIsEditing(false);
            }
            await loadMemories();
          } else {
            toast.showError(result.message || t("memory.deleteFailed"));
          }
        } catch (error) {
          toast.showError(t("memory.deleteFailed"));
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  function formatTimestamp(timestamp: number): string {
    if (!timestamp) return t("memory.unknown");
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? t("memory.justNow") : t("memory.minutesAgo", { count: minutes });
      }
      return t("memory.hoursAgo", { count: hours });
    } else if (days === 1) {
      return t("memory.yesterday");
    } else if (days < 7) {
      return t("memory.daysAgo", { count: days });
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

  const filteredMemories = memories.filter((memory) => {
    const query = searchQuery.toLowerCase();
    return memory.name.toLowerCase().includes(query);
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card flex-shrink-0 transition-colors duration-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {t("memory.title")}
          </h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
            <input
              type="text"
              placeholder={t("memory.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 左侧记忆列表 */}
        <div className="w-80 border-r border-gray-200 dark:border-dark-border-subtle flex flex-col bg-white dark:bg-dark-bg-card overflow-hidden transition-colors duration-200">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredMemories.length === 0 ? (
              <EmptyState
                icon={searchQuery ? Search : Brain}
                title={searchQuery ? t("memory.noMatching") : t("memory.noMemories")}
                description={searchQuery ? t("memory.tryOther") : t("memory.noMemoriesDesc")}
              />
            ) : (
              filteredMemories.map((memory) => (
                <div
                  key={memory.id}
                  onClick={() => selectMemory(memory)}
                  className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedMemory?.id === memory.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"
                  }`}
                >
                  <div className="flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm">
                      {memory.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                      {memory.size !== undefined && (
                        <span>{formatSize(memory.size)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(memory.modified || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMemory(memory);
                      }}
                      className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                      title={t("memory.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧记忆内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-bg-sidebar transition-colors duration-200">
          {selectedMemory ? (
            <>
              {/* 头部 */}
              <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                        {selectedMemory.name}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                      {selectedMemory.size !== undefined && `${formatSize(selectedMemory.size)} · `}
                      {formatTimestamp(selectedMemory.modified || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          {t("memory.cancel")}
                        </button>
                        <button
                          onClick={saveMemory}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Save className="w-4 h-4" />
                          {t("memory.save")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        {t("memory.edit")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 min-h-0 overflow-hidden p-6">
                {isEditing ? (
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary border border-gray-200 dark:border-dark-border-subtle rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 scrollbar-thin"
                    placeholder={t("memory.editorPlaceholder")}
                  />
                ) : (
                  <div className="h-full overflow-y-auto bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 scrollbar-thin">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed">
                      {memoryContent || t("memory.noContent")}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={Brain}
                title={t("memory.selectMemory")}
                description={t("memory.selectMemoryDesc")}
              />
            </div>
          )}
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="warning"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
      />
    </div>
  );
}
