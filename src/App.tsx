import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ConfigEditor from "./pages/ConfigEditor";
import Logs from "./pages/Logs";
import Sessions from "./pages/Sessions";
import CodeEditor from "./pages/CodeEditor";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config" element={<ConfigEditor />} />
            <Route path="/code-editor" element={<CodeEditor />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
