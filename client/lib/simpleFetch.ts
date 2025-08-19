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
  options: SimpleFetchOptions = {},
): Promise<SimpleFetchResponse> {
  const { method = "GET", headers = {}, body, timeout = 15000 } = options;

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
        "Cache-Control": "no-cache",
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

    // Try different methods to read response body
    let data: any = null;
    let responseText = "";

    try {
      // First try to read as JSON directly (most efficient)
      if (response.headers.get("content-type")?.includes("application/json")) {
        try {
          data = await response.json();
          console.log("✅ Successfully read response as JSON");
        } catch (jsonError) {
          console.log("⚠️ JSON parsing failed, trying text method");
          // Response body might be consumed, create a new request
          throw new Error("JSON parsing failed, response body consumed");
        }
      } else {
        // Read as text for non-JSON responses
        responseText = await response.text();
        console.log(
          "✅ Successfully read response as text, length:",
          responseText.length,
        );

        if (responseText.trim()) {
          try {
            data = JSON.parse(responseText);
          } catch (jsonError) {
            console.log(
              "⚠️ Response is not JSON:",
              responseText.substring(0, 100),
            );
            data = { message: responseText };
          }
        }
      }
    } catch (bodyError) {
      console.error("❌ Failed to read response body:", bodyError);
      return {
        success: false,
        error: "Could not read response from server",
        status,
      };
    }

    return {
      success: true,
      data,
      status,
    };
  } catch (fetchError: any) {
    // Clear timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);

    console.error("❌ Fetch error:", fetchError);

    if (fetchError.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out",
      };
    }

    return {
      success: false,
      error: "Network error",
    };
  }
}
