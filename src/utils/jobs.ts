import { LocalStorage } from "@raycast/api";
import { CalculationType, SavedJob, SavedJobRevision } from "../types";

const JOBS_KEY = "shopcalc_saved_jobs";
const MAX_JOBS = 50;
const MAX_REVISIONS_PER_JOB = 20;

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { note: "Snapshot serialization failed" };
  }
}

export async function getSavedJobs(): Promise<SavedJob[]> {
  const raw = await LocalStorage.getItem<string>(JOBS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedJob[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function saveJobRevision(params: {
  jobName: string;
  type: CalculationType;
  summary: string;
  input: SavedJobRevision["input"];
  output: unknown;
}): Promise<void> {
  const name = params.jobName.trim();
  if (!name) {
    throw new Error("Job name is required");
  }

  const jobs = await getSavedJobs();
  const existingIndex = jobs.findIndex((job) => job.jobName.toLowerCase() === name.toLowerCase());

  const revision: SavedJobRevision = {
    id: createId(),
    jobName: name,
    type: params.type,
    timestamp: Date.now(),
    summary: params.summary,
    input: safeJson(params.input) as SavedJobRevision["input"],
    output: safeJson(params.output),
  };

  if (existingIndex >= 0) {
    jobs[existingIndex].revisions.unshift(revision);
    if (jobs[existingIndex].revisions.length > MAX_REVISIONS_PER_JOB) {
      jobs[existingIndex].revisions.length = MAX_REVISIONS_PER_JOB;
    }
  } else {
    jobs.unshift({
      jobName: name,
      revisions: [revision],
    });
  }

  if (jobs.length > MAX_JOBS) {
    jobs.length = MAX_JOBS;
  }

  await LocalStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export async function deleteSavedJob(jobName: string): Promise<void> {
  const jobs = await getSavedJobs();
  const next = jobs.filter((job) => job.jobName.toLowerCase() !== jobName.toLowerCase());
  await LocalStorage.setItem(JOBS_KEY, JSON.stringify(next));
}

export async function clearSavedJobs(): Promise<void> {
  await LocalStorage.removeItem(JOBS_KEY);
}

export function compareRevisions(oldRevision: SavedJobRevision, newRevision: SavedJobRevision): string {
  const oldNumbers = flattenNumbers(oldRevision.output);
  const newNumbers = flattenNumbers(newRevision.output);
  const keys = Array.from(new Set([...Object.keys(oldNumbers), ...Object.keys(newNumbers)])).sort();

  const changed = keys
    .map((key) => {
      const oldValue = oldNumbers[key];
      const newValue = newNumbers[key];
      if (oldValue === undefined || newValue === undefined) {
        return null;
      }
      if (Math.abs(oldValue - newValue) < 1e-9) {
        return null;
      }
      const delta = newValue - oldValue;
      return `| ${key} | ${oldValue.toFixed(6)} | ${newValue.toFixed(6)} | ${delta >= 0 ? "+" : ""}${delta.toFixed(6)} |`;
    })
    .filter((row): row is string => Boolean(row));

  if (!changed.length) {
    return [
      `# ${newRevision.jobName}: Revision Comparison`,
      "",
      "No numeric differences detected between selected revisions.",
      "",
      `Old: ${new Date(oldRevision.timestamp).toLocaleString()}`,
      `New: ${new Date(newRevision.timestamp).toLocaleString()}`,
    ].join("\n");
  }

  return [
    `# ${newRevision.jobName}: Revision Comparison`,
    "",
    `Old: ${new Date(oldRevision.timestamp).toLocaleString()}`,
    `New: ${new Date(newRevision.timestamp).toLocaleString()}`,
    "",
    "| Field | Old | New | Delta |",
    "| --- | --- | --- | --- |",
    ...changed,
  ].join("\n");
}

function flattenNumbers(value: unknown, prefix = ""): Record<string, number> {
  const output: Record<string, number> = {};
  if (typeof value === "number" && Number.isFinite(value)) {
    output[prefix || "value"] = value;
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      Object.assign(output, flattenNumbers(item, `${prefix}[${index}]`));
    });
    return output;
  }

  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      Object.assign(output, flattenNumbers(entry, nextPrefix));
    }
  }

  return output;
}
