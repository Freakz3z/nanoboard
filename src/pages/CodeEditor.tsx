import { useEffect, useState } from "react";
import { configApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { Save, RotateCcw, Code as CodeIcon } from "lucide-react";
import { DEFAULT_CONFIG } from "../lib/defaultConfig";
import ConfirmDialog from "../components/ConfirmDialog";

export default function CodeEditor() {
  const [originalConfig, setOriginalConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const result = await configApi.load();
      if (result.error) {
        toast.showError(result.message);
        setOriginalConfig({});
      } else {
        setOriginalConfig(result);
        const formatted = JSON.stringify(result, null, 2);
        setCode(formatted);
        setCodeError(null);
      }
    } catch (error) {
      toast.showError("加载配置失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const parsed = JSON.parse(code);
      setCodeError(null);

      const validation = await configApi.validate(parsed);
      if (!validation.valid && validation.errors.length > 0) {
        toast.showError(`配置验证失败: ${validation.errors.join(", ")}`);
        return;
      }

      await configApi.save(parsed);
      setOriginalConfig(parsed);
      toast.showSuccess("配置已保存");
    } catch (error) {
      if (typeof error === "object" && error !== null && "message" in error) {
        const jsonError = error as { message: string };
        if (jsonError.message.includes("JSON")) {
          setCodeError(`JSON 语法错误: ${jsonError.message}`);
          toast.showError("JSON 语法错误");
          return;
        }
      }
      toast.showError("保存配置失败");
    } finally {
      setSaving(false);
    }
  }

  function formatCode() {
    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      setCode(formatted);
      setCodeError(null);
      toast.showSuccess("代码已格式化");
    } catch (error) {
      setCodeError("无法格式化：JSON 语法错误");
      toast.showError("无法格式化：JSON 语法错误");
    }
  }

  async function restoreDefaults() {
    // 显示确认模态框
    setConfirmDialog({
      isOpen: true,
      title: "恢复默认配置",
      message: "确定要恢复到默认配置吗？这将清空所有当前配置。",
      onConfirm: async () => {
        try {
          // 直接保存默认配置到文件
          await configApi.save(DEFAULT_CONFIG);
          setOriginalConfig(DEFAULT_CONFIG);
          const formatted = JSON.stringify(DEFAULT_CONFIG, null, 2);
          setCode(formatted);
          setCodeError(null);
          toast.showSuccess("已恢复默认配置");
        } catch (error) {
          toast.showError("恢复默认配置失败");
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  const hasChanges = code !== JSON.stringify(originalConfig, null, 2);

  return (
    <div className="flex flex-col h-screen">
      {/* 页面头部 - 固定在顶部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">手动配置</h1>

              {/* 状态指示器 - 只在未保存时显示 */}
              {hasChanges && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-sm font-medium">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>未保存</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={restoreDefaults}
                className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium text-amber-700 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                恢复默认
              </button>
              <button
                onClick={formatCode}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors text-sm"
              >
                <CodeIcon className="w-4 h-4" />
                格式化
              </button>
              <button
                onClick={saveConfig}
                disabled={loading || saving || !hasChanges || !!codeError}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors text-sm"
                title={hasChanges ? "保存更改到配置文件" : "没有需要保存的更改"}
              >
                <Save className="w-4 h-4" />
                {saving ? "保存中..." : "保存配置"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 代码编辑区域 - 占据剩余空间 */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            加载中...
          </div>
        ) : (
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              try {
                JSON.parse(e.target.value);
                setCodeError(null);
              } catch (error) {
                if (typeof error === "object" && error !== null && "message" in error) {
                  setCodeError(`JSON 语法错误: ${(error as { message: string }).message}`);
                } else {
                  setCodeError("JSON 语法错误");
                }
              }
            }}
            className={`w-full h-full font-mono text-sm p-6 focus:outline-none resize-none ${
              codeError
                ? "bg-red-50 border-red-300 text-red-900"
                : "bg-gray-900 text-gray-100"
            }`}
            placeholder="在此编辑 JSON 配置..."
            spellCheck={false}
          />
        )}
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="warning"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
      />
    </div>
  );
}
