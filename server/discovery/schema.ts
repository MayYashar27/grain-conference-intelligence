import { Type } from '@google/genai';

/**
 * Gemini structured-output schema for discovery. Structure is enforced by the
 * model; truth/range is enforced afterwards by validate.ts. Scores are integers
 * here (rubric values validated later) and every genuinely-unknown field is
 * nullable so "unknown" survives as null rather than a fabricated value.
 */

const dimensionSchema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      nullable: true,
      description:
        'Classify the evidence against the rubric: one of 100, 75, 50, 25, 0. Use null ONLY when there is essentially no evidence for this dimension — never as a default when evidence exists.',
    },
    signals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Up to ~5 short, scannable evidence cues (e.g. "PSPs", "Treasury leaders").',
    },
    evidence: {
      type: Type.STRING,
      nullable: true,
      description: 'One concise sentence of supporting evidence, or null if unknown.',
    },
  },
  required: ['score', 'signals', 'evidence'],
};

export const DISCOVERY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidates: {
      type: Type.ARRAY,
      description: 'Up to 8 real, upcoming conference candidates grounded in public evidence.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          start_date: { type: Type.STRING, nullable: true, description: 'YYYY-MM-DD or null.' },
          end_date: { type: Type.STRING, nullable: true, description: 'YYYY-MM-DD or null.' },
          location: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING, nullable: true },
              country: { type: Type.STRING, nullable: true },
              region: {
                type: Type.STRING,
                nullable: true,
                description:
                  'One of: North America, Europe, Middle East, Asia-Pacific, Latin America, Africa — or null.',
              },
            },
            required: ['city', 'country', 'region'],
          },
          vertical: {
            type: Type.STRING,
            nullable: true,
            description:
              'One of: Payments, Fintech, Treasury & Finance, Travel, E-commerce & Marketplaces, Technology & SaaS — or null.',
          },
          audience_size: {
            type: Type.OBJECT,
            description:
              'Audience size WITH provenance. Set value only if a source explicitly states the figure; otherwise value must be null. Never estimate.',
            properties: {
              value: { type: Type.INTEGER, nullable: true },
              evidence: {
                type: Type.STRING,
                nullable: true,
                description:
                  'The exact source-supported statement of the figure (e.g. "official site states 7,000 attendees"), or null if not sourced.',
              },
            },
            required: ['value', 'evidence'],
          },
          official_url: { type: Type.STRING, nullable: true },
          dimensions: {
            type: Type.OBJECT,
            properties: {
              company_fit: dimensionSchema,
              buyer_fit: dimensionSchema,
              agenda_relevance: dimensionSchema,
              networking_opportunity: dimensionSchema,
            },
            required: ['company_fit', 'buyer_fit', 'agenda_relevance', 'networking_opportunity'],
          },
          evidence_confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'Completeness/quality of the public evidence.',
          },
          sources: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Public URLs (prefer the official conference site) supporting this record.',
          },
        },
        required: [
          'name',
          'start_date',
          'end_date',
          'location',
          'vertical',
          'audience_size',
          'official_url',
          'dimensions',
          'evidence_confidence',
          'sources',
        ],
      },
    },
  },
  required: ['candidates'],
};

/** Raw (snake_case) candidate shape as returned by the model. */
export interface RawDimension {
  score: number | null;
  signals: string[];
  evidence: string | null;
}

export interface RawCandidate {
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: { city: string | null; country: string | null; region: string | null };
  vertical: string | null;
  audience_size: { value: number | null; evidence: string | null } | null;
  official_url: string | null;
  dimensions: {
    company_fit: RawDimension;
    buyer_fit: RawDimension;
    agenda_relevance: RawDimension;
    networking_opportunity: RawDimension;
  };
  evidence_confidence: string;
  sources: string[];
}
