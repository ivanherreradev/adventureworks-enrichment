import { sql, getPool } from './sqlClient';

export interface AuditLogEntry {
  feedbackId: string | null;
  stepName: string;
  status: string;
  message: string | null;
  durationMs: number | null;
}

export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('FeedbackID', sql.NVarChar(100), entry.feedbackId)
    .input('StepName', sql.NVarChar(100), entry.stepName)
    .input('Status', sql.NVarChar(50), entry.status)
    .input('Message', sql.NVarChar(sql.MAX), entry.message)
    .input('DurationMs', sql.Int, entry.durationMs)
    .query(
      `INSERT INTO [audit].[FeedbackProcessingLog]
       (FeedbackID, StepName, Status, Message, DurationMs)
       VALUES (@FeedbackID, @StepName, @Status, @Message, @DurationMs)`
    );
}
