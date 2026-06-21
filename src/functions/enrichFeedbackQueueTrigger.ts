import { app, InvocationContext } from '@azure/functions';
import { loadConfig } from '../modules/config/config';
import { logInfo, logWarning, logError, logEvent } from '../modules/logging/logger';
import { enrichFeedback } from '../modules/openai/openaiClient';
import { validateEnrichment } from '../modules/openai/enrichmentSchema';
import { insertRawFeedback } from '../modules/sql/rawFeedbackRepository';
import { insertEnrichedFeedback } from '../modules/sql/factFeedbackRepository';
import { insertAuditLog } from '../modules/sql/auditRepository';
import { closePool } from '../modules/sql/sqlClient';
import { Timer } from '../utils/timer';
import type { FeedbackMessage, EnrichedFeedbackRecord, ProcessingStatus } from '../types/feedback';

const FUNCTION_NAME = 'EnrichFeedbackQueueTrigger';

function parseFeedbackMessage(raw: unknown): FeedbackMessage {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Queue message is not a valid JSON object.');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.feedbackId !== 'string' || obj.feedbackId.trim() === '') {
    throw new Error('feedbackId is required and must be a non-empty string.');
  }

  if (typeof obj.feedbackText !== 'string' || obj.feedbackText.trim() === '') {
    throw new Error('feedbackText is required and must be a non-empty string.');
  }

  return {
    feedbackId: obj.feedbackId,
    salesOrderId: typeof obj.salesOrderId === 'number' ? obj.salesOrderId : null,
    customerId: typeof obj.customerId === 'number' ? obj.customerId : null,
    productId: typeof obj.productId === 'number' ? obj.productId : null,
    channel: typeof obj.channel === 'string' ? obj.channel : null,
    createdDate: typeof obj.createdDate === 'string' ? obj.createdDate : null,
    feedbackText: obj.feedbackText,
  };
}

