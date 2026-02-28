import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
export default function EmptyState({ icon: Icon, title, description, action, }) {
    const { t } = useTranslation();
    return (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 px-4", children: [Icon && (_jsx("div", { className: "w-16 h-16 bg-gray-100 dark:bg-dark-bg-hover rounded-full flex items-center justify-center mb-4 transition-colors duration-200", children: _jsx(Icon, { className: "w-8 h-8 text-gray-400 dark:text-dark-text-muted" }) })), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2", children: title || t("emptyState.title") }), description && (_jsx("p", { className: "text-sm text-gray-500 dark:text-dark-text-muted mb-6 text-center max-w-md", children: description || t("emptyState.description") })), action && (_jsx("button", { onClick: action.onClick, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm", children: action.label }))] }));
}
