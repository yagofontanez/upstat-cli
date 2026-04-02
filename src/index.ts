import { program } from "commander";
import inquirer from "inquirer";
import axios from "axios";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".upstat");
const BASE_URL = "https://api.upstat.online/api/v1";
const REFRESH_INTERVAL = 30;

type Lang = "pt" | "en";

const I18N: Record<Lang, Record<string, string>> = {
  pt: {
    title: "▲ UpStat CLI",
    connecting: "Conectando...",
    noMonitors: "Nenhum monitor encontrado.",
    monitors: "monitores",
    online: "online",
    offline: "offline",
    updating: "Atualizando a cada",
    seconds: "s",
    quit: "Ctrl+C para sair",
    invalidKey: "API key inválida. Rode: upstat logout",
    fetchError: "Erro ao buscar monitores",
    keyRemoved: "API key removida.",
    keySaved: "Configurações salvas em ~/.upstat",
    askKey: "Cole sua API key (Settings → API Keys no painel):",
    askKeyValidation: "A key deve começar com ups_",
    goodbye: "Até mais! 👋",
  },
  en: {
    title: "▲ UpStat CLI",
    connecting: "Connecting...",
    noMonitors: "No monitors found.",
    monitors: "monitors",
    online: "online",
    offline: "offline",
    updating: "Updating every",
    seconds: "s",
    quit: "Ctrl+C to quit",
    invalidKey: "Invalid API key. Run: upstat logout",
    fetchError: "Failed to fetch monitors",
    keySaved: "Config saved at ~/.upstat",
    keyRemoved: "API key removed.",
    askKey: "Paste your API key (Settings → API Keys in the dashboard):",
    askKeyValidation: "Key must start with ups_",
    goodbye: "Goodbye! 👋",
  },
};

function tr(lang: Lang, key: string): string {
  return I18N[lang][key] ?? key;
}

interface Config {
  apiKey: string;
  lang: Lang;
}

interface Monitor {
  id: string;
  name: string;
  url: string;
  status: "up" | "down";
  latency_ms: number | null;
  uptime_percentage: number;
}

function saveConfig(config: Config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config), "utf-8");
}

function loadConfig(): Config | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.apiKey && parsed.lang) return parsed as Config;
    return null;
  } catch {
    return null;
  }
}

function clearConfig() {
  if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
}

async function fetchMonitors(apiKey: string): Promise<Monitor[]> {
  const res = await axios.get(`${BASE_URL}/monitors`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.data;
}

function renderMonitors(monitors: Monitor[], lang: Lang) {
  const now = new Date().toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-US");
  console.clear();

  console.log(
    chalk.hex("#00D4AA").bold(tr(lang, "title")) + chalk.gray(` — ${now}`),
  );
  console.log(chalk.gray("─".repeat(60)));

  if (monitors.length === 0) {
    console.log(chalk.gray(`\n  ${tr(lang, "noMonitors")}\n`));
    return;
  }

  for (const m of monitors) {
    const isUp = m.status === "up";
    const dot = isUp ? chalk.hex("#00D4AA")("●") : chalk.red("●");
    const name = isUp
      ? chalk.white(m.name.padEnd(28))
      : chalk.red(m.name.padEnd(28));
    const latency =
      m.latency_ms != null
        ? chalk.gray(`${m.latency_ms}ms`.padEnd(8))
        : chalk.gray("—".padEnd(8));
    const uptime = isUp
      ? chalk.hex("#00D4AA")(`${m.uptime_percentage.toFixed(1)}%`)
      : chalk.red(`${m.uptime_percentage.toFixed(1)}%`);

    console.log(`  ${dot}  ${name} ${latency} ${uptime}`);
  }

  const up = monitors.filter((m) => m.status === "up").length;
  const down = monitors.length - up;

  console.log(chalk.gray("─".repeat(60)));
  console.log(
    chalk.gray(`  ${monitors.length} ${tr(lang, "monitors")}  ·  `) +
      chalk.hex("#00D4AA")(`${up} ${tr(lang, "online")}`) +
      (down > 0 ? chalk.red(`  ·  ${down} ${tr(lang, "offline")}`) : ""),
  );
  console.log(
    chalk.gray(
      `\n  ${tr(lang, "updating")} ${REFRESH_INTERVAL}${tr(lang, "seconds")} — ${tr(lang, "quit")}\n`,
    ),
  );
}

async function startWatch(config: Config) {
  const spinner = ora({
    text: tr(config.lang, "connecting"),
    color: "cyan",
  }).start();

  const run = async () => {
    try {
      const monitors = await fetchMonitors(config.apiKey);
      spinner.stop();
      renderMonitors(monitors, config.lang);
    } catch (err: any) {
      spinner.stop();
      if (err?.response?.status === 401) {
        console.log(chalk.red(`\n  ${tr(config.lang, "invalidKey")}\n`));
        process.exit(1);
      }
      console.log(
        chalk.red(`\n  ${tr(config.lang, "fetchError")}: ${err.message}\n`),
      );
    }
  };

  await run();
  const interval = setInterval(run, REFRESH_INTERVAL * 1000);

  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log(chalk.gray(`\n  ${tr(config.lang, "goodbye")}\n`));
    process.exit(0);
  });
}

program
  .name("upstat")
  .description("Monitor your UpStat services from the terminal")
  .version("0.1.0");

program
  .command("start")
  .description("Start real-time monitor dashboard")
  .action(async () => {
    let config = loadConfig();

    if (!config) {
      console.log(chalk.hex("#00D4AA").bold("\n▲ UpStat CLI\n"));

      const { lang } = await inquirer.prompt([
        {
          type: "list",
          name: "lang",
          message: "Language / Idioma:",
          choices: [
            { name: "Português", value: "pt" },
            { name: "English", value: "en" },
          ],
        },
      ]);

      const { key } = await inquirer.prompt([
        {
          type: "password",
          name: "key",
          message: tr(lang as Lang, "askKey"),
          mask: "*",
          validate: (v: string) =>
            v.startsWith("ups_") || tr(lang as Lang, "askKeyValidation"),
        },
      ]);

      config = { apiKey: key, lang: lang as Lang };
      saveConfig(config);
      console.log(chalk.gray(`  ${tr(config.lang, "keySaved")}\n`));
    }

    await startWatch(config);
  });

program
  .command("logout")
  .description("Remove saved API key and config")
  .action(() => {
    const config = loadConfig();
    const lang: Lang = config?.lang ?? "en";
    clearConfig();
    console.log(chalk.gray(`\n  ${tr(lang, "keyRemoved")}\n`));
  });

program.parse();
