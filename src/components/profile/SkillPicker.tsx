"use client";
import { useId, useMemo, useState } from "react";
import { SKILL_CATALOG } from "@/lib/skillCatalog";

export type SkillValue = { name: string; level: "beginner" | "intermediate" | "expert" };

/** Searchable multi-select. Type to filter the catalog; Enter adds the highlighted match or your own text. */
export function SkillPicker({
  value, onChange, extra = [], withLevels = false, label = "Skills", max = 40, error,
}: { value: { name: string; level?: SkillValue["level"] }[]; onChange: (v: SkillValue[]) => void; extra?: string[]; withLevels?: boolean; label?: string; max?: number; error?: string | null }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const chosen = useMemo(() => new Set(value.map((v) => v.name.toLowerCase())), [value]);
  const all = useMemo(() => Array.from(new Set([...SKILL_CATALOG, ...extra])), [extra]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((s) => !chosen.has(s.toLowerCase()) && (!t || s.toLowerCase().includes(t))).slice(0, 8);
  }, [q, all, chosen]);
  const typed = q.trim();
  const canCreate = typed.length > 0 && typed.length <= 40 && !chosen.has(typed.toLowerCase()) && !all.some((s) => s.toLowerCase() === typed.toLowerCase());
  const options = [...matches, ...(canCreate ? [typed] : [])];

  function add(name: string) {
    if (value.length >= max) return;
    onChange([...value.map((v) => ({ name: v.name, level: v.level ?? "intermediate" })), { name, level: "intermediate" }]);
    setQ("");
    setActive(0);
  }
  const remove = (name: string) => onChange(value.filter((v) => v.name !== name).map((v) => ({ name: v.name, level: v.level ?? "intermediate" })));
  const setLevel = (name: string, level: SkillValue["level"]) => onChange(value.map((v) => ({ name: v.name, level: v.name === name ? level : v.level ?? "intermediate" })));

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[active]) add(options[active]); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !q && value.length) remove(value[value.length - 1].name);
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative mt-1">
        <input
          id={id} role="combobox" aria-expanded={open && options.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined} aria-invalid={!!error}
          className={`field ${error ? "!border-risk" : ""}`} placeholder="Search skills, e.g. React, Figma, Python" autoComplete="off"
          value={q} onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={onKey}
        />
        {open && options.length > 0 && (
          <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg">
            {options.map((o, i) => (
              <li
                key={o} id={`${id}-o${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); add(o); }} onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded px-3 py-2 text-sm ${i === active ? "bg-sunken" : ""}`}
              >
                {canCreate && i === options.length - 1 ? <>Add &ldquo;{o}&rdquo;</> : o}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-risk">{error}</p>}
      {value.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No skills yet. Add at least one so we can match you.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected skills">
          {value.map((s) => (
            <li key={s.name} className="chip chip-accent !py-1 gap-2">
              <span>{s.name}</span>
              {withLevels && (
                <select aria-label={`Level for ${s.name}`} value={s.level ?? "intermediate"} onChange={(e) => setLevel(s.name, e.target.value as SkillValue["level"])} className="rounded border border-line bg-surface px-1 text-xs text-ink">
                  <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option>
                </select>
              )}
              <button type="button" onClick={() => remove(s.name)} aria-label={`Remove ${s.name}`} className="text-base leading-none hover:text-risk">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
