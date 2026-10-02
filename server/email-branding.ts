/** Company names stay plain text in headers, but must be escaped inside HTML. */
export function companyEmailBranding(tenantName: string) {
  const name = tenantName.trim() || "Nexxo";
  const htmlName = name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  return { name, htmlName };
}