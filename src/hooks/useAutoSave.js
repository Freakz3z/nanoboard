import { useCallback, useRef, useEffect } from "react";
/**
 * 自动保存 Hook（带防抖）
 * @param options 配置选项
 * @returns 触发保存的函数
 */
export function useAutoSave({ onSave, delay = 500, onError }) {
    const timeoutRef = useRef(null);
    // 清理函数
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    // 防抖保存函数
    const debouncedSave = useCallback((value) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(async () => {
            try {
                await onSave(value);
            }
            catch (error) {
                if (onError) {
                    onError(error);
                }
                else {
                    console.error("[AutoSave] Failed to save:", error);
                }
            }
        }, delay);
    }, [onSave, delay, onError]);
    return debouncedSave;
}
