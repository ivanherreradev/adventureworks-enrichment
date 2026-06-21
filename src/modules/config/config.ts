import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export interface AppConfig {
  storageQueueName: string;
  azureOpenAIEndpoint: string;
  azureOpenAIDeploymentName: string;
  azureOpenAIApiVersion: string;
  azureOpenAIApiKey: string | null;
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

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const keyVaultUrl = optionalSetting('KEY_VAULT_URL');
  const sqlConnectionSecretName = optionalSetting('SQL_CONNECTION_SECRET_NAME');

  cachedConfig = {
    storageQueueName: requireSetting('STORAGE_QUEUE_NAME'),
    azureOpenAIEndpoint: requireSetting('AZURE_OPENAI_ENDPOINT'),
    azureOpenAIDeploymentName: requireSetting('AZURE_OPENAI_DEPLOYMENT_NAME'),
    azureOpenAIApiVersion: requireSetting('AZURE_OPENAI_API_VERSION'),
    azureOpenAIApiKey: optionalSetting('AZURE_OPENAI_API_KEY'),
    sqlConnectionString: optionalSetting('SQL_CONNECTION_STRING') ?? '',
    keyVaultUrl,
    sqlConnectionSecretName,
    appEnvironment: optionalSetting('APP_ENVIRONMENT') ?? 'dev',
    appInsightsInstrumentationKey: optionalSetting('APPINSIGHTS_INSTRUMENTATIONKEY'),
    useKeyVault: Boolean(keyVaultUrl) && Boolean(sqlConnectionSecretName),
  };

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
