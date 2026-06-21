import { sql, getPool } from './sqlClient';
import type { EnrichedFeedbackRecord } from '../../types/feedback';

export async function insertEnrichedFeedback(record: EnrichedFeedbackRecord): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('FeedbackID', sql.NVarChar(100), record.feedbackId)
    .input('SalesOrderID', sql.Int, record.salesOrderId)
    .input('CustomerKey', sql.Int, record.customerKey)
    .input('ProductKey', sql.Int, record.productKey)
    .input('SalesTerritoryKey', sql.Int, record.salesTerritoryKey)
    .input('DateKey', sql.Int, record.dateKey)
    .input('Channel', sql.NVarChar(100), record.channel)
    .input('RawFeedbackText', sql.NVarChar(sql.MAX), record.rawFeedbackText)
    .input('Sentiment', sql.NVarChar(50), record.sentiment)
    .input('SentimentScore', sql.Decimal(5, 2), record.sentimentScore)
    .input('Topic', sql.NVarChar(100), record.topic)
    .input('SubTopic', sql.NVarChar(100), record.subTopic)
    .input('Urgency', sql.NVarChar(50), record.urgency)
    .input('Summary', sql.NVarChar(sql.MAX), record.summary)
    .input('SuggestedAction', sql.NVarChar(sql.MAX), record.suggestedAction)
    .input('ProcessingStatus', sql.NVarChar(50), record.processingStatus)
    .input('OpenAIModel', sql.NVarChar(100), record.openAIModel)
    .input('ProcessedAt', sql.DateTime2, record.processedAt)
    .query(
      `INSERT INTO [ai].[FactCustomerFeedback]
       (FeedbackID, SalesOrderID, CustomerKey, ProductKey, SalesTerritoryKey, DateKey, Channel,
        RawFeedbackText, Sentiment, SentimentScore, Topic, SubTopic, Urgency, Summary,
        SuggestedAction, ProcessingStatus, OpenAIModel, ProcessedAt)
       VALUES
       (@FeedbackID, @SalesOrderID, @CustomerKey, @ProductKey, @SalesTerritoryKey, @DateKey, @Channel,
        @RawFeedbackText, @Sentiment, @SentimentScore, @Topic, @SubTopic, @Urgency, @Summary,
        @SuggestedAction, @ProcessingStatus, @OpenAIModel, @ProcessedAt)`
    );
}
