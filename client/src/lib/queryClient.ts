import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Try to extract a human-readable message from JSON error responses
    try {
      const json = JSON.parse(text);
      const msg = json.error || json.message || text;
      throw new Error(msg);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`${res.status}: ${text}`);
      }
      throw e;
    }
  }
}

export function getSelectedTenantId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedTenantId');
  }
  return null;
}

function buildHeaders(includeContentType: boolean = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  const selectedTenantId = getSelectedTenantId();
  if (selectedTenantId) {
    headers["X-Selected-Tenant-Id"] = selectedTenantId;
  }
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: buildHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
