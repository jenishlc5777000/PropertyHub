import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { APP_NAME } from '@propertyhub/shared';

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

/** Sends an email, or logs it to the console when SMTP is not configured. Never throws. */
export async function sendMail({ to, subject, html, text, attachments }) {
  if (env.isTest) return { skipped: true };
  if (!transporter) {
    logger.info(`[email:console] to=${to} subject="${subject}"\n${text || html.replace(/<[^>]+>/g, ' ')}`);
    return { skipped: true };
  }
  try {
    return await transporter.sendMail({ from: env.smtp.from, to, subject, html, text, attachments });
  } catch (e) {
    logger.error('Email send failed', e.message);
    return { error: e.message };
  }
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const layout = (body) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#0f2a4a;color:#fff;padding:16px 24px;font-size:20px;font-weight:bold">${APP_NAME}</div>
  <div style="padding:24px;color:#111827;font-size:15px;line-height:1.6">${body}</div>
  <div style="padding:12px 24px;background:#f9fafb;color:#6b7280;font-size:12px">You received this email from ${APP_NAME}. Please do not reply.</div>
</div>`;

export const templates = {
  otp: (name, otp) => ({
    subject: `${APP_NAME} password reset code: ${otp}`,
    html: layout(`<p>Hi ${esc(name)},</p><p>Your password reset code is:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#059669">${otp}</p>
      <p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`),
    text: `Your ${APP_NAME} password reset code is ${otp}. It expires in 10 minutes.`,
  }),
  welcome: (name, credits) => ({
    subject: `Welcome to ${APP_NAME}!`,
    html: layout(`<p>Hi ${esc(name)},</p><p>Welcome aboard! You have <b>${credits} free contact credits</b> to reach property owners directly.</p>
      <p><a href="${env.webUrl}/properties" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Start exploring</a></p>`),
  }),
  invoice: (name, order) => ({
    subject: `${APP_NAME} invoice ${order.invoiceNo} - ${order.credits} credits added`,
    html: layout(`<p>Hi ${esc(name)},</p><p>Thank you for your purchase. <b>${order.credits} contact credits</b> have been added to your wallet.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td>Invoice</td><td align="right">${order.invoiceNo}</td></tr>
        <tr><td>Plan</td><td align="right">${esc(order.planName)}</td></tr>
        <tr><td>Amount (excl. GST)</td><td align="right">Rs ${order.baseAmount.toFixed(2)}</td></tr>
        <tr><td>GST @ 18%</td><td align="right">Rs ${order.gstAmount.toFixed(2)}</td></tr>
        <tr><td><b>Total paid</b></td><td align="right"><b>Rs ${order.amount.toFixed(2)}</b></td></tr>
      </table><p>Your invoice PDF is attached.</p>`),
  }),
  generic: (title, body, link) => ({
    subject: title,
    html: layout(`<p>${esc(body)}</p>${link ? `<p><a href="${link}">Open ${APP_NAME}</a></p>` : ''}`),
  }),
};
