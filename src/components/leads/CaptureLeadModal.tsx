import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, CheckCircle2, UserPlus, MapPin } from 'lucide-react';
import { useLeads, type CaptureLeadResult } from '../../store/leads';
import { Button } from '../ui/Button';

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Fast lead capture. The conference context (if any) is carried in — the
 * salesperson never reselects it. Save is never blocked by optional fields.
 */
export function CaptureLeadModal({
  conferenceId,
  conferenceName,
  onClose,
}: {
  conferenceId: string | null;
  conferenceName: string | null;
  onClose: () => void;
}) {
  const { capture } = useLeads();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<CaptureLeadResult | null>(null);

  function reset() {
    setFullName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setNote('');
    setError(null);
    setSaved(null);
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!fullName.trim() || !company.trim() || !phone.trim()) {
      setError('Name, company and phone are required.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await capture({
        fullName: fullName.trim(),
        company: company.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        note: note.trim() || null,
        conferenceId,
      });
      setSaved(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the lead.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add lead"
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-900">Add lead</h2>
            <p className="flex items-center gap-1 text-xs text-ink-500">
              {conferenceName ? (
                <>
                  <MapPin size={12} className="text-brand-500" />
                  Adding from <span className="font-medium text-ink-700">{conferenceName}</span>
                </>
              ) : (
                'Direct / non-conference lead'
              )}
            </p>
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

        {saved ? (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            {(() => {
              const hasConflict = saved.companyConflict || saved.nameConflict;
              const iconWrap = saved.isExisting
                ? 'bg-sky-50 text-sky-600'
                : 'bg-brand-50 text-brand-600';
              return (
                <>
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${iconWrap}`}>
                    <CheckCircle2 size={26} />
                  </div>
                  {saved.isExisting ? (
                    <>
                      <h3 className="text-base font-semibold text-ink-900">Existing lead found</h3>
                      <p className="mt-1 max-w-xs text-sm text-ink-500">
                        This interaction was added to{' '}
                        <span className="font-medium text-ink-700">{saved.contact.fullName}</span>'s
                        history.
                      </p>
                      {hasConflict && (
                        <p className="mt-2 max-w-xs text-xs text-amber-700">
                          Matched by phone — some details differ from what you entered.{' '}
                          <span className="font-medium">Review on the lead profile.</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-semibold text-ink-900">
                        {saved.contact.fullName} saved.
                      </h3>
                      <p className="mt-1 text-sm text-ink-500">New contact · first interaction added</p>
                    </>
                  )}
                </>
              );
            })()}
            <div className="mt-5 flex w-full gap-2">
              <Button variant="secondary" className="flex-1" onClick={reset}>
                <UserPlus size={15} />
                Capture another
              </Button>
              <Button className="flex-1" onClick={() => navigate(`/leads/${saved.contact.id}`)}>
                View lead
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <Field label="Full name" required>
                <input
                  autoFocus
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sarah Cohen"
                />
              </Field>
              <Field label="Company" required>
                <input
                  className={inputClass}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nexora Payments"
                />
              </Field>
              <Field label="Phone number" required>
                <input
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+972 50 123 4567"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="optional"
                />
              </Field>
              <Field label="Quick note">
                <textarea
                  className={`${inputClass} min-h-[64px] resize-y`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="optional — what did you discuss?"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-5 py-3">
              <p className="min-w-0 flex-1 text-xs text-rose-600" role="alert">
                {error}
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save lead'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
