export function youtubeId(input: string): string | undefined {
  if (!input.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("公開YouTube動画のURLを入力してください。");
  }
  if (url.protocol !== "https:")
    throw new Error("https:// で始まるYouTube動画のURLを入力してください。");
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
        ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live)\/([^/]+)$/)?.[1])
        : null;
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id))
    throw new Error("YouTubeの動画URLを確認してください。");
  return id;
}
