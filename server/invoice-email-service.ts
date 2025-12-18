import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import type { Invoice, Customer } from "@shared/schema";

interface SendInvoiceEmailParams {
  invoice: Invoice;
  customer: Customer;
  recipientEmail: string;
  ccEmails?: string[];
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function sendInvoiceEmail({
  invoice,
  customer,
  recipientEmail,
  ccEmails = [],
}: SendInvoiceEmailParams): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  
  if (!apiKey) {
    throw new Error("MAILERSEND_API_KEY no está configurado");
  }

  const mailerSend = new MailerSend({ apiKey });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f7fafc; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { color: #718096; }
        .value { font-weight: bold; }
        .total-section { background: #e2e8f0; padding: 15px; margin-top: 20px; border-radius: 8px; }
        .total-amount { font-size: 24px; color: #2d3748; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GRUPO JOPER</h1>
          <p>Sistema Comercial</p>
        </div>
        
        <div class="content">
          <h2>Factura ${invoice.serie}-${invoice.folio}</h2>
          
          <p>Estimado/a <strong>${customer.name}</strong>,</p>
          
          <p>Le hacemos llegar su factura correspondiente. A continuación los detalles:</p>
          
          <div class="info-row">
            <span class="label">Número de Factura:</span>
            <span class="value">${invoice.serie}-${invoice.folio}</span>
          </div>
          
          ${invoice.cfdiUuid ? `
          <div class="info-row">
            <span class="label">UUID CFDI:</span>
            <span class="value">${invoice.cfdiUuid}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Fecha de Emisión:</span>
            <span class="value">${formatDate(invoice.issuedAt)}</span>
          </div>
          
          ${invoice.dueDate ? `
          <div class="info-row">
            <span class="label">Fecha de Vencimiento:</span>
            <span class="value">${formatDate(invoice.dueDate)}</span>
          </div>
          ` : ''}
          
          <div class="total-section">
            <div class="info-row">
              <span class="label">Subtotal:</span>
              <span class="value">${formatCurrency(invoice.subtotal)}</span>
            </div>
            <div class="info-row">
              <span class="label">IVA (16%):</span>
              <span class="value">${formatCurrency(invoice.tax)}</span>
            </div>
            <hr style="border: none; border-top: 1px solid #cbd5e0; margin: 10px 0;">
            <div class="info-row">
              <span class="label">Total a Pagar:</span>
              <span class="total-amount">${formatCurrency(invoice.total)}</span>
            </div>
          </div>
          
          <p style="margin-top: 20px;">
            Si tiene alguna pregunta sobre esta factura, no dude en contactarnos.
          </p>
        </div>
        
        <div class="footer">
          <p>Este correo fue generado automáticamente por el Sistema Comercial de GRUPO JOPER.</p>
          <p>Por favor no responda directamente a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const sentFrom = new Sender("noreply@nexxo.com.mx", "GRUPO JOPER");

  const recipients = [new Recipient(recipientEmail, customer.name)];
  
  const cc = ccEmails
    .filter(email => email && email !== recipientEmail)
    .map(email => new Recipient(email));

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(`Factura ${invoice.serie}-${invoice.folio} - GRUPO JOPER`)
    .setHtml(htmlContent);

  if (cc.length > 0) {
    emailParams.setCc(cc);
  }

  await mailerSend.email.send(emailParams);
}
