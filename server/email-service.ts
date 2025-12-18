import { MailerSend, EmailParams, Sender, Recipient, Attachment } from 'mailersend';
import { ObjectStorageService } from './objectStorage';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

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

    // Download PDF from Google Cloud Storage
    console.log(`📥 Downloading PDF from GCS: ${pdfPath}`);
    const objectStorageService = new ObjectStorageService();
    const pdfBuffer = await objectStorageService.downloadObjectAsBuffer(pdfPath);
    
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
    
    // Prepare sender and recipients
    const sentFrom = new Sender('noreply@nexxo.com.mx', 'GRUPO JOPER');
    const recipients = to.map(email => new Recipient(email));
    
    // Prepare PDF attachment
    const attachment = new Attachment(
      pdfBuffer.toString('base64'),
      `minuta-${checkinData.customerName.replace(/\s+/g, '-')}.pdf`,
      'attachment'
    );
    
    // Send email with MailerSend
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlContent)
      .setAttachments([attachment]);
    
    await mailerSend.email.send(emailParams);
    
    console.log(`✅ Email sent successfully to: ${to.join(', ')}`);
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
