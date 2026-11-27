import { AiUnavailableError, callJson } from "./client";
import * as P from "./prompts";
import * as S from "./schemas";
import { detectScopeFallback, heuristicBrief, outlookFallback, outlookSignals, type OutlookSignals } from "../heuristics";
import { fairPrice, type MatchScore, type PriceVerdict } from "../scoring";
import type { FreelancerDTO, ProjectCriteria, ScopeAnalysis, StructuredBrief } from "../types";

export type Source = "ai" | "fallback";

async function tryAi<T>(run: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await run() };
  } catch (e) {
    if (!(e instanceof AiUnavailableError)) console.warn("[ai] unexpected error:", (e as Error).message);
    return { ok: false };
  }
}

/* 1. Brief translator */
export async function translateBrief(raw: string, answers: { q: string; a: string }[], vocabulary: string[]) {
  const r = await tryAi(() =>
    callJson({ system: P.BRIEF_SYSTEM(vocabulary), user: P.BRIEF_USER(raw, answers), schema: S.BriefSchema, temperature: 0.2, maxTokens: 1200 }),
  );
  if (r.ok) return { brief: r.value as StructuredBrief, source: "ai" as Source };
  const text = answers.length ? `${raw}\n${answers.map((a) => a.a).join(". ")}` : raw;
  return { brief: heuristicBrief(text), source: "fallback" as Source };
}

/* 2. Fair-price meter. The verdict is deterministic; the model only writes the reason. */
export async function fairPriceReason(budget: number, range: { low: number; high: number }, title: string) {
  const verdict: PriceVerdict = fairPrice(budget, range);
  const fallback = {
    low: `Your budget of $${budget.toLocaleString("en-US")} is below the suggested range of $${range.low.toLocaleString("en-US")} to $${range.high.toLocaleString("en-US")}, so fewer freelancers will fit.`,
    fair: `Your budget of $${budget.toLocaleString("en-US")} sits within the suggested range of $${range.low.toLocaleString("en-US")} to $${range.high.toLocaleString("en-US")}.`,
    generous: `Your budget of $${budget.toLocaleString("en-US")} is above the suggested range of $${range.low.toLocaleString("en-US")} to $${range.high.toLocaleString("en-US")}.`,
  }[verdict];
  const r = await tryAi(() =>
    callJson({
      system: P.FAIR_PRICE_SYSTEM,
      user: JSON.stringify({ project: title, budget, suggestedRange: range, verdict }),
      schema: S.FairPriceSchema, temperature: 0.1, maxTokens: 200,
    }),
  );
  return { verdict, reason: r.ok ? r.value.reason : fallback, source: (r.ok ? "ai" : "fallback") as Source };
}

/* 3. Match explanations (scores are computed elsewhere, deterministically) */
export type Explanation = { explanation: string; watchOut: string; source: Source };

export function deterministicExplanation(f: FreelancerDTO, s: MatchScore, required: string[]): Explanation {
  const matched = s.matchedSkills;
  const explanation = required.length
    ? `Covers ${matched.length} of ${required.length} required skills${matched.length ? ` (${matched.slice(0, 4).join(", ")})` : ""}, with ${f.yearsExperience} years of experience.`
    : `${f.yearsExperience} years of experience in ${f.category.toLowerCase()}.`;
  const watchOut = s.gaps.length
    ? `${s.gaps[0].label.charAt(0).toUpperCase()}${s.gaps[0].label.slice(1)}.`
    : "No gaps found against this brief's skills, budget or schedule.";
  return { explanation, watchOut, source: "fallback" };
}

/** Every number the model writes must appear in the data we sent it, otherwise we discard the text. */
function numbersGrounded(text: string, haystack: string) {
  const allowed = new Set((haystack.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []));
  const used = text.replace(/(\d),(\d)/g, "$1$2").match(/\d+(?:\.\d+)?/g) ?? [];
  return used.every((n) => allowed.has(n));
}

