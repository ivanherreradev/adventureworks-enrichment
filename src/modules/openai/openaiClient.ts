import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { loadConfig } from '../config/config';
import { SYSTEM_PROMPT, buildUserPrompt, PROMPT_TEMPLATE_VERSION } from './promptTemplate';
import type { FeedbackMessage } from '../../types/feedback';
import { logInfo, logError, logEvent } from '../logging/logger';
import { Timer } from '../../utils/timer';

let cachedClient: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const config = loadConfig();

  if (config.azureOpenAIApiKey) {
    cachedClient = new AzureOpenAI({
      endpoint: config.azureOpenAIEndpoint,
      apiKey: config.azureOpenAIApiKey,
      apiVersion: config.azureOpenAIApiVersion,
      deployment: config.azureOpenAIDeploymentName,
    });
  } else {
    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);
    cachedClient = new AzureOpenAI({
      endpoint: config.azureOpenAIEndpoint,
      azureADTokenProvider,
      apiVersion: config.azureOpenAIApiVersion,
      deployment: config.azureOpenAIDeploymentName,
    });
  }

  return cachedClient;
}

export interface OpenAIResponse {
  content: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export async function enrichFeedback(feedback: FeedbackMessage): Promise<OpenAIResponse> {
  const config = loadConfig();
  const client = getClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(feedback) },
  ];

  const timer = new Timer();
  logInfo('OpenAIRequestStarted', {
    feedbackId: feedback.feedbackId,
    deployment: config.azureOpenAIDeploymentName,
    promptVersion: PROMPT_TEMPLATE_VERSION,
  });

  try {
    const completion: ChatCompletion = await client.chat.completions.create({
      messages,
      model: config.azureOpenAIDeploymentName,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content ?? '';
    const usage = completion.usage;

    logEvent('OpenAIRequestCompleted', {
      feedbackId: feedback.feedbackId,
      durationMs: timer.elapsedMs(),
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    });

    return {
      content,
      model: completion.model ?? config.azureOpenAIDeploymentName,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    };
  } catch (error) {
    logError('OpenAIRequestFailed', error, {
      feedbackId: feedback.feedbackId,
      durationMs: timer.elapsedMs(),
    });
    throw error;
  }
}
