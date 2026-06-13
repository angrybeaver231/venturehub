import { QueryClient } from "@tanstack/react-query";

async function throwIfNotOk(res: Response) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.message ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
}

export async function apiRequest(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<Response> {
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  await throwIfNotOk(res);
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey.join("/");
        const res = await fetch(url);
        await throwIfNotOk(res);
        return res.json();
      },
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
