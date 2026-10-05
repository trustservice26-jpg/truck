import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyRecord, Profile, RecordTotals } from '../types';
import { formatCurrency, formatDisplayDate } from './formatters';

export interface PDFExportOptions {
  profile: Profile;
  records: DailyRecord[];
  totals: RecordTotals;
  from: string;
  to: string;
  language?: 'en' | 'bn';
}

const FONT_STACK = '"Plus Jakarta Sans", "Noto Sans Bengali", "Segoe UI", Roboto, sans-serif';
const MONO_STACK = '"JetBrains Mono", "Noto Sans Bengali", monospace, sans-serif';

function getActiveLanguage(explicitLang?: 'en' | 'bn'): 'en' | 'bn' {
  if (explicitLang) return explicitLang;
  try {
    const saved = localStorage.getItem('fleet_app_language');
    if (saved === 'bn' || saved === 'en') return saved;
  } catch {}
  return 'en';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 0.3
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Draws text that automatically scales down its font size if it exceeds maxWidth (in mm),
 * ensuring calculations and Bangla/English labels always fit strictly inside their box.
 */
function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSizeMm: number,
  minSizeMm: number,
  color: string,
  weight: string = '700',
  align: CanvasTextAlign = 'left',
  useMono = false
) {
  const family = useMono ? MONO_STACK : FONT_STACK;
  let size = initialSizeMm;
  ctx.font = `${weight} ${size}px ${family}`;

  while (ctx.measureText(text).width > maxWidth && size > minSizeMm) {
    size = Math.max(minSizeMm, size - 0.15);
    ctx.font = `${weight} ${size}px ${family}`;
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  let finalStr = text;
  if (ctx.measureText(finalStr).width > maxWidth) {
    while (finalStr.length > 1 && ctx.measureText(finalStr + '…').width > maxWidth) {
      finalStr = finalStr.slice(0, -1);
    }
    finalStr += '…';
  }

  ctx.fillText(finalStr, x, y);
  ctx.textAlign = 'left';
}

/**
 * Splits multi-line user text (preserving explicit \n line breaks) and wraps each line
 * within `maxWidth` mm so all entered Cost Details are shown clearly.
 */
function wrapMultilineDetails(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number,
  fontSizeMm: number,
  maxLines = 12
): string[] {
  ctx.font = `600 ${fontSizeMm}px ${FONT_STACK}`;
  const clean = (rawText || '').trim();
  if (!clean) return ['—'];

  const paragraphs = clean
    .split(/\r?\n/)
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return ['—'];

  const lines: string[] = [];

  for (const para of paragraphs) {
    if (ctx.measureText(para).width <= maxWidth) {
      lines.push(para);
    } else {
      const words = para.split(/\s+/);
      let current = '';

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          if (current) {
            lines.push(current);
            current = word;
          } else {
            let part = word;
            while (part.length > 1 && ctx.measureText(part).width > maxWidth) {
              part = part.slice(0, -1);
            }
            lines.push(part);
            current = word.slice(part.length);
          }
          if (lines.length >= maxLines) break;
        }
      }
      if (current && lines.length < maxLines) {
        lines.push(current);
      }
    }
    if (lines.length >= maxLines) break;
  }

  return lines.length > 0 ? lines.slice(0, maxLines) : ['—'];
}

interface PreparedRow {
  record: DailyRecord;
  detailLines: string[];
  rowHeight: number;
}

