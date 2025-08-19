/**
 * Safely parse a response as JSON with proper error handling
 * Prevents "Response body is already used" errors
 */
export async function safeParseResponse(response: Response): Promise<any> {
  console.log("🔍 safeParseResponse called with response:", {
    url: response.url,
    type: response.type,
    redirected: response.redirected,
    bodyUsed: response.bodyUsed,
  });

  // Store response properties to avoid body consumption issues
  const contentType = response.headers.get("content-type");
  const responseStatus = response.status;
  const responseStatusText = response.statusText;

  try {
    console.log("🔍 About to read response.text()");
    // Always try to read as text first to avoid body consumption issues
    const textResponse = await response.text();
    console.log(
      "✅ Successfully read response.text(), length:",
      textResponse.length,
    );

    // Check if we got any content
    if (!textResponse) {
      console.error("Empty response received");
      return {
        success: false,
        message: "Empty response from server",
        error: true,
      };
    }

    // Check if it looks like JSON based on content type or content
    const isLikelyJSON =
      contentType?.includes("application/json") ||
      textResponse.trim().startsWith("{") ||
      textResponse.trim().startsWith("[");

    if (!isLikelyJSON) {
      console.error("Non-JSON response:", {
        status: responseStatus,
        statusText: responseStatusText,
        contentType,
        response: textResponse.substring(0, 500),
      });

      return {
        success: false,
        message: `Server error: ${responseStatus} ${responseStatusText}`,
        error: true,
      };
    }

    // Try to parse as JSON
    try {
      return JSON.parse(textResponse);
    } catch (jsonError) {
      console.error("❌ Failed to parse response JSON:", jsonError);
      console.error("Response text:", textResponse.substring(0, 500));

      return {
        success: false,
        message: "Invalid JSON response from server",
        error: true,
      };
    }
  } catch (readError) {
    console.error("❌ Failed to read response:", readError);

    // Check if this is a "body already read" error
    const errorMessage =
      readError instanceof Error ? readError.message : String(readError);
    if (
      errorMessage.includes("already read") ||
      errorMessage.includes("body used")
    ) {
      console.error("❌ Response body was already consumed");
      return {
        success: false,
        message: "Response body was already read",
        error: true,
      };
    }

    return {
      success: false,
      message: "Failed to read response from server",
      error: true,
    };
  }
}

/**
 * Check if a parsed response indicates an error
 */
export function isResponseError(data: any): boolean {
  return data?.error === true || data?.success === false;
}
