import { expect, test } from "bun:test";
import { getUserCredentialsEmail } from "./credentials-email";

test("user credential email escapes account data and includes access details in both formats", () => {
  const message = getUserCredentialsEmail({
    name: '<script>alert("x")</script>',
    email: "person@example.com",
    password: 'secret<&"password',
    loginUrl: "https://confejas.example/login",
  });
  expect(message.html).not.toContain("<script>");
  expect(message.html).toContain("&lt;script&gt;");
  expect(message.html).toContain("secret&lt;&amp;&quot;password");
  for (const body of [message.html, message.text]) {
    expect(body).toContain("person@example.com");
    expect(body).toContain("https://confejas.example/login");
    expect(body).toContain("La contraseña anterior dejó de funcionar.");
  }
  expect(message.text).toContain('secret<&"password');
});
