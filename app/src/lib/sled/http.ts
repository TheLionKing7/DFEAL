const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function sledFetch(
  url: string,
  init?: RequestInit & { cookieJar?: Map<string, string> },
): Promise<Response> {
  const jar = init?.cookieJar;
  const headers = new Headers(init?.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", BROWSER_UA);
  if (jar?.size) {
    headers.set(
      "Cookie",
      [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    );
  }

  const response = await fetch(url, { ...init, headers });

  if (jar) {
    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const part = raw.split(";")[0];
      const eq = part.indexOf("=");
      if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
    }
  }

  return response;
}

export async function warmCookieJar(baseUrl: string, jar: Map<string, string>) {
  await sledFetch(baseUrl, { cookieJar: jar });
}
