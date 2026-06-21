# Product Requirements Document (PRD)

# AdventureWorks AI Sales Intelligence - Version 1

## 1. Overview

AdventureWorks AI Sales Intelligence is a learning-focused cloud and data engineering project built around the AdventureWorks database. The goal is to create a complete but manageable analytics application that combines a traditional dimensional model with an AI enrichment pipeline in Azure.

The application will allow users to analyze AdventureWorks sales performance and enrich customer feedback using Azure OpenAI. The AI-generated attributes, such as sentiment, topic, urgency, summary, and suggested action, will be stored as analytical data and connected back to customers, products, sales orders, territories, and dates.

This first version focuses on a simple but realistic Azure architecture:

- Azure SQL Database
- Azure Functions
- Azure Queue Storage
- Azure OpenAI
- Azure Key Vault
- Managed Identity
- Application Insights
- Log Analytics Workspace

The project is intentionally designed as an onboarding/capstone project for someone learning cloud, data engineering, and AI application patterns.

---

## 2. Problem Statement

AdventureWorks has structured sales data, but traditional sales reporting does not explain customer sentiment, product complaints, or recurring feedback themes. Business users can see what products are selling, but they cannot easily understand why customers are satisfied or dissatisfied.

The project solves this by introducing a feedback ingestion and enrichment pipeline. Customer feedback is submitted, queued, processed by an Azure Function, enriched with Azure OpenAI, and stored in the analytical model.

The enriched feedback can then be used to answer questions such as:

- Which products generate the most negative feedback?
- Which product categories have strong sales but poor sentiment?
- Which territories receive the most urgent feedback?
- What are the most common customer complaints?
- Are high-revenue products also generating customer satisfaction issues?
- What actions should the business consider based on feedback patterns?

---

## 3. Product Goals

The first version should achieve the following goals:

1. Build a dimensional analytics model from AdventureWorks sales data.
2. Add a new customer feedback source that can be submitted through an API.
3. Process feedback asynchronously using Azure Queue Storage and Azure Functions.
4. Use Azure OpenAI to classify and summarize the feedback.
5. Store AI-enriched feedback in Azure SQL.
6. Connect enriched feedback to the sales analytics model.
7. Expose useful analytical measures for sales and feedback analysis.
8. Teach core Azure concepts through a coherent real-world project.

---

## 4. Non-Goals for Version 1

The following items are intentionally out of scope for the first version:

- Full production-grade frontend.
- Azure AI Search and RAG.
- Durable Functions orchestration.
- Service Bus.
- Event Grid.
- Private networking.
- Multi-environment CI/CD.
- Real-time dashboard streaming.
- Complex machine learning model training.
- Advanced Power BI semantic model automation.
- Multi-tenant security model.
- Human feedback review workflow.

These can be added in later versions.

---

## 5. Target Users

## 5.1 Learning User

The primary user is a junior or onboarding data engineer who wants to learn how cloud services work together in a realistic project.

They need to understand:

- How to model analytical data.
- How to ingest data into Azure.
- How Azure Functions work.
- How queues decouple systems.
- How to call an OpenAI endpoint.
- How to store AI results as analytical data.
- How to secure secrets and resource access.
- How to monitor a cloud application.

## 5.2 Business User

The fictional business user is an AdventureWorks sales or product manager.

They want to understand:

- Sales performance by product, customer, date, and territory.
- Customer sentiment by product and territory.
- Product feedback topics.
- Areas where strong sales may hide customer dissatisfaction.
- Suggested actions based on customer feedback.

---

## 6. Business Scenario

AdventureWorks sells bicycles, components, clothing, and accessories across multiple territories. The company tracks sales orders, customers, products, salespeople, and territories in the AdventureWorks database.

The business wants to modernize its analytics platform by combining structured sales data with unstructured customer feedback. Customer comments may come from support conversations, product reviews, post-sale surveys, or manually entered feedback.

The company wants to know not only how much it sold, but also how customers feel about the products and what recurring issues appear after the sale.

The system should allow users to analyze sales performance and customer feedback together. For example, a product manager should be able to identify a product with high revenue but increasing negative sentiment, while a territory manager should be able to identify regions with recurring delivery or quality complaints.

---

## 7. Core Analytical Questions

The system should help answer the following questions:

## 7.1 Sales Questions

- What is total sales amount by month, quarter, and year?
- Which products generate the most sales?
- Which product categories and subcategories are growing?
- Which territories generate the most revenue?
- Who are the top customers by sales amount?
- What is the average order value?
- How many orders are created over time?
- How many units are sold by product and territory?

## 7.2 Feedback Questions

- How many feedback records were received?
- What percentage of feedback is positive, neutral, mixed, or negative?
- What is the average sentiment score?
- Which products have the most negative feedback?
- Which topics are most common in negative feedback?
- Which territories receive the most urgent feedback?
- Which customers have repeated negative experiences?
- What suggested actions are most common?

## 7.3 Combined Sales + Feedback Questions

- Which high-revenue products have poor sentiment?
- Which territories have high sales but frequent customer complaints?
- Are certain product categories associated with specific complaint topics?
- Which products have increasing sales but worsening feedback?
- Which customers generate high revenue but negative feedback?
- What feedback topics should the business prioritize?

