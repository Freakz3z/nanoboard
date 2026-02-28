// nanobot 的默认初始配置（完整模板）
export const DEFAULT_CONFIG = {
    agents: {
        defaults: {
            workspace: "~/.nanobot/workspace",
            model: "anthropic/claude-opus-4-5",
            provider: "auto",
            maxTokens: 8192,
            temperature: 0.7,
            maxToolIterations: 20,
            memoryWindow: 50
        }
    },
    channels: {
        whatsapp: {
            enabled: false,
            bridgeUrl: "ws://localhost:3001",
            bridgeToken: "",
            allowFrom: []
        },
        telegram: {
            enabled: false,
            token: "",
            allowFrom: [],
            proxy: null,
            replyToMessage: false
        },
        discord: {
            enabled: false,
            token: "",
            allowFrom: [],
            gatewayUrl: "wss://gateway.discord.gg/?v=10&encoding=json",
            intents: 37377
        },
        feishu: {
            enabled: false,
            appId: "",
            appSecret: "",
            encryptKey: "",
            verificationToken: "",
            allowFrom: []
        },
        mochat: {
            enabled: false,
            baseUrl: "https://mochat.io",
            socketUrl: "",
            socketPath: "/socket.io",
            socketDisableMsgpack: false,
            socketReconnectDelayMs: 1000,
            socketMaxReconnectDelayMs: 10000,
            socketConnectTimeoutMs: 10000,
            refreshIntervalMs: 30000,
            watchTimeoutMs: 25000,
            watchLimit: 100,
            retryDelayMs: 500,
            maxRetryAttempts: 0,
            clawToken: "",
            agentUserId: "",
            sessions: [],
            panels: [],
            allowFrom: [],
            mention: {
                requireInGroups: false
            },
            groups: {},
            replyDelayMode: "non-mention",
            replyDelayMs: 120000
        },
        dingtalk: {
            enabled: false,
            clientId: "",
            clientSecret: "",
            allowFrom: []
        },
        email: {
            enabled: false,
            consentGranted: false,
            imapHost: "",
            imapPort: 993,
            imapUsername: "",
            imapPassword: "",
            imapMailbox: "INBOX",
            imapUseSsl: true,
            smtpHost: "",
            smtpPort: 587,
            smtpUsername: "",
            smtpPassword: "",
            smtpUseTls: true,
            smtpUseSsl: false,
            fromAddress: "",
            autoReplyEnabled: true,
            pollIntervalSeconds: 30,
            markSeen: true,
            maxBodyChars: 12000,
            subjectPrefix: "Re: ",
            allowFrom: []
        },
        slack: {
            enabled: false,
            mode: "socket",
            webhookPath: "/slack/events",
            botToken: "",
            appToken: "",
            userTokenReadOnly: true,
            replyInThread: true,
            reactEmoji: "eyes",
            groupPolicy: "mention",
            groupAllowFrom: [],
            dm: {
                enabled: true,
                policy: "open",
                allowFrom: []
            }
        },
        qq: {
            enabled: false,
            appId: "",
            secret: "",
            allowFrom: []
        },
        matrix: {
            enabled: false,
            homeserver: "https://matrix.org",
            accessToken: "",
            userId: "",
            deviceId: "",
            e2eeEnabled: true,
            syncStopGraceSeconds: 2,
            maxMediaBytes: 20971520,
            allowFrom: [],
            groupPolicy: "open",
            groupAllowFrom: [],
            allowRoomMentions: false
        }
    },
    providers: {
        custom: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        anthropic: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        openai: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        openrouter: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        deepseek: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        groq: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        zhipu: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        dashscope: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        vllm: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        gemini: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        moonshot: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        minimax: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        aihubmix: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        siliconflow: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        volcengine: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        openaiCodex: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        },
        githubCopilot: {
            apiKey: "",
            apiBase: null,
            extraHeaders: null
        }
    },
    gateway: {
        host: "0.0.0.0",
        port: 18790
    },
    tools: {
        web: {
            search: {
                apiKey: "",
                maxResults: 5
            }
        },
        exec: {
            timeout: 60,
            pathAppend: ""
        },
        restrictToWorkspace: false,
        mcpServers: {}
    }
};
