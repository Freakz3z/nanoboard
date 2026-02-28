/**
 * ClawHub Skills 市场页面
 * 用于搜索和浏览 ClawHub 上的 Skills
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Star,
  Clock,
  ExternalLink,
  RefreshCw,
  X,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { clawhubApi } from "@/lib/tauri";
import { useToast } from "@/contexts/ToastContext";
import EmptyState from "@/components/EmptyState";
import type {
  ClawHubSearchResult,
  SkillListItem,
  SkillDetailResponse,
  SkillSortOption,
} from "@/types/clawhub";
import { SKILL_SORT_OPTIONS as sortOptions } from "@/types/clawhub";

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  if (days < 365) return `${Math.floor(days / 30)} 月前`;
  return `${Math.floor(days / 365)} 年前`;
}

export default function SkillsMarket() {
  const { t } = useTranslation();
  const toast = useToast();

  // 状态
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClawHubSearchResult[]>([]);
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [sortBy, setSortBy] = useState<SkillSortOption>("trending");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetailResponse | null>(null);
  const [skillFileContent, setSkillFileContent] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  // 加载技能列表
  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clawhubApi.getSkills(sortBy, 30);
      setSkills(response.items || []);
    } catch (error) {
      console.error("Failed to load skills:", error);
      toast.showError(t("skills.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [sortBy]); // 移除 t 和 toast 依赖，避免引用不稳定导致无限循环

  // 初始加载 - 只在组件挂载时和 sortBy 改变时执行
  useEffect(() => {
    if (!searchMode) {
      loadSkills();
    }
  }, [sortBy, searchMode]); // 直接依赖 sortBy 而不是 loadSkills

  // 搜索技能
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMode(false);
      return;
    }

    setLoading(true);
    setSearchMode(true);
    try {
      const response = await clawhubApi.search(searchQuery, 30);
      setSearchResults(response.results || []);
    } catch (error) {
      console.error("Failed to search skills:", error);
      toast.showError(t("skills.searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchMode(false);
  };

  // 查看技能详情
  const viewSkillDetail = async (slug: string) => {
    setLoadingDetail(true);
    try {
      const detail = await clawhubApi.getSkillDetail(slug);
      setSelectedSkill(detail);
    } catch (error) {
      console.error("Failed to load skill detail:", error);
      toast.showError(t("skills.loadDetailFailed"));
    } finally {
      setLoadingDetail(false);
    }
  };

  // 加载技能文件
  const loadSkillFile = async (path: string) => {
    if (!selectedSkill) return;

    setLoadingFile(true);
    try {
      const content = await clawhubApi.getSkillFile(
        selectedSkill.skill.slug,
        path
      );
      setSkillFileContent(content);
    } catch (error) {
      console.error("Failed to load skill file:", error);
      toast.showError(t("skills.loadFileFailed"));
    } finally {
      setLoadingFile(false);
    }
  };

  // 关闭详情面板
  const closeDetail = () => {
    setSelectedSkill(null);
    setSkillFileContent(null);
  };

  // 生成安装命令
  const getInstallCommand = (slug: string) => {
    return `npx clawhub@latest install ${slug}`;
  };

  // 复制安装命令
  const copyInstallCommand = (slug: string) => {
    navigator.clipboard.writeText(getInstallCommand(slug));
    toast.showSuccess(t("skills.commandCopied"));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-dark-bg-base transition-colors duration-200">
      {/* 头部 */}
      <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle p-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              {t("skills.title")}
            </h1>
            <a
              href="https://clawhub.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("skills.visitClawHub")}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* 搜索栏 */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t("skills.searchPlaceholder")}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? t("skills.searching") : t("skills.search")}
            </button>
          </div>

          {/* 排序选项（非搜索模式） */}
          {!searchMode && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                {t("skills.sortBy")}:
              </span>
              <div className="flex gap-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      sortBy === option.value
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-active"
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
              <button
                onClick={loadSkills}
                disabled={loading}
                className="ml-auto p-2 text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary transition-colors"
                title={t("skills.refresh")}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">
          {/* 搜索结果提示 */}
          {searchMode && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {t("skills.searchResults", { count: searchResults.length, query: searchQuery })}
              </p>
              <button
                onClick={clearSearch}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                {t("skills.clearSearch")}
              </button>
            </div>
          )}

          {/* 技能卡片网格 */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-dark-text-secondary">
                {t("skills.loading")}
              </div>
            </div>
          ) : searchMode ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((skill) => (
                  <SkillCard
                    key={skill.slug}
                    slug={skill.slug}
                    displayName={skill.displayName}
                    summary={skill.summary}
                    version={skill.version}
                    updatedAt={skill.updatedAt}
                    onViewDetail={() => viewSkillDetail(skill.slug)}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title={t("skills.noResults")}
                description={t("skills.noResultsDesc")}
              />
            )
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.slug}
                  slug={skill.slug}
                  displayName={skill.displayName}
                  summary={skill.summary}
                  version={skill.tags?.latest || ""}
                  updatedAt={skill.updatedAt}
                  stats={skill.stats}
                  onViewDetail={() => viewSkillDetail(skill.slug)}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title={t("skills.noSkills")}
              description={t("skills.noSkillsDesc")}
            />
          )}
        </div>
      </div>

      {/* 技能详情侧边栏 */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 详情头部 */}
            <div className="p-4 border-b border-gray-200 dark:border-dark-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDetail}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    {selectedSkill.skill.displayName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                    {selectedSkill.skill.slug}
                  </p>
                </div>
              </div>
              <button
                onClick={() => copyInstallCommand(selectedSkill.skill.slug)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t("skills.copyInstallCommand")}
              </button>
            </div>

            {/* 详情内容 */}
            <div className="flex-1 overflow-auto p-4">
              {loadingDetail ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                        {t("skills.owner")}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {selectedSkill.owner.handle}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                        {t("skills.version")}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {selectedSkill.latestVersion.version}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                        {t("skills.downloads")}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {formatNumber(selectedSkill.skill.stats?.installsCurrent || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                        {t("skills.stars")}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {formatNumber(selectedSkill.skill.stats?.stars || 0)}
                      </p>
                    </div>
                  </div>

                  {/* 描述 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t("skills.description")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-dark-text-primary bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      {selectedSkill.skill.summary || t("skills.noDescription")}
                    </p>
                  </div>

                  {/* 安装命令 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t("skills.installCommand")}
                    </h3>
                    <div className="bg-gray-900 dark:bg-dark-bg-sidebar rounded-lg p-3 font-mono text-sm text-green-400">
                      {getInstallCommand(selectedSkill.skill.slug)}
                    </div>
                  </div>

                  {/* 更新日志 */}
                  {selectedSkill.latestVersion.changelog && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                        {t("skills.changelog")}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-dark-text-primary bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                        {selectedSkill.latestVersion.changelog}
                      </p>
                    </div>
                  )}

                  {/* SKILL.md 预览 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      {t("skills.skillFile")}
                    </h3>
                    <button
                      onClick={() => loadSkillFile("SKILL.md")}
                      disabled={loadingFile}
                      className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      {loadingFile ? t("skills.loadingFile") : t("skills.viewSkillMd")}
                    </button>
                    {skillFileContent && (
                      <pre className="mt-3 bg-gray-900 dark:bg-dark-bg-sidebar rounded-lg p-4 text-sm text-gray-300 overflow-auto max-h-64">
                        {skillFileContent}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 技能卡片组件
interface SkillCardProps {
  slug: string;
  displayName: string;
  summary: string;
  version: string;
  updatedAt: number;
  stats?: {
    downloads?: number;
    stars?: number;
    installsCurrent?: number;
    installsAllTime?: number;
  };
  onViewDetail: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function SkillCard({
  slug,
  displayName,
  summary,
  version,
  updatedAt,
  stats,
  onViewDetail,
  t,
}: SkillCardProps) {
  return (
    <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-4 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm line-clamp-1">
          {displayName}
        </h3>
        {version && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary rounded-full">
            v{version}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-3 line-clamp-2">
        {summary || t("skills.noDescription")}
      </p>

      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-dark-text-muted mb-3">
        <span className="truncate font-mono">{slug}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-text-secondary">
          {stats?.installsCurrent !== undefined && (
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {formatNumber(stats.installsCurrent)}
            </span>
          )}
          {stats?.stars !== undefined && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {formatNumber(stats.stars)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onViewDetail}
            className="p-1.5 text-gray-500 dark:text-dark-text-secondary hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            title={t("skills.viewDetail")}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
