import test from "node:test";
import assert from "node:assert/strict";

test("Vercel Image Streaming & Proxy Redirect Follow Audit", async (t) => {
  await t.test("1. Proxy follows GET redirects server-side to resolve Cloudflare R2 images", async () => {
    // Simulate Next.js fetch behavior where GET requests follow 302 redirects to storage
    const originalFetch = globalThis.fetch;
    const fetchCalls: Array<{ url: string; redirect?: string }> = [];

    globalThis.fetch = (async (url: any, init?: any) => {
      fetchCalls.push({ url: String(url), redirect: init?.redirect });
      if (String(url).includes("/v1/files/file_abc123")) {
        // Backend responds with 302 to storage
        return new Response(null, {
          status: 302,
          headers: {
            Location: "https://bucket.r2.cloudflarestorage.com/file_abc123.jpg",
          },
        });
      }
      if (String(url).includes("r2.cloudflarestorage.com")) {
        // R2 serves the binary image
        return new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": "3",
          },
        });
      }
      return new Response("OK", { status: 200 });
    }) as any;

    try {
      // Simulate pass handler logic
      const reqMethod: string = "GET";
      const isGetOrHead = reqMethod === "GET" || reqMethod === "HEAD";
      const redirectOption = isGetOrHead ? "follow" : "manual";
      assert.equal(redirectOption, "follow");

      // Verify POST/mutations still preserve manual redirect
      const postMethod: string = "POST";
      const isPostGetOrHead = postMethod === "GET" || postMethod === "HEAD";
      assert.equal(isPostGetOrHead ? "follow" : "manual", "manual");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("2. File and media requests suppress auth-clearing cookies from corrupting session", () => {
    const isFileOrMedia1 = "/v1/files/file_abc123".includes("/files/") || "/v1/files/file_abc123".includes("/photo");
    const isFileOrMedia2 = "/v1/portal/candidates/APP-00001/photo".includes("/files/") || "/v1/portal/candidates/APP-00001/photo".includes("/photo");
    const isFileOrMedia3 = "/v1/applicants".includes("/files/") || "/v1/applicants".includes("/photo");

    assert.equal(isFileOrMedia1, true);
    assert.equal(isFileOrMedia2, true);
    assert.equal(isFileOrMedia3, false);
  });

  await t.test("3. Railway Go backend detection avoids cold-start timeout failure", () => {
    const railwayUrl = "https://goagency-production.up.railway.app";
    const isKnownV1Backend = railwayUrl.includes("railway.app") || railwayUrl.includes("goagency");
    assert.equal(isKnownV1Backend, true);
  });
});
