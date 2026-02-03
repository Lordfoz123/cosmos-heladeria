import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type CaptureOpts = {
  bgColor?: string;
};

type ImgInfo = {
  dataUrl: string;
  pxW: number;
  pxH: number;
};

async function capture(el: HTMLElement, opts?: CaptureOpts): Promise<ImgInfo> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: opts?.bgColor ?? "#ffffff",
    logging: false,
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    pxW: canvas.width,
    pxH: canvas.height,
  };
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
    // imagen más “ancha” → ajusta por ancho
    w = boxW;
    h = w / imgRatio;
  } else {
    // imagen más “alta” → ajusta por alto
    h = boxH;
    w = h * imgRatio;
  }

  const dx = x + (boxW - w) / 2;
  const dy = y + (boxH - h) / 2;

  pdf.addImage(img.dataUrl, "PNG", dx, dy, w, h);
}

type GridExportInput = {
  fileName: string;

  headerEl: HTMLElement;
  cardsEl: HTMLElement;

  ventasPorDiaEl: HTMLElement;
  pagosMetodoEl: HTMLElement;

  // ✅ NUEVO: sección "por tamaño" (2 gráficos juntos)
  // - Si no lo pasas, el PDF sigue saliendo como antes (backwards compatible).
  porTamanoEl?: HTMLElement;

  topIngresoEl: HTMLElement;
  topUnidadesEl: HTMLElement;

  tablaEl: HTMLElement;

  footerEl?: HTMLElement;

  // para impresión
  bgColor?: string; // default blanco
};

export async function exportVentasGridPdf(input: GridExportInput) {
  const bg = input.bgColor ?? "#ffffff";

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth(); // 210
  const pageH = pdf.internal.pageSize.getHeight(); // 297

  // Fondo blanco (no gasta tinta)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");

  // Grid layout (mm)
  const m = 10;
  const gap = 4;

  const contentW = pageW - m * 2;
  const colW = (contentW - gap) / 2;

  const hHeader = 22;
  const hCards = 22;
  const hRow1 = 88;

  // ✅ NUEVO: alto para fila "por tamaño" (dos gráficos)
  // Debe calzar dentro de A4. 44–56 suele funcionar bien; 48 es estable.
  const hRowSizes = input.porTamanoEl ? 48 : 0;

  const hRow2 = 56;
  const hTable = 64;
  const hFooter = 8;

  const leftW = Math.round((contentW * 0.67 + Number.EPSILON) * 100) / 100;
  const rightW = contentW - leftW - gap;

  const [
    headerImg,
    cardsImg,
    ventasDiaImg,
    pagosImg,
    porTamanoImg,
    topIngresoImg,
    topUnidadesImg,
    tablaImg,
    footerImg,
  ] = await Promise.all([
    capture(input.headerEl, { bgColor: bg }),
    capture(input.cardsEl, { bgColor: bg }),
    capture(input.ventasPorDiaEl, { bgColor: bg }),
    capture(input.pagosMetodoEl, { bgColor: bg }),

    input.porTamanoEl ? capture(input.porTamanoEl, { bgColor: bg }) : Promise.resolve(null),

    capture(input.topIngresoEl, { bgColor: bg }),
    capture(input.topUnidadesEl, { bgColor: bg }),
    capture(input.tablaEl, { bgColor: bg }),
    input.footerEl ? capture(input.footerEl, { bgColor: bg }) : Promise.resolve(null),
  ]);

  let y = m;

  // Header
  drawContain(pdf, headerImg, m, y, contentW, hHeader);
  y += hHeader + gap;

  // Cards
  drawContain(pdf, cardsImg, m, y, contentW, hCards);
  y += hCards + gap;

  // Row 1
  drawContain(pdf, ventasDiaImg, m, y, leftW, hRow1);
  drawContain(pdf, pagosImg, m + leftW + gap, y, rightW, hRow1);
  y += hRow1 + gap;

  // ✅ NUEVO: Row "por tamaño" (2 columnas, en un solo contenedor)
  if (porTamanoImg && hRowSizes > 0) {
    drawContain(pdf, porTamanoImg, m, y, contentW, hRowSizes);
    y += hRowSizes + gap;
  }

  // Row 2
  drawContain(pdf, topIngresoImg, m, y, colW, hRow2);
  drawContain(pdf, topUnidadesImg, m + colW + gap, y, colW, hRow2);
  y += hRow2 + gap;

  // Table
  drawContain(pdf, tablaImg, m, y, contentW, hTable);
  y += hTable + gap;

  // Footer
  if (footerImg) drawContain(pdf, footerImg, m, y, contentW, hFooter);

  pdf.save(input.fileName);
}