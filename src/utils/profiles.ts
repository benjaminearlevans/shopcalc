import { LocalStorage } from "@raycast/api";
import { ExtensionPreferences, FractionPrecision, ProjectProfile, ToolContext, ToleranceMode, Unit } from "../types";

const PROFILES_KEY = "shopcalc_profiles";
const ACTIVE_PROFILE_KEY = "shopcalc_active_profile";
const MAX_PROFILES = 20;

const FALLBACK_PROFILE_ID = "default-profile";

function now() {
  return Date.now();
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function baseProfileFromPrefs(prefs?: ExtensionPreferences): ProjectProfile {
  const timestamp = now();
  return {
    id: FALLBACK_PROFILE_ID,
    name: "Default Shop",
    description: "General-purpose profile from extension preferences.",
    unit: ((prefs?.defaultUnit as Unit) ?? "inches") as Unit,
    fractionPrecision: Number(prefs?.fractionPrecision ?? "16") as FractionPrecision,
    kerfWidth: Number(prefs?.kerfWidth ?? "0.125"),
    toleranceMode: "standard",
    toolContext: "none",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function sanitizeProfile(raw: ProjectProfile): ProjectProfile {
  const allowedUnits: Unit[] = ["inches", "mm", "cm"];
  const allowedPrecision: FractionPrecision[] = [8, 16, 32, 64];
  const allowedTolerance: ToleranceMode[] = ["tight", "standard", "loose"];
  const allowedToolContext: ToolContext[] = ["none", "router", "table-saw", "drill", "pocket-screw"];

  return {
    ...raw,
    id: raw.id || createId(),
    name: (raw.name || "Untitled Profile").trim(),
    description: raw.description?.trim() || undefined,
    unit: allowedUnits.includes(raw.unit) ? raw.unit : "inches",
    fractionPrecision: allowedPrecision.includes(raw.fractionPrecision) ? raw.fractionPrecision : 16,
    kerfWidth: Number.isFinite(raw.kerfWidth) && raw.kerfWidth > 0 ? raw.kerfWidth : 0.125,
    toleranceMode: allowedTolerance.includes(raw.toleranceMode) ? raw.toleranceMode : "standard",
    toolContext: allowedToolContext.includes(raw.toolContext) ? raw.toolContext : "none",
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : now(),
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : now(),
  };
}

export async function getProfiles(prefs?: ExtensionPreferences): Promise<ProjectProfile[]> {
  const raw = await LocalStorage.getItem<string>(PROFILES_KEY);
  if (!raw) {
    const fallback = baseProfileFromPrefs(prefs);
    await LocalStorage.setItem(PROFILES_KEY, JSON.stringify([fallback]));
    return [fallback];
  }

  try {
    const parsed = JSON.parse(raw) as ProjectProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const fallback = baseProfileFromPrefs(prefs);
      await LocalStorage.setItem(PROFILES_KEY, JSON.stringify([fallback]));
      return [fallback];
    }

    const sanitized = parsed.map(sanitizeProfile).slice(0, MAX_PROFILES);
    await LocalStorage.setItem(PROFILES_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    const fallback = baseProfileFromPrefs(prefs);
    await LocalStorage.setItem(PROFILES_KEY, JSON.stringify([fallback]));
    return [fallback];
  }
}

export async function getActiveProfileId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(ACTIVE_PROFILE_KEY)) ?? null;
}

export async function getActiveProfile(prefs?: ExtensionPreferences): Promise<ProjectProfile> {
  const profiles = await getProfiles(prefs);
  const activeId = await getActiveProfileId();
  if (activeId) {
    const found = profiles.find((profile) => profile.id === activeId);
    if (found) {
      return found;
    }
  }
  return profiles[0] ?? baseProfileFromPrefs(prefs);
}

export async function setActiveProfile(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export async function upsertProfile(
  profile: Omit<ProjectProfile, "createdAt" | "updatedAt"> & Partial<Pick<ProjectProfile, "createdAt" | "updatedAt">>,
  prefs?: ExtensionPreferences,
): Promise<ProjectProfile> {
  const profiles = await getProfiles(prefs);
  const existingIndex = profiles.findIndex((item) => item.id === profile.id);
  const existing = existingIndex >= 0 ? profiles[existingIndex] : undefined;

  const next = sanitizeProfile({
    ...baseProfileFromPrefs(prefs),
    ...existing,
    ...profile,
    id: profile.id || createId(),
    createdAt: existing?.createdAt ?? profile.createdAt ?? now(),
    updatedAt: now(),
  });

  if (existingIndex >= 0) {
    profiles[existingIndex] = next;
  } else {
    profiles.unshift(next);
  }

  if (profiles.length > MAX_PROFILES) {
    profiles.length = MAX_PROFILES;
  }

  await LocalStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return next;
}

export async function deleteProfile(id: string, prefs?: ExtensionPreferences): Promise<void> {
  const profiles = await getProfiles(prefs);
  const next = profiles.filter((profile) => profile.id !== id);

  if (next.length === 0) {
    const fallback = baseProfileFromPrefs(prefs);
    await LocalStorage.setItem(PROFILES_KEY, JSON.stringify([fallback]));
    await setActiveProfile(fallback.id);
    return;
  }

  await LocalStorage.setItem(PROFILES_KEY, JSON.stringify(next));
  const active = await getActiveProfileId();
  if (active === id) {
    await setActiveProfile(next[0].id);
  }
}

export async function profileToPrefillDefaults(prefs?: ExtensionPreferences): Promise<{
  unit: Unit;
  toleranceMode: ToleranceMode;
  toolContext: ToolContext;
  kerfWidth: string;
  fractionPrecision: string;
}> {
  const active = await getActiveProfile(prefs);
  return {
    unit: active.unit,
    toleranceMode: active.toleranceMode,
    toolContext: active.toolContext,
    kerfWidth: String(active.kerfWidth),
    fractionPrecision: String(active.fractionPrecision),
  };
}
