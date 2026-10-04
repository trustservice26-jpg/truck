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
    size = Math.max(minSizeMm, size - 0.2);
    ctx.font = `${weight} ${size}px ${family}`;
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // If still slightly wider than maxWidth at minSizeMm, truncate cleanly
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
 * Splits a string into up to `maxLines` lines that fit within `maxWidth` mm.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSizeMm: number,
  maxLines = 2
): string[] {
  ctx.font = `500 ${fontSizeMm}px ${FONT_STACK}`;
  const clean = (text || '—').trim();
  if (ctx.measureText(clean).width <= maxWidth) {
    return [clean];
  }

  const words = clean.split(/\s+/);
  const lines: string[] = [];
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
        // Single very long word
        let part = word;
        while (part.length > 1 && ctx.measureText(part).width > maxWidth) {
          part = part.slice(0, -1);
        }
        lines.push(part);
        current = word.slice(part.length);
      }
      if (lines.length >= maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) {
    while (current.length > 1 && ctx.measureText(current).width > maxWidth) {
      current = current.slice(0, -1);
    }
    lines.push(current);
  }

  return lines.length > 0 ? lines : ['—'];
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
    const scale = 8; // 8 px per mm (~203 DPI high-definition rendering)

    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');

    if (testCtx) {
      const currentDate = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const statementDocId = `FL-${profile.vehicle_number || 'VEH'}-${from.replace(/-/g, '')}-${to.replace(/-/g, '')}`;

      // Pagination configuration
      const rowsPerPageFirst = 17;
      const rowsPerPageNext = 24;

      const totalRecords = records.length;
      const pages: DailyRecord[][] = [];

      if (totalRecords === 0) {
        pages.push([]);
      } else if (totalRecords <= rowsPerPageFirst) {
        pages.push(records);
      } else {
        pages.push(records.slice(0, rowsPerPageFirst));
        let offset = rowsPerPageFirst;
        while (offset < totalRecords) {
          pages.push(records.slice(offset, offset + rowsPerPageNext));
          offset += rowsPerPageNext;
        }
      }

      const totalPages = pages.length;

      pages.forEach((pageRecords, pageIdx) => {
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
        ctx.fillRect(0, 0, pageWidth, 27);

        drawFittedText(ctx, 'FLEET-LEDGER', 12, 8.5, 45, 5.2, 4.0, '#ffffff', '800', 'left');

        // Audit Badge
        drawRoundedRect(ctx, 56, 5.5, 36, 5.5, 1.2, '#1e293b', '#334155', 0.25);
        drawFittedText(
          ctx,
          isBangla ? 'অডিট বিবরণী (AUDIT)' : 'AUDIT STATEMENT',
          74,
          8.3,
          33,
          2.6,
          2.0,
          '#93c5fd',
          '700',
          'center'
        );

        // Main Title & Subtitle
        drawFittedText(
          ctx,
          isBangla
            ? 'গাড়ির আয় ও পরিচালন ব্যয়ের খতিয়ান (টাকা ৳)'
            : 'VEHICLE INCOME & OPERATING COST LEDGER (৳)',
          12,
          16,
          115,
          4.0,
          3.0,
          '#ffffff',
          '800',
          'left'
        );

        drawFittedText(
          ctx,
          isBangla
            ? 'অফিসিয়াল ফ্লিট অডিট ও চালকের হিসাব নিষ্পত্তি বিবরণী'
            : 'Official Fleet Audit & Driver Settlement Statement (Currency: Taka ৳)',
          12,
          21.8,
          115,
          2.8,
          2.2,
          '#cbd5e1',
          '500',
          'left'
        );

        // Right Header Metadata
        drawFittedText(
          ctx,
          `${isBangla ? 'ডক রেফারেন্স' : 'Doc Ref'}: ${statementDocId}`,
          pageWidth - 12,
          8,
          68,
          2.6,
          2.0,
          '#e2e8f0',
          '500',
          'right',
          true
        );
        drawFittedText(
          ctx,
          `${isBangla ? 'তৈরির সময়' : 'Generated'}: ${currentDate}`,
          pageWidth - 12,
          14.5,
          68,
          2.6,
          2.0,
          '#e2e8f0',
          '500',
          'right'
        );
        drawFittedText(
          ctx,
          `${isBangla ? 'সময়কাল' : 'Period'}: ${formatDisplayDate(from)} - ${formatDisplayDate(to)}`,
          pageWidth - 12,
          21.5,
          68,
          2.8,
          2.1,
          '#ffffff',
          '700',
          'right'
        );

        let tableStartY = 33;

        if (pageIdx === 0) {
          // 2. Vehicle & Driver Credentials Box (4 Equal Columns)
          const credY = 31;
          const credH = 16;
          drawRoundedRect(ctx, 12, credY, pageWidth - 24, credH, 1.8, '#f8fafc', '#cbd5e1', 0.35);

          const colW = (pageWidth - 24) / 4;

          // Column dividers
          for (let c = 1; c < 4; c++) {
            ctx.beginPath();
            ctx.moveTo(12 + colW * c, credY + 2.5);
            ctx.lineTo(12 + colW * c, credY + credH - 2.5);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 0.25;
            ctx.stroke();
          }

          // Col 1: Log in Number & Vehicle Reg
          drawFittedText(
            ctx,
            isBangla ? 'লগইন নম্বর (LOG IN NUMBER):' : 'LOG IN NUMBER:',
            15,
            credY + 4.2,
            colW - 6,
            2.4,
            1.9,
            '#64748b',
            '700'
          );
          drawFittedText(
            ctx,
            profile.vehicle_number || 'N/A',
            15,
            credY + 9.2,
            colW - 6,
            3.5,
            2.4,
            '#0f172a',
            '800',
            'left',
            true
          );
          if (profile.vehicle_register_number) {
            drawFittedText(
              ctx,
              `${isBangla ? 'গাড়ির রেজিঃ' : 'Reg:'} ${profile.vehicle_register_number}`,
              15,
              credY + 13.4,
              colW - 6,
              2.3,
              1.8,
              '#475569',
              '600',
              'left',
              true
            );
          }

          // Col 2: Driver Name
          drawFittedText(
            ctx,
            isBangla ? 'চালকের নাম (DRIVER NAME):' : 'DRIVER NAME:',
            15 + colW,
            credY + 4.2,
            colW - 6,
            2.4,
            1.9,
            '#64748b',
            '700'
          );
          drawFittedText(
            ctx,
            profile.name || 'N/A',
            15 + colW,
            credY + 10,
            colW - 6,
            3.4,
            2.3,
            '#0f172a',
            '700'
          );

          // Col 3: Contact Phone
          drawFittedText(
            ctx,
            isBangla ? 'ফোন নম্বর (CONTACT PHONE):' : 'CONTACT PHONE:',
            15 + colW * 2,
            credY + 4.2,
            colW - 6,
            2.4,
            1.9,
            '#64748b',
            '700'
          );
          drawFittedText(
            ctx,
            profile.phone || 'N/A',
            15 + colW * 2,
            credY + 10,
            colW - 6,
            3.2,
            2.2,
            '#0f172a',
            '700',
            'left',
            true
          );

          // Col 4: Account Role / Currency
          drawFittedText(
            ctx,
            isBangla ? 'অ্যাকাউন্ট রোল / মুদ্রা:' : 'ROLE & CURRENCY:',
            15 + colW * 3,
            credY + 4.2,
            colW - 6,
            2.4,
            1.9,
            '#64748b',
            '700'
          );
          drawFittedText(
            ctx,
            `${(profile.role || 'USER').toUpperCase()} · ৳ TAKA`,
            15 + colW * 3,
            credY + 10,
            colW - 6,
            3.1,
            2.2,
            '#0f172a',
            '800'
          );

          // 3. Financial Summary Calculation Boxes (4 Cards with Auto-Fit Calculations & Taka ৳ Symbol)
          const cardY = 50.5;
          const gap = 3;
          const cardW = (pageWidth - 24 - gap * 3) / 4; // 44.25mm each
          const cardH = 19;
          const innerPad = 3;
          const maxCalcWidth = cardW - innerPad * 2;

          // Card 1: Gross Income
          const c1X = 12;
          drawRoundedRect(ctx, c1X, cardY, cardW, cardH, 1.8, '#f0fdf4', '#86efac', 0.4);
          drawFittedText(
            ctx,
            isBangla ? 'মোট আয় (GROSS INCOME)' : 'GROSS INCOME (৳)',
            c1X + cardW / 2,
            cardY + 4.2,
            maxCalcWidth,
            2.5,
            1.9,
            '#065f46',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.income, '৳'),
            c1X + cardW / 2,
            cardY + 10.5,
            maxCalcWidth,
            4.2,
            2.4,
            '#064e3b',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isBangla ? `${totals.entryCount} দিনের মোট জমা` : `${totals.entryCount} Days Total Revenue`,
            c1X + cardW / 2,
            cardY + 15.8,
            maxCalcWidth,
            2.3,
            1.8,
            '#059669',
            '600',
            'center'
          );

          // Card 2: Fuel & Direct Costs (Red Color for Expense)
          const c2X = 12 + (cardW + gap);
          drawRoundedRect(ctx, c2X, cardY, cardW, cardH, 1.8, '#fef2f2', '#fca5a5', 0.4);
          drawFittedText(
            ctx,
            isBangla ? 'জ্বালানি ও খরচ (COST)' : 'FUEL & COSTS (EXPENSE)',
            c2X + cardW / 2,
            cardY + 4.2,
            maxCalcWidth,
            2.5,
            1.9,
            '#991b1b',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.cost, '৳'),
            c2X + cardW / 2,
            cardY + 10.5,
            maxCalcWidth,
            4.2,
            2.4,
            '#dc2626',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isBangla ? 'জ্বালানি ও ইঞ্জিন ব্যয় (খরচ)' : 'Fuel & Direct Operating Cost',
            c2X + cardW / 2,
            cardY + 15.8,
            maxCalcWidth,
            2.3,
            1.8,
            '#b91c1c',
            '600',
            'center'
          );

          // Card 3: Other Costs (Red Color for Expense)
          const c3X = 12 + (cardW + gap) * 2;
          drawRoundedRect(ctx, c3X, cardY, cardW, cardH, 1.8, '#fef2f2', '#fca5a5', 0.4);
          drawFittedText(
            ctx,
            isBangla ? 'অন্যান্য খরচ (OTHER COST)' : 'OTHER COSTS (EXPENSE)',
            c3X + cardW / 2,
            cardY + 4.2,
            maxCalcWidth,
            2.5,
            1.9,
            '#991b1b',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.other, '৳'),
            c3X + cardW / 2,
            cardY + 10.5,
            maxCalcWidth,
            4.2,
            2.4,
            '#dc2626',
            '800',
            'center',
            true
          );
          drawFittedText(
            ctx,
            isBangla ? 'টোল ও আনুষঙ্গিক ব্যয় (খরচ)' : 'Tolls, Permits & Incidentals',
            c3X + cardW / 2,
            cardY + 15.8,
            maxCalcWidth,
            2.3,
            1.8,
            '#b91c1c',
            '600',
            'center'
          );

          // Card 4: Net Settlement Balance
          const isPositive = totals.balance >= 0;
          const c4X = 12 + (cardW + gap) * 3;
          drawRoundedRect(
            ctx,
            c4X,
            cardY,
            cardW,
            cardH,
            1.8,
            isPositive ? '#f1f5f9' : '#fff1f2',
            '#0f172a',
            0.55
          );
          drawFittedText(
            ctx,
            isBangla ? 'নিট ব্যালেন্স (NET BALANCE)' : 'NET SETTLEMENT (৳)',
            c4X + cardW / 2,
            cardY + 4.2,
            maxCalcWidth,
            2.5,
            1.9,
            '#0f172a',
            '800',
            'center'
          );
          drawFittedText(
            ctx,
            formatCurrency(totals.balance, '৳'),
            c4X + cardW / 2,
            cardY + 10.5,
            maxCalcWidth,
            4.2,
            2.4,
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
            cardY + 15.8,
            maxCalcWidth,
            2.3,
            1.8,
            isPositive ? '#334155' : '#be123c',
            '700',
            'center'
          );

          tableStartY = 73;
        }

        // 4. Itemized Ledger Table (186mm total width: 12mm to 198mm)
        const tableX = 12;
        const tableW = pageWidth - 24; // 186mm
        // Column widths summing to 186mm:
        // Col 0 (Date): 25mm
        // Col 1 (Income ৳): 31mm
        // Col 2 (Cost ৳): 31mm
        // Col 3 (Details): 40mm
        // Col 4 (Other ৳): 28mm
        // Col 5 (Net Balance ৳): 31mm
        const colWidths = [25, 31, 31, 40, 28, 31];
        const colX = [
          tableX,
          tableX + 25,
          tableX + 25 + 31,
          tableX + 25 + 31 + 31,
          tableX + 25 + 31 + 31 + 40,
          tableX + 25 + 31 + 31 + 40 + 28,
        ];

        const headH = 8.5;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(tableX, tableStartY, tableW, headH);
        // Subtle red tint on Cost & Other header cells
        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(colX[2], tableStartY, colWidths[2], headH);
        ctx.fillRect(colX[4], tableStartY, colWidths[4], headH);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.35;
        ctx.strokeRect(tableX, tableStartY, tableW, headH);

        const headers = isBangla
          ? [
              'তারিখ (Date)',
              'আয় (Income ৳)',
              'খরচ (Cost ৳)',
              'খরচের বিবরণ',
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
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.25;
            ctx.stroke();
          }

          const isExpenseCol = idx === 2 || idx === 4;
          const align: CanvasTextAlign =
            idx === 0 ? 'center' : idx === 3 ? 'left' : 'right';
          const textX =
            idx === 0
              ? colX[idx] + colWidths[idx] / 2
              : idx === 3
              ? colX[idx] + 2
              : colX[idx] + colWidths[idx] - 2;

          drawFittedText(
            ctx,
            hText,
            textX,
            tableStartY + headH / 2,
            colWidths[idx] - 4,
            2.6,
            1.9,
            isExpenseCol ? '#b91c1c' : '#0f172a',
            '800',
            align
          );
        });

        let currY = tableStartY + headH;
        const rowH = 9.2;

        if (pageRecords.length === 0) {
          const emptyH = 18;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tableX, currY, tableW, emptyH);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.25;
          ctx.strokeRect(tableX, currY, tableW, emptyH);
          drawFittedText(
            ctx,
            isBangla
              ? 'এই সময়ের জন্য কোনো লেনদেনের রেকর্ড পাওয়া যায়নি'
              : 'No transactions recorded for this selected period',
            tableX + tableW / 2,
            currY + emptyH / 2,
            tableW - 10,
            3.0,
            2.2,
            '#64748b',
            '600',
            'center'
          );
          currY += emptyH;
        } else {
          pageRecords.forEach((r, rIdx) => {
            const inc = Number(r.income) || 0;
            const cst = Number(r.cost) || 0;
            const oth = Number(r.other) || 0;
            const net = inc - cst - oth;

            ctx.fillStyle = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(tableX, currY, tableW, rowH);

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.25;
            ctx.strokeRect(tableX, currY, tableW, rowH);

            for (let c = 1; c < 6; c++) {
              ctx.beginPath();
              ctx.moveTo(colX[c], currY);
              ctx.lineTo(colX[c], currY + rowH);
              ctx.stroke();
            }

            // Col 0: Date
            drawFittedText(
              ctx,
              formatDisplayDate(r.record_date),
              colX[0] + colWidths[0] / 2,
              currY + rowH / 2,
              colWidths[0] - 3,
              2.6,
              2.0,
              '#0f172a',
              '700',
              'center',
              true
            );

            // Col 1: Income (Green with ৳)
            drawFittedText(
              ctx,
              formatCurrency(inc, '৳'),
              colX[1] + colWidths[1] - 2,
              currY + rowH / 2,
              colWidths[1] - 4,
              2.8,
              2.0,
              '#047857',
              '700',
              'right',
              true
            );

            // Col 2: Cost (Red with ৳)
            drawFittedText(
              ctx,
              formatCurrency(cst, '৳'),
              colX[2] + colWidths[2] - 2,
              currY + rowH / 2,
              colWidths[2] - 4,
              2.8,
              2.0,
              '#dc2626',
              '800',
              'right',
              true
            );

            // Col 3: Cost Details (wrapped up to 2 lines if needed)
            const detailText = [r.cost_location, r.cost_details, r.other_details]
              .filter(Boolean)
              .join(' · ') || '—';
            const wrapped = wrapTextLines(ctx, detailText, colWidths[3] - 4, 2.5, 2);
            if (wrapped.length === 1) {
              drawFittedText(
                ctx,
                wrapped[0],
                colX[3] + 2,
                currY + rowH / 2,
                colWidths[3] - 4,
                2.5,
                1.9,
                '#334155',
                '500',
                'left'
              );
            } else {
              drawFittedText(
                ctx,
                wrapped[0],
                colX[3] + 2,
                currY + rowH / 2 - 1.7,
                colWidths[3] - 4,
                2.3,
                1.8,
                '#334155',
                '500',
                'left'
              );
              drawFittedText(
                ctx,
                wrapped[1],
                colX[3] + 2,
                currY + rowH / 2 + 1.8,
                colWidths[3] - 4,
                2.3,
                1.8,
                '#475569',
                '500',
                'left'
              );
            }

            // Col 4: Other Expense (Red with ৳)
            drawFittedText(
              ctx,
              formatCurrency(oth, '৳'),
              colX[4] + colWidths[4] - 2,
              currY + rowH / 2,
              colWidths[4] - 4,
              2.8,
              2.0,
              '#dc2626',
              '800',
              'right',
              true
            );

            // Col 5: Net Balance (with ৳)
            drawFittedText(
              ctx,
              formatCurrency(net, '৳'),
              colX[5] + colWidths[5] - 2,
              currY + rowH / 2,
              colWidths[5] - 4,
              2.8,
              2.0,
              net >= 0 ? '#0f172a' : '#dc2626',
              '800',
              'right',
              true
            );

            currY += rowH;
          });
        }

        // Totals Row on Last Page
        if (pageIdx === totalPages - 1) {
          const footH = 9.5;
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(tableX, currY, tableW, footH);
          // Highlight expense total cells in soft red
          ctx.fillStyle = '#fef2f2';
          ctx.fillRect(colX[2], currY, colWidths[2], footH);
          ctx.fillRect(colX[4], currY, colWidths[4], footH);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 0.45;
          ctx.strokeRect(tableX, currY, tableW, footH);

          for (let c = 1; c < 6; c++) {
            ctx.beginPath();
            ctx.moveTo(colX[c], currY);
            ctx.lineTo(colX[c], currY + footH);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }

          drawFittedText(
            ctx,
            isBangla ? 'সর্বমোট (TOTALS)' : 'TOTALS',
            colX[0] + colWidths[0] / 2,
            currY + footH / 2,
            colWidths[0] - 2,
            2.7,
            2.0,
            '#0f172a',
            '800',
            'center'
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.income, '৳'),
            colX[1] + colWidths[1] - 2,
            currY + footH / 2,
            colWidths[1] - 4,
            2.9,
            2.0,
            '#065f46',
            '800',
            'right',
            true
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.cost, '৳'),
            colX[2] + colWidths[2] - 2,
            currY + footH / 2,
            colWidths[2] - 4,
            2.9,
            2.0,
            '#dc2626',
            '800',
            'right',
            true
          );

          drawFittedText(
            ctx,
            isBangla ? `মোট খরচ: ${formatCurrency(totals.cost + totals.other, '৳')}` : `Total Cost: ${formatCurrency(totals.cost + totals.other, '৳')}`,
            colX[3] + colWidths[3] / 2,
            currY + footH / 2,
            colWidths[3] - 4,
            2.4,
            1.8,
            '#dc2626',
            '700',
            'center',
            true
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.other, '৳'),
            colX[4] + colWidths[4] - 2,
            currY + footH / 2,
            colWidths[4] - 4,
            2.9,
            2.0,
            '#dc2626',
            '800',
            'right',
            true
          );

          drawFittedText(
            ctx,
            formatCurrency(totals.balance, '৳'),
            colX[5] + colWidths[5] - 2,
            currY + footH / 2,
            colWidths[5] - 4,
            2.9,
            2.0,
            totals.balance >= 0 ? '#047857' : '#dc2626',
            '800',
            'right',
            true
          );
        }

        // 5. Page Footer
        ctx.beginPath();
        ctx.moveTo(12, pageHeight - 11);
        ctx.lineTo(pageWidth - 12, pageHeight - 11);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.25;
        ctx.stroke();

        drawFittedText(
          ctx,
          `FLEET-LEDGER Enterprise · ${isBangla ? 'অফিসিয়াল হিসাব বিবরণী' : 'Official Settlement Document'} — Page ${pageIdx + 1} of ${totalPages}`,
          12,
          pageHeight - 6.5,
          100,
          2.4,
          1.9,
          '#64748b',
          '500',
          'left'
        );

        drawFittedText(
          ctx,
          `Log in Number: ${profile.vehicle_number}${profile.vehicle_register_number ? ` (Reg: ${profile.vehicle_register_number})` : ''} | Driver: ${profile.name}`,
          pageWidth - 12,
          pageHeight - 6.5,
          85,
          2.4,
          1.9,
          '#64748b',
          '600',
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
      head: [['Date', 'Income (Tk)', 'Cost (Tk)', 'Details', 'Other (Tk)', 'Balance (Tk)']],
      body: records.map(r => [
        formatDisplayDate(r.record_date),
        formatCurrency(r.income, 'Tk'),
        formatCurrency(r.cost, 'Tk'),
        r.cost_details || '-',
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
