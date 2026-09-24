import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import type { Region, Vertical } from '../types/conference';
import { useConferences, type NewConferenceInput } from '../store/conferences';
import { Button } from './ui/Button';
import { Select } from './ui/Select';

const REGIONS: Region[] = [
  'North America',
  'Europe',
  'Middle East',
  'Asia-Pacific',
  'Latin America',
  'Africa',
];

const VERTICALS: Vertical[] = [
  'Payments',
  'Fintech',
  'Treasury & Finance',
  'Travel',
  'E-commerce & Marketplaces',
  'Technology & SaaS',
];

interface FormState {
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  region: Region | '';
  vertical: Vertical | '';
  audienceSize: string;
  description: string;
}

const initialForm: FormState = {
  name: '',
  url: '',
  startDate: '',
  endDate: '',
  city: '',
  country: '',
  region: '',
  vertical: '',
  audienceSize: '',
  description: '',
};

/** A manually added conference is unscored until the intelligence layer enriches it. */
const UNSCORED_DIMENSIONS: NewConferenceInput['dimensions'] = {
  companyFit: { score: null, signals: [], evidence: '' },
  buyerFit: { score: null, signals: [], evidence: '' },
  agendaRelevance: { score: null, signals: [], evidence: '' },
  networking: { score: null, signals: [], evidence: '' },
};

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none';

export function AddConferenceModal({ onClose }: { onClose: () => void }) {
  const { addConference } = useConferences();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate) e.endDate = 'End date is required';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      e.endDate = 'End date cannot be before the start date';
    }
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.country.trim()) e.country = 'Country is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const input: NewConferenceInput = {
      name: form.name.trim(),
      url: form.url.trim() || null,
      startDate: form.startDate,
      endDate: form.endDate,
      city: form.city.trim(),
      country: form.country.trim(),
      region: form.region || null,
      vertical: form.vertical || null,
      audienceSize: form.audienceSize.trim() ? Number(form.audienceSize) : null,
      description: form.description.trim(),
      // Unscored on creation — scoring/evidence come later from the intelligence layer.
      source: null,
      sources: [],
      evidenceConfidence: null,
      dimensions: UNSCORED_DIMENSIONS,
    };

    setSubmitting(true);
    try {
      const created = await addConference(input);
      navigate(`/conference/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add the conference.');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add a conference"
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-900">Add a conference</h2>
            <p className="text-xs text-ink-500">
              Just the facts — fit scoring and evidence are researched automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <Field label="Conference name" required>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Money20/20 Europe"
              />
              {errors.name && <span className="text-[11px] text-rose-600">{errors.name}</span>}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start date" required>
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
                {errors.startDate && (
                  <span className="text-[11px] text-rose-600">{errors.startDate}</span>
                )}
              </Field>
              <Field label="End date" required>
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
                {errors.endDate && (
                  <span className="text-[11px] text-rose-600">{errors.endDate}</span>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="City" required>
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Amsterdam"
                />
                {errors.city && <span className="text-[11px] text-rose-600">{errors.city}</span>}
              </Field>
              <Field label="Country" required>
                <input
                  className={inputClass}
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="Netherlands"
                />
                {errors.country && (
                  <span className="text-[11px] text-rose-600">{errors.country}</span>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Region"
                value={form.region}
                onChange={(e) => set('region', e.target.value as Region | '')}
                options={[
                  { value: '', label: 'Not specified' },
                  ...REGIONS.map((r) => ({ value: r, label: r })),
                ]}
              />
              <Select
                label="Vertical"
                value={form.vertical}
                onChange={(e) => set('vertical', e.target.value as Vertical | '')}
                options={[
                  { value: '', label: 'Not specified' },
                  ...VERTICALS.map((v) => ({ value: v, label: v })),
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Estimated audience size" hint="Leave blank if unknown">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.audienceSize}
                  onChange={(e) => set('audienceSize', e.target.value)}
                  placeholder="e.g. 8000"
                />
              </Field>
              <Field label="Conference URL">
                <input
                  type="url"
                  className={inputClass}
                  value={form.url}
                  onChange={(e) => set('url', e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-[72px] resize-y`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What is this conference and who attends?"
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-5 py-3">
            <p className="min-w-0 flex-1 text-xs text-rose-600" role="alert">
              {submitError}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Adding…
                  </>
                ) : (
                  'Add conference'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
