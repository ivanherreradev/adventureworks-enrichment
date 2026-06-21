import { sql, getPool } from './sqlClient';

export interface RawFeedbackRecord {
  feedbackId: string;
  payload: string;
}

export async function insertRawFeedback(record: RawFeedbackRecord): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('FeedbackID', sql.NVarChar(100), record.feedbackId)
    .input('Payload', sql.NVarChar(sql.MAX), record.payload)
    .query(
      `INSERT INTO [ai].[RawCustomerFeedback] (FeedbackID, Payload)
       VALUES (@FeedbackID, @Payload)`
    );
}
