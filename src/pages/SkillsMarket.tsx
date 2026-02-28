import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { Search, ExternalLink, RefreshCw, X } from "lucide-react";
import { clawhubApi } from "@/lib/tauri";
import { useToast } from "@/contexts/ToastContext";
import EmptyState from "@/components/EmptyState";
import { SkillCard } from "@/components/skills";
import type { ClawHubSearchResult, SkillListItem, SkillDetailResponse, SkillSortOption } from "@/types/clawhub";
import { SKILL_SORT_OPTIONS as sortOptions } from "@/types/clawhub";

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

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
  const [showInstalled, setShowInstalled] = useState(false);
  const [category, setCategory] = useState("");

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clawhubApi.getSkills(sortBy, 30);
      setSkills(response.items || []);
    } catch {
      toast.showError(t("skills.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [sortBy, t, toast]);

  useEffect(() => {
    if (!searchMode) loadSkills();
  }, [sortBy, searchMode, loadSkills]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchMode(false); return; }
    setLoading(true); setSearchMode(true);
    try {
      const response = await clawhubApi.search(searchQuery, 30);
      setSearchResults(response.results || []);
    } catch {
      toast.showError(t("skills.searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setSearchMode(false); };

  const viewSkillDetail = async (skill: ClawHubSearchResult | SkillListItem) => {
    const slug = (skill as any).slug;
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

  const loadSkillFile = async (path: string) => {
    if (!selectedSkill) return;
    setLoadingFile(true);
    try {
      const content = await clawhubApi.getSkillFile(selectedSkill.skill.slug, path);
      setSkillFileContent(content);
    } catch {
      toast.showError(t("skills.loadFileFailed"));
    } finally {
      setLoadingFile(false);
    }
  };

  const closeDetail = () => { setSelectedSkill(null); setSkillFileContent(null); };

  const getInstallCommand = useCallback((slug: string) => `npx clawhub@latest install ${slug}`, []);

  const copyInstallCommand = useCallback((slug: string) => {
    navigator.clipboard.writeText(getInstallCommand(slug));
    toast.showSuccess(t("skills.commandCopied"));
  }, [getInstallCommand, t, toast]);

  const handleInstall = useCallback(async (skill: ClawHubSearchResult | SkillListItem) => {
    const slug = (skill as any).slug;
    const command = getInstallCommand(slug);
    try {
      await navigator.clipboard.writeText(command);
      toast.showSuccess(t("skills.commandCopied"));
      // 提示用户手动执行命令
      toast.showInfo(`${t("skills.installTip")}:\n${command}`);
    } catch {
      toast.showError(t("skills.copyFailed"));
    }
  }, [getInstallCommand, t, toast]);

  const handleUninstall = useCallback(async (skill: ClawHubSearchResult | SkillListItem) => {
    const slug = (skill as any).slug;
    const command = `npx clawhub@latest uninstall ${slug}`;
    try {
      await navigator.clipboard.writeText(command);
      toast.showSuccess(t("skills.commandCopied"));
      toast.showInfo(`${t("skills.uninstallTip")}:\n${command}`);
    } catch {
      toast.showError(t("skills.copyFailed"));
    }
  }, [t, toast]);

  // 使用 useMemo 缓存分类列表
  const categories = useMemo(() => 
    Array.from(new Set(skills.map((s: any) => (s as any).category).filter(Boolean))) as string[],
  [skills]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-dark-bg-base transition-colors duration-200">
      {/* 头部 */}
      <div className="bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">{t("skills.title")}</h1>
            <a href="https://clawhub.ai" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {t("skills.visitClawHub")}<ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder={t("skills.searchPlaceholder")}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button onClick={handleSearch} disabled={loading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {loading ? t("skills.searching") : t("skills.search")}
            </button>
          </div>

          {!searchMode && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{t("skills.sortBy")}:</span>
              <div className="flex gap-1">
                {sortOptions.map((option) => (
                  <button key={option.value} onClick={() => setSortBy(option.value)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      sortBy === option.value ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200"}`}>
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
              <button onClick={loadSkills} disabled={loading} className="ml-auto p-2 text-gray-500 hover:text-gray-700" title={t("skills.refresh")}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">
          {searchMode && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {t("skills.searchResults", { count: searchResults.length, query: searchQuery })}
              </p>
              <button onClick={clearSearch} className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                {t("skills.clearSearch")}
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-dark-text-secondary">{t("skills.loading")}</div>
          ) : searchMode ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((skill) => (
                  <SkillCard key={skill.slug} skill={skill} isInstalled={false} onInstall={handleInstall}
                    onUninstall={handleUninstall} onViewDetails={(s) => viewSkillDetail(s)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Search} title={t("skills.noResults")} description={t("skills.noResultsDesc")} />
            )
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard key={skill.slug} skill={skill} isInstalled={false} onInstall={handleInstall}
                  onUninstall={handleUninstall} onViewDetails={(s) => viewSkillDetail(s)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Search} title={t("skills.noSkills")} description={t("skills.noSkillsDesc")} />
          )}
        </div>
      </div>

      {/* 技能详情侧边栏 */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-dark-border-subtle flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate">{selectedSkill.skill.displayName}</h2>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">{selectedSkill.skill.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copyInstallCommand(selectedSkill.skill.slug)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
                  {t("skills.copyInstallCommand")}
                </button>
                <button onClick={closeDetail} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors" title={t("common.close")}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-dark-text-secondary">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-sm">{t("skills.loadingDetail")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">{t("skills.owner")}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{selectedSkill.owner.handle}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">{t("skills.version")}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{selectedSkill.latestVersion.version}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">{t("skills.downloads")}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{formatNumber(selectedSkill.skill.stats?.installsCurrent || 0)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">{t("skills.stars")}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{formatNumber(selectedSkill.skill.stats?.stars || 0)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">{t("skills.description")}</h3>
                    <p className="text-sm text-gray-600 dark:text-dark-text-primary bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                      {selectedSkill.skill.summary || t("skills.noDescription")}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">{t("skills.installCommand")}</h3>
                    <div className="bg-gray-900 dark:bg-dark-bg-sidebar rounded-lg p-3 font-mono text-sm text-green-400">
                      {getInstallCommand(selectedSkill.skill.slug)}
                    </div>
                  </div>

                  {selectedSkill.latestVersion.changelog && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">{t("skills.changelog")}</h3>
                      <p className="text-sm text-gray-600 dark:text-dark-text-primary bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3">
                        {selectedSkill.latestVersion.changelog}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">{t("skills.skillFile")}</h3>
                    <button onClick={() => loadSkillFile("SKILL.md")} disabled={loadingFile}
                      className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline">
                      <ExternalLink className="w-4 h-4" />
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
