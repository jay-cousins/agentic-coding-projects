interface PostJsonOptions {
  // Maps a known `{error: "<code>"}` response body to a user-facing message.
  errorMessages?: Record<string, string>;
  // Used when the response has no recognized error code.
  fallbackMessage?: string;
}

// Shared POST/parse/error-message logic for the client -> route-handler calls
// (search, approve, reject) so each caller only supplies its own error copy.
export async function postJson<T>(
  url: string,
  body: unknown,
  options: PostJsonOptions = {}
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}) as { error?: string });
    const code = errBody.error;
    const message =
      (code && options.errorMessages?.[code]) ?? code ?? options.fallbackMessage ?? "Request failed.";
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
