-- AdventureWorks AI Sales Intelligence - Raw customer feedback table
-- Stores the raw feedback payload as received from the queue, before enrichment.
-- One row per received feedback message.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'ai' AND t.name = 'RawCustomerFeedback'
)
BEGIN
    CREATE TABLE [ai].[RawCustomerFeedback] (
        RawFeedbackKey INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FeedbackID NVARCHAR(100) NOT NULL,
        Payload NVARCHAR(MAX) NOT NULL,
        ReceivedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_RawCustomerFeedback_FeedbackID
        ON [ai].[RawCustomerFeedback] (FeedbackID);
END
GO
