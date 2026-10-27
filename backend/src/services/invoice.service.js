import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { APP_NAME, GST_RATE } from '@propertyhub/shared';

const rs = (n) => `Rs ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Builds a GST invoice PDF (prices are GST-inclusive) and resolves to a Buffer. */
export function generateInvoicePdf(order, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const navy = '#0f2a4a';
    const green = '#059669';

    doc.rect(0, 0, doc.page.width, 90).fill(navy);
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(APP_NAME, 50, 32);
    doc.fontSize(12).font('Helvetica').text('TAX INVOICE', 400, 38, { align: 'right', width: 145 });

    doc.fillColor('#111827').fontSize(10);
    let y = 115;
    doc.font('Helvetica-Bold').text(env.company.name, 50, y);
    doc.font('Helvetica').text(env.company.address, 50, y + 14);
    if (env.company.gstin) doc.text(`GSTIN: ${env.company.gstin}`, 50, y + 28);

    doc.font('Helvetica-Bold').text('Invoice No:', 350, y);
    doc.font('Helvetica').text(order.invoiceNo || '-', 430, y);
    doc.font('Helvetica-Bold').text('Date:', 350, y + 14);
    doc.font('Helvetica').text(new Date(order.paidAt || order.createdAt).toLocaleDateString('en-IN'), 430, y + 14);
    doc.font('Helvetica-Bold').text('Payment ID:', 350, y + 28);
    doc.font('Helvetica').text(order.paymentId || '-', 430, y + 28, { width: 120 });

    y = 185;
    doc.font('Helvetica-Bold').text('Billed to', 50, y);
    doc.font('Helvetica').text(user.name, 50, y + 14).text(user.email, 50, y + 28).text(user.phone || '', 50, y + 42);

    y = 260;
    doc.rect(50, y, 495, 24).fill('#f3f4f6');
    doc.fillColor('#111827').font('Helvetica-Bold');
    doc.text('Description', 60, y + 7).text('SAC', 300, y + 7).text('Qty', 360, y + 7).text('Amount', 440, y + 7, { width: 95, align: 'right' });

    y += 34;
    doc.font('Helvetica');
    doc.text(`${order.planName} - ${order.credits} contact credits (valid ${order.validityDays} days)`, 60, y, { width: 230 });
    doc.text('998439', 300, y).text('1', 360, y);
    doc.text(rs(order.baseAmount), 440, y, { width: 95, align: 'right' });

    y += 40;
    doc.moveTo(300, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    const line = (label, value, bold) => {
      y += 10;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, 300, y).text(value, 440, y, { width: 95, align: 'right' });
      y += 10;
    };
    if (order.discount) line('Discount applied', `- ${rs(order.discount)}`);
    line('Taxable value', rs(order.baseAmount));
    line(`GST @ ${GST_RATE * 100}%`, rs(order.gstAmount));
    y += 4;
    doc.fillColor(green);
    line('Total (incl. GST)', rs(order.amount), true);
    doc.fillColor('#111827');

    doc.fontSize(9).fillColor('#6b7280');
    doc.text(
      'Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature. ' +
        'Credits are non-transferable. See our Refund Policy for refund eligibility.',
      50,
      720,
      { width: 495, align: 'center' }
    );
    doc.end();
  });
}
