/**
 * Workspace 相关类型定义
 */

// 文件系统项
export interface FsItem {
  name: string;
  path: string;
  relative_path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
}

// 面包屑导航项
export interface Breadcrumb {
  name: string;
  path: string;
}

// Frontmatter 数据
export interface FrontmatterData {
  name?: string;
  description?: string;
  body: string;
}

// 聊天会话
export interface ChatSession {
  id: string;
  name: string;
  title: string;
  modified: number;
  size: number;
}

// 聊天消息
export interface ChatMessage {
  role: string;
  content: string;
}

// Tab 类型
export type TabType = "files" | "skills" | "memory" | "sessions" | "cron";
