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

export interface FeedbackEnrichmentRecord {
  feedbackId: string;
  openAIResult: string | null;
  processingStatus: ProcessingStatus;
  openAIModel: string | null;
  processedAt: Date | null;
}
