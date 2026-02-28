import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fsApi, sessionApi, skillApi, chatSessionApi, cronApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  FileText, Folder, Clock, Trash2, Search, ChevronRight, Home, Edit2, X, File,
  HardDrive, Wrench, ToggleLeft, ToggleRight, Save, Edit3, Brain, FolderTree,
  MessageSquare, User, Bot, Settings, Plus, Timer, CalendarClock, Power, PowerOff,
  Pencil, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  WorkspaceTabs, FileList, SkillList, MemoryList, SessionList, CronList,
  useCron, formatTimestamp, formatSize, describeSchedule, describeCron, describeIntervalMs, formatCronTimestamp,
  formatCronRelativeTime,
} from "../components/workspace";
import type { Skill, Memory as MemoryType, CronJob, CronSchedule, FsItem, Breadcrumb, FrontmatterData, ChatSession, ChatMessage, TabType } from "../types";

export default function Workspace() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { resetCronForm, getCronExpression, openEditCronDialog } = useCron();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabType>("files");

  // 文件管理状态
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FsItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  // 技能管理状态
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");
  const [editingContent, setEditingContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isNewSkill, setIsNewSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [skillFrontmatter, setSkillFrontmatter] = useState<FrontmatterData>({ body: "" });

  // 记忆管理状态
  const [memories, setMemories] = useState<MemoryType[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryType | null>(null);
  const [memoryContent, setMemoryContent] = useState<string>("");
  const [memoryEditingContent, setMemoryEditingContent] = useState<string>("");
  const [isMemoryEditing, setIsMemoryEditing] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");

  // 会话管理状态
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChatSession, setSelectedChatSession] = useState<ChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChatContent, setIsLoadingChatContent] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  // 定时任务状态
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [showCronDialog, setShowCronDialog] = useState(false);
  const [isCronSubmitting, setIsCronSubmitting] = useState(false);
  const [editingCronJob, setEditingCronJob] = useState<CronJob | null>(null);
  const [cronForm, setCronForm] = useState({
    name: "", message: "", scheduleType: "cron" as const,
    cronMinute: "0", cronHour: "9", cronDom: "*", cronMonth: "*", cronDow: "*",
    everySeconds: "3600", atTime: "", tz: "",
  });

  // 通用状态
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, title: "", message: "", type: "warning" as "warning" | "info" | undefined,
    onConfirm: () => {},
  });

  // 初始化加载
  useEffect(() => { loadTabData(activeTab); }, [activeTab]);

  async function loadTabData(tab: TabType) {
    setIsLoading(true);
    try {
      switch (tab) {
        case "files": await loadDirectory(""); break;
        case "skills": await loadSkills(); break;
        case "memory": await loadMemories(); break;
        case "sessions": await loadChatSessions(); break;
        case "cron": await loadCronJobs(); break;
      }
    } finally { setIsLoading(false); }
  }

  // 文件管理函数
  async function loadDirectory(path: string) {
    try {
      const result = await fsApi.getDirectoryTree(path || undefined);
      if (result.success) {
        const filteredItems = (result.items || []).filter((item: FsItem) => item.name !== "sessions");
        setItems(filteredItems);
        setCurrentPath(result.path || "");
        setSelectedItem(null);
        setFileContent("");
      } else {
        toast.showError(result.message || t("workspace.loadDirectoryFailed"));
      }
    } catch { toast.showError(t("workspace.loadDirectoryFailed")); }
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
    } catch { toast.showError(t("workspace.loadFileContentFailed")); }
  }

  async function deleteFsItem(item: FsItem) {
    const isFile = item.type === "file";
    setConfirmDialog({
      isOpen: true,
      title: isFile ? t("workspace.deleteFile") : t("workspace.deleteFolder"),
      message: isFile ? t("workspace.deleteFileConfirm", { name: item.name }) : t("workspace.deleteFolderConfirm", { name: item.name }),
      type: "warning",
      onConfirm: async () => {
        try {
          const result = isFile ? await fsApi.deleteFile(item.relative_path) : await fsApi.deleteFolder(item.relative_path);
          if (result.success) {
            toast.showSuccess(result.message || t("workspace.deleted"));
            if (selectedItem?.relative_path === item.relative_path) { setSelectedItem(null); setFileContent(""); }
            await loadDirectory(currentPath);
          } else { toast.showError(result.message || t("workspace.deleteFailed")); }
        } catch { toast.showError(isFile ? t("workspace.deleteFileFailed") : t("workspace.deleteFolderFailed")); }
        finally { closeConfirmDialog(); }
      },
    });
  }

  async function renameFsItem(item: FsItem) {
    const newName = prompt(t("workspace.newName"), item.name);
    if (!newName || newName === item.name) return;
    try {
      const result = await fsApi.renameItem(item.relative_path, newName);
      if (result.success) { toast.showSuccess(result.message || t("workspace.renameSuccess")); await loadDirectory(currentPath); }
      else { toast.showError(result.message || t("workspace.renameFailed")); }
    } catch { toast.showError(t("workspace.renameFailed")); }
  }

  function getFileBreadcrumbs(): Breadcrumb[] {
    if (!currentPath || currentPath === "/") return [];
    const parts = currentPath.split("/").filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];
    let pathSoFar = "";
    for (let i = 0; i < parts.length; i++) {
      pathSoFar += (pathSoFar ? "/" : "") + parts[i];
      breadcrumbs.push({ name: parts[i], path: pathSoFar });
    }
    return breadcrumbs;
  }

  // 技能管理函数
  async function loadSkills(): Promise<Skill[]> {
    try {
      const result = await skillApi.list();
      if (result.skills) { setSkills(result.skills); return result.skills; }
    } catch { toast.showError(t("workspace.skillsLoadFailed")); }
    return [];
  }

  async function selectSkillAction(skill: Skill) {
    if (isEditing && !await confirmDiscardSkillChanges()) return;
    setSelectedSkill(skill); setIsEditing(false); setIsNewSkill(false);
    try {
      const result = await skillApi.getContent(skill.id);
      if (result.success && result.content) {
        setSkillContent(result.content); setEditingContent(result.content); setSkillFrontmatter(parseFrontmatter(result.content));
      } else { toast.showError(result.message || t("workspace.skillsLoadContentFailed")); }
    } catch { toast.showError(t("workspace.skillsLoadContentFailed")); }
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
            const contentResult = await skillApi.getContent(updatedSkill.id);
            if (contentResult.success && contentResult.content) {
              setSkillContent(contentResult.content); setEditingContent(contentResult.content); setSkillFrontmatter(parseFrontmatter(contentResult.content));
            }
          }
        }
      } else { toast.showError(result.message || t("workspace.skillToggleFailed")); }
    } catch { toast.showError(t("workspace.skillToggleFailed")); }
  }

  async function deleteSkillAction(skill: Skill) {
    setConfirmDialog({
      isOpen: true, title: t("workspace.deleteSkill"), message: t("workspace.deleteSkillConfirm", { name: skill.name }), type: "warning",
      onConfirm: async () => {
        try {
          const result = await skillApi.delete(skill.id);
          if (result.success) {
            toast.showSuccess(t("workspace.skillDeleted"));
            if (selectedSkill?.id === skill.id) { setSelectedSkill(null); setSkillContent(""); setEditingContent(""); setIsEditing(false); }
            await loadSkills();
          } else { toast.showError(result.message || t("workspace.skillDeleteFailed")); }
        } catch { toast.showError(t("workspace.skillDeleteFailed")); }
        finally { closeConfirmDialog(); }
      },
    });
  }

  function startEditSkillAction() { setIsEditing(true); setEditingContent(skillContent); }
  function cancelEditSkillAction() { setIsEditing(false); setIsNewSkill(false); setEditingContent(skillContent); setNewSkillName(""); }

  async function saveSkillAction() {
    const skillName = isNewSkill ? newSkillName.trim() : selectedSkill?.name;
    if (!skillName) { toast.showError(t("workspace.enterSkillName")); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) { toast.showError(t("workspace.invalidSkillName")); return; }
    try {
      const result = await skillApi.save(skillName, editingContent);
      if (result.success) {
        toast.showSuccess(t("workspace.skillSaved")); setIsEditing(false); setIsNewSkill(false); await loadSkills();
        const savedId = result.message?.match(/(.+)\.md/)?.[1] || skillName;
        const savedSkill = skills.find(s => s.name === savedId || s.id === `${savedId}.md`);
        if (savedSkill) { setSelectedSkill(savedSkill); setSkillContent(editingContent); }
      } else { toast.showError(result.message || t("workspace.skillSaveFailed")); }
    } catch { toast.showError(t("workspace.skillSaveFailed")); }
  }

  async function confirmDiscardSkillChanges(): Promise<boolean> {
    if (editingContent === skillContent) return true;
    return window.confirm(t("workspace.discardChangesConfirm") || "您有未保存的更改，确定要丢弃吗？");
  }

  // 记忆管理函数
  async function loadMemories() {
    try { const result = await sessionApi.list(); if (result.sessions) setMemories(result.sessions); }
    catch { toast.showError(t("workspace.memoryLoadFailed")); }
  }

  async function selectMemoryAction(memory: MemoryType) {
    if (isMemoryEditing && memoryEditingContent !== memoryContent) {
      setConfirmDialog({
        isOpen: true, title: t("workspace.unsavedChanges"), message: t("workspace.unsavedChanges"), type: "warning",
        onConfirm: async () => { closeConfirmDialog(); await loadSelectedMemory(memory); },
      } as any);
      return;
    }
    await loadSelectedMemory(memory);
  }

  async function loadSelectedMemory(memory: MemoryType) {
    setSelectedMemory(memory); setIsMemoryEditing(false);
    try {
      const result = await sessionApi.getMemory(memory.id);
      if (result.content !== undefined) { setMemoryContent(result.content); setMemoryEditingContent(result.content); }
      else { setMemoryContent(""); setMemoryEditingContent(""); }
    } catch { toast.showError(t("workspace.memoryLoadContentFailed")); }
  }

  function startEditMemoryAction() { setIsMemoryEditing(true); setMemoryEditingContent(memoryContent); }
  function cancelEditMemoryAction() { setIsMemoryEditing(false); setMemoryEditingContent(memoryContent); }

  async function saveMemoryAction() {
    if (!selectedMemory) return;
    try {
      const result = await sessionApi.saveMemory(selectedMemory.id, memoryEditingContent);
      if (result.success) { toast.showSuccess(t("workspace.memorySaved")); setMemoryContent(memoryEditingContent); setIsMemoryEditing(false); await loadMemories(); }
      else { toast.showError(result.message || t("workspace.memorySaveFailed")); }
    } catch { toast.showError(t("workspace.memorySaveFailed")); }
  }

  async function deleteMemoryAction(memory: MemoryType) {
    setConfirmDialog({
      isOpen: true, title: t("workspace.deleteMemory"), message: t("workspace.deleteMemoryConfirm", { name: memory.name }), type: "warning",
      onConfirm: async () => {
        try {
          const result = await sessionApi.delete(memory.id);
          if (result.success) {
            toast.showSuccess(t("workspace.memoryDeleted"));
            if (selectedMemory?.id === memory.id) { setSelectedMemory(null); setMemoryContent(""); setMemoryEditingContent(""); setIsMemoryEditing(false); }
            await loadMemories();
          } else { toast.showError(result.message || t("workspace.memoryDeleteFailed")); }
        } catch { toast.showError(t("workspace.memoryDeleteFailed")); }
        finally { closeConfirmDialog(); }
      },
    });
  }

  // 会话管理函数
  async function loadChatSessions() {
    try { const result = await chatSessionApi.list(); if (result.sessions) setChatSessions(result.sessions); }
    catch { toast.showError(t("workspace.chatSessionsLoadFailed")); }
  }

  async function selectChatSessionAction(session: ChatSession) {
    setSelectedChatSession(session); setChatMessages([]); setIsLoadingChatContent(true);
    try {
      const result = await chatSessionApi.getContent(session.id);
      if (result.success) setChatMessages(result.messages || []);
      else toast.showError(result.message || t("workspace.chatSessionsLoadContentFailed"));
    } catch { toast.showError(t("workspace.chatSessionsLoadContentFailed")); }
    finally { setIsLoadingChatContent(false); }
  }

  function getChatMessageStyle(role: string) {
    const bubbleStyle = "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200/50 dark:border-gray-700/50";
    switch (role) {
      case "user": return { container: "justify-end", bubble: bubbleStyle, icon: User, label: t("workspace.chatUser"), labelClass: "text-gray-600 dark:text-gray-400" };
      case "assistant": return { container: "justify-start", bubble: bubbleStyle, icon: Bot, label: t("workspace.chatAssistant"), labelClass: "text-gray-600 dark:text-gray-400" };
      case "system": return { container: "justify-center", bubble: bubbleStyle, icon: Settings, label: t("workspace.chatSystem"), labelClass: "text-gray-600 dark:text-gray-400" };
      default: return { container: "justify-start", bubble: bubbleStyle, icon: MessageSquare, label: role, labelClass: "text-gray-600 dark:text-gray-400" };
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
            <span className={`text-sm font-medium ${style.labelClass}`}>{style.label}</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-pre:my-2 prose-pre:bg-gray-800/50 dark:prose-pre:bg-gray-900/50 prose-pre:overflow-x-auto prose-code:text-inherit prose-table:text-sm prose-table:block prose-table:overflow-x-auto prose-th:bg-gray-100/50 dark:prose-th:bg-gray-700/50 prose-th:p-2 prose-td:p-2 prose-thead:border-b prose-tbody:border-collapse break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (chatMessagesContainerRef.current) chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
  }, [chatMessages]);

  // Cron 管理函数
  async function loadCronJobs() {
    try {
      const result = await cronApi.list();
      if (result.success) setCronJobs(result.jobs || []);
      else toast.showError(result.message || t("workspace.cronLoadFailed"));
    } catch { toast.showError(t("workspace.cronLoadFailed")); }
  }

  async function handleAddCronJob() {
    if (!cronForm.name.trim()) { toast.showError(t("workspace.cronNameRequired")); return; }
    if (!cronForm.message.trim()) { toast.showError(t("workspace.cronMessageRequired")); return; }
    const scheduleValue = cronForm.scheduleType === "cron" ? getCronExpression(cronForm) : cronForm.scheduleType === "at" ? cronForm.atTime : cronForm.everySeconds;
    if (!scheduleValue.trim()) { toast.showError(t("workspace.cronScheduleRequired")); return; }
    setIsCronSubmitting(true);
    try {
      let result;
      if (editingCronJob) {
        result = await cronApi.update(editingCronJob.id, cronForm.name.trim(), cronForm.message.trim(), cronForm.scheduleType, scheduleValue.trim(), editingCronJob.enabled, cronForm.tz.trim() || undefined);
      } else {
        result = await cronApi.add(cronForm.name.trim(), cronForm.message.trim(), cronForm.scheduleType, scheduleValue.trim(), cronForm.tz.trim() || undefined);
      }
      if (result.success) {
        toast.showSuccess(editingCronJob ? t("workspace.cronEditSuccess") : t("workspace.cronAddSuccess"));
        setShowCronDialog(false); resetCronForm(); await loadCronJobs();
      } else { toast.showError(result.message || t("workspace.cronAddFailed")); }
    } catch { toast.showError(t("workspace.cronAddFailed")); }
    finally { setIsCronSubmitting(false); }
  }

  function confirmRemoveCronJob(job: CronJob) {
    setConfirmDialog({
      isOpen: true, title: t("workspace.cronRemoveJob"), message: t("workspace.cronRemoveConfirm", { name: job.name || job.id }), type: "warning",
      onConfirm: async () => {
        try {
          const result = await cronApi.remove(job.id);
          if (result.success) { toast.showSuccess(t("workspace.cronRemoveSuccess")); await loadCronJobs(); }
          else { toast.showError(result.message || t("workspace.cronRemoveFailed")); }
        } catch { toast.showError(t("workspace.cronRemoveFailed")); }
        finally { closeConfirmDialog(); }
      },
    } as any);
  }

  async function toggleCronJobEnabled(job: CronJob) {
    try {
      const result = await cronApi.enable(job.id, job.enabled);
      if (result.success) { toast.showSuccess(job.enabled ? t("workspace.cronDisableSuccess") : t("workspace.cronEnableSuccess")); await loadCronJobs(); }
      else { toast.showError(result.message || t("workspace.cronToggleFailed")); }
    } catch { toast.showError(t("workspace.cronToggleFailed")); }
  }

  function openCronEditDialog(job: CronJob) {
    const formData = openEditCronDialog(job);
    setCronForm(formData as any);
    setEditingCronJob(job);
    setShowCronDialog(true);
  }

  function closeConfirmDialog() { setConfirmDialog({ isOpen: false, title: "", message: "", type: "warning", onConfirm: () => {} }); }

  function parseFrontmatter(content: string): FrontmatterData {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!match) return { body: content };
    const raw = match[1];
    const body = content.slice(match[0].length);
    const data: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) { const key = line.slice(0, idx).trim(); const val = line.slice(idx + 1).trim(); data[key] = val; }
    }
    return { name: data.name, description: data.description, body };
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card flex-shrink-0 transition-colors duration-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">{t("workspace.title")}</h1>
          <div className="flex items-center gap-4">
            {activeTab === "files" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input type="text" placeholder={t("workspace.searchFiles")} value={fileSearchQuery} onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" />
              </div>
            )}
            {activeTab === "skills" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input type="text" placeholder={t("workspace.searchSkills")} value={skillSearchQuery} onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" />
              </div>
            )}
            {activeTab === "memory" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input type="text" placeholder={t("workspace.searchMemory")} value={memorySearchQuery} onChange={(e) => setMemorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" />
              </div>
            )}
            {activeTab === "sessions" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <input type="text" placeholder={t("workspace.searchSessions")} value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" />
              </div>
            )}
            {activeTab === "cron" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-dark-text-muted">{cronJobs.length > 0 && t("workspace.cronJobCount", { count: cronJobs.length })}</span>
                <button onClick={() => { setShowCronDialog(true); resetCronForm(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" />{t("workspace.cronAddJob")}
                </button>
              </div>
            )}
            <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 左侧列表 */}
        <div className="w-80 border-r border-gray-200 dark:border-dark-border-subtle flex flex-col bg-white dark:bg-dark-bg-card overflow-hidden transition-colors duration-200">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            {activeTab === "files" && (
              <FileList items={items} selectedItem={selectedItem} searchQuery={fileSearchQuery} isLoading={isLoading}
                onSearchChange={setFileSearchQuery} onDirectoryLoad={loadDirectory} onFileLoad={loadFileContentAction}
                onRename={renameFsItem} onDelete={deleteFsItem} formatSize={formatSize}
                formatTimestamp={(ts) => formatTimestamp(ts, t, i18n)} />
            )}
            {activeTab === "skills" && (
              <SkillList skills={skills} selectedSkill={selectedSkill} searchQuery={skillSearchQuery} isLoading={isLoading}
                onSearchChange={setSkillSearchQuery} onSelect={selectSkillAction} onToggle={toggleSkillAction} onDelete={deleteSkillAction}
                formatTimestamp={(ts) => formatTimestamp(ts, t, i18n)} />
            )}
            {activeTab === "memory" && (
              <MemoryList memories={memories} selectedMemory={selectedMemory} searchQuery={memorySearchQuery} isLoading={isLoading}
                onSearchChange={setMemorySearchQuery} onSelect={selectMemoryAction} onDelete={deleteMemoryAction} formatSize={formatSize}
                formatTimestamp={(ts) => formatTimestamp(ts, t, i18n)} />
            )}
            {activeTab === "sessions" && (
              <SessionList sessions={chatSessions} selectedSession={selectedChatSession} searchQuery={chatSearchQuery} isLoading={isLoading}
                onSearchChange={setChatSearchQuery} onSelect={selectChatSessionAction} formatSize={formatSize}
                formatTimestamp={(ts) => formatTimestamp(ts, t, i18n)} />
            )}
            {activeTab === "cron" && (
              <CronList jobs={cronJobs} isLoading={isLoading} onToggle={toggleCronJobEnabled} onEdit={openCronEditDialog} onRemove={confirmRemoveCronJob}
                describeSchedule={(sch) => describeSchedule(sch, t)} describeCron={(expr) => describeCron(expr, t)} describeIntervalMs={(ms) => describeIntervalMs(ms, t)} formatCronTimestamp={formatCronTimestamp} formatCronRelativeTime={(ms) => formatCronRelativeTime(ms, t)} />
            )}
          </div>
        </div>

        {/* 右侧详情区域 - 保持原有逻辑，篇幅限制省略具体实现 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-bg-sidebar transition-colors duration-200">
          {/* 这里保留原有的详情渲染逻辑，因为主要是条件渲染，不涉及复杂列表 */}
          {activeTab === "files" && selectedItem ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">{selectedItem.name}</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">{formatSize(selectedItem.size)} · {formatTimestamp(selectedItem.modified, t, i18n)}</p>
                  </div>
                  <button onClick={() => { setSelectedItem(null); setFileContent(""); }} className="p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
                <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed">{fileContent}</pre>
                </div>
              </div>
            </div>
          ) : activeTab === "skills" && (isNewSkill || selectedSkill) ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {isNewSkill ? (
                      <input type="text" placeholder={t("workspace.skillName")} value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)}
                        className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary bg-transparent border-b border-gray-300 dark:border-dark-border-subtle focus:outline-none focus:border-blue-500 w-64" autoFocus />
                    ) : (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">{skillFrontmatter.name || selectedSkill?.title || selectedSkill?.name}</h2>
                        {skillFrontmatter.description && <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mt-1">{skillFrontmatter.description}</p>}
                        <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">{selectedSkill?.enabled ? t("workspace.enabled") : t("workspace.disabled")} · {formatTimestamp(selectedSkill?.modified || 0, t, i18n)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={cancelEditSkillAction} className="flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm">
                          <X className="w-4 h-4" />{t("workspace.cancel")}
                        </button>
                        <button onClick={saveSkillAction} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                          <Save className="w-4 h-4" />{t("workspace.save")}
                        </button>
                      </>
                    ) : (
                      <button onClick={startEditSkillAction} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                        <Edit3 className="w-4 h-4" />{t("workspace.edit")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {isEditing ? (
                <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)}
                  className="flex-1 w-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary resize-none focus:outline-none scrollbar-thin border-0"
                  placeholder={t("workspace.editorPlaceholder")} />
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
                  <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6">
                    <div className="prose dark:prose-invert max-w-none break-words overflow-hidden">
                      <ReactMarkdown>{skillFrontmatter.body || skillContent || t("workspace.noContent")}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "memory" && selectedMemory ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">{selectedMemory.name}</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">{selectedMemory.size !== undefined && `${formatSize(selectedMemory.size)} · `}{formatTimestamp(selectedMemory.modified || 0, t, i18n)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMemoryEditing ? (
                      <>
                        <button onClick={cancelEditMemoryAction} className="flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm">
                          <X className="w-4 h-4" />{t("workspace.cancel")}
                        </button>
                        <button onClick={saveMemoryAction} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
                          <Save className="w-4 h-4" />{t("workspace.save")}
                        </button>
                      </>
                    ) : (
                      <button onClick={startEditMemoryAction} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm">
                        <Edit3 className="w-4 h-4" />{t("workspace.edit")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden p-6">
                {isMemoryEditing ? (
                  <textarea value={memoryEditingContent} onChange={(e) => setMemoryEditingContent(e.target.value)}
                    className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary border border-gray-200 dark:border-dark-border-subtle rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 scrollbar-thin"
                    placeholder={t("workspace.memoryEditorPlaceholder")} />
                ) : (
                  <div className="h-full overflow-y-auto bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 scrollbar-thin">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed">{memoryContent || t("workspace.noMemoryContent")}</pre>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "sessions" && selectedChatSession ? (
            <div className="flex-1 flex flex-col">
              <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-green-500 dark:text-green-400" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">{selectedChatSession.name}</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">{formatSize(selectedChatSession.size)} · {formatTimestamp(selectedChatSession.modified, t, i18n)}</p>
                  </div>
                  <button onClick={() => { setSelectedChatSession(null); setChatMessages([]); }} className="p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden p-6">
                {isLoadingChatContent ? (
                  <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><EmptyState icon={FileText} title={t("workspace.noMessages")} description={t("workspace.noMessagesDesc")} /></div>
                ) : (
                  <div ref={chatMessagesContainerRef} className="h-full overflow-y-auto overflow-x-hidden bg-white/40 dark:bg-dark-bg-card/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-dark-border-subtle/50 p-6 scrollbar-thin">
                    {chatMessages.map((msg, idx) => renderChatMessage(msg, idx))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "cron" ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="max-w-md text-center">
                <CalendarClock className="w-16 h-16 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">{t("workspace.cronTitle")}</h2>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-6">{t("workspace.cronDesc")}</p>
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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={activeTab === "files" ? FileText : activeTab === "skills" ? Wrench : activeTab === "memory" ? Brain : MessageSquare}
                title={t(`workspace.select${activeTab === "files" ? "File" : activeTab === "skills" ? "Skill" : activeTab === "memory" ? "Memory" : "Session"}`)}
                description={t(`workspace.select${activeTab === "files" ? "File" : activeTab === "skills" ? "Skill" : activeTab === "memory" ? "Memory" : "Session"}Desc`)} />
            </div>
          )}
        </div>
      </div>

      {/* 底部面包屑导航 (仅文件 Tab) */}
      {activeTab === "files" && (
        <div className="border-t border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => loadDirectory("")} className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${!currentPath || currentPath === "/" ? "text-gray-900 dark:text-dark-text-primary font-medium" : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-hover"}`}>
              <Home className="w-4 h-4" />{t("workspace.workspaceRoot")}
            </button>
            {getFileBreadcrumbs().map((crumb) => (
              <div key={crumb.path} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
                <button onClick={() => loadDirectory(crumb.path)} className={`px-2 py-1 rounded transition-colors ${crumb.path === currentPath ? "text-gray-900 dark:text-dark-text-primary font-medium" : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-hover"}`}>
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cron 对话框和确认对话框 - 保持原有逻辑 */}
      {showCronDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${editingCronJob ? "bg-amber-50 dark:bg-amber-900/30" : "bg-blue-50 dark:bg-blue-900/30"}`}>
                  {editingCronJob ? <Pencil className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{editingCronJob ? t("workspace.cronEditJob") : t("workspace.cronAddJob")}</h3>
              </div>
              <button onClick={() => { setShowCronDialog(false); resetCronForm(); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">{t("workspace.cronJobName")}</label>
                <input type="text" value={cronForm.name} onChange={(e) => setCronForm({ ...cronForm, name: e.target.value })} placeholder={t("workspace.cronJobNamePlaceholder")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">{t("workspace.cronMessageLabel")}</label>
                <textarea value={cronForm.message} onChange={(e) => setCronForm({ ...cronForm, message: e.target.value })} placeholder={t("workspace.cronMessagePlaceholder")} rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">{t("workspace.cronScheduleType")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {["cron", "every", "at"].map((type) => (
                    <button key={type} onClick={() => setCronForm({ ...cronForm, scheduleType: type as any })}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium ${cronForm.scheduleType === type ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"}`}>
                      {type === "cron" ? <CalendarClock className="w-4 h-4" /> : type === "every" ? <Clock className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                      {t(`workspace.cron${type === "cron" ? "" : type === "every" ? "Interval" : "RunOnce"}`)}
                    </button>
                  ))}
                </div>
              </div>
              {cronForm.scheduleType === "cron" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">{t("workspace.cronExpression")}</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[{ key: "cronMinute", label: t("workspace.cronFieldMinute"), placeholder: "0" }, { key: "cronHour", label: t("workspace.cronFieldHour"), placeholder: "9" },
                      { key: "cronDom", label: t("workspace.cronFieldDom"), placeholder: "*" }, { key: "cronMonth", label: t("workspace.cronFieldMonth"), placeholder: "*" },
                      { key: "cronDow", label: t("workspace.cronFieldDow"), placeholder: "*" }].map((field) => (
                      <div key={field.key} className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1 text-center">{field.label}</span>
                        <input type="text" value={cronForm[field.key as keyof typeof cronForm]} onChange={(e) => setCronForm({ ...cronForm, [field.key]: e.target.value })}
                          placeholder={field.placeholder} className="w-full px-2 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-center" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{describeCron(getCronExpression(cronForm), t)}</span></div>
                    <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1 ml-6 font-mono">{getCronExpression(cronForm)}</p>
                  </div>
                </div>
              ) : cronForm.scheduleType === "every" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">{t("workspace.cronIntervalSeconds")}</label>
                  <input type="number" value={cronForm.everySeconds} onChange={(e) => setCronForm({ ...cronForm, everySeconds: e.target.value })} placeholder="3600" min={1}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{describeIntervalMs(parseInt(cronForm.everySeconds) * 1000, t)}</span></div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">{t("workspace.cronAtTime")}</label>
                  <input type="datetime-local" value={cronForm.atTime} onChange={(e) => setCronForm({ ...cronForm, atTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg">
                    <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{cronForm.atTime ? t("workspace.cronRunOnceAt", { time: cronForm.atTime.replace("T", " ") }) : t("workspace.cronSelectTime")}</span></div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">{t("workspace.cronTimezone")}</label>
                <select value={cronForm.tz} onChange={(e) => setCronForm({ ...cronForm, tz: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">{t("workspace.cronTimezoneDefault")}</option>
                  <option value="Asia/Shanghai">Asia/Shanghai (北京时间)</option>
                  <option value="Asia/Hong_Kong">Asia/Hong_Kong (香港)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (东京)</option>
                  <option value="America/New_York">America/New_York (纽约)</option>
                  <option value="Europe/London">Europe/London (伦敦)</option>
                  <option value="UTC">UTC (协调世界时)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowCronDialog(false); resetCronForm(); }}
                className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium">{t("workspace.cronCancel")}</button>
              <button onClick={handleAddCronJob} disabled={isCronSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium">
                {isCronSubmitting ? (editingCronJob ? t("workspace.cronSaving") : t("workspace.cronAdding")) : (editingCronJob ? t("workspace.cronSave") : t("workspace.cronConfirm"))}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type || "warning"}
        onConfirm={confirmDialog.onConfirm} onCancel={closeConfirmDialog} />
    </div>
  );
}
