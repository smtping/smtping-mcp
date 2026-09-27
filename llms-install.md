# Installing the SMTPing MCP server

Instructions for AI agents (Cline, Claude Code, Cursor) setting up this server for a user.

## Requirements

- Node.js 18 or later (`node -v`)
- An SMTPing API key. If the user does not have one, ask them to create it at https://app.smtping.com (free account, 25 free credits per day). Never invent a key.

## Configuration

Add this entry to the MCP settings file (for Cline: `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "smtping": {
      "command": "npx",
      "args": ["-y", "@smtping/mcp"],
      "env": {
        "SMTPING_API_KEY": "<the user's API key>"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

On Windows, if `npx` is not found, use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "@smtping/mcp"]`.

No build step, no clone: `npx` downloads the published package from npm.

## Check the installation

Call the `get_credits` tool. It is free and returns the remaining credit balance. An authentication error means the key is wrong or missing.

## Tools

- `verify_email` (1 credit): one address, returns status and band (safe, avoid, judgement)
- `verify_list` (1 credit per unique address): bulk job up to 100,000 addresses
- `get_bulk_job` (free): progress and results of a bulk job
- `check_threat` (1 credit): spamtrap, disposable, spambot or complainer lookup
- `get_credits` (free): remaining credits

Tell the user that `verify_email`, `verify_list` and `check_threat` consume credits before calling them on large lists.
