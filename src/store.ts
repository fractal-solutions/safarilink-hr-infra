import type { PolicyDocument } from "./types";

const DOCS_KEY = "sf_docs";
const TRACKING_KEY = "sf_tracking";

const defaultDocuments: PolicyDocument[] = [
  {
    id: "doc-1",
    title: "Safarilink Ground Operations Policy",
    sections: [
      {
        id: "sec-1-1",
        title: "1.1 Ramp Safety Standards",
        content:
          "<p>All ground staff must wear high-visibility vests and steel-toed boots inside active line parameters.</p><p><strong>Zero-tolerance restriction:</strong> Mobile devices are forbidden during fueling matrices.</p>",
      },
      {
        id: "sec-1-2",
        title: "1.2 Dangerous Goods Handling",
        content:
          "<p>Lithium-ion arrays must meet standard IATA criteria before loading initialization procedures execute.</p>",
      },
    ],
  },
  {
    id: "doc-2",
    title: "In-Flight Cabin Crew Procedures",
    sections: [
      {
        id: "sec-2-1",
        title: "2.1 Pre-Flight Briefing Protocol",
        content:
          "<p>Cabin configurations require comprehensive audits prior to passenger ingress. Ensure checklists lock down cleanly.</p>",
      },
    ],
  },
];

export function loadDocuments(): PolicyDocument[] {
  const raw = localStorage.getItem(DOCS_KEY);
  if (!raw) {
    localStorage.setItem(DOCS_KEY, JSON.stringify(defaultDocuments));
    return defaultDocuments;
  }
  return JSON.parse(raw);
}

export function saveDocuments(docs: PolicyDocument[]) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function loadTracking(): Record<string, boolean> {
  const raw = localStorage.getItem(TRACKING_KEY);
  if (!raw) {
    localStorage.setItem(TRACKING_KEY, JSON.stringify({}));
    return {};
  }
  return JSON.parse(raw);
}

export function saveTracking(tracking: Record<string, boolean>) {
  localStorage.setItem(TRACKING_KEY, JSON.stringify(tracking));
}
