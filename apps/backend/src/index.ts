export type Runtime = "worker" | "node" | "edge";

export const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const response = {
    name: "agnes-backend",
    runtime: "edge" satisfies Runtime,
    path: url.pathname,
    message: "Backend scaffold is ready. Define routes and adapters next."
  };

  return Response.json(response, {
    headers: {
      "cache-control": "no-store"
    }
  });
};
