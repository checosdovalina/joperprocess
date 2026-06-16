import { MailerSend, EmailParams, Sender, Recipient, Attachment } from "mailersend";
import { ObjectStorageService } from "./objectStorage";
import { localStorageService } from "./localStorage";

interface SendQuotationEmailParams {
  to: string[];
  quotationData: {
    folio: string;
    customerName: string;
    vendedorName: string;
    total: string;
    currency: string;
    validUntil?: string;
    itemsCount: number;
  };
  pdfPath: string;
  approvalUrl?: string;
}

function useLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === "true" || 
         process.env.NODE_ENV !== "production" ||
         (process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR);
}

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
});

export async function sendQuotationEmail({
  to,
  quotationData,
  pdfPath,
  approvalUrl,
}: SendQuotationEmailParams): Promise<void> {
  try {
    if (!to || to.length === 0) {
      throw new Error("No recipients provided for email");
    }

    let pdfBuffer: Buffer;
    
    if (useLocalStorage()) {
      console.log(`📥 Reading quotation PDF from local storage: ${pdfPath}`);
      const buffer = await localStorageService.getFile(pdfPath);
      if (!buffer) {
        throw new Error(`PDF not found in local storage: ${pdfPath}`);
      }
      pdfBuffer = buffer;
    } else {
      console.log(`📥 Downloading quotation PDF from GCS: ${pdfPath}`);
      const objectStorageService = new ObjectStorageService();
      pdfBuffer = await objectStorageService.downloadObjectAsBuffer(pdfPath);
    }

    const subject = `Cotización ${quotationData.folio} - GRUPO JOPER`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .header p {
              margin: 10px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 30px 25px;
            }
            .greeting {
              font-size: 18px;
              color: #2d3748;
              margin-bottom: 20px;
            }
            .info-box {
              background: #f7fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #1a365d;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #4a5568;
            }
            .info-value {
              color: #2d3748;
              font-weight: 500;
            }
            .total-row {
              background: #1a365d;
              color: white;
              padding: 15px;
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
            }
            .total-label {
              font-size: 16px;
              font-weight: 600;
            }
            .total-value {
              font-size: 20px;
              font-weight: 700;
            }
            .cta-box {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #edf2f7;
              border-radius: 8px;
            }
            .cta-text {
              color: #4a5568;
              margin-bottom: 10px;
            }
            .approval-section {
              background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
              padding: 25px;
              border-radius: 8px;
              margin: 30px 0;
              text-align: center;
            }
            .approval-title {
              color: white;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 15px;
            }
            .approval-btn {
              display: inline-block;
              background: white;
              color: #38a169;
              padding: 14px 32px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 700;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .approval-note {
              color: rgba(255,255,255,0.9);
              font-size: 12px;
              margin-top: 12px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f7fafc;
              color: #718096;
              font-size: 12px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GRUPO JOPER</h1>
              <p>Sistema Comercial</p>
            </div>
            <div class="content">
              <p class="greeting">Estimado(a) cliente,</p>
              <p>Es un placer enviarle la cotización solicitada. A continuación encontrará un resumen:</p>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Folio:</span>
                  <span class="info-value">${quotationData.folio}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Cliente:</span>
                  <span class="info-value">${quotationData.customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vendedor:</span>
                  <span class="info-value">${quotationData.vendedorName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Productos:</span>
                  <span class="info-value">${quotationData.itemsCount} artículo(s)</span>
                </div>
                ${quotationData.validUntil ? `
                <div class="info-row">
                  <span class="info-label">Vigencia:</span>
                  <span class="info-value">${quotationData.validUntil}</span>
                </div>
                ` : ''}
                <div class="total-row">
                  <span class="total-label">TOTAL:</span>
                  <span class="total-value">${quotationData.total} ${quotationData.currency}</span>
                </div>
              </div>

              <div class="cta-box">
                <p class="cta-text">La cotización completa en formato PDF se encuentra adjunta a este correo.</p>
              </div>

              ${approvalUrl ? `
              <div class="approval-section">
                <p class="approval-title">¿Desea proceder con esta cotización?</p>
                <a href="${approvalUrl}" class="approval-btn">Revisar y Aprobar Cotización</a>
                <p class="approval-note">Al hacer clic, podrá revisar los detalles y confirmar su decisión.</p>
              </div>
              ` : ''}

              <p>Si tiene alguna pregunta o desea realizar algún cambio, no dude en contactarnos. Estamos a sus órdenes.</p>
              
              <p>Atentamente,<br><strong>${quotationData.vendedorName}</strong><br>GRUPO JOPER</p>
            </div>
            <div class="footer">
              <p>Este correo fue enviado automáticamente desde el Sistema Comercial de GRUPO JOPER.</p>
              <p>Por favor, no responda directamente a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sentFrom = new Sender(
      "noreply@nexxo.com.mx",
      "GRUPO JOPER - Sistema Comercial"
    );

    const recipients = to.map((email) => new Recipient(email));

    const attachments = [
      new Attachment(
        pdfBuffer.toString("base64"),
        `cotizacion-${quotationData.folio}.pdf`,
        "attachment"
      ),
    ];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlContent)
      .setAttachments(attachments);

    console.log(`📧 Sending quotation email to: ${to.join(", ")}`);
    await mailerSend.email.send(emailParams);
    console.log(`✅ Quotation email sent successfully`);
  } catch (error) {
    console.error("Error sending quotation email:", error);
    throw error;
  }
}

// ─── Shipping Rejection Email ────────────────────────────────────────────────

interface SendShippingRejectionEmailParams {
  sellerEmail: string;
  sellerName: string;
  quotationFolio: string;
  customerName: string;
  rejectionReason: string;
  tenantName: string;
}

export async function sendShippingRejectionEmail({
  sellerEmail,
  sellerName,
  quotationFolio,
  customerName,
  rejectionReason,
  tenantName,
}: SendShippingRejectionEmailParams): Promise<void> {
  try {
    const apiKey = process.env.MAILERSEND_API_KEY;
    if (!apiKey) throw new Error("MAILERSEND_API_KEY not configured");

    const ms = new MailerSend({ apiKey });
    const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);
    const recipients = [new Recipient(sellerEmail, sellerName)];

    const subject = `Envío sin costo rechazado — Cotización ${quotationFolio}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .container { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); padding: 28px 32px; }
            .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
            .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
            .body { padding: 28px 32px; }
            .alert-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
            .alert-box p { margin: 0; color: #991b1b; font-size: 14px; }
            .reason-box { background: #f8fafc; border-left: 4px solid #b91c1c; border-radius: 0 6px 6px 0; padding: 14px 18px; margin: 20px 0; }
            .reason-box p { margin: 0; color: #374151; font-size: 14px; }
            .reason-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 6px; }
            .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
            .info-label { color: #6b7280; font-size: 13px; min-width: 120px; }
            .info-value { color: #111827; font-size: 13px; font-weight: 600; }
            .action-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin-top: 24px; }
            .action-box h3 { margin: 0 0 8px; color: #1e40af; font-size: 14px; }
            .action-box ul { margin: 0; padding-left: 20px; color: #374151; font-size: 13px; }
            .action-box li { margin-bottom: 4px; }
            .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center; }
            .footer p { margin: 0; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Envío sin costo rechazado</h1>
              <p>${tenantName} — Sistema Comercial</p>
            </div>
            <div class="body">
              <p>Hola <strong>${sellerName}</strong>,</p>
              <div class="alert-box">
                <p>El administrador ha <strong>rechazado</strong> la solicitud de envío sin costo para la cotización <strong>${quotationFolio}</strong>. La cotización ha sido regresada a estado <strong>Borrador</strong> para que puedas retrabajarla.</p>
              </div>

              <div class="info-row"><span class="info-label">Cotización:</span><span class="info-value">${quotationFolio}</span></div>
              <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${customerName}</span></div>

              <div class="reason-box">
                <p class="reason-label">Motivo del rechazo</p>
                <p>${rejectionReason}</p>
              </div>

              <div class="action-box">
                <h3>Pasos a seguir</h3>
                <ul>
                  <li>Revisa el motivo del rechazo indicado arriba</li>
                  <li>Abre la cotización en el sistema y ajusta el costo de envío</li>
                  <li>Una vez lista, envíala nuevamente para aprobación</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>${tenantName} — Este es un mensaje automático, por favor no respondas a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlContent);

    console.log(`📧 Sending shipping rejection email to: ${sellerEmail}`);
    await ms.email.send(emailParams);
    console.log(`✅ Shipping rejection email sent successfully`);
  } catch (error) {
    console.error("Error sending shipping rejection email:", error);
    throw error;
  }
}

// ─── Shipping Approval Request Email (admin notification) ────────────────────

interface SendShippingApprovalRequestEmailParams {
  adminEmails: { email: string; name: string }[];
  quotationData: {
    folio: string;
    customerName: string;
    vendedorName: string;
    total: string;
    currency: string;
    itemsCount: number;
    shippingMethod?: string;
  };
  quotationUrl: string;
  tenantName: string;
  approveUrl?: string;
  rejectUrl?: string;
}

export async function sendShippingApprovalRequestEmail({
  adminEmails,
  quotationData,
  quotationUrl,
  tenantName,
  approveUrl,
  rejectUrl,
}: SendShippingApprovalRequestEmailParams): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured — skipping shipping approval request email");
    return;
  }

  const validAdmins = adminEmails.filter((a) => a.email && a.email.includes("@"));
  if (validAdmins.length === 0) {
    console.warn("No admin emails for shipping approval notification — skipping");
    return;
  }

  const ms = new MailerSend({ apiKey });
  const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);
  const subject = `Autorización requerida — Envío a cargo de empresa · ${quotationData.folio}`;

  const shippingMethodLabel =
    quotationData.shippingMethod === "parcel" ? "Paquetería" : "Camión";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">

          <div style="background:linear-gradient(135deg,#c05621 0%,#9c4221 100%);padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Solicitud de Autorización de Envío</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${tenantName} — Sistema Comercial</p>
          </div>

          <div style="padding:28px 32px;">
            <p style="font-size:15px;color:#374151;margin:0 0 20px;">
              Se ha creado una cotización con <strong>envío sin costo a cargo de la empresa</strong>
              que requiere tu autorización antes de enviarse al cliente.
            </p>

            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:18px 22px;margin-bottom:24px;">
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Cotización:</span>
                <span style="color:#1c1917;font-size:13px;font-weight:700;">${quotationData.folio}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Cliente:</span>
                <span style="color:#1c1917;font-size:13px;">${quotationData.customerName}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Vendedor:</span>
                <span style="color:#1c1917;font-size:13px;">${quotationData.vendedorName}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Total:</span>
                <span style="color:#1c1917;font-size:13px;font-weight:700;">$${quotationData.total} ${quotationData.currency}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Método de envío:</span>
                <span style="color:#1c1917;font-size:13px;">${shippingMethodLabel}</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Productos:</span>
                <span style="color:#1c1917;font-size:13px;">${quotationData.itemsCount} partida(s)</span>
              </div>
            </div>

            ${approveUrl && rejectUrl ? `
            <div style="text-align:center;margin:24px 0;">
              <a href="${approveUrl}"
                 style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin:0 8px 8px 0;">
                Aprobar envío
              </a>
              <a href="${rejectUrl}"
                 style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin:0 0 8px 0;">
                Rechazar
              </a>
            </div>
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
              Puedes aprobar o rechazar directamente desde este correo, o ingresar al sistema para más detalles.
              <a href="${quotationUrl}" style="color:#c05621;text-decoration:none;">Ver en el sistema</a>
            </p>
            ` : `
            <div style="text-align:center;margin:24px 0;">
              <a href="${quotationUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#c05621 0%,#9c4221 100%);color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                Ver cotización y autorizar
              </a>
            </div>
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
              Ingresa al sistema para aprobar o rechazar el envío sin costo.
            </p>
            `}
          </div>

          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} — Mensaje automático, no respondas a este correo.</p>
          </div>

        </div>
      </body>
    </html>
  `;

  for (const admin of validAdmins) {
    try {
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo([new Recipient(admin.email, admin.name)])
        .setSubject(subject)
        .setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`✅ Shipping approval request email sent to admin: ${admin.email}`);
    } catch (err: any) {
      console.warn(`Failed to send shipping approval email to ${admin.email}:`, err.message || err);
    }
  }
}

// ─── Credit Authorization Status Email ───────────────────────────────────────

interface CreditAuthEmailRecipient {
  email: string;
  name: string;
}

interface SendCreditAuthStatusEmailParams {
  status: "approved" | "rejected";
  quotationFolio: string;
  customerName: string;
  quotationTotal: string;
  rejectionNotes?: string;
  tenantName: string;
  recipients: CreditAuthEmailRecipient[];
}

export async function sendCreditAuthStatusEmail({
  status,
  quotationFolio,
  customerName,
  quotationTotal,
  rejectionNotes,
  tenantName,
  recipients,
}: SendCreditAuthStatusEmailParams): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured — skipping credit auth email");
    return;
  }

  const isApproved = status === "approved";
  const ms = new MailerSend({ apiKey });
  const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);

  const subject = isApproved
    ? `Crédito autorizado — Cotización ${quotationFolio}`
    : `Crédito rechazado — Cotización ${quotationFolio}`;

  const headerColor = isApproved
    ? "linear-gradient(135deg, #15803d 0%, #14532d 100%)"
    : "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)";

  const statusBadge = isApproved
    ? `<span style="background:#dcfce7;color:#15803d;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">AUTORIZADO</span>`
    : `<span style="background:#fef2f2;color:#b91c1c;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">RECHAZADO</span>`;

  const nextStepsHtml = isApproved
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#15803d;font-size:14px;">Próximos pasos</h3>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;">
          <li style="margin-bottom:4px;">Se ha generado automáticamente un pedido de producción</li>
          <li style="margin-bottom:4px;">El equipo de producción comenzará a procesar el pedido</li>
          <li>Puedes consultar el avance desde el panel de pedidos</li>
        </ul>
      </div>`
    : `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#b91c1c;font-size:14px;">Motivo del rechazo</h3>
        <p style="margin:0;color:#374151;font-size:13px;">${rejectionNotes || "No se proporcionó motivo"}</p>
      </div>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="background:${headerColor};padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Autorización de Crédito</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${tenantName} — Sistema Comercial</p>
          </div>
          <div style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <span style="font-size:15px;font-weight:600;color:#111827;">Estatus:</span>
              ${statusBadge}
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Cotización:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${quotationFolio}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Cliente:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${customerName}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Monto cotización:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${quotationTotal}</span>
            </div>
            ${nextStepsHtml}
          </div>
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} — Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Send one email per valid recipient
  const validRecipients = recipients.filter((r) => r.email && r.email.trim() !== "");
  if (validRecipients.length === 0) {
    console.warn("No valid recipients for credit auth status email — skipping");
    return;
  }

  for (const recipient of validRecipients) {
    try {
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo([new Recipient(recipient.email, recipient.name)])
        .setSubject(subject)
        .setHtml(htmlContent);

      await ms.email.send(emailParams);
      console.log(`✅ Credit auth ${status} email sent to: ${recipient.email}`);
    } catch (err: any) {
      console.warn(`Failed to send credit auth email to ${recipient.email}:`, err.message || err);
    }
  }
}

