import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { FileText, Clock, Trash2, Search, Brain } from "lucide-react";
import EmptyState from "../EmptyState";
export default function MemoryList({ memories, selectedMemory, searchQuery, isLoading, onSearchChange, onSelect, onDelete, formatSize, formatTimestamp, }) {
    const { t, i18n } = useTranslation();
    const filteredMemories = memories.filter((memory) => {
        const query = searchQuery.toLowerCase();
        return memory.name.toLowerCase().includes(query);
    });
    return (_jsx("div", { className: "space-y-1", children: isLoading ? (_jsx("div", { className: "flex items-center justify-center h-32", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" }) })) : filteredMemories.length === 0 ? (_jsx(EmptyState, { icon: searchQuery ? Search : Brain, title: searchQuery ? t("workspace.noMatchingMemory") : t("workspace.noMemory"), description: searchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noMemoryDesc") })) : (filteredMemories.map((memory) => (_jsxs("div", { onClick: () => onSelect(memory), className: `group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedMemory?.id === memory.id
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"}`, children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(FileText, { className: "w-5 h-5 text-purple-500 dark:text-purple-400" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm", children: memory.name }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5", children: [memory.size !== undefined && _jsx("span", { children: formatSize(memory.size) }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-3 h-3" }), formatTimestamp(memory.modified || 0, t, i18n)] })] })] }), _jsx("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("button", { onClick: (e) => { e.stopPropagation(); onDelete(memory); }, className: "p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all", title: t("workspace.delete"), children: _jsx(Trash2, { className: "w-4 h-4" }) }) })] }, memory.id)))) }));
}
