// src/lib/peer-support/filters.ts

// Normalize preferences to handle case sensitivity and whitespace
export function normalizePreferences(preferences: string[]): string[] {
  console.log('Normalizing preferences:', preferences);
  const normalized = preferences
    .filter(pref => typeof pref === 'string' && pref.trim() !== '')
    .map(pref => pref.toLowerCase().trim());
  console.log('Normalized preferences:', normalized);
  return normalized;
}

// Map UI support type to database format
export function mapSupportTypeToDatabase(uiType: string): string {
  if (uiType === "I need support") return "support-seeker";
  if (uiType === "I want to provide support") return "support-giver";
  return uiType; // Already in database format
}

// Map database support type to UI format
export function mapSupportTypeToUI(dbType: string): string {
  if (dbType === "support-seeker") return "I need support";
  if (dbType === "support-giver") return "I want to provide support";
  return dbType;
}