function toDateKey(createdDate: string | null): number | null {
  if (!createdDate) {
    return null;
  }
  const date = new Date(createdDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
      date.getUTCDate()
    ).padStart(2, '0')}`
  );
}

async function recordAudit(
  feedbackId: string,
  stepName: string,
  status: string,
  message: string | null,
  durationMs: number | null
): Promise<void> {
  try {
    await insertAuditLog({ feedbackId, stepName, status, message, durationMs });
  } catch (error) {
    logError('AuditWriteFailed', error, { feedbackId, stepName });
  }
}

async function enrichFeedbackQueueTrigger(
  queueEntry: unknown,
  context: InvocationContext
): Promise<void> {
  const config = loadConfig();
  context.info(`FeedbackProcessingStarted from queue "${config.storageQueueName}".`);

  let feedback: FeedbackMessage;
  let feedbackIdForAudit: string | null = null;
  const totalTimer = new Timer();

  try {
    feedback = parseFeedbackMessage(queueEntry);
    feedbackIdForAudit = feedback.feedbackId;
    logInfo('FeedbackProcessingStarted', { feedbackId: feedback.feedbackId });
  } catch (error) {
    logWarning('InvalidQueuePayload', {
      error: error instanceof Error ? error.message : String(error),
    });
    await recordAudit(
      'unknown',
      'ParseMessage',
      'Failed',
      error instanceof Error ? error.message : String(error),
      null
    );
    throw error;
  }

  const feedbackId = feedback.feedbackId;

  try {
    const rawTimer = new Timer();
    await insertRawFeedback({
      feedbackId,
      payload: JSON.stringify(queueEntry),
    });
    logEvent('RawFeedbackStored', { feedbackId, durationMs: rawTimer.elapsedMs() });
    await recordAudit(feedbackId, 'StoreRawFeedback', 'Success', null, rawTimer.elapsedMs());
  } catch (error) {
    logError('RawFeedbackStoreFailed', error, { feedbackId });
    await recordAudit(
      feedbackId,
      'StoreRawFeedback',
      'Failed',
      error instanceof Error ? error.message : String(error),
      null
    );
    throw error;
  }

  let rawContent: string;
  let model: string;
  try {
    const openAIResponse = await enrichFeedback(feedback);
    rawContent = openAIResponse.content;
    model = openAIResponse.model;
  } catch (error) {
    const status: ProcessingStatus = 'Failed';
    logError('FeedbackProcessingFailed', error, { feedbackId });
    await recordAudit(
      feedbackId,
      'OpenAIEnrichment',
      'Failed',
      error instanceof Error ? error.message : String(error),
      null
    );
    await persistFailedRecord(feedback, status, null, null);
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    const status: ProcessingStatus = 'InvalidAIResponse';
    logError('AIJsonParseFailed', error, { feedbackId, rawContent });
    await recordAudit(
      feedbackId,
      'ParseAIResponse',
      'Failed',
      `JSON.parse failed: ${error instanceof Error ? error.message : String(error)}`,
      null
    );
    await persistFailedRecord(feedback, status, null, rawContent);
    throw error;
  }

  const validation = validateEnrichment(parsed);
  if (!validation.valid) {
    const status: ProcessingStatus = 'InvalidAIResponse';
    logWarning('AIResponseSchemaInvalid', {
      feedbackId,
      errors: validation.errors,
      rawContent,
    });
    await recordAudit(
      feedbackId,
      'ValidateAIResponse',
      'Failed',
      validation.errors.join(' | '),
      null
    );
    await persistFailedRecord(feedback, status, null, rawContent);
    throw new Error(`Invalid AI response schema for feedback ${feedbackId}.`);
  }

  const enrichment = validation.result!;
  const enrichedRecord: EnrichedFeedbackRecord = {
    feedbackId,
    salesOrderId: feedback.salesOrderId ?? null,
    customerKey: feedback.customerId ?? null,
    productKey: feedback.productId ?? null,
    salesTerritoryKey: null,
    dateKey: toDateKey(feedback.createdDate),
    channel: feedback.channel ?? null,
    rawFeedbackText: feedback.feedbackText,
    sentiment: enrichment.sentiment,
    sentimentScore: enrichment.sentimentScore,
    topic: enrichment.topic,
    subTopic: enrichment.subTopic ?? null,
    urgency: enrichment.urgency,
    summary: enrichment.summary,
    suggestedAction: enrichment.suggestedAction,
    processingStatus: 'Enriched',
    openAIModel: model,
    processedAt: new Date(),
  };

  try {
    const factTimer = new Timer();
    await insertEnrichedFeedback(enrichedRecord);
    logEvent('FeedbackEnriched', {
      feedbackId,
      sentiment: enrichment.sentiment,
      topic: enrichment.topic,
      urgency: enrichment.urgency,
      durationMs: factTimer.elapsedMs(),
    });
    await recordAudit(feedbackId, 'StoreEnrichedFeedback', 'Success', null, factTimer.elapsedMs());
  } catch (error) {
    logError('SqlWriteFailed', error, { feedbackId });
    await recordAudit(
      feedbackId,
      'StoreEnrichedFeedback',
      'Failed',
      error instanceof Error ? error.message : String(error),
      null
    );
    throw error;
  }

  logInfo('FeedbackProcessingCompleted', {
    feedbackId,
    totalDurationMs: totalTimer.elapsedMs(),
  });
}

async function persistFailedRecord(
  feedback: FeedbackMessage,
  status: ProcessingStatus,
  model: string | null,
  rawResponse: string | null
): Promise<void> {
  try {
    const record: EnrichedFeedbackRecord = {
      feedbackId: feedback.feedbackId,
      salesOrderId: feedback.salesOrderId ?? null,
      customerKey: feedback.customerId ?? null,
      productKey: feedback.productId ?? null,
      salesTerritoryKey: null,
      dateKey: toDateKey(feedback.createdDate),
      channel: feedback.channel ?? null,
      rawFeedbackText: feedback.feedbackText,
      sentiment: null,
      sentimentScore: null,
      topic: null,
      subTopic: null,
      urgency: null,
      summary: null,
      suggestedAction: rawResponse,
      processingStatus: status,
      openAIModel: model,
      processedAt: new Date(),
    };
    await insertEnrichedFeedback(record);
  } catch (error) {
    logError('FailedRecordPersistFailed', error, { feedbackId: feedback.feedbackId });
  }
}

app.storageQueue(FUNCTION_NAME, {
  queueName: process.env.STORAGE_QUEUE_NAME ?? 'feedback-incoming',
  connection: 'AzureWebJobsStorage',
  handler: enrichFeedbackQueueTrigger,
});

export default enrichFeedbackQueueTrigger;