---

## 8. Scope for Version 1

## 8.1 In Scope

Version 1 includes:

- AdventureWorks source database in Azure SQL.
- Dimensional model in Azure SQL.
- Feedback submission API through Azure Functions.
- Queue-based feedback processing.
- Azure OpenAI feedback enrichment.
- Storage of raw and enriched feedback.
- Key Vault-backed secret management.
- Managed Identity for Function App access where supported.
- Application Insights logging.
- Basic monitoring of function executions and failures.
- SQL views or tables for analytics consumption.

## 8.2 Out of Scope

Version 1 does not include:

- Full user-facing application.
- Advanced RAG experience.
- Vector search.
- Durable orchestration.
- Private endpoints.
- Enterprise-grade governance.
- Complex authorization by business role.
- Production data privacy workflows.

---

## 9. Functional Requirements

## 9.1 AdventureWorks Data Model

The system shall load or use the AdventureWorks database as the structured source.

The system shall create a dimensional model that includes, at minimum:

- DimDate
- DimCustomer
- DimProduct
- DimProductCategory
- DimProductSubcategory
- DimSalesTerritory
- FactSalesOrder
- FactSalesOrderLine

The primary sales fact grain shall be one row per sales order line.

The order-level fact shall support analysis of order count, subtotal, tax, freight, and total due.

## 9.2 Feedback Submission

The system shall expose an HTTP endpoint that accepts customer feedback.

The feedback payload shall include:

- FeedbackID or external reference
- SalesOrderID, if available
- CustomerID, if available
- ProductID, if available
- FeedbackText
- Channel
- CreatedDate

The system shall validate that feedback text is present.

The system shall reject invalid payloads with a clear error response.

The system shall write valid feedback messages to an Azure Storage Queue.

## 9.3 Feedback Processing

The system shall process feedback asynchronously from a queue.

The queue-triggered Azure Function shall:

1. Read the feedback message.
2. Validate the message structure.
3. Persist the raw feedback.
4. Call Azure OpenAI for enrichment.
5. Parse the AI response.
6. Store the enriched feedback in Azure SQL.
7. Log success or failure.

## 9.4 AI Enrichment

The system shall use Azure OpenAI to generate structured feedback enrichment.

The AI response shall include:

- Sentiment
- SentimentScore
- Topic
- SubTopic, optional
- Urgency
- Summary
- SuggestedAction

The system shall request a JSON response from the model.

The system shall validate the JSON response before storing it.

If the model response is invalid, the system shall log the error and mark the feedback as failed or retryable.

## 9.5 Analytical Storage

The system shall store enriched feedback in a table that can be joined to the dimensional model.

The feedback fact table should include:

- FeedbackKey
- FeedbackID
- SalesOrderID
- CustomerKey
- ProductKey
- SalesTerritoryKey
- DateKey
- Channel
- RawFeedbackText
- Sentiment
- SentimentScore
- Topic
- SubTopic
- Urgency
- Summary
- SuggestedAction
- ProcessingStatus
- ProcessedAt
- OpenAIModel

## 9.6 Monitoring and Logging

The system shall log:

- Feedback received.
- Queue message processed.
- OpenAI call started and completed.
- OpenAI errors.
- SQL write failures.
- Invalid payloads.
- Processing duration.

The system shall use Application Insights for function telemetry.

The system shall support querying logs through Log Analytics.

---

## 10. Measures and Metrics

## 10.1 Sales Measures

- Total Sales Amount
- Total Due
- Subtotal Amount
- Tax Amount
- Freight Amount
- Order Count
- Order Line Count
- Quantity Sold
- Average Order Value
- Average Unit Price
- Discount Amount
- Estimated Product Cost
- Estimated Gross Margin
- Estimated Gross Margin Percentage

## 10.2 Feedback Measures

- Feedback Count
- Positive Feedback Count
- Neutral Feedback Count
- Mixed Feedback Count
- Negative Feedback Count
- Urgent Feedback Count
- Average Sentiment Score
- Feedback Count by Topic
- Feedback Count by Product
- Feedback Count by Territory
- Negative Feedback Percentage
- Urgent Feedback Percentage

## 10.3 Combined Measures

- Sales Amount by Sentiment
- Sales Amount by Feedback Topic
- Negative Feedback Count by Product Revenue Rank
- Average Sentiment by Product Category
- High Revenue / Low Sentiment Product Flag
- Feedback Count per Order
- Feedback Count per Customer

---

## 11. User Stories

## 11.1 Sales Analytics

As a sales manager, I want to view total sales by month, product category, and territory, so that I can understand business performance.

As a product manager, I want to compare product revenue and quantity sold, so that I can identify top-performing products.

As an executive, I want to view high-level sales KPIs, so that I can monitor performance trends.

## 11.2 Feedback Analytics

As a product manager, I want customer feedback to be classified by sentiment and topic, so that I can understand recurring product issues.

As a territory manager, I want to view negative feedback by territory, so that I can identify operational problems.

As a business analyst, I want to join feedback to products and customers, so that I can compare feedback trends with revenue.

