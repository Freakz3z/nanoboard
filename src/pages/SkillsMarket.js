import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, ExternalLink, RefreshCw, X } from "lucide-react";
import { clawhubApi } from "@/lib/tauri";
import { useToast } from "@/contexts/ToastContext";
import EmptyState from "@/components/EmptyState";
import { SkillCard } from "@/components/skills";
import { SKILL_SORT_OPTIONS as sortOptions } from "@/types/clawhub";
function formatNumber(num) {
    if (num >= 1000000)
        return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000)
        return (num / 1000).toFixed(1) + "K";
    return num.toString();
}
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0)
        return "今天";
    if (days === 1)
        return "昨天";
    if (days < 7)
        return `${days} 天前`;
    if (days < 30)
        return `${Math.floor(days / 7)} 周前`;
    if (days < 365)
        return `${Math.floor(days / 30)} 月前`;
    return `${Math.floor(days / 365)} 年前`;
}
export default function SkillsMarket() {
    const { t } = useTranslation();
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchMode, setSearchMode] = useState(false);
    const [sortBy, setSortBy] = useState("trending");
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [skillFileContent, setSkillFileContent] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [loadingFile, setLoadingFile] = useState(false);
    const [showInstalled, setShowInstalled] = useState(false);
    const [category, setCategory] = useState("");
    const loadSkills = useCallback(async () => {
        setLoading(true);
        try {
            const response = await clawhubApi.getSkills(sortBy, 30);
            setSkills(response.items || []);
        }
        catch {
            toast.showError(t("skills.loadFailed"));
        }
        finally {
            setLoading(false);
        }
    }, [sortBy, t, toast]);
    useEffect(() => {
        if (!searchMode)
            loadSkills();
    }, [sortBy, searchMode, loadSkills]);
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
        }
        catch {
            toast.showError(t("skills.searchFailed"));
        }
        finally {
            setLoading(false);
        }
    };
    const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setSearchMode(false); };
    const viewSkillDetail = async (slug) => {
        setLoadingDetail(true);
        try {
            const detail = await clawhubApi.getSkillDetail(slug);
            setSelectedSkill(detail);
        }
        catch {
            toast.showError(t("skills.loadDetailFailed"));
        }
        finally {
            setLoadingDetail(false);
        }
    };
    const loadSkillFile = async (path) => {
        if (!selectedSkill)
            return;
        setLoadingFile(true);
        try {
            const content = await clawhubApi.getSkillFile(selectedSkill.skill.slug, path);
            setSkillFileContent(content);
        }
        catch {
            toast.showError(t("skills.loadFileFailed"));
        }
        finally {
            setLoadingFile(false);
        }
    };
    const closeDetail = () => { setSelectedSkill(null); setSkillFileContent(null); };
    const getInstallCommand = (slug) => `npx clawhub@latest install ${slug}`;
    const copyInstallCommand = (slug) => {
        navigator.clipboard.writeText(getInstallCommand(slug));
        toast.showSuccess(t("skills.commandCopied"));
    };
    const categories = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)));
    return (_jsxs("div", { className: "h-full flex flex-col bg-gray-50 dark:bg-dark-bg-base transition-colors duration-200", children: [_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle p-4", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h1", { className: "text-xl font-bold text-gray-900 dark:text-dark-text-primary", children: t("skills.title") }), _jsxs("a", { href: "https://clawhub.ai", target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline", children: [t("skills.visitClawHub"), _jsx(ExternalLink, { className: "w-4 h-4" })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-muted" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSearch(), placeholder: t("skills.searchPlaceholder"), className: "w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }), searchQuery && (_jsx("button", { onClick: clearSearch, className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) }))] }), _jsx("button", { onClick: handleSearch, disabled: loading, className: "px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50", children: loading ? t("skills.searching") : t("skills.search") })] }), !searchMode && (_jsxs("div", { className: "flex items-center gap-2 mt-4", children: [_jsxs("span", { className: "text-sm text-gray-500 dark:text-dark-text-secondary", children: [t("skills.sortBy"), ":"] }), _jsx("div", { className: "flex gap-1", children: sortOptions.map((option) => (_jsx("button", { onClick: () => setSortBy(option.value), className: `px-3 py-1 text-sm rounded-full transition-colors ${sortBy === option.value ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                            : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200"}`, children: t(option.labelKey) }, option.value))) }), _jsx("button", { onClick: loadSkills, disabled: loading, className: "ml-auto p-2 text-gray-500 hover:text-gray-700", title: t("skills.refresh"), children: _jsx(RefreshCw, { className: `w-4 h-4 ${loading ? "animate-spin" : ""}` }) })] }))] }) }), _jsx("div", { className: "flex-1 overflow-auto", children: _jsxs("div", { className: "max-w-7xl mx-auto p-4", children: [searchMode && (_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-secondary", children: t("skills.searchResults", { count: searchResults.length, query: searchQuery }) }), _jsx("button", { onClick: clearSearch, className: "text-sm text-purple-600 dark:text-purple-400 hover:underline", children: t("skills.clearSearch") })] })), loading ? (_jsx("div", { className: "flex items-center justify-center h-64 text-gray-500 dark:text-dark-text-secondary", children: t("skills.loading") })) : searchMode ? (searchResults.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: searchResults.map((skill) => (_jsx(SkillCard, { skill: skill, isInstalled: false, onInstall: () => { }, onUninstall: () => { }, onViewDetails: () => viewSkillDetail(skill.slug) }, skill.slug))) })) : (_jsx(EmptyState, { icon: Search, title: t("skills.noResults"), description: t("skills.noResultsDesc") }))) : skills.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: skills.map((skill) => (_jsx(SkillCard, { skill: skill, isInstalled: false, onInstall: () => { }, onUninstall: () => { }, onViewDetails: () => viewSkillDetail(skill.slug) }, skill.slug))) })) : (_jsx(EmptyState, { icon: Search, title: t("skills.noSkills"), description: t("skills.noSkillsDesc") }))] }) }), selectedSkill && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-gray-200 dark:border-dark-border-subtle flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: closeDetail, className: "p-1 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg", children: _jsx(ExternalLink, { className: "w-5 h-5 rotate-180 text-gray-500" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: selectedSkill.skill.displayName }), _jsx("p", { className: "text-sm text-gray-500 dark:text-dark-text-secondary", children: selectedSkill.skill.slug })] })] }), _jsx("button", { onClick: () => copyInstallCommand(selectedSkill.skill.slug), className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors", children: t("skills.copyInstallCommand") })] }), _jsx("div", { className: "flex-1 overflow-auto p-4", children: loadingDetail ? (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsx(RefreshCw, { className: "w-6 h-6 animate-spin text-gray-400" }) })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("div", { className: "bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3", children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted", children: t("skills.owner") }), _jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-dark-text-primary", children: selectedSkill.owner.handle })] }), _jsxs("div", { className: "bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3", children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted", children: t("skills.version") }), _jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-dark-text-primary", children: selectedSkill.latestVersion.version })] }), _jsxs("div", { className: "bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3", children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted", children: t("skills.downloads") }), _jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-dark-text-primary", children: formatNumber(selectedSkill.skill.stats?.installsCurrent || 0) })] }), _jsxs("div", { className: "bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3", children: [_jsx("p", { className: "text-xs text-gray-500 dark:text-dark-text-muted", children: t("skills.stars") }), _jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-dark-text-primary", children: formatNumber(selectedSkill.skill.stats?.stars || 0) })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2", children: t("skills.description") }), _jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-primary bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3", children: selectedSkill.skill.summary || t("skills.noDescription") })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2", children: t("skills.installCommand") }), _jsx("div", { className: "bg-gray-900 dark:bg-dark-bg-sidebar rounded-lg p-3 font-mono text-sm text-green-400", children: getInstallCommand(selectedSkill.skill.slug) })] }), selectedSkill.latestVersion.changelog && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2", children: t("skills.changelog") }), _jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-primary bg-gray-50 dark:bg-dark-bg-sidebar rounded-lg p-3", children: selectedSkill.latestVersion.changelog })] })), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2", children: t("skills.skillFile") }), _jsxs("button", { onClick: () => loadSkillFile("SKILL.md"), disabled: loadingFile, className: "flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline", children: [_jsx(ExternalLink, { className: "w-4 h-4" }), loadingFile ? t("skills.loadingFile") : t("skills.viewSkillMd")] }), skillFileContent && (_jsx("pre", { className: "mt-3 bg-gray-900 dark:bg-dark-bg-sidebar rounded-lg p-4 text-sm text-gray-300 overflow-auto max-h-64", children: skillFileContent }))] })] })) })] }) }))] }));
}
