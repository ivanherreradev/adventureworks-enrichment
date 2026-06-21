import appInsights, { KnownSeverityLevel } from 'applicationinsights';
import { loadConfig } from '../config/config';

let initialized = false;

function ensureInitialized(): void {
  if (initialized) {
    return;
  }
  const config = loadConfig();
  if (config.appInsightsInstrumentationKey) {
    appInsights
      .setup(config.appInsightsInstrumentationKey)
      .setAutoCollectRequests(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .start();
  }
  initialized = true;
}

function getTelemetryClient(): appInsights.TelemetryClient | null {
  ensureInitialized();
  const config = loadConfig();
  if (!config.appInsightsInstrumentationKey) {
    return null;
  }
  return appInsights.defaultClient;
}

export interface LogContext {
  feedbackId?: string;
  stepName?: string;
  durationMs?: number;
  [key: string]: unknown;
}

function serializeContext(context?: LogContext): Record<string, unknown> {
  if (!context) {
    return {};
  }
  const { ...rest } = context;
  return rest;
}

export function logInfo(message: string, context?: LogContext): void {
  const client = getTelemetryClient();
  if (client) {
    client.trackTrace({
      message,
      severity: KnownSeverityLevel.Information,
      properties: serializeContext(context),
    });
  }
  console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
}

export function logWarning(message: string, context?: LogContext): void {
  const client = getTelemetryClient();
  if (client) {
    client.trackTrace({
      message,
      severity: KnownSeverityLevel.Warning,
      properties: serializeContext(context),
    });
  }
  console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
}

export function logError(message: string, error?: unknown, context?: LogContext): void {
  const client = getTelemetryClient();
  const mergedContext = { ...serializeContext(context) };
  if (error instanceof Error) {
    mergedContext.errorMessage = error.message;
    mergedContext.errorStack = error.stack ?? '';
  } else if (error) {
    mergedContext.error = String(error);
  }
  if (client) {
    client.trackTrace({
      message,
      severity: KnownSeverityLevel.Error,
      properties: mergedContext,
    });
    if (error instanceof Error) {
      client.trackException({ exception: error, properties: mergedContext });
    }
  }
  console.error(`[ERROR] ${message}`, mergedContext);
}

export function logEvent(name: string, context?: LogContext): void {
  const client = getTelemetryClient();
  if (client) {
    client.trackEvent({ name, properties: serializeContext(context) });
  }
  console.log(`[EVENT] ${name}`, context ? JSON.stringify(context) : '');
}
