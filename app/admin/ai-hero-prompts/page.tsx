"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PromptProfile = {
  id: string;
  name: string;
  system_instruction: string;
  user_prompt_template: string;
  language: string;
  style_guide?: string | null;
  forbidden_style?: string | null;
  max_sentences: number;
  is_active: boolean;
  updated_at?: string | null;
};

type FormState = {
  id?: string;
  name: string;
  system_instruction: string;
  user_prompt_template: string;
  language: string;
  style_guide: string;
  forbidden_style: string;
  max_sentences: string;
  is_active: boolean;
};

const defaultForm: FormState = {
  name: "Default Romantic Morning",
  system_instruction:
    "Kamu menulis hero message personal untuk aplikasi mood tracker romantis. Tulis singkat, hangat, natural, dan aman. Balas hanya JSON valid dengan field title, summary, message, tone.",
  user_prompt_template: [
    "Buat Hero Message pendek maksimal {{max_sentences}} kalimat.",
    "",
    "Gunakan bahasa {{language}} yang hangat dan natural.",
    "Jangan terdengar seperti motivator.",
    "Jangan terlalu formal.",
    "Jangan terlalu berlebihan.",
    "",
    "Style guide:",
    "{{style_guide}}",
    "",
    "Hindari gaya:",
    "{{forbidden_style}}",
    "",
    "Berdasarkan:",
    "User: {{user_name}}",
    "Mood Date: {{mood_date}}",
    "Mood Rating: {{mood_rating}}",
    "Mood Note:",
    "{{mood_note}}",
    "",
    "Tone hint: {{tone_hint}}",
    "",
    "Output harus JSON valid dengan field: title, summary, message, tone.",
  ].join("\n"),
  language: "id-ID",
  style_guide: "Romantis lembut, personal, seperti pesan kecil pagi hari. Boleh memakai sapaan natural, tapi jangan berlebihan.",
  forbidden_style: "Ceramah motivasi, terlalu formal, terlalu dramatis, toxic positivity, janji berlebihan.",
  max_sentences: "2",
  is_active: false,
};

function profileToForm(profile: PromptProfile): FormState {
  return {
    id: profile.id,
    name: profile.name,
    system_instruction: profile.system_instruction,
    user_prompt_template: profile.user_prompt_template,
    language: profile.language,
    style_guide: profile.style_guide ?? "",
    forbidden_style: profile.forbidden_style ?? "",
    max_sentences: String(profile.max_sentences),
    is_active: profile.is_active,
  };
}

function formToPayload(form: FormState) {
  return {
    name: form.name,
    system_instruction: form.system_instruction,
    user_prompt_template: form.user_prompt_template,
    language: form.language,
    style_guide: form.style_guide,
    forbidden_style: form.forbidden_style,
    max_sentences: Number(form.max_sentences) || 2,
    is_active: form.is_active,
  };
}

