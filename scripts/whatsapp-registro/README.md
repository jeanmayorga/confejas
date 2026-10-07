# WhatsApp → Codex: Subcomité Registro

Local Bun service for the Jean Paul account ending **5512**. Only the immutable
WhatsApp group ID `120363409312951970@g.us` (Subcomité Registro 🧑‍💻) can trigger
requests or receive replies. Group names are not used for routing.

## Use

In that group, start a new text message with **Codex**:

- `Codex, busca a María José Cruz Morán`
- `Codex, envía el QR de María José Cruz Morán a correo@ejemplo.com`
- `Codex, dame el PDF de María José Cruz Morán`
- `Codex, envía la invitación y dame el PDF de María José Cruz Morán`
- `Codex, quiénes no tienen correo en la compañía 8`
- `Codex, quiénes tienen pendiente el QR en la compañía 8`
- `Codex ayuda`

One participant or company per message. Each request starts a separate Codex
session; include the name again in follow-ups. Attachments, voice notes and quoted
message bodies are not interpreted. Other groups, direct messages, historical
messages from before activation, and messages without the prefix are ignored.
Members of the selected group, including the account owner, can invoke the bot.
PDFs and responses go to this group, not to private chats or user-selected groups.

## Install / operate (macOS)

Prerequisites: Bun, authenticated Codex CLI, linked WhatsApp CLI, installed project
dependencies, and `.env.local` with `DATABASE_URL` and `RESEND_API_KEY`.
The WhatsApp CLI must set both document `FileName` and `application/pdf` MIME type.
The locally installed CLI was repaired to do that; generic upstream builds may
otherwise display the attachment as “Untitled”.

```sh
bun run registro:check
bun run registro:test
bun run registro:install
bun run registro:status
bun run registro:stop
```

The installer snapshots the required source and assets under
`~/.local/share/confejas-registro/app`, links the existing dependencies and env file,
and registers `com.confejas.whatsapp-registro` as a per-user LaunchAgent. It starts
at login and restarts after a process failure. Run `registro:install` again to
update/restart; state and completed message IDs are preserved. `registro:stop`
unloads it for the current login; remove the plist from `~/Library/LaunchAgents`
if you also want to prevent startup at the next login. Do not run two copies.
The Mac must remain awake, online and logged in. Codex usage consumes the signed-in
account's applicable quota. No separate OpenAI API key is used.

Logs/state (local only, private directory):

- `service.log`, `service-errors.log`: lifecycle and results.
- `state.sqlite`: processed message IDs, stages and provider receipts.
- `jobs/<message-id-hex>/`: Codex session events, structured plan and PDF.

Do not commit or publish these files. The snapshot intentionally excludes project
credentials, participant exports, unrelated files and chat history (the env is a
local symlink). The planner subprocess receives neither database nor email keys.
Codex stores its own session history locally through its usual CLI behavior.

## Design and bounds

`whatsapp sync --follow` receives messages; the service reads only this group's new
rows from the local CLI database. All WhatsApp network actions use the CLI.
The receiver is temporarily stopped for outgoing messages, avoiding two competing
connections on the same linked device. It restarts after each send.

Codex runs read-only in a separate job directory with user configuration, shell,
plugins, apps, browser, hooks and multi-agent tools disabled. It only produces a
schema-constrained plan. A deterministic executor validates the action, matches
names accent-insensitively, requires exactly one matching participant, and only
accepts an email explicitly present in the request. It supports participant
lookup, company lists, invitation emails and PDFs. It cannot create/delete people,
change company assignments, send bulk mail or execute arbitrary group commands.
Participant credentials, medical fields and QR tokens are never sent to the model.

The standard application email/PDF templates are reused. Outgoing PDF captions are
exactly `Hola, te comparto el PDF del codigo de {nombre}`. The PDF uses the canonical
first names rather than potentially malformed imported preferred names.

Claims are durable **before** side effects. Duplicate message IDs are skipped;
email requests also carry Resend idempotency keys. Work interrupted mid-send is
marked `interrupted` and is never automatically repeated. An administrator must
inspect its audit/provider receipt before deciding to retry. A WhatsApp send with
an uncertain result is also not repeated automatically. Delivery/read confirmation
is not implied by an accepted provider send. A new message ID is a new request.
A sender is limited to five requests per minute; excess requests are recorded and
ignored to avoid creating a response loop.

## Verification

```sh
bun test scripts/whatsapp-registro/core.test.ts
bunx tsc --noEmit
bunx eslint scripts/whatsapp-registro
```

`daemon.ts --check` is read-only and validates the linked account/group and env.
`daemon.ts --self-test` runs a real Codex help request and **posts usage instructions
to the configured group**; run only while the service is stopped. It does not send
participant emails. To verify incoming WhatsApp delivery, send `Codex ayuda` from
another linked device/member after the service starts and inspect its reply and
`complete` audit entry. Do not insert simulated rows into WhatsApp's database.
