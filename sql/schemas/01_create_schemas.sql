-- AdventureWorks AI Sales Intelligence - Schema creation
-- Creates the ai and audit schemas used by the feedback enrichment pipeline.

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'ai')
BEGIN
    EXEC('CREATE SCHEMA [ai]');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'audit')
BEGIN
    EXEC('CREATE SCHEMA [audit]');
END
GO
