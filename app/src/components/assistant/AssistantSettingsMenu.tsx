"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TENANT } from "@/config/platform";

type SettingsPanel = "connectors" | "personalization" | "instructions" | "memories" | null;

export function AssistantSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<SettingsPanel>(null);
  const [settings, setSettings] = useState({
    custom_instructions: "",
    memories: [] as { id: string; text: string; created_at: string }[],
    personalization: { tone: "professional", focus: "federal_and_illinois" } as Record<string, string>,
    connector_prefs: {} as Record<string, boolean>,
  });
  const [memoryInput, setMemoryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/assistant/settings");
    const data = (await res.json()) as { settings?: typeof settings };
    if (data.settings) {
      setSettings({
        custom_instructions: data.settings.custom_instructions ?? "",
        memories: data.settings.memories ?? [],
        personalization: (data.settings.personalization as Record<string, string>) ?? {
          tone: "professional",
          focus: "federal_and_illinois",
        },
        connector_prefs: (data.settings.connector_prefs as Record<string, boolean>) ?? {},
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPanel(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function save(patch: Partial<typeof settings> & { add_memory?: string }) {
    setSaving(true);
    try {
      const res = await fetch("/api/assistant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { settings?: typeof settings };
      if (data.settings) {
        setSettings({
          custom_instructions: data.settings.custom_instructions ?? "",
          memories: data.settings.memories ?? [],
          personalization: (data.settings.personalization as Record<string, string>) ?? {},
          connector_prefs: (data.settings.connector_prefs as Record<string, boolean>) ?? {},
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const menuItems: { id: SettingsPanel; label: string; icon: string }[] = [
    { id: "connectors", label: "Connectors", icon: "⎔" },
    { id: "personalization", label: "Personalization", icon: "◎" },
    { id: "instructions", label: "Custom Instructions", icon: "✦" },
    { id: "memories", label: "Memories", icon: "◉" },
  ];

  return (
    <div ref={menuRef} className="relative mt-auto border-t border-border p-2">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setPanel(null);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-muted hover:bg-bg"
      >
        <span>⚙</span> Settings
      </button>

      {open && !panel && (
        <div className="absolute bottom-full left-2 right-2 z-30 mb-1 overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPanel(item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-gold/[0.06]"
            >
              <span className="text-gold">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {open && panel && (
        <div className="absolute bottom-full left-2 right-2 z-30 mb-1 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-bg-surface p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold capitalize text-text">{panel}</p>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="text-xs text-text-muted hover:text-text"
            >
              Back
            </button>
          </div>

          {panel === "connectors" && (
            <div className="space-y-2 text-xs">
              {["sam", "grants_gov", "bidbuy_il", "georgia", "bonfire"].map((c) => (
                <label key={c} className="flex items-center justify-between gap-2">
                  <span className="uppercase text-text-muted">{c.replace("_", " ")}</span>
                  <input
                    type="checkbox"
                    checked={settings.connector_prefs[c] !== false}
                    onChange={(e) =>
                      void save({
                        connector_prefs: { ...settings.connector_prefs, [c]: e.target.checked },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          )}

          {panel === "personalization" && (
            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="text-text-muted">Capture focus</span>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5"
                  value={settings.personalization.focus ?? "federal_and_illinois"}
                  onChange={(e) =>
                    void save({
                      personalization: { ...settings.personalization, focus: e.target.value },
                    })
                  }
                >
                  <option value="federal_and_illinois">Federal + Illinois home state</option>
                  <option value="federal_only">Federal only</option>
                  <option value="sled_priority">SLED priority</option>
                  <option value="grants">Grants focus</option>
                </select>
              </label>
              <label className="block">
                <span className="text-text-muted">Tone</span>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5"
                  value={settings.personalization.tone ?? "professional"}
                  onChange={(e) =>
                    void save({
                      personalization: { ...settings.personalization, tone: e.target.value },
                    })
                  }
                >
                  <option value="professional">Professional & concise</option>
                  <option value="executive">Executive brief</option>
                  <option value="detailed">Detailed analyst</option>
                </select>
              </label>
            </div>
          )}

          {panel === "instructions" && (
            <div className="space-y-2 text-xs">
              <textarea
                rows={6}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                placeholder={`How should ${TENANT.assistantName} support your capture team?`}
                value={settings.custom_instructions}
                onChange={(e) => setSettings((s) => ({ ...s, custom_instructions: e.target.value }))}
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void save({ custom_instructions: settings.custom_instructions })}
                className="rounded-lg bg-sidebar px-3 py-1.5 text-xs font-medium text-white"
              >
                Save instructions
              </button>
            </div>
          )}

          {panel === "memories" && (
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <input
                  value={memoryInput}
                  onChange={(e) => setMemoryInput(e.target.value)}
                  placeholder="Add a memory…"
                  className="flex-1 rounded-lg border border-border bg-bg px-2 py-1.5"
                />
                <button
                  type="button"
                  disabled={!memoryInput.trim() || saving}
                  onClick={() => {
                    void save({ add_memory: memoryInput }).then(() => setMemoryInput(""));
                  }}
                  className="rounded-lg bg-gold/15 px-2 py-1.5 text-gold"
                >
                  Add
                </button>
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {settings.memories.map((m) => (
                  <li key={m.id} className="rounded-lg bg-bg px-2 py-1.5 text-text-muted">
                    {m.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
