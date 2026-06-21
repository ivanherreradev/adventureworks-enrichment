import type { FeedbackMessage } from '../../types/feedback';

export const PROMPT_TEMPLATE_VERSION = '1.0.0';

export const SYSTEM_PROMPT = `You are a customer feedback analysis assistant for AdventureWorks, a company that sells bicycles, components, clothing, and accessories.

You receive customer feedback text and must return a STRICT JSON object with the following fields:

- sentiment: one of "positive", "neutral", "mixed", "negative"
- sentimentScore: a number between -1.00 and 1.00 representing the sentiment polarity
- topic: a short snake_case label for the main topic (e.g. "delivery", "product_quality", "customer_service", "pricing", "sizing")
- subTopic: an optional shorter snake_case label refining the topic (e.g. "late_delivery", "wrong_size")
- urgency: one of "low", "medium", "high", "critical"
- summary: a concise one-sentence summary of the feedback
- suggestedAction: a concrete recommended action for the business

Rules:
1. Return ONLY the JSON object. No markdown, no code fences, no extra text.
2. All fields except subTopic are required.
3. Use snake_case for topic and subTopic.
4. Keep summary under 200 characters.
5. Keep suggestedAction under 300 characters.
6. If the feedback is ambiguous, classify sentiment as "mixed".`;

export function buildUserPrompt(feedback: FeedbackMessage): string {
  const contextParts: string[] = [];
  if (feedback.salesOrderId) {
    contextParts.push(`SalesOrderId: ${feedback.salesOrderId}`);
  }
  if (feedback.customerId) {
    contextParts.push(`CustomerId: ${feedback.customerId}`);
  }
  if (feedback.productId) {
    contextParts.push(`ProductId: ${feedback.productId}`);
  }
  if (feedback.channel) {
    contextParts.push(`Channel: ${feedback.channel}`);
  }
  if (feedback.createdDate) {
    contextParts.push(`CreatedDate: ${feedback.createdDate}`);
  }

  const contextLine = contextParts.length > 0
    ? `Context:\n${contextParts.map((part) => `  - ${part}`).join('\n')}\n\n`
    : '';

  return `${contextLine}Customer feedback:\n${feedback.feedbackText}`;
}
