/**
 * XMLHttpRequest-based implementation to completely avoid fetch API issues
 * with response body consumption
 */

interface XhrFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

interface XhrFetchResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

export function xhrFetch(
  url: string,
  options: XhrFetchOptions = {},
): Promise<XhrFetchResponse> {
  const { method = "GET", headers = {}, body, timeout = 15000 } = options;

  return new Promise((resolve) => {
    console.log(`🔄 xhrFetch starting for ${url}`);

    const xhr = new XMLHttpRequest();

    // Setup timeout
    xhr.timeout = timeout;

    xhr.onload = function () {
      console.log(`📡 XHR Response: ${xhr.status} ${xhr.statusText}`);

      const status = xhr.status;
      let data: any = null;

      // Try to parse response
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch (jsonError) {
          console.log("⚠️ Response is not JSON, using as text");
          data = { message: xhr.responseText };
        }
      }

      resolve({
        success: true,
        data,
        status,
      });
    };

    xhr.onerror = function () {
      console.error("❌ XHR Network error");
      resolve({
        success: false,
        error: "Network error",
        status: xhr.status || 0,
      });
    };

    xhr.ontimeout = function () {
      console.error("❌ XHR Timeout");
      resolve({
        success: false,
        error: "Request timeout",
      });
    };

    xhr.onabort = function () {
      console.error("❌ XHR Aborted");
      resolve({
        success: false,
        error: "Request aborted",
      });
    };

    // Open connection
    xhr.open(method, url, true);

    // Set headers
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    // Send request
    try {
      xhr.send(body || null);
    } catch (sendError) {
      console.error("❌ XHR Send error:", sendError);
      resolve({
        success: false,
        error: "Failed to send request",
      });
    }
  });
}
