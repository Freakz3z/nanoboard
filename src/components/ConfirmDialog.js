import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
export default function ConfirmDialog({ isOpen, title, message, confirmText, cancelText, type = "info", onConfirm, onCancel, }) {
    const { t } = useTranslation();
    if (!isOpen)
        return null;
    const styles = {
        danger: {
            icon: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
            button: "bg-red-600 hover:bg-red-700",
        },
        warning: {
            icon: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
            button: "bg-amber-600 hover:bg-amber-700",
        },
        info: {
            icon: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30",
            button: "bg-blue-600 hover:bg-blue-700",
        },
    };
    const currentStyle = styles[type];
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-md w-full animate-in fade-in transition-colors duration-200", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border-subtle", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `p-2 rounded-lg ${currentStyle.icon}`, children: _jsx(AlertTriangle, { className: "w-5 h-5" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: title })] }), _jsx("button", { onClick: onCancel, className: "p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors", children: _jsx(X, { className: "w-5 h-5 text-gray-400 dark:text-dark-text-muted" }) })] }), _jsx("div", { className: "p-6", children: _jsx("p", { className: "text-sm text-gray-700 dark:text-dark-text-secondary", children: message }) }), _jsxs("div", { className: "flex gap-3 p-6 pt-0", children: [_jsx("button", { onClick: onCancel, className: "flex-1 px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg font-medium transition-colors", children: cancelText || t("confirmDialog.cancel") }), _jsx("button", { onClick: onConfirm, className: `flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${currentStyle.button}`, children: confirmText || t("confirmDialog.confirm") })] })] }) }));
}
