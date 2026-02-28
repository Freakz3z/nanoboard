import { useTranslation } from "react-i18next";
import { MessageSquare, ChevronUp, ChevronDown, Radio, Sparkles, Inbox } from "lucide-react";
import EmptyState from "../../EmptyState";
import { CHANNELS_CONFIG } from "@/config/channels";
import type { Config, EditingChannel } from "@/types/config";

interface ChannelSectionProps {
  config: Config;
  expanded: boolean;
  onToggle: () => void;
  onEditChannel: (channel: EditingChannel) => void;
  onUpdateChannel: (name: string, enabled: boolean) => void;
  onUpdateChannelsTopLevel: (field: string, value: any) => void;
}

export default function ChannelSection({
  config,
  expanded,
  onToggle,
  onEditChannel,
  onUpdateChannel,
  onUpdateChannelsTopLevel,
}: ChannelSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-dark-bg-card rounded-lg border border-gray-200 dark:border-dark-border-subtle overflow-hidden transition-colors duration-200">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-bg-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
            {t("config.messageChannels")}
          </h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-dark-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="p-5 pt-0 space-y-4">
          {/* 全局设置 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {t("config.channelsGlobalSettings")}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* sendProgress */}
              <div
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  config.channels?.sendProgress
                    ? "bg-green-100/80 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50"
                    : "bg-white/60 dark:bg-dark-bg-card/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      config.channels?.sendProgress
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-dark-bg-hover text-gray-500 dark:text-dark-text-muted"
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                      {t("config.sendProgress")}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                      {t("config.sendProgressDesc")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onUpdateChannelsTopLevel("sendProgress", !config.channels?.sendProgress)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.channels?.sendProgress ? "bg-green-500" : "bg-gray-300 dark:bg-dark-border-default"
                  }`}
                  title={config.channels?.sendProgress ? t("config.clickToDisable") : t("config.clickToEnable")}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform shadow ${
                      config.channels?.sendProgress ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* sendToolHints */}
              <div
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  config.channels?.sendToolHints
                    ? "bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50"
                    : "bg-white/60 dark:bg-dark-bg-card/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      config.channels?.sendToolHints
                        ? "bg-amber-500 text-white"
                        : "bg-gray-200 dark:bg-dark-bg-hover text-gray-500 dark:text-dark-text-muted"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                      {t("config.sendToolHints")}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                      {t("config.sendToolHintsDesc")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onUpdateChannelsTopLevel("sendToolHints", !config.channels?.sendToolHints)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.channels?.sendToolHints ? "bg-amber-500" : "bg-gray-300 dark:bg-dark-border-default"
                  }`}
                  title={config.channels?.sendToolHints ? t("config.clickToDisable") : t("config.clickToEnable")}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform shadow ${
                      config.channels?.sendToolHints ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 渠道列表 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
              {t("config.selectChannel")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CHANNELS_CONFIG.map((channel) => {
                const isEnabled = config.channels?.[channel.key]?.enabled || false;
                return (
                  <div
                    key={channel.key}
                    className={`group rounded-lg border transition-all hover:shadow-md ${
                      isEnabled
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/50"
                        : "bg-white dark:bg-dark-bg-card border-gray-200 dark:border-dark-border-subtle hover:border-gray-300 dark:hover:border-dark-border-default"
                    }`}
                  >
                    <div className="w-full p-4 text-left">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() =>
                            onEditChannel({
                              isOpen: true,
                              channelKey: channel.key,
                              channelInfo: channel,
                            })
                          }
                        >
                          <div className={`p-2 rounded-lg ${channel.colorClass.split(" text-")[0]}`}>
                            <MessageSquare
                              className={`w-5 h-5 ${"text-" + channel.colorClass.split(" text-")[1]}`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
                                {t(channel.nameKey)}
                              </h3>
                              {isEnabled && (
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                  {t("config.enabled")}
                                </span>
                              )}
                              {!isEnabled && (
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-dark-bg-hover text-gray-600 dark:text-dark-text-muted text-xs rounded-full">
                                  {t("config.notEnabled")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateChannel(channel.key, !isEnabled);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-dark-border-default"
                          }`}
                          title={isEnabled ? t("config.clickToDisable") : t("config.clickToEnable")}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-dark-text-primary transition-transform shadow ${
                              isEnabled ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {Object.keys(config.channels || {}).length === 0 && (
            <EmptyState
              icon={Inbox}
              title={t("config.noChannelsConfigured")}
              description={t("dashboard.clickToStartConfig")}
            />
          )}
        </div>
      )}
    </div>
  );
}
