/**
 * Simple, single-use fetch utility that avoids all body consumption issues
 * by reading the response only once and never cloning
 */

interface SimpleFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

interface SimpleFetchResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

export async function simpleFetch(
  url: string, 
  options: SimpleFetchOptions = {}
): Promise<SimpleFetchResponse> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 15000,
  } = options;

  let timeoutId: NodeJS.Timeout;
  let controller: AbortController;

  try {
    console.log(`🚀 simpleFetch starting for ${url}`);

    // Create AbortController for timeout
    controller = new AbortController();
    timeoutId = setTimeout(() => {
      console.log(`⏰ Request timeout after ${timeout}ms`);
      controller.abort();
    }, timeout);

    // Make the request
    const response = await fetch(url, {
      method,
      headers: {
        'Cache-Control': 'no-cache',
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    // Clear timeout immediately after response
    clearTimeout(timeoutId);

    // Extract response metadata before reading body
    const status = response.status;
    const statusText = response.statusText;
    const ok = response.ok;
    
    console.log(`📡 Response received: ${status} ${statusText}`);

    // Read response body once and only once
    let responseText: string;
    try {
      responseText = await response.text();
    } catch (bodyError) {
      console.error('❌ Failed to read response body:', bodyError);
      return {
        success: false,
        error: 'Could not read response from server',
        status,
      };
    }

    // Parse JSON if we have content
    let data: any = null;
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON:', jsonError);
        console.error('Response text:', responseText.substring(0, 200));
        return {
          success: false,
          error: 'Server returned invalid JSON',
          status,
        };
      }
    }

    return {
      success: true,
      data,
      status,
    };

  } catch (fetchError: any) {
    // Clear timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error('❌ Fetch error:', fetchError);
    
    if (fetchError.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out',
      };
    }
    
    return {
      success: false,
      error: 'Network error',
    };
  }
}
