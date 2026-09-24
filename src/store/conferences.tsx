import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AttendanceStatus, Conference } from '../types/conference';
import {
  fetchConferences,
  createConference,
  approveDiscovery,
  updateAttendance,
  enrichConference,
  updateConferenceMeta,
  deleteConference,
  type NewConferenceInput,
  type ConferenceEditInput,
} from '../lib/conferenceRepo';

export type { NewConferenceInput, ConferenceEditInput };

/** Transient per-conference status for the (background) enrichment call. */
export type EnrichStatus = 'enriching' | 'failed';

interface ConferencesContextValue {
  conferences: Conference[];
  enrichStatus: Record<string, EnrichStatus>;
  loading: boolean;
  error: string | null;
  reload: () => void;
  getById: (id: string) => Conference | undefined;
  addConference: (input: NewConferenceInput) => Promise<Conference>;
  /** Persist an approved discovery candidate into the Conferences database. */
  approveConference: (candidate: Conference) => Promise<Conference>;
  /** Set a conference's planning attendance status (persisted to Supabase). */
  setAttendance: (id: string, status: AttendanceStatus) => Promise<void>;
  /** Run/refresh public-web enrichment for a conference (background-safe). */
  runEnrichment: (id: string) => Promise<void>;
  /** Edit conference metadata; re-enriches automatically if identity changed. */
  editConference: (id: string, patch: ConferenceEditInput) => Promise<Conference>;
  /** Delete a conference via the secure endpoint. */
  removeConference: (id: string) => Promise<void>;
}

const ConferencesContext = createContext<ConferencesContextValue | null>(null);

export function ConferencesProvider({ children }: { children: ReactNode }) {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [enrichStatus, setEnrichStatus] = useState<Record<string, EnrichStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConferences();
      setConferences(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load conferences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Run/refresh enrichment; keeps a transient status and swaps in the enriched row.
  const runEnrichment = useCallback(async (id: string): Promise<void> => {
    setEnrichStatus((prev) => ({ ...prev, [id]: 'enriching' }));
    try {
      const enriched = await enrichConference(id);
      setConferences((prev) => prev.map((c) => (c.id === id ? enriched : c)));
      setEnrichStatus((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      setEnrichStatus((prev) => ({ ...prev, [id]: 'failed' }));
      throw e;
    }
  }, []);

  const addConference = useCallback(
    async (input: NewConferenceInput): Promise<Conference> => {
      // 1. Persist + confirm immediately (creation is never blocked by enrichment).
      const created = await createConference(input);
      setConferences((prev) => [created, ...prev]);
      // 2. Enrich in the background so the salesperson never scores by hand.
      void runEnrichment(created.id).catch(() => {
        /* status is 'failed'; surfaced with a Retry in the UI */
      });
      return created;
    },
    [runEnrichment],
  );

  const approveConference = useCallback(async (candidate: Conference): Promise<Conference> => {
    const created = await approveDiscovery(candidate);
    setConferences((prev) => [created, ...prev]);
    return created;
  }, []);

  const setAttendance = useCallback(
    async (id: string, status: AttendanceStatus): Promise<void> => {
      // Optimistic update, rolled back on failure.
      let previous: AttendanceStatus | undefined;
      setConferences((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          previous = c.attendanceStatus;
          return { ...c, attendanceStatus: status };
        }),
      );
      try {
        const updated = await updateAttendance(id, status);
        setConferences((prev) => prev.map((c) => (c.id === id ? updated : c)));
      } catch (e) {
        if (previous !== undefined) {
          setConferences((prev) =>
            prev.map((c) => (c.id === id ? { ...c, attendanceStatus: previous! } : c)),
          );
        }
        throw e;
      }
    },
    [],
  );

  const editConference = useCallback(
    async (id: string, patch: ConferenceEditInput): Promise<Conference> => {
      const { conference, reenrich } = await updateConferenceMeta(id, patch);
      setConferences((prev) => prev.map((c) => (c.id === id ? conference : c)));
      // Identity/research fields changed → stale intelligence was cleared; re-enrich.
      if (reenrich) {
        void runEnrichment(id).catch(() => {
          /* status handled */
        });
      }
      return conference;
    },
    [runEnrichment],
  );

  const removeConference = useCallback(async (id: string): Promise<void> => {
    await deleteConference(id);
    setConferences((prev) => prev.filter((c) => c.id !== id));
    setEnrichStatus((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const getById = useCallback(
    (id: string) => conferences.find((c) => c.id === id),
    [conferences],
  );

  const value = useMemo<ConferencesContextValue>(
    () => ({
      conferences,
      enrichStatus,
      loading,
      error,
      reload: load,
      getById,
      addConference,
      approveConference,
      setAttendance,
      runEnrichment,
      editConference,
      removeConference,
    }),
    [
      conferences,
      enrichStatus,
      loading,
      error,
      load,
      getById,
      addConference,
      approveConference,
      setAttendance,
      runEnrichment,
      editConference,
      removeConference,
    ],
  );

  return (
    <ConferencesContext.Provider value={value}>{children}</ConferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConferences(): ConferencesContextValue {
  const ctx = useContext(ConferencesContext);
  if (!ctx) throw new Error('useConferences must be used within a ConferencesProvider');
  return ctx;
}
