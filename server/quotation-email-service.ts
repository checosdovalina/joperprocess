import { MailerSend, EmailParams, Sender, Recipient, Attachment } from "mailersend";
import { ObjectStorageService } from "./objectStorage";

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

    console.log(`📥 Downloading quotation PDF from GCS: ${pdfPath}`);
    const objectStorageService = new ObjectStorageService();
    const pdfBuffer = await objectStorageService.downloadObjectAsBuffer(pdfPath);

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
      "noreply@trial-3yxj6ljnzr0ldo2r.mlsender.net",
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
