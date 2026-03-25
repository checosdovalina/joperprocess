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
