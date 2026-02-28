import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
export default function ToastItem({ toast, onClose }) {
    useEffect(() => {
        const duration = toast.duration || 3000;
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, duration);
        return () => clearTimeout(timer);
    }, [toast, onClose]);
    const icons = {
        success: _jsx(CheckCircle, { className: "w-5 h-5" }),
        error: _jsx(AlertCircle, { className: "w-5 h-5" }),
        warning: _jsx(AlertTriangle, { className: "w-5 h-5" }),
        info: _jsx(Info, { className: "w-5 h-5" }),
    };
    const styles = {
        success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-500/50 text-green-800 dark:text-green-300",
        error: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/50 text-red-800 dark:text-red-300",
        warning: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/50 text-amber-800 dark:text-amber-300",
        info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/50 text-blue-800 dark:text-blue-300",
    };
    return (_jsxs("div", { className: `flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-md transition-colors duration-200 ${styles[toast.type]}`, children: [_jsx("div", { className: "flex-shrink-0", children: icons[toast.type] }), _jsx("p", { className: "flex-1 text-sm font-medium", children: toast.message }), _jsx("button", { onClick: () => onClose(toast.id), className: "flex-shrink-0 p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded transition-colors", children: _jsx(X, { className: "w-4 h-4" }) })] }));
}
