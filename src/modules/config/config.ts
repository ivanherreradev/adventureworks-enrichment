import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export type LlmProvider = 'azure' | 'ollama' | 'openai';

export interface AppConfig {
  storageQueueName: string;
  llmProvider: LlmProvider;
  azureOpenAIEndpoint: string | null;
  azureOpenAIDeploymentName: string | null;
  azureOpenAIApiVersion: string | null;
  azureOpenAIApiKey: string | null;
  ollamaEndpoint: string | null;
  ollamaModel: string | null;
  ollamaApiKey: string | null;
  ollamaEndpointSecretName: string | null;
  ollamaApiKeySecretName: string | null;
  openaiApiKey: string | null;
  openaiModel: string | null;
  llmModel: string;
  sqlConnectionString: string;
  keyVaultUrl: string | null;
  sqlConnectionSecretName: string | null;
  appEnvironment: string;
  appInsightsInstrumentationKey: string | null;
  useKeyVault: boolean;
}

let cachedConfig: AppConfig | null = null;
let cachedSqlConnectionString: string | null = null;
let cachedOllamaEndpoint: string | null = null;
let cachedOllamaApiKey: string | null = null;
let cachedSecretClient: SecretClient | null = null;

function requireSetting(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required application setting: ${name}`);
  }
  return value;
}

function optionalSetting(name: string): string | null {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    return null;
  }
  return value;
}

function resolveLlmModel(config: AppConfig): string {
  switch (config.llmProvider) {
    case 'azure':
      return config.azureOpenAIDeploymentName ?? '';
    case 'ollama':
      return config.ollamaModel ?? '';
    case 'openai':
      return config.openaiModel ?? '';
    default:
      return '';
  }
}

function validateProviderConfig(config: AppConfig): void {
  switch (config.llmProvider) {
    case 'azure':
      if (!config.azureOpenAIEndpoint) {
        throw new Error('AZURE_OPENAI_ENDPOINT is required when LLM_PROVIDER=azure');
      }
      if (!config.azureOpenAIDeploymentName) {
        throw new Error('AZURE_OPENAI_DEPLOYMENT_NAME is required when LLM_PROVIDER=azure');
      }
      if (!config.azureOpenAIApiVersion) {
        throw new Error('AZURE_OPENAI_API_VERSION is required when LLM_PROVIDER=azure');
      }
      break;
    case 'ollama':
      if (!config.ollamaModel) {
        throw new Error('OLLAMA_MODEL is required when LLM_PROVIDER=ollama');
      }
      if (
        !config.ollamaEndpoint &&
        !(config.useKeyVault && config.ollamaEndpointSecretName)
      ) {
        throw new Error(
          'OLLAMA_ENDPOINT or OLLAMA_ENDPOINT_SECRET_NAME (with KEY_VAULT_URL) is required when LLM_PROVIDER=ollama'
        );
      }
      break;
    case 'openai':
      if (!config.openaiApiKey) {
        throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
      }
      if (!config.openaiModel) {
        throw new Error('OPENAI_MODEL is required when LLM_PROVIDER=openai');
      }
      break;
    default:
      throw new Error(
        `LLM_PROVIDER must be one of: azure, ollama, openai. Got "${config.llmProvider}".`
      );
  }
}

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const keyVaultUrl = optionalSetting('KEY_VAULT_URL');
  const sqlConnectionSecretName = optionalSetting('SQL_CONNECTION_SECRET_NAME');

  const provider = (optionalSetting('LLM_PROVIDER') ?? 'azure') as LlmProvider;

  cachedConfig = {
    storageQueueName: requireSetting('STORAGE_QUEUE_NAME'),
    llmProvider: provider,
    azureOpenAIEndpoint: optionalSetting('AZURE_OPENAI_ENDPOINT'),
    azureOpenAIDeploymentName: optionalSetting('AZURE_OPENAI_DEPLOYMENT_NAME'),
    azureOpenAIApiVersion: optionalSetting('AZURE_OPENAI_API_VERSION'),
    azureOpenAIApiKey: optionalSetting('AZURE_OPENAI_API_KEY'),
    ollamaEndpoint: optionalSetting('OLLAMA_ENDPOINT'),
    ollamaModel: optionalSetting('OLLAMA_MODEL'),
    ollamaApiKey: optionalSetting('OLLAMA_API_KEY'),
    ollamaEndpointSecretName: optionalSetting('OLLAMA_ENDPOINT_SECRET_NAME'),
    ollamaApiKeySecretName: optionalSetting('OLLAMA_API_KEY_SECRET_NAME'),
    openaiApiKey: optionalSetting('OPENAI_API_KEY'),
    openaiModel: optionalSetting('OPENAI_MODEL'),
    llmModel: '',
    sqlConnectionString: optionalSetting('SQL_CONNECTION_STRING') ?? '',
    keyVaultUrl,
    sqlConnectionSecretName,
    appEnvironment: optionalSetting('APP_ENVIRONMENT') ?? 'dev',
    appInsightsInstrumentationKey: optionalSetting('APPINSIGHTS_INSTRUMENTATIONKEY'),
    useKeyVault: Boolean(keyVaultUrl) && Boolean(sqlConnectionSecretName),
  };

  validateProviderConfig(cachedConfig);
  cachedConfig.llmModel = resolveLlmModel(cachedConfig);

  return cachedConfig;
}

function getSecretClient(): SecretClient | null {
  const config = loadConfig();
  if (!config.keyVaultUrl) {
    return null;
  }
  if (!cachedSecretClient) {
    const credential = new DefaultAzureCredential();
    cachedSecretClient = new SecretClient(config.keyVaultUrl, credential);
  }
  return cachedSecretClient;
}

async function resolveSecret(secretName: string): Promise<string> {
  const client = getSecretClient();
  if (!client) {
    throw new Error(`Cannot resolve secret "${secretName}" without KEY_VAULT_URL.`);
  }
  const secret = await client.getSecret(secretName);
  return secret.value;
}

export async function getSqlConnectionString(): Promise<string> {
  if (cachedSqlConnectionString) {
    return cachedSqlConnectionString;
  }

  const config = loadConfig();

  if (config.useKeyVault && config.sqlConnectionSecretName) {
    cachedSqlConnectionString = await resolveSecret(config.sqlConnectionSecretName);
  } else {
    if (!config.sqlConnectionString) {
      throw new Error(
        'SQL connection string is not configured. Set SQL_CONNECTION_STRING for local dev or KEY_VAULT_URL + SQL_CONNECTION_SECRET_NAME for cloud.'
      );
    }
    cachedSqlConnectionString = config.sqlConnectionString;
  }

  return cachedSqlConnectionString;
}

export async function getOllamaEndpoint(): Promise<string> {
  if (cachedOllamaEndpoint) {
    return cachedOllamaEndpoint;
  }

  const config = loadConfig();

  if (config.ollamaEndpointSecretName && config.keyVaultUrl) {
    cachedOllamaEndpoint = await resolveSecret(config.ollamaEndpointSecretName);
  } else if (config.ollamaEndpoint) {
    cachedOllamaEndpoint = config.ollamaEndpoint;
  } else {
    throw new Error(
      'Ollama endpoint is not configured. Set OLLAMA_ENDPOINT for local dev or KEY_VAULT_URL + OLLAMA_ENDPOINT_SECRET_NAME for cloud.'
    );
  }

  return cachedOllamaEndpoint;
}

export async function getOllamaApiKey(): Promise<string | null> {
  if (cachedOllamaApiKey !== null) {
    return cachedOllamaApiKey;
  }

  const config = loadConfig();

  if (config.ollamaApiKeySecretName && config.keyVaultUrl) {
    cachedOllamaApiKey = await resolveSecret(config.ollamaApiKeySecretName);
  } else {
    cachedOllamaApiKey = config.ollamaApiKey;
  }

  return cachedOllamaApiKey;
}
