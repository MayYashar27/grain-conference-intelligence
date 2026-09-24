/**
 * Prototype auto-research policy (pure, testable).
 *
 * Public web/company/person research is expensive/external, so we only auto-run
 * it when a contact has NO persisted research yet. An existing contact that
 * already has research is NOT re-researched just because another interaction was
 * captured — the (cheap, internal) Relationship layer is recomputed client-side
 * from live interactions instead, with no Gemini call.
 */
export function shouldAutoResearch(hasPersistedResearch: boolean): boolean {
  return !hasPersistedResearch;
}
