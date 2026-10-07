# WhatsApp → Codex: Subcomité Registro

Each new message starting with **Codex** in `120363409312951970@g.us`
(Subcomité Registro 🧑‍💻) starts a real `codex exec` session. Codex receives the full
request, uses **gpt-6-astra** with **medium** reasoning and shell/network tools to work with Confejas, and produces the final
response sent back to that same group. This is **not** a JSON intent classifier.
Requests can contain multiple people, operations and natural-language questions.

## Use

- `Codex, cuántos participantes tiene la compañía 8`
- `codex envía las invitaciones de estas personas a sus correos: ...`
- `CODEX dame el PDF de María José Cruz Morán`

Prefix matching is case-insensitive. Every request is an independent session, so
include the needed names/details again. The complete incoming text is passed to
Codex without a preselected operation or one-person limit (maximum 12,000 chars).
Photos, voice notes and quoted-message bodies are not yet passed through.

The account is Jean Paul (**5512**). Only this exact group ID triggers work or
receives the session response. Other groups, private chats and messages predating
activation are ignored. Group members, including the account owner, can request
Confejas operations. The group name is not used for routing.

## Execution model

The receiver uses WhatsApp CLI `sync --follow --live-only --chat <fixed-jid>`.
A durable message-ID claim prevents the same message from being replayed. The
service starts `codex exec` in a private per-request workspace, with the shell
enabled, a `workspace-write` sandbox, and network access. The project source is
available for reading; generated files go in that request's workspace. Codex can
inspect schemas, execute database queries and perform requested operations using
the project's libraries. There is no hardcoded action allowlist on the agent.

Instructions scope the agent to authorized Confejas work and prohibit service,
host-permission or project-code changes, unrelated data disclosure and independent
WhatsApp sends. Plugins, apps, browser, hooks and multi-agent features are disabled.
These instructions are not a substitute for database authorization: the agent can
use the existing application's database/email credentials. This group is an
administrative entry point and its members must be trusted accordingly.

`task-tool.ts` is an optional convenience helper for existing invitation functions:
lookup, company list, send email, generate PDF or both. Codex may call it multiple
times or execute its own code for other requests. The helper uses exact unique
participant matching, email idempotency keys and durable operation receipts. Its
results are evidence for Codex's own final response, not a canned replacement.

Every response quotes its originating message using WhatsApp CLI `--reply-to`,
including each text chunk, PDF and failure notice. Receipts record that original
message ID. The service forwards the actual final text from Codex, splitting long responses
without truncation. If Codex creates `attachments.json`, only PDFs whose resolved
paths stay inside that job directory and whose headers are valid are accepted.
Captions follow `Hola, te comparto el PDF del codigo de {nombre}`. Requests to email
PDFs do not automatically post the same files to the group.

Interrupted/uncertain work is marked for manual review and is not automatically
repeated. Provider acceptance does not imply email delivery or WhatsApp reading.
A new message ID is a new request. Up to five requests per sender per minute are
accepted. Each session has a 15-minute time limit; requests run sequentially.

## Install and operate (macOS)

Prerequisites: Bun, authenticated Codex CLI, linked WhatsApp CLI, installed project
dependencies and `.env.local` with `DATABASE_URL` and `RESEND_API_KEY`.

The installed WhatsApp CLI includes `whatsapp-cli.patch` against upstream revision
`730db43a9328410244f465ddd0a2a409d56fd64e`. The patch sets PDF filename/MIME metadata
and adds live-only, group-scoped sync. Historical name backfill otherwise delays
new messages by minutes. To reproduce it in that CLI source checkout:

```sh
git apply /path/to/scripts/whatsapp-registro/whatsapp-cli.patch
go test -tags sqlite_fts5 ./internal/whatsapp
go build -tags sqlite_fts5 -o whatsapp ./cmd/whatsapp
```

Install the resulting binary at `~/.local/bin/whatsapp`, then from this project:

```sh
bun run registro:check
bun run registro:test
bun run registro:install
bun run registro:status
bun run registro:stop
```

The installer snapshots the service under `~/.local/share/confejas-registro/app`,
links existing dependencies/environment and read-access project source, and
registers `com.confejas.whatsapp-registro` as a per-user LaunchAgent. It starts at
login and restarts after failure. The Mac must stay awake, online and logged in.
Codex sessions use the signed-in account's applicable usage allowance.

Run install again to update; existing message IDs and audit history are preserved.
Wait for active requests to finish before updating. Stop unloads it for the current
login; remove its plist from `~/Library/LaunchAgents` to prevent future auto-start.

Private local runtime files:

- `service.log`, `service-errors.log`: process status.
- `state.sqlite`: processed messages and WhatsApp receipts.
- `jobs/<message-id-hex>/codex.jsonl`: actual tool execution events and session ID.
- `jobs/<message-id-hex>/response.txt`: Codex's final answer.
- `jobs/<message-id-hex>/tool-audit.jsonl`: optional helper operation receipts.

Do not publish these files or participant data. The receiver is paused during
outgoing WhatsApp sends to avoid competing linked-device connections, then resumed.
The agent never controls the WhatsApp destination.

## Verification

```sh
bun test scripts/whatsapp-registro
bunx tsc --noEmit
bunx eslint scripts/whatsapp-registro
```

`daemon.ts --check` is read-only. `daemon.ts --self-test` starts a real Codex session
and posts its help response to the configured group (only run while stopped).
For live receipt testing, send a fresh `Codex` request from another linked device.
For a non-sending execution test, invoke `runAgent` with a request to count two
companies, explicitly prohibiting mutations/emails/PDFs, and inspect
`command_execution` events and the final answer. Never inject synthetic messages
into WhatsApp's database or replay completed email requests to test the bot.
