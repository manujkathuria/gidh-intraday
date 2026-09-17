export const getGraphQLEndpoint = (): string => {
  if (process.env.NEXT_PUBLIC_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_GRAPHQL_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (window.location.port === "8080") {
        return "/graphql";
      }
      return "http://127.0.0.1:8080/graphql";
    }
    return "/graphql";
  }
  return "http://127.0.0.1:8080/graphql";
};

export async function executeGraphQL<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const endpoint = getGraphQLEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GraphQL Network Error: HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message || "GraphQL Execution Error");
  }

  return json.data;
}
