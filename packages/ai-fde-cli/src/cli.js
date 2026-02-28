#!/usr/bin/env node
import { isTruthy, parseArgs } from "./lib/utils.js";
import * as log from "./lib/log.js";
import { runInit } from "./commands/init.js";
import { runInstrument } from "./commands/instrument.js";
import { runUpload } from "./commands/upload.js";
import { runConfigShow } from "./commands/config.js";
import { runAdd } from "./commands/add.js";
import { runCollisonInstall } from "./commands/collison-install.js";

function printHelp() {
	process.stdout.write(`ai-fde - Relay hackathon instrumentation CLI

Usage:
  ai-fde collison-install [--yes]
    [--project <name>] [--frontend <dir>] [--backend <dir>] [--api <url>]
    [--skip-instrument] [--skip-upload] [--skip-ui]
    [--skip-codex-logs]
    [--rerun-instrument] [--rerun-upload] [--rerun-ui]
    [--overwrite] [--tsx|--jsx]

Options:
  --yes              Non-interactive mode (auto-skips already-done steps)
  --skip-*           Skip a specific step
  --skip-codex-logs  Skip Codex CLI LLM log-instrumentation pass
  --rerun-*          Force rerun for a specific step
  --overwrite        Replace existing generated UI/provider files
  --tsx              Force TSX UI templates
  --jsx              Force JSX UI templates
  --silent         Reduce logging output
`);
}

function createLogger(options = {}) {
	const silent =
		options.silent === undefined ? false : isTruthy(options.silent);
	if (silent) {
		return {
			info: () => {},
			success: () => {},
			warn: () => {},
			error: () => {},
		};
	}

	return log;
}

function printInstrumentationSummary(summary, logger) {
	const frontend = summary.frontend;
	const backend = summary.backend;

	logger.success("Instrumentation complete.");
	logger.info(`Frontend helper: ${frontend.helperFile || "n/a"}`);
	logger.info(
		`Frontend patched: next-layout=${frontend.nextLayoutPatched}, main-entry=${frontend.mainEntryPatched}`,
	);
	logger.info(
		`Backend type: ${backend.backendType}, entry-patched=${backend.entryPatched}`,
	);

	if (frontend.htmlFilesAnnotated.length > 0) {
		logger.info(
			`Annotated ${frontend.htmlFilesAnnotated.length} HTML file(s) with relay IDs.`,
		);
	}
}

function printUploadSummary(upload, logger) {
	if (upload.skipped) {
		logger.warn("No files matched upload filters. Nothing was uploaded.");
		return;
	}

	logger.success(`Upload complete. ${upload.stats.totalCount} file(s) sent.`);
}

function printAddSummary(result) {
	if (result.mode === "list") {
		process.stdout.write("Available components:\n");
		for (const item of result.available) {
			process.stdout.write(`- ${item.name}: ${item.description}\n`);
		}
		return;
	}

	process.stdout.write(
		`Installed components (${result.useTypeScript ? "tsx" : "jsx"}): ${result.installed.join(", ")}\n`,
	);
	process.stdout.write(`Target directory: ${result.installRoot}\n`);
	for (const file of result.files) {
		const status = file.written ? "created" : "skipped";
		process.stdout.write(`- [${status}] ${file.relativePath}\n`);
	}

	if (result.installed.includes("launcher")) {
		process.stdout.write("\nMount the launcher in your app root (example):\n");
		process.stdout.write("// adjust this import to your project path/alias\n");
		process.stdout.write(
			"import RelayLauncher from './components/relay-engine/relay-launcher'\n",
		);
		process.stdout.write("<RelayLauncher />\n");
	}
}

function printCollisonSummary(result) {
	process.stdout.write("\nCollison install summary:\n");
	process.stdout.write(`- project: ${result.config.project}\n`);
	process.stdout.write(`- frontend: ${result.config.frontendDir}\n`);
	process.stdout.write(`- backend: ${result.config.backendDir}\n`);
	if (result.uploadError) {
		process.stdout.write(`- upload: failed (${result.uploadError})\n`);
	} else if (result.uploadResult) {
		process.stdout.write(
			`- upload: ${result.uploadResult.stats.totalCount} file(s)\n`,
		);
	} else {
		process.stdout.write("- upload: skipped\n");
	}
	if (result.uiResult) {
		if (result.uiResult.skipped) {
			process.stdout.write(`- ui step: skipped (${result.uiResult.reason})\n`);
		} else {
			process.stdout.write(`- provider: ${result.uiResult.providerPath}\n`);
			process.stdout.write(`- posthog provider: ${result.uiResult.posthogProviderPath}\n`);
			if (result.uiResult.dependenciesAdded?.length) {
				process.stdout.write(
					`- deps added: ${result.uiResult.dependenciesAdded.join(", ")}\n`,
				);
			}
			if (!result.uiResult.mounted) {
				process.stdout.write("- provider mount: manual verification needed\n");
			}
		}
	}
	process.stdout.write(`- frontend env: ${result.config.frontendDir}/.env.local\n`);
	process.stdout.write(`- backend env: ${result.config.backendDir}/.env\n`);
}

export async function main(
	rawArgv = process.argv.slice(2),
	cwd = process.cwd(),
) {
	if (
		rawArgv.length === 0 ||
		rawArgv.includes("--help") ||
		rawArgv[0] === "help"
	) {
		printHelp();
		return 0;
	}

	const command = rawArgv[0];
	const hasSubcommand = command === "hook" || command === "config";
	const subcommand = hasSubcommand ? rawArgv[1] : null;
	const optionStart = hasSubcommand ? 2 : 1;
	const { options, positionals } = parseArgs(rawArgv.slice(optionStart));
	const logger = createLogger(options);

	try {
		if (command === "init") {
			const result = await runInit({ cwd, options, logger });

			if (result.instrumentation) {
				printInstrumentationSummary(result.instrumentation, logger);
			}
			if (result.upload) {
				printUploadSummary(result.upload, logger);
			}
			return 0;
		}

		if (command === "collison-install") {
			const result = await runCollisonInstall({ cwd, options, logger });
			printCollisonSummary(result);
			return 0;
		}

		if (command === "instrument") {
			const result = runInstrument({ cwd, options, logger });
			printInstrumentationSummary(result, logger);
			return 0;
		}

		if (command === "add") {
			const result = runAdd({ cwd, options, components: positionals, logger });
			printAddSummary(result);
			return 0;
		}

		if (command === "upload") {
			const result = await runUpload({ cwd, options, logger });
			printUploadSummary(result, logger);
			return 0;
		}

		if (command === "hook" && subcommand === "upload") {
			const mergedOptions = {
				...options,
				stagedOnly:
					options["staged-only"] !== undefined ? options["staged-only"] : true,
			};
			const result = await runUpload({ cwd, options: mergedOptions, logger });
			if (!options["from-hook"]) {
				printUploadSummary(result, logger);
			}
			return 0;
		}

		if (command === "config" && subcommand === "show") {
			const config = runConfigShow({ cwd });
			process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
			return 0;
		}

		printHelp();
		return 1;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error(message);
		return 1;
	}
}
