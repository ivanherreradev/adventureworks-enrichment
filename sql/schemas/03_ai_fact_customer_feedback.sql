-- AdventureWorks AI Sales Intelligence - Enriched customer feedback fact
-- Stores feedback enriched by Azure OpenAI with sentiment, topic, urgency,
-- summary and suggested action. Joins to the dimensional model in analytics.
-- One row per feedback record.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'ai' AND t.name = 'FactCustomerFeedback'
)
BEGIN
    CREATE TABLE [ai].[FactCustomerFeedback] (
        FeedbackKey INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FeedbackID NVARCHAR(100) NOT NULL,
        SalesOrderID INT NULL,
        CustomerKey INT NULL,
        ProductKey INT NULL,
        SalesTerritoryKey INT NULL,
        DateKey INT NULL,
        Channel NVARCHAR(100) NULL,
        RawFeedbackText NVARCHAR(MAX) NOT NULL,
        Sentiment NVARCHAR(50) NULL,
        SentimentScore DECIMAL(5,2) NULL,
        Topic NVARCHAR(100) NULL,
        SubTopic NVARCHAR(100) NULL,
        Urgency NVARCHAR(50) NULL,
        Summary NVARCHAR(MAX) NULL,
        SuggestedAction NVARCHAR(MAX) NULL,
        ProcessingStatus NVARCHAR(50) NOT NULL,
        OpenAIModel NVARCHAR(100) NULL,
        ProcessedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE INDEX UX_FactCustomerFeedback_FeedbackID
        ON [ai].[FactCustomerFeedback] (FeedbackID);

    CREATE INDEX IX_FactCustomerFeedback_CustomerKey
        ON [ai].[FactCustomerFeedback] (CustomerKey);

    CREATE INDEX IX_FactCustomerFeedback_ProductKey
        ON [ai].[FactCustomerFeedback] (ProductKey);

    CREATE INDEX IX_FactCustomerFeedback_DateKey
        ON [ai].[FactCustomerFeedback] (DateKey);
END
GO