export async function explainMatches(
  brief: StructuredBrief,
  criteria: ProjectCriteria,
  candidates: { freelancer: FreelancerDTO; score: MatchScore }[],
): Promise<{ explanations: Record<string, Explanation>; source: Source }> {
  const fallback: Record<string, Explanation> = {};
  for (const c of candidates) fallback[c.freelancer.id] = deterministicExplanation(c.freelancer, c.score, criteria.requiredSkills);

  const payload = {
    brief: {
      title: brief.title, summary: brief.summary, deliverables: brief.deliverables, requiredSkills: criteria.requiredSkills,
      budget: criteria.budget, deadlineDays: criteria.deadlineDays, estimatedHours: criteria.estimatedHours, minExperienceYears: criteria.minExperience,
    },
    candidates: candidates.map(({ freelancer: f, score: s }) => ({
      freelancerId: f.id, name: f.name, headline: f.headline, skills: f.skills, yearsExperience: f.yearsExperience,
      hourlyRate: f.hourlyRate, timezone: f.timezone, availabilityHoursPerWeek: f.availabilityHoursPerWeek,
      communicationStyle: f.communicationStyle, revisionApproach: f.revisionApproach,
      portfolio: f.portfolio.map((p) => ({ title: p.title, problem: p.problem, result: p.result, tags: p.tags })),
      fitAnalysis: { matchedSkills: s.matchedSkills, missingSkills: s.missingSkills, gaps: s.gaps.map((g) => g.label) },
    })),
  };
  const user = JSON.stringify(payload, null, 1);
  const r = await tryAi(() => callJson({ system: P.EXPLAIN_SYSTEM, user, schema: S.ExplainSchema, temperature: 0.2, maxTokens: 1400 }));
  if (!r.ok) return { explanations: fallback, source: "fallback" };

  const out = { ...fallback };
  let any = false;
  for (const m of r.value.matches) {
    if (!(m.freelancerId in fallback)) continue;
    if (!numbersGrounded(`${m.explanation} ${m.watchOut}`, user)) continue;
    out[m.freelancerId] = { explanation: m.explanation, watchOut: m.watchOut, source: "ai" };
    any = true;
  }
  return { explanations: out, source: any ? "ai" : "fallback" };
}

/* 4. Project outlook: rating is deterministic, the model explains it */
export async function projectOutlook(p: {
  brief: StructuredBrief; rawBrief: string; budget: number; estimatedHours: number; deadlineDays: number;
}) {
  const signals: OutlookSignals = outlookSignals({
    brief: p.brief, rawBriefLength: p.rawBrief.length, budget: p.budget, estimatedHours: p.estimatedHours, deadlineDays: p.deadlineDays,
  });
  const fb = outlookFallback(signals);
  const r = await tryAi(() =>
    callJson({
      system: P.OUTLOOK_SYSTEM,
      user: JSON.stringify({
        rating: signals.rating,
        signals: {
          scopeClarityPercent: Math.round(signals.scopeClarity * 100), impliedHourlyRateUsd: Math.round(signals.hourlyImplied),
          hoursPerWeekNeeded: Math.round(signals.hoursPerWeek), weakest: signals.weakest,
        },
        brief: { title: p.brief.title, deliverables: p.brief.deliverables, openQuestions: p.brief.missingInfo },
        budget: p.budget, estimatedHours: p.estimatedHours, deadlineDays: p.deadlineDays,
      }),
      schema: S.OutlookSchema, temperature: 0.2, maxTokens: 400,
    }),
  );
  return {
    rating: signals.rating, signals,
    reason: r.ok ? r.value.reason : fb.reason, fix: r.ok ? r.value.fix : fb.fix,
    source: (r.ok ? "ai" : "fallback") as Source,
  };
}

/* 5. Scope-creep detector */
export async function detectScope(p: {
  message: string; brief: StructuredBrief; history: { sender: string; body: string }[]; freelancerRate: number;
}): Promise<ScopeAnalysis> {
  const r = await tryAi(() =>
    callJson({
      system: P.SCOPE_SYSTEM,
      user: JSON.stringify({
        agreedBrief: { title: p.brief.title, summary: p.brief.summary, deliverables: p.brief.deliverables },
        recentMessages: p.history.slice(-6),
        newClientMessage: p.message,
      }),
      schema: S.ScopeSchema, temperature: 0.1, maxTokens: 700,
    }),
  );
  if (!r.ok) return detectScopeFallback(p.message, p.brief, p.freelancerRate);
  const v = r.value;
  if (!v.isScopeCreep) return { isScopeCreep: false, reason: v.reason, addedWork: [], source: "ai" };
  const q = v.miniQuote;
  return {
    isScopeCreep: true, reason: v.reason, addedWork: v.addedWork, source: "ai", quoteStatus: "draft",
    miniQuote: q
      ? { message: q.message, price: Math.round(q.hours * p.freelancerRate), days: q.days }
      : detectScopeFallback(p.message, p.brief, p.freelancerRate).miniQuote,
  };
}

/* 6. Proposal coach */
export type Coaching = { missing: string[]; generic: string[]; improvedOpener: string; source: Source };

