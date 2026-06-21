-- AdventureWorks AI Sales Intelligence - Feedback processing audit log
-- Records each step of the feedback processing pipeline for observability
-- and troubleshooting. One row per processing step per feedback.

IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'audit' AND t.name = 'FeedbackProcessingLog'
)
BEGIN
    CREATE TABLE [audit].[FeedbackProcessingLog] (
        LogKey INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FeedbackID NVARCHAR(100) NULL,
        StepName NVARCHAR(100) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        Message NVARCHAR(MAX) NULL,
        DurationMs INT NULL,
        LoggedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_FeedbackProcessingLog_FeedbackID
        ON [audit].[FeedbackProcessingLog] (FeedbackID);

    CREATE INDEX IX_FeedbackProcessingLog_LoggedAt
        ON [audit].[FeedbackProcessingLog] (LoggedAt);
END
GO
