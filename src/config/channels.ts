/**
 * Channel 配置数据
 * 消息渠道配置信息
 */

import type { ChannelInfo } from "./types";

// 消息渠道配置列表
export const CHANNELS_CONFIG: ChannelInfo[] = [
  {
    key: "telegram",
    nameKey: "channels.telegram",
    colorClass: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    fields: [
      { name: "token", labelKey: "config.apiKey", type: "password", placeholderKey: "config.channels.telegram.tokenPlaceholder" },
      { name: "proxy", labelKey: "config.channels.telegram.proxyLabel", type: "text", placeholderKey: "config.channels.telegram.proxyPlaceholder" },
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.telegram.allowFromPlaceholder" },
      { name: "replyToMessage", labelKey: "config.channels.telegram.replyToMessageLabel", type: "select", options: ["true", "false"], default: "false" },
    ],
  },
  {
    key: "discord",
    nameKey: "channels.discord",
    colorClass: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    fields: [
      { name: "token", labelKey: "config.apiKey", type: "password", placeholderKey: "config.channels.discord.tokenPlaceholder" },
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.discord.allowFromPlaceholder" },
    ],
  },
  {
    key: "whatsapp",
    nameKey: "channels.whatsapp",
    colorClass: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    fields: [
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.whatsapp.allowFromPlaceholder" },
    ],
  },
  {
    key: "mochat",
    nameKey: "channels.mochat",
    colorClass: "bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    fields: [
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.mochat.allowFromPlaceholder" },
    ],
  },
  {
    key: "feishu",
    nameKey: "channels.feishu",
    colorClass: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
    fields: [
      { name: "appId", labelKey: "config.appId", type: "text", placeholderKey: "config.channels.feishu.appIdPlaceholder" },
      { name: "appSecret", labelKey: "config.appSecret", type: "password", placeholderKey: "config.channels.feishu.appSecretPlaceholder" },
      { name: "encryptKey", labelKey: "config.channels.feishu.encryptKeyLabel", type: "text", placeholderKey: "config.channels.feishu.encryptKeyPlaceholder" },
      { name: "verificationToken", labelKey: "config.channels.feishu.verificationTokenLabel", type: "text", placeholderKey: "config.channels.feishu.verificationTokenPlaceholder" },
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.feishu.allowFromPlaceholder" },
    ],
  },
  {
    key: "dingtalk",
    nameKey: "channels.dingtalk",
    colorClass: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    fields: [
      { name: "clientId", labelKey: "config.channels.dingtalk.clientIdLabel", type: "text", placeholderKey: "config.channels.dingtalk.clientIdPlaceholder" },
      { name: "clientSecret", labelKey: "config.channels.dingtalk.clientSecretLabel", type: "password", placeholderKey: "config.channels.dingtalk.clientSecretPlaceholder" },
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.dingtalk.allowFromPlaceholder" },
    ],
  },
  {
    key: "slack",
    nameKey: "channels.slack",
    colorClass: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    fields: [
      { name: "botToken", labelKey: "config.botToken", type: "password", placeholderKey: "config.channels.slack.botTokenPlaceholder" },
      { name: "appToken", labelKey: "config.appToken", type: "password", placeholderKey: "config.channels.slack.appTokenPlaceholder" },
      { name: "groupPolicy", labelKey: "config.channels.slack.groupPolicyLabel", type: "select", options: ["mention", "open", "allowlist"], default: "mention" },
      { name: "allowFrom", labelKey: "config.channels.slack.allowFromLabel", type: "text", placeholderKey: "config.channels.slack.allowFromPlaceholder" },
    ],
  },
  {
    key: "qq",
    nameKey: "channels.qq",
    colorClass: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    fields: [
      { name: "appId", labelKey: "config.appId", type: "text", placeholderKey: "config.channels.qq.appIdPlaceholder" },
      { name: "secret", labelKey: "config.channels.qq.secretLabel", type: "password", placeholderKey: "config.channels.qq.secretPlaceholder" },
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.qq.allowFromPlaceholder" },
    ],
  },
  {
    key: "matrix",
    nameKey: "channels.matrix",
    colorClass: "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    fields: [
      { name: "homeserver", labelKey: "config.channels.matrix.homeserverLabel", type: "text", placeholderKey: "config.channels.matrix.homeserverPlaceholder", default: "https://matrix.org" },
      { name: "accessToken", labelKey: "config.channels.matrix.accessTokenLabel", type: "password", placeholderKey: "config.channels.matrix.accessTokenPlaceholder" },
      { name: "userId", labelKey: "config.channels.matrix.userIdLabel", type: "text", placeholderKey: "config.channels.matrix.userIdPlaceholder" },
      { name: "deviceId", labelKey: "config.channels.matrix.deviceIdLabel", type: "text", placeholderKey: "config.channels.matrix.deviceIdPlaceholder" },
      { name: "e2eeEnabled", labelKey: "config.channels.matrix.e2eeEnabledLabel", type: "select", options: ["true", "false"], default: "true" },
      { name: "groupPolicy", labelKey: "config.channels.matrix.groupPolicyLabel", type: "select", options: ["open", "mention", "allowlist"], default: "open" },
      { name: "allowFrom", labelKey: "config.allowFrom", type: "text", placeholderKey: "config.channels.matrix.allowFromPlaceholder" },
    ],
  },
  {
    key: "email",
    nameKey: "channels.email",
    colorClass: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    fields: [
      { name: "imapHost", labelKey: "config.channels.email.imapServerLabel", type: "text", placeholderKey: "config.channels.email.imapServerPlaceholder" },
      { name: "imapPort", labelKey: "config.channels.email.imapPortLabel", type: "number", default: 993 },
      { name: "imapUsername", labelKey: "config.channels.email.imapUsernameLabel", type: "text", placeholderKey: "config.channels.email.imapUsernamePlaceholder" },
      { name: "imapPassword", labelKey: "config.channels.email.imapPasswordLabel", type: "password", placeholderKey: "config.channels.email.imapPasswordPlaceholder" },
      { name: "smtpHost", labelKey: "config.channels.email.smtpServerLabel", type: "text", placeholderKey: "config.channels.email.smtpServerPlaceholder" },
      { name: "smtpPort", labelKey: "config.channels.email.smtpPortLabel", type: "number", default: 587 },
      { name: "smtpUsername", labelKey: "config.channels.email.smtpUsernameLabel", type: "text", placeholderKey: "config.channels.email.smtpUsernamePlaceholder" },
      { name: "smtpPassword", labelKey: "config.channels.email.smtpPasswordLabel", type: "password", placeholderKey: "config.channels.email.smtpPasswordPlaceholder" },
      { name: "fromAddress", labelKey: "config.channels.email.fromAddressLabel", type: "text", placeholderKey: "config.channels.email.fromAddressPlaceholder" },
      { name: "allowFrom", labelKey: "config.channels.email.allowFromLabel", type: "text", placeholderKey: "config.channels.email.allowFromPlaceholder" },
    ],
  },
];

// 根据 key 获取 Channel 信息
export function getChannelInfo(channelKey: string): ChannelInfo | undefined {
  return CHANNELS_CONFIG.find(c => c.key === channelKey);
}

// 检查 Channel 是否已启用
export function isChannelEnabled(
  config: { channels?: Record<string, { enabled?: boolean }> },
  channelKey: string
): boolean {
  return config.channels?.[channelKey]?.enabled || false;
}
