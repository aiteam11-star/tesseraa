/**
 * Rule-based fallbacks used when the AI is unavailable (no key, network error, invalid output).
 * They keep the demo working end to end. They are deliberately simple and say so in the UI.
 */
import type { ProjectCriteria, ScopeAnalysis, StructuredBrief } from "./types";
import { normalizeSkill } from "./scoring";

const SKILL_RULES: [RegExp, string[]][] = [
  [/\b(book(ing|ings)?|checkout|payments?|stripe|subscription)\b/i, ["Stripe"]],
  [/\b(website|web ?site|web app|portal|landing page|storefront)\b/i, ["React", "Next.js"]],
  [/\b(mobile|ios|android)\b/i, ["React Native"]],
  [/\b(dashboard|charts?|reports?|analytics|metrics)\b/i, ["Data visualization", "Analytics"]],
  [/\b(spreadsheets?|database|sql|exports?)\b/i, ["SQL"]],
  [/\b(predict(ion)?|machine learning|forecast(ing)?|model)\b/i, ["Machine learning", "Python"]],
  [/\b(logo|brand(ing)?|identity)\b/i, ["Brand identity", "Logo design"]],
  [/\b(ui|ux|figma|mockups?|wireframes?|interface)\b/i, ["UI design", "Figma"]],
  [/\b(blog|copy|copywriting|articles?|newsletters?|website copy)\b/i, ["Copywriting", "Content strategy"]],
  [/\b(seo|google|search)\b/i, ["SEO"]],
  [/\b(newsletters?|email (list|campaigns?|marketing|sequences?))\b/i, ["Email marketing"]],
  [/\b(video|film|footage|edit(ing)?)\b/i, ["Video editing", "Storytelling"]],
  [/\b(animat(ion|ed)|motion|explainer)\b/i, ["Motion graphics", "Animation"]],
  [/\b(docs|documentation|api docs)\b/i, ["Technical writing", "Documentation"]],
  [/\b(social media|tiktok|social posts?)\b/i, ["Social media"]],
  [/\b(accessib\w+)\b/i, ["Accessibility"]],
];

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
};

export function parseBudget(text: string): number | null {
  const m = text.match(/(?:\$|usd\s?|budget[^.\d$]{0,25}?|around |about )\s?(\d[\d,]*(?:\.\d+)?)\s?(k)?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (m[2]) n *= 1000;
  return n >= 100 ? Math.round(n) : null;
}

export function parseTimelineDays(text: string): number | null {
  const m = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)[\s-]*(day|week|month)s?\b/i);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUM_WORDS[m[1].toLowerCase()];
  const unit = m[2].toLowerCase();
  return n * (unit === "day" ? 1 : unit === "week" ? 7 : 30);
}

const ASSETS: [RegExp, string, number][] = [
  [/\b(web ?site|web app|portal|storefront|landing page)\b/i, "Website", 60],
  [/\b(mobile app|ios|android|app)\b/i, "App", 100],
  [/\b(dashboard|reporting|analytics)\b/i, "Dashboard", 50],
  [/\b(video|film|footage)\b/i, "Video", 45],
  [/\b(logo|brand(ing)?|identity)\b/i, "Brand identity", 35],
  [/\b(blog|newsletters?|articles?|content)\b/i, "Content", 30],
  [/\b(animat(ion|ed)|motion|explainer)\b/i, "Animation", 40],
];

