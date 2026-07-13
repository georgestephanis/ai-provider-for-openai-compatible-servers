# AGENTS.md — AI Provider for OpenAI Compatible Servers

Guidance for AI agents (and humans) working in this repository.

## What this is

A WordPress plugin that registers a provider with the **WordPress AI Client** (`WordPress\AiClient`) so that any OpenAI-compatible inference server (Ollama, LM Studio, vLLM, llama.cpp, LocalAI, …) can be used as an AI backend. It also registers a custom setup card on the WordPress **Connectors** settings screen (`Settings → Connectors`, WP 6.9+ experimental API).

## Layout

```
plugin.php                      Bootstrap: provider registration, settings, REST route,
                                cache-flush hooks, http_request_args filter, script enqueue.
src/autoload.php                Minimal PSR-4 autoloader for WordPress\OpenAiCompatibleServersProvider\.
src/Provider/                   OpenAiCompatibleServersProvider — extends AbstractApiProvider
                                (from the AI Client SDK); base URL comes from an option.
src/Metadata/                   Model metadata directory — lists models from GET {base}/models,
                                or builds metadata from the manual model list option.
src/Models/                     Text generation model — extends
                                AbstractOpenAiCompatibleTextGenerationModel; injects custom
                                headers, context-length overrides, thinking toggles, and the
                                R1 system-prompt-folding behavior.
assets/js/connector-ui.js       ES module (no build step) rendering the Connectors setup card.
                                Registered with wp_register_script_module and a static import
                                of @wordpress/connectors.
assets/images/logo.svg          Provider logo.
readme.txt                      wp.org plugin directory readme.
```

## Key facts an agent should know before editing

- **Two coding styles coexist.** `src/` follows the AI Client SDK's PSR-12 style (4-space indent, camelCase methods, `declare(strict_types=1)`). `plugin.php` is procedural, namespaced WordPress code. PHPCS here runs PSR-12 plus the WordPress **security, i18n, and escaping** sniffs — not full WPCS formatting. Match the style of the file you're in.
- **No JS build step.** `connector-ui.js` is enqueued directly as a script module. Do not introduce JSX or npm-bundled imports without also adding a `wp-scripts build` pipeline and changing the enqueue. It uses `createElement` (`el`) on purpose.
- **Experimental APIs.** The UI depends on `@wordpress/connectors` `__experimentalRegisterConnector` / `__experimentalConnectorItem`. These can break between WordPress releases; when a WP upgrade breaks the settings card, look here first.
- **Provider registration is defensive.** `plugin.php` no-ops if `WordPress\AiClient\AiClient` doesn't exist, so the plugin activates safely without the AI Client. Keep that guard.
- **All nine settings** live in the `connectors` settings group with `show_in_rest => true`; the JS saves them through `saveEntityRecord('root', 'site', …)` (the `/wp/v2/settings` endpoint), so any new setting must be registered in PHP *and* wired into the JS temp-state/save/remove handlers.
- **Option prefix** is `connectors_ai_openai_compatible_servers_`. Changing an option name is a breaking change for existing installs; add migration code if you must.
- **Cache invalidation**: every `update_option_{setting}` hook calls `flush_models_cache()`. New settings that affect model listing need the same hook. (Note: `update_option_*` does not fire on first `add_option()` — known quirk.)
- **SSRF surface**: the `openai-compatible-servers/v1/test-connection` REST route and the `http_request_args` filter deliberately set `reject_unsafe_urls = false` so local/LAN servers work. Any change here is security-sensitive: keep the `manage_options` permission callback, and don't widen the URL match.
- **Text domain** is `ai-provider-for-openai-compatible-servers` and must match the plugin directory name. Every `__()`/`sprintf(__())` in PHP *and* JS needs it.

## Commands

```bash
composer install          # once
composer lint             # phpcs
composer format           # phpcbf auto-fix
npm install               # once
npm run lint:js           # eslint via @wordpress/scripts
npm run lint:css          # stylelint via @wordpress/scripts
npm run plugin-zip        # package for distribution
```

There is no PHPUnit suite yet. Manual testing: point the connector at a local server (e.g. `ollama serve`, then base URL `http://localhost:11434/v1`) and use the "Test Credentials" button; or exercise the model directly through the AI Client.

## Do not

- Do not commit `scratch/`, `conversation-log.jsonl`, or anything containing real endpoints/API keys — these are local-only and excluded via `.gitignore`/`.distignore`.
- Do not remove the `class_exists(AiClient::class)` guards.
- Do not send extra non-standard body params unconditionally in `createRequest()` — some strict servers reject unknown fields with a 400; gate new params behind settings.
- Do not log API keys (in PHP or `console.log`).
