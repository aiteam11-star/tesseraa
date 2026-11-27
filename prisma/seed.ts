/* Seed data for Tessera. Everything here is fictional demo data. */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const J = (v: unknown) => JSON.stringify(v);
const DAY = 86_400_000;
const ago = (days: number, mins = 0) => new Date(Date.now() - days * DAY - mins * 60_000);

type Item = { title: string; problem: string; approach: string; result: string; tags: string[] };
type Seed = {
  name: string; email: string; hue: number; category: string; headline: string; bio: string;
  skills: string[]; years: number; rate: number; tz: string; off: number; hours: number;
  comm: string; updates: string; revisions: string; items: Item[];
};

const FREELANCERS: Seed[] = [
  {
    name: "Priya Nair", email: "priya@tessera.demo", hue: 172, category: "Full-stack",
    headline: "Full-stack engineer for booking and commerce sites",
    bio: "Eight years building small-business web apps with React, Next.js and Postgres. Most of my work is booking flows, payments and the admin tools that keep them running.",
    skills: ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "SQL", "Stripe", "Accessibility"],
    years: 8, rate: 85, tz: "America/Chicago", off: -6, hours: 25,
    comm: "Daily updates", updates: "A short written update every working day", revisions: "Two revision rounds per milestone, included in the price",
    items: [
      { title: "Studio class booking platform", problem: "A yoga studio took bookings by DM and lost about a third of them to double-booking.", approach: "Built a Next.js booking flow with seat limits per session, Stripe checkout and automatic confirmation emails.", result: "Bookings moved fully online within two weeks of launch and double-bookings stopped.", tags: ["Next.js", "Stripe", "PostgreSQL"] },
      { title: "Repair shop job tracker", problem: "A bike repair shop tracked jobs on paper tags and customers kept calling for status.", approach: "Created a lightweight job tracker with SMS-style status links and a simple admin view.", result: "Status calls to the shop dropped noticeably and staff adopted the tracker without training.", tags: ["React", "Node.js", "SQL"] },
    ],
  },
  {
    name: "Tomás Herrera", email: "tomas@tessera.demo", hue: 28, category: "Full-stack",
    headline: "Mobile and web engineer, React Native first",
    bio: "I ship cross-platform apps quickly and keep them maintainable. Comfortable owning an app from first prototype to store release.",
    skills: ["React", "React Native", "TypeScript", "Node.js", "Firebase", "API design"],
    years: 5, rate: 70, tz: "America/Mexico_City", off: -6, hours: 30,
    comm: "Milestone-based", updates: "A demo build at the end of each milestone", revisions: "One revision round per milestone, more at an hourly rate",
    items: [
      { title: "Neighbourhood tool library app", problem: "A community group wanted members to borrow tools without a spreadsheet.", approach: "Built a React Native app with Firebase auth, item availability and a return reminder.", result: "Released on both app stores and used by the group's first 120 members.", tags: ["React Native", "Firebase"] },
      { title: "Delivery driver check-in", problem: "A courier firm needed drivers to confirm drop-offs with a photo.", approach: "Added offline-first photo capture and background sync to an existing Node API.", result: "Proof-of-delivery disputes were settled from the app instead of by phone.", tags: ["TypeScript", "Node.js", "API design"] },
    ],
  },
  {
    name: "Lena Fischer", email: "lena@tessera.demo", hue: 205, category: "Design",
    headline: "Product designer focused on clear, accessible interfaces",
    bio: "Nine years in product design, the last five with small teams. I run short research sprints, then design and prototype in Figma.",
    skills: ["UI design", "UX research", "Figma", "Design systems", "Accessibility", "Prototyping"],
    years: 9, rate: 95, tz: "Europe/Berlin", off: 1, hours: 20,
    comm: "Weekly check-ins", updates: "A weekly call plus a shared Figma file you can comment on any time", revisions: "Two rounds of feedback per phase",
    items: [
      { title: "Clinic patient portal redesign", problem: "Patients struggled to find their appointment details and phoned reception instead.", approach: "Ran five patient interviews, simplified the navigation to three destinations and tested a prototype.", result: "In testing, all five participants found their next appointment without help.", tags: ["UX research", "Figma", "Accessibility"] },
      { title: "Design system for a fintech start-up", problem: "Three developers were building the same button four different ways.", approach: "Audited the product, then built a documented component library with tokens.", result: "New screens were assembled from the library instead of being redrawn.", tags: ["Design systems", "UI design"] },
    ],
  },
  {
    name: "Amara Obi", email: "amara@tessera.demo", hue: 330, category: "Design",
    headline: "Brand identity designer for founders and small teams",
    bio: "I help new businesses look like they mean it. Logos, type systems and the guidelines that keep them consistent.",
    skills: ["Brand identity", "Logo design", "Illustration", "Figma", "Typography"],
    years: 6, rate: 75, tz: "Africa/Lagos", off: 1, hours: 25,
    comm: "Milestone-based", updates: "A review point at discovery, concepts and final files", revisions: "Three concept revisions, then unlimited small tweaks for a week",
    items: [
      { title: "Coffee roaster rebrand", problem: "A roaster's packaging looked different on every product line.", approach: "Built one wordmark, a colour system and a label template that worked across five sizes.", result: "All product lines shipped on the same template.", tags: ["Brand identity", "Typography"] },
      { title: "Community arts festival identity", problem: "A volunteer festival needed an identity that volunteers could reproduce at low cost.", approach: "Designed a modular pattern and a one-colour logo for easy printing.", result: "Volunteers produced signage and flyers in-house for the full programme.", tags: ["Logo design", "Illustration"] },
    ],
  },
  {
    name: "Jonas Lindqvist", email: "jonas@tessera.demo", hue: 250, category: "Data and ML",
    headline: "Data scientist who builds models that people can explain",
    bio: "Seven years in applied machine learning for logistics and health. I prefer a simple model you can defend over a clever one you cannot.",
    skills: ["Python", "Machine learning", "SQL", "Data visualization", "Pandas"],
    years: 7, rate: 110, tz: "Europe/Stockholm", off: 1, hours: 15,
    comm: "Weekly check-ins", updates: "A weekly written summary with charts and open questions", revisions: "Model changes are scoped per round",
    items: [
      { title: "Demand forecast for a regional grocer", problem: "Fresh produce was over-ordered and thrown away.", approach: "Fitted a gradient-boosted forecast on three years of sales with holiday and weather features.", result: "Forecast error fell against the previous spreadsheet method on a held-out quarter.", tags: ["Python", "Machine learning"] },
      { title: "Appointment no-show prediction", problem: "A clinic wanted to know which appointments were likely to be missed.", approach: "Built an interpretable logistic model and a one-page explainer for reception staff.", result: "Reception used the ranked list to send targeted reminders.", tags: ["Python", "SQL"] },
    ],
  },
  {
    name: "Sofia Marchetti", email: "sofia@tessera.demo", hue: 12, category: "Data and ML",
    headline: "Analyst who turns messy spreadsheets into clear dashboards",
    bio: "Four years in analytics for hospitality and retail. I clean the data, find the question behind the question and build dashboards people open daily.",
    skills: ["SQL", "Data visualization", "Tableau", "Python", "Analytics", "Dashboards"],
    years: 4, rate: 60, tz: "Europe/Rome", off: 1, hours: 30,
    comm: "Daily updates", updates: "A short update each day and a walkthrough video at each milestone", revisions: "Unlimited dashboard tweaks within the agreed metrics",
    items: [
      { title: "Restaurant group sales dashboard", problem: "Managers compared locations by emailing spreadsheets.", approach: "Built a SQL model and a Tableau dashboard with one shared definition of each metric.", result: "Weekly reporting moved from a manual email to a single dashboard link.", tags: ["SQL", "Tableau", "Dashboards"] },
      { title: "Retail returns analysis", problem: "A shop owner suspected returns were concentrated in a few products.", approach: "Cleaned two years of order exports and visualised returns by product and supplier.", result: "Three products accounted for most returns and were reviewed with suppliers.", tags: ["Python", "Analytics"] },
    ],
  },
  {
    name: "Kwame Mensah", email: "kwame@tessera.demo", hue: 45, category: "Writing",
    headline: "Copywriter for websites, launches and email",
    bio: "Ten years writing for B2C and B2B brands. I interview first, write second, and keep the voice yours.",
    skills: ["Copywriting", "Brand voice", "Content strategy", "SEO", "Email marketing"],
    years: 10, rate: 80, tz: "Europe/London", off: 0, hours: 20,
    comm: "Milestone-based", updates: "A draft at each milestone, with a short note on the choices made", revisions: "Two rounds of edits per piece",
    items: [
      { title: "Website rewrite for a family law firm", problem: "The site was full of legal jargon and clients could not tell what the firm actually did.", approach: "Interviewed three partners, then rewrote every page in plain language.", result: "The firm reported more enquiries that matched the services they wanted to sell.", tags: ["Copywriting", "Brand voice"] },
      { title: "Welcome email series for a meal-kit start-up", problem: "New subscribers received one generic welcome email and many cancelled in week one.", approach: "Designed a five-email sequence around the first delivery.", result: "First-week cancellations went down in the first two months after launch.", tags: ["Email marketing", "Content strategy"] },
    ],
  },
  {
    name: "Hannah Cho", email: "hannah@tessera.demo", hue: 190, category: "Writing",
    headline: "Technical writer for developer tools and APIs",
    bio: "Six years documenting APIs and internal tools. I write for the person who has ten minutes and a deadline.",
    skills: ["Technical writing", "Documentation", "API documentation", "Content strategy", "Editing"],
    years: 6, rate: 70, tz: "America/Los_Angeles", off: -8, hours: 20,
    comm: "Weekly check-ins", updates: "A weekly doc review with tracked changes", revisions: "Two review rounds per document set",
    items: [
      { title: "REST API reference for a payments start-up", problem: "Developers were opening support tickets for questions the docs should have answered.", approach: "Audited tickets, then rewrote the reference with examples for every endpoint.", result: "Common setup questions were answered in the docs instead of by support.", tags: ["API documentation", "Technical writing"] },
      { title: "Internal runbooks for an operations team", problem: "On-call engineers relied on one person's memory during incidents.", approach: "Interviewed the team and wrote step-by-step runbooks for the ten most common incidents.", result: "New on-call engineers used the runbooks in their first rotation.", tags: ["Documentation", "Editing"] },
    ],
  },
  {
    name: "Mateo Alvarez", email: "mateo@tessera.demo", hue: 300, category: "Motion",
    headline: "Motion designer for explainers and product launches",
    bio: "Seven years of 2D animation and motion graphics. I storyboard first so you approve the idea before any animation is built.",
    skills: ["Motion graphics", "After Effects", "Animation", "Storytelling", "Illustration"],
    years: 7, rate: 90, tz: "America/Bogota", off: -5, hours: 20,
    comm: "Milestone-based", updates: "Storyboard, animatic and final cut, each with a review window", revisions: "Two rounds on the animatic, one on the final",
    items: [
      { title: "Explainer for a recycling app", problem: "The team could not explain in a sentence how the app worked.", approach: "Wrote a 60-second script, storyboarded it and animated it in After Effects.", result: "The explainer became the video on the app's landing page.", tags: ["Motion graphics", "Storytelling"] },
      { title: "Animated logo and social loops", problem: "A bakery wanted something simple to post every week.", approach: "Created an animated logo and six reusable loops they could re-skin.", result: "The owner posted new loops weekly without needing a designer.", tags: ["Animation", "After Effects"] },
    ],
  },
  {
    name: "Ingrid Solheim", email: "ingrid@tessera.demo", hue: 220, category: "Video",
    headline: "Video producer and editor for brand films and interviews",
    bio: "Eleven years of documentary and brand work. I handle script, shoot direction, edit, colour and sound.",
    skills: ["Video editing", "Premiere Pro", "Color grading", "Storytelling", "Sound design"],
    years: 11, rate: 100, tz: "Europe/Oslo", off: 1, hours: 15,
    comm: "Weekly check-ins", updates: "A rough cut, a fine cut and a final, each with written notes", revisions: "Two rounds on the rough cut and one on the fine cut",
    items: [
      { title: "Founder story film for a boat builder", problem: "A family boatyard had no way to show customers how its boats were made.", approach: "Spent two days on site and edited a three-minute film around the builder's own words.", result: "The film now opens the boatyard's website and sales presentations.", tags: ["Video editing", "Storytelling"] },
      { title: "Conference interview series", problem: "A conference had hours of interviews and no time to edit them.", approach: "Built a repeatable edit template with lower-thirds, music and colour treatment.", result: "Twelve interviews were delivered within a week of the event.", tags: ["Premiere Pro", "Color grading", "Sound design"] },
    ],
  },
  {
    name: "Rafael Duarte", email: "rafael@tessera.demo", hue: 100, category: "Marketing",
    headline: "Growth marketer for content-led small businesses",
    bio: "Eight years running SEO, email and analytics for small companies. I set up measurement first, so you can see what is working.",
    skills: ["SEO", "Email marketing", "Analytics", "Social media", "Content strategy", "Paid ads"],
    years: 8, rate: 85, tz: "America/Sao_Paulo", off: -3, hours: 25,
    comm: "Weekly check-ins", updates: "A weekly report with the numbers and the next test", revisions: "Plans are revised monthly",
    items: [
      { title: "SEO programme for a plant nursery", problem: "A nursery was invisible in local search despite excellent stock.", approach: "Fixed site structure, wrote location pages and set up conversion tracking.", result: "Organic traffic grew steadily over six months, tracked in Analytics.", tags: ["SEO", "Analytics"] },
      { title: "Newsletter growth for a cooking school", problem: "The school's email list was stuck and sends were irregular.", approach: "Added lead magnets, a monthly calendar and segmented sends.", result: "The list grew each month and open rates improved against the previous baseline.", tags: ["Email marketing", "Content strategy"] },
    ],
  },
  {
    name: "Yuki Tanaka", email: "yuki@tessera.demo", hue: 355, category: "Design",
    headline: "Webflow developer and front-end designer",
    bio: "Five years building marketing sites that non-technical teams can edit. Clean CSS, fast pages and careful animation.",
    skills: ["Webflow", "UI design", "Figma", "HTML/CSS", "Animation", "SEO"],
    years: 5, rate: 65, tz: "Asia/Tokyo", off: 9, hours: 30,
    comm: "Daily updates", updates: "A staging link updated daily and a short note", revisions: "Two rounds per page template",
    items: [
      { title: "Marketing site for a physiotherapy clinic", problem: "The clinic's old site was slow and the owner could not edit it.", approach: "Rebuilt it in Webflow with a CMS for services and staff.", result: "The owner now updates pages without developer help.", tags: ["Webflow", "SEO"] },
      { title: "Scroll animations for a product page", problem: "A hardware start-up wanted its product page to feel tactile.", approach: "Designed subtle scroll interactions and tested them on low-end phones.", result: "The page kept good performance scores while adding motion.", tags: ["Animation", "HTML/CSS"] },
    ],
  },
  {
    name: "Dev Malhotra", email: "dev@tessera.demo", hue: 150, category: "Data and ML",
    headline: "Backend and data engineer for pipelines and APIs",
    bio: "Nine years building the plumbing: ETL pipelines, Postgres schemas and APIs that other people depend on.",
    skills: ["Python", "SQL", "PostgreSQL", "Node.js", "API design", "ETL"],
    years: 9, rate: 95, tz: "Asia/Dubai", off: 4, hours: 20,
    comm: "Milestone-based", updates: "A written update and a demo at each milestone", revisions: "Scope changes are quoted separately",
    items: [
      { title: "Nightly data pipeline for a logistics firm", problem: "Reports were built by hand each Monday from five exports.", approach: "Wrote a Python ETL job loading a Postgres warehouse with tests and alerts.", result: "Monday reports were generated automatically from then on.", tags: ["Python", "ETL", "PostgreSQL"] },
      { title: "Public API for a bike-share operator", problem: "Third-party apps scraped the operator's website for availability.", approach: "Designed a documented REST API with rate limits and API keys.", result: "Partner apps moved from scraping to the API.", tags: ["API design", "Node.js"] },
    ],
  },
];

