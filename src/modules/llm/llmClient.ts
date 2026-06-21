import { AzureOpenAI, OpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { loadConfig, type LlmProvider } from '../config/config';
import { SYSTEM_PROMPT, buildUserPrompt, PROMPT_TEMPLATE_VERSION } from './promptTemplate';
import type { FeedbackMessage } from '../../types/feedback';
import { logInfo, logError, logEvent } from '../logging/logger';
import { Timer } from '../../utils/timer';

type LlmClient = AzureOpenAI | OpenAI;

let cachedClient: LlmClient | null = null;

function createAzureClient(config: ReturnType<typeof loadConfig>): AzureOpenAI {
  if (config.azureOpenAIApiKey) {
    return new AzureOpenAI({
      endpoint: config.azureOpenAIEndpoint!,
      apiKey: config.azureOpenAIApiKey,
      apiVersion: config.azureOpenAIApiVersion!,
      deployment: config.azureOpenAIDeploymentName!,
    });
  }

  const credential = new DefaultAzureCredential();
  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);
  return new AzureOpenAI({
    endpoint: config.azureOpenAIEndpoint!,
    azureADTokenProvider,
    apiVersion: config.azureOpenAIApiVersion!,
    deployment: config.azureOpenAIDeploymentName!,
  });
}

function createOllamaClient(config: ReturnType<typeof loadConfig>): OpenAI {
  return new OpenAI({
    baseURL: config.ollamaEndpoint!,
    apiKey: config.ollamaApiKey ?? 'ollama',
    defaultHeaders: config.ollamaApiKey
      ? { Authorization: `Bearer ${config.ollamaApiKey}` }
      : undefined,
  });
}

function createOpenAIClient(config: ReturnType<typeof loadConfig>): OpenAI {
  return new OpenAI({
    apiKey: config.openaiApiKey!,
  });
}

function getClient(): LlmClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = loadConfig();
  const provider: LlmProvider = config.llmProvider;

  switch (provider) {
    case 'azure':
      cachedClient = createAzureClient(config);
      break;
    case 'ollama':
      cachedClient = createOllamaClient(config);
      break;
    case 'openai':
      cachedClient = createOpenAIClient(config);
      break;
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  return cachedClient;
}

export interface LlmResponse {
  content: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export async function enrichFeedback(feedback: FeedbackMessage): Promise<LlmResponse> {
  const config = loadConfig();
  const client = getClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(feedback) },
  ];

  const timer = new Timer();
  logInfo('LlmRequestStarted', {
    feedbackId: feedback.feedbackId,
    provider: config.llmProvider,
    model: config.llmModel,
    promptVersion: PROMPT_TEMPLATE_VERSION,
  });

  try {
    const completion: ChatCompletion = await client.chat.completions.create({
      messages,
      model: config.llmModel,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content ?? '';
    const usage = completion.usage;

    logEvent('LlmRequestCompleted', {
      feedbackId: feedback.feedbackId,
      provider: config.llmProvider,
      model: config.llmModel,
      durationMs: timer.elapsedMs(),
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    });

    return {
      content,
      model: completion.model ?? config.llmModel,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    };
  } catch (error) {
    logError('LlmRequestFailed', error, {
      feedbackId: feedback.feedbackId,
      provider: config.llmProvider,
      model: config.llmModel,
      durationMs: timer.elapsedMs(),
    });
    throw error;
  }
}
