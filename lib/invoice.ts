export type InvoiceAddress = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  name?: string;
  phone?: string;
};

export type InvoiceItem = {
  name: string;
  quantity: number;
  unitPriceUsd: number;
  hourlyRateUsd?: number | null;
  sessionHours?: number | null;
  color?: string | null;
  size?: string | null;
};

export type InvoicePayload = {
  invoiceNumber: string;
  paidAt: string;
  customerEmail?: string | null;
  shippingModeLabel: string;
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  promotionCode?: string | null;
  discountAmountUsd?: number;
  discountCurrency?: string | null;
  items: InvoiceItem[];
  shippingAddress: InvoiceAddress;
  billingAddress: InvoiceAddress;
};

type PdfCommand = string;
const BUSINESS_EMAIL = "info@proctorme.shop";
const BUSINESS_WEBSITE = "www.proctorme.shop";

/**
 * Converts a value to pdf safe text.
 *
 * @param value - Input used by to pdf safe text.
 *
 * @returns The result used by the surrounding flow.
 */
function toPdfSafeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Formats usd for display.
 *
 * @param value - Input used by format usd.
 *
 * @returns The formatted display value.
 */
function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

/**
 * Runs the estimate text width logic for this module.
 *
 * @param text - Input used by estimate text width.
 * @param fontSize - Input used by estimate text width.
 *
 * @returns The result used by the surrounding flow.
 */
function estimateTextWidth(text: string, fontSize: number) {
  let units = 0;
  for (const char of text) {
    if (char === " ") {
      units += 0.28;
    } else if (/[0-9]/.test(char)) {
      units += 0.56;
    } else if (/[A-Z]/.test(char)) {
      units += 0.58;
    } else if (/[a-z]/.test(char)) {
      units += 0.5;
    } else if (/[@.:-]/.test(char)) {
      units += 0.3;
    } else {
      units += 0.48;
    }
  }

  return units * fontSize;
}

/**
 * Runs the wrap text logic for this module.
 *
 * @param text - Input used by wrap text.
 * @param maxWidth - Input used by wrap text.
 * @param fontSize - Input used by wrap text.
 *
 * @returns The result used by the surrounding flow.
 */
