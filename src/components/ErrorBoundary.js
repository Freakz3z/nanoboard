import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 */
export default class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                hasError: false,
                error: null,
            }
        });
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({ hasError: false, error: null });
            }
        });
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    render() {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;
        if (hasError) {
            if (fallback) {
                return fallback;
            }
            return (_jsx("div", { className: "flex items-center justify-center min-h-[200px] bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 p-6", children: _jsxs("div", { className: "text-center", children: [_jsx(AlertTriangle, { className: "w-12 h-12 text-red-500 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-red-700 dark:text-red-400 mb-2", children: "\u51FA\u9519\u4E86\uFF01" }), _jsx("p", { className: "text-sm text-red-600 dark:text-red-500 mb-4 max-w-md", children: error?.message || "组件渲染时发生错误" }), _jsxs("button", { onClick: this.handleReset, className: "flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium mx-auto", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), "\u91CD\u8BD5"] })] }) }));
        }
        return children;
    }
}
