import jsPDF from "jspdf";
import type { LogoConcept } from "./conceptTypes";

function hex(doc: jsPDF, h: string) {
  const c = h.replace("#", "");
  doc.setFillColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
}
function tx(doc: jsPDF, h: string) {
  const c = h.replace("#", "");
  doc.setTextColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
}

/** Export a concept dossier (cover, rationale, lockups, palette, type, usage). */
export async function exportConceptPDF(concept: LogoConcept, pngDataUrls: { light: string; dark: string; brand: string; mono: string; mark: string }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 48;
  const { palette } = concept;

  // Cover
  hex(doc, palette.dark); doc.rect(0, 0, W, H, "F");
  hex(doc, palette.primary); doc.rect(0, 0, W, 6, "F");
  tx(doc, palette.light);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("ANAGLYPH BRANDING — LOGO CONCEPT", margin, margin + 8);
  doc.text(new Date().getFullYear().toString(), W - margin, margin + 8, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("CONCEPT", margin, H / 2 - 80);
  doc.setFontSize(56);
  doc.text(concept.name, margin, H / 2 - 30);
  doc.setFont("helvetica", "normal"); doc.setFontSize(14);
  if (concept.tagline) doc.text(concept.tagline, margin, H / 2);
  doc.setFontSize(10);
  doc.text(concept.brandName.toUpperCase(), margin, H - margin);
  doc.text(`#${concept.id}`, W - margin, H - margin, { align: "right" });

  // Rationale page
  doc.addPage();
  hex(doc, palette.light); doc.rect(0, 0, W, H, "F");
  tx(doc, palette.dark);
  doc.setFontSize(9); doc.text("RATIONALE", margin, margin);
  doc.setFont("helvetica", "bold"); doc.setFontSize(28);
  doc.text("Why this works", margin, margin + 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.text(concept.rationale, margin, margin + 70, { maxWidth: W - margin * 2, lineHeightFactor: 1.55 });
  doc.setFontSize(9);
  doc.text(`MOOD: ${concept.moodWords.join(" · ").toUpperCase()}`, margin, H - margin - 20);
  doc.text(`MARK: ${concept.markType.toUpperCase()}`, margin, H - margin);

  // Lockups page
  doc.addPage();
  hex(doc, palette.light); doc.rect(0, 0, W, H, "F");
  tx(doc, palette.dark);
  doc.setFontSize(9); doc.text("LOCKUPS", margin, margin);
  doc.setFont("helvetica", "bold"); doc.setFontSize(28);
  doc.text("The Mark", margin, margin + 32);

  const cellW = (W - margin * 2 - 16) / 2;
  const cellH = 200;
  const startY = margin + 60;
  const cells: Array<["light" | "dark" | "brand" | "mono", string, string]> = [
    ["light", "Light", palette.light],
    ["dark", "Dark", palette.dark],
    ["brand", "Brand", palette.primary],
    ["mono", "Mono", palette.light],
  ];
  cells.forEach(([k, label, bg], i) => {
    const x = margin + (i % 2) * (cellW + 16);
    const y = startY + Math.floor(i / 2) * (cellH + 24);
    hex(doc, bg); doc.rect(x, y, cellW, cellH, "F");
    try { doc.addImage(pngDataUrls[k], "PNG", x + 16, y + 16, cellW - 32, cellH - 32); } catch {}
    tx(doc, palette.dark); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(label.toUpperCase(), x, y + cellH + 14);
  });

  // Palette + type
  doc.addPage();
  hex(doc, palette.light); doc.rect(0, 0, W, H, "F");
  tx(doc, palette.dark);
  doc.setFontSize(9); doc.text("SYSTEM", margin, margin);
  doc.setFont("helvetica", "bold"); doc.setFontSize(28);
  doc.text("Color & Type", margin, margin + 32);

  const swatches = [
    ["Primary", palette.primary],
    ["Secondary", palette.secondary],
    ["Accent", palette.accent],
    ["Dark", palette.dark],
    ["Light", palette.light],
  ] as const;
  const swW = (W - margin * 2) / swatches.length;
  const swY = margin + 70;
  swatches.forEach(([label, c], i) => {
    hex(doc, c); doc.rect(margin + i * swW, swY, swW - 6, 100, "F");
    tx(doc, palette.dark); doc.setFontSize(8);
    doc.text(label.toUpperCase(), margin + i * swW, swY + 116);
    doc.text(c.toUpperCase(), margin + i * swW, swY + 128);
  });

  doc.setFont("helvetica", "bold"); doc.setFontSize(48);
  doc.text("Aa Bb Cc", margin, swY + 220);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Heading geometry: ${concept.geometry} · ${concept.cornerStyle} corners · ${concept.strokeStyle}`, margin, swY + 244);
  doc.text(concept.usageNotes, margin, swY + 270, { maxWidth: W - margin * 2, lineHeightFactor: 1.5 });

  doc.save(`${concept.brandName.toLowerCase().replace(/\s+/g, "-")}-${concept.id}-${concept.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}