import { useEffect, useState } from "react";
import { sessionApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { FileText, Clock, HardDrive, RefreshCw, Trash2, Inbox, Download, Edit3, Save, X, Search, CheckSquare, Square } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

interface Session {
  id: string;
  name: string;
  path: string;
  modified: number;
  size: number;
}

interface WorkspaceFile {
  name: string;
  path: string;
  content: string;
  size: number;
  modified: number;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [sessionContent, setSessionContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions" | "workspace">("sessions");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    session: Session | null;
    newName: string;
  }>({ isOpen: false, session: null, newName: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadData();
    // 切换标签时清除选中状态
    setSelectedSession(null);
    setSelectedFile(null);
    setSessionContent("");
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "sessions") {
        const result = await sessionApi.list();
        setSessions(result.sessions || []);
      } else {
        const result = await sessionApi.getWorkspaceFiles();
        setWorkspaceFiles(result.files || []);
      }
    } catch (error) {
      toast.showError("加载数据失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadSessionContent(session: Session) {
    try {
      const result = await sessionApi.getMemory(session.id);
      setSessionContent(result.content || "");
      setSelectedSession(session);
      setSelectedFile(null);
      setIsEditing(false);
      setEditingContent("");
    } catch (error) {
      toast.showError("加载会话内容失败");
    }
  }

  function loadFileContent(file: WorkspaceFile) {
    setSelectedFile(file);
    setSelectedSession(null);
    setSessionContent(file.content || "");
    setIsEditing(false);
    setEditingContent("");
  }

  async function exportFile(file: WorkspaceFile, e: React.MouseEvent) {
    e.stopPropagation();

    try {
      const content = file.content || "";

      // 创建并下载文件
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.showSuccess(`文件 "${file.name}" 已导出`);
    } catch (error) {
      toast.showError("导出文件失败");
    }
  }

  function confirmDeleteSession(session: Session) {
    setConfirmDialog({
      isOpen: true,
      title: "确认删除",
      message: `确定要删除会话 "${session.name}" 吗？此操作不可恢复。`,
      onConfirm: async () => {
        try {
          const result = await sessionApi.delete(session.id);
          if (result.success) {
            toast.showSuccess("会话已删除");
            // 如果删除的是当前选中的会话，清除选中状态
            if (selectedSession?.id === session.id) {
              setSelectedSession(null);
              setSessionContent("");
            }
            // 重新加载列表
            await loadData();
          } else {
            toast.showError(result.message || "删除失败");
          }
        } catch (error) {
          toast.showError("删除会话失败");
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  function openRenameDialog(session: Session, e: React.MouseEvent) {
    e.stopPropagation();
    setRenameDialog({
      isOpen: true,
      session,
      newName: session.name,
    });
  }

  async function confirmRename() {
    if (!renameDialog.session || !renameDialog.newName.trim()) {
      toast.showError("请输入有效的会话名称");
      return;
    }

    try {
      const result = await sessionApi.rename(
        renameDialog.session.id,
        renameDialog.newName.trim()
      );

      if (result.success) {
        toast.showSuccess(result.message || "会话已重命名");
        // 如果重命名的是当前选中的会话，清除选中状态
        if (selectedSession?.id === renameDialog.session?.id) {
          setSelectedSession(null);
          setSessionContent("");
        }
        // 重新加载列表
        await loadData();
      } else {
        toast.showError(result.message || "重命名失败");
      }
    } catch (error) {
      toast.showError("重命名会话失败");
    } finally {
      setRenameDialog({ isOpen: false, session: null, newName: "" });
    }
  }

  function startEditing() {
    setIsEditing(true);
    setEditingContent(sessionContent);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditingContent("");
  }

  async function saveContent() {
    if (!selectedSession && !selectedFile) {
      toast.showError("未选择任何文件");
      return;
    }

    setSaving(true);
    try {
      if (selectedSession) {
        await sessionApi.saveMemory(selectedSession.id, editingContent);
        toast.showSuccess("会话已保存");
      } else if (selectedFile) {
        await sessionApi.saveWorkspaceFile(selectedFile.name, editingContent);
        toast.showSuccess("文件已保存");
      }
      setSessionContent(editingContent);
      setIsEditing(false);
      await loadData();
    } catch (error) {
      toast.showError("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(session: Session, e: React.MouseEvent) {
    e.stopPropagation();
    confirmDeleteSession(session);
  }

  async function exportSession(session: Session, e: React.MouseEvent) {
    e.stopPropagation();

    try {
      const result = await sessionApi.getMemory(session.id);
      const content = result.content || "";

      // 创建并下载文件
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session.name}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.showSuccess(`会话 "${session.name}" 已导出`);
    } catch (error) {
      toast.showError("导出会话失败");
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString("zh-CN");
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // 批量选择相关函数
  function toggleBulkMode() {
    setBulkMode(!bulkMode);
    setSelectedIds(new Set());
    setSelectedSession(null);
    setSelectedFile(null);
    setSessionContent("");
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    const currentList = activeTab === "sessions" ? filteredSessions : filteredWorkspaceFiles;
    const allIds = new Set(currentList.map((item) => activeTab === "sessions" ? (item as Session).id : (item as WorkspaceFile).name));

    if (selectedIds.size === allIds.size && [...selectedIds].every((id) => allIds.has(id))) {
      // 如果全部已选，则取消全选
      setSelectedIds(new Set());
    } else {
      // 否则全选
      setSelectedIds(allIds);
    }
  }

  function isSelected(id: string): boolean {
    return selectedIds.has(id);
  }

  function isAllSelected(): boolean {
    const currentList = activeTab === "sessions" ? filteredSessions : filteredWorkspaceFiles;
    if (currentList.length === 0) return false;
    const allIds = new Set(currentList.map((item) => activeTab === "sessions" ? (item as Session).id : (item as WorkspaceFile).name));
    return selectedIds.size === allIds.size && [...selectedIds].every((id) => allIds.has(id));
  }

  function isSomeSelected(): boolean {
    return selectedIds.size > 0 && !isAllSelected();
  }

  async function batchDelete() {
    if (selectedIds.size === 0) {
      toast.showError("请先选择要删除的项目");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "批量删除确认",
      message: `确定要删除选中的 ${selectedIds.size} 个${activeTab === "sessions" ? "会话" : "文件"}吗？此操作不可恢复。`,
      onConfirm: async () => {
        try {
          let successCount = 0;
          for (const id of selectedIds) {
            try {
              if (activeTab === "sessions") {
                await sessionApi.delete(id);
                successCount++;
              } else {
                // 工作区文件删除功能需要在后端添加
                toast.showError("暂不支持批量删除工作区文件");
                return;
              }
            } catch (error) {
              console.error(`删除 ${id} 失败:`, error);
            }
          }

          if (successCount > 0) {
            toast.showSuccess(`成功删除 ${successCount} 个会话`);
            // 清除选中状态
            setSelectedIds(new Set());
            // 重新加载列表
            await loadData();
          }
        } catch (error) {
          toast.showError("批量删除失败");
        } finally {
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  }

  // 过滤后的会话列表
  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 过滤后的工作区文件列表
  const filteredWorkspaceFiles = workspaceFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 当前显示的列表
  const currentList = activeTab === "sessions" ? filteredSessions : filteredWorkspaceFiles;
  const totalCount = activeTab === "sessions" ? sessions.length : workspaceFiles.length;
  const filteredCount = currentList.length;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">会话管理</h1>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        {/* 标签页切换和搜索 */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === "sessions"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              会话记忆
            </button>
            <button
              onClick={() => setActiveTab("workspace")}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === "workspace"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              工作区文件
            </button>
          </div>

          {/* 批量操作模式切换 */}
          <button
            onClick={toggleBulkMode}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              bulkMode
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {bulkMode ? "退出批量操作" : "批量操作"}
          </button>

          {/* 搜索输入框 */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`搜索${activeTab === "sessions" ? "会话" : "文件"}名称...`}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 结果计数和批量操作 */}
          <div className="flex items-center gap-4">
            {bulkMode && selectedIds.size > 0 && (
              <>
                <button
                  onClick={batchDelete}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  删除 ({selectedIds.size})
                </button>
              </>
            )}
            {searchQuery && !bulkMode && (
              <div className="text-sm text-gray-500">
                找到 <span className="font-medium text-gray-700">{filteredCount}</span> / {totalCount} 个
                {activeTab === "sessions" ? "会话" : "文件"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 列表 */}
        <div className="w-96 border-r border-gray-200 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              加载中...
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* 批量操作模式下的全选按钮 */}
              {bulkMode && (filteredSessions.length > 0 || filteredWorkspaceFiles.length > 0) && (
                <div className="flex items-center gap-2 px-2 py-2 bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title={isAllSelected() ? "取消全选" : "全选"}
                  >
                    {isAllSelected() ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className={`w-5 h-5 ${isSomeSelected() ? "text-blue-400" : ""}`} />
                    )}
                  </button>
                  <span className="text-sm text-gray-700">
                    {isAllSelected() ? "已全选" : isSomeSelected() ? `已选 ${selectedIds.size} 个` : "全选"}
                  </span>
                </div>
              )}

              {activeTab === "sessions" ? (
                filteredSessions.length === 0 ? (
                  searchQuery ? (
                    <EmptyState
                      icon={Search}
                      title="未找到匹配的会话"
                      description={`没有找到包含 "${searchQuery}" 的会话`}
                    />
                  ) : (
                    <EmptyState
                      icon={Inbox}
                      title="暂无会话"
                      description="当 nanobot 创建会话后，会在这里显示"
                    />
                  )
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => !bulkMode && loadSessionContent(session)}
                      className={`group p-4 rounded-lg transition-colors border ${
                        bulkMode
                          ? "bg-white border-gray-200 hover:border-purple-200"
                          : selectedSession?.id === session.id
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-200 hover:border-blue-200"
                      } ${!bulkMode ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* 复选框 */}
                        {bulkMode && (
                          <button
                            onClick={() => toggleSelect(session.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                          >
                            {isSelected(session.id) ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900 text-sm truncate">{session.name}</span>
                            </div>
                        <div className={`flex items-center gap-1 ${bulkMode ? "opacity-50 pointer-events-none" : "opacity-0 group-hover:opacity-100"} transition-all`}>
                          <button
                            onClick={(e) => openRenameDialog(session, e)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="重命名会话"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => exportSession(session, e)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="导出会话"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => deleteSession(session, e)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="删除会话"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(session.modified)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatSize(session.size)}
                        </span>
                      </div>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : filteredWorkspaceFiles.length === 0 ? (
                searchQuery ? (
                  <EmptyState
                    icon={Search}
                    title="未找到匹配的文件"
                    description={`没有找到包含 "${searchQuery}" 的文件`}
                  />
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title="暂无工作区文件"
                    description="工作区文件将在这里显示"
                  />
                )
              ) : (
                filteredWorkspaceFiles.map((file) => (
                  <div
                    key={file.name}
                    onClick={() => !bulkMode && loadFileContent(file)}
                    className={`group p-4 rounded-lg transition-colors border ${
                      bulkMode
                        ? "bg-white border-gray-200 hover:border-purple-200"
                        : selectedFile?.name === file.name
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:border-blue-200"
                    } ${!bulkMode ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* 复选框 */}
                      {bulkMode && (
                        <button
                          onClick={() => toggleSelect(file.name)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                        >
                          {isSelected(file.name) ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900 text-sm truncate">{file.name}</span>
                          </div>
                      <div className={`flex items-center gap-1 ${bulkMode ? "opacity-50 pointer-events-none" : "opacity-0 group-hover:opacity-100"} transition-all`}>
                        <button
                          onClick={(e) => exportFile(file, e)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="导出文件"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(file.modified)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatSize(file.size)}
                      </span>
                    </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 详情 */}
        <div className="flex-1 overflow-y-auto bg-white p-6">
          {selectedSession ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedSession.name}</h2>
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveContent}
                      disabled={saving}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="flex-1 p-4 rounded-lg bg-gray-50 border border-gray-200 overflow-x-auto text-sm text-gray-700 whitespace-pre-wrap font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入内容..."
                />
              ) : (
                <pre className="flex-1 p-4 rounded-lg bg-gray-50 border border-gray-200 overflow-x-auto text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {sessionContent || "暂无内容"}
                </pre>
              )}
            </div>
          ) : selectedFile ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedFile.name}</h2>
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveContent}
                      disabled={saving}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="flex-1 p-4 rounded-lg bg-gray-50 border border-gray-200 overflow-x-auto text-sm text-gray-700 whitespace-pre-wrap font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入内容..."
                />
              ) : (
                <pre className="flex-1 p-4 rounded-lg bg-gray-50 border border-gray-200 overflow-x-auto text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {sessionContent || "暂无内容"}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {activeTab === "sessions" ? "选择一个会话查看详情" : "选择一个文件查看详情"}
            </div>
          )}
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
      />

      {/* 重命名对话框 */}
      {renameDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">重命名会话</h3>
            <input
              type="text"
              value={renameDialog.newName}
              onChange={(e) => setRenameDialog({ ...renameDialog, newName: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmRename();
                } else if (e.key === "Escape") {
                  setRenameDialog({ isOpen: false, session: null, newName: "" });
                }
              }}
              placeholder="输入新的会话名称"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setRenameDialog({ isOpen: false, session: null, newName: "" })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmRename}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
