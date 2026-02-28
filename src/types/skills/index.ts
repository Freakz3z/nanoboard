/**
 * Skills 相关类型定义
 */

// 技能信息
export interface Skill {
  id: string;
  name: string;
  title?: string;
  description?: string;
  category?: string;
  author?: string;
  downloads?: number;
  version?: string;
  enabled: boolean;
  modified?: number;
  installed?: boolean;
  [key: string]: any;
}
