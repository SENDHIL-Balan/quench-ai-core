/**
 * Universal Image Downloader
 *
 * Ensures images download cleanly to user's computer without navigating away
 * or showing raw zoomed images in browser tabs.
 */

export async function downloadImageFile(
  imageUrl: string,
  suggestedFilename?: string,
): Promise<boolean> {
  if (!imageUrl) return false;

  const timestamp = Date.now();
  const filename =
    suggestedFilename && suggestedFilename.trim()
      ? suggestedFilename.trim().replace(/[^a-zA-Z0-9_. -]/g, "_")
      : `bravura-artwork-${timestamp}.png`;

  // 1. Data URLs can be converted to Blob and downloaded instantly in-memory
  if (imageUrl.startsWith("data:")) {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      return true;
    } catch (e) {
      console.warn("[download] data URL conversion failed, falling back:", e);
    }
  }

  // 2. Try direct CORS fetch to Blob for instant browser download
  try {
    const res = await fetch(imageUrl, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      return true;
    }
  } catch {
    // CORS or network error, proceed to server proxy download
  }

  // 3. Fallback: Use server-side proxy route with Content-Disposition: attachment
  // Because /api/download is on the SAME ORIGIN and sends attachment header,
  // the browser NEVER opens the raw image or replaces the tab; it saves the file directly.
  try {
    const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
    triggerAnchorDownload(proxyUrl, filename);
    return true;
  } catch (err) {
    console.error("[download] proxy download failed:", err);
    return false;
  }
}

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
  }, 300);
}
