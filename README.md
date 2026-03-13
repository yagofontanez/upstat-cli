# upstat-cli

Monitor your [UpStat](https://upstat.online) services directly from the terminal.

```
▲ UpStat CLI — 21:42:10
────────────────────────────────────────────────────────────
  ●  My API                      142ms    99.8%
  ●  Dashboard                   89ms     100.0%
  ●  Blog                        —        98.3%
────────────────────────────────────────────────────────────
  3 monitors  ·  2 online  ·  1 offline

  Updating every 30s — Ctrl+C to quit
```

## Installation

```bash
npm install -g upstat-cli
```

## Usage

```bash
upstat start
```

On the first run, you'll be prompted for your API key. It gets saved locally at `~/.upstat` so you don't have to enter it again.

```bash
# Remove your saved API key
upstat logout
```

## Getting your API key

1. Log in to your [UpStat dashboard](https://upstat.online)
2. Go to **Integrations → API Keys**
3. Click **New API Key**
4. Copy the key (starts with `ups_`)

## Commands

| Command         | Description                       |
| --------------- | --------------------------------- |
| `upstat start`  | Start real-time monitor dashboard |
| `upstat logout` | Remove saved API key              |

## Requirements

- Node.js 18+
- An [UpStat](https://upstat.online) account with at least one monitor

## License

MIT
