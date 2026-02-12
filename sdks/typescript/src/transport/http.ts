import type { Trace } from '../types';

/**
 * Send buffered traces to the Pulse async endpoint.
 */
export async function sendTraces(
  apiUrl: string,
  apiKey: string,
  traces: Trace[]
): Promise<void> {
  if (traces.length === 0) {
    return;
  }

  const url = `${apiUrl}/v1/traces/async`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(traces),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(
        `Pulse SDK: failed to send traces (${response.status}): ${errorText}`
      );
    }
  } catch (error) {
    console.error('Pulse SDK: network error sending traces:', error);
  }
}