export default function AiHeroPromptsPage() {
  const [profiles, setProfiles] = useState<PromptProfile[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testRating, setTestRating] = useState("5");
  const [testNote, setTestNote] = useState("Hari ini capek, tapi masih berusaha pelan-pelan.");
  const [testResult, setTestResult] = useState<{
    renderedPrompt: string;
    generated: { title: string; summary: string; message: string; tone: string; generationSource: string; metadata?: unknown };
  } | null>(null);

  const activeProfile = useMemo(() => profiles.find((profile) => profile.is_active), [profiles]);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/ai-hero-prompts");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to fetch prompt profiles");
      setProfiles(json.profiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setTestResult(null);
  };

  const saveProfile = async () => {
    try {
      setBusy("save");
      setNotice(null);
      setError(null);
      const endpoint = form.id ? `/api/admin/ai-hero-prompts/${form.id}` : "/api/admin/ai-hero-prompts";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save prompt profile");
      setNotice(form.id ? "Prompt profile updated." : "Prompt profile created.");
      await fetchProfiles();
      if (!form.id) setForm(profileToForm(json.profile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  };

  const activateProfile = async (profile: PromptProfile) => {
    try {
      setBusy(`activate-${profile.id}`);
      setNotice(null);
      setError(null);
      const res = await fetch(`/api/admin/ai-hero-prompts/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, is_active: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to activate prompt profile");
      setNotice("Active prompt profile updated.");
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  };

  const deleteProfile = async (profile: PromptProfile) => {
    if (!confirm(`Delete prompt profile "${profile.name}"?`)) return;
    try {
      setBusy(`delete-${profile.id}`);
      setNotice(null);
      setError(null);
      const res = await fetch(`/api/admin/ai-hero-prompts/${profile.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete prompt profile");
      setNotice("Prompt profile deleted.");
      await fetchProfiles();
      if (form.id === profile.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  };

  const testPrompt = async () => {
    try {
      setBusy("test");
      setNotice(null);
      setError(null);
      setTestResult(null);
      const res = await fetch("/api/admin/ai-hero-prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: formToPayload(form),
          mood: {
            rating: Number(testRating) || 5,
            note: testNote,
            date: new Date().toISOString().slice(0, 10),
          },
          user_name: "Awa",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to test prompt");
      setTestResult(json);
      setNotice("Prompt tested without saving generated message.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">AI Hero Prompts</h1>
        <p className="mt-2 text-gray-600">Control the active Gemini prompt profile for daily AI hero messages.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Profiles</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{profiles.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Active Profile</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeProfile?.name ?? "Using code default"}</p>
        </div>
      </div>

      {notice && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Prompt Profiles</h2>
            <button onClick={resetForm} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800">
              New
            </button>
          </div>
          {loading ? (
            <p className="mt-6 text-sm text-gray-500">Loading profiles...</p>
          ) : (
            <div className="mt-4 space-y-3">
              {profiles.map((profile) => (
                <article key={profile.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setForm(profileToForm(profile))} className="min-w-0 text-left">
                      <p className="truncate font-bold text-gray-900">{profile.name}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">{profile.language} / max {profile.max_sentences}</p>
                    </button>
                    {profile.is_active && <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">active</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!profile.is_active && (
                      <button onClick={() => activateProfile(profile)} disabled={busy === `activate-${profile.id}`} className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-200 disabled:opacity-50">
                        Activate
                      </button>
                    )}
                    <button onClick={() => setForm(profileToForm(profile))} className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200">
                      Edit
                    </button>
                    {!profile.is_active && (
                      <button onClick={() => deleteProfile(profile)} disabled={busy === `delete-${profile.id}`} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50">
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{form.id ? "Edit Profile" : "New Profile"}</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{form.name || "Untitled Prompt"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={testPrompt} disabled={busy === "test"} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {busy === "test" ? "Testing..." : "Test Prompt"}
              </button>
              <button onClick={saveProfile} disabled={busy === "save"} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                {busy === "save" ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              Name
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Language
              <input value={form.language} onChange={(event) => updateField("language", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Max Sentences
              <input type="number" min="1" max="5" value={form.max_sentences} onChange={(event) => updateField("max_sentences", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 md:col-span-2">
              <input type="checkbox" checked={form.is_active} onChange={(event) => updateField("is_active", event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-purple-600" />
              Set as active profile after save
            </label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              System Instruction
              <textarea value={form.system_instruction} onChange={(event) => updateField("system_instruction", event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              User Prompt Template
              <textarea value={form.user_prompt_template} onChange={(event) => updateField("user_prompt_template", event.target.value)} rows={12} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Style Guide
              <textarea value={form.style_guide} onChange={(event) => updateField("style_guide", event.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Forbidden Style
              <textarea value={form.forbidden_style} onChange={(event) => updateField("forbidden_style", event.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Test Mood</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
              <label className="text-sm font-semibold text-gray-700">
                Rating
                <input type="number" min="1" max="10" value={testRating} onChange={(event) => setTestRating(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Note
                <input value={testNote} onChange={(event) => setTestNote(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </label>
            </div>
          </div>

          {testResult && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Rendered Prompt</p>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-3 text-xs leading-6 text-white">{testResult.renderedPrompt}</pre>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Generated Preview</p>
                <h3 className="mt-3 text-lg font-bold text-gray-900">{testResult.generated.title}</h3>
                <p className="mt-2 text-sm font-semibold text-gray-500">{testResult.generated.generationSource} / {testResult.generated.tone}</p>
                {testResult.generated.summary && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{testResult.generated.summary}</p>}
                <p className="mt-3 text-sm leading-6 text-gray-700">{testResult.generated.message}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
