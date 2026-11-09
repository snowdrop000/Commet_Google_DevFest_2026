export const localApiBase = "http://127.0.0.1:8765";

// Used by both the extension client and its manifest, so the permission matches the URL.
export function resolveApiBase(value?: string, projectId = "demo-commet"): string {
  const endpoint = new URL(value?.trim() || localApiBase);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
  if (
    (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && local)) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== "/"
  ) {
    throw new Error(
      "WXT_API_BASE_URLにはHTTPSのAPI URLを指定してください。ローカル開発ではHTTPを使えます。",
    );
  }
  if (!projectId.startsWith("demo-") && !value?.trim()) {
    throw new Error("本番Firebaseを使う場合は、WXT_API_BASE_URLにAPIの接続先を設定してください。");
  }
  return endpoint.origin;
}