## 11.3 Engineering Learning

As a learner, I want to submit feedback through an API and process it through a queue, so that I can understand asynchronous cloud processing.

As a learner, I want to call Azure OpenAI from an Azure Function, so that I can understand how AI services are integrated into applications.

As a learner, I want secrets to be stored in Key Vault, so that I can understand secure configuration.

As a learner, I want logs in Application Insights, so that I can understand cloud observability.

---

## 12. Non-Functional Requirements

## 12.1 Security

- Secrets shall not be hardcoded in source code.
- Sensitive configuration shall be stored in Key Vault.
- The Function App shall use Managed Identity where possible.
- Azure RBAC shall be used to grant least-privilege access.
- Local development secrets shall be stored outside source control.

## 12.2 Reliability

- Queue processing shall be retryable.
- Failed messages shall be observable.
- Invalid AI responses shall not corrupt analytical tables.
- SQL writes shall be handled with error logging.

## 12.3 Maintainability

- Functions shall be small and focused.
- Prompt templates shall be versioned.
- AI output schema shall be documented.
- SQL schema shall be documented.
- Configuration shall be environment-specific.

## 12.4 Observability

- Function executions shall be logged.
- OpenAI latency shall be logged.
- Failed messages shall be logged.
- Processing status shall be stored in SQL.
- Basic dashboards or queries shall be available in Application Insights / Log Analytics.

## 12.5 Cost Awareness

- The system shall avoid unnecessary OpenAI calls.
- The system shall log approximate token usage if available.
- The system shall support small test batches.
- The project shall use low-cost SKUs where possible.

---

## 13. Data Requirements

## 13.1 Source Data

Primary source:

- AdventureWorks relational database.

Synthetic or manually created source:

- Customer feedback records.

## 13.2 Feedback Payload Example

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

## 13.3 AI Enrichment Output Example

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

---

## 14. Acceptance Criteria

The first version is complete when:

1. AdventureWorks data is available in Azure SQL.
2. A dimensional model exists for sales analytics.
3. An HTTP-triggered Azure Function can receive feedback.
4. Valid feedback is written to Azure Queue Storage.
5. A queue-triggered Azure Function processes feedback messages.
6. The Function calls Azure OpenAI and receives structured enrichment.
7. Enriched feedback is stored in Azure SQL.
8. Feedback can be joined to customer, product, territory, and date dimensions.
9. Basic sales and feedback metrics can be queried from SQL.
10. Secrets are not hardcoded in the application.
11. Application logs are visible in Application Insights.
12. At least one end-to-end demo can be executed from feedback submission to analytical query.

---

## 15. Suggested Milestones

## Milestone 1: Data Foundation

- Provision Azure SQL.
- Load AdventureWorks.
- Create dimensional model.
- Create basic sales metrics.

## Milestone 2: Feedback Ingestion

- Create Storage Account and Queue.
- Create HTTP-triggered Function.
- Validate feedback payload.
- Write queue messages.

## Milestone 3: Feedback Processing

- Create queue-triggered Function.
- Store raw feedback.
- Add processing status.

## Milestone 4: AI Enrichment

- Provision Azure OpenAI.
- Create prompt template.
- Call model from Function.
- Parse and validate JSON response.
- Store enriched feedback.

## Milestone 5: Security and Observability

- Add Key Vault.
- Configure Managed Identity.
- Add Application Insights logging.
- Create basic log queries.

## Milestone 6: Final Analytics Demo

- Query sales metrics.
- Query feedback metrics.
- Query combined sales + sentiment metrics.
- Present final architecture and lessons learned.

---

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OpenAI returns invalid JSON | Processing failure | Validate schema and log invalid responses |
| Queue messages fail repeatedly | Lost or delayed processing | Use retry behavior and inspect poison messages |
| Secrets are accidentally committed | Security issue | Use Key Vault and `.gitignore` local settings |
| Costs grow unexpectedly | Budget issue | Use small test batches and cost alerts |
| Dimensional model is too complex | Learning friction | Start with a small star schema |
| Too many Azure services are introduced too early | Confusion | Keep Version 1 focused and add services later |

---

## 17. Future Enhancements

Potential Version 2 features:

- Azure AI Search for product and feedback search.
- Vector search and RAG.
- Durable Functions for batch enrichment.
- Service Bus instead of Storage Queues.
- Event Grid for blob-based event triggers.
- API Management in front of the API.
- React frontend.
- Power BI dashboard.
- CI/CD with GitHub Actions or Azure DevOps.
- Infrastructure as Code with Bicep or Terraform.
- Private endpoints and VNet integration.
- Role-based user authorization.

---

## 18. Summary

Version 1 should be a focused but realistic Azure AI and data engineering project. The main goal is not to build a perfect production product, but to teach the end-to-end flow of a cloud analytics application:

1. Structured sales data is modeled.
2. Unstructured feedback is ingested.
3. A queue decouples ingestion from processing.
4. Azure Functions process the workload.
5. Azure OpenAI converts text into analytical attributes.
6. Azure SQL stores the enriched data.
7. Business users can analyze sales and feedback together.
