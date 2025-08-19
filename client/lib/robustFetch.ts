/**
 * Robust fetch utility specifically designed to handle critical API calls
 * without body consumption issues
 */

interface RobustFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retries?: number;
}

interface RobustFetchResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

export async function robustFetch(
  url: string,
  options: RobustFetchOptions = {},
): Promise<RobustFetchResponse> {
  const {
    method = "GET",
    headers = {},
    body,
    timeout = 15000,
    retries = 1,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `🔄 robustFetch attempt ${attempt + 1}/${retries + 1} for ${url}`,
      );

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Request timeout after ${timeout}ms`);
        controller.abort();
      }, timeout);

      // Make the request with no-cache to avoid any caching issues
      const response = await fetch(url, {
        method,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...headers,
        },
        body,
        signal: controller.signal,
        cache: "no-cache",
      });

      // Clear timeout immediately
      clearTimeout(timeoutId);

      // Store response metadata before reading body
      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const responseOk = response.ok;
      const responseUrl = response.url;

      console.log(`📡 Response received:`, {
        status: responseStatus,
        statusText: responseStatusText,
        ok: responseOk,
        url: responseUrl,
      });

      // Read response text directly (no cloning)
      let responseText: string;
      try {
        responseText = await response.text();
      } catch (readError) {
        console.error("❌ Failed to read response text:", readError);
        if (attempt < retries) {
          console.log(`🔄 Retrying due to read error...`);
          continue;
        }
        return {
          success: false,
          error: "Failed to read response from server",
          status: responseStatus,
        };
      }

      // Parse JSON
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (jsonError) {
        console.error("❌ Failed to parse JSON:", jsonError);
        console.error("Response text:", responseText.substring(0, 500));
        if (attempt < retries) {
          console.log(`🔄 Retrying due to JSON parse error...`);
          continue;
        }
        return {
          success: false,
          error: "Invalid JSON response from server",
          status: responseStatus,
        };
      }

      // Return success response
      return {
        success: true,
        data,
        status: responseStatus,
      };
    } catch (fetchError: any) {
      console.error(`❌ Fetch error on attempt ${attempt + 1}:`, fetchError);

      // Handle different types of errors
      if (fetchError.name === "AbortError") {
        if (attempt < retries) {
          console.log(`🔄 Retrying due to timeout...`);
          continue;
        }
        return {
          success: false,
          error: "Request timeout - please try again",
        };
      }

      if (attempt < retries) {
        console.log(`🔄 Retrying due to network error...`);
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        ); // Exponential backoff
        continue;
      }

      return {
        success: false,
        error: "Network error - please check your connection",
      };
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
  };
}
