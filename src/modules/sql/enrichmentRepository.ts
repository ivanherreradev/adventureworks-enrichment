import { sql, getPool } from './sqlClient';
import type { FeedbackEnrichmentRecord } from '../../types/feedback';

export async function insertEnrichment(record: FeedbackEnrichmentRecord): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('FeedbackID', sql.NVarChar(100), record.feedbackId)
    .input('OpenAIResult', sql.NVarChar(sql.MAX), record.openAIResult)
    .input('ProcessingStatus', sql.NVarChar(50), record.processingStatus)
    .input('OpenAIModel', sql.NVarChar(100), record.openAIModel)
    .input('ProcessedAt', sql.DateTime2, record.processedAt)
    .query(
      `INSERT INTO [ai].[FeedbackEnrichment]
       (FeedbackID, OpenAIResult, ProcessingStatus, OpenAIModel, ProcessedAt)
       VALUES (@FeedbackID, @OpenAIResult, @ProcessingStatus, @OpenAIModel, @ProcessedAt)`
    );
}