// ─── Warranty Sheet Email ─────────────────────────────────────────────────────

export async function sendWarrantySheetEmail({
  toEmail,
  toName,
  ccEmails,
  ticketNumber,
  customerName,
  subject,
  tenantName,
  pdfBuffer,
}: {
  toEmail: string;
  toName: string;
  ccEmails: { email: string; name: string }[];
  ticketNumber: string;
  customerName: string;
  subject: string;
  tenantName: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) throw new Error("MAILERSEND_API_KEY no configurado");

  const ms = new MailerSend({ apiKey });
  const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);
  const recipients = [new Recipient(toEmail, toName)];
  const cc = ccEmails.map(r => new Recipient(r.email, r.name));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
          .container { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%); padding: 28px 32px; }
          .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
          .body { padding: 28px 32px; }
          .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
          .info-label { color: #6b7280; font-size: 13px; min-width: 120px; }
          .info-value { color: #111827; font-size: 13px; font-weight: 600; }
          .note { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; margin-top: 20px; font-size: 13px; color: #0369a1; }
          .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center; }
          .footer p { margin: 0; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Hoja de Garantía — ${ticketNumber}</h1>
            <p>${tenantName} — Sistema Comercial</p>
          </div>
          <div class="body">
            <p>Estimado(a) <strong>${toName || customerName}</strong>,</p>
            <p>Adjunto encontrará la <strong>Hoja de Garantía</strong> correspondiente a su solicitud de servicio.</p>
            <div class="info-row"><span class="info-label">Ticket:</span><span class="info-value">${ticketNumber}</span></div>
            <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${customerName}</span></div>
            <div class="info-row"><span class="info-label">Asunto:</span><span class="info-value">${subject}</span></div>
            <div class="note">Por favor revise el documento adjunto, fírmelo y envíelo de regreso para continuar con el proceso de garantía.</div>
          </div>
          <div class="footer">
            <p>${tenantName} — Este es un mensaje automático.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const attachment = new Attachment(
    pdfBuffer.toString("base64"),
    `Garantia-${ticketNumber}.pdf`,
    "application/pdf"
  );

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setCc(cc)
    .setSubject(`Hoja de Garantía — ${ticketNumber} — ${customerName}`)
    .setHtml(htmlContent)
    .setAttachments([attachment]);

  console.log(`📧 Sending warranty sheet to: ${toEmail}${cc.length ? ` (CC: ${cc.map(c => c.email).join(", ")})` : ""}`);
  await ms.email.send(emailParams);
  console.log(`✅ Warranty sheet email sent for ${ticketNumber}`);
}

// ─── Order Release Email ──────────────────────────────────────────────────────

interface OrderReleaseEmailRecipient {
  email: string;
  name: string;
}

interface SendOrderReleaseEmailParams {
  status: "approved" | "rejected";
  orderFolio: string;
  customerName: string;
  quotationTotal: string;
  releaseNotes?: string;
  tenantName: string;
  releasedByName: string;
  recipients: OrderReleaseEmailRecipient[];
}

export async function sendOrderReleaseEmail({
  status,
  orderFolio,
  customerName,
  quotationTotal,
  releaseNotes,
  tenantName,
  releasedByName,
  recipients,
}: SendOrderReleaseEmailParams): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured — skipping order release email");
    return;
  }

  const isApproved = status === "approved";
  const ms = new MailerSend({ apiKey });
  const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);

  const subject = isApproved
    ? `Pedido liberado — ${orderFolio}`
    : `Pedido rechazado — ${orderFolio}`;

  const headerColor = isApproved
    ? "linear-gradient(135deg, #15803d 0%, #14532d 100%)"
    : "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)";

  const statusBadge = isApproved
    ? `<span style="background:#dcfce7;color:#15803d;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">LIBERADO</span>`
    : `<span style="background:#fef2f2;color:#b91c1c;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">RECHAZADO</span>`;

  const detailBox = isApproved
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#15803d;font-size:14px;">Próximos pasos</h3>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;">
          <li style="margin-bottom:4px;">El pedido ha sido autorizado para producción</li>
          <li>Puedes consultar el avance desde el panel de pedidos</li>
        </ul>
      </div>`
    : `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#b91c1c;font-size:14px;">Motivo del rechazo</h3>
        <p style="margin:0;color:#374151;font-size:13px;">${releaseNotes || "No se proporcionó motivo"}</p>
      </div>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="background:${headerColor};padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Liberación de Pedido</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${tenantName} — Sistema Comercial</p>
          </div>
          <div style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <span style="font-size:15px;font-weight:600;color:#111827;">Estatus:</span>
              ${statusBadge}
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Pedido:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${orderFolio}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Cliente:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${customerName}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Monto:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${quotationTotal}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Autorizado por:</span>
              <span style="color:#111827;font-size:13px;">${releasedByName}</span>
            </div>
            ${detailBox}
          </div>
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} — Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const validRecipients = recipients.filter(r => r.email && r.email.trim() !== "");
  if (validRecipients.length === 0) {
    console.warn("No valid recipients for order release email — skipping");
    return;
  }

  for (const recipient of validRecipients) {
    try {
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo([new Recipient(recipient.email, recipient.name)])
        .setSubject(subject)
        .setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`✅ Order release ${status} email sent to: ${recipient.email}`);
    } catch (err: any) {
      console.warn(`Failed to send order release email to ${recipient.email}:`, err.message || err);
    }
  }
}
