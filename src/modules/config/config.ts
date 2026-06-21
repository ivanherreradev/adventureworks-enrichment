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
      if (!config.ollamaEndpoint) {
        throw new Error('OLLAMA_ENDPOINT is required when LLM_PROVIDER=ollama');
      }
      if (!config.ollamaModel) {
        throw new Error('OLLAMA_MODEL is required when LLM_PROVIDER=ollama');
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

export async function getSqlConnectionString(): Promise<string> {
  if (cachedSqlConnectionString) {
    return cachedSqlConnectionString;
  }

  const config = loadConfig();

  if (config.useKeyVault && config.keyVaultUrl && config.sqlConnectionSecretName) {
    const credential = new DefaultAzureCredential();
    const secretClient = new SecretClient(config.keyVaultUrl, credential);
    const secret = await secretClient.getSecret(config.sqlConnectionSecretName);
    cachedSqlConnectionString = secret.value;
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
