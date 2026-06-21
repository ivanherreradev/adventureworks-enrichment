# Architecture Document

# AdventureWorks AI Sales Intelligence - Version 1

## 1. Purpose

This document describes the technical architecture for Version 1 of the AdventureWorks AI Sales Intelligence project.

The system combines a traditional AdventureWorks dimensional analytics model with an Azure AI enrichment pipeline. Customer feedback is submitted through an HTTP endpoint, placed into a queue, processed asynchronously by Azure Functions, enriched using Azure OpenAI, and stored in Azure SQL for analytics.

The architecture is intentionally designed as a learning project. Each Azure resource exists to teach a concrete cloud, data engineering, or AI engineering concept.

---

## 2. Architecture Goals

The architecture should:

1. Be simple enough for a learner to build end to end.
2. Use real Azure services in a coherent way.
3. Keep ingestion, processing, storage, and analytics clearly separated.
4. Demonstrate asynchronous processing with queues.
5. Demonstrate secure configuration with Key Vault.
6. Demonstrate resource-to-resource authentication with Managed Identity.
7. Demonstrate AI enrichment with Azure OpenAI.
8. Demonstrate observability with Application Insights and Log Analytics.
9. Produce analytical data that can be queried from SQL.

---

## 3. Version 1 Scope

## 3.1 Included

Version 1 includes:

- Azure SQL Database
- Azure Storage Account
- Azure Queue Storage
- Azure Functions
- Azure OpenAI
- Azure Key Vault
- Managed Identity
- Application Insights
- Log Analytics Workspace

## 3.2 Excluded

Version 1 does not include:

- Azure AI Search
- Durable Functions
- Service Bus
- Event Grid
- API Management
- React frontend
- Container Apps
- Private networking
- Infrastructure as Code
- CI/CD pipelines

These are candidates for later versions.

---

## 4. High-Level Architecture

```text
                  +---------------------------+
                  |     User / Test Client    |
                  |  Postman, curl, script    |
                  +-------------+-------------+
                                |
                                | HTTP POST /feedback
                                v
                  +-------------+-------------+
                  |      Azure Function       |
                  | SubmitFeedbackHttpTrigger |
                  +-------------+-------------+
                                |
                                | Queue message
                                v
                  +-------------+-------------+
                  |    Azure Storage Queue    |
                  |     feedback-incoming     |
                  +-------------+-------------+
                                |
                                | Queue trigger
                                v
                  +-------------+-------------+
                  |      Azure Function       |
                  | EnrichFeedbackQueueTrigger|
                  +------+------+-------------+
                         |     |
                         |     | OpenAI request
                         |     v
                         |  +--+----------------+
                         |  |    Azure OpenAI    |
                         |  |  Feedback Enricher |
                         |  +--+----------------+
                         |
                         | SQL insert/update
                         v
                  +------+----------------------+
                  |       Azure SQL Database    |
                  | AdventureWorks + Analytics  |
                  +------+----------------------+
                         |
                         | SQL queries / views
                         v
                  +------+----------------------+
                  | Analytics Consumption Layer |
                  | SQL queries / Power BI later|
                  +-----------------------------+
```

Supporting services:

```text
+-----------------------+       +--------------------------+
|      Key Vault        |       | Application Insights     |
| Secrets/configuration |       | Logs, metrics, traces    |
+-----------------------+       +--------------------------+

+-----------------------+       +--------------------------+
|   Managed Identity    |       | Log Analytics Workspace  |
| Resource auth         |       | Central log querying     |
+-----------------------+       +--------------------------+
```

---

## 5. Azure Resources

## 5.1 Resource Group

Example name:

```text
rg-aw-ai-dev
```

Purpose:

- Groups all resources for the project.
- Makes cleanup easier.
- Allows cost tracking by resource group.

Concept taught:

- Azure resource organization.
- Environment-level ownership.
- Cost and lifecycle grouping.

---

## 5.2 Azure SQL Database

Example resources:

```text
sql-aw-ai-dev
sqldb-aw-ai-dev
```

Purpose:

- Host AdventureWorks.
- Host the dimensional model.
- Store raw and enriched customer feedback.
- Provide analytical tables and views.

Concept taught:

- Cloud relational database.
- SQL schema design.
- Dimensional modeling.
- Analytical querying.
- Connection management.

