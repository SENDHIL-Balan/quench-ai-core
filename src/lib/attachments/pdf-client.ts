/**
 * Bravura AI — client-side PDF text extraction
 *
 * Runs entirely in the browser. The PDF bytes never leave the device —
 * only the extracted text is sent to the server. This avoids Vercel's
 * 4.5 MB request body limit and works on all mobile browsers.
 *
 * Loaded lazily so pdfjs (~3 MB) never touches the initial bundle.
 */

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB — hard cap on the client
const MAX_OUTPUT_CHARS = 200_000; // keep in sync with server limits

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      // Vite bundles the worker as a URL we can point pdfjs at.

      const workerMod = import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      void workerMod.then((worker) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mod as any).GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;
      });
      return mod;
    });
  }
  return pdfjsPromise;
}

function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  const notice = "\n\n[...content trimmed to stay within the chat budget...]\n\n";
  const available = max - notice.length;
  const head = Math.ceil(available * 0.7);
  const tail = Math.floor(available * 0.3);
  return `${text.slice(0, head)}${notice}${text.slice(-tail)}`;
}

export class PdfExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExtractError";
  }
}

export async function extractPdfTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_PDF_BYTES) {
    throw new PdfExtractError(
      `PDF is too large (${Math.round(file.size / 1024 / 1024)} MB). Try one under 20 MB.`,
    );
  }

  let pdfjs: typeof import("pdfjs-dist");
  try {
    pdfjs = await loadPdfjs();
  } catch (error) {
    console.error("[bravura] failed to load pdfjs", error);
    throw new PdfExtractError("PDF support could not be loaded. Refresh and try again.");
  }

  const buffer = await file.arrayBuffer();

  let pdf;
  try {
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: false,
    });
    pdf = await task.promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[bravura] pdf load failed", { message, error });
    if (/password/i.test(message)) {
      throw new PdfExtractError(
        "That PDF is password-protected. Remove the password and try again.",
      );
    }
    throw new PdfExtractError("That PDF could not be opened. Try a different file.");
  }

  try {
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if (item && typeof item === "object" && "str" in item) {
            return (item as { str: string }).str;
          }
          return "";
        })
        .join(" ");
      pageTexts.push(pageText);
    }

    const fullText = pageTexts.join("\n\n").trim();

    if (!fullText) {
      throw new PdfExtractError(
        "That PDF has no extractable text. If it's a scanned image, paste the text instead.",
      );
    }

    return clipText(fullText, MAX_OUTPUT_CHARS);
  } catch (error) {
    if (error instanceof PdfExtractError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[bravura] pdf text extraction failed", { message, error });
    throw new PdfExtractError("That PDF could not be read. Try a different file.");
  } finally {
    try {
      await pdf.destroy();
    } catch {
      // ignore
    }
  }
}
