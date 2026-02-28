import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fsApi, sessionApi, skillApi, chatSessionApi, cronApi } from "../lib/tauri";
import { useToast } from "../contexts/ToastContext";
import { FileText, Clock, Search, ChevronRight, Home, X, Wrench, Save, Edit3, Brain, MessageSquare, User, Bot, Settings, Plus, Timer, CalendarClock, Pencil, AlertTriangle, } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { WorkspaceTabs, FileList, SkillList, MemoryList, SessionList, CronList, useCron, formatTimestamp, formatSize, describeSchedule, describeCron, describeIntervalMs, formatCronTimestamp, formatCronRelativeTime, } from "../components/workspace";
export default function Workspace() {
    const { t, i18n } = useTranslation();
    const toast = useToast();
    const { resetCronForm, getCronExpression, openEditCronDialog } = useCron();
    // Tab 状态
    const [activeTab, setActiveTab] = useState("files");
    // 文件管理状态
    const [currentPath, setCurrentPath] = useState("");
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [fileContent, setFileContent] = useState("");
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    // 技能管理状态
    const [skills, setSkills] = useState([]);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [skillContent, setSkillContent] = useState("");
    const [editingContent, setEditingContent] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isNewSkill, setIsNewSkill] = useState(false);
    const [newSkillName, setNewSkillName] = useState("");
    const [skillSearchQuery, setSkillSearchQuery] = useState("");
    const [skillFrontmatter, setSkillFrontmatter] = useState({ body: "" });
    // 记忆管理状态
    const [memories, setMemories] = useState([]);
    const [selectedMemory, setSelectedMemory] = useState(null);
    const [memoryContent, setMemoryContent] = useState("");
    const [memoryEditingContent, setMemoryEditingContent] = useState("");
    const [isMemoryEditing, setIsMemoryEditing] = useState(false);
    const [memorySearchQuery, setMemorySearchQuery] = useState("");
    // 会话管理状态
    const [chatSessions, setChatSessions] = useState([]);
    const [selectedChatSession, setSelectedChatSession] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [isLoadingChatContent, setIsLoadingChatContent] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState("");
    const chatMessagesContainerRef = useRef(null);
    // 定时任务状态
    const [cronJobs, setCronJobs] = useState([]);
    const [showCronDialog, setShowCronDialog] = useState(false);
    const [isCronSubmitting, setIsCronSubmitting] = useState(false);
    const [editingCronJob, setEditingCronJob] = useState(null);
    const [cronForm, setCronForm] = useState({
        name: "", message: "", scheduleType: "cron",
        cronMinute: "0", cronHour: "9", cronDom: "*", cronMonth: "*", cronDow: "*",
        everySeconds: "3600", atTime: "", tz: "",
    });
    // 通用状态
    const [isLoading, setIsLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, title: "", message: "", type: "warning",
        onConfirm: () => { },
    });
    // 初始化加载
    useEffect(() => { loadTabData(activeTab); }, [activeTab]);
    async function loadTabData(tab) {
        setIsLoading(true);
        try {
            switch (tab) {
                case "files":
                    await loadDirectory("");
                    break;
                case "skills":
                    await loadSkills();
                    break;
                case "memory":
                    await loadMemories();
                    break;
                case "sessions":
                    await loadChatSessions();
                    break;
                case "cron":
                    await loadCronJobs();
                    break;
            }
        }
        finally {
            setIsLoading(false);
        }
    }
    // 文件管理函数
    async function loadDirectory(path) {
        try {
            const result = await fsApi.getDirectoryTree(path || undefined);
            if (result.success) {
                const filteredItems = (result.items || []).filter((item) => item.name !== "sessions");
                setItems(filteredItems);
                setCurrentPath(result.path || "");
                setSelectedItem(null);
                setFileContent("");
            }
            else {
                toast.showError(result.message || t("workspace.loadDirectoryFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.loadDirectoryFailed"));
        }
    }
    async function loadFileContentAction(item) {
        if (item.type !== "file")
            return;
        try {
            const result = await fsApi.getFileContent(item.relative_path);
            if (result.success) {
                setFileContent(result.content || "");
                setSelectedItem(item);
            }
            else {
                toast.showError(result.message || t("workspace.loadFileContentFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.loadFileContentFailed"));
        }
    }
    async function deleteFsItem(item) {
        const isFile = item.type === "file";
        setConfirmDialog({
            isOpen: true,
            title: isFile ? t("workspace.deleteFile") : t("workspace.deleteFolder"),
            message: isFile ? t("workspace.deleteFileConfirm", { name: item.name }) : t("workspace.deleteFolderConfirm", { name: item.name }),
            type: "warning",
            onConfirm: async () => {
                try {
                    const result = isFile ? await fsApi.deleteFile(item.relative_path) : await fsApi.deleteFolder(item.relative_path);
                    if (result.success) {
                        toast.showSuccess(result.message || t("workspace.deleted"));
                        if (selectedItem?.relative_path === item.relative_path) {
                            setSelectedItem(null);
                            setFileContent("");
                        }
                        await loadDirectory(currentPath);
                    }
                    else {
                        toast.showError(result.message || t("workspace.deleteFailed"));
                    }
                }
                catch {
                    toast.showError(isFile ? t("workspace.deleteFileFailed") : t("workspace.deleteFolderFailed"));
                }
                finally {
                    closeConfirmDialog();
                }
            },
        });
    }
    async function renameFsItem(item) {
        const newName = prompt(t("workspace.newName"), item.name);
        if (!newName || newName === item.name)
            return;
        try {
            const result = await fsApi.renameItem(item.relative_path, newName);
            if (result.success) {
                toast.showSuccess(result.message || t("workspace.renameSuccess"));
                await loadDirectory(currentPath);
            }
            else {
                toast.showError(result.message || t("workspace.renameFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.renameFailed"));
        }
    }
    function getFileBreadcrumbs() {
        if (!currentPath || currentPath === "/")
            return [];
        const parts = currentPath.split("/").filter(Boolean);
        const breadcrumbs = [];
        let pathSoFar = "";
        for (let i = 0; i < parts.length; i++) {
            pathSoFar += (pathSoFar ? "/" : "") + parts[i];
            breadcrumbs.push({ name: parts[i], path: pathSoFar });
        }
        return breadcrumbs;
    }
    // 技能管理函数
    async function loadSkills() {
        try {
            const result = await skillApi.list();
            if (result.skills) {
                setSkills(result.skills);
                return result.skills;
            }
        }
        catch {
            toast.showError(t("workspace.skillsLoadFailed"));
        }
        return [];
    }
    async function selectSkillAction(skill) {
        if (isEditing && !await confirmDiscardSkillChanges())
            return;
        setSelectedSkill(skill);
        setIsEditing(false);
        setIsNewSkill(false);
        try {
            const result = await skillApi.getContent(skill.id);
            if (result.success && result.content) {
                setSkillContent(result.content);
                setEditingContent(result.content);
                setSkillFrontmatter(parseFrontmatter(result.content));
            }
            else {
                toast.showError(result.message || t("workspace.skillsLoadContentFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.skillsLoadContentFailed"));
        }
    }
    async function toggleSkillAction(skill) {
        try {
            const result = await skillApi.toggle(skill.id, !skill.enabled);
            if (result.success) {
                toast.showSuccess(result.enabled ? t("workspace.skillEnabled") : t("workspace.skillDisabled"));
                const updatedSkills = await loadSkills();
                if (selectedSkill?.id === skill.id && result.new_id) {
                    const updatedSkill = updatedSkills.find(s => s.id === result.new_id);
                    if (updatedSkill) {
                        setSelectedSkill(updatedSkill);
                        const contentResult = await skillApi.getContent(updatedSkill.id);
                        if (contentResult.success && contentResult.content) {
                            setSkillContent(contentResult.content);
                            setEditingContent(contentResult.content);
                            setSkillFrontmatter(parseFrontmatter(contentResult.content));
                        }
                    }
                }
            }
            else {
                toast.showError(result.message || t("workspace.skillToggleFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.skillToggleFailed"));
        }
    }
    async function deleteSkillAction(skill) {
        setConfirmDialog({
            isOpen: true, title: t("workspace.deleteSkill"), message: t("workspace.deleteSkillConfirm", { name: skill.name }), type: "warning",
            onConfirm: async () => {
                try {
                    const result = await skillApi.delete(skill.id);
                    if (result.success) {
                        toast.showSuccess(t("workspace.skillDeleted"));
                        if (selectedSkill?.id === skill.id) {
                            setSelectedSkill(null);
                            setSkillContent("");
                            setEditingContent("");
                            setIsEditing(false);
                        }
                        await loadSkills();
                    }
                    else {
                        toast.showError(result.message || t("workspace.skillDeleteFailed"));
                    }
                }
                catch {
                    toast.showError(t("workspace.skillDeleteFailed"));
                }
                finally {
                    closeConfirmDialog();
                }
            },
        });
    }
    function startEditSkillAction() { setIsEditing(true); setEditingContent(skillContent); }
    function cancelEditSkillAction() { setIsEditing(false); setIsNewSkill(false); setEditingContent(skillContent); setNewSkillName(""); }
    async function saveSkillAction() {
        const skillName = isNewSkill ? newSkillName.trim() : selectedSkill?.name;
        if (!skillName) {
            toast.showError(t("workspace.enterSkillName"));
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(skillName)) {
            toast.showError(t("workspace.invalidSkillName"));
            return;
        }
        try {
            const result = await skillApi.save(skillName, editingContent);
            if (result.success) {
                toast.showSuccess(t("workspace.skillSaved"));
                setIsEditing(false);
                setIsNewSkill(false);
                await loadSkills();
                const savedId = result.message?.match(/(.+)\.md/)?.[1] || skillName;
                const savedSkill = skills.find(s => s.name === savedId || s.id === `${savedId}.md`);
                if (savedSkill) {
                    setSelectedSkill(savedSkill);
                    setSkillContent(editingContent);
                }
            }
            else {
                toast.showError(result.message || t("workspace.skillSaveFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.skillSaveFailed"));
        }
    }
    async function confirmDiscardSkillChanges() {
        if (editingContent === skillContent)
            return true;
        return window.confirm(t("workspace.discardChangesConfirm") || "您有未保存的更改，确定要丢弃吗？");
    }
    // 记忆管理函数
    async function loadMemories() {
        try {
            const result = await sessionApi.list();
            if (result.sessions)
                setMemories(result.sessions);
        }
        catch {
            toast.showError(t("workspace.memoryLoadFailed"));
        }
    }
    async function selectMemoryAction(memory) {
        if (isMemoryEditing && memoryEditingContent !== memoryContent) {
            setConfirmDialog({
                isOpen: true, title: t("workspace.unsavedChanges"), message: t("workspace.unsavedChanges"), type: "warning",
                onConfirm: async () => { closeConfirmDialog(); await loadSelectedMemory(memory); },
            });
            return;
        }
        await loadSelectedMemory(memory);
    }
    async function loadSelectedMemory(memory) {
        setSelectedMemory(memory);
        setIsMemoryEditing(false);
        try {
            const result = await sessionApi.getMemory(memory.id);
            if (result.content !== undefined) {
                setMemoryContent(result.content);
                setMemoryEditingContent(result.content);
            }
            else {
                setMemoryContent("");
                setMemoryEditingContent("");
            }
        }
        catch {
            toast.showError(t("workspace.memoryLoadContentFailed"));
        }
    }
    function startEditMemoryAction() { setIsMemoryEditing(true); setMemoryEditingContent(memoryContent); }
    function cancelEditMemoryAction() { setIsMemoryEditing(false); setMemoryEditingContent(memoryContent); }
    async function saveMemoryAction() {
        if (!selectedMemory)
            return;
        try {
            const result = await sessionApi.saveMemory(selectedMemory.id, memoryEditingContent);
            if (result.success) {
                toast.showSuccess(t("workspace.memorySaved"));
                setMemoryContent(memoryEditingContent);
                setIsMemoryEditing(false);
                await loadMemories();
            }
            else {
                toast.showError(result.message || t("workspace.memorySaveFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.memorySaveFailed"));
        }
    }
    async function deleteMemoryAction(memory) {
        setConfirmDialog({
            isOpen: true, title: t("workspace.deleteMemory"), message: t("workspace.deleteMemoryConfirm", { name: memory.name }), type: "warning",
            onConfirm: async () => {
                try {
                    const result = await sessionApi.delete(memory.id);
                    if (result.success) {
                        toast.showSuccess(t("workspace.memoryDeleted"));
                        if (selectedMemory?.id === memory.id) {
                            setSelectedMemory(null);
                            setMemoryContent("");
                            setMemoryEditingContent("");
                            setIsMemoryEditing(false);
                        }
                        await loadMemories();
                    }
                    else {
                        toast.showError(result.message || t("workspace.memoryDeleteFailed"));
                    }
                }
                catch {
                    toast.showError(t("workspace.memoryDeleteFailed"));
                }
                finally {
                    closeConfirmDialog();
                }
            },
        });
    }
    // 会话管理函数
    async function loadChatSessions() {
        try {
            const result = await chatSessionApi.list();
            if (result.sessions)
                setChatSessions(result.sessions);
        }
        catch {
            toast.showError(t("workspace.chatSessionsLoadFailed"));
        }
    }
    async function selectChatSessionAction(session) {
        setSelectedChatSession(session);
        setChatMessages([]);
        setIsLoadingChatContent(true);
        try {
            const result = await chatSessionApi.getContent(session.id);
            if (result.success)
                setChatMessages(result.messages || []);
            else
                toast.showError(result.message || t("workspace.chatSessionsLoadContentFailed"));
        }
        catch {
            toast.showError(t("workspace.chatSessionsLoadContentFailed"));
        }
        finally {
            setIsLoadingChatContent(false);
        }
    }
    function getChatMessageStyle(role) {
        const bubbleStyle = "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200/50 dark:border-gray-700/50";
        switch (role) {
            case "user": return { container: "justify-end", bubble: bubbleStyle, icon: User, label: t("workspace.chatUser"), labelClass: "text-gray-600 dark:text-gray-400" };
            case "assistant": return { container: "justify-start", bubble: bubbleStyle, icon: Bot, label: t("workspace.chatAssistant"), labelClass: "text-gray-600 dark:text-gray-400" };
            case "system": return { container: "justify-center", bubble: bubbleStyle, icon: Settings, label: t("workspace.chatSystem"), labelClass: "text-gray-600 dark:text-gray-400" };
            default: return { container: "justify-start", bubble: bubbleStyle, icon: MessageSquare, label: role, labelClass: "text-gray-600 dark:text-gray-400" };
        }
    }
    function renderChatMessage(message, index) {
        const style = getChatMessageStyle(message.role);
        const Icon = style.icon;
        return (_jsx("div", { className: `flex ${style.container} mb-4 min-w-0`, children: _jsxs("div", { className: `max-w-[85%] rounded-2xl px-4 py-3 ${style.bubble} min-w-0 overflow-hidden`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Icon, { className: "w-4 h-4 flex-shrink-0" }), _jsx("span", { className: `text-sm font-medium ${style.labelClass}`, children: style.label })] }), _jsx("div", { className: "prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-pre:my-2 prose-pre:bg-gray-800/50 dark:prose-pre:bg-gray-900/50 prose-pre:overflow-x-auto prose-code:text-inherit prose-table:text-sm prose-table:block prose-table:overflow-x-auto prose-th:bg-gray-100/50 dark:prose-th:bg-gray-700/50 prose-th:p-2 prose-td:p-2 prose-thead:border-b prose-tbody:border-collapse break-words", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: message.content }) })] }) }, index));
    }
    useEffect(() => {
        if (chatMessagesContainerRef.current)
            chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }, [chatMessages]);
    // Cron 管理函数
    async function loadCronJobs() {
        try {
            const result = await cronApi.list();
            if (result.success)
                setCronJobs(result.jobs || []);
            else
                toast.showError(result.message || t("workspace.cronLoadFailed"));
        }
        catch {
            toast.showError(t("workspace.cronLoadFailed"));
        }
    }
    async function handleAddCronJob() {
        if (!cronForm.name.trim()) {
            toast.showError(t("workspace.cronNameRequired"));
            return;
        }
        if (!cronForm.message.trim()) {
            toast.showError(t("workspace.cronMessageRequired"));
            return;
        }
        const scheduleValue = cronForm.scheduleType === "cron" ? getCronExpression(cronForm) : cronForm.scheduleType === "at" ? cronForm.atTime : cronForm.everySeconds;
        if (!scheduleValue.trim()) {
            toast.showError(t("workspace.cronScheduleRequired"));
            return;
        }
        setIsCronSubmitting(true);
        try {
            let result;
            if (editingCronJob) {
                result = await cronApi.update(editingCronJob.id, cronForm.name.trim(), cronForm.message.trim(), cronForm.scheduleType, scheduleValue.trim(), editingCronJob.enabled, cronForm.tz.trim() || undefined);
            }
            else {
                result = await cronApi.add(cronForm.name.trim(), cronForm.message.trim(), cronForm.scheduleType, scheduleValue.trim(), cronForm.tz.trim() || undefined);
            }
            if (result.success) {
                toast.showSuccess(editingCronJob ? t("workspace.cronEditSuccess") : t("workspace.cronAddSuccess"));
                setShowCronDialog(false);
                resetCronForm();
                await loadCronJobs();
            }
            else {
                toast.showError(result.message || t("workspace.cronAddFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.cronAddFailed"));
        }
        finally {
            setIsCronSubmitting(false);
        }
    }
    function confirmRemoveCronJob(job) {
        setConfirmDialog({
            isOpen: true, title: t("workspace.cronRemoveJob"), message: t("workspace.cronRemoveConfirm", { name: job.name || job.id }), type: "warning",
            onConfirm: async () => {
                try {
                    const result = await cronApi.remove(job.id);
                    if (result.success) {
                        toast.showSuccess(t("workspace.cronRemoveSuccess"));
                        await loadCronJobs();
                    }
                    else {
                        toast.showError(result.message || t("workspace.cronRemoveFailed"));
                    }
                }
                catch {
                    toast.showError(t("workspace.cronRemoveFailed"));
                }
                finally {
                    closeConfirmDialog();
                }
            },
        });
    }
    async function toggleCronJobEnabled(job) {
        try {
            const result = await cronApi.enable(job.id, job.enabled);
            if (result.success) {
                toast.showSuccess(job.enabled ? t("workspace.cronDisableSuccess") : t("workspace.cronEnableSuccess"));
                await loadCronJobs();
            }
            else {
                toast.showError(result.message || t("workspace.cronToggleFailed"));
            }
        }
        catch {
            toast.showError(t("workspace.cronToggleFailed"));
        }
    }
    function openCronEditDialog(job) {
        const formData = openEditCronDialog(job);
        setCronForm(formData);
        setEditingCronJob(job);
        setShowCronDialog(true);
    }
    function closeConfirmDialog() { setConfirmDialog({ isOpen: false, title: "", message: "", type: "warning", onConfirm: () => { } }); }
    function parseFrontmatter(content) {
        const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
        if (!match)
            return { body: content };
        const raw = match[1];
        const body = content.slice(match[0].length);
        const data = {};
        for (const line of raw.split("\n")) {
            const idx = line.indexOf(":");
            if (idx > 0) {
                const key = line.slice(0, idx).trim();
                const val = line.slice(idx + 1).trim();
                data[key] = val;
            }
        }
        return { name: data.name, description: data.description, body };
    }
    return (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-bg-base transition-colors duration-200", children: [_jsx("div", { className: "border-b border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card flex-shrink-0 transition-colors duration-200", children: _jsxs("div", { className: "px-6 py-4 flex items-center justify-between", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-dark-text-primary", children: t("workspace.title") }), _jsxs("div", { className: "flex items-center gap-4", children: [activeTab === "files" && (_jsxs("div", { className: "relative w-64", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" }), _jsx("input", { type: "text", placeholder: t("workspace.searchFiles"), value: fileSearchQuery, onChange: (e) => setFileSearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" })] })), activeTab === "skills" && (_jsxs("div", { className: "relative w-64", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" }), _jsx("input", { type: "text", placeholder: t("workspace.searchSkills"), value: skillSearchQuery, onChange: (e) => setSkillSearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" })] })), activeTab === "memory" && (_jsxs("div", { className: "relative w-64", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" }), _jsx("input", { type: "text", placeholder: t("workspace.searchMemory"), value: memorySearchQuery, onChange: (e) => setMemorySearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" })] })), activeTab === "sessions" && (_jsxs("div", { className: "relative w-64", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" }), _jsx("input", { type: "text", placeholder: t("workspace.searchSessions"), value: chatSearchQuery, onChange: (e) => setChatSearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white dark:bg-dark-bg-sidebar text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted transition-colors duration-200" })] })), activeTab === "cron" && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm text-gray-500 dark:text-dark-text-muted", children: cronJobs.length > 0 && t("workspace.cronJobCount", { count: cronJobs.length }) }), _jsxs("button", { onClick: () => { setShowCronDialog(true); resetCronForm(); }, className: "flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium", children: [_jsx(Plus, { className: "w-4 h-4" }), t("workspace.cronAddJob")] })] })), _jsx(WorkspaceTabs, { activeTab: activeTab, onTabChange: setActiveTab })] })] }) }), _jsxs("div", { className: "flex-1 min-h-0 flex overflow-hidden", children: [_jsx("div", { className: "w-80 border-r border-gray-200 dark:border-dark-border-subtle flex flex-col bg-white dark:bg-dark-bg-card overflow-hidden transition-colors duration-200", children: _jsxs("div", { className: "flex-1 min-h-0 overflow-y-auto p-4 space-y-1 scrollbar-thin", children: [activeTab === "files" && (_jsx(FileList, { items: items, selectedItem: selectedItem, searchQuery: fileSearchQuery, isLoading: isLoading, onSearchChange: setFileSearchQuery, onDirectoryLoad: loadDirectory, onFileLoad: loadFileContentAction, onRename: renameFsItem, onDelete: deleteFsItem, formatSize: formatSize, formatTimestamp: (ts) => formatTimestamp(ts, t, i18n) })), activeTab === "skills" && (_jsx(SkillList, { skills: skills, selectedSkill: selectedSkill, searchQuery: skillSearchQuery, isLoading: isLoading, onSearchChange: setSkillSearchQuery, onSelect: selectSkillAction, onToggle: toggleSkillAction, onDelete: deleteSkillAction, formatTimestamp: (ts) => formatTimestamp(ts, t, i18n) })), activeTab === "memory" && (_jsx(MemoryList, { memories: memories, selectedMemory: selectedMemory, searchQuery: memorySearchQuery, isLoading: isLoading, onSearchChange: setMemorySearchQuery, onSelect: selectMemoryAction, onDelete: deleteMemoryAction, formatSize: formatSize, formatTimestamp: (ts) => formatTimestamp(ts, t, i18n) })), activeTab === "sessions" && (_jsx(SessionList, { sessions: chatSessions, selectedSession: selectedChatSession, searchQuery: chatSearchQuery, isLoading: isLoading, onSearchChange: setChatSearchQuery, onSelect: selectChatSessionAction, formatSize: formatSize, formatTimestamp: (ts) => formatTimestamp(ts, t, i18n) })), activeTab === "cron" && (_jsx(CronList, { jobs: cronJobs, isLoading: isLoading, onToggle: toggleCronJobEnabled, onEdit: openCronEditDialog, onRemove: confirmRemoveCronJob, describeSchedule: (sch) => describeSchedule(sch, t), describeCron: (expr) => describeCron(expr, t), describeIntervalMs: (ms) => describeIntervalMs(ms, t), formatCronTimestamp: formatCronTimestamp, formatCronRelativeTime: (ms) => formatCronRelativeTime(ms, t) }))] }) }), _jsx("div", { className: "flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-bg-sidebar transition-colors duration-200", children: activeTab === "files" && selectedItem ? (_jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "w-5 h-5 text-gray-400 dark:text-dark-text-muted" }), _jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate", children: selectedItem.name })] }), _jsxs("p", { className: "text-sm text-gray-500 dark:text-dark-text-muted mt-1", children: [formatSize(selectedItem.size), " \u00B7 ", formatTimestamp(selectedItem.modified, t, i18n)] })] }), _jsx("button", { onClick: () => { setSelectedItem(null); setFileContent(""); }, className: "p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }) }), _jsx("div", { className: "flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin", children: _jsx("div", { className: "bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6", children: _jsx("pre", { className: "whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed", children: fileContent }) }) })] })) : activeTab === "skills" && (isNewSkill || selectedSkill) ? (_jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "flex-1 min-w-0", children: isNewSkill ? (_jsx("input", { type: "text", placeholder: t("workspace.skillName"), value: newSkillName, onChange: (e) => setNewSkillName(e.target.value), className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary bg-transparent border-b border-gray-300 dark:border-dark-border-subtle focus:outline-none focus:border-blue-500 w-64", autoFocus: true })) : (_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate", children: skillFrontmatter.name || selectedSkill?.title || selectedSkill?.name }), skillFrontmatter.description && _jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mt-1", children: skillFrontmatter.description }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-dark-text-muted mt-0.5", children: [selectedSkill?.enabled ? t("workspace.enabled") : t("workspace.disabled"), " \u00B7 ", formatTimestamp(selectedSkill?.modified || 0, t, i18n)] })] })) }), _jsx("div", { className: "flex items-center gap-2", children: isEditing ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: cancelEditSkillAction, className: "flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm", children: [_jsx(X, { className: "w-4 h-4" }), t("workspace.cancel")] }), _jsxs("button", { onClick: saveSkillAction, className: "flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm", children: [_jsx(Save, { className: "w-4 h-4" }), t("workspace.save")] })] })) : (_jsxs("button", { onClick: startEditSkillAction, className: "flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm", children: [_jsx(Edit3, { className: "w-4 h-4" }), t("workspace.edit")] })) })] }) }), isEditing ? (_jsx("textarea", { value: editingContent, onChange: (e) => setEditingContent(e.target.value), className: "flex-1 w-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary resize-none focus:outline-none scrollbar-thin border-0", placeholder: t("workspace.editorPlaceholder") })) : (_jsx("div", { className: "flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin", children: _jsx("div", { className: "bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6", children: _jsx("div", { className: "prose dark:prose-invert max-w-none break-words overflow-hidden", children: _jsx(ReactMarkdown, { children: skillFrontmatter.body || skillContent || t("workspace.noContent") }) }) }) }))] })) : activeTab === "memory" && selectedMemory ? (_jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Brain, { className: "w-5 h-5 text-purple-500 dark:text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate", children: selectedMemory.name })] }), _jsxs("p", { className: "text-sm text-gray-500 dark:text-dark-text-muted mt-1", children: [selectedMemory.size !== undefined && `${formatSize(selectedMemory.size)} · `, formatTimestamp(selectedMemory.modified || 0, t, i18n)] })] }), _jsx("div", { className: "flex items-center gap-2", children: isMemoryEditing ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: cancelEditMemoryAction, className: "flex items-center gap-1 px-3 py-1.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors text-sm", children: [_jsx(X, { className: "w-4 h-4" }), t("workspace.cancel")] }), _jsxs("button", { onClick: saveMemoryAction, className: "flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm", children: [_jsx(Save, { className: "w-4 h-4" }), t("workspace.save")] })] })) : (_jsxs("button", { onClick: startEditMemoryAction, className: "flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm", children: [_jsx(Edit3, { className: "w-4 h-4" }), t("workspace.edit")] })) })] }) }), _jsx("div", { className: "flex-1 min-h-0 overflow-hidden p-6", children: isMemoryEditing ? (_jsx("textarea", { value: memoryEditingContent, onChange: (e) => setMemoryEditingContent(e.target.value), className: "w-full h-full p-4 font-mono text-sm bg-white dark:bg-dark-bg-card text-gray-900 dark:text-dark-text-primary border border-gray-200 dark:border-dark-border-subtle rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 scrollbar-thin", placeholder: t("workspace.memoryEditorPlaceholder") })) : (_jsx("div", { className: "h-full overflow-y-auto bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle p-6 scrollbar-thin", children: _jsx("pre", { className: "whitespace-pre-wrap text-sm text-gray-800 dark:text-dark-text-secondary font-mono leading-relaxed", children: memoryContent || t("workspace.noMemoryContent") }) })) })] })) : activeTab === "sessions" && selectedChatSession ? (_jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "bg-white dark:bg-dark-bg-card border-b border-gray-200 dark:border-dark-border-subtle px-6 py-4 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MessageSquare, { className: "w-5 h-5 text-green-500 dark:text-green-400" }), _jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary truncate", children: selectedChatSession.name })] }), _jsxs("p", { className: "text-sm text-gray-500 dark:text-dark-text-muted mt-1", children: [formatSize(selectedChatSession.size), " \u00B7 ", formatTimestamp(selectedChatSession.modified, t, i18n)] })] }), _jsx("button", { onClick: () => { setSelectedChatSession(null); setChatMessages([]); }, className: "p-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }) }), _jsx("div", { className: "flex-1 min-h-0 overflow-hidden p-6", children: isLoadingChatContent ? (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" }) })) : chatMessages.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx(EmptyState, { icon: FileText, title: t("workspace.noMessages"), description: t("workspace.noMessagesDesc") }) })) : (_jsx("div", { ref: chatMessagesContainerRef, className: "h-full overflow-y-auto overflow-x-hidden bg-white/40 dark:bg-dark-bg-card/40 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-dark-border-subtle/50 p-6 scrollbar-thin", children: chatMessages.map((msg, idx) => renderChatMessage(msg, idx)) })) })] })) : activeTab === "cron" ? (_jsx("div", { className: "flex-1 flex flex-col items-center justify-center p-6", children: _jsxs("div", { className: "max-w-md text-center", children: [_jsx(CalendarClock, { className: "w-16 h-16 text-amber-500 dark:text-amber-400 mx-auto mb-4" }), _jsx("h2", { className: "text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2", children: t("workspace.cronTitle") }), _jsx("p", { className: "text-gray-600 dark:text-dark-text-secondary mb-6", children: t("workspace.cronDesc") }), _jsx("div", { className: "flex flex-col gap-3 text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg p-4", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "text-sm text-amber-700 dark:text-amber-300 space-y-1", children: [_jsx("p", { children: t("workspace.cronRestartHint") }), _jsx("p", { className: "text-amber-600 dark:text-amber-400", children: t("workspace.cronChatHint") })] })] }) })] }) })) : (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsx(EmptyState, { icon: activeTab === "files" ? FileText : activeTab === "skills" ? Wrench : activeTab === "memory" ? Brain : MessageSquare, title: t(`workspace.select${activeTab === "files" ? "File" : activeTab === "skills" ? "Skill" : activeTab === "memory" ? "Memory" : "Session"}`), description: t(`workspace.select${activeTab === "files" ? "File" : activeTab === "skills" ? "Skill" : activeTab === "memory" ? "Memory" : "Session"}Desc`) }) })) })] }), activeTab === "files" && (_jsx("div", { className: "border-t border-gray-200 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-card px-6 py-3 flex-shrink-0", children: _jsxs("div", { className: "flex items-center gap-1 text-sm", children: [_jsxs("button", { onClick: () => loadDirectory(""), className: `flex items-center gap-1 px-2 py-1 rounded transition-colors ${!currentPath || currentPath === "/" ? "text-gray-900 dark:text-dark-text-primary font-medium" : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-hover"}`, children: [_jsx(Home, { className: "w-4 h-4" }), t("workspace.workspaceRoot")] }), getFileBreadcrumbs().map((crumb) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(ChevronRight, { className: "w-4 h-4 text-gray-400 dark:text-dark-text-muted" }), _jsx("button", { onClick: () => loadDirectory(crumb.path), className: `px-2 py-1 rounded transition-colors ${crumb.path === currentPath ? "text-gray-900 dark:text-dark-text-primary font-medium" : "text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-hover"}`, children: crumb.name })] }, crumb.path)))] }) })), showCronDialog && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-dark-bg-card rounded-xl shadow-xl max-w-lg w-full p-6 mx-4 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `p-2 rounded-lg ${editingCronJob ? "bg-amber-50 dark:bg-amber-900/30" : "bg-blue-50 dark:bg-blue-900/30"}`, children: editingCronJob ? _jsx(Pencil, { className: "w-5 h-5 text-amber-600 dark:text-amber-400" }) : _jsx(Plus, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-dark-text-primary", children: editingCronJob ? t("workspace.cronEditJob") : t("workspace.cronAddJob") })] }), _jsx("button", { onClick: () => { setShowCronDialog(false); resetCronForm(); }, className: "p-1.5 hover:bg-gray-100 dark:hover:bg-dark-bg-hover rounded-lg transition-colors", children: _jsx(X, { className: "w-5 h-5 text-gray-500 dark:text-dark-text-muted" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1", children: t("workspace.cronJobName") }), _jsx("input", { type: "text", value: cronForm.name, onChange: (e) => setCronForm({ ...cronForm, name: e.target.value }), placeholder: t("workspace.cronJobNamePlaceholder"), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm", autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1", children: t("workspace.cronMessageLabel") }), _jsx("textarea", { value: cronForm.message, onChange: (e) => setCronForm({ ...cronForm, message: e.target.value }), placeholder: t("workspace.cronMessagePlaceholder"), rows: 3, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2", children: t("workspace.cronScheduleType") }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: ["cron", "every", "at"].map((type) => (_jsxs("button", { onClick: () => setCronForm({ ...cronForm, scheduleType: type }), className: `flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium ${cronForm.scheduleType === type ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"}`, children: [type === "cron" ? _jsx(CalendarClock, { className: "w-4 h-4" }) : type === "every" ? _jsx(Clock, { className: "w-4 h-4" }) : _jsx(Timer, { className: "w-4 h-4" }), t(`workspace.cron${type === "cron" ? "" : type === "every" ? "Interval" : "RunOnce"}`)] }, type))) })] }), cronForm.scheduleType === "cron" ? (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2", children: t("workspace.cronExpression") }), _jsx("div", { className: "grid grid-cols-5 gap-2", children: [{ key: "cronMinute", label: t("workspace.cronFieldMinute"), placeholder: "0" }, { key: "cronHour", label: t("workspace.cronFieldHour"), placeholder: "9" },
                                                { key: "cronDom", label: t("workspace.cronFieldDom"), placeholder: "*" }, { key: "cronMonth", label: t("workspace.cronFieldMonth"), placeholder: "*" },
                                                { key: "cronDow", label: t("workspace.cronFieldDow"), placeholder: "*" }].map((field) => (_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1 text-center", children: field.label }), _jsx("input", { type: "text", value: cronForm[field.key], onChange: (e) => setCronForm({ ...cronForm, [field.key]: e.target.value }), placeholder: field.placeholder, className: "w-full px-2 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-center" })] }, field.key))) }), _jsxs("div", { className: "mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CalendarClock, { className: "w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" }), _jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300 font-medium", children: describeCron(getCronExpression(cronForm), t) })] }), _jsx("p", { className: "text-xs text-blue-500 dark:text-blue-400/70 mt-1 ml-6 font-mono", children: getCronExpression(cronForm) })] })] })) : cronForm.scheduleType === "every" ? (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1", children: t("workspace.cronIntervalSeconds") }), _jsx("input", { type: "number", value: cronForm.everySeconds, onChange: (e) => setCronForm({ ...cronForm, everySeconds: e.target.value }), placeholder: "3600", min: 1, className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" }), _jsx("div", { className: "mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" }), _jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300 font-medium", children: describeIntervalMs(parseInt(cronForm.everySeconds) * 1000, t) })] }) })] })) : (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1", children: t("workspace.cronAtTime") }), _jsx("input", { type: "datetime-local", value: cronForm.atTime, onChange: (e) => setCronForm({ ...cronForm, atTime: e.target.value }), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" }), _jsx("div", { className: "mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Timer, { className: "w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" }), _jsx("span", { className: "text-sm text-blue-700 dark:text-blue-300 font-medium", children: cronForm.atTime ? t("workspace.cronRunOnceAt", { time: cronForm.atTime.replace("T", " ") }) : t("workspace.cronSelectTime") })] }) })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1", children: t("workspace.cronTimezone") }), _jsxs("select", { value: cronForm.tz, onChange: (e) => setCronForm({ ...cronForm, tz: e.target.value }), className: "w-full px-3 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm", children: [_jsx("option", { value: "", children: t("workspace.cronTimezoneDefault") }), _jsx("option", { value: "Asia/Shanghai", children: "Asia/Shanghai (\u5317\u4EAC\u65F6\u95F4)" }), _jsx("option", { value: "Asia/Hong_Kong", children: "Asia/Hong_Kong (\u9999\u6E2F)" }), _jsx("option", { value: "Asia/Tokyo", children: "Asia/Tokyo (\u4E1C\u4EAC)" }), _jsx("option", { value: "America/New_York", children: "America/New_York (\u7EBD\u7EA6)" }), _jsx("option", { value: "Europe/London", children: "Europe/London (\u4F26\u6566)" }), _jsx("option", { value: "UTC", children: "UTC (\u534F\u8C03\u4E16\u754C\u65F6)" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx("button", { onClick: () => { setShowCronDialog(false); resetCronForm(); }, className: "px-4 py-2 bg-gray-100 dark:bg-dark-bg-hover hover:bg-gray-200 dark:hover:bg-dark-bg-active text-gray-700 dark:text-dark-text-primary rounded-lg transition-colors text-sm font-medium", children: t("workspace.cronCancel") }), _jsx("button", { onClick: handleAddCronJob, disabled: isCronSubmitting, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium", children: isCronSubmitting ? (editingCronJob ? t("workspace.cronSaving") : t("workspace.cronAdding")) : (editingCronJob ? t("workspace.cronSave") : t("workspace.cronConfirm")) })] })] }) })), _jsx(ConfirmDialog, { isOpen: confirmDialog.isOpen, title: confirmDialog.title, message: confirmDialog.message, type: confirmDialog.type || "warning", onConfirm: confirmDialog.onConfirm, onCancel: closeConfirmDialog })] }));
}
