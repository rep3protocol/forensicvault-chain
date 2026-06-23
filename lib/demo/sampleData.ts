import path from "node:path";

export const DEMO_CASE_TITLE = "Demo Case — Digital Evidence Integrity";
export const DEMO_CASE_TITLE_PREFIX = "Demo Case";
export const DEMO_STORAGE_DIR = path.join(process.cwd(), "storage", "evidence", "demo");
export const DEMO_STORAGE_PATH_PREFIX = path.join("storage", "evidence", "demo");

const sharedContent = [
  "ForensicVault demo evidence file.",
  "This file is used to demonstrate SHA-256 registration and verification.",
].join("\n");

export const demoEvidenceFiles = [
  {
    originalName: "demo-evidence-original.txt",
    evidenceType: "document",
    mimeType: "text/plain",
    content: sharedContent,
  },
  {
    originalName: "demo-evidence-copy.txt",
    evidenceType: "document",
    mimeType: "text/plain",
    content: sharedContent,
  },
  {
    originalName: "demo-evidence-notes.txt",
    evidenceType: "document",
    mimeType: "text/plain",
    content:
      "ForensicVault demo notes file.\nThis separate file demonstrates a unique SHA-256 evidence hash.",
  },
] as const;

export const demoCaseData = {
  title: DEMO_CASE_TITLE,
  description:
    "Sample case used to demonstrate SHA-256 evidence registration, verification, custody tracking, duplicate hash detection, PDF reports, case packets, and external anchor export.",
  jurisdiction: "Training Environment",
  tags: "demo, training, sha256, custody",
} as const;
