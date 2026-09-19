type CounselorCredentialsEmail = {
  name: string;
  email: string;
  password: string;
  companyName: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function getCounselorCredentialsEmail({
  name,
  email,
  password,
  companyName,
}: CounselorCredentialsEmail) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safeCompanyName = escapeHtml(companyName);

  return {
    subject: "Tus credenciales de acceso - Conferencia JAS 2026",
    html: `
      <div style="margin:0;background:#f5f7fa;padding:32px 16px;font-family:Arial,sans-serif;color:#17202a">
        <div style="margin:0 auto;max-width:560px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;padding:32px">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px">Conferencia JAS 2026</p>
          <h1 style="margin:0 0 24px;font-size:24px;line-height:1.25">Credenciales de acceso</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Hola ${safeName},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.5">Con estas credenciales podrás ingresar a la plataforma como consejero, ver la agenda y consultar los participantes de tu compañía.</p>
          <div style="border-radius:12px;background:#f1f5f9;padding:20px">
            <p style="margin:0 0 12px;font-size:14px"><strong>Compañía:</strong> ${safeCompanyName}</p>
            <p style="margin:0 0 12px;font-size:14px"><strong>Email:</strong> ${safeEmail}</p>
            <p style="margin:0;font-size:14px"><strong>Contraseña temporal:</strong> <code style="border-radius:6px;background:#ffffff;padding:4px 6px">${safePassword}</code></p>
          </div>
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.5">Por seguridad, no compartas estas credenciales con otras personas.</p>
        </div>
      </div>
    `,
  };
}