export function downloadLedgerPDF({
  profile,
  records,
  totals,
  from,
  to,
  language,
}: PDFExportOptions): boolean {
  const lang = getActiveLanguage(language);
  const isBangla = lang === 'bn';

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const scale = 8; // High-DPI rendering (8px per mm)

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');

    if (measureCtx) {
      const currentDate = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const statementDocId = `FL-${profile.vehicle_number || 'VEH'}-${from.replace(/-/g, '')}-${to.replace(/-/g, '')}`;

      // Column widths summing to 190mm (left margin 10mm, right margin 10mm for larger readable text on mobile)
      // Col 0 (Date): 24mm
      // Col 1 (Income ৳): 30mm
      // Col 2 (Cost ৳): 30mm
      // Col 3 (Cost Details): 48mm (wider for clear multi-line details)
      // Col 4 (Other ৳): 28mm
      // Col 5 (Net Balance ৳): 30mm
      const tableX = 10;
      const tableW = pageWidth - 20; // 190mm
      const colWidths = [24, 30, 30, 48, 28, 30];
      const colX = [
        tableX,
        tableX + 24,
        tableX + 24 + 30,
        tableX + 24 + 30 + 30,
        tableX + 24 + 30 + 30 + 48,
        tableX + 24 + 30 + 30 + 48 + 28,
      ];

      const detailFontMm = 3.05; // Larger, clearer text for Cost Details
      const lineSpacingMm = 4.1; // Clear line spacing between detail lines

      // Pre-calculate each row's wrapped Cost Details lines & dynamic height
      const preparedRows: PreparedRow[] = records.map(r => {
        const blocks: string[] = [];
        if (r.cost_location?.trim()) blocks.push(r.cost_location.trim());
        if (r.cost_details?.trim()) blocks.push(r.cost_details.trim());
        if (r.other_details?.trim()) blocks.push(r.other_details.trim());
        const combinedDetails = blocks.join('\n');

        const detailLines = wrapMultilineDetails(
          measureCtx,
          combinedDetails,
          colWidths[3] - 4,
          detailFontMm,
          10
        );

        const calculatedHeight = Math.max(10.2, detailLines.length * lineSpacingMm + 3.8);
        return {
          record: r,
          detailLines,
          rowHeight: calculatedHeight,
        };
      });

      // Dynamic height-based pagination so multi-line Cost Details never overflow the page
      const pages: PreparedRow[][] = [];
      const maxContentY = pageHeight - 25; // Leave space for totals & footer
      const headH = 9.5;

      if (preparedRows.length === 0) {
        pages.push([]);
      } else {
        let currentPageRows: PreparedRow[] = [];
        let currentY = 76 + headH; // First page table body start Y

        preparedRows.forEach(pRow => {
          if (currentPageRows.length > 0 && currentY + pRow.rowHeight > maxContentY) {
            pages.push(currentPageRows);
            currentPageRows = [pRow];
            currentY = 34 + headH + pRow.rowHeight; // Subsequent page table body start Y
          } else {
            currentPageRows.push(pRow);
            currentY += pRow.rowHeight;
          }
        });

        if (currentPageRows.length > 0) {
          pages.push(currentPageRows);
        }
      }

      const totalPages = pages.length;

      pages.forEach((pageRows, pageIdx) => {
        if (pageIdx > 0) {
          doc.addPage();
        }

        const canvas = document.createElement('canvas');
        canvas.width = pageWidth * scale;
        canvas.height = pageHeight * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);

        // White page background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageWidth, pageHeight);

        // 1. Top Header Banner
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, pageWidth, 28);

        drawFittedText(ctx, 'FLEET-LEDGER', 10, 8.5, 48, 5.5, 4.2, '#ffffff', '800', 'left');

        // Audit Badge
        drawRoundedRect(ctx, 57, 5.3, 38, 6, 1.2, '#1e293b', '#334155', 0.25);
        drawFittedText(
          ctx,
          isBangla ? 'অডিট বিবরণী (AUDIT)' : 'AUDIT STATEMENT',
          76,
          8.3,
          35,
          2.9,
          2.2,
          '#93c5fd',
          '700',
          'center'
        );

        // Main Title & Subtitle (Bigger for mobile readability)
        drawFittedText(
          ctx,
          isBangla
            ? 'গাড়ির আয় ও পরিচালন ব্যয়ের খতিয়ান (টাকা ৳)'
            : 'VEHICLE INCOME & OPERATING COST LEDGER (৳)',
          10,
          16.5,
          118,
          4.3,
          3.2,
          '#ffffff',
          '800',
          'left'
        );

        drawFittedText(
          ctx,
          isBangla
            ? 'অফিসিয়াল ফ্লিট অডিট ও চালকের হিসাব নিষ্পত্তি বিবরণী'
            : 'Official Fleet Audit & Driver Settlement Statement (Currency: Taka ৳)',
          10,
          22.5,
          118,
          3.1,
          2.4,
          '#cbd5e1',
          '500',
          'left'
        );

        // Right Header Metadata
        drawFittedText(
          ctx,
          `${isBangla ? 'ডক রেফারেন্স' : 'Doc Ref'}: ${statementDocId}`,
          pageWidth - 10,
          8,
          70,
          2.9,
          2.2,
          '#e2e8f0',
          '600',
          'right',
          true
        );
        drawFittedText(
          ctx,
          `${isBangla ? 'তৈরির সময়' : 'Generated'}: ${currentDate}`,
          pageWidth - 10,
          15,
          70,
          2.9,
          2.2,
          '#e2e8f0',
          '600',
          'right'
        );
        drawFittedText(
          ctx,
          `${isBangla ? 'সময়কাল' : 'Period'}: ${formatDisplayDate(from)} - ${formatDisplayDate(to)}`,
          pageWidth - 10,
          22,
          70,
          3.1,
          2.3,
          '#ffffff',
          '800',
          'right'
        );

        let tableStartY = 34;

        if (pageIdx === 0) {
          // 2. Vehicle & Driver Credentials Box (Bigger, Clearer Text)
          const credY = 31.5;
          const credH = 17.5;
          drawRoundedRect(ctx, 10, credY, pageWidth - 20, credH, 1.8, '#f8fafc', '#cbd5e1', 0.4);

          const colW = (pageWidth - 20) / 4;

          for (let c = 1; c < 4; c++) {
            ctx.beginPath();
            ctx.moveTo(10 + colW * c, credY + 2.5);
            ctx.lineTo(10 + colW * c, credY + credH - 2.5);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }

          // Col 1: Log in Number & Vehicle Reg
          drawFittedText(
            ctx,
            isBangla ? 'লগইন নম্বর (LOG IN):' : 'LOG IN NUMBER:',
            13,
            credY + 4.5,
            colW - 5,
            2.8,
            2.1,
            '#475569',
            '700'
          );
          drawFittedText(
            ctx,
            profile.vehicle_number || 'N/A',
            13,
            credY + 10,
            colW - 5,
            4.0,
            2.7,
            '#0f172a',
            '800',
            'left',
            true
          );
          if (profile.vehicle_register_number) {
            drawFittedText(
              ctx,
              `${isBangla ? 'রেজিঃ' : 'Reg:'} ${profile.vehicle_register_number}`,
              13,
              credY + 14.6,
              colW - 5,
              2.7,
              2.0,
              '#334155',
              '700',
              'left',
              true
            );
          }

          // Col 2: Driver Name
          drawFittedText(
            ctx,
            isBangla ? 'চালকের নাম (DRIVER):' : 'DRIVER NAME:',
            13 + colW,
            credY + 4.5,
            colW - 5,
            2.8,
            2.1,
            '#475569',
            '700'
          );
          drawFittedText(
            ctx,
            profile.name || 'N/A',
            13 + colW,
            credY + 11,
            colW - 5,
            3.8,
            2.5,
            '#0f172a',
            '800'
          );

          // Col 3: Contact Phone
          drawFittedText(
            ctx,
            isBangla ? 'ফোন নম্বর (PHONE):' : 'CONTACT PHONE:',
            13 + colW * 2,
            credY + 4.5,
            colW - 5,
            2.8,
            2.1,
            '#475569',
            '700'
          );
          drawFittedText(
            ctx,
            profile.phone || 'N/A',
            13 + colW * 2,
            credY + 11,
            colW - 5,
            3.6,
            2.4,
            '#0f172a',
            '700',
            'left',
            true
          );

          // Col 4: Account Role & Currency
          drawFittedText(
            ctx,
            isBangla ? 'অ্যাকাউন্ট রোল / মুদ্রা:' : 'ROLE & CURRENCY:',
            13 + colW * 3,
            credY + 4.5,
            colW - 5,
            2.8,
            2.1,
            '#475569',
            '700'
          );
          drawFittedText(
            ctx,
            `${(profile.role || 'USER').toUpperCase()} · ৳ TAKA`,
            13 + colW * 3,
            credY + 11,
            colW - 5,
            3.5,
            2.4,
            '#0f172a',
            '800'
          );

          // 3. Financial Summary Calculation Boxes (4 Cards with Bigger Clear Text & Auto-Fit)
          const cardY = 52;
          const gap = 2.8;
          const cardW = (pageWidth - 20 - gap * 3) / 4;
          const cardH = 20.5;
          const innerPad = 2.5;
          const maxCalcWidth = cardW - innerPad * 2;

          // Card 1: Gross Income
          const c1X = 10;
          drawRoundedRect(ctx, c1X, cardY, cardW, cardH, 1.8, '#f0fdf4', '#86efac', 0.45);
          drawFittedText(
            ctx,
            isBangla ? 'মোট আয় (GROSS INCOME)' : 'GROSS INCOME (৳)',
            c1X + cardW / 2,
            cardY + 4.6,
            maxCalcWidth,
            2.9,
            2.1,
            '#065f46',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.income, '৳'),
            c1X + cardW / 2,
            cardY + 11.2,
            maxCalcWidth,
            4.6,
            2.6,
            '#064e3b',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isBangla ? `${totals.entryCount} দিনের মোট জমা` : `${totals.entryCount} Days Total Revenue`,
            c1X + cardW / 2,
            cardY + 17.0,
            maxCalcWidth,
            2.7,
            2.0,
            '#047857',
            '700',
            'center'
          );

          // Card 2: Fuel & Direct Costs (Red Color for Expense)
          const c2X = 10 + (cardW + gap);
          drawRoundedRect(ctx, c2X, cardY, cardW, cardH, 1.8, '#fef2f2', '#fca5a5', 0.45);
          drawFittedText(
            ctx,
            isBangla ? 'জ্বালানি ও খরচ (COST)' : 'FUEL & COSTS (EXPENSE)',
            c2X + cardW / 2,
            cardY + 4.6,
            maxCalcWidth,
            2.9,
            2.1,
            '#991b1b',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.cost, '৳'),
            c2X + cardW / 2,
            cardY + 11.2,
            maxCalcWidth,
            4.6,
            2.6,
            '#dc2626',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isBangla ? 'জ্বালানি ও ইঞ্জিন ব্যয়' : 'Fuel & Direct Operating Cost',
            c2X + cardW / 2,
            cardY + 17.0,
            maxCalcWidth,
            2.7,
            2.0,
            '#b91c1c',
            '700',
            'center'
          );

          // Card 3: Other Costs (Red Color for Expense)
          const c3X = 10 + (cardW + gap) * 2;
          drawRoundedRect(ctx, c3X, cardY, cardW, cardH, 1.8, '#fef2f2', '#fca5a5', 0.45);
          drawFittedText(
            ctx,
            isBangla ? 'অন্যান্য খরচ (OTHER)' : 'OTHER COSTS (EXPENSE)',
            c3X + cardW / 2,
            cardY + 4.6,
            maxCalcWidth,
            2.9,
            2.1,
            '#991b1b',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.other, '৳'),
            c3X + cardW / 2,
            cardY + 11.2,
            maxCalcWidth,
            4.6,
            2.6,
            '#dc2626',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isBangla ? 'টোল ও আনুষঙ্গিক ব্যয়' : 'Tolls, Permits & Incidentals',
            c3X + cardW / 2,
            cardY + 17.0,
            maxCalcWidth,
            2.7,
            2.0,
            '#b91c1c',
            '700',
            'center'
          );

          // Card 4: Net Settlement Balance
          const isPositive = totals.balance >= 0;
          const c4X = 10 + (cardW + gap) * 3;
          drawRoundedRect(
            ctx,
            c4X,
            cardY,
            cardW,
            cardH,
            1.8,
            isPositive ? '#f1f5f9' : '#fff1f2',
            '#0f172a',
            0.6
          );
          drawFittedText(
            ctx,
            isBangla ? 'নিট ব্যালেন্স (NET BALANCE)' : 'NET SETTLEMENT (৳)',
            c4X + cardW / 2,
            cardY + 4.6,
            maxCalcWidth,
            2.9,
            2.1,
            '#0f172a',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.balance, '৳'),
            c4X + cardW / 2,
            cardY + 11.2,
            maxCalcWidth,
            4.6,
            2.6,
            isPositive ? '#047857' : '#dc2626',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isPositive
              ? isBangla
                ? `নিট লাভ (${totals.marginPercent.toFixed(1)}%)`
                : `Net Surplus (${totals.marginPercent.toFixed(1)}%)`
              : isBangla
              ? 'পরিচালন ঘাটতি (Deficit)'
              : 'Operating Deficit',
            c4X + cardW / 2,
            cardY + 17.0,
            maxCalcWidth,
            2.7,
            2.0,
            isPositive ? '#334155' : '#be123c',
            '700',
            'center'
          );

          tableStartY = 76;
        }

        // 4. Itemized Ledger Table Header (Bigger words for mobile clarity)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(tableX, tableStartY, tableW, headH);
        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(colX[2], tableStartY, colWidths[2], headH);
        ctx.fillRect(colX[4], tableStartY, colWidths[4], headH);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.4;
        ctx.strokeRect(tableX, tableStartY, tableW, headH);

        const headers = isBangla
          ? [
              'তারিখ (Date)',
              'আয় (Income ৳)',
              'খরচ (Cost ৳)',
              'খরচের বিবরণ (Cost Details)',
              'অন্যান্য (Other ৳)',
              'নিট ব্যালেন্স (৳)',
            ]
          : [
              'DATE',
              'INCOME (৳)',
              'COST (EXPENSE ৳)',
              'COST DETAILS',
              'OTHER (COST ৳)',
              'NET BALANCE (৳)',
            ];

        headers.forEach((hText, idx) => {
          if (idx > 0) {
            ctx.beginPath();
            ctx.moveTo(colX[idx], tableStartY);
            ctx.lineTo(colX[idx], tableStartY + headH);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }

          const isExpenseCol = idx === 2 || idx === 4;
          const align: CanvasTextAlign =
            idx === 0 ? 'center' : idx === 3 ? 'left' : 'right';
          const textX =
            idx === 0
              ? colX[idx] + colWidths[idx] / 2
              : idx === 3
              ? colX[idx] + 2.5
              : colX[idx] + colWidths[idx] - 2.2;

          drawFittedText(
            ctx,
            hText,
            textX,
            tableStartY + headH / 2,
            colWidths[idx] - 4,
            3.1,
            2.1,
            isExpenseCol ? '#b91c1c' : '#0f172a',
            '800',
            align
          );
        });

        let currY = tableStartY + headH;

        if (pageRows.length === 0) {
          const emptyH = 20;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tableX, currY, tableW, emptyH);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.3;
          ctx.strokeRect(tableX, currY, tableW, emptyH);
          drawFittedText(
            ctx,
            isBangla
              ? 'এই সময়ের জন্য কোনো লেনদেনের রেকর্ড পাওয়া যায়নি'
              : 'No transactions recorded for this selected period',
            tableX + tableW / 2,
            currY + emptyH / 2,
            tableW - 10,
            3.4,
            2.4,
            '#64748b',
            '700',
            'center'
          );
          currY += emptyH;
        } else {
          pageRows.forEach((pRow, rIdx) => {
            const { record: r, detailLines, rowHeight: rowH } = pRow;
            const inc = Number(r.income) || 0;
            const cst = Number(r.cost) || 0;
            const oth = Number(r.other) || 0;
            const net = inc - cst - oth;

            ctx.fillStyle = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(tableX, currY, tableW, rowH);

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.3;
            ctx.strokeRect(tableX, currY, tableW, rowH);

            for (let c = 1; c < 6; c++) {
              ctx.beginPath();
              ctx.moveTo(colX[c], currY);
              ctx.lineTo(colX[c], currY + rowH);
              ctx.stroke();
            }

            // Vertical center for single-line cells, or top-aligned when row has multiple lines
            const cellMidY = currY + rowH / 2;

            // Col 0: Date (Bigger bold font)
            drawFittedText(
              ctx,
              formatDisplayDate(r.record_date),
              colX[0] + colWidths[0] / 2,
              cellMidY,
              colWidths[0] - 2.5,
              3.1,
              2.2,
              '#0f172a',
              '700',
              'center',
              true
            );

            // Col 1: Income (Green with ৳)
            drawFittedText(
              ctx,
              formatCurrency(inc, '৳'),
              colX[1] + colWidths[1] - 2.2,
              cellMidY,
              colWidths[1] - 4,
              3.3,
              2.2,
              '#047857',
              '700',
              'right',
              true
            );

            // Col 2: Cost (Red with ৳)
            drawFittedText(
              ctx,
              formatCurrency(cst, '৳'),
              colX[2] + colWidths[2] - 2.2,
              cellMidY,
              colWidths[2] - 4,
              3.3,
              2.2,
              '#dc2626',
              '800',
              'right',
              true
            );

            // Col 3: Cost Details (All entered lines rendered clearly with comfortable line spacing)
            const totalTextBlockH = (detailLines.length - 1) * lineSpacingMm;
            const firstLineY = cellMidY - totalTextBlockH / 2;

            detailLines.forEach((lineStr, lIdx) => {
              drawFittedText(
                ctx,
                lineStr,
                colX[3] + 2.5,
                firstLineY + lIdx * lineSpacingMm,
                colWidths[3] - 5,
                detailFontMm,
                2.3,
                '#1e293b',
                '600',
                'left'
              );
            });

            // Col 4: Other Expense (Red with ৳)
            drawFittedText(
              ctx,
              formatCurrency(oth, '৳'),
              colX[4] + colWidths[4] - 2.2,
              cellMidY,
              colWidths[4] - 4,
              3.3,
              2.2,
              '#dc2626',
              '800',
              'right',
              true
            );

            // Col 5: Net Balance (with ৳)
            drawFittedText(
              ctx,
              formatCurrency(net, '৳'),
              colX[5] + colWidths[5] - 2.2,
              cellMidY,
              colWidths[5] - 4,
              3.3,
              2.2,
              net >= 0 ? '#0f172a' : '#dc2626',
              '800',
              'right',
              true
            );

            currY += rowH;
          });
        }

        // Totals Row on Last Page (Total costing amount hidden from Cost Details bar as requested)
        if (pageIdx === totalPages - 1) {
          const footH = 10.5;
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(tableX, currY, tableW, footH);
          ctx.fillStyle = '#fef2f2';
          ctx.fillRect(colX[2], currY, colWidths[2], footH);
          ctx.fillRect(colX[4], currY, colWidths[4], footH);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(tableX, currY, tableW, footH);

          for (let c = 1; c < 6; c++) {
            ctx.beginPath();
            ctx.moveTo(colX[c], currY);
            ctx.lineTo(colX[c], currY + footH);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.35;
            ctx.stroke();
          }

          drawFittedText(
            ctx,
            isBangla ? 'সর্বমোট (TOTALS)' : 'TOTALS',
            colX[0] + colWidths[0] / 2,
            currY + footH / 2,
            colWidths[0] - 2,
            3.1,
            2.2,
            '#0f172a',
            '800',
            'center'
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.income, '৳'),
            colX[1] + colWidths[1] - 2.2,
            currY + footH / 2,
            colWidths[1] - 4,
            3.4,
            2.2,
            '#065f46',
            '800',
            'right',
            true
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.cost, '৳'),
            colX[2] + colWidths[2] - 2.2,
            currY + footH / 2,
            colWidths[2] - 4,
            3.4,
            2.2,
            '#dc2626',
            '800',
            'right',
            true
          );

          // Cost Details footer cell: total costing hidden/removed as requested
          drawFittedText(
            ctx,
            '—',
            colX[3] + colWidths[3] / 2,
            currY + footH / 2,
            colWidths[3] - 4,
            3.0,
            2.2,
            '#94a3b8',
            '600',
            'center'
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.other, '৳'),
            colX[4] + colWidths[4] - 2.2,
            currY + footH / 2,
            colWidths[4] - 4,
            3.4,
            2.2,
            '#dc2626',
            '800',
            'right',
            true
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.balance, '৳'),
            colX[5] + colWidths[5] - 2.2,
            currY + footH / 2,
            colWidths[5] - 4,
            3.4,
            2.2,
            totals.balance >= 0 ? '#047857' : '#dc2626',
            '800',
            'right',
            true
          );
        }

        // 5. Page Footer
        ctx.beginPath();
        ctx.moveTo(10, pageHeight - 11.5);
        ctx.lineTo(pageWidth - 10, pageHeight - 11.5);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.3;
        ctx.stroke();

        drawFittedText(
          ctx,
          `FLEET-LEDGER Enterprise · ${isBangla ? 'অফিসিয়াল হিসাব বিবরণী' : 'Official Settlement Document'} — Page ${pageIdx + 1} of ${totalPages}`,
          10,
          pageHeight - 6.5,
          100,
          2.8,
          2.1,
          '#475569',
          '600',
          'left'
        );

        drawFittedText(
          ctx,
          `Log in Number: ${profile.vehicle_number}${profile.vehicle_register_number ? ` (Reg: ${profile.vehicle_register_number})` : ''} | Driver: ${profile.name}`,
          pageWidth - 10,
          pageHeight - 6.5,
          88,
          2.8,
          2.1,
          '#475569',
          '700',
          'right'
        );

        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      });

      const cleanVehicle = (profile.vehicle_number || 'vehicle').replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      const filename = `FLEET-LEDGER_${cleanVehicle}_${from}_to_${to}.pdf`;
      doc.save(filename);
      return true;
    }

    // Fallback if Canvas 2D is unavailable
    autoTable(doc, {
      head: [['Date', 'Income (Tk)', 'Cost (Tk)', 'Cost Details', 'Other (Tk)', 'Balance (Tk)']],
      body: records.map(r => [
        formatDisplayDate(r.record_date),
        formatCurrency(r.income, 'Tk'),
        formatCurrency(r.cost, 'Tk'),
        r.cost_details || '—',
        formatCurrency(r.other, 'Tk'),
        formatCurrency((Number(r.income) || 0) - (Number(r.cost) || 0) - (Number(r.other) || 0), 'Tk'),
      ]),
    });
    doc.save(`FLEET-LEDGER_${from}_to_${to}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    try {
      window.print();
    } catch {}
    return false;
  }
}
