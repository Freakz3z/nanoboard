/**
 * ClawHub Skills API 类型定义
 * 基于 https://github.com/openclaw/clawhub/blob/master/docs/http-api.md
 */

// ClawHub API 基础 URL
export const CLAWHUB_API_BASE = "https://clawhub.ai";

// 搜索结果项
export interface ClawHubSearchResult {
  score: number;
  slug: string;
  displayName: string;
  summary: string;
  version: string;
  updatedAt: number;
}

// 搜索响应
export interface ClawHubSearchResponse {
  results: ClawHubSearchResult[];
}

// 技能统计
export interface SkillStats {
  downloads?: number;
  stars?: number;
  installsCurrent?: number;
  installsAllTime?: number;
}

// 技能版本信息
export interface SkillVersion {
  version: string;
  createdAt: number;
  changelog?: string;
}

// 技能列表项
export interface SkillListItem {
  slug: string;
  displayName: string;
  summary: string;
  tags: Record<string, string>;
  stats: SkillStats;
  createdAt: number;
  updatedAt: number;
  latestVersion?: SkillVersion;
}

// 技能列表响应
export interface ClawHubSkillsResponse {
  items: SkillListItem[];
  nextCursor: string | null;
}

// 技能所有者
export interface SkillOwner {
  handle: string;
  displayName: string | null;
  image: string | null;
}

// 技能详情
export interface SkillDetail {
  skill: {
    slug: string;
    displayName: string;
    summary: string;
    tags: Record<string, string>;
    stats: SkillStats;
    createdAt: number;
    updatedAt: number;
  };
  latestVersion: SkillVersion;
  owner: SkillOwner;
}

// 技能详情响应（与 SkillDetail 结构相同，用于 API 响应）
export type SkillDetailResponse = SkillDetail;

// 排序选项
export type SkillSortOption =
  | "updated"
  | "downloads"
  | "stars"
  | "installsCurrent"
  | "installsAllTime"
  | "trending";

// 排序选项配置
export const SKILL_SORT_OPTIONS: { value: SkillSortOption; labelKey: string }[] = [
  { value: "trending", labelKey: "skills.sortTrending" },
  { value: "installsCurrent", labelKey: "skills.sortInstalls" },
  { value: "downloads", labelKey: "skills.sortDownloads" },
  { value: "stars", labelKey: "skills.sortStars" },
  { value: "updated", labelKey: "skills.sortUpdated" },
];

// SearchResult 别名 (用于兼容)
export type SearchResult = ClawHubSearchResult;
