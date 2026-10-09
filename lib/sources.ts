/** Shared source registry. Every URL below was opened and read during research on 2026-09-29 (or is named in a page that was). */
export type Source = { id: string; label: string; url: string; date: string; note?: string };

export const S: Record<string, Source> = {
  oaiAug: { id: "oaiAug", label: "OpenAI: The Hugging Face incident and the road ahead", url: "https://openai.com/index/hugging-face-incident-and-the-road-ahead/", date: "26 Aug 2026", note: "Primary. Vendor's own account." },
  oaiJul: { id: "oaiJul", label: "OpenAI: OpenAI and Hugging Face partner to address security incident during model evaluation", url: "https://openai.com/index/hugging-face-model-evaluation-security-incident/", date: "21 Jul 2026 (updated 28 and 29 Jul)", note: "Primary. Vendor's own account." },
  oaiTech: { id: "oaiTech", label: "OpenAI: Hugging Face Incident Technical Report (PDF)", url: "https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf", date: "26 Aug 2026", note: "Primary." },
  hfDisc: { id: "hfDisc", label: "Hugging Face: Security incident disclosure, July 2026", url: "https://huggingface.co/blog/security-incident-july-2026", date: "16 Jul 2026", note: "Primary. Victim's own account." },
  hfTime: { id: "hfTime", label: "Hugging Face: Anatomy of a Frontier Lab Agent Intrusion, a technical timeline", url: "https://huggingface.co/blog/agent-intrusion-technical-timeline", date: "27 Jul 2026", note: "Primary. Victim's forensic reconstruction." },
  metr: { id: "metr", label: "METR and Redwood Research: independent investigation of agent behavior in the OpenAI / Hugging Face incident", url: "https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/", date: "26 Aug 2026", note: "Independent third-party assessment." },
  f5: { id: "f5", label: "F5 Labs: Weekly Threat Bulletin, August 5th, 2026", url: "https://www.f5.com/labs/articles/weekly-threat-bulletin-august-5th-2026", date: "5 Aug 2026", note: "Secondary. Summarizes the JFrog Artifactory fixes." },
  csa: { id: "csa", label: "Cloud Security Alliance: Autonomous Sandbox Escape, OpenAI Artifactory (research note)", url: "https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/07/CSA_research_note_openai_artifactory_sandbox_escape_20260730-csa-styled.pdf", date: "30 Jul 2026", note: "Secondary analysis." },
  wiki: { id: "wiki", label: "Wikipedia: OpenAI and Hugging Face incident", url: "https://en.wikipedia.org/wiki/2026_OpenAI_cybersecurity_incident", date: "retrieved 29 Sep 2026", note: "Secondary and itself flagged for relying on primary sources. Used only for orientation, never as the sole source of a claim." },
  o1: { id: "o1", label: "OpenAI: o1 System Card (PDF)", url: "https://cdn.openai.com/o1-preview-system-card-20240917.pdf", date: "12 Sep 2024", note: "Primary." },
  replit: { id: "replit", label: "Fortune: AI-powered coding tool wiped out a software company's database in 'catastrophic failure'", url: "https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/", date: "23 Jul 2025", note: "Reputable press report based on the user's public posts and the vendor CEO's public reply." },
  anth: { id: "anth", label: "Anthropic: Disrupting the first reported AI-orchestrated cyber espionage campaign", url: "https://www.anthropic.com/news/disrupting-AI-espionage", date: "13 Nov 2025", note: "Primary. Vendor's own threat-intel report." },
  gtig: { id: "gtig", label: "Google Threat Intelligence Group: GTIG AI Threat Tracker, Advances in Threat Actor Usage of AI Tools", url: "https://cloud.google.com/blog/topics/threat-intelligence/threat-actor-usage-of-ai-tools", date: "5 Nov 2025", note: "Primary. Vendor's own threat-intel report." },
  echo: { id: "echo", label: "BleepingComputer: Zero-click AI data leak flaw uncovered in Microsoft 365 Copilot (EchoLeak)", url: "https://www.bleepingcomputer.com/news/security/zero-click-ai-data-leak-flaw-uncovered-in-microsoft-365-copilot/", date: "11 Jun 2025", note: "Press report of research by Aim Labs; CVE-2025-32711." },
  gem: { id: "gem", label: "Tenable Research: The Trifecta, three Gemini vulnerabilities", url: "https://www.tenable.com/blog/the-trifecta-how-three-new-gemini-vulnerabilities-in-cloud-assist-search-model-and-browsing", date: "30 Sep 2025", note: "Primary. Researcher's own write-up; reported as remediated by Google." },
  hfSpaces: { id: "hfSpaces", label: "Hugging Face: Space secrets leak disclosure", url: "https://huggingface.co/blog/space-secrets-disclosure", date: "31 May 2024", note: "Primary." },
  jfPickle: { id: "jfPickle", label: "JFrog: Examining Malicious Hugging Face ML Models with Silent Backdoor", url: "https://jfrog.com/blog/data-scientists-targeted-by-malicious-hugging-face-ml-models-with-silent-backdoor/", date: "early 2024", note: "Primary. Security vendor research." },
  cs26: { id: "cs26", label: "CrowdStrike: 2026 Global Threat Report (press release)", url: "https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report/", date: "24 Feb 2026", note: "Primary. Vendor's own report." },
};

export const sources: Source[] = Object.values(S);

export function sourceById(id: string): Source | undefined {
  if (!id || typeof id !== "string") return undefined;
  if (Object.prototype.hasOwnProperty.call(S, id)) return S[id];
  const target = id.toLowerCase();
  return sources.find((s) => s.id.toLowerCase() === target);
}
