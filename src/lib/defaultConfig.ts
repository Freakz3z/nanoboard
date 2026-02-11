// nanobot 的默认配置
export const DEFAULT_CONFIG = {
  providers: {},
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-5",
      max_tokens: 8192,
      max_tool_iterations: 20,
      temperature: 0.7,
      workspace: "~/.nanobot/workspace"
    }
  },
  channels: {
    terminal: {
      enabled: true
    },
    // Telegram 配置
    telegram: {
      enabled: false,
      token: "",
      allowFrom: []
    },
    // Discord 配置
    discord: {
      enabled: false,
      token: "",
      allowFrom: []
    },
    // WhatsApp 配置
    whatsapp: {
      enabled: false,
      allowFrom: []
    },
    // 飞书 (Feishu) 配置
    feishu: {
      enabled: false,
      appId: "",
      appSecret: "",
      encryptKey: "",
      verificationToken: "",
      allowFrom: []
    },
    // 钉钉 (DingTalk) 配置
    dingtalk: {
      enabled: false,
      clientId: "",
      clientSecret: "",
      allowFrom: []
    },
    // Slack 配置
    slack: {
      enabled: false,
      botToken: "",
      appToken: "",
      groupPolicy: "mention"
    },
    // QQ 配置
    qq: {
      enabled: false,
      appId: "",
      secret: "",
      allowFrom: []
    },
    // Email 配置
    email: {
      enabled: false,
      consentGranted: false,
      imapHost: "",
      imapPort: 993,
      imapUsername: "",
      imapPassword: "",
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      fromAddress: "",
      allowFrom: []
    }
  }
};
