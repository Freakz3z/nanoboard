import { useTranslation } from "react-i18next";
import { FileText, Clock, Trash2, Edit2, Search, Wrench, ToggleLeft, ToggleRight } from "lucide-react";
import EmptyState from "../EmptyState";
import type { Skill } from "../../types";

interface SkillListProps {
  skills: Skill[];
  selectedSkill: Skill | null;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onSelect: (skill: Skill) => void;
  onToggle: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  formatTimestamp: (timestamp: number, t: any, i18n: any) => string;
}

export default function SkillList({
  skills,
  selectedSkill,
  searchQuery,
  isLoading,
  onSearchChange,
  onSelect,
  onToggle,
  onDelete,
  formatTimestamp,
}: SkillListProps) {
  const { t, i18n } = useTranslation();

  const filteredSkills = skills.filter((skill) => {
    const query = searchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      (skill.title && skill.title.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSkills.length === 0 ? (
        <EmptyState
          icon={searchQuery ? Search : Wrench}
          title={searchQuery ? t("workspace.noMatchingSkills") : t("workspace.noSkills")}
          description={searchQuery ? t("workspace.tryOtherKeywords") : t("workspace.noSkillsDesc")}
        />
      ) : (
        filteredSkills.map((skill) => (
          <div
            key={skill.id}
            onClick={() => onSelect(skill)}
            className={`group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedSkill?.id === skill.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default hover:bg-gray-50 dark:hover:bg-dark-bg-hover"
            } ${!skill.enabled ? "opacity-60" : ""}`}
          >
            <div className="flex-shrink-0">
              <FileText className={`w-5 h-5 ${skill.enabled ? "text-blue-500 dark:text-blue-400" : "text-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-dark-text-primary truncate text-sm">
                  {skill.title || skill.name}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                  skill.enabled
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}>
                  {skill.enabled ? t("workspace.enabled") : t("workspace.disabled")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(skill.modified || 0, t, i18n)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(skill); }}
                className="p-1.5 text-gray-400 dark:text-dark-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                title={skill.enabled ? t("workspace.disable") : t("workspace.enable")}
              >
                {skill.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(skill); }}
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
