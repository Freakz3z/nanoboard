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
    }
  }
};
