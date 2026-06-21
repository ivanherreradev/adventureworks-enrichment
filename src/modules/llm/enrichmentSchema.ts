import type { EnrichmentResult, Sentiment, Urgency } from '../../types/feedback';

const VALID_SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'mixed', 'negative'];
const VALID_URGENCIES: Urgency[] = ['low', 'medium', 'high', 'critical'];

export interface ValidationResult {
  valid: boolean;
  result: EnrichmentResult | null;
  errors: string[];
}

export function validateEnrichment(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (raw === null || typeof raw !== 'object') {
    return {
      valid: false,
      result: null,
      errors: ['Enrichment response is not a JSON object.'],
    };
  }

  const obj = raw as Record<string, unknown>;

  if (!VALID_SENTIMENTS.includes(obj.sentiment as Sentiment)) {
    errors.push(
      `sentiment must be one of ${VALID_SENTIMENTS.join(', ')}, got "${String(obj.sentiment)}".`
    );
  }

  const sentimentScore = obj.sentimentScore;
  if (typeof sentimentScore !== 'number' || sentimentScore < -1 || sentimentScore > 1) {
    errors.push(
      `sentimentScore must be a number between -1 and 1, got "${String(sentimentScore)}".`
    );
  }

  if (typeof obj.topic !== 'string' || obj.topic.trim() === '') {
    errors.push('topic is required and must be a non-empty string.');
  }

  if (obj.subTopic !== undefined && obj.subTopic !== null && typeof obj.subTopic !== 'string') {
    errors.push('subTopic must be a string or null.');
  }

  if (!VALID_URGENCIES.includes(obj.urgency as Urgency)) {
    errors.push(
      `urgency must be one of ${VALID_URGENCIES.join(', ')}, got "${String(obj.urgency)}".`
    );
  }

  if (typeof obj.summary !== 'string' || obj.summary.trim() === '') {
    errors.push('summary is required and must be a non-empty string.');
  }

  if (typeof obj.suggestedAction !== 'string' || obj.suggestedAction.trim() === '') {
    errors.push('suggestedAction is required and must be a non-empty string.');
  }

  if (errors.length > 0) {
    return { valid: false, result: null, errors };
  }

  const result: EnrichmentResult = {
    sentiment: obj.sentiment as Sentiment,
    sentimentScore: obj.sentimentScore as number,
    topic: obj.topic as string,
    subTopic: (obj.subTopic as string | undefined | null) ?? null,
    urgency: obj.urgency as Urgency,
    summary: obj.summary as string,
    suggestedAction: obj.suggestedAction as string,
  };

  return { valid: true, result, errors: [] };
}
