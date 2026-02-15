import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { skillApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  Wrench,
  Search,
  Plus,
  Trash2,
  Clock,
  FileText,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  Edit3,
  Eye,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Skill } from "../types";

interface FrontmatterData {
  name?: string;
  description?: string;
  body: string;
}

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

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function Skills() {
  const { t, i18n } = useTranslation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState<string>("");
  const [editingContent, setEditingContent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewSkill, setIsNewSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [frontmatter, setFrontmatter] = useState<FrontmatterData>({ body: "" });

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const toast = useToast();

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills(): Promise<Skill[]> {
    setIsLoading(true);
    try {
      const result = await skillApi.list();
      if (result.skills) {
        setSkills(result.skills);
        return result.skills;
      }
    } catch (error) {
      toast.showError(t("skills.loadFailed"));
    } finally {
      setIsLoading(false);
    }
    return [];
  }

  async function selectSkill(skill: Skill) {
    if (isEditing && !await confirmDiscardChanges()) return;

    setSelectedSkill(skill);
    setIsEditing(false);
    setIsNewSkill(false);

    try {
      const result = await skillApi.getContent(skill.id);
      if (result.success && result.content) {
        setSkillContent(result.content);
        setEditingContent(result.content);
        setFrontmatter(parseFrontmatter(result.content));
      } else {
        toast.showError(result.message || t("skills.loadContentFailed"));
      }
    } catch (error) {
      toast.showError(t("skills.loadContentFailed"));
    }
  }

  async function toggleSkill(skill: Skill) {
    try {
      const result = await skillApi.toggle(skill.id, !skill.enabled);
      if (result.success) {
        toast.showSuccess(result.enabled ? t("skills.enabled") : t("skills.disabled"));
        const updatedSkills = await loadSkills();
        // 用新的列表更新选中状态
        if (selectedSkill?.id === skill.id && result.new_id) {
          const updatedSkill = updatedSkills.find(s => s.id === result.new_id);
          if (updatedSkill) {
            setSelectedSkill(updatedSkill);
            // 重新加载内容
            try {
              const contentResult = await skillApi.getContent(updatedSkill.id);
              if (contentResult.success && contentResult.content) {
                setSkillContent(contentResult.content);
                setEditingContent(contentResult.content);
                setFrontmatter(parseFrontmatter(contentResult.content));
              }
            } catch {
              // 内容加载失败不影响选中状态
            }
          }
        }
      } else {
        toast.showError(result.message || t("skills.toggleFailed"));
      }
    } catch (error) {
      toast.showError(t("skills.toggleFailed"));
    }
  }

  async function deleteSkill(skill: Skill) {
    setConfirmDialog({
      isOpen: true,
      title: t("skills.deleteSkill"),
      message: t("skills.deleteConfirm", { name: skill.name }),
      onConfirm: async () => {
        try {
          const result = await skillApi.delete(skill.id);
          if (result.success) {
            toast.showSuccess(t("skills.deleted"));
            if (selectedSkill?.id === skill.id) {
              setSelectedSkill(null);
              setSkillContent("");
              setEditingContent("");
              setIsEditing(false);
            }
            await loadSkills();
          } else {
            toast.showError(result.message || t("skills.deleteFailed"));
          }
        } catch (error) {
          toast.showError(t("skills.deleteFailed"));
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  function startNewSkill() {
    setIsNewSkill(true);
    setIsEditing(true);
    setSelectedSkill(null);
    setSkillContent("");
    setEditingContent("# New Skill\n\nWrite your skill description here...\n");
    setNewSkillName("");
    setFrontmatter({ body: "" });
  }

  function startEdit() {
    setIsEditing(true);
    setEditingContent(skillContent);
  }

  function cancelEdit() {
    setIsEditing(false);
    setIsNewSkill(false);
    setEditingContent(skillContent);
    setNewSkillName("");
  }

  async function saveSkill() {
    const skillName = isNewSkill ? newSkillName.trim() : selectedSkill?.name;

    if (!skillName) {
      toast.showError(t("skills.enterName"));
      return;
    }

    // 验证文件名
    if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
      toast.showError(t("skills.invalidName"));
      return;
    }

    try {
      const result = await skillApi.save(skillName, editingContent);
      if (result.success) {
        toast.showSuccess(t("skills.saved"));
        setIsEditing(false);
        setIsNewSkill(false);
        await loadSkills();

        // 选中新保存的 skill
        const savedId = result.message?.match(/(.+)\.md/)?.[1] || skillName;
        const savedSkill = skills.find(s => s.name === savedId || s.id === `${savedId}.md`);
        if (savedSkill) {
          setSelectedSkill(savedSkill);
          setSkillContent(editingContent);
        }
      } else {
        toast.showError(result.message || t("skills.saveFailed"));
      }
    } catch (error) {
      toast.showError(t("skills.saveFailed"));
    }
  }

  async function confirmDiscardChanges(): Promise<boolean> {
    if (editingContent === skillContent) return true;

    // 使用确认对话框提示用户
    return window.confirm(t("skills.discardChangesConfirm") || "您有未保存的更改，确定要丢弃吗？");
  }

  function formatTimestamp(timestamp: number): string {
    if (!timestamp) return t("skills.unknown");
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? t("skills.justNow") : t("skills.minutesAgo", { count: minutes });
      }
      return t("skills.hoursAgo", { count: hours });
    } else if (days === 1) {
      return t("skills.yesterday");
    } else if (days < 7) {
      return t("skills.daysAgo", { count: days });
    } else {
      return date.toLocaleDateString(i18n.language === "en" ? "en-US" : "zh-CN");
    }
  }

  const filteredSkills = skills.filter((skill) => {
    const query = searchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      (skill.title && skill.title.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card flex-shrink-0 transition-colors duration-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {t("skills.title")}
          </h1>
          <div className="flex items-center gap-4">
            {/* 新建按钮 */}
            <button
              onClick={startNewSkill}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t("skills.newSkill")}
            </button>
            {/* 搜索框 */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
              <input
                type="text"
                placeholder={t("skills.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 左侧 Skill 列表 */}
        <div className="w-80 border-r border-gray-200 dark:border-dark-border-subtle flex flex-col bg-white dark:bg-dark-bg-card overflow-hidden transition-colors duration-200">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredSkills.length === 0 ? (
              <EmptyState
                icon={searchQuery ? Search : Wrench}
                title={searchQuery ? t("skills.noMatching") : t("skills.noSkills")}
                description={searchQuery ? t("skills.tryOther") : t("skills.noSkillsDesc")}
              />
            ) : (
              filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => selectSkill(skill)}
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
                        {skill.enabled ? t("skills.enabled") : t("skills.disabled")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(skill.modified || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSkill(skill);
                      }}
                      className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                      title={skill.enabled ? t("skills.disable") : t("skills.enable")}
                    >
                      {skill.enabled ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSkill(skill);
                      }}
                      className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                      title={t("skills.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧编辑/预览区域 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-bg-sidebar transition-colors duration-200">
          {isNewSkill || selectedSkill ? (
            <>
              {/* 头部 */}
              <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {isNewSkill ? (
                      <input
                        type="text"
                        placeholder={t("skills.skillName")}
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary bg-transparent border-b border-gray-300 dark:border-dark-border-subtle focus:outline-none focus:border-blue-500 w-64"
                        autoFocus
                      />
                    ) : (
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                        {frontmatter.name || selectedSkill?.title || selectedSkill?.name}
                      </h2>
                    )}
                    {!isNewSkill && selectedSkill && (
                      <div className="mt-1">
                        {frontmatter.description && (
                          <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2">
                            {frontmatter.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">
                          {selectedSkill.enabled ? t("skills.enabled") : t("skills.disabled")}
                          {" · "}
                          {formatTimestamp(selectedSkill.modified || 0)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          {t("skills.cancel")}
                        </button>
                        <button
                          onClick={saveSkill}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Save className="w-4 h-4" />
                          {t("skills.save")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        {t("skills.edit")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 编辑/预览内容 */}
              {isEditing ? (
                <div className="flex-1 min-h-0 flex overflow-hidden">
                  {/* 编辑器 */}
                  <div className="flex-1 min-w-0 flex flex-col border-r border-gray-200 dark:border-dark-border-subtle">
                    <div className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle text-xs font-medium text-gray-500 dark:text-dark-text-muted">
                      {t("skills.editor")}
                    </div>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="flex-1 w-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary resize-none focus:outline-none scrollbar-thin"
                      placeholder={t("skills.editorPlaceholder")}
                    />
                  </div>
                  {/* 预览 */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="px-4 py-2 bg-gray-100 dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle text-xs font-medium text-gray-500 dark:text-dark-text-muted flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {t("skills.preview")}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-dark-bg-card scrollbar-thin">
                      <div className="prose dark:prose-invert prose-sm max-w-none break-words overflow-hidden [&_pre]:overflow-x-auto [&_code]:break-all [&_a]:break-all [&_table]:block [&_table]:overflow-x-auto">
                        <ReactMarkdown>{editingContent || t("skills.noContent")}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
                  <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 transition-colors duration-200">
                    <div className="prose dark:prose-invert max-w-none break-words overflow-hidden [&_pre]:overflow-x-auto [&_code]:break-all [&_a]:break-all [&_table]:block [&_table]:overflow-x-auto">
                      <ReactMarkdown>{frontmatter.body || skillContent || t("skills.noContent")}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={Wrench}
                title={t("skills.selectSkill")}
                description={t("skills.selectSkillDesc")}
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