const BRIEF = (b: object) => J(b);
const COUNTRY_BY_TZ: Record<string, string> = { "America/Chicago": "United States", "America/New_York": "United States", "America/Los_Angeles": "United States", "Europe/London": "United Kingdom", "Europe/Berlin": "Germany", "Europe/Lisbon": "Portugal", "Asia/Kolkata": "India", "Asia/Singapore": "Singapore", "Australia/Sydney": "Australia", "Africa/Lagos": "Nigeria", "America/Sao_Paulo": "Brazil" };

async function main() {
  // Only sample data is replaced. Real registered users and their data are never touched.
  // "@tessera.demo" is reserved for sample accounts (sign-up refuses it), which also catches rows from before the isDemo flag existed.
  const sample = { OR: [{ isDemo: true }, { email: { endsWith: "@tessera.demo" } }] };
  await db.thankYou.deleteMany({ where: { OR: [{ from: sample }, { to: sample }] } });
  await db.message.deleteMany({ where: { sender: sample } });
  await db.user.deleteMany({ where: sample }); // projects, profiles, skills, proposals cascade

  // Clients
  const demo = { isDemo: true, passwordHash: null, emailVerifiedAt: new Date() }; // no password: sample accounts can never be signed in to
  const maya = await db.user.create({ data: { ...demo, name: "Maya Okafor", email: "maya@tessera.demo", role: "client", hue: 172, clientProfile: { create: { company: "Clay & Co. Pottery Studio", industry: "Arts and crafts", location: "Portland, USA", timezone: "New York (UTC-5)", tzOffset: -5, description: "A neighbourhood pottery studio running classes and workshops." } } } });
  const ben = await db.user.create({ data: { ...demo, name: "Ben Whitfield", email: "ben@tessera.demo", role: "client", hue: 40, clientProfile: { create: { company: "Whitfield Coffee", industry: "Hospitality and food", location: "Austin, USA", timezone: "Chicago (UTC-6)", tzOffset: -6 } } } });
  const carla = await db.user.create({ data: { ...demo, name: "Carla Duarte", email: "carla@tessera.demo", role: "client", hue: 300, clientProfile: { create: { company: "Duarte Health Clinic", industry: "Healthcare", location: "Lisbon, Portugal", timezone: "London (UTC+0)", tzOffset: 0 } } } });

  // Freelancers
  const profiles: Record<string, { id: string; userId: string }> = {};
  for (const f of FREELANCERS) {
    const user = await db.user.create({ data: { ...demo, name: f.name, email: f.email, role: "freelancer", hue: f.hue } });
    const profile = await db.freelancerProfile.create({
      data: {
        userId: user.id, currentStatus: "working_professional", country: COUNTRY_BY_TZ[f.tz] ?? "", headline: f.headline, bio: f.bio, category: f.category,
        skills: { create: f.skills.map((name) => ({ name, proficiency: "expert" })) }, languages: J(["English"]), yearsExperience: f.years, hourlyRate: f.rate,
        timezone: f.tz, tzOffset: f.off, availabilityHoursPerWeek: f.hours,
        communicationStyle: f.comm, updateFrequency: f.updates, revisionApproach: f.revisions,
        portfolio: {
          create: f.items.map((i, n) => ({
            title: i.title, problem: i.problem, approach: i.approach, result: i.result,
            tags: J(i.tags), hue: (f.hue + n * 47) % 360, shape: (n + f.name.length) % 4,
          })),
        },
      },
    });
    if (f.name === "Priya Nair") {
      await db.sidequest.createMany({ data: [
        { profileId: profile.id, title: "Clay glaze calculator", description: "A weekend tool that converts glaze recipes between batch sizes. A few hundred potters use it.", url: "" },
        { profileId: profile.id, title: "Hackathon: queue-free cafe ordering", description: "48-hour build that won best UX at a local hackathon." },
      ] });
    }
    profiles[f.name] = { id: profile.id, userId: user.id };
  }

  // Projects
  const p1 = await db.project.create({
    data: {
      clientId: maya.id, status: "active", hiredId: profiles["Priya Nair"].id, hiredAt: ago(7),
      title: "Online booking for a pottery studio",
      rawBrief: "We run a pottery studio and take class bookings over Instagram DMs, which is chaos. Need a simple website where people can see our classes, pick a session, pay, and get a confirmation email. We also need a way for us to add or change classes without calling a developer. Needs to work well on phones. Want it live in about six weeks.",
      structuredBrief: BRIEF({
        title: "Online booking for a pottery studio",
        summary: "A mobile-friendly website where customers browse classes, book a session with seat limits, pay online and receive a confirmation email, plus a simple admin for the studio team.",
        deliverables: ["Class and workshop listing pages", "Online booking with session availability and seat limits", "Stripe checkout for class bookings", "Confirmation emails after payment", "Simple admin to add and edit classes"],
        requiredSkills: ["React", "Next.js", "Stripe", "SQL", "Accessibility"],
        suggestedBudgetRange: { low: 5500, high: 8500 }, suggestedTimelineDays: 45,
        tone: "Warm and practical", missingInfo: [],
      }),
      budget: 6500, estimatedHours: 80, deadlineDays: 45, deadline: new Date(Date.now() + 38 * DAY),
      skills: { create: ["React", "Next.js", "Stripe", "SQL", "Accessibility"].map((name: string) => ({ name })) }, minExperience: 5, clientTzOffset: -5,
      createdAt: ago(8),
    },
  });
  const p2 = await db.project.create({
    data: {
      clientId: ben.id, status: "open",
      title: "Scheduling dashboard for a small clinic",
      rawBrief: "Our clinic has two years of appointment data in spreadsheets and a booking system export. We want to see no-shows, busiest hours and which services run late, in one dashboard the front desk can open each morning. Maybe some prediction of no-shows if that is realistic. Budget is around 4800. Hoping to have it in five weeks.",
      structuredBrief: BRIEF({
        title: "Scheduling dashboard for a small clinic",
        summary: "A daily dashboard for front-desk staff showing no-shows, busiest hours and late-running services, built from two years of appointment exports.",
        deliverables: ["Cleaned appointment dataset from spreadsheet and booking exports", "Dashboard of no-shows, busy hours and service delays", "Short walkthrough for front-desk staff", "Feasibility note on no-show prediction"],
        requiredSkills: ["SQL", "Data visualization", "Python", "Analytics"],
        suggestedBudgetRange: { low: 3800, high: 6000 }, suggestedTimelineDays: 35,
        tone: "Clear and practical", missingInfo: ["Which dashboard tool does the clinic already use, if any?"],
      }),
      budget: 4800, estimatedHours: 60, deadlineDays: 35, deadline: new Date(Date.now() + 33 * DAY),
      skills: { create: ["SQL", "Data visualization", "Python", "Analytics"].map((name: string) => ({ name })) }, minExperience: 3, clientTzOffset: -5,
      createdAt: ago(2),
    },
  });
  const p3 = await db.project.create({
    data: {
      clientId: carla.id, status: "open",
      title: "Sixty-second brand film",
      rawBrief: "We need a cool brand video, something that shows who we are. Fast turnaround. Budget is tight, maybe 2500. Should look premium and have motion and music.",
      structuredBrief: BRIEF({
        title: "Sixty-second brand film",
        summary: "A short brand film that shows who the company is, with motion graphics and music. Scope and footage are not yet defined.",
        deliverables: ["One 60-second brand film", "Motion graphics and music"],
        requiredSkills: ["Video editing", "Motion graphics", "Storytelling"],
        suggestedBudgetRange: { low: 5500, high: 9000 }, suggestedTimelineDays: 30,
        tone: "Premium and confident", missingInfo: ["Is there existing footage, or does the film need to be shot?", "What should viewers do after watching?"],
      }),
      budget: 2500, estimatedHours: 70, deadlineDays: 14, deadline: new Date(Date.now() + 14 * DAY),
      skills: { create: ["Video editing", "Motion graphics", "Storytelling"].map((name: string) => ({ name })) }, minExperience: 5, clientTzOffset: -3,
      createdAt: ago(1),
    },
  });
  const p4 = await db.project.create({
    data: {
      clientId: maya.id, status: "open",
      title: "Blog and newsletter content for the studio",
      rawBrief: "After the booking site, we want to grow our email list. Looking for someone to plan and write eight blog posts and a monthly newsletter for three months, set up so people find us on Google. Tone should be friendly and a bit nerdy about clay. About 2400 total.",
      structuredBrief: BRIEF({
        title: "Blog and newsletter content for the studio",
        summary: "Eight search-friendly blog posts and three monthly newsletters in a friendly, clay-nerdy voice, planned around growing the studio's email list.",
        deliverables: ["Content plan for three months", "Eight blog posts optimised for search", "Three monthly newsletters", "Short keyword brief for each post"],
        requiredSkills: ["Copywriting", "SEO", "Email marketing", "Content strategy"],
        suggestedBudgetRange: { low: 2200, high: 3600 }, suggestedTimelineDays: 90,
        tone: "Friendly and a little nerdy", missingInfo: [],
      }),
      budget: 2400, estimatedHours: 35, deadlineDays: 90, deadline: new Date(Date.now() + 88 * DAY),
      skills: { create: ["Copywriting", "SEO", "Email marketing", "Content strategy"].map((name: string) => ({ name })) }, minExperience: 3, clientTzOffset: -5,
      createdAt: ago(3),
    },
  });
  const p5 = await db.project.create({
    data: {
      clientId: ben.id, status: "completed", hiredId: profiles["Amara Obi"].id, hiredAt: ago(39),
      title: "Logo and brand kit for the clinic",
      rawBrief: "We need a logo, colours and fonts for the clinic, plus a one-page guide so staff use them consistently.",
      structuredBrief: BRIEF({
        title: "Logo and brand kit for the clinic",
        summary: "A logo, colour palette and type choices, plus a one-page usage guide for staff.",
        deliverables: ["Logo in colour and one-colour versions", "Colour palette and type choices", "One-page brand guide"],
        requiredSkills: ["Brand identity", "Logo design", "Typography"],
        suggestedBudgetRange: { low: 2800, high: 4200 }, suggestedTimelineDays: 21,
        tone: "Calm and trustworthy", missingInfo: [],
      }),
      budget: 3200, estimatedHours: 40, deadlineDays: 21, deadline: ago(10),
      skills: { create: ["Brand identity", "Logo design", "Typography"].map((name: string) => ({ name })) }, minExperience: 3, clientTzOffset: -5,
      createdAt: ago(40),
    },
  });

  // Milestones for the active project
  await db.milestone.createMany({
    data: [
      { projectId: p1.id, title: "Class listing pages approved", dueDate: new Date(Date.now() + 5 * DAY) },
      { projectId: p1.id, title: "Booking and payments working", dueDate: new Date(Date.now() + 18 * DAY) },
      { projectId: p1.id, title: "Launch checklist", dueDate: new Date(Date.now() + 36 * DAY) },
      { projectId: p1.id, title: "Kick-off call", dueDate: ago(6), doneAt: ago(6) },
    ],
  });

  // Proposals
  await db.proposal.create({ data: { projectId: p1.id, freelancerId: profiles["Priya Nair"].id, status: "accepted", price: 6500, timelineDays: 45, coverNote: "I have built booking flows with seat limits and Stripe before, so the hard parts are familiar. I would start with the class listing pages so you can see progress in the first week.", createdAt: ago(7) } });
  await db.proposal.create({ data: { projectId: p5.id, freelancerId: profiles["Amara Obi"].id, status: "accepted", price: 3200, timelineDays: 21, coverNote: "I would begin with a short discovery call, then present two directions.", createdAt: ago(39) } });
  await db.proposal.create({ data: { projectId: p2.id, freelancerId: profiles["Sofia Marchetti"].id, status: "sent", price: 4600, timelineDays: 32, coverNote: "I built a similar dashboard for a restaurant group, so I can start by profiling your exports this week. I would keep the no-show prediction to a feasibility note unless the data supports more.", createdAt: ago(1) } });

  // Messages for the active project. The last client message adds work beyond the brief.
  const priya = profiles["Priya Nair"].userId;
  await db.message.createMany({
    data: [
      { projectId: p1.id, senderId: priya, createdAt: ago(7, 0), body: "Hi Maya, I kicked off the repo today. The first milestone is the class listing pages. I will post a preview link on Thursday." },
      { projectId: p1.id, senderId: maya.id, createdAt: ago(6, 30), body: "Great. Can we make sure the classes page works well on phones? Most of our customers book from Instagram." },
      { projectId: p1.id, senderId: priya, createdAt: ago(6, 10), body: "Yes. I am designing mobile first and testing down to 360px wide. If you send real class photos I will use them instead of placeholders." },
      { projectId: p1.id, senderId: maya.id, createdAt: ago(5, 20), body: "Agreed on the 45-day timeline then. The calendar should let people pick a session and a number of seats." },
      { projectId: p1.id, senderId: priya, createdAt: ago(5, 0), body: "Perfect. Seats per session will have a cap you can set in the admin, and a confirmation email goes out after payment." },
      {
        projectId: p1.id, senderId: maya.id, createdAt: ago(0, 25),
        body: "Also, while you are at it, can we add a members-only online shop for our ceramics with a monthly subscription box and inventory tracking? Launch is in six weeks so ideally all together.",
        flags: J(["scopeCreep"]),
        meta: J({
          scope: {
            isScopeCreep: true, source: "fallback",
            reason: "The agreed brief covers class booking, checkout for classes and a class admin. A members-only shop, subscription box and inventory tracking are new products that are not in the brief.",
            addedWork: ["Members-only online shop", "Monthly subscription box", "Inventory tracking"],
            miniQuote: {
              message: "Hi Maya, the shop is a good idea, and it sits outside the agreed booking scope. I can quote it as a separate add-on: members login, a product catalogue with inventory counts, and a monthly subscription box through Stripe. It would take about 50 hours over three weeks after the booking launch. Happy to adjust the scope if you want a smaller first version.",
              price: 4250, days: 21,
            },
            quoteStatus: "draft",
          },
        }),
      },
    ],
  });

  // Thank-yous for the completed project
  await db.thankYou.create({ data: { projectId: p5.id, fromId: ben.id, toId: profiles["Amara Obi"].userId, sticker: "sharp-eye", note: "Amara asked sharp questions on the first call and the kit was ready a week before our launch.", createdAt: ago(10) } });
  await db.thankYou.create({ data: { projectId: p5.id, fromId: profiles["Amara Obi"].userId, toId: ben.id, sticker: "clear-brief", note: "Clear feedback, quick answers and paid on time.", createdAt: ago(10) } });

  console.log(`Seeded ${FREELANCERS.length} freelancers and 5 projects (${[p1, p2, p3, p4, p5].map((p) => p.status).join(", ")}).`);
}

main().finally(() => db.$disconnect());