Main schemas:

```text
source
analytics
ai
audit
```

Suggested tables:

```text
source.SalesOrderHeader
source.SalesOrderDetail
source.Customer
source.Product
source.ProductCategory
source.ProductSubcategory
source.SalesTerritory

analytics.DimDate
analytics.DimCustomer
analytics.DimProduct
analytics.DimProductCategory
analytics.DimProductSubcategory
analytics.DimSalesTerritory
analytics.FactSalesOrder
analytics.FactSalesOrderLine

ai.RawCustomerFeedback
ai.FactCustomerFeedback
audit.FeedbackProcessingLog
```

---

## 5.3 Storage Account

Example name:

```text
stawaiidev
```

Purpose:

- Host Azure Storage Queue.
- Optionally store raw JSON payloads in Blob Storage later.
- Support Azure Functions runtime storage if required.

Concept taught:

- Cloud storage.
- Queue storage.
- Durable low-cost data persistence.
- Storage connection and access patterns.

---

## 5.4 Azure Storage Queue

Queue name:

```text
feedback-incoming
```

Purpose:

- Decouple feedback submission from feedback processing.
- Allow the HTTP API to respond quickly.
- Allow AI processing to happen asynchronously.
- Enable retry behavior if processing fails.

Concept taught:

- Asynchronous processing.
- Producer/consumer pattern.
- Event-driven design.
- Retryable workloads.

Message example:

```json
{
  "feedbackId": "FB-000001",
  "salesOrderId": 43659,
  "customerId": 29825,
  "productId": 776,
  "channel": "post_sale_survey",
  "createdDate": "2026-06-19T10:30:00Z",
  "feedbackText": "The bike quality is excellent, but delivery was late and customer support was slow to respond."
}
```

---

## 5.5 Azure Functions

Example Function App:

```text
func-aw-ai-dev
```

Runtime:

```text
Node.js / TypeScript
```

Purpose:

- Expose the feedback ingestion endpoint.
- Process queued feedback messages.
- Call Azure OpenAI.
- Write enriched feedback into Azure SQL.
- Emit logs and telemetry.

Concept taught:

- Serverless compute.
- HTTP triggers.
- Queue triggers.
- Function bindings.
- Stateless compute.
- Cloud-native event processing.

### Function 1: SubmitFeedbackHttpTrigger

Trigger type:

```text
HTTP trigger
```

Responsibility:

1. Receive feedback from test client.
2. Validate payload.
3. Add metadata.
4. Write valid message to `feedback-incoming` queue.
5. Return accepted response.

Example endpoint:

```text
POST /api/feedback
```

Example response:

```json
{
  "status": "accepted",
  "feedbackId": "FB-000001",
  "message": "Feedback was accepted for processing."
}
```

### Function 2: EnrichFeedbackQueueTrigger

Trigger type:

```text
Queue trigger
```

Responsibility:

1. Read message from `feedback-incoming`.
2. Store raw feedback.
3. Build OpenAI prompt.
4. Call Azure OpenAI.
5. Validate model output.
6. Store enriched feedback.
7. Log processing result.

---

## 5.6 Azure OpenAI

Example resource:

```text
aoai-aw-ai-dev
```

Example deployments:

```text
gpt-4o-mini or equivalent chat model
text-embedding model not required in Version 1
```

Purpose:

- Convert unstructured feedback text into structured analytical attributes.

Concept taught:

- LLM endpoint usage.
- Prompt engineering.
- Structured outputs.
- JSON validation.
- Token/cost awareness.
- AI output as analytical data.

Input:

```text
Customer feedback text plus contextual fields such as product, customer, and order if available.
```

Output:

```json
{
  "sentiment": "mixed",
  "sentimentScore": -0.15,
  "topic": "delivery",
  "subTopic": "late_delivery",
  "urgency": "medium",
  "summary": "The customer liked the bike quality but complained about late delivery and slow support.",
  "suggestedAction": "Review delivery SLA and support response process for this order."
}
```

Supported sentiment values:

```text
positive
neutral
mixed
negative
```

Supported urgency values:

```text
low
medium
high
critical
```

---

## 5.7 Azure Key Vault

Example name:

```text
kv-aw-ai-dev
```

