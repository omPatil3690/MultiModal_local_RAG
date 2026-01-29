import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

export default function DocumentViewer() {
  const router = useRouter();
  const { filename } = router.query;

  // Parse page number from hash fragment
  const pageNum = typeof window !== "undefined" && window.location.hash.match(/page=(\d+)/)
    ? window.location.hash.match(/page=(\d+)/)[1]
    : null;

  // PDF.js or browser embed fallback
  const pdfUrl = `/documents/${filename}`;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // If using PDF.js, you could send pageNum to the viewer here
    // For browser embed, pageNum navigation is not supported
    // Optionally, show a toast or message if pageNum is present
  }, [pageNum]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-lg font-semibold mb-4">Viewing: {filename}</h1>
      <iframe
        ref={iframeRef}
        src={pdfUrl}
        title={filename as string}
        className="w-full h-[90vh] border rounded shadow"
      />
      {pageNum && (
        <div className="mt-2 text-sm text-gray-600">
          (Page navigation to page {pageNum} is not supported in browser preview. Use a PDF viewer for direct page access.)
        </div>
      )}
    </div>
  );
}
