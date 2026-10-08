type UserCredentialsEmail = {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function getUserCredentialsEmail({
  name,
  email,
  password,
  loginUrl,
}: UserCredentialsEmail) {
  return {
    subject: "Tus credenciales de acceso - Confejas",
    text: `Hola ${name},\n\nEstas son tus nuevas credenciales de Confejas:\nUsuario: ${email}\nContraseña: ${password}\n\nLa contraseña anterior dejó de funcionar.\nIngresa aquí: ${loginUrl}\n\nEquipo de coordinación de Confejas`,
    html: `<html lang="es"><body style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a;padding:24px">
      <h1>Tu acceso a Confejas</h1>
      <p>Hola ${escapeHtml(name)},</p>
      <p>Estas son tus nuevas credenciales:</p>
      <p><strong>Usuario:</strong> ${escapeHtml(email)}<br><strong>Contraseña:</strong> ${escapeHtml(password)}</p>
      <p>La contraseña anterior dejó de funcionar.</p>
      <p><a href="${escapeHtml(loginUrl)}">Ingresar a Confejas</a></p>
      <p>Equipo de coordinación de Confejas</p>
    </body></html>`,
  };
}
