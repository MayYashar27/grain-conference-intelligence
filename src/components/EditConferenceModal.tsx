import { useState, type FormEvent, type ReactNode } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import type { Conference, Region, Vertical } from '../types/conference';
import { useConferences } from '../store/conferences';
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

const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 transition-colors hover:border-ink-300 focus:border-brand-400 focus:outline-none';

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
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

/** Edit an existing conference's metadata. Changing identity/research-defining
 * fields (name, URL, dates, city, country) re-triggers enrichment automatically. */
export function EditConferenceModal({ conference, onClose }: { conference: Conference; onClose: () => void }) {
  const { editConference } = useConferences();
  const [name, setName] = useState(conference.name);
  const [url, setUrl] = useState(conference.url ?? '');
  const [startDate, setStartDate] = useState(conference.startDate);
  const [endDate, setEndDate] = useState(conference.endDate);
  const [city, setCity] = useState(conference.city);
  const [country, setCountry] = useState(conference.country);
  const [region, setRegion] = useState<Region | ''>(conference.region ?? '');
  const [vertical, setVertical] = useState<Vertical | ''>(conference.vertical ?? '');
  const [audienceSize, setAudienceSize] = useState(
    conference.audienceSize != null ? String(conference.audienceSize) : '',
  );
  const [description, setDescription] = useState(conference.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Will editing re-run research? (name/url/dates/location changed)
  const willReenrich =
    name.trim().toLowerCase() !== conference.name.trim().toLowerCase() ||
    (url.trim() || null) !== (conference.url ?? null) ||
    startDate !== conference.startDate ||
    endDate !== conference.endDate ||
    city.trim().toLowerCase() !== conference.city.trim().toLowerCase() ||
    country.trim().toLowerCase() !== conference.country.trim().toLowerCase();

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!name.trim() || !startDate || !endDate || !city.trim() || !country.trim()) {
      setError('Name, dates, city and country are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before the start date.');
      return;
    }
    setSaving(true);
    try {
      await editConference(conference.id, {
        name: name.trim(),
        url: url.trim() || null,
        startDate,
        endDate,
        city: city.trim(),
        country: country.trim(),
        region: region || null,
        vertical: vertical || null,
        audienceSize: audienceSize.trim() ? Number(audienceSize) : null,
        description: description.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit conference"
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2 className="text-base font-bold text-ink-900">Edit conference</h2>
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
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start date" required>
                <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="End date" required>
                <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="City" required>
                <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="Country" required>
                <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Region"
                value={region}
                onChange={(e) => setRegion(e.target.value as Region | '')}
                options={[{ value: '', label: 'Not specified' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
              />
              <Select
                label="Vertical"
                value={vertical}
                onChange={(e) => setVertical(e.target.value as Vertical | '')}
                options={[{ value: '', label: 'Not specified' }, ...VERTICALS.map((v) => ({ value: v, label: v }))]}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Estimated audience size">
                <input type="number" min="0" className={inputClass} value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} placeholder="Leave blank if unknown" />
              </Field>
              <Field label="Conference URL">
                <input type="url" className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              </Field>
            </div>
            <Field label="Description">
              <textarea className={`${inputClass} min-h-[72px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            {willReenrich && (
              <p className="flex items-start gap-1.5 rounded-lg bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
                <Sparkles size={13} className="mt-px shrink-0 text-brand-500" />
                You changed a research-defining field (name, URL, dates or location), so the fit
                scoring and evidence will be refreshed automatically.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-5 py-3">
            <p className="min-w-0 flex-1 text-xs text-rose-600" role="alert">
              {error}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
