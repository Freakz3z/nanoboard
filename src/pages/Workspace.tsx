import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fsApi, sessionApi, skillApi, chatSessionApi, cronApi } from "../lib/tauri";
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
  MessageSquare,
  User,
  Bot,
  Settings,
  Plus,
  Timer,
  CalendarClock,
  Power,
  PowerOff,
  Pencil,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Skill, Memory as MemoryType, CronJob, CronSchedule } from "../types";

// ============== 类型定义 ==============

type TabType = "files" | "skills" | "memory" | "sessions" | "cron";

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

interface AddJobForm {
  name: string;
  message: string;
  scheduleType: "cron" | "every" | "at";
  cronMinute: string;
  cronHour: string;
  cronDom: string;
  cronMonth: string;
  cronDow: string;
  everySeconds: string;
  atTime: string;
  tz: string;
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

  // ============== 会话管理状态 ==============
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChatSession, setSelectedChatSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChatContent, setIsLoadingChatContent] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  // ============== 定时任务管理状态 ==============
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [showCronDialog, setShowCronDialog] = useState(false);
  const [isCronSubmitting, setIsCronSubmitting] = useState(false);
  const [editingCronJob, setEditingCronJob] = useState<CronJob | null>(null);
  const [cronForm, setCronForm] = useState<AddJobForm>({
    name: "",
    message: "",
    scheduleType: "cron",
    cronMinute: "0",
    cronHour: "9",
    cronDom: "*",
    cronMonth: "*",
    cronDow: "*",
    everySeconds: "3600",
    atTime: "",
    tz: "",
  });

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
        case "sessions":
          await loadChatSessions();
          break;
        case "cron":
          await loadCronJobs();
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
        // 过滤掉 sessions 文件夹（在专门的"会话"Tab 中显示）
        const filteredItems = (result.items || []).filter(
          (item: FsItem) => item.name !== "sessions"
        );
        setItems(filteredItems);
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

  // ============== 会话管理函数 ==============

  async function loadChatSessions() {
    try {
      const result = await chatSessionApi.list();
      if (result.sessions) {
        setChatSessions(result.sessions);
      }
    } catch (error) {
      toast.showError(t("workspace.chatSessionsLoadFailed"));
    }
  }

  async function selectChatSessionAction(session: ChatSession) {
    setSelectedChatSession(session);
    setChatMessages([]);
    setIsLoadingChatContent(true);

    try {
      const result = await chatSessionApi.getContent(session.id);
      if (result.success) {
        setChatMessages(result.messages || []);
      } else {
        toast.showError(result.message || t("workspace.chatSessionsLoadContentFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.chatSessionsLoadContentFailed"));
    } finally {
      setIsLoadingChatContent(false);
    }
  }

  function getChatMessageStyle(role: string) {
    const bubbleStyle = "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200/50 dark:border-gray-700/50";

    switch (role) {
      case "user":
        return {
          container: "justify-end",
          bubble: bubbleStyle,
          icon: User,
          label: t("workspace.chatUser"),
          labelClass: "text-gray-600 dark:text-gray-400",
        };
      case "assistant":
        return {
          container: "justify-start",
          bubble: bubbleStyle,
          icon: Bot,
          label: t("workspace.chatAssistant"),
          labelClass: "text-gray-600 dark:text-gray-400",
        };
      case "system":
        return {
          container: "justify-center",
          bubble: bubbleStyle,
          icon: Settings,
          label: t("workspace.chatSystem"),
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

  function renderChatMessage(message: ChatMessage, index: number) {
    const style = getChatMessageStyle(message.role);
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

  // 自动滚动到底部
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ============== 定时任务管理函数 ==============

  async function loadCronJobs() {
    try {
      const result = await cronApi.list();
      if (result.success) {
        setCronJobs(result.jobs || []);
      } else {
        toast.showError(result.message || t("workspace.cronLoadFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.cronLoadFailed"));
    }
  }

  async function handleAddCronJob() {
    if (!cronForm.name.trim()) {
      toast.showError(t("workspace.cronNameRequired"));
      return;
    }
    if (!cronForm.message.trim()) {
      toast.showError(t("workspace.cronMessageRequired"));
      return;
    }

    const scheduleValue =
      cronForm.scheduleType === "cron"
        ? getCronExpression()
        : cronForm.scheduleType === "at"
        ? cronForm.atTime
        : cronForm.everySeconds;

    if (!scheduleValue.trim()) {
      toast.showError(t("workspace.cronScheduleRequired"));
      return;
    }

    setIsCronSubmitting(true);

    try {
      let result;

      if (editingCronJob) {
        result = await cronApi.update(
          editingCronJob.id,
          cronForm.name.trim(),
          cronForm.message.trim(),
          cronForm.scheduleType,
          scheduleValue.trim(),
          editingCronJob.enabled,
          cronForm.tz.trim() || undefined
        );
      } else {
        result = await cronApi.add(
          cronForm.name.trim(),
          cronForm.message.trim(),
          cronForm.scheduleType,
          scheduleValue.trim(),
          cronForm.tz.trim() || undefined
        );
      }

      if (result.success) {
        toast.showSuccess(editingCronJob ? t("workspace.cronEditSuccess") : t("workspace.cronAddSuccess"));
        setShowCronDialog(false);
        resetCronForm();
        await loadCronJobs();
      } else {
        toast.showError(result.message || t("workspace.cronAddFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.cronAddFailed"));
    } finally {
      setIsCronSubmitting(false);
    }
  }

  function confirmRemoveCronJob(job: CronJob) {
    setConfirmDialog({
      isOpen: true,
      title: t("workspace.cronRemoveJob"),
      message: t("workspace.cronRemoveConfirm", { name: job.name || job.id }),
      onConfirm: async () => {
        try {
          const result = await cronApi.remove(job.id);
          if (result.success) {
            toast.showSuccess(t("workspace.cronRemoveSuccess"));
            await loadCronJobs();
          } else {
            toast.showError(result.message || t("workspace.cronRemoveFailed"));
          }
        } catch (error) {
          toast.showError(t("workspace.cronRemoveFailed"));
        } finally {
          closeConfirmDialog();
        }
      },
    });
  }

  async function toggleCronJobEnabled(job: CronJob) {
    const isEnabled = job.enabled;
    try {
      const result = await cronApi.enable(job.id, isEnabled);
      if (result.success) {
        toast.showSuccess(isEnabled ? t("workspace.cronDisableSuccess") : t("workspace.cronEnableSuccess"));
        await loadCronJobs();
      } else {
        toast.showError(result.message || t("workspace.cronToggleFailed"));
      }
    } catch (error) {
      toast.showError(t("workspace.cronToggleFailed"));
    }
  }

  function resetCronForm() {
    setCronForm({
      name: "",
      message: "",
      scheduleType: "cron",
      cronMinute: "0",
      cronHour: "9",
      cronDom: "*",
      cronMonth: "*",
      cronDow: "*",
      everySeconds: "3600",
      atTime: "",
      tz: "",
    });
    setEditingCronJob(null);
  }

  function openEditCronDialog(job: CronJob) {
    const schedule = job.schedule;
    let scheduleType: "cron" | "every" | "at" = "cron";
    let cronMinute = "0",
      cronHour = "9",
      cronDom = "*",
      cronMonth = "*",
      cronDow = "*";
    let everySeconds = "3600";
    let atTime = "";

    if (schedule?.kind === "every") {
      scheduleType = "every";
      if (schedule.everyMs) {
        everySeconds = String(Math.floor(schedule.everyMs / 1000));
      }
    } else if (schedule?.kind === "cron" && schedule.expr) {
      scheduleType = "cron";
      const parts = schedule.expr.trim().split(/\s+/);
      if (parts.length === 5) {
        [cronMinute, cronHour, cronDom, cronMonth, cronDow] = parts;
      }
    } else if (schedule?.kind === "at" && schedule.atMs) {
      scheduleType = "at";
      const date = new Date(schedule.atMs);
      atTime = date.toISOString().slice(0, 16);
    }

    setEditingCronJob(job);
    setCronForm({
      name: job.name || "",
      message: job.payload?.message || "",
      scheduleType,
      cronMinute,
      cronHour,
      cronDom,
      cronMonth,
      cronDow,
      everySeconds,
      atTime,
      tz: job.schedule?.tz || "",
    });
    setShowCronDialog(true);
  }

  function getCronExpression(): string {
    return `${cronForm.cronMinute} ${cronForm.cronHour} ${cronForm.cronDom} ${cronForm.cronMonth} ${cronForm.cronDow}`;
  }

  function describeSchedule(schedule: CronSchedule): string {
    if (!schedule) return "-";

    switch (schedule.kind) {
      case "cron":
        return describeCron(schedule.expr || "");
      case "every":
        if (schedule.everyMs) {
          return describeIntervalMs(schedule.everyMs);
        }
        return t("workspace.cronIntervalExecute");
      case "at":
        if (schedule.atMs) {
          return `${formatCronTimestamp(schedule.atMs)} ${t("workspace.cronExecuteOnce")}`;
        }
        return t("workspace.cronTimedExecute");
      default:
        return "-";
    }
  }

  function describeCron(expression: string): string {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return expression;

    const [min, hour, dom, mon, dow] = parts;

    const dowNames: Record<string, string> = {
      "0": t("workspace.cronDowSun"),
      "1": t("workspace.cronDowMon"),
      "2": t("workspace.cronDowTue"),
      "3": t("workspace.cronDowWed"),
      "4": t("workspace.cronDowThu"),
      "5": t("workspace.cronDowFri"),
      "6": t("workspace.cronDowSat"),
      "7": t("workspace.cronDowSun"),
    };

    const monNames: Record<string, string> = {
      "1": t("workspace.cronMonJan"),
      "2": t("workspace.cronMonFeb"),
      "3": t("workspace.cronMonMar"),
      "4": t("workspace.cronMonApr"),
      "5": t("workspace.cronMonMay"),
      "6": t("workspace.cronMonJun"),
      "7": t("workspace.cronMonJul"),
      "8": t("workspace.cronMonAug"),
      "9": t("workspace.cronMonSep"),
      "10": t("workspace.cronMonOct"),
      "11": t("workspace.cronMonNov"),
      "12": t("workspace.cronMonDec"),
    };

    let timePart = "";
    if (min === "*" && hour === "*") {
      timePart = t("workspace.cronDescEveryMinute");
    } else if (min.startsWith("*/") && hour === "*") {
      timePart = t("workspace.cronDescEveryNMin", { n: min.slice(2) });
    } else if (min === "0" && hour.startsWith("*/")) {
      timePart = t("workspace.cronDescEveryNHour", { n: hour.slice(2) });
    } else if (min === "0" && hour === "*") {
      timePart = t("workspace.cronDescEveryHourSharp");
    } else if (hour !== "*" && min !== "*") {
      const h = hour.padStart(2, "0");
      const m = min.padStart(2, "0");
      timePart = `${h}:${m}`;
    } else if (hour !== "*" && min === "*") {
      timePart = t("workspace.cronDescEveryMinOfHour", { hour });
    } else {
      timePart = `${min} ${hour}`;
    }

    let datePart = "";
    if (dom === "*" && mon === "*" && dow === "*") {
      datePart = t("workspace.cronDescEveryDay");
    } else if (dom === "*" && mon === "*" && dow === "1-5") {
      datePart = t("workspace.cronDescWeekdays");
    } else if (dom === "*" && mon === "*" && dow === "0,6") {
      datePart = t("workspace.cronDescWeekends");
    } else if (dom === "*" && mon === "*" && dow !== "*") {
      const days = dow
        .split(",")
        .map((d) => dowNames[d] || d)
        .join(", ");
      datePart = t("workspace.cronDescOnDow", { days });
    } else if (dom !== "*" && mon === "*" && dow === "*") {
      datePart = t("workspace.cronDescOnDom", { day: dom });
    } else if (dom !== "*" && mon !== "*" && dow === "*") {
      const monName = monNames[mon] || `${mon}${t("workspace.cronDescMonthSuffix")}`;
      datePart = t("workspace.cronDescOnMonDom", { month: monName, day: dom });
    } else {
      const segments: string[] = [];
      if (mon !== "*")
        segments.push(monNames[mon] || `${mon}${t("workspace.cronDescMonthSuffix")}`);
      if (dom !== "*") segments.push(`${dom}${t("workspace.cronDescDaySuffix")}`);
      if (dow !== "*") {
        const days = dow
          .split(",")
          .map((d) => dowNames[d] || d)
          .join(", ");
        segments.push(days);
      }
      datePart = segments.join(" ");
    }

    if (min === "*" && hour === "*") {
      return `${datePart}，${timePart}`;
    }
    return `${datePart} ${timePart} ${t("workspace.cronDescExecute")}`;
  }

  function describeIntervalMs(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return t("workspace.cronEveryNSeconds", { n: seconds });
    if (seconds < 3600) return t("workspace.cronEveryNMinutes", { n: Math.floor(seconds / 60) });
    if (seconds < 86400) return t("workspace.cronEveryNHours", { n: Math.floor(seconds / 3600) });
    return t("workspace.cronEveryNDays", { n: Math.floor(seconds / 86400) });
  }

  function describeInterval(schedule: string): string {
    let s: number;
    const everyMatch = schedule.match(/every\s+(\d+)\s*(s|m|h|d)?/i);
    if (everyMatch) {
      const val = parseInt(everyMatch[1], 10);
      const unit = (everyMatch[2] || "s").toLowerCase();
      s =
        unit === "m"
          ? val * 60
          : unit === "h"
          ? val * 3600
          : unit === "d"
          ? val * 86400
          : val;
    } else {
      s = parseInt(schedule, 10);
    }
    if (isNaN(s)) return schedule;
    if (s < 60) return t("workspace.cronEveryNSeconds", { n: s });
    if (s < 3600) return t("workspace.cronEveryNMinutes", { n: Math.floor(s / 60) });
    if (s < 86400) return t("workspace.cronEveryNHours", { n: Math.floor(s / 3600) });
    return t("workspace.cronEveryNDays", { n: Math.floor(s / 86400) });
  }

  function formatCronTimestamp(ms: number | null): string {
    if (ms === null) return "-";
    const date = new Date(ms);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCronRelativeTime(ms: number | null): string {
    if (ms === null) return "-";
    const now = Date.now();
    const diff = ms - now;

    if (diff < 0) return t("workspace.cronExpired");

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return t("workspace.cronDaysLater", { count: days });
    if (hours > 0) return t("workspace.cronHoursLater", { count: hours });
    if (minutes > 0) return t("workspace.cronMinutesLater", { count: minutes });
    return t("workspace.cronSoon");
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

  const filteredChatSessions = chatSessions.filter((session) => {
    const query = chatSearchQuery.toLowerCase();
    return (
      session.name.toLowerCase().includes(query) ||
      (session.title && session.title.toLowerCase().includes(query))
    );
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

            {activeTab === "sessions" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input
                  type="text"
                  placeholder={t("workspace.searchSessions")}
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200"
                />
              </div>
            )}

            {activeTab === "cron" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-dark-text-muted">
                  {cronJobs.length > 0 && t("workspace.cronJobCount", { count: cronJobs.length })}
                </span>
                <button
                  onClick={() => { setShowCronDialog(true); resetCronForm(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t("workspace.cronAddJob")}
                </button>
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
              <button
                onClick={() => setActiveTab("sessions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "sessions"
                    ? "bg-white dark:bg-dark-bg-card text-green-600 dark:text-green-400 shadow-sm"
                    : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                {t("workspace.sessionsTab")}
              </button>
              <button
                onClick={() => setActiveTab("cron")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "cron"
                    ? "bg-white dark:bg-dark-bg-card text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"
                }`}
              >
                <CalendarClock className="w-4 h-4" />
                {t("workspace.cronTab")}
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

                {/* 会话列表 */}
                {activeTab === "sessions" && (
                  filteredChatSessions.length === 0 ? (
                    <EmptyState
                      icon={chatSearchQuery ? Search : MessageSquare}
                      title={chatSearchQuery ? t("workspace.noMatchingSessions") : t("workspace.noSessions")}
                      description={chatSearchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noSessionsDesc")}
                    />
                  ) : (
                    filteredChatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => selectChatSessionAction(session)}
                        className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedChatSession?.id === session.id
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
                  )
                )}

                {/* 定时任务列表 */}
                {activeTab === "cron" && (
                  isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                    </div>
                  ) : cronJobs.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title={t("workspace.noCronJobs")}
                      description={t("workspace.noCronJobsDesc")}
                    />
                  ) : (
                    <div className="space-y-2">
                      {cronJobs.map((job, idx) => {
                        const isEnabled = job.enabled;
                        const scheduleDesc = describeSchedule(job.schedule);
                        const nextRunRelative = formatCronRelativeTime(job.state?.nextRunAtMs || null);
                        const lastRun = formatCronTimestamp(job.state?.lastRunAtMs || null);
                        const lastStatus = job.state?.lastStatus;
                        const lastError = job.state?.lastError;

                        return (
                          <div
                            key={job.id || idx}
                            className={`group rounded-lg border transition-all hover:shadow-md ${
                              isEnabled
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                                : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default opacity-80 hover:opacity-100"
                            }`}
                          >
                            <div className="p-3">
                              {/* 上部：图标 + 名称 + 状态 */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                                    isEnabled
                                      ? "bg-green-100 dark:bg-green-800/40"
                                      : "bg-gray-100 dark:bg-dark-bg-hover"
                                  }`}>
                                    <CalendarClock className={`w-4 h-4 ${
                                      isEnabled
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-gray-500 dark:text-dark-text-muted"
                                    }`} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm truncate">
                                        {job.name || job.id}
                                      </h3>
                                      {isEnabled ? (
                                        <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] rounded-full flex-shrink-0">
                                          {t("workspace.enabled")}
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-[10px] rounded-full flex-shrink-0">
                                          {t("workspace.disabled")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* 操作按钮 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                                  <button
                                    onClick={() => toggleCronJobEnabled(job)}
                                    className={`p-1 rounded-md transition-colors ${
                                      isEnabled
                                        ? "text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg-hover"
                                    }`}
                                    title={isEnabled ? t("workspace.disable") : t("workspace.enable")}
                                  >
                                    {isEnabled ? (
                                      <Power className="w-3.5 h-3.5" />
                                    ) : (
                                      <PowerOff className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openEditCronDialog(job)}
                                    className="p-1 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-md transition-colors"
                                    title={t("workspace.cronEditJob")}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => confirmRemoveCronJob(job)}
                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                    title={t("workspace.cronRemoveJob")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* 调度信息 */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <Timer className={`w-3 h-3 flex-shrink-0 ${
                                  isEnabled
                                    ? "text-green-500 dark:text-green-400"
                                    : "text-gray-400 dark:text-dark-text-muted"
                                }`} />
                                <span className={`text-xs font-medium truncate ${
                                  isEnabled
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-gray-600 dark:text-dark-text-secondary"
                                }`}>
                                  {scheduleDesc}
                                </span>
                                {job.schedule?.kind === "cron" && job.schedule.expr && (
                                  <code className="text-[9px] text-gray-400 dark:text-dark-text-muted font-mono flex-shrink-0">
                                    ({job.schedule.expr})
                                  </code>
                                )}
                              </div>

                              {/* 消息内容 */}
                              {job.payload?.message && (
                                <div className="flex items-start gap-2 mb-1.5">
                                  <MessageSquare className="w-3 h-3 text-gray-400 dark:text-dark-text-muted flex-shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-gray-600 dark:text-dark-text-secondary break-words line-clamp-2 leading-relaxed">
                                    {job.payload.message}
                                  </p>
                                </div>
                              )}

                              {/* 底部元信息 */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400 dark:text-dark-text-muted pt-1.5 border-t border-gray-200/50 dark:border-dark-border-subtle/50">
                                {job.state?.nextRunAtMs && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{t("workspace.cronNextRun")}: {nextRunRelative}</span>
                                  </div>
                                )}
                                {lastRun !== "-" && (
                                  <div className="flex items-center gap-1">
                                    {lastStatus === "success" ? (
                                      <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                                    ) : lastStatus === "failed" ? (
                                      <XCircle className="w-2.5 h-2.5 text-red-500" />
                                    ) : (
                                      <Clock className="w-2.5 h-2.5" />
                                    )}
                                    <span>{t("workspace.cronLastRun")}: {lastRun}</span>
                                  </div>
                                )}
                              </div>

                              {/* 错误信息 */}
                              {lastError && (
                                <div className="mt-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-md">
                                  <p className="text-[10px] text-red-600 dark:text-red-400">{lastError}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

          {/* 会话详情 */}
          {activeTab === "sessions" && (
            selectedChatSession ? (
              <>
                <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-500 dark:text-green-400" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                          {selectedChatSession.name}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                        {formatSize(selectedChatSession.size)} · {formatTimestamp(selectedChatSession.modified, t, i18n)}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedChatSession(null); setChatMessages([]); }}
                      className="p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden p-6">
                  {isLoadingChatContent ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <EmptyState
                        icon={FileText}
                        title={t("workspace.noMessages")}
                        description={t("workspace.noMessagesDesc")}
                      />
                    </div>
                  ) : (
                    <div
                      ref={chatMessagesContainerRef}
                      className="h-full overflow-y-auto overflow-x-hidden bg-white/40 dark:bg-dark-bg-card/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-dark-border-subtle/50 p-6 scrollbar-thin"
                    >
                      {chatMessages.map((msg, idx) => renderChatMessage(msg, idx))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={MessageSquare}
                  title={t("workspace.selectSession")}
                  description={t("workspace.selectSessionDesc")}
                />
              </div>
            )
          )}

          {/* 定时任务提示 */}
          {activeTab === "cron" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="max-w-md text-center">
                <CalendarClock className="w-16 h-16 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                  {t("workspace.cronTitle")}
                </h2>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                  {t("workspace.cronDesc")}
                </p>
                <div className="flex flex-col gap-3 text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <p>{t("workspace.cronRestartHint")}</p>
                      <p className="text-amber-600 dark:text-amber-400">{t("workspace.cronChatHint")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* 添加/编辑定时任务对话框 */}
      {showCronDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full p-6 mx-4 transition-colors duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    editingCronJob ? "bg-amber-50 dark:bg-amber-900/30" : "bg-blue-50 dark:bg-blue-900/30"
                  }`}
                >
                  {editingCronJob ? (
                    <Pencil className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {editingCronJob ? t("workspace.cronEditJob") : t("workspace.cronAddJob")}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCronDialog(false);
                  resetCronForm();
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 任务名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  {t("workspace.cronJobName")}
                </label>
                <input
                  type="text"
                  value={cronForm.name}
                  onChange={(e) => setCronForm({ ...cronForm, name: e.target.value })}
                  placeholder={t("workspace.cronJobNamePlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  autoFocus
                />
              </div>

              {/* 消息内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  {t("workspace.cronMessageLabel")}
                </label>
                <textarea
                  value={cronForm.message}
                  onChange={(e) => setCronForm({ ...cronForm, message: e.target.value })}
                  placeholder={t("workspace.cronMessagePlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                />
              </div>

              {/* 调度类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  {t("workspace.cronScheduleType")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setCronForm({ ...cronForm, scheduleType: "cron" })}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      cronForm.scheduleType === "cron"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Cron
                  </button>
                  <button
                    onClick={() => setCronForm({ ...cronForm, scheduleType: "every" })}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      cronForm.scheduleType === "every"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {t("workspace.cronInterval")}
                  </button>
                  <button
                    onClick={() => setCronForm({ ...cronForm, scheduleType: "at" })}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      cronForm.scheduleType === "at"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                    {t("workspace.cronRunOnce")}
                  </button>
                </div>
              </div>

              {/* Cron 表达式 / 间隔秒数 / 定时执行 */}
              {cronForm.scheduleType === "cron" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    {t("workspace.cronExpression")}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { key: "cronMinute" as const, label: t("workspace.cronFieldMinute"), placeholder: "0" },
                      { key: "cronHour" as const, label: t("workspace.cronFieldHour"), placeholder: "9" },
                      { key: "cronDom" as const, label: t("workspace.cronFieldDom"), placeholder: "*" },
                      { key: "cronMonth" as const, label: t("workspace.cronFieldMonth"), placeholder: "*" },
                      { key: "cronDow" as const, label: t("workspace.cronFieldDow"), placeholder: "*" },
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1 text-center">
                          {field.label}
                        </span>
                        <input
                          type="text"
                          value={cronForm[field.key]}
                          onChange={(e) => setCronForm({ ...cronForm, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-2 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono text-center text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {describeCron(getCronExpression())}
                      </span>
                    </div>
                    <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1 ml-6 font-mono">
                      {getCronExpression()}
                    </p>
                  </div>
                </div>
              ) : cronForm.scheduleType === "every" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    {t("workspace.cronIntervalSeconds")}
                  </label>
                  <input
                    type="number"
                    value={cronForm.everySeconds}
                    onChange={(e) => setCronForm({ ...cronForm, everySeconds: e.target.value })}
                    placeholder="3600"
                    min={1}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {describeInterval(cronForm.everySeconds)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    {t("workspace.cronAtTime")}
                  </label>
                  <input
                    type="datetime-local"
                    value={cronForm.atTime}
                    onChange={(e) => setCronForm({ ...cronForm, atTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
                  />
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {cronForm.atTime
                          ? t("workspace.cronRunOnceAt", { time: cronForm.atTime.replace("T", " ") })
                          : t("workspace.cronSelectTime")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 时区选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  {t("workspace.cronTimezone")}
                </label>
                <select
                  value={cronForm.tz}
                  onChange={(e) => setCronForm({ ...cronForm, tz: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="">{t("workspace.cronTimezoneDefault")}</option>
                  <option value="Asia/Shanghai">Asia/Shanghai (北京时间)</option>
                  <option value="Asia/Hong_Kong">Asia/Hong_Kong (香港)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (东京)</option>
                  <option value="Asia/Singapore">Asia/Singapore (新加坡)</option>
                  <option value="America/New_York">America/New_York (纽约)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (洛杉矶)</option>
                  <option value="America/Chicago">America/Chicago (芝加哥)</option>
                  <option value="Europe/London">Europe/London (伦敦)</option>
                  <option value="Europe/Paris">Europe/Paris (巴黎)</option>
                  <option value="Europe/Berlin">Europe/Berlin (柏林)</option>
                  <option value="Australia/Sydney">Australia/Sydney (悉尼)</option>
                  <option value="UTC">UTC (协调世界时)</option>
                </select>
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-text-muted">
                  {t("workspace.cronTimezoneHint")}
                </p>
              </div>

              {/* 投递提示 */}
              <div className="px-3 py-2.5 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 dark:text-dark-text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 dark:text-dark-text-muted leading-relaxed">
                    {t("workspace.cronDeliverHint")}
                  </p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCronDialog(false);
                  resetCronForm();
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium"
              >
                {t("workspace.cronCancel")}
              </button>
              <button
                onClick={handleAddCronJob}
                disabled={isCronSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isCronSubmitting
                  ? editingCronJob
                    ? t("workspace.cronSaving")
                    : t("workspace.cronAdding")
                  : editingCronJob
                  ? t("workspace.cronSave")
                  : t("workspace.cronConfirm")}
              </button>
            </div>
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
