import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { fsApi, sessionApi, skillApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  FileText,
  Folder,
  Clock,
  Trash2,
  Search,
  ChevronRight,
  Home,
  Edit2,
  X,
  File,
  HardDrive,
  Wrench,
  ToggleLeft,
  ToggleRight,
  Save,
  Edit3,
  Brain,
  FolderTree,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Skill, Memory as MemoryType } from "../types";

// ============== 类型定义 ==============

type TabType = "files" | "skills" | "memory";

interface FsItem {
  name: string;
  path: string;
  relative_path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
}

interface Breadcrumb {
  name: string;
  path: string;
}

interface FrontmatterData {
  name?: string;
  description?: string;
  body: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "warning" | "info";
  onConfirm: () => void;
}

// ============== 工具函数 ==============

function parseFrontmatter(content: string): FrontmatterData {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { body: content };

  const raw = match[1];
  const body = content.slice(match[0].length);
  const data: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      data[key] = val;
    }
  }

  return {
    name: data.name,
    description: data.description,
    body,
  };
}

function formatTimestamp(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string, i18n: { language: string }): string {
  if (!timestamp) return t("workspace.unknown");
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? t("workspace.justNow") : t("workspace.minutesAgo", { count: minutes });
    }
    return t("workspace.hoursAgo", { count: hours });
  } else if (days === 1) {
    return t("workspace.yesterday");
  } else if (days < 7) {
    return t("workspace.daysAgo", { count: days });
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

// ============== 主组件 ==============

export default function Workspace() {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabType>("files");

  // ============== 文件管理状态 ==============
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FsItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  // ============== 技能管理状态 ==============
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");
  const [editingContent, setEditingContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isNewSkill, setIsNewSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [skillFrontmatter, setSkillFrontmatter] = useState<FrontmatterData>({ body: "" });

  // ============== 记忆管理状态 ==============
  const [memories, setMemories] = useState<MemoryType[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryType | null>(null);
  const [memoryContent, setMemoryContent] = useState<string>("");
  const [memoryEditingContent, setMemoryEditingContent] = useState<string>("");
  const [isMemoryEditing, setIsMemoryEditing] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");

  // ============== 通用状态 ==============
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // ============== 初始化加载 ==============
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  async function loadTabData(tab: TabType) {
    setIsLoading(true);
    try {
      switch (tab) {
        case "files":
          await loadDirectory("");
          break;
        case "skills":
          await loadSkills();
          break;
        case "memory":
          await loadMemories();
          break;
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ============== 文件管理函数 ==============

  async function loadDirectory(path: string) {
    try {
      const result = await fsApi.getDirectoryTree(path || undefined);
      if (result.success) {
        setItems(result.items || []);
        setCurrentPath(result.path || "");
        setSelectedItem(null);
        setFileContent("");
      } else {
        toast.showError(result.message || t("workspace.loadDirectoryFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.loadDirectoryFailed"));
    }
  }

  async function loadFileContentAction(item: FsItem) {
    if (item.type !== "file") return;

    try {
      const result = await fsApi.getFileContent(item.relative_path);
      if (result.success) {
        setFileContent(result.content || "");
        setSelectedItem(item);
      } else {
        toast.showError(result.message || t("workspace.loadFileContentFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.loadFileContentFailed"));
    }
  }

  async function deleteFsItem(item: FsItem) {
    const isFile = item.type === "file";
    setConfirmDialog({
      isOpen: true,
      title: isFile ? t("workspace.deleteFile") : t("workspace.deleteFolder"),
      message: isFile
        ? t("workspace.deleteFileConfirm", { name: item.name })
        : t("workspace.deleteFolderConfirm", { name: item.name }),
      type: "warning",
      onConfirm: async () => {
        try {
          const result = isFile
            ? await fsApi.deleteFile(item.relative_path)
            : await fsApi.deleteFolder(item.relative_path);

          if (result.success) {
            toast.showSuccess(result.message || t("workspace.deleted"));
            if (selectedItem?.relative_path === item.relative_path) {
              setSelectedItem(null);
              setFileContent("");
            }
            await loadDirectory(currentPath);
          } else {
            toast.showError(result.message || t("workspace.deleteFailed"));
          }
        } catch (error) {
          toast.showError(isFile ? t("workspace.deleteFileFailed") : t("workspace.deleteFolderFailed"));
        } finally {
          closeConfirmDialog();
        }
      },
    });
  }

  async function renameFsItem(item: FsItem) {
    const newName = prompt(t("workspace.newName"), item.name);
    if (!newName || newName === item.name) return;

    try {
      const result = await fsApi.renameItem(item.relative_path, newName);
      if (result.success) {
        toast.showSuccess(result.message || t("workspace.renameSuccess"));
        await loadDirectory(currentPath);
      } else {
        toast.showError(result.message || t("workspace.renameFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.renameFailed"));
    }
  }

  function getFileBreadcrumbs(): Breadcrumb[] {
    if (!currentPath || currentPath === "/") return [];

    const parts = currentPath.split("/").filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];

    let pathSoFar = "";
    for (let i = 0; i < parts.length; i++) {
      pathSoFar += (pathSoFar ? "/" : "") + parts[i];
      breadcrumbs.push({
        name: parts[i],
        path: pathSoFar,
      });
    }

    return breadcrumbs;
  }

  // ============== 技能管理函数 ==============

  async function loadSkills(): Promise<Skill[]> {
    try {
      const result = await skillApi.list();
      if (result.skills) {
        setSkills(result.skills);
        return result.skills;
      }
    } catch (error) {
      toast.showError(t("workspace.skillsLoadFailed"));
    }
    return [];
  }

  async function selectSkillAction(skill: Skill) {
    if (isEditing && !await confirmDiscardSkillChanges()) return;

    setSelectedSkill(skill);
    setIsEditing(false);
    setIsNewSkill(false);

    try {
      const result = await skillApi.getContent(skill.id);
      if (result.success && result.content) {
        setSkillContent(result.content);
        setEditingContent(result.content);
        setSkillFrontmatter(parseFrontmatter(result.content));
      } else {
        toast.showError(result.message || t("workspace.skillsLoadContentFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.skillsLoadContentFailed"));
    }
  }

  async function toggleSkillAction(skill: Skill) {
    try {
      const result = await skillApi.toggle(skill.id, !skill.enabled);
      if (result.success) {
        toast.showSuccess(result.enabled ? t("workspace.skillEnabled") : t("workspace.skillDisabled"));
        const updatedSkills = await loadSkills();
        if (selectedSkill?.id === skill.id && result.new_id) {
          const updatedSkill = updatedSkills.find(s => s.id === result.new_id);
          if (updatedSkill) {
            setSelectedSkill(updatedSkill);
            try {
              const contentResult = await skillApi.getContent(updatedSkill.id);
              if (contentResult.success && contentResult.content) {
                setSkillContent(contentResult.content);
                setEditingContent(contentResult.content);
                setSkillFrontmatter(parseFrontmatter(contentResult.content));
              }
            } catch {
              // 内容加载失败不影响选中状态
            }
          }
        }
      } else {
        toast.showError(result.message || t("workspace.skillToggleFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.skillToggleFailed"));
    }
  }

  async function deleteSkillAction(skill: Skill) {
    setConfirmDialog({
      isOpen: true,
      title: t("workspace.deleteSkill"),
      message: t("workspace.deleteSkillConfirm", { name: skill.name }),
      type: "warning",
      onConfirm: async () => {
        try {
          const result = await skillApi.delete(skill.id);
          if (result.success) {
            toast.showSuccess(t("workspace.skillDeleted"));
            if (selectedSkill?.id === skill.id) {
              setSelectedSkill(null);
              setSkillContent("");
              setEditingContent("");
              setIsEditing(false);
            }
            await loadSkills();
          } else {
            toast.showError(result.message || t("workspace.skillDeleteFailed"));
          }
        } catch (error) {
          toast.showError(t("workspace.skillDeleteFailed"));
        } finally {
          closeConfirmDialog();
        }
      },
    });
  }

  function startEditSkillAction() {
    setIsEditing(true);
    setEditingContent(skillContent);
  }

  function cancelEditSkillAction() {
    setIsEditing(false);
    setIsNewSkill(false);
    setEditingContent(skillContent);
    setNewSkillName("");
  }

  async function saveSkillAction() {
    const skillName = isNewSkill ? newSkillName.trim() : selectedSkill?.name;

    if (!skillName) {
      toast.showError(t("workspace.enterSkillName"));
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
      toast.showError(t("workspace.invalidSkillName"));
      return;
    }

    try {
      const result = await skillApi.save(skillName, editingContent);
      if (result.success) {
        toast.showSuccess(t("workspace.skillSaved"));
        setIsEditing(false);
        setIsNewSkill(false);
        await loadSkills();

        const savedId = result.message?.match(/(.+)\.md/)?.[1] || skillName;
        const savedSkill = skills.find(s => s.name === savedId || s.id === `${savedId}.md`);
        if (savedSkill) {
          setSelectedSkill(savedSkill);
          setSkillContent(editingContent);
        }
      } else {
        toast.showError(result.message || t("workspace.skillSaveFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.skillSaveFailed"));
    }
  }

  async function confirmDiscardSkillChanges(): Promise<boolean> {
    if (editingContent === skillContent) return true;
    return window.confirm(t("workspace.discardChangesConfirm") || "您有未保存的更改，确定要丢弃吗？");
  }

  // ============== 记忆管理函数 ==============

  async function loadMemories() {
    try {
      const result = await sessionApi.list();
      if (result.sessions) {
        setMemories(result.sessions);
      }
    } catch (error) {
      toast.showError(t("workspace.memoryLoadFailed"));
    }
  }

  async function selectMemoryAction(memory: MemoryType) {
    if (isMemoryEditing && memoryEditingContent !== memoryContent) {
      setConfirmDialog({
        isOpen: true,
        title: t("workspace.unsavedChanges"),
        message: t("workspace.unsavedChanges"),
        onConfirm: async () => {
          closeConfirmDialog();
          await loadSelectedMemory(memory);
        },
      });
      return;
    }

    await loadSelectedMemory(memory);
  }

  async function loadSelectedMemory(memory: MemoryType) {
    setSelectedMemory(memory);
    setIsMemoryEditing(false);

    try {
      const result = await sessionApi.getMemory(memory.id);
      if (result.content !== undefined) {
        setMemoryContent(result.content);
        setMemoryEditingContent(result.content);
      } else {
        setMemoryContent("");
        setMemoryEditingContent("");
      }
    } catch (error) {
      toast.showError(t("workspace.memoryLoadContentFailed"));
    }
  }

  function startEditMemoryAction() {
    setIsMemoryEditing(true);
    setMemoryEditingContent(memoryContent);
  }

  function cancelEditMemoryAction() {
    setIsMemoryEditing(false);
    setMemoryEditingContent(memoryContent);
  }

  async function saveMemoryAction() {
    if (!selectedMemory) return;

    try {
      const result = await sessionApi.saveMemory(selectedMemory.id, memoryEditingContent);
      if (result.success) {
        toast.showSuccess(t("workspace.memorySaved"));
        setMemoryContent(memoryEditingContent);
        setIsMemoryEditing(false);
        await loadMemories();
      } else {
        toast.showError(result.message || t("workspace.memorySaveFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.memorySaveFailed"));
    }
  }

  async function deleteMemoryAction(memory: MemoryType) {
    setConfirmDialog({
      isOpen: true,
      title: t("workspace.deleteMemory"),
      message: t("workspace.deleteMemoryConfirm", { name: memory.name }),
      type: "warning",
      onConfirm: async () => {
        try {
          const result = await sessionApi.delete(memory.id);
          if (result.success) {
            toast.showSuccess(t("workspace.memoryDeleted"));
            if (selectedMemory?.id === memory.id) {
              setSelectedMemory(null);
              setMemoryContent("");
              setMemoryEditingContent("");
              setIsMemoryEditing(false);
            }
            await loadMemories();
          } else {
            toast.showError(result.message || t("workspace.memoryDeleteFailed"));
          }
        } catch (error) {
          toast.showError(t("workspace.memoryDeleteFailed"));
        } finally {
          closeConfirmDialog();
        }
      },
    });
  }

  // ============== 辅助函数 ==============

  function closeConfirmDialog() {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
    });
  }

  // ============== 过滤数据 ==============

  const filteredItems = items.filter((item) => {
    const query = fileSearchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query);
  });

  const filteredSkills = skills.filter((skill) => {
    const query = skillSearchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      (skill.title && skill.title.toLowerCase().includes(query))
    );
  });

  const filteredMemories = memories.filter((memory) => {
    const query = memorySearchQuery.toLowerCase();
    return memory.name.toLowerCase().includes(query);
  });

  // ============== 渲染 ==============

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card flex-shrink-0 transition-colors duration-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {t("workspace.title")}
          </h1>
          <div className="flex items-center gap-4">
            {/* 操作按钮和搜索框 */}
            {activeTab === "files" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input
                  type="text"
                  placeholder={t("workspace.searchFiles")}
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200"
                />
              </div>
            )}

            {activeTab === "skills" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input
                  type="text"
                  placeholder={t("workspace.searchSkills")}
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200"
                />
              </div>
            )}

            {activeTab === "memory" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input
                  type="text"
                  placeholder={t("workspace.searchMemory")}
                  value={memorySearchQuery}
                  onChange={(e) => setMemorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200"
                />
              </div>
            )}

            {/* Tab 切换按钮 - 放在最右侧 */}
            <div className="flex items-center bg-gray-100 dark:bg-dark-bg-sidebar rounded-lg p-1">
              <button
                onClick={() => setActiveTab("files")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "files"
                    ? "bg-white dark:bg-dark-bg-card text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
                }`}
              >
                <FolderTree className="w-4 h-4" />
                {t("workspace.filesTab")}
              </button>
              <button
                onClick={() => setActiveTab("skills")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "skills"
                    ? "bg-white dark:bg-dark-bg-card text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
                }`}
              >
                <Wrench className="w-4 h-4" />
                {t("workspace.skillsTab")}
              </button>
              <button
                onClick={() => setActiveTab("memory")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "memory"
                    ? "bg-white dark:bg-dark-bg-card text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
                }`}
              >
                <Brain className="w-4 h-4" />
                {t("workspace.memoryTab")}
              </button>
            </div>
          </div>
        </div>

        {/* 面包屑导航移到底部 */}
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 左侧列表 */}
        <div className="w-80 border-r border-gray-200 dark:border-dark-border-subtle flex flex-col bg-white dark:bg-dark-bg-card overflow-hidden transition-colors duration-200">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* 文件列表 */}
                {activeTab === "files" && (
                  filteredItems.length === 0 ? (
                    <EmptyState
                      icon={fileSearchQuery ? Search : HardDrive}
                      title={fileSearchQuery ? t("workspace.noMatchingFiles") : t("workspace.noFiles")}
                      description={fileSearchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noFilesDesc")}
                    />
                  ) : (
                    filteredItems.map((item) => (
                      <div
                        key={item.relative_path}
                        onClick={() => {
                          if (item.type === "directory") {
                            loadDirectory(item.relative_path);
                          } else {
                            loadFileContentAction(item);
                          }
                        }}
                        className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedItem?.relative_path === item.relative_path
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {item.type === "directory" ? (
                            <Folder className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                          ) : (
                            <File className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                            {item.type === "file" && <span>{formatSize(item.size)}</span>}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(item.modified, t, i18n)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); renameFsItem(item); }}
                            className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                            title={t("workspace.rename")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteFsItem(item); }}
                            className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            title={t("workspace.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* 技能列表 */}
                {activeTab === "skills" && (
                  filteredSkills.length === 0 ? (
                    <EmptyState
                      icon={skillSearchQuery ? Search : Wrench}
                      title={skillSearchQuery ? t("workspace.noMatchingSkills") : t("workspace.noSkills")}
                      description={skillSearchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noSkillsDesc")}
                    />
                  ) : (
                    filteredSkills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => selectSkillAction(skill)}
                        className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedSkill?.id === skill.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"
                        } ${!skill.enabled ? "opacity-60" : ""}`}
                      >
                        <div className="flex-shrink-0">
                          <FileText className={`w-5 h-5 ${skill.enabled ? "text-blue-500 dark:text-blue-400" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm">
                              {skill.title || skill.name}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                              skill.enabled
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            }`}>
                              {skill.enabled ? t("workspace.enabled") : t("workspace.disabled")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(skill.modified || 0, t, i18n)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSkillAction(skill); }}
                            className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                            title={skill.enabled ? t("workspace.disable") : t("workspace.enable")}
                          >
                            {skill.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSkillAction(skill); }}
                            className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            title={t("workspace.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* 记忆列表 */}
                {activeTab === "memory" && (
                  filteredMemories.length === 0 ? (
                    <EmptyState
                      icon={memorySearchQuery ? Search : Brain}
                      title={memorySearchQuery ? t("workspace.noMatchingMemory") : t("workspace.noMemory")}
                      description={memorySearchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noMemoryDesc")}
                    />
                  ) : (
                    filteredMemories.map((memory) => (
                      <div
                        key={memory.id}
                        onClick={() => selectMemoryAction(memory)}
                        className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedMemory?.id === memory.id
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
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
                            {memory.size !== undefined && <span>{formatSize(memory.size)}</span>}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(memory.modified || 0, t, i18n)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMemoryAction(memory); }}
                            className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                            title={t("workspace.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </>
            )}
          </div>
        </div>

        {/* 右侧详情区域 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-bg-sidebar transition-colors duration-200">
          {/* 文件详情 */}
          {activeTab === "files" && (
            selectedItem ? (
              <>
                <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                          {selectedItem.name}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                        {formatSize(selectedItem.size)} · {formatTimestamp(selectedItem.modified, t, i18n)}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedItem(null); setFileContent(""); }}
                      className="p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
                  <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 transition-colors duration-200">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed">
                      {fileContent}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={FileText}
                  title={t("workspace.selectFile")}
                  description={t("workspace.selectFileDesc")}
                />
              </div>
            )
          )}

          {/* 技能详情 */}
          {activeTab === "skills" && (
            isNewSkill || selectedSkill ? (
              <>
                <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {isNewSkill ? (
                        <input
                          type="text"
                          placeholder={t("workspace.skillName")}
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary bg-transparent border-b border-gray-300 dark:border-dark-border-subtle focus:outline-none focus:border-blue-500 w-64"
                          autoFocus
                        />
                      ) : (
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                          {skillFrontmatter.name || selectedSkill?.title || selectedSkill?.name}
                        </h2>
                      )}
                      {!isNewSkill && selectedSkill && (
                        <div className="mt-1">
                          {skillFrontmatter.description && (
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2">
                              {skillFrontmatter.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">
                            {selectedSkill.enabled ? t("workspace.enabled") : t("workspace.disabled")}
                            {" · "}{formatTimestamp(selectedSkill.modified || 0, t, i18n)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={cancelEditSkillAction}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm"
                          >
                            <X className="w-4 h-4" />
                            {t("workspace.cancel")}
                          </button>
                          <button
                            onClick={saveSkillAction}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            <Save className="w-4 h-4" />
                            {t("workspace.save")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={startEditSkillAction}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          {t("workspace.edit")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="flex-1 w-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary resize-none focus:outline-none scrollbar-thin border-0"
                      placeholder={t("workspace.editorPlaceholder")}
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
                    <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 transition-colors duration-200">
                      <div className="prose dark:prose-invert max-w-none break-words overflow-hidden [&_pre]:overflow-x-auto [&_code]:break-all [&_a]:break-all [&_table]:block [&_table]:overflow-x-auto">
                        <ReactMarkdown>{skillFrontmatter.body || skillContent || t("workspace.noContent")}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={Wrench}
                  title={t("workspace.selectSkill")}
                  description={t("workspace.selectSkillDesc")}
                />
              </div>
            )
          )}

          {/* 记忆详情 */}
          {activeTab === "memory" && (
            selectedMemory ? (
              <>
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
                        {formatTimestamp(selectedMemory.modified || 0, t, i18n)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMemoryEditing ? (
                        <>
                          <button
                            onClick={cancelEditMemoryAction}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm"
                          >
                            <X className="w-4 h-4" />
                            {t("workspace.cancel")}
                          </button>
                          <button
                            onClick={saveMemoryAction}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                          >
                            <Save className="w-4 h-4" />
                            {t("workspace.save")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={startEditMemoryAction}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          {t("workspace.edit")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden p-6">
                  {isMemoryEditing ? (
                    <textarea
                      value={memoryEditingContent}
                      onChange={(e) => setMemoryEditingContent(e.target.value)}
                      className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary border border-gray-200 dark:border-dark-border-subtle rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 scrollbar-thin"
                      placeholder={t("workspace.memoryEditorPlaceholder")}
                    />
                  ) : (
                    <div className="h-full overflow-y-auto bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 scrollbar-thin">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed">
                        {memoryContent || t("workspace.noMemoryContent")}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={Brain}
                  title={t("workspace.selectMemory")}
                  description={t("workspace.selectMemoryDesc")}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* 底部面包屑导航 (仅文件 Tab) */}
      {activeTab === "files" && (
        <div className="border-t border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card px-6 py-3 flex-shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => loadDirectory("")}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                !currentPath || currentPath === "/"
                  ? "text-gray-900 dark:text-dark-text-primary font-medium"
                  : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-hover"
              }`}
            >
              <Home className="w-4 h-4" />
              {t("workspace.workspaceRoot")}
            </button>
            {getFileBreadcrumbs().map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <button
                  onClick={() => loadDirectory(crumb.path)}
                  className={`px-2 py-1 rounded transition-colors ${
                    index === getFileBreadcrumbs().length - 1
                      ? "text-gray-900 dark:text-dark-text-primary font-medium"
                      : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-hover"
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type || "warning"}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}
