import { useState } from "react";
/**
 * 本地存储 Hook
 * @param key 存储键名
 * @param initialValue 初始值
 * @returns [当前值，设置值函数，删除值函数]
 */
export function useLocalStorage(key, initialValue) {
    // 获取初始值
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        }
        catch (error) {
            console.error(`Failed to load from localStorage: ${key}`, error);
            return initialValue;
        }
    });
    // 设置值
    const setValue = (value) => {
        try {
            setStoredValue(value);
            window.localStorage.setItem(key, JSON.stringify(value));
        }
        catch (error) {
            console.error(`Failed to save to localStorage: ${key}`, error);
        }
    };
    // 删除值
    const removeValue = () => {
        try {
            setStoredValue(initialValue);
            window.localStorage.removeItem(key);
        }
        catch (error) {
            console.error(`Failed to remove from localStorage: ${key}`, error);
        }
    };
    return [storedValue, setValue, removeValue];
}
