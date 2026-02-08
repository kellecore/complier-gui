"use client";

import { useState, useEffect, useCallback } from "react";
import ContextManager from "./components/ContextManager";
import QualityCoach from "./components/QualityCoach";
import { useAppLanguage } from "./lib/i18n";

type CompileResponse = {
  system_prompt: string;
  user_prompt: string;
  plan: string;
  expanded_prompt: string;
  system_prompt_v2?: string;
  user_prompt_v2?: string;
  plan_v2?: string;
  expanded_prompt_v2?: string;
  ir: any;
  processing_ms: number;
};

type LLMSettings = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

const LLM_SETTINGS_KEY = "complier_gui_llm_settings";

const providerDefaults: Record<string, { baseUrl: string; model: string }> = {
  openai_compatible: { baseUrl: "", model: "" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "" },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com",
    model: "",
  },
};

export default function Home() {
  const { t } = useAppLanguage();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"system" | "user" | "plan" | "expanded" | "json" | "quality">("system");
  const [liveMode, setLiveMode] = useState(true);
  const [diagnostics, setDiagnostics] = useState(true);
  const [status, setStatus] = useState(t("Ready", "Hazır"));
  const [debouncedPrompt, setDebouncedPrompt] = useState("");
  const [llm, setLlm] = useState<LLMSettings>({
    provider: "openai_compatible",
    apiKey: "",
    baseUrl: "",
    model: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LLM_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setLlm((prev) => ({
        ...prev,
        ...parsed,
      }));
    } catch (_e) {
      // ignore
    }
  }, []);

  const saveLlmSettings = useCallback(() => {
    localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(llm));
    setStatus(t("LLM settings saved", "LLM ayarları kaydedildi"));
  }, [llm, t]);

  const applyProviderDefaults = useCallback((provider: string) => {
    const defaults = providerDefaults[provider] || providerDefaults.openai_compatible;
    setLlm((prev) => ({
      ...prev,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPrompt(prompt), 600);
    return () => clearTimeout(timer);
  }, [prompt]);

  useEffect(() => {
    if (liveMode && debouncedPrompt.trim()) {
      handleGenerate(debouncedPrompt);
    }
  }, [debouncedPrompt]);

  const handleGenerate = useCallback(async (textOverride?: string) => {
    const textToCompile = typeof textOverride === 'string' ? textOverride : prompt;
    if (!textToCompile.trim()) return;

    setLoading(true);
    setStatus(liveMode ? t("Live Compiling...", "Canlı Derleniyor...") : t("Generating (Fast)...", "Oluşturuluyor (Hızlı)..."));

    try {
      if (!liveMode) {
        const resV1 = await fetch("http://127.0.0.1:8080/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToCompile,
            diagnostics,
            v2: false,
            llm_provider: llm.provider,
            llm_api_key: llm.apiKey,
            llm_base_url: llm.baseUrl,
            llm_model: llm.model,
          }),
        });

        if (resV1.ok) {
          const dataV1 = await resV1.json();
          setResult(dataV1);
          setStatus(t("Reasoning with Advanced AI...", "Gelişmiş AI ile Analiz Ediliyor..."));
        }
      } else {
        setStatus(t("AI Thinking...", "AI Düşünüyor..."));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 190000);

      try {
        const resV2 = await fetch("http://127.0.0.1:8080/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToCompile,
            diagnostics,
            v2: true,
            render_v2_prompts: true,
            llm_provider: llm.provider,
            llm_api_key: llm.apiKey,
            llm_base_url: llm.baseUrl,
            llm_model: llm.model,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!resV2.ok) throw new Error(`API Error: ${resV2.status}`);

        const dataV2 = await resV2.json();
        setResult(dataV2);
        setStatus(t(`Done in ${dataV2.processing_ms}ms`, `${dataV2.processing_ms}ms'de Tamamlandı`));
      } catch (e: any) {
        if (e.name === 'AbortError') {
          throw new Error(t("Timeout: AI Model took too long to respond.", "Zaman Aşımı: AI Modeli yanıt vermesi çok uzun sürdü."));
        }
        throw e;
      }

    } catch (e: any) {
      console.error(e);
      setStatus(`${t("Error", "Hata")}: ${e.message || t("Connection Failed", "Bağlantı Başarısız")}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, diagnostics, liveMode, llm, t]);

  const tabLabels: Record<string, { en: string; tr: string }> = {
    system: { en: "System", tr: "Sistem" },
    user: { en: "User", tr: "Kullanıcı" },
    plan: { en: "Plan", tr: "Plan" },
    expanded: { en: "Expanded", tr: "Genişletilmiş" },
    json: { en: "JSON", tr: "JSON" },
    quality: { en: "Quality", tr: "Kalite" },
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="orb orb-blue absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] animate-float" style={{ animationDelay: "0s" }} />
      <div className="orb orb-purple absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] animate-float" style={{ animationDelay: "1.5s" }} />
      <div className="orb orb-pink absolute top-[50%] right-[10%] w-[20vw] h-[20vw] opacity-30 animate-float" style={{ animationDelay: "3s" }} />

      {/* Floating Main Container */}
      <div className="glass-card w-full max-w-7xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">

        {/* Header */}
        <header className="border-b border-[var(--separator)] bg-[var(--surface-overlay)] p-4 flex items-center justify-between backdrop-blur-apple">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-[var(--apple-blue)] blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-xl" />
              <div className="relative h-10 w-10 bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] rounded-xl flex items-center justify-center font-bold text-white shadow-lg hover-scale">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 18l6-6-6-6" />
                  <path d="M8 6l-6 6 6 6" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-title-3 text-[var(--foreground)]">{t("Prompt Compiler", "Prompt Derleyici")}</h1>
              <div className="text-caption">{t("AI Optimized", "AI Optimize")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all duration-300 ${
                liveMode
                  ? 'bg-[var(--apple-green)]/15 border border-[var(--apple-green)]/30 text-[var(--apple-green)]'
                  : 'bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--foreground-tertiary)]'
              }`}
            >
              <div className={`status-dot ${liveMode ? '' : 'offline'}`} style={{ width: 6, height: 6 }} />
              {liveMode ? t('LIVE', 'CANLI') : t('MANUAL', 'MANUEL')}
            </button>

            <div className="glass-light px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--foreground-secondary)] min-w-[120px] text-center">
              {status}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Input */}
          <div className="w-full md:w-[38%] p-5 flex flex-col gap-5 border-r border-[var(--separator)] bg-[var(--surface-overlay)]">

            <div className="flex-1 flex flex-col relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--apple-blue)]/5 to-[var(--apple-purple)]/5 rounded-2xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <textarea
                className="glass-input flex-1 w-full p-5 rounded-2xl resize-none font-mono text-sm leading-relaxed focus-ring"
                placeholder={t("Describe your prompt idea here... e.g. 'Act as a senior python dev teaching FastAPI'", "Prompt fikrinizi buraya yazın... örn. 'FastAPI öğreten kıdemli bir python geliştirici gibi davran'")}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-card p-4 space-y-3">
                <div className="text-caption">{t("LLM Settings", "LLM Ayarları")}</div>

                <select
                  className="glass-input w-full text-sm"
                  value={llm.provider}
                  onChange={(e) => applyProviderDefaults(e.target.value)}
                >
                  <option value="openai_compatible">OpenAI-Compatible</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Gemini</option>
                </select>

                <input
                  className="glass-input w-full text-sm"
                  placeholder={t("Base URL", "Temel URL")}
                  value={llm.baseUrl}
                  onChange={(e) => setLlm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
                <input
                  className="glass-input w-full text-sm"
                  placeholder={t("Model", "Model")}
                  value={llm.model}
                  onChange={(e) => setLlm((prev) => ({ ...prev, model: e.target.value }))}
                />
                <input
                  type="password"
                  className="glass-input w-full text-sm"
                  placeholder={t("API Key", "API Anahtarı")}
                  value={llm.apiKey}
                  onChange={(e) => setLlm((prev) => ({ ...prev, apiKey: e.target.value }))}
                />
                <button
                  onClick={saveLlmSettings}
                  className="btn btn-secondary w-full text-sm"
                >
                  {t("Save LLM Settings", "LLM Ayarlarını Kaydet")}
                </button>
              </div>

              <button
                onClick={() => handleGenerate()}
                disabled={loading}
                className="btn btn-primary w-full py-3.5 text-base font-semibold group"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("Thinking...", "Düşünüyor...")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {t("Generate", "Oluştur")}
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>
            </div>

            {/* Context Manager */}
            <ContextManager onInsertContext={(text) => setPrompt(prev => prev + "\n\n---\nContext:\n" + text)} />
          </div>

          {/* Right Panel: Output */}
          <div className="w-full md:w-[62%] flex flex-col bg-[var(--surface-overlay)] relative">
            {result ? (
              <>
                {/* Tabs */}
                <div className="flex border-b border-[var(--separator)] px-4 pt-4 gap-1 overflow-x-auto scrollbar-hide">
                  {(["system", "user", "plan", "expanded", "json", "quality"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all relative whitespace-nowrap ${
                        activeTab === tab
                          ? "text-[var(--foreground)] bg-[var(--input-bg-hover)] border-t border-x border-[var(--glass-border-light)]"
                          : "text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] hover:bg-[var(--input-bg)]"
                      }`}
                    >
                      {t(tabLabels[tab].en, tabLabels[tab].tr)}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--apple-blue)] rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-0 overflow-hidden relative group">
                  {activeTab !== "quality" && activeTab !== "json" && (
                    <>
                      <div className="absolute top-4 right-6 z-10 opacity-60 hover:opacity-100 transition-opacity">
                        {result.system_prompt_v2 ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--apple-blue)]/10 border border-[var(--apple-blue)]/20">
                            <div className="status-dot" style={{ width: 6, height: 6, background: 'var(--apple-blue)', boxShadow: '0 0 8px var(--apple-blue)' }} />
                            <span className="text-xs font-medium text-[var(--apple-blue)]">{t("Reasoning Model", "Akıl Yürütme Modeli")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--input-bg)] border border-[var(--glass-border)]">
                            <div className="status-dot offline" style={{ width: 6, height: 6 }} />
                            <span className="text-xs font-medium text-[var(--foreground-tertiary)]">{t("Standard", "Standart")}</span>
                          </div>
                        )}
                      </div>

                      <textarea
                        className="w-full h-full bg-transparent p-6 font-mono text-sm text-[var(--foreground-secondary)] resize-none focus:outline-none leading-relaxed selection:bg-[var(--apple-blue)]/30"
                        readOnly
                        value={
                          activeTab === "system" ? (result.system_prompt_v2 || result.system_prompt) :
                            activeTab === "user" ? (result.user_prompt_v2 || result.user_prompt) :
                              activeTab === "plan" ? (result.plan_v2 || result.plan) :
                                (result.expanded_prompt_v2 || result.expanded_prompt)
                        }
                      />

                      <button
                        onClick={() => navigator.clipboard.writeText(
                          activeTab === "system" ? (result.system_prompt_v2 || result.system_prompt) :
                            activeTab === "user" ? (result.user_prompt_v2 || result.user_prompt) :
                              activeTab === "plan" ? (result.plan_v2 || result.plan) :
                                (result.expanded_prompt_v2 || result.expanded_prompt)
                        )}
                        className="btn btn-primary absolute bottom-6 right-6 p-3 rounded-xl hover-lift z-20"
                        title={t("Copy to Clipboard", "Panoya Kopyala")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </>
                  )}

                  {activeTab === "json" && (
                    <div className="absolute inset-0 z-20 overflow-auto p-6">
                      <pre className="glass-light p-4 rounded-xl text-xs font-mono text-[var(--foreground-secondary)] overflow-auto h-full">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {activeTab === "quality" && (
                    <div className="absolute inset-0 z-20">
                      <QualityCoach
                        prompt={prompt}
                        onUpdatePrompt={setPrompt}
                        llmConfig={{
                          provider: llm.provider,
                          apiKey: llm.apiKey,
                          baseUrl: llm.baseUrl,
                          model: llm.model,
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10 text-center animate-fade-in">
                <div className="relative group">
                  <div className="absolute inset-0 bg-[var(--apple-blue)]/20 blur-[60px] rounded-full group-hover:bg-[var(--apple-blue)]/30 transition-all duration-700" />
                  <div className="relative w-28 h-28 rounded-3xl glass-card flex items-center justify-center shadow-2xl hover-lift group-hover:shadow-[var(--shadow-glow)] transition-all duration-500">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-float">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--apple-blue)" />
                          <stop offset="100%" stopColor="var(--apple-purple)" />
                        </linearGradient>
                      </defs>
                      <path d="M16 18l6-6-6-6" />
                      <path d="M8 6l-6 6 6 6" />
                    </svg>
                  </div>
                </div>
                <div className="max-w-sm space-y-3">
                  <h3 className="text-title-2 text-[var(--foreground)]">{t("Ready to Compile", "Derlemeye Hazır")}</h3>
                  <p className="text-body text-[var(--foreground-tertiary)]">
                    {t("Enter a prompt to generate optimized system instructions, planning, and structured reasoning.", "Optimize edilmiş sistem talimatları, planlama ve yapılandırılmış akıl yürütme oluşturmak için bir prompt girin.")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