Purpose:

- Store secrets and sensitive configuration.
- Avoid hardcoding credentials in code.

Concept taught:

- Secrets management.
- Secure configuration.
- Separation of code and secrets.
- Least-privilege access.

Example secrets:

```text
SqlConnectionString
AzureOpenAIEndpoint
AzureOpenAIApiKey
AzureOpenAIDeploymentName
StorageConnectionString
```

Note:

If Managed Identity is used for a specific service, the corresponding secret may not be required.

---

## 5.8 Managed Identity

Identity type:

```text
System-assigned managed identity on the Function App
```

Purpose:

- Allow the Function App to access Azure resources without storing credentials in code.

Concept taught:

- Resource identity.
- Azure authentication.
- Passwordless access.
- Role-based authorization.

Example access:

```text
Function App identity -> Key Vault Secrets User
Function App identity -> Storage Queue Data Contributor
Function App identity -> SQL access, if Microsoft Entra SQL authentication is configured
```

---

## 5.9 Application Insights

Example name:

```text
appi-aw-ai-dev
```

Purpose:

- Track Function executions.
- Track errors and exceptions.
- Track OpenAI latency.
- Track SQL write failures.
- Track dependency calls.

Concept taught:

- Application observability.
- Traces.
- Exceptions.
- Dependencies.
- Performance monitoring.

Important telemetry:

```text
FeedbackReceived
FeedbackQueued
FeedbackProcessingStarted
OpenAIRequestStarted
OpenAIRequestCompleted
OpenAIRequestFailed
FeedbackEnriched
FeedbackProcessingFailed
SqlWriteFailed
```

---

## 5.10 Log Analytics Workspace

Example name:

```text
log-aw-ai-dev
```

Purpose:

- Central place for logs.
- Query telemetry using KQL.
- Support troubleshooting and monitoring.

Concept taught:

- Centralized logging.
- Operational queries.
- Cloud troubleshooting.

Example questions:

```text
How many feedback messages failed today?
What is the average OpenAI latency?
Which errors happened most frequently?
How many feedback records were processed by hour?
```

---

## 6. Data Flow

## 6.1 Feedback Submission Flow

```text
1. User submits feedback using Postman, curl, or a script.
2. HTTP-triggered Azure Function receives request.
3. Function validates payload.
4. Function writes payload to Azure Storage Queue.
5. Function returns HTTP 202 Accepted.
```

## 6.2 Feedback Enrichment Flow

```text
1. Queue-triggered Azure Function receives message.
2. Function stores raw feedback in Azure SQL.
3. Function builds an Azure OpenAI request.
4. Azure OpenAI returns structured JSON.
5. Function validates JSON.
6. Function stores enriched result in ai.FactCustomerFeedback.
7. Function logs success to Application Insights.
```

## 6.3 Analytics Flow

```text
1. AdventureWorks sales tables are transformed into dimensions and facts.
2. Enriched feedback is stored as a fact table.
3. Feedback fact joins to customer, product, territory, order, and date dimensions.
4. SQL views expose sales and feedback metrics.
5. Later, Power BI or another reporting layer can consume the views.
```

---

## 7. Data Model

## 7.1 Dimensional Sales Model

Suggested grain:

```text
FactSalesOrderLine = one row per sales order line
FactSalesOrder = one row per sales order
```

Core dimensions:

```text
DimDate
DimCustomer
DimProduct
DimProductCategory
DimProductSubcategory
DimSalesTerritory
```

Core facts:

```text
FactSalesOrder
FactSalesOrderLine
```

---

## 7.2 AI Feedback Model

Suggested grain:

```text
FactCustomerFeedback = one row per feedback record
```

Suggested table:

```sql
CREATE TABLE ai.FactCustomerFeedback (
    FeedbackKey INT IDENTITY(1,1) PRIMARY KEY,
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
```

Optional raw table:

