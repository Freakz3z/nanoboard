import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fsApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import {
  FileText,
  Folder,
  Clock,
  Trash2,
  Search,
  ChevronRight,
  Home,
  Edit2,
  X,
  File,
  HardDrive,
} from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

interface FsItem {
  name: string;
  path: string;
  relative_path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
}

interface Breadcrumb {
  name: string;
  path: string;
}

export default function Sessions() {
  const { t, i18n } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FsItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "info";
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", type: "warning", onConfirm: () => {} });

  // 创建文件夹对话框
  const [createFolderDialog, setCreateFolderDialog] = useState<{
    isOpen: boolean;
    folderName: string;
  }>({ isOpen: false, folderName: "" });

  // 重命名对话框
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    item: FsItem | null;
    newName: string;
  }>({ isOpen: false, item: null, newName: "" });

  const toast = useToast();

  // Nanobot 自带的受保护文件/文件夹列表
  const protectedItems = [
    "memory",
    "skills",
    "AGENTS.md",
    "SOUL.md",
    "USER.md",
  ];

  // 检查是否为受保护项
  function isProtectedItem(itemName: string): boolean {
    return protectedItems.includes(itemName);
  }

  useEffect(() => {
    loadDirectory("");
  }, []);

  async function loadDirectory(path: string) {
    try {
      const result = await fsApi.getDirectoryTree(path || undefined);
      if (result.success) {
        setItems(result.items || []);
        setCurrentPath(result.path || "");
        setSelectedItem(null);
        setFileContent("");
      } else {
        toast.showError(result.message || t("sessions.loadDirectoryFailed"));
      }
    } catch (error) {
      toast.showError(t("sessions.loadDirectoryFailed"));
    }
  }

  async function loadFileContent(item: FsItem) {
    if (item.type !== "file") return;

    try {
      const result = await fsApi.getFileContent(item.relative_path);
      if (result.success) {
        setFileContent(result.content || "");
        setSelectedItem(item);
      } else {
        toast.showError(result.message || t("sessions.loadFileContentFailed"));
      }
    } catch (error) {
      toast.showError(t("sessions.loadFileContentFailed"));
    }
  }

  async function createFolder() {
    if (!createFolderDialog.folderName.trim()) {
      toast.showError(t("sessions.enterFolderName"));
      return;
    }

    try {
      const result = await fsApi.createFolder(
        currentPath,
        createFolderDialog.folderName.trim()
      );
      if (result.success) {
        toast.showSuccess(result.message || t("sessions.createFolderSuccess"));
        setCreateFolderDialog({ isOpen: false, folderName: "" });
        await loadDirectory(currentPath);
      } else {
        toast.showError(result.message || t("sessions.createFolderFailed"));
      }
    } catch (error) {
      toast.showError(t("sessions.createFolderFailed"));
    }
  }

  async function deleteItem(item: FsItem) {
    const isFile = item.type === "file";
    setConfirmDialog({
      isOpen: true,
      title: isFile ? t("sessions.deleteFile") : t("sessions.deleteFolder"),
      message: isFile
        ? t("sessions.deleteFileConfirm", { name: item.name })
        : t("sessions.deleteFolderConfirm", { name: item.name }),
      type: "warning",
      onConfirm: async () => {
        try {
          const result = isFile
            ? await fsApi.deleteFile(item.relative_path)
            : await fsApi.deleteFolder(item.relative_path);

          if (result.success) {
            toast.showSuccess(result.message || t("sessions.deleted"));
            if (selectedItem?.relative_path === item.relative_path) {
              setSelectedItem(null);
              setFileContent("");
            }
            await loadDirectory(currentPath);
          } else {
            toast.showError(result.message || t("sessions.deleteFailed"));
          }
        } catch (error) {
          toast.showError(isFile ? t("sessions.deleteFileFailed") : t("sessions.deleteFolderFailed"));
        } finally {
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: () => {},
          });
        }
      },
    });
  }

  async function renameItem(item: FsItem) {
    setRenameDialog({
      isOpen: true,
      item: item,
      newName: item.name,
    });
  }

  async function confirmRename() {
    if (!renameDialog.item || !renameDialog.newName.trim()) {
      toast.showError(t("sessions.enterNewName"));
      return;
    }

    try {
      const result = await fsApi.renameItem(
        renameDialog.item.relative_path,
        renameDialog.newName.trim()
      );
      if (result.success) {
        toast.showSuccess(result.message || t("sessions.renameSuccess"));
        setRenameDialog({ isOpen: false, item: null, newName: "" });
        await loadDirectory(currentPath);
      } else {
        toast.showError(result.message || t("sessions.renameFailed"));
      }
    } catch (error) {
      toast.showError(t("sessions.renameFailed"));
    }
  }

  function formatTimestamp(timestamp: number): string {
    if (!timestamp) return t("sessions.unknown");
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? t("sessions.justNow") : t("sessions.minutesAgo", { count: minutes });
      }
      return t("sessions.hoursAgo", { count: hours });
    } else if (days === 1) {
      return t("sessions.yesterday");
    } else if (days < 7) {
      return t("sessions.daysAgo", { count: days });
    } else {
      return date.toLocaleDateString(i18n.language === "en" ? "en-US" : "zh-CN");
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function getBreadcrumbs(): Breadcrumb[] {
    if (!currentPath || currentPath === "/") return [];

    const parts = currentPath.split("/").filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];

    let pathSoFar = "";
    for (let i = 0; i < parts.length; i++) {
      pathSoFar += (pathSoFar ? "/" : "") + parts[i];
      breadcrumbs.push({
        name: parts[i],
        path: pathSoFar,
      });
    }

    return breadcrumbs;
  }

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query);
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0">
        {/* 标题栏 */}
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{t("sessions.title")}</h1>
        </div>

        {/* 面包屑导航和搜索栏 */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4">
            {/* 面包屑导航 */}
            <div className="flex items-center gap-1 text-sm flex-1">
              <button
                onClick={() => loadDirectory("")}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  !currentPath || currentPath === "/"
                    ? "text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Home className="w-4 h-4" />
                {t("sessions.workspace")}
              </button>
              {getBreadcrumbs().map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => loadDirectory(crumb.path)}
                    className={`px-2 py-1 rounded transition-colors ${
                      index === getBreadcrumbs().length - 1
                        ? "text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* 搜索框 */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("sessions.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* 文件列表和详情区域 */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* 左侧文件列表 */}
          <div className="w-96 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
            {/* 文件列表 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={searchQuery ? Search : HardDrive}
                title={
                  searchQuery ? t("sessions.noMatchingFiles") : t("sessions.noFiles")
                }
                description={
                  searchQuery
                    ? t("sessions.tryOtherKeywords")
                    : t("sessions.noFilesDesc")
                }
              />
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.relative_path}
                  onClick={() => {
                    if (item.type === "directory") {
                      loadDirectory(item.relative_path);
                    } else {
                      loadFileContent(item);
                    }
                  }}
                  className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedItem?.relative_path === item.relative_path
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {item.type === "directory" ? (
                      <Folder className="w-5 h-5 text-blue-500" />
                    ) : (
                      <File className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate text-sm">
                        {item.name}
                      </h3>
                      {isProtectedItem(item.name) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 flex-shrink-0">
                          {t("sessions.protected")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {item.type === "file" && (
                        <span>{formatSize(item.size)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(item.modified)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isProtectedItem(item.name) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          renameItem(item);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title={t("sessions.rename")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {!isProtectedItem(item.name) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title={t("sessions.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {selectedItem ? (
            <>
              {/* 详情头部 */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {selectedItem.name}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatSize(selectedItem.size)} ·{" "}
                      {formatTimestamp(selectedItem.modified)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setFileContent("");
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {fileContent}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={FileText}
                title={t("sessions.selectFile")}
                description={t("sessions.selectFileDesc")}
              />
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 创建文件夹对话框 */}
      {createFolderDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("sessions.createFolder")}</h3>
            <input
              type="text"
              placeholder={t("sessions.folderName")}
              value={createFolderDialog.folderName}
              onChange={(e) =>
                setCreateFolderDialog({
                  ...createFolderDialog,
                  folderName: e.target.value,
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createFolder();
                } else if (e.key === "Escape") {
                  setCreateFolderDialog({ isOpen: false, folderName: "" });
                }
              }}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() =>
                  setCreateFolderDialog({ isOpen: false, folderName: "" })
                }
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t("config.cancel")}
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                {t("sessions.createFolder")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重命名对话框 */}
      {renameDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {renameDialog.item?.type === "directory" ? t("sessions.renameFolder") : t("sessions.renameFile")}
            </h3>
            <input
              type="text"
              placeholder={t("sessions.newName")}
              value={renameDialog.newName}
              onChange={(e) =>
                setRenameDialog({
                  ...renameDialog,
                  newName: e.target.value,
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmRename();
                } else if (e.key === "Escape") {
                  setRenameDialog({ isOpen: false, item: null, newName: "" });
                }
              }}
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() =>
                  setRenameDialog({ isOpen: false, item: null, newName: "" })
                }
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t("config.cancel")}
              </button>
              <button
                onClick={confirmRename}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                {t("config.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: () => {},
          })
        }
      />
    </div>
  );
}
