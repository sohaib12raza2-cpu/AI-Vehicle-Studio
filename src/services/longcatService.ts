import { ScriptSettings, ScriptSegment, ImagePrompt, ScriptSentence } from '../types';

export class LongCatError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'LongCatError';
  }
}

async function callInternalApi<T>(endpoint: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new LongCatError('Network error connecting to API proxy. Please check your internet connection.', 502, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let errorMsg = 'Unknown server error';
    let errorCode = 'SERVER_ERROR';
    try {
      const errBody = await response.json();
      if (errBody.error) errorMsg = errBody.error;
      if (errBody.code) errorCode = errBody.code;
    } catch {
      errorMsg = await response.text().catch(() => `HTTP Error ${response.status}`);
    }
    throw new LongCatError(errorMsg, response.status, errorCode);
  }

  return response.json();
}

/**
 * Call the Vercel serverless function to analyze the script.
 * The server handles API keys and LongCat proxying.
 */
export async function analyzeScript(
  script: string,
  settings: ScriptSettings,
  sentences: ScriptSentence[] = []
): Promise<ScriptSegment[]> {
  return callInternalApi<ScriptSegment[]>('/api/analyze-script', { script, settings, sentences });
}

/**
 * Call the Vercel serverless function to generate prompts for a segment.
 */
export async function generatePromptsForSegment(
  segment: ScriptSegment,
  settings: ScriptSettings,
  sentences: ScriptSentence[] = []
): Promise<ImagePrompt[]> {
  return callInternalApi<ImagePrompt[]>('/api/generate-prompts', { segment, settings, sentences });
}

/**
 * Call the Vercel serverless function to generate prompt variations.
 */
export async function generatePromptVariations(
  promptText: string,
  count: number = 2
): Promise<string[]> {
  return callInternalApi<string[]>('/api/generate-variations', { promptText, count });
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  model: string;
  message: string;
}

/**
 * Call the Vercel serverless function to test the actual LongCat connection from the server.
 */
export async function testLongCatConnection(): Promise<ConnectionTestResult> {
  try {
    const res = await fetch('/api/test-connection', { method: 'POST' });
    if (!res.ok) throw new Error('API route failed');
    return res.json();
  } catch (err) {
    return {
      success: false,
      latencyMs: 0,
      model: 'Unknown',
      message: 'Failed to reach /api/test-connection function endpoint.',
    };
  }
}
