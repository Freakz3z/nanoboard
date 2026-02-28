import { useTranslation } from "react-i18next";
import { Folder, File, Clock, Trash2, Edit2, Search, HardDrive } from "lucide-react";
import EmptyState from "../EmptyState";

interface FsItem {
  name: string;
  path: string;
  relative_path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
}

interface FileListProps {
  items: FsItem[];
  selectedItem: FsItem | null;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onDirectoryLoad: (path: string) => void;
  onFileLoad: (item: FsItem) => void;
  onRename: (item: FsItem) => void;
  onDelete: (item: FsItem) => void;
  formatSize: (bytes: number) => string;
  formatTimestamp: (timestamp: number, t: any, i18n: any) => string;
}

export default function FileList({
  items,
  selectedItem,
  searchQuery,
  isLoading,
  onSearchChange,
  onDirectoryLoad,
  onFileLoad,
  onRename,
  onDelete,
  formatSize,
  formatTimestamp,
}: FileListProps) {
  const { t, i18n } = useTranslation();

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={searchQuery ? Search : HardDrive}
          title={searchQuery ? t("workspace.noMatchingFiles") : t("workspace.noFiles")}
          description={searchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noFilesDesc")}
        />
      ) : (
        filteredItems.map((item) => (
          <div
            key={item.relative_path}
            onClick={() => {
              if (item.type === "directory") {
                onDirectoryLoad(item.relative_path);
              } else {
                onFileLoad(item);
              }
            }}
            className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedItem?.relative_path === item.relative_path
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"
            }`}
          >
            <div className="flex-shrink-0">
              {item.type === "directory" ? (
                <Folder className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              ) : (
                <File className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm">
                {item.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                {item.type === "file" && <span>{formatSize(item.size)}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(item.modified, t, i18n)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onRename(item); }}
                className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                title={t("workspace.rename")}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                title={t("workspace.delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
