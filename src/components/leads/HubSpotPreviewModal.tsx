import { X, ArrowRight, Info, ArrowLeftRight } from 'lucide-react';

/** How our fields map onto HubSpot objects. Grouped, concise — not a data dump. */
const OUTBOUND: { group: string; fields: string; to: string }[] = [
  { group: 'Contact', fields: 'Name · Phone · Email · Enriched role · LinkedIn', to: 'HubSpot Contact' },
  { group: 'Company', fields: 'Company name', to: 'HubSpot Company' },
  { group: 'Relationship', fields: 'Stage · Momentum · Follow-up Priority', to: 'Custom properties' },
  { group: 'Activity', fields: 'Conference · interaction date · note', to: 'CRM activity' },
  { group: 'AI brief (optional)', fields: 'Concise brief', to: 'CRM note' },
];

/** Honest HubSpot preview — explains the path; does NOT claim a live connection. */
export function HubSpotPreviewModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="HubSpot integration preview"
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2 className="text-base font-bold text-ink-900">HubSpot integration preview</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Info size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <span>
              <span className="font-semibold">This prototype is not connected to a Grain HubSpot account.</span>{' '}
              Nothing is synced — the mapping below shows how the production integration would work.
            </span>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <ArrowRight size={13} /> This tool → HubSpot
            </div>
            <div className="overflow-hidden rounded-xl border border-ink-200">
              {OUTBOUND.map((m, i) => (
                <div key={i} className={`px-3 py-2.5 ${i > 0 ? 'border-t border-ink-100' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">{m.group}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-500">
                      <ArrowRight size={12} className="text-ink-300" />
                      {m.to}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">{m.fields}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-conference behaviour — kept as a concise one-liner. */}
          <p className="text-xs text-ink-500">
            One person met at several conferences stays a single HubSpot Contact with multiple
            activities — not duplicate leads. Only the fields above are mapped.
          </p>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <ArrowLeftRight size={13} /> HubSpot → Relationship intelligence
            </div>
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-sm leading-relaxed text-ink-600">
                With HubSpot connected, calls, emails, meetings and deal-stage updates would
                automatically join the conference history shown here. Relationship Intelligence could
                then evaluate the <span className="font-medium text-ink-800">full sales relationship</span> —
                not only conference interactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
