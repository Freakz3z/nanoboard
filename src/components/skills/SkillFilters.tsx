import { useTranslation } from "react-i18next";
import { Search, Filter, X } from "lucide-react";
import type { Skill } from "../../types";

interface SkillFiltersProps {
  searchQuery: string;
  category: string;
  showInstalled: boolean;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onToggleInstalled: () => void;
  categories: string[];
}

export default function SkillFilters({
  searchQuery,
  category,
  showInstalled,
  onSearchChange,
  onCategoryChange,
  onToggleInstalled,
  categories,
}: SkillFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-text-muted" />
        <input
          type="text"
          placeholder={t("skills.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-bg-sidebar border border-gray-200 dark:border-dark-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* 分类筛选 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t("skills.categoryFilter")}
          </label>
          {category && (
            <button
              onClick={() => onCategoryChange("")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              {t("skills.clearFilter")}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange("")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !category
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted"
            }`}
          >
            {t("skills.allCategories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 已安装筛选 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleInstalled}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2 ${
            showInstalled
              ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              : "border-gray-200 dark:border-dark-border-subtle text-gray-600 dark:text-dark-text-muted hover:border-gray-300"
          }`}
        >
          {t("skills.showInstalled")}
        </button>
      </div>
    </div>
  );
}
