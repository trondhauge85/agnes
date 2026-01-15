export const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json"
};

export const createJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: jsonHeaders
  });

export const parseJsonBody = async <T>(
  request: Request
): Promise<T | null> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await request.json()) as T;
};
