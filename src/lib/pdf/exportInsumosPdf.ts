import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ImgInfo = { dataUrl: string; pxW: number; pxH: number };

async function capture(el: HTMLElement, bgColor = "#ffffff"): Promise<ImgInfo> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: bgColor,
    logging: false,
  });

  return { dataUrl: canvas.toDataURL("image/png"), pxW: canvas.width, pxH: canvas.height };
}

function drawContain(
  pdf: jsPDF,
  img: ImgInfo,
  x: number,
  y: number,
  boxW: number,
  boxH: number
) {
  const imgRatio = img.pxW / img.pxH;
  const boxRatio = boxW / boxH;

  let w = boxW;
  let h = boxH;

  if (imgRatio > boxRatio) {
    w = boxW;
    h = w / imgRatio;
  } else {
    h = boxH;
    w = h * imgRatio;
  }

  const dx = x + (boxW - w) / 2;
  const dy = y + (boxH - h) / 2;

  pdf.addImage(img.dataUrl, "PNG", dx, dy, w, h);
}

export type ExportInsumosPdfInput = {
  fileName: string;

  headerEl: HTMLElement;
  cardsEl: HTMLElement;
  chartsEl: HTMLElement;

  // tabla puede ser larga: se parte en páginas
  tablePagesEl: HTMLElement;

  bgColor?: string;
};

export async function exportInsumosPdf(input: ExportInsumosPdfInput) {
  const bg = input.bgColor ?? "#ffffff";
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const m = 10;
  const gap = 4;
  const contentW = pageW - m * 2;

  // ===== Página 1 (resumen) =====
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");

  const [headerImg, cardsImg, chartsImg] = await Promise.all([
    capture(input.headerEl, bg),
    capture(input.cardsEl, bg),
    capture(input.chartsEl, bg),
  ]);

  // layout en mm (más natural para impresión)
  const hHeader = 24;
  const hCards = 26;
  const hCharts = pageH - m * 2 - hHeader - hCards - gap * 2;

  let y = m;
  drawContain(pdf, headerImg, m, y, contentW, hHeader);
  y += hHeader + gap;

  drawContain(pdf, cardsImg, m, y, contentW, hCards);
  y += hCards + gap;

  drawContain(pdf, chartsImg, m, y, contentW, hCharts);

  // ===== Páginas 2..N (tabla) =====
  const tablePages = Array.from(
    input.tablePagesEl.querySelectorAll<HTMLElement>("[data-pdf-table-page='true']")
  );

  // fallback por si no encontraron páginas: captura el contenedor entero
  if (tablePages.length === 0) {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, "F");

    const tableImg = await capture(input.tablePagesEl, bg);
    drawContain(pdf, tableImg, m, m, contentW, pageH - m * 2);

    pdf.save(input.fileName);
    return;
  }

  for (const [idx, el] of tablePages.entries()) {
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, "F");

    const img = await capture(el, bg);

    // tabla: la ponemos “full page” (sin encoger)
    drawContain(pdf, img, m, m, contentW, pageH - m * 2);

    // footer con paginado simple
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(
      `Página ${idx + 2} / ${tablePages.length + 1}`,
      pageW - m,
      pageH - 5,
      { align: "right" }
    );
  }

  pdf.save(input.fileName);
}