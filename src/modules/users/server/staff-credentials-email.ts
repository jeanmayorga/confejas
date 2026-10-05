type StaffCredentialsEmail = {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character] ?? character,
  );
}

export function getStaffCredentialsEmail({
  name,
  email,
  password,
  loginUrl,
}: StaffCredentialsEmail) {
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const safeName = escapeHtml(firstName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safeLoginUrl = escapeHtml(loginUrl);

  return {
    subject: "Tu acceso de Staff - Conferencia JAS 2026",
    text: `Hola ${firstName},\n\nYa está listo tu acceso al equipo de registro de la Conferencia JAS 2026.\n\nUsuario: ${email}\nContraseña temporal: ${password}\n\nIngresa aquí: ${loginUrl}\n\nConferencia JAS 2026 · Equipo de coordinación`,
    html: `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="x-apple-disable-message-reformatting" />
          <title>Tu acceso de Staff</title>
        </head>
        <body style="margin:0;padding:0;background-color:#ecf3f8;font-family:Arial,Helvetica,sans-serif;color:#17202a">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Tu acceso para el equipo de registro está listo.</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ecf3f8" style="width:100%;border-collapse:collapse;background-color:#ecf3f8">
            <tr><td align="center" style="padding:40px 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border:1px solid #dbe7ef;border-radius:20px;background-color:#ffffff;overflow:hidden">
                <tr><td style="padding:30px 36px;background-color:#0b78c5;color:#ffffff">
                  <p style="margin:0 0 10px;font-size:13px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#d9efff">Conferencia JAS 2026</p>
                  <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff">Tu acceso está listo</h1>
                  <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#eaf6ff">Bienvenido al equipo de registro.</p>
                </td></tr>
                <tr><td style="padding:34px 36px 30px">
                  <p style="margin:0 0 14px;font-size:17px;line-height:1.5;color:#17202a">Hola ${safeName},</p>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">Con estos datos podrás ingresar a la plataforma y apoyar el registro de los participantes.</p>
                  <p style="margin:0 0 12px;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b">Datos para ingresar</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border:1px solid #e2e8f0;border-radius:14px;background-color:#ffffff">
                    <tr><td style="padding:15px 16px 5px;font-size:12px;line-height:1.4;color:#64748b">Correo electrónico</td></tr>
                    <tr><td style="padding:0 16px 15px;font-size:15px;line-height:1.4;font-weight:600;color:#17202a;word-break:break-word">${safeEmail}</td></tr>
                    <tr><td style="height:1px;padding:0 16px;background-color:#e2e8f0;font-size:0;line-height:0">&nbsp;</td></tr>
                    <tr><td style="padding:15px 16px 5px;font-size:12px;line-height:1.4;color:#64748b">Contraseña temporal</td></tr>
                    <tr><td style="padding:0 16px 16px;font-family:monospace;font-size:20px;line-height:1.4;font-weight:700;letter-spacing:0.04em;color:#0b639f;word-break:break-word">${safePassword}</td></tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0;width:100%;border-collapse:collapse">
                    <tr><td align="center"><a href="${safeLoginUrl}" style="display:inline-block;border-radius:10px;background-color:#0b78c5;padding:14px 24px;color:#ffffff;font-size:15px;line-height:1.2;font-weight:700;text-decoration:none">Ingresar a la plataforma</a></td></tr>
                  </table>
                </td></tr>
                <tr><td style="padding:20px 36px;background-color:#f8fafc;text-align:center">
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b">Conferencia JAS 2026 · Equipo de coordinación</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>`,
  };
}
