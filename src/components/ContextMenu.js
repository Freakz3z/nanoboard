import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
export function ContextMenu({ children }) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [menuItems, setMenuItems] = useState([]);
    useEffect(() => {
        const handleContextMenu = (e) => {
            e.preventDefault();
            const pos = { x: e.clientX, y: e.clientY };
            setPosition(pos);
            setIsVisible(true);
            setMenuItems([
                t('contextmenu.refresh'),
                t('contextmenu.back'),
                t('contextmenu.forward'),
                '-',
                t('contextmenu.copy'),
                t('contextmenu.paste'),
                '-',
                t('contextmenu.toggleTheme'),
            ]);
        };
        const handleClick = () => {
            setIsVisible(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsVisible(false);
            }
        };
        // 右键菜单
        document.addEventListener('contextmenu', handleContextMenu);
        // 点击其他地方关闭菜单
        document.addEventListener('click', handleClick);
        // ESC键关闭菜单
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    const handleAction = (action) => {
        setIsVisible(false);
        switch (action) {
            case t('contextmenu.refresh'):
            case '刷新页面':
                window.location.reload();
                break;
            case '返回':
                window.history.back();
                break;
            case '前进':
                window.history.forward();
                break;
            case '复制':
                document.execCommand('copy');
                break;
            case '粘贴':
                document.execCommand('paste');
                break;
            case '切换主题':
                // 主题切换会由 ThemeContext 处理
                break;
        }
    };
    return (_jsxs(_Fragment, { children: [children, isVisible && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-50", onClick: () => setIsVisible(false) }), _jsx("div", { className: "fixed z-50 min-w-40 rounded-lg shadow-xl border", style: {
                            left: `${position.x}px`,
                            top: `${position.y}px`,
                        }, children: _jsx("div", { className: `py-1 ${theme === 'dark'
                                ? 'bg-dark-bg-card border-dark-border-subtle'
                                : 'bg-white border-gray-200'}`, children: menuItems.map((item, index) => (_jsx("div", { className: `px-4 py-2 text-sm cursor-pointer transition-colors ${theme === 'dark'
                                    ? 'text-dark-text-primary hover:bg-dark-bg-hover'
                                    : 'text-gray-700 hover:bg-gray-100'} ${item === '-' ? 'opacity-50 cursor-default' : ''}`, onClick: () => handleAction(item), children: item === '-' ? (_jsx("div", { className: `h-px ${theme === 'dark' ? 'bg-dark-border-subtle' : 'bg-gray-200'}` })) : (item) }, index))) }) })] }))] }));
}