```sql
CREATE TABLE ai.RawCustomerFeedback (
    RawFeedbackKey INT IDENTITY(1,1) PRIMARY KEY,
    FeedbackID NVARCHAR(100) NOT NULL,
    Payload NVARCHAR(MAX) NOT NULL,
    ReceivedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

Optional audit table:

```sql
CREATE TABLE audit.FeedbackProcessingLog (
    LogKey INT IDENTITY(1,1) PRIMARY KEY,
    FeedbackID NVARCHAR(100) NULL,
    StepName NVARCHAR(100) NOT NULL,
    Status NVARCHAR(50) NOT NULL,
    Message NVARCHAR(MAX) NULL,
    DurationMs INT NULL,
    LoggedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

---

## 8. Security Architecture

## 8.1 Authentication

For Version 1, authentication can be simple:

- Local testing through Postman/curl.
- Function key authentication for HTTP Function, if needed.
- Later versions may use Microsoft Entra ID authentication.

## 8.2 Authorization

Authorization is handled through Azure RBAC and resource-specific permissions.

Examples:

```text
Developer -> Contributor on Resource Group, for learning environment only
Function App Managed Identity -> Key Vault Secrets User
Function App Managed Identity -> Storage Queue Data Contributor
Function App Managed Identity -> SQL permissions
```

## 8.3 Secrets

Secrets shall not be stored in source code.

Local development uses:

```text
local.settings.json
```

Production uses:

```text
Azure Function App settings
Key Vault references or SDK retrieval from Key Vault
```

## 8.4 Managed Identity

The Function App should use a system-assigned managed identity.

Where possible, the Function App should use identity-based access instead of connection strings.

For a first version, it is acceptable to use Key Vault to retrieve connection strings while still teaching the concept of secrets management.

---

## 9. Configuration

Suggested application settings:

```text
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_DEPLOYMENT_NAME
AZURE_OPENAI_API_VERSION
SQL_CONNECTION_SECRET_NAME
STORAGE_QUEUE_NAME
KEY_VAULT_URL
APP_ENVIRONMENT
```

If using secrets directly during local development:

```text
SQL_CONNECTION_STRING
AZURE_OPENAI_API_KEY
AzureWebJobsStorage
```

Do not commit local secret values.

---

## 10. Error Handling

## 10.1 Invalid HTTP Payload

Action:

- Return HTTP 400.
- Log validation error.
- Do not enqueue message.

## 10.2 Queue Message Processing Failure

Action:

- Throw exception if retryable.
- Log error with feedback ID.
- Allow Azure Functions retry behavior to apply.
- Inspect poison queue if message repeatedly fails.

## 10.3 Azure OpenAI Failure

Action:

- Log error.
- Mark feedback as failed or retryable.
- Do not write partial enrichment unless clearly marked.

## 10.4 Invalid AI JSON

Action:

- Log invalid response.
- Store raw AI response in audit log if useful.
- Mark processing status as `InvalidAIResponse`.

## 10.5 SQL Write Failure

Action:

- Log SQL exception.
- Allow retry if safe.
- Avoid duplicate rows through unique `FeedbackID`.

---

## 11. Observability

## 11.1 Logs

The Functions should log:

```text
Feedback received
Feedback queued
Feedback processing started
OpenAI request started
OpenAI response received
Feedback enriched
Feedback stored
Processing failed
```

## 11.2 Metrics

Useful metrics:

```text
Feedback received count
Feedback processed count
Feedback failed count
Average processing duration
Average OpenAI latency
Invalid AI response count
SQL write failure count
```

## 11.3 Example KQL Queries

Failed processing:

```kql
traces
| where message contains "FeedbackProcessingFailed"
| order by timestamp desc
```

OpenAI latency:

```kql
traces
| where message contains "OpenAIRequestCompleted"
| order by timestamp desc
```

Exceptions:

```kql
exceptions
| order by timestamp desc
```

---

## 12. Deployment Model

## 12.1 Local Development

Tools:

```text
Node.js
Azure Functions Core Tools
Azure CLI
SQL client
Postman or curl
```

Local settings:

```text
local.settings.json
```

Local testing flow:

```text
1. Start Azure Functions locally.
2. Submit feedback through HTTP endpoint.
3. Confirm queue message was created.
4. Run queue-triggered Function.
5. Confirm OpenAI enrichment.
6. Confirm SQL insert.
```

## 12.2 Azure Deployment

Manual deployment is acceptable for Version 1.

Suggested order:

```text
1. Create Resource Group.
2. Create Azure SQL Database.
3. Load AdventureWorks.
4. Create Storage Account and Queue.
5. Create Azure OpenAI resource and deployment.
6. Create Key Vault and secrets.
7. Create Function App with Managed Identity.
8. Grant Function App permissions.
9. Deploy Functions.
10. Configure Application Insights.
11. Run end-to-end test.
```

---

## 13. Naming Convention

Suggested pattern:

```text
<resource-type>-<project>-<environment>
```

Examples:

```text
rg-aw-ai-dev
sql-aw-ai-dev
sqldb-aw-ai-dev
stawaiidev
func-aw-ai-dev
kv-aw-ai-dev
appi-aw-ai-dev
log-aw-ai-dev
aoai-aw-ai-dev
```

Storage accounts and Key Vault names have specific Azure naming rules, so names may need to be globally unique and adjusted.

---

## 14. End-to-End Demo Script

## 14.1 Submit Feedback

Send this payload to the HTTP Function:

```json
{
  "feedbackId": "FB-000001",
  "salesOrderId": 43659,
  "customerId": 29825,
  "productId": 776,
  "channel": "post_sale_survey",
  "createdDate": "2026-06-19T10:30:00Z",
  "feedbackText": "The bike quality is excellent, but delivery was late and customer support was slow to respond."
}
```

Expected result:

```json
{
  "status": "accepted",
  "feedbackId": "FB-000001",
  "message": "Feedback was accepted for processing."
}
```

## 14.2 Confirm Enrichment

Query:

```sql
SELECT TOP 10
    FeedbackID,
    Sentiment,
    SentimentScore,
    Topic,
    Urgency,
    Summary,
    SuggestedAction,
    ProcessedAt
FROM ai.FactCustomerFeedback
ORDER BY ProcessedAt DESC;
```

## 14.3 Combined Analytics Query

Example:

```sql
SELECT
    p.ProductName,
    pc.ProductCategoryName,
    SUM(fsol.LineSalesAmount) AS TotalSalesAmount,
    COUNT(DISTINCT fcf.FeedbackID) AS FeedbackCount,
    AVG(fcf.SentimentScore) AS AvgSentimentScore,
    SUM(CASE WHEN fcf.Sentiment = 'negative' THEN 1 ELSE 0 END) AS NegativeFeedbackCount
FROM analytics.FactSalesOrderLine fsol
JOIN analytics.DimProduct p
    ON fsol.ProductKey = p.ProductKey
JOIN analytics.DimProductCategory pc
    ON p.ProductCategoryKey = pc.ProductCategoryKey
LEFT JOIN ai.FactCustomerFeedback fcf
    ON fsol.ProductKey = fcf.ProductKey
GROUP BY
    p.ProductName,
    pc.ProductCategoryName
ORDER BY
    TotalSalesAmount DESC;
```

---

## 15. Learning Map

| Resource | What it teaches |
|---|---|
| Azure SQL | Relational cloud database, dimensional modeling, analytics |
| Azure Functions | Serverless compute, triggers, bindings |
| Storage Queue | Asynchronous processing, decoupling |
| Azure OpenAI | LLM integration, structured AI output |
| Key Vault | Secrets management |
| Managed Identity | Passwordless resource authentication |
| Application Insights | Application monitoring and tracing |
| Log Analytics | Centralized log querying |

---

## 16. Future Architecture Extensions

Version 2 could add:

- Azure AI Search for keyword and vector search.
- RAG endpoint for asking questions over products and feedback.
- Durable Functions for nightly batch enrichment.
- Service Bus for advanced messaging.
- Event Grid for blob upload events.
- API Management for API governance.
- Static Web Apps or App Service for a frontend.
- Power BI for reporting.
- Bicep or Terraform for Infrastructure as Code.
- GitHub Actions or Azure DevOps for CI/CD.
- Private endpoints and VNet integration for security hardening.

---

## 17. Summary

The Version 1 architecture is intentionally simple but complete.

It demonstrates a full cloud data and AI workflow:

```text
Feedback submitted
        ↓
HTTP Function validates it
        ↓
Queue decouples ingestion from processing
        ↓
Queue Function enriches feedback with Azure OpenAI
        ↓
Enriched data is stored in Azure SQL
        ↓
Sales and feedback can be analyzed together
```

This gives the learner practical exposure to cloud architecture, serverless processing, AI integration, secure configuration, monitoring, and dimensional analytics.
