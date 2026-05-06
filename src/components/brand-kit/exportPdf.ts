import jsPDF from "jspdf";
import { FONTS, type BrandState } from "./types";

export function exportBrandKitPDF(state: BrandState) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 48;
  const colors = state.palette.colors;
  const dark = colors[0];
  const light = colors[colors.length - 1];
  const primary = colors[state.paletteIndex] ?? colors[2];

  // ---------- Page 1: Cover ----------
  doc.setFillColor(light);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(primary);
  doc.rect(0, 0, W, 6, "F");

  doc.setTextColor(dark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("BRAND GUIDELINES — V1", margin, margin + 8);
  doc.text(new Date().getFullYear().toString(), W - margin, margin + 8, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(64);
  const name = state.brandName || "Your Brand";
  doc.text(name, margin, H / 2);

  if (state.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(dark);
    doc.text(state.tagline, margin, H / 2 + 28);
  }

  doc.setFontSize(9);
  doc.text("AB BRAND KIT", margin, H - margin);
  doc.text("01 / 03", W - margin, H - margin, { align: "right" });

  // ---------- Page 2: Logo + Colors ----------
  doc.addPage();
  doc.setFillColor(light);
  doc.rect(0, 0, W, H, "F");

  doc.setTextColor(dark);
  doc.setFontSize(9);
  doc.text("LOGO", margin, margin);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("The Mark", margin, margin + 32);

  // Logo block (light bg)
  const logoY = margin + 60;
  const logoH = 160;
  doc.setDrawColor(dark);
  doc.setLineWidth(0.5);
  doc.rect(margin, logoY, (W - margin * 2) / 2 - 8, logoH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(dark);
  doc.text(name, margin + 20, logoY + logoH / 2 + 8);

  // Logo block (dark bg)
  doc.setFillColor(dark);
  doc.rect(margin + (W - margin * 2) / 2 + 8, logoY, (W - margin * 2) / 2 - 8, logoH, "F");
  doc.setTextColor(light);
  doc.text(name, margin + (W - margin * 2) / 2 + 28, logoY + logoH / 2 + 8);

  // Colors
  const colY = logoY + logoH + 60;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(dark);
  doc.setFontSize(9);
  doc.text("PALETTE", margin, colY - 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(state.palette.name, margin, colY + 6);

  const swatchY = colY + 24;
  const swatchW = (W - margin * 2) / colors.length;
  const swatchH = 100;
  colors.forEach((c, i) => {
    doc.setFillColor(c);
    doc.rect(margin + i * swatchW, swatchY, swatchW - 4, swatchH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(dark);
    doc.text(c.toUpperCase(), margin + i * swatchW, swatchY + swatchH + 14);
  });

  doc.setFontSize(9);
  doc.setTextColor(dark);
  doc.text("AB BRAND KIT", margin, H - margin);
  doc.text("02 / 03", W - margin, H - margin, { align: "right" });

  // ---------- Page 3: Typography ----------
  doc.addPage();
  doc.setFillColor(light);
  doc.rect(0, 0, W, H, "F");

  doc.setTextColor(dark);
  doc.setFontSize(9);
  doc.text("TYPOGRAPHY", margin, margin);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("The Voice", margin, margin + 32);

  const heading = FONTS[state.headingFont];
  const body = FONTS[state.bodyFont];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`HEADING — ${heading.label.toUpperCase()}`, margin, margin + 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(56);
  doc.text("Aa Bb Cc", margin, margin + 150);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`BODY — ${body.label.toUpperCase()}`, margin, margin + 220);
  doc.setFontSize(14);
  doc.text(
    "The quick brown fox jumps over the lazy dog. 1234567890 — A consistent typographic system anchors brand recognition across every surface.",
    margin,
    margin + 250,
    { maxWidth: W - margin * 2, lineHeightFactor: 1.5 },
  );

  doc.setFontSize(9);
  doc.text("AB BRAND KIT", margin, H - margin);
  doc.text("03 / 03", W - margin, H - margin, { align: "right" });

  doc.save(`${(state.brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-brand-kit.pdf`);
}