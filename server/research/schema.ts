import { Type } from '@google/genai';

/**
 * Structured-output schema for lead research. Structure is enforced by the model;
 * truth/enums/URLs are enforced afterwards in validate.ts. Everything unknown is
 * nullable so "insufficient evidence" survives rather than being fabricated.
 * Note: relationship stage/momentum are NOT here — they are computed
 * deterministically from internal interaction history, not by the model.
 */
const evidenced = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING },
    evidence: { type: Type.STRING, description: 'One concise, source-backed sentence.' },
    source: { type: Type.STRING, nullable: true, description: 'Supporting URL, or null.' },
  },
  required: ['label', 'evidence', 'source'],
};

export const RESEARCH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    person: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, nullable: true },
        linkedin_url: {
          type: Type.STRING,
          nullable: true,
          description: 'Only if strong evidence it is THIS person (name + company). Else null.',
        },
        linkedin_status: { type: Type.STRING, enum: ['confident', 'not_confidently_identified'] },
        context: { type: Type.STRING, nullable: true },
      },
      required: ['title', 'linkedin_url', 'linkedin_status', 'context'],
    },
    company: {
      type: Type.OBJECT,
      properties: {
        website: { type: Type.STRING, nullable: true },
        what_it_does: { type: Type.STRING, nullable: true },
        category: { type: Type.STRING, nullable: true },
        markets: { type: Type.STRING, nullable: true },
      },
      required: ['website', 'what_it_does', 'category', 'markets'],
    },
    grain_signals: { type: Type.ARRAY, items: evidenced },
    financial_tech_maturity: {
      type: Type.OBJECT,
      properties: {
        level: {
          type: Type.STRING,
          enum: ['strong', 'some', 'manual_legacy', 'insufficient_evidence'],
          description: 'Use manual_legacy ONLY with explicit evidence; absence of evidence = insufficient_evidence.',
        },
        explanation: { type: Type.STRING },
      },
      required: ['level', 'explanation'],
    },
    existing_stack: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          used_for: { type: Type.STRING, nullable: true },
          relation: {
            type: Type.STRING,
            enum: ['competitor_overlapping', 'adjacent_complementary', 'general_fintech', 'unclear'],
          },
          source: { type: Type.STRING, nullable: true },
        },
        required: ['name', 'used_for', 'relation', 'source'],
      },
    },
    buying_signals: { type: Type.ARRAY, items: evidenced },
    icp_fit: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING, enum: ['high', 'medium', 'low', 'insufficient_evidence'] },
        explanation: { type: Type.STRING },
      },
      required: ['level', 'explanation'],
    },
    sales_motion: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: [
            'education_discovery',
            'transformation',
            'optimization',
            'differentiation_replacement',
            'expansion_complement',
            'insufficient_evidence',
          ],
        },
        explanation: { type: Type.STRING },
      },
      required: ['type', 'explanation'],
    },
    suggested_next_step: {
      type: Type.STRING,
      nullable: true,
      description: 'Concise, evidence-referencing. null if evidence is insufficient for a specific step.',
    },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING },
          title: { type: Type.STRING, nullable: true },
        },
        required: ['url', 'title'],
      },
    },
  },
  required: [
    'person',
    'company',
    'grain_signals',
    'financial_tech_maturity',
    'existing_stack',
    'buying_signals',
    'icp_fit',
    'sales_motion',
    'suggested_next_step',
    'sources',
  ],
};

export interface RawEvidenced {
  label: string;
  evidence: string;
  source: string | null;
}
export interface RawResearch {
  person: {
    title: string | null;
    linkedin_url: string | null;
    linkedin_status: string;
    context: string | null;
  };
  company: {
    website: string | null;
    what_it_does: string | null;
    category: string | null;
    markets: string | null;
  };
  grain_signals: RawEvidenced[];
  financial_tech_maturity: { level: string; explanation: string };
  existing_stack: { name: string; used_for: string | null; relation: string; source: string | null }[];
  buying_signals: RawEvidenced[];
  icp_fit: { level: string; explanation: string };
  sales_motion: { type: string; explanation: string };
  suggested_next_step: string | null;
  sources: { url: string; title: string | null }[];
}