function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTextWidth(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Formats address for display.
 *
 * @param address - Input used by format address.
 *
 * @returns The formatted display value.
 */
function formatAddress(address: InvoiceAddress) {
  const cityLine = [address.city, address.state, address.zipCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return [address.street, cityLine, address.country]
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Runs the pdf text logic for this module.
 *
 * @param x - Input used by pdf text.
 * @param y - Input used by pdf text.
 * @param text - Input used by pdf text.
 * @param options - Input used by pdf text.
 *
 * @returns The result used by the surrounding flow.
 */
function pdfText(x: number, y: number, text: string, options?: { size?: number; font?: "F1" | "F2"; color?: [number, number, number] }) {
  const size = options?.size ?? 12;
  const font = options?.font ?? "F1";
  const color = options?.color ?? [0.1, 0.1, 0.1];
  return [
    "BT",
    `/${font} ${size} Tf`,
    `${color[0]} ${color[1]} ${color[2]} rg`,
    `1 0 0 1 ${x} ${y} Tm`,
    `(${toPdfSafeText(text)}) Tj`,
    "ET",
  ].join("\n");
}

/**
 * Runs the pdf line logic for this module.
 *
 * @param x1 - Input used by pdf line.
 * @param y1 - Input used by pdf line.
 * @param x2 - Input used by pdf line.
 * @param y2 - Input used by pdf line.
 * @param color - Input used by pdf line.
 * @param width - Input used by pdf line.
 *
 * @returns The result used by the surrounding flow.
 */
function pdfLine(x1: number, y1: number, x2: number, y2: number, color: [number, number, number], width = 1) {
  return [`${width} w`, `${color[0]} ${color[1]} ${color[2]} RG`, `${x1} ${y1} m`, `${x2} ${y2} l`, "S"].join("\n");
}

/**
 * Runs the pdf rect logic for this module.
 *
 * @param x - Input used by pdf rect.
 * @param y - Input used by pdf rect.
 * @param width - Input used by pdf rect.
 * @param height - Input used by pdf rect.
 * @param options - Input used by pdf rect.
 *
 * @returns The result used by the surrounding flow.
 */
function pdfRect(x: number, y: number, width: number, height: number, options: { stroke?: [number, number, number]; fill?: [number, number, number]; radius?: number }) {
  const radius = options.radius ?? 0;
  const right = x + width;
  const top = y + height;

  if (radius <= 0) {
    const commands = [];
    if (options.fill) commands.push(`${options.fill[0]} ${options.fill[1]} ${options.fill[2]} rg`);
    if (options.stroke) commands.push(`${options.stroke[0]} ${options.stroke[1]} ${options.stroke[2]} RG`);
    commands.push(`${x} ${y} ${width} ${height} re`);
    commands.push(options.fill && options.stroke ? "B" : options.fill ? "f" : "S");
    return commands.join("\n");
  }

  const r = Math.min(radius, width / 2, height / 2);
  const c = 0.5522847498 * r;
  const commands = [];
  if (options.fill) commands.push(`${options.fill[0]} ${options.fill[1]} ${options.fill[2]} rg`);
  if (options.stroke) commands.push(`${options.stroke[0]} ${options.stroke[1]} ${options.stroke[2]} RG`);
  commands.push(
    `${x + r} ${y} m`,
    `${right - r} ${y} l`,
    `${right - r + c} ${y} ${right} ${y + r - c} ${right} ${y + r} c`,
    `${right} ${top - r} l`,
    `${right} ${top - r + c} ${right - r + c} ${top} ${right - r} ${top} c`,
    `${x + r} ${top} l`,
    `${x + r - c} ${top} ${x} ${top - r + c} ${x} ${top - r} c`,
    `${x} ${y + r} l`,
    `${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y} c`,
    "h",
    options.fill && options.stroke ? "B" : options.fill ? "f" : "S"
  );
  return commands.join("\n");
}

/**
 * Runs the draw wrapped text logic for this module.
 *
 * @param commands - Input used by draw wrapped text.
 * @param x - Input used by draw wrapped text.
 * @param startY - Input used by draw wrapped text.
 * @param maxWidth - Input used by draw wrapped text.
 * @param text - Input used by draw wrapped text.
 * @param options - Input used by draw wrapped text.
 *
 * @returns The result used by the surrounding flow.
 */
function drawWrappedText(commands: PdfCommand[], x: number, startY: number, maxWidth: number, text: string, options?: { size?: number; font?: "F1" | "F2"; color?: [number, number, number]; lineHeight?: number }) {
  const size = options?.size ?? 12;
  const lineHeight = options?.lineHeight ?? size + 4;
  const lines = wrapText(text, maxWidth, size);
  let y = startY;

  for (const line of lines) {
    commands.push(pdfText(x, y, line, { size, font: options?.font, color: options?.color }));
    y -= lineHeight;
  }

  return y;
}

/**
 * Runs the draw address card logic for this module.
 *
 * @param commands - Input used by draw address card.
 * @param x - Input used by draw address card.
 * @param yTop - Input used by draw address card.
 * @param width - Input used by draw address card.
 * @param title - Input used by draw address card.
 * @param address - Input used by draw address card.
 *
 * @returns The result used by the surrounding flow.
 */
function drawAddressCard(commands: PdfCommand[], x: number, yTop: number, width: number, title: string, address: InvoiceAddress) {
  const height = 126;
  const y = yTop - height;
  commands.push(pdfRect(x, y, width, height, {
    stroke: [0.88, 0.89, 0.91],
    fill: [1, 1, 1],
    radius: 14,
  }));
  commands.push(pdfText(x + 18, yTop - 26, title, { size: 11, font: "F2", color: [0.1, 0.1, 0.1] }));

  let currentY = yTop - 48;
  for (const line of formatAddress(address)) {
    currentY = drawWrappedText(commands, x + 18, currentY, width - 36, line, {
      size: 10.5,
      color: [0.32, 0.34, 0.39],
      lineHeight: 14,
    });
  }
}

/**
 * Creates invoice number for this flow.
 *
 * @param date - Input used by create invoice number.
 * @param sequenceNumber - Input used by create invoice number.
 *
 * @returns The result used by the surrounding flow.
 */
export function createInvoiceNumber(date = new Date(), sequenceNumber?: number | string) {
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

  const sequence = sequenceNumber == null ? "" : `-${String(sequenceNumber)}`;

  return `PM-${stamp}${sequence}`;
}

/**
 * Builds invoice pdf for this flow.
 *
 * @param payload - Input used by build invoice pdf.
 *
 * @returns The result used by the surrounding flow.
 */
export function buildInvoicePdf(payload: InvoicePayload) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 34;
  const contentWidth = pageWidth - margin * 2;
  const gap = 18;
  const addressWidth = (contentWidth - gap) / 2;
  const commands: PdfCommand[] = [];

  commands.push(pdfRect(0, 0, pageWidth, pageHeight, { fill: [0.98, 0.98, 0.98] }));
  const headerHeight = 150;
  const headerY = pageHeight - 184;
  commands.push(pdfRect(margin, headerY, contentWidth, headerHeight, {
    fill: [0.96, 0.96, 0.97],
    stroke: [0.88, 0.89, 0.91],
    radius: 22,
  }));

  commands.push(pdfText(margin + 24, headerY + headerHeight - 44, SITE_NAME, { size: 24, font: "F2" }));
  let businessY = headerY + headerHeight - 82;
  const businessLines = ["", BUSINESS_WEBSITE, BUSINESS_EMAIL];
  for (const line of businessLines) {
    businessY = drawWrappedText(commands, margin + 24, businessY, 300, line, {
      size: 10,
      color: [0.32, 0.34, 0.39],
      lineHeight: 16,
    });
  }

  const metaLabelX = margin + addressWidth + gap;
  const metaValueX = metaLabelX + 54;
  const metaRows = [
    ["Invoice", payload.invoiceNumber],
    ["Paid at", new Date(payload.paidAt).toLocaleString("en-US", { timeZone: "America/New_York" })],
    ["Email", payload.customerEmail ?? "Not available"],
  ];

  let metaY = headerY + headerHeight - 82;
  for (const [label, value] of metaRows) {
    commands.push(
      pdfText(
        metaLabelX,
        metaY,
        label,
        { size: 9, color: [0.42, 0.44, 0.49] }
      )
    );
    commands.push(
      pdfText(
        metaValueX,
        metaY,
        value,
        { size: 10.5, font: "F2", color: [0.1, 0.1, 0.1] }
      )
    );
    metaY -= 16;
  }

  const addressTop = 572;
  drawAddressCard(commands, margin, addressTop, addressWidth, "Interview location", payload.shippingAddress);
  drawAddressCard(commands, margin + addressWidth + gap, addressTop, addressWidth, "Billing address", payload.billingAddress);

  const cardX = margin;
  const cardY = 54;
  const cardHeight = 382;
  commands.push(pdfRect(cardX, cardY, contentWidth, cardHeight, {
    fill: [1, 1, 1],
    stroke: [0.88, 0.89, 0.91],
    radius: 22,
  }));

  commands.push(pdfText(cardX + 26, cardY + cardHeight - 34, "Booking summary", { size: 16, font: "F2" }));

  const rightColumnX = cardX + contentWidth - 26;
  const itemTopY = cardY + cardHeight - 106;
  const itemColumnWidth = contentWidth - 52;
  let currentItemY = itemTopY - 10;

  commands.push(pdfText(cardX + 26, itemTopY + 22, "Proctor", { size: 10, font: "F2", color: [0.42, 0.44, 0.49] }));
  commands.push(pdfText(cardX + 250, itemTopY + 22, "Details", { size: 10, font: "F2", color: [0.42, 0.44, 0.49] }));
  const totalHeader = "Line total";
  commands.push(
    pdfText(
      rightColumnX - estimateTextWidth(totalHeader, 10),
      itemTopY + 22,
      totalHeader,
      { size: 10, font: "F2", color: [0.42, 0.44, 0.49] }
    )
  );
  commands.push(pdfLine(cardX + 26, itemTopY + 12, cardX + contentWidth - 26, itemTopY + 12, [0.9, 0.91, 0.93]));

  for (const item of payload.items) {
    const sessionHours =
      typeof item.sessionHours === "number" && Number.isFinite(item.sessionHours) && item.sessionHours > 0
        ? item.sessionHours
        : item.quantity;
    const hourlyRate =
      typeof item.hourlyRateUsd === "number" && Number.isFinite(item.hourlyRateUsd) && item.hourlyRateUsd >= 0
        ? item.hourlyRateUsd
        : sessionHours > 0
          ? item.unitPriceUsd / sessionHours
          : item.unitPriceUsd;
    const itemDetails = [
      item.size ? `Session ${item.size}` : null,
      `Hourly rate ${formatUsd(hourlyRate)}`,
      `Hours ${sessionHours}`,
    ]
      .filter((detail): detail is string => detail !== null);

    commands.push(pdfText(cardX + 26, currentItemY, item.name, { size: 11, font: "F2" }));
    const lineTotal = formatUsd(item.unitPriceUsd * item.quantity);
    commands.push(pdfText(rightColumnX - estimateTextWidth(lineTotal, 11), currentItemY, lineTotal, { size: 11, font: "F2" }));

    for (const detail of itemDetails) {
      currentItemY = drawWrappedText(commands, cardX + 250, currentItemY, itemColumnWidth - 340, detail, {
        size: 10,
        color: [0.42, 0.44, 0.49],
        lineHeight: 14,
      });
    }
    currentItemY -= 14;
  }

  const dividerY = currentItemY - 4;
  commands.push(pdfLine(cardX + 26, dividerY, cardX + contentWidth - 26, dividerY, [0.9, 0.91, 0.93]));

  const totals = [
    ["Subtotal", formatUsd(payload.subtotalUsd), false],
    ["Service fee (9%)", formatUsd(payload.shippingUsd), false],
    ...(payload.discountAmountUsd && payload.discountAmountUsd > 0
      ? [[`Discount${payload.promotionCode ? ` (${payload.promotionCode})` : ""}`, `-${formatUsd(payload.discountAmountUsd)}`, false] as const]
      : []),
    ["Total", formatUsd(payload.totalUsd), true],
  ] as const;

  let totalsY = dividerY - 24;
  for (const [label, value, emphasize] of totals) {
    commands.push(pdfText(cardX + 26, totalsY, label, {
      size: 11,
      font: emphasize ? "F2" : "F1",
      color: emphasize ? [0.1, 0.1, 0.1] : [0.32, 0.34, 0.39],
    }));
    commands.push(pdfText(rightColumnX - estimateTextWidth(value, emphasize ? 13 : 11), totalsY, value, {
      size: emphasize ? 13 : 11,
      font: "F2",
    }));
    totalsY -= emphasize ? 24 : 18;
  }

  const contentStream = commands.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
import { SITE_NAME } from "@/lib/proctor";
