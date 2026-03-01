// Cross-Origin Isolation Service Worker for FFmpeg.wasm
// Source: https://github.com/nicolo-ribaudo/coi-serviceworker
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function isHTML(response) {
  const ct = response.headers.get("content-type");
  return ct && ct.includes("text/html");
}

self.addEventListener("fetch", function(event) {
  if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") return;
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (!isHTML(response)) {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
          }
        });
      }
      return response;
    })
  );
});
