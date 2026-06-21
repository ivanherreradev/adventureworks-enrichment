export interface FeedbackMessage {
  feedbackId: string;
  salesOrderId?: number | null;
  customerId?: number | null;
  productId?: number | null;
  channel?: string | null;
  createdDate?: string | null;
  feedbackText: string;
}

export type Sentiment = 'positive' | 'neutral' | 'mixed' | 'negative';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export type ProcessingStatus =
  | 'Pending'
  | 'Processing'
  | 'Enriched'
  | 'Failed'
  | 'InvalidAIResponse';

export interface EnrichmentResult {
  sentiment: Sentiment;
  sentimentScore: number;
  topic: string;
  subTopic?: string | null;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
}

export interface EnrichedFeedbackRecord {
  feedbackId: string;
  salesOrderId: number | null;
  customerKey: number | null;
  productKey: number | null;
  salesTerritoryKey: number | null;
  dateKey: number | null;
  channel: string | null;
  rawFeedbackText: string;
  sentiment: Sentiment | null;
  sentimentScore: number | null;
  topic: string | null;
  subTopic: string | null;
  urgency: Urgency | null;
  summary: string | null;
  suggestedAction: string | null;
  processingStatus: ProcessingStatus;
  openAIModel: string | null;
  processedAt: Date | null;
}
