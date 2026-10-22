// Loads the PDF libraries only when a document is generated, so the first page load stays small.
export async function loadPdfEngine() {
  try {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    return { jsPDF, html2canvas };
  } catch (e) {
    throw new Error('The PDF engine did not load. Check your connection and reload.');
  }
}
