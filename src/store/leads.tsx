import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Contact, Interaction } from '../types/lead';
import type { LeadResearch } from '../types/research';
import {
  fetchLeads,
  captureLead,
  updateContact,
  updateInteraction,
  researchLead,
  deleteLead,
  resolveContactReview,
  type CaptureLeadInput,
  type CaptureLeadResult,
} from '../lib/leadsRepo';
import { shouldAutoResearch } from '../lib/researchPolicy';

export type { CaptureLeadInput, CaptureLeadResult };

/** Transient per-contact status for the (background) public research call. */
export type ResearchStatus = 'researching' | 'failed';

interface LeadsContextValue {
  contacts: Contact[];
  interactions: Interaction[];
  research: Record<string, LeadResearch>;
  researchStatus: Record<string, ResearchStatus>;
  loading: boolean;
  error: string | null;
  reload: () => void;
  capture: (input: CaptureLeadInput) => Promise<CaptureLeadResult>;
  editContact: (
    id: string,
    patch: Partial<Pick<Contact, 'fullName' | 'company' | 'phone' | 'email'>>,
  ) => Promise<Contact>;
  editInteraction: (
    id: string,
    patch: { note?: string | null; conferenceId?: string | null },
  ) => Promise<Interaction>;
  /** Explicit run/refresh of public research. */
  runResearch: (contactId: string) => Promise<LeadResearch>;
  removeLead: (contactId: string) => Promise<void>;
  /** Resolve a pending company/name review (Keep current, or Update to the new value). */
  resolveReview: (contactId: string, field: 'company' | 'name', action: 'keep' | 'update') => Promise<void>;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [research, setResearch] = useState<Record<string, LeadResearch>>({});
  const [researchStatus, setResearchStatus] = useState<Record<string, ResearchStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mirror `research` in a ref so capture can check existence without stale closures.
  const researchRef = useRef(research);
  useEffect(() => {
    researchRef.current = research;
  }, [research]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { contacts: c, interactions: i, research: r } = await fetchLeads();
      setContacts(c);
      setInteractions(i);
      setResearch(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runResearch = useCallback(async (contactId: string): Promise<LeadResearch> => {
    setResearchStatus((prev) => ({ ...prev, [contactId]: 'researching' }));
    try {
      const result = await researchLead(contactId);
      setResearch((prev) => ({ ...prev, [contactId]: result }));
      setResearchStatus((prev) => {
        const next = { ...prev };
        delete next[contactId];
        return next;
      });
      return result;
    } catch (e) {
      setResearchStatus((prev) => ({ ...prev, [contactId]: 'failed' }));
      throw e;
    }
  }, []);

  const capture = useCallback(
    async (input: CaptureLeadInput): Promise<CaptureLeadResult> => {
      // 1. Persist + confirm immediately (never blocked by research).
      const result = await captureLead(input);
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === result.contact.id);
        if (idx === -1) return [result.contact, ...prev];
        const next = [...prev];
        next[idx] = result.contact;
        return next;
      });
      setInteractions((prev) => [result.interaction, ...prev]);

      // 2. Auto-run public research in the background ONLY when none exists yet.
      //    Existing research is not re-run just because a new interaction landed;
      //    the Relationship layer updates client-side from live interactions.
      if (shouldAutoResearch(!!researchRef.current[result.contact.id])) {
        void runResearch(result.contact.id).catch(() => {
          /* status is set to 'failed'; surfaced in the UI with Retry */
        });
      }
      return result;
    },
    [runResearch],
  );

  const editContact = useCallback(
    async (id: string, patch: Partial<Pick<Contact, 'fullName' | 'company' | 'phone' | 'email'>>) => {
      const updated = await updateContact(id, patch);
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [],
  );

  const editInteraction = useCallback(
    async (id: string, patch: { note?: string | null; conferenceId?: string | null }) => {
      const updated = await updateInteraction(id, patch);
      setInteractions((prev) => prev.map((i) => (i.id === id ? updated : i)));
      return updated;
    },
    [],
  );

  const resolveReview = useCallback(
    async (contactId: string, field: 'company' | 'name', action: 'keep' | 'update'): Promise<void> => {
      const updated = await resolveContactReview(contactId, field, action);
      setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    },
    [],
  );

  const removeLead = useCallback(async (contactId: string): Promise<void> => {
    await deleteLead(contactId);
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setInteractions((prev) => prev.filter((i) => i.contactId !== contactId));
    setResearch((prev) => {
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
    setResearchStatus((prev) => {
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
  }, []);

  const value = useMemo<LeadsContextValue>(
    () => ({
      contacts,
      interactions,
      research,
      researchStatus,
      loading,
      error,
      reload: load,
      capture,
      editContact,
      editInteraction,
      runResearch,
      removeLead,
      resolveReview,
    }),
    [contacts, interactions, research, researchStatus, loading, error, load, capture, editContact, editInteraction, runResearch, removeLead, resolveReview],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be used within a LeadsProvider');
  return ctx;
}