const GENERIC = /(passionate|team player|hard[- ]working|dear sir|i am writing to|perfect candidate|ideal candidate|results[- ]driven|extra mile|best price|i would love to|i'd love to|years of experience)/gi;
const words = (t: string) => (t.toLowerCase().match(/[a-z]{5,}/g) ?? []);

export function coachFallback(brief: StructuredBrief, draft: string, f: FreelancerDTO, clientName: string): Coaching {
  const generic = Array.from(new Set((draft.match(GENERIC) ?? []).map((g) => `"${g.toLowerCase()}" could be sent to any client`))).slice(0, 3);
  const missing: string[] = [];
  const dw = new Set(words(draft));
  const mentionsDeliverable = brief.deliverables.some((d) => words(d).some((w) => dw.has(w)));
  if (!mentionsDeliverable) missing.push("Name at least one deliverable from the brief so the client sees you read it.");
  if (!/\d/.test(draft) && !/(week|day)/i.test(draft)) missing.push("State a timeline or the first thing you would deliver.");
  const tagWords = f.portfolio.flatMap((p) => [p.title, ...p.tags]).flatMap(words);
  if (!tagWords.some((w) => dw.has(w))) {
    const ex = f.portfolio[0];
    if (ex) missing.push(`Point to one relevant example from your portfolio, such as "${ex.title}".`);
  }
  if (brief.missingInfo[0] && !draft.includes("?")) missing.push(`Ask about the open point: ${brief.missingInfo[0]}`);
  if (draft.trim().length < 200) missing.push("The draft is short; add your approach in two or three sentences.");
  const first = clientName.split(" ")[0];
  const best = f.portfolio.find((p) => p.tags.some((t) => brief.requiredSkills.some((s) => s.toLowerCase() === t.toLowerCase()))) ?? f.portfolio[0];
  const improvedOpener = `Hi ${first}, I read your brief for "${brief.title}". I would start with ${brief.deliverables[0].toLowerCase()}.${
    best ? ` I did similar work on "${best.title}": ${best.result.charAt(0).toLowerCase()}${best.result.slice(1)}` : ""
  }`;
  return { missing: missing.slice(0, 3), generic, improvedOpener, source: "fallback" };
}

export async function coachProposal(brief: StructuredBrief, draft: string, f: FreelancerDTO, clientName: string): Promise<Coaching> {
  const r = await tryAi(() =>
    callJson({
      system: P.COACH_SYSTEM,
      user: JSON.stringify({
        brief: { title: brief.title, summary: brief.summary, deliverables: brief.deliverables, openQuestions: brief.missingInfo },
        clientName,
        freelancer: { name: f.name, headline: f.headline, skills: f.skills, portfolio: f.portfolio.map((p) => ({ title: p.title, problem: p.problem, result: p.result })) },
        draft,
      }),
      schema: S.CoachSchema, temperature: 0.3, maxTokens: 800,
    }),
  );
  return r.ok ? { ...r.value, source: "ai" } : coachFallback(brief, draft, f, clientName);
}

/* 7. Chat recap */
export type Recap = { agreed: string[]; changes: string[]; open: string[]; source: Source };

export function recapFallback(
  brief: StructuredBrief,
  msgs: { senderRole: string; body: string; scope?: ScopeAnalysis; quote?: { status: string; price: number } }[],
): Recap {
  const agreed: string[] = [`Scope: ${brief.deliverables.length} deliverables as listed in the brief`];
  for (const m of msgs) {
    if (!m.scope?.isScopeCreep && /\b(agreed|confirmed|sounds good|perfect|deal)\b/i.test(m.body)) {
      agreed.push(m.body.replace(/\s+/g, " ").slice(0, 140));
    }
  }
  const changes = msgs.filter((m) => m.scope?.isScopeCreep).map(
    (m) => `Client asked for ${m.scope!.addedWork.join(", ").toLowerCase() || "extra work"}; ${m.scope!.quoteStatus === "sent" ? "quote sent" : "no quote sent yet"}`,
  );
  const last = [...msgs].reverse().find((m) => m.senderRole === "client" && m.body.includes("?"));
  const open = last ? [`Unanswered: ${last.body.replace(/\s+/g, " ").slice(0, 120)}`] : [];
  return { agreed: agreed.slice(0, 5), changes, open, source: "fallback" };
}

export async function recapChat(
  brief: StructuredBrief,
  msgs: { sender: string; senderRole: string; body: string; scope?: ScopeAnalysis; quote?: { status: string; price: number; days: number } }[],
): Promise<Recap> {
  const r = await tryAi(() =>
    callJson({
      system: P.RECAP_SYSTEM,
      user: JSON.stringify({
        agreedBrief: { title: brief.title, deliverables: brief.deliverables },
        messages: msgs.map((m) => ({
          from: `${m.sender} (${m.senderRole})`, text: m.body,
          ...(m.scope?.isScopeCreep ? { flaggedAsExtraWork: m.scope.addedWork, quoteStatus: m.scope.quoteStatus } : {}),
          ...(m.quote ? { quote: m.quote } : {}),
        })),
      }),
      schema: S.RecapSchema, temperature: 0.2, maxTokens: 800,
    }),
  );
  return r.ok ? { ...r.value, source: "ai" } : recapFallback(brief, msgs);
}

