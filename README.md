# SMTPing MCP server

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [SMTPing](https://smtping.com). It lets Claude, Cursor, VS Code, Windsurf and any MCP client verify email addresses in a conversation.

> "Verify these 40 leads and tell me which ones are safe to email."

## Tools

| tool | what it does | credits |
| --- | --- | --- |
| `verify_email` | Verifies one address: status plus band (safe, avoid, judgement) | 1 |
| `verify_list` | Verifies a list as one bulk job (up to 100,000), waits for results | 1 per unique address |
| `get_bulk_job` | Progress and results of a bulk job | 0 |
| `check_threat` | Looks up one address in the spamtrap, disposable, spambot or complainer list | 1 |
| `get_credits` | Remaining credits and plan | 0 |

## Setup

Create an API key in the [SMTPing dashboard](https://app.smtping.com), then add the server to your client. Node 18 or later is required.

### Claude Desktop

Settings > Developer > Edit Config, then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "smtping": {
      "command": "npx",
      "args": ["-y", "@smtping/mcp"],
      "env": { "SMTPING_API_KEY": "sk_live_your_key_here" }
    }
  }
}
```

Restart Claude Desktop.

### Claude Code

```bash
claude mcp add smtping -e SMTPING_API_KEY=sk_live_your_key_here -- npx -y @smtping/mcp
```

### Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project): same JSON block as Claude Desktop.

### VS Code

`.vscode/mcp.json`:

```json
{
  "servers": {
    "smtping": {
      "command": "npx",
      "args": ["-y", "@smtping/mcp"],
      "env": { "SMTPING_API_KEY": "sk_live_your_key_here" }
    }
  }
}
```

### Windows troubleshooting

**`npx` is not found**: use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "@smtping/mcp"]`.

**"Request timed out" or "Server disconnected" on first start**: the first `npx` run downloads the package and can take longer than the client's 60 second startup limit. Install the server once, then point the client to it:

1. In a terminal: `npm install -g @smtping/mcp`
2. Replace the `smtping` block with:

```json
"smtping": {
  "command": "node",
  "args": ["C:\\Users\\YOUR_NAME\\AppData\\Roaming\\npm\\node_modules\\@smtping\\mcp\\index.js"],
  "env": { "SMTPING_API_KEY": "sk_live_your_key_here" }
}
```

Replace `YOUR_NAME` with your Windows user folder (spaces are fine) and use double backslashes. Run `echo %APPDATA%` to see the exact path. This form also avoids issues with `.cmd` launchers when the user folder contains a space.

3. Quit the client completely (tray icon > Quit) and reopen it.

To update later: `npm install -g @smtping/mcp@latest`.

**Logs**: Claude Desktop writes them to `%APPDATA%\Claude\logs\mcp-server-smtping.log`.

## Privacy

Addresses are sent to the SMTPing API only when a tool is called. See the [privacy policy](https://smtping.com/privacy).

## Links

- [MCP page](https://smtping.com/email-verification-mcp)
- [API documentation](https://smtping.com/docs)
- [Pricing](https://smtping.com/pricing)
- Support: support@smtping.com
- Blog: [SMTPedia](https://smtpedia.com)

MIT License
