import type { DomainId } from "@peer-ai/workflow";

/** Each domain's name and what it covers, in plain words, for the generated pages. */
export const DOMAIN_INFO: Record<DomainId, { title: string; about: string }> = {
  requirements: {
    title: "Requirements",
    about: "What the product must do, for whom, and how anyone will know it works.",
  },
  architecture: {
    title: "Architecture",
    about:
      "How a system is divided, and which way its parts depend on each other. These hold for any architecture: a modular monolith, microservices, a mobile app or a library. A folder layout is a stack profile's default, never a core rule.",
  },
  "system-design": {
    title: "System design and scalability",
    about: "How the system behaves under load, concurrency and background work.",
  },
  "api-design": { title: "API design", about: "How services and clients agree on what they send each other." },
  frontend: { title: "Frontend", about: "How screens get, hold and show data." },
  mobile: { title: "Mobile", about: "What phone apps need beyond the frontend rules." },
  "design-accessibility": {
    title: "Design and accessibility",
    about: "Design tokens, shared components, and making the product work for everyone.",
  },
  backend: { title: "Backend", about: "How servers take requests, validate them and report what happened." },
  data: { title: "Data", about: "Databases, migrations and stored files." },
  performance: {
    title: "Performance and caching",
    about: "Knowing what things cost, and caching only what's safe to cache.",
  },
  reliability: { title: "Reliability", about: "Staying up, and failing safely when something underneath fails." },
  security: { title: "Security", about: "Keeping people's data and the system itself safe from attack." },
  "privacy-compliance": {
    title: "Privacy and compliance",
    about: "Personal data, and the laws and rules a product must follow.",
  },
  testing: { title: "Testing", about: "What's tested, and how tests stay trustworthy." },
  delivery: { title: "Delivery", about: "Dependencies, pipelines, and how changes reach people." },
  operations: {
    title: "Infrastructure and operations",
    about: "Environments, logs, metrics, alerts, and running the system.",
  },
  "ai-features": { title: "AI features", about: "Features that use AI models." },
  "code-quality": {
    title: "Code quality",
    about: "What makes code good in any language: naming, size, duplication, errors and types.",
  },
  money: {
    title: "Money",
    about: "For products with the `money` trait. The project's add-on names its currency's smallest unit.",
  },
  "safety-critical": {
    title: "Safety-critical data",
    about:
      "For products with the `safety-critical` trait: data where a wrong value could hurt someone, such as allergens, medical dosage, legal deadlines, or eligibility that affects a person's rights. The project's add-on names what counts.",
  },
};
