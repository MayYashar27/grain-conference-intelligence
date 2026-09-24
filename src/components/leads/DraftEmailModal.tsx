import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Mail, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import { draftFollowUpEmail } from '../../lib/leadsRepo';
import { Button } from '../ui/Button';

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-400 focus:outline-none';

/**
 * Grounded follow-up email draft. Calls the server (one Gemini call) ONLY when
 * opened / regenerated — never on profile load. The draft is fully editable and
 * NOTHING is sent: this is drafting, not delivery.
 */
export function DraftEmailModal({
  contactId,
  contactName,
  contactEmail,
  onClose,
}: {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const ranOnce = useRef(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const draft = await draftFollowUpEmail(contactId);
      setSubject(draft.subject);
      setBody(draft.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draft the email.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Draft follow-up email"
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-brand-600" />
            <div>
              <h2 className="text-base font-bold text-ink-900">Draft follow-up email</h2>
              <p className="text-xs text-ink-500">To {contactName} · review &amp; edit — nothing is sent</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Loader2 size={22} className="animate-spin text-brand-500" />
              <p className="text-sm text-ink-600">Drafting from known context…</p>
              <p className="max-w-xs text-xs text-ink-400">
                Grounded in this lead's research, conference context and your notes.
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle size={20} className="text-rose-500" />
              <p className="text-sm text-ink-600">{error}</p>
              <Button onClick={generate}>
                <RefreshCw size={14} />
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="text-xs font-medium text-ink-500">To:</span>
                {contactEmail ? (
                  <span className="font-medium text-ink-800">{contactEmail}</span>
                ) : (
                  <span className="text-ink-400">{contactName} · no email on file</span>
                )}
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-600">Subject</span>
                <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-600">Body</span>
                <textarea
                  className={`${inputClass} min-h-[220px] resize-y leading-relaxed`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <p className="text-[11px] text-ink-400">
                A starting point grounded only in known context — edit freely before sending it
                yourself from your own email. Gmail integration could send this directly after review.
              </p>
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-5 py-3">
            <Button variant="secondary" onClick={generate}>
              <RefreshCw size={14} />
              Regenerate
            </Button>
            <Button onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
