import { app, InvocationContext } from '@azure/functions';
import { loadConfig } from '../modules/config/config';
import { logInfo, logWarning, logError, logEvent } from '../modules/logging/logger';
import { enrichFeedback } from '../modules/llm/llmClient';
import { insertRawFeedback } from '../modules/sql/rawFeedbackRepository';
import { insertEnrichment } from '../modules/sql/enrichmentRepository';
import { insertAuditLog } from '../modules/sql/auditRepository';
import { Timer } from '../utils/timer';
import type { FeedbackMessage, FeedbackEnrichmentRecord, ProcessingStatus } from '../types/feedback';

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

async function persistEnrichment(
  feedbackId: string,
  status: ProcessingStatus,
  openAIResult: string | null,
  model: string | null
): Promise<void> {
  try {
    const record: FeedbackEnrichmentRecord = {
      feedbackId,
      openAIResult,
      processingStatus: status,
      openAIModel: model,
      processedAt: new Date(),
    };
    await insertEnrichment(record);
  } catch (error) {
    logError('EnrichmentPersistFailed', error, { feedbackId });
  }
}

async function enrichFeedbackQueueTrigger(
  queueEntry: unknown,
  context: InvocationContext
): Promise<void> {
  const config = loadConfig();
  context.info(`FeedbackProcessingStarted from queue "${config.storageQueueName}".`);

  let feedback: FeedbackMessage;
  const totalTimer = new Timer();

  try {
    feedback = parseFeedbackMessage(queueEntry);
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

  let llmResult: string;
  let model: string;
  try {
    const llmResponse = await enrichFeedback(feedback);
    llmResult = llmResponse.content;
    model = llmResponse.model;
  } catch (error) {
    logError('FeedbackProcessingFailed', error, { feedbackId });
    await recordAudit(
      feedbackId,
      'LlmEnrichment',
      'Failed',
      error instanceof Error ? error.message : String(error),
      null
    );
    await persistEnrichment(feedbackId, 'Failed', null, null);
    throw error;
  }

  try {
    const storeTimer = new Timer();
    await persistEnrichment(feedbackId, 'Enriched', llmResult, model);
    logEvent('FeedbackEnriched', {
      feedbackId,
      model,
      durationMs: storeTimer.elapsedMs(),
    });
    await recordAudit(feedbackId, 'StoreEnrichment', 'Success', null, storeTimer.elapsedMs());
  } catch (error) {
    logError('SqlWriteFailed', error, { feedbackId });
    await recordAudit(
      feedbackId,
      'StoreEnrichment',
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

app.storageQueue(FUNCTION_NAME, {
  queueName: process.env.STORAGE_QUEUE_NAME ?? 'feedback-incoming',
  connection: 'AzureWebJobsStorage',
  handler: enrichFeedbackQueueTrigger,
});

export default enrichFeedbackQueueTrigger;
