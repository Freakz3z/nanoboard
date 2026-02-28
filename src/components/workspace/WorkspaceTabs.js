import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { FolderTree, Wrench, Brain, MessageSquare, CalendarClock } from "lucide-react";
export default function WorkspaceTabs({ activeTab, onTabChange }) {
    const { t } = useTranslation();
    const tabs = [
        { id: "files", icon: FolderTree, labelKey: "workspace.filesTab", colorClass: "blue" },
        { id: "skills", icon: Wrench, labelKey: "workspace.skillsTab", colorClass: "blue" },
        { id: "memory", icon: Brain, labelKey: "workspace.memoryTab", colorClass: "purple" },
        { id: "sessions", icon: MessageSquare, labelKey: "workspace.sessionsTab", colorClass: "green" },
        { id: "cron", icon: CalendarClock, labelKey: "workspace.cronTab", colorClass: "amber" },
    ];
    return (_jsx("div", { className: "flex items-center bg-gray-100 dark:bg-dark-bg-sidebar rounded-lg p-1", children: tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (_jsxs("button", { onClick: () => onTabChange(tab.id), className: `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? `bg-white dark:bg-dark-bg-card text-${tab.colorClass}-600 dark:text-${tab.colorClass}-400 shadow-sm`
                    : "text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary"}`, children: [_jsx(Icon, { className: "w-4 h-4" }), t(tab.labelKey)] }, tab.id));
        }) }));
}
