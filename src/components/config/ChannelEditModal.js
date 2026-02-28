import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Channel 编辑模态框组件
 */
import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";
export default function ChannelEditModal({ isOpen, channelKey, channelInfo, config, onClose, onUpdateField, }) {
    const { t } = useTranslation();
    if (!isOpen || !channelInfo)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto transition-colors duration-200", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: `p-2 rounded-lg ${channelInfo.colorClass.split(" text-")[0]}`, children: _jsx(MessageSquare, { className: `w-6 h-6 ${"text-" + channelInfo.colorClass.split(" text-")[1]}` }) }), _jsx("div", { children: _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: t("config.editChannel", { name: t(channelInfo.nameKey) }) }) })] }), _jsx("div", { className: "space-y-4", children: channelInfo.fields.map((field) => {
                        const currentValue = config.channels?.[channelKey]?.[field.name];
                        // 处理 allowFrom 字段：如果是数组，转换为逗号分隔的字符串
                        let fieldValue = currentValue !== undefined ? currentValue : field.default ?? "";
                        if (field.name === "allowFrom" && Array.isArray(fieldValue)) {
                            // 如果数组为空或只包含空字符串，显示为空（表示允许所有人）
                            if (fieldValue.length === 0 || (fieldValue.length === 1 && fieldValue[0] === "")) {
                                fieldValue = "";
                            }
                            else {
                                // 否则转换为逗号分隔的字符串
                                fieldValue = fieldValue.join(", ");
                            }
                        }
                        return (_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-dark-text-secondary mb-1", children: t(field.labelKey) }), field.type === "select" ? (_jsx("select", { value: fieldValue, onChange: (e) => onUpdateField(channelKey, field.name, e.target.value), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary", children: field.options?.map((option) => (_jsx("option", { value: option, children: option }, option))) })) : field.type === "number" ? (_jsx("input", { type: "number", value: fieldValue, onChange: (e) => onUpdateField(channelKey, field.name, parseInt(e.target.value)), placeholder: field.placeholderKey ? t(field.placeholderKey) : undefined, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" })) : (_jsx("input", { type: field.type === "password" ? "password" : "text", value: fieldValue, onChange: (e) => onUpdateField(channelKey, field.name, e.target.value), placeholder: field.placeholderKey ? t(field.placeholderKey) : undefined, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted" }))] }, field.name));
                    }) }), _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium", children: t("config.cancel") }), _jsx("button", { onClick: onClose, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium", children: t("config.done") })] })] }) }));
}
