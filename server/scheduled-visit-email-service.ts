import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

interface ScheduledVisitReminderData {
  customerName: string;
  sellerName: string;
  scheduledDate: string;
  meetingType: string;
  topics: string[];
  notes?: string | null;
  companyName: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendScheduledVisitReminderEmail(
  to: string,
  visit: ScheduledVisitReminderData,
): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    throw new Error("MAILERSEND_API_KEY no está configurado");
  }

  const customerName = escapeHtml(visit.customerName);
  const sellerName = escapeHtml(visit.sellerName);
  const scheduledDate = escapeHtml(visit.scheduledDate);
  const meetingType = escapeHtml(visit.meetingType);
  const companyName = escapeHtml(visit.companyName);
  const topics = visit.topics.map(escapeHtml);
  const notes = visit.notes ? escapeHtml(visit.notes) : "";

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head><meta charset="utf-8"><title>Recordatorio de visita</title></head>
      <body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1d4ed8;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:22px">Recordatorio de visita</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px">
          <p>Hola ${sellerName},</p>
          <p>Esta es una alerta de tu visita programada:</p>
          <p><strong>Cliente:</strong> ${customerName}</p>
          <p><strong>Fecha y hora:</strong> ${scheduledDate}</p>
          <p><strong>Tipo:</strong> ${meetingType}</p>
          ${topics.length ? `<p><strong>Temas:</strong> ${topics.join(", ")}</p>` : ""}
          ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ""}
          <p style="color:#6b7280;font-size:13px;margin-top:28px">${companyName} · Este es un correo automático.</p>
        </div>
      </body>
    </html>
  `;

  const email = new EmailParams()
    .setFrom(new Sender("noreply@nexxo.com.mx", "NEXXO"))
    .setTo([new Recipient(to)])
    .setSubject(`Recordatorio de visita: ${visit.customerName}`)
    .setHtml(html);

  const mailerSend = new MailerSend({ apiKey });
  await mailerSend.email.send(email);
}