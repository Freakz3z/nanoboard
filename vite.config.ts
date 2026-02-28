import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // 路径别名配置
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // 构建优化配置
  build: {
    // 调整 chunk 大小警告阈值
    chunkSizeWarningLimit: 800,
    
    // Rollup 配置
    rollupOptions: {
      output: {
        // 手动分割 chunk 以优化加载性能
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库
          'ui-vendor': ['lucide-react', 'react-markdown', 'remark-gfm'],
          // Tauri API
          'tauri': ['@tauri-apps/api'],
          // 图表库
          'charts': ['recharts'],
        },
      },
    },
    
    // 代码分割策略
    target: 'esnext',
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生成 source maps 用于生产环境调试（可选）
    sourcemap: false,
  },
}));