function subjectOf(first: string) {
  const m = first.match(/^(?:we|i)\s+(?:run|own|are|have|make|sell|manage)\s+(?:an?\s+|the\s+|our\s+)?(.+?)(?:\s+and\b|,|\s+which\b|\s+that\b|\.|$)/i);
  return m?.[1]?.trim().toLowerCase() ?? null;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const sentences = (t: string) => t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

export function heuristicBrief(raw: string): StructuredBrief {
  const text = raw.trim();
  const sents = sentences(text);
  const skills: string[] = [];
  for (const [re, list] of SKILL_RULES) if (re.test(text)) for (const s of list) if (!skills.includes(s)) skills.push(s);
  const requiredSkills = skills.slice(0, 6);

  const logistics = /\bbudget\b|\$\s?\d|\blive in\b|\bdeadline\b|\bturnaround\b/i;
  const asks = sents.filter((s) => /\b(need|want|looking|should|must|add|build|create|write|design|plan|see)\b/i.test(s) && !logistics.test(s));
  const deliverables = (asks.length ? asks : sents)
    .map((s) =>
      s.replace(/^(we|i)\s+(also\s+)?(need|want|are looking for|would like)( to)?\s+/i, "").replace(/[.!?]+$/, ""),
    )
    .map((s) => s.replace(/^(need|want)\s+/i, ""))
    .map((s) => (s.length > 90 ? s.slice(0, 87).trimEnd() + "..." : s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 5);

  const first = sents[0] ?? "New project";
  const asset = ASSETS.find(([re]) => re.test(text));
  const subject = subjectOf(first);
  const words = first.replace(/[.!?]+$/, "").split(" ");
  const title = asset
    ? subject && subject.split(" ").length <= 4 ? `${asset[1]} for ${subject}` : `${asset[1]} project`
    : words.slice(0, 8).join(" ") + (words.length > 8 ? "..." : "");

  const stated = parseBudget(text);
  const days = parseTimelineDays(text);
  const hours = Math.min(240, Math.max(12, (asset?.[2] ?? 30) + Math.max(0, requiredSkills.length - 2) * 6 + Math.max(0, deliverables.length - 2) * 8));
  const range = { low: roundTo(hours * 55, 50), high: roundTo(hours * 95, 50) };
  const tone = /premium|luxury/i.test(text) ? "Premium and confident"
    : /friendly|warm|fun/i.test(text) ? "Friendly and warm"
    : /serious|formal|professional/i.test(text) ? "Formal and professional"
    : "Clear and professional";

  const missingInfo: string[] = [];
  if (stated === null) missingInfo.push("What budget range do you have in mind?");
  if (days === null) missingInfo.push("When do you need this finished?");

  const content = deliverables.length ? deliverables : sents.filter((s) => !logistics.test(s)).slice(0, 3);
  return {
    title, summary: sents.slice(0, 2).join(" ").slice(0, 260), deliverables: content.length ? content : [title],
    requiredSkills, suggestedBudgetRange: range, suggestedTimelineDays: days ?? Math.max(14, Math.round(hours / 2)),
    tone, missingInfo: missingInfo.slice(0, 2),
  };
}

/** Hours implied by a brief, used consistently by the AI and fallback paths. */
export function estimateHours(brief: StructuredBrief) {
  const mid = (brief.suggestedBudgetRange.low + brief.suggestedBudgetRange.high) / 2;
  return Math.max(8, Math.round(mid / 75));
}

export function minExperienceFor(brief: StructuredBrief) {
  const n = brief.deliverables.length + brief.requiredSkills.length;
  return n >= 9 ? 5 : n >= 6 ? 3 : 2;
}

export function criteriaFromBrief(brief: StructuredBrief, budget: number, clientTzOffset = -5): ProjectCriteria {
  return {
    requiredSkills: brief.requiredSkills, minExperience: minExperienceFor(brief), budget,
    estimatedHours: estimateHours(brief), deadlineDays: brief.suggestedTimelineDays, clientTzOffset,
  };
}

/* ---------- Scope creep (fallback) ---------- */

const STOP = new Set("about after again also because before being could every first from have into just like make more most much need only other over same should some such than that their them then there these they this those very want what when where which while will with would your you are our can add and the for not but all".split(" "));

function significantWords(t: string) {
  return (t.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.replace(/s$/, ""));
}

export function detectScopeFallback(
  message: string,
  brief: Pick<StructuredBrief, "summary" | "deliverables" | "title" | "requiredSkills">,
  freelancerRate = 80,
): ScopeAnalysis {
  const briefText = [brief.title, brief.summary, ...brief.deliverables, ...brief.requiredSkills].join(" ");
  const known = new Set(significantWords(briefText));
  const words = significantWords(message);
  const novel = words.filter((w) => !known.has(w));
  const novelty = words.length ? novel.length / words.length : 0;
  const cue = /\b(also|while you(?:'| a)re at it|one more thing|can we add|could we add|can you add|could you add|in addition|on top of that|another|extra|plus)\b/i.test(message);
  const strong = /\b(while you(?:'| a)re at it|can we add|could we add|can you add|could you add|one more thing)\b/i.test(message);
  const isScopeCreep = (cue && novelty >= 0.45) || (strong && novelty >= 0.3);

  if (!isScopeCreep) {
    return { isScopeCreep: false, reason: "This message stays within the agreed brief.", addedWork: [], source: "fallback" };
  }

  const clauseMatch = message.match(/\b(?:add|include|build|create)\b\s+(.+?)(?:[.!?]|$)/i);
  const clause = (clauseMatch?.[1] ?? message).replace(/\s+/g, " ").trim().slice(0, 140);
  const parts = clause.split(/,|\band\b|\bwith\b/i).map((p) => p.trim()).filter((p) => p.length > 3);
  const addedWork = (parts.length ? parts : [clause]).slice(0, 4).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  const hours = Math.min(60, Math.max(6, addedWork.length * 12));
  const price = hours * freelancerRate;
  const days = Math.max(3, Math.ceil(hours / 4));

  return {
    isScopeCreep: true, source: "fallback",
    reason: "This asks for work that is not listed in the agreed deliverables.",
    addedWork,
    miniQuote: {
      message: `Thanks for the idea. It sits outside the agreed scope, so I would quote it as a separate add-on covering: ${addedWork.join("; ").toLowerCase()}. I estimate about ${hours} hours over ${days} working days. Happy to adjust the scope if you would like a smaller first version.`,
      price, days,
    },
    quoteStatus: "draft",
  };
}

/* ---------- Project outlook (deterministic signals) ---------- */

export type OutlookRating = "clear" | "cloudy" | "stormy";
export type OutlookSignals = {
  scopeClarity: number; budgetToHours: number; deadlineRealism: number; // each 0-1
  hourlyImplied: number; hoursPerWeek: number;
  rating: OutlookRating; weakest: "scope" | "budget" | "deadline";
};

export function outlookSignals(p: {
  brief: Pick<StructuredBrief, "deliverables" | "missingInfo">; rawBriefLength: number;
  budget: number; estimatedHours: number; deadlineDays: number;
}): OutlookSignals {
  const scopeClarity = Math.min(1, Math.max(0,
    1 - 0.25 * p.brief.missingInfo.length - (p.brief.deliverables.length < 3 ? 0.2 : 0) - (p.rawBriefLength < 200 ? 0.15 : 0)));
  const hourlyImplied = p.estimatedHours > 0 ? p.budget / p.estimatedHours : 0;
  const budgetToHours = Math.min(1, Math.max(0, hourlyImplied / 70));
  const hoursPerWeek = p.estimatedHours / (Math.max(p.deadlineDays, 1) / 7);
  const deadlineRealism = hoursPerWeek <= 35 ? 1 : hoursPerWeek >= 70 ? 0 : 1 - (hoursPerWeek - 35) / 35;
  const overall = scopeClarity * 0.4 + budgetToHours * 0.35 + deadlineRealism * 0.25;
  const rating: OutlookRating = overall >= 0.75 ? "clear" : overall >= 0.5 ? "cloudy" : "stormy";
  const weakest = scopeClarity <= budgetToHours && scopeClarity <= deadlineRealism ? "scope"
    : budgetToHours <= deadlineRealism ? "budget" : "deadline";
  return { scopeClarity, budgetToHours, deadlineRealism, hourlyImplied, hoursPerWeek, rating, weakest };
}

export function outlookFallback(s: OutlookSignals): { reason: string; fix: string } {
  const reason = `Scope clarity ${Math.round(s.scopeClarity * 100)}%, budget implies about $${Math.round(s.hourlyImplied)}/h, and the deadline needs about ${Math.round(s.hoursPerWeek)} hours per week.`;
  const floor = Math.min(s.scopeClarity, s.budgetToHours, s.deadlineRealism);
  const fix =
    floor >= 0.9 ? "No urgent fix. Keep any extra requests quoted separately so the scope stays clear."
    : s.weakest === "scope" ? "Answer the open questions in the brief so the deliverables are specific."
    : s.weakest === "budget" ? "Raise the budget or cut deliverables so the implied hourly rate is closer to $70."
    : "Extend the deadline or reduce scope so the weekly workload is closer to 35 hours.";
  return { reason, fix };
}

export { normalizeSkill };
