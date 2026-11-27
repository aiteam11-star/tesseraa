export const STATUS_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "recent_graduate", label: "Recent graduate" },
  { value: "dropout", label: "Dropout / self-taught" },
  { value: "working_professional", label: "Working professional" },
  { value: "full_time_freelancer", label: "Full-time freelancer" },
  { value: "other", label: "Other" },
] as const;

export const statusLabel = (v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? "";

export const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil", "Bulgaria", "Canada", "Chile", "China", "Colombia", "Croatia", "Czechia", "Denmark",
  "Egypt", "Estonia", "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan",
  "Jordan", "Kenya", "Lebanon", "Malaysia", "Mexico", "Morocco", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines",
  "Poland", "Portugal", "Romania", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Taiwan", "Thailand", "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Vietnam",
];
