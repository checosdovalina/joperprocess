import { MailerSend, EmailParams, Sender, Recipient, Attachment } from 'mailersend';
import { ObjectStorageService } from './objectStorage';
import { localStorageService } from './localStorage';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

// Helper to determine if we should use local storage (production without GCS)
function useLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === "true" || 
         process.env.NODE_ENV !== "production" ||
         (process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR);
}

interface SendCheckoutEmailParams {
  to: string[];
  checkinData: {
    customerName: string;
    vendedorName: string;
    checkoutDate: string;
    notes?: string;
  };
  pdfPath: string;
}

export async function sendCheckoutEmail({
  to,
  checkinData,
  pdfPath,
}: SendCheckoutEmailParams): Promise<void> {
  try {
    // Validate recipients
    if (!to || to.length === 0) {
      throw new Error('No recipients provided for email');
    }

    // Download PDF from storage
    let pdfBuffer: Buffer;
    if (useLocalStorage()) {
      console.log(`📥 Reading PDF from local storage: ${pdfPath}`);
      const buffer = await localStorageService.getFile(pdfPath);
      if (!buffer) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }
      pdfBuffer = buffer;
    } else {
      console.log(`📥 Downloading PDF from GCS: ${pdfPath}`);
      const objectStorageService = new ObjectStorageService();
      pdfBuffer = await objectStorageService.downloadObjectAsBuffer(pdfPath);
    }
    
    // Format email subject
    const subject = `Minuta de Visita - ${checkinData.customerName}`;
    
    // Email HTML template
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
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              background: #ffffff;
              padding: 30px 20px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .info-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #6b7280;
              min-width: 140px;
            }
            .info-value {
              color: #111827;
            }
            .notes {
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              margin-top: 20px;
              border-left: 4px solid #667eea;
            }
            .notes-label {
              font-weight: 600;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .attachment-note {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              color: #1e40af;
              padding: 12px;
              border-radius: 6px;
              margin-top: 20px;
              text-align: center;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Minuta de Visita</h1>
          </div>
          
          <div class="content">
            <p>Se ha generado una nueva minuta de visita con los siguientes detalles:</p>
            
            <div class="info-row">
              <div class="info-label">Cliente:</div>
              <div class="info-value">${checkinData.customerName}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Vendedor:</div>
              <div class="info-value">${checkinData.vendedorName}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Fecha:</div>
              <div class="info-value">${checkinData.checkoutDate}</div>
            </div>
            
            ${checkinData.notes ? `
              <div class="notes">
                <div class="notes-label">Acuerdos y Comentarios:</div>
                <div>${checkinData.notes}</div>
              </div>
            ` : ''}
            
            <div class="attachment-note">
              📎 La minuta en formato PDF está adjunta a este correo
            </div>
          </div>
          
          <div class="footer">
            <p><strong>GRUPO JOPER</strong> - Sistema Comercial</p>
            <p style="font-size: 12px; margin-top: 10px;">
              Este es un correo automático, por favor no responder.
            </p>
          </div>
        </body>
      </html>
    `;
    
    // Prepare sender
    const sentFrom = new Sender('noreply@nexxo.com.mx', 'GRUPO JOPER');
    
    // Prepare PDF attachment
    const attachment = new Attachment(
      pdfBuffer.toString('base64'),
      `minuta-${checkinData.customerName.replace(/\s+/g, '-')}.pdf`,
      'attachment'
    );
    
    // Send individual emails to each recipient (to avoid MailerSend trial limits)
    for (const email of to) {
      try {
        const emailParams = new EmailParams()
          .setFrom(sentFrom)
          .setTo([new Recipient(email)])
          .setSubject(subject)
          .setHtml(htmlContent)
          .setAttachments([attachment]);
        
        await mailerSend.email.send(emailParams);
        console.log(`✅ Email sent successfully to: ${email}`);
      } catch (individualError) {
        console.error(`❌ Failed to send email to ${email}:`, individualError);
      }
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

export async function getAdminEmails(): Promise<string[]> {
  // This will be populated from database query
  // For now, return empty array and it will be filled by the route handler
  return [];
}

interface SendIncidentNotificationParams {
  to: string[];
  eventType: "created" | "customer_comment" | "status_change";
  incident: {
    ticketNumber: string;
    customerName: string;
    type: string;
    urgency: string;
    status: string;
    subject: string;
    description?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  };
  extraMessage?: string;
  detailUrl?: string;
  tenantName?: string;
}

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  garantia: "Garantía",
  retrabajo: "Retrabajo",
  queja: "Queja",
  consulta: "Consulta",
  administrativo: "Administrativo",
};

const INCIDENT_URGENCY_LABELS: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

const INCIDENT_STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_proceso: "En Proceso",
  esperando_cliente: "Esperando Cliente",
  esperando_interno: "Esperando Interno",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

export async function sendIncidentNotificationEmail({
  to,
  eventType,
  incident,
  extraMessage,
  detailUrl,
  tenantName = "Nexxo",
}: SendIncidentNotificationParams): Promise<void> {
  try {
    if (!to || to.length === 0) {
      console.warn("⚠️ No admin recipients for incident notification");
      return;
    }

    const headings: Record<string, string> = {
      created: "Nuevo Incidente Recibido",
      customer_comment: "Nuevo Comentario del Cliente",
      status_change: "Actualización de Incidente",
    };
    const heading = headings[eventType] || "Notificación de Incidente";
    const subject = `[${incident.ticketNumber}] ${heading} - ${incident.customerName}`;

    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const row = (label: string, value?: string | null) =>
      value
        ? `<div class="info-row"><div class="info-label">${label}:</div><div class="info-value">${escapeHtml(value)}</div></div>`
        : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%); color: white; padding: 24px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .ticket { font-family: monospace; font-size: 14px; opacity: 0.9; margin-top: 6px; }
            .content { padding: 24px 20px; }
            .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #6b7280; min-width: 130px; }
            .info-value { color: #111827; }
            .message { background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 16px; border-left: 4px solid #4DA3FF; }
            .button-container { text-align: center; margin: 24px 0 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%); color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; }
            .footer { background: #f9fafb; padding: 18px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${heading}</h1>
              <div class="ticket">${escapeHtml(incident.ticketNumber)}</div>
            </div>
            <div class="content">
              ${extraMessage ? `<div class="message">${escapeHtml(extraMessage)}</div>` : ""}
              ${row("Cliente", incident.customerName)}
              ${row("Asunto", incident.subject)}
              ${row("Tipo", INCIDENT_TYPE_LABELS[incident.type] || incident.type)}
              ${row("Urgencia", INCIDENT_URGENCY_LABELS[incident.urgency] || incident.urgency)}
              ${row("Estado", INCIDENT_STATUS_LABELS[incident.status] || incident.status)}
              ${row("Descripción", incident.description)}
              ${row("Contacto", incident.contactName)}
              ${row("Email", incident.contactEmail)}
              ${row("Teléfono", incident.contactPhone)}
              ${detailUrl ? `<div class="button-container"><a href="${detailUrl}" class="button">Ver Incidente</a></div>` : ""}
            </div>
            <div class="footer">
              <p><strong>${escapeHtml(tenantName)}</strong> - Sistema Comercial</p>
              <p>Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);

    for (const email of to) {
      try {
        const emailParams = new EmailParams()
          .setFrom(sentFrom)
          .setTo([new Recipient(email)])
          .setSubject(subject)
          .setHtml(htmlContent);
        await mailerSend.email.send(emailParams);
        console.log(`✅ Incident notification sent to: ${email}`);
      } catch (individualError) {
        console.error(`❌ Failed to send incident notification to ${email}:`, individualError);
      }
    }
  } catch (error) {
    console.error("❌ Error sending incident notification:", error);
  }
}

interface SendOrderCancellationEmailParams {
  to: { email: string; name: string }[];
  orderData: {
    folio: string;
    customerName: string;
    cancelledBy: string;
    cancelDate: string;
    reason?: string;
  };
  orderUrl?: string;
  tenantName?: string;
}

export async function sendOrderCancellationEmail({
  to,
  orderData,
  orderUrl,
  tenantName = "Nexxo",
}: SendOrderCancellationEmailParams): Promise<void> {
  try {
    if (!to || to.length === 0) {
      console.warn("⚠️ No admin recipients for order cancellation notification");
      return;
    }

    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const subject = `Pedido ${orderData.folio} cancelado - ${orderData.customerName}`;

    const row = (label: string, value?: string | null) =>
      value
        ? `<div class="info-row"><div class="info-label">${label}:</div><div class="info-value">${escapeHtml(value)}</div></div>`
        : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 24px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .content { padding: 24px 20px; }
            .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #6b7280; min-width: 130px; }
            .info-value { color: #111827; }
            .reason { background: #fef2f2; padding: 15px; border-radius: 6px; margin-top: 16px; border-left: 4px solid #ef4444; }
            .reason-label { font-weight: 600; color: #6b7280; margin-bottom: 8px; }
            .button-container { text-align: center; margin: 24px 0 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%); color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; }
            .footer { background: #f9fafb; padding: 18px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pedido Cancelado</h1>
            </div>
            <div class="content">
              <p>Se ha cancelado el siguiente pedido:</p>
              ${row("Pedido", orderData.folio)}
              ${row("Cliente", orderData.customerName)}
              ${row("Cancelado por", orderData.cancelledBy)}
              ${row("Fecha", orderData.cancelDate)}
              <div class="reason">
                <div class="reason-label">Razón de la cancelación:</div>
                <div>${orderData.reason ? escapeHtml(orderData.reason) : "No se especificó una razón."}</div>
              </div>
              ${orderUrl ? `<div class="button-container"><a href="${orderUrl}" class="button">Ver Pedidos</a></div>` : ""}
            </div>
            <div class="footer">
              <p><strong>${escapeHtml(tenantName)}</strong> - Sistema Comercial</p>
              <p>Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);

    for (const recipient of to) {
      try {
        const emailParams = new EmailParams()
          .setFrom(sentFrom)
          .setTo([new Recipient(recipient.email, recipient.name)])
          .setSubject(subject)
          .setHtml(htmlContent);
        await mailerSend.email.send(emailParams);
        console.log(`✅ Order cancellation notification sent to: ${recipient.email}`);
      } catch (individualError) {
        console.error(`❌ Failed to send cancellation notification to ${recipient.email}:`, individualError);
      }
    }
  } catch (error) {
    console.error("❌ Error sending order cancellation notification:", error);
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetLink: string;
  tenantName?: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetLink,
  tenantName = "Nexxo",
}: SendPasswordResetEmailParams): Promise<void> {
  try {
    const subject = `Recuperar contraseña - ${tenantName}`;
    
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
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .content p {
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white !important;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 12px;
              border-radius: 6px;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .link-text {
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Recuperar Contraseña</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${userName}</strong>,</p>
              
              <p>Recibimos una solicitud para restablecer tu contraseña en ${tenantName}.</p>
              
              <div class="button-container">
                <a href="${resetLink}" class="button">Restablecer Contraseña</a>
              </div>
              
              <div class="warning">
                ⚠️ Este enlace expirará en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
              </div>
              
              <p class="link-text">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                ${resetLink}
              </p>
            </div>
            
            <div class="footer">
              <p><strong>${tenantName}</strong> - Sistema Comercial</p>
              <p>Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const sentFrom = new Sender('noreply@nexxo.com.mx', tenantName);
    
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo([new Recipient(to)])
      .setSubject(subject)
      .setHtml(htmlContent);
    
    await mailerSend.email.send(emailParams);
    console.log(`✅ Password reset email sent to: ${to}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

interface SendCompanyWelcomeEmailParams {
  to: string;
  companyName: string;
  portalUrl: string;
  username: string;
  password: string;
}

export async function sendCompanyWelcomeEmail({
  to,
  companyName,
  portalUrl,
  username,
  password,
}: SendCompanyWelcomeEmailParams): Promise<void> {
  try {
    const subject = `Bienvenido a Nexxo - Tu portal de ${companyName} está listo`;

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
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .content p {
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white !important;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
            }
            .credentials {
              background: #f0f7ff;
              border: 1px solid #4DA3FF;
              border-radius: 6px;
              padding: 16px 20px;
              margin: 20px 0;
            }
            .credentials p {
              margin: 8px 0;
            }
            .credentials .label {
              color: #6b7280;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .credentials .value {
              font-size: 18px;
              font-weight: 700;
              color: #1F3C88;
              font-family: monospace;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 12px;
              border-radius: 6px;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .link-text {
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a Nexxo!</h1>
            </div>

            <div class="content">
              <p>Hola,</p>

              <p>El portal comercial de <strong>${companyName}</strong> ha sido creado exitosamente. Ya puedes acceder a tu plataforma personalizada de Nexxo.</p>

              <div class="button-container">
                <a href="${portalUrl}" class="button">Acceder a mi portal</a>
              </div>

              <p>Estos son tus datos de acceso de administrador:</p>

              <div class="credentials">
                <p><span class="label">Dirección del portal</span><br>
                <a href="${portalUrl}">${portalUrl}</a></p>
                <p><span class="label">Usuario</span><br>
                <span class="value">${username}</span></p>
                <p><span class="label">Contraseña</span><br>
                <span class="value">${password}</span></p>
              </div>

              <div class="warning">
                ⚠️ Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.
              </div>

              <p class="link-text">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                ${portalUrl}
              </p>
            </div>

            <div class="footer">
              <p><strong>Nexxo</strong> - Sistema Comercial</p>
              <p>Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const sentFrom = new Sender('noreply@nexxo.com.mx', 'Nexxo');

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo([new Recipient(to)])
      .setSubject(subject)
      .setHtml(htmlContent);

    await mailerSend.email.send(emailParams);
    console.log(`✅ Company welcome email sent to: ${to}`);
  } catch (error) {
    console.error('❌ Error sending company welcome email:', error);
    throw new Error('Failed to send company welcome email');
  }
}
