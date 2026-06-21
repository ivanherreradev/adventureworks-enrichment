-- AdventureWorks AI Sales Intelligence - Feedback enrichment result
-- Stores the raw JSON result from Azure OpenAI processing for each feedback.
-- One row per feedback record.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'ai' AND t.name = 'FeedbackEnrichment'
)
BEGIN
    CREATE TABLE [ai].[FeedbackEnrichment] (
        EnrichmentKey INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FeedbackID NVARCHAR(100) NOT NULL,
        OpenAIResult NVARCHAR(MAX) NULL,
        ProcessingStatus NVARCHAR(50) NOT NULL,
        OpenAIModel NVARCHAR(100) NULL,
        ProcessedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_FeedbackEnrichment_FeedbackID
        ON [ai].[FeedbackEnrichment] (FeedbackID);
END
GO
