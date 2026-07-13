# AGENTS.md — AI Provider for OpenAI Compatible Servers

Guidance for AI agents (and humans) working in this repository.

## What this is

A WordPress plugin that registers a provider with the **WordPress AI Client** (`WordPress\AiClient`, bundled in WP core since 7.0 under `wp-includes/php-ai-client/`) so that any OpenAI-compatible inference server (Ollama, LM Studio, vLLM, llama.cpp, LocalAI, …) can be used as an AI backend. It also registers a custom setup card on the WordPress **Connectors** settings screen (`Settings → Connectors`, WP 7.0 experimental API).

## Layout

```
plugin.php                      Bootstrap: provider registration, settings, REST route,
                                cache-flush hooks, http_request_args filter, script enqueue.
includes/autoload.php           Minimal PSR-4 autoloader for WordPress\OpenAiCompatibleServersProvider\.
includes/Provider/              OpenAiCompatibleServersProvider — extends AbstractApiProvider
                                (from the AI Client SDK); base URL comes from an option.
includes/Metadata/              Model metadata directory — lists models from GET {base}/models,
                                or builds metadata from the manual model list option.
includes/Models/                Text generation model — extends
                                AbstractOpenAiCompatibleTextGenerationModel; injects custom
                                headers, context-length overrides, thinking toggles, and the
                                R1 system-prompt-folding behavior.
src/connector-ui.js             JSX source for the Connectors setup card. Compiled by
                                wp-scripts (see webpack.config.js / babel.config.js) into
                                build/, which is what gets enqueued.
build/                          Compiled script module + generated .asset.php (committed).
assets/images/logo.svg          Generic provider logo (fallback), used at runtime by the plugin.
assets/images/providers/        Brand icons for auto-detected backends (Ollama/vLLM/LM Studio),
                                used at runtime by the plugin.
assets/wordpress-org/           wp.org directory listing assets (icon, banner, screenshots) —
                                not shipped in the plugin zip, see .distignore.
blueprint.json                  WordPress Playground blueprint (linked from README.md).
readme.txt                      wp.org plugin directory readme.
```

## Key facts an agent should know before editing

- **Two coding styles coexist.** `includes/` follows the AI Client SDK's PSR-12 style (4-space indent, camelCase methods, `declare(strict_types=1)`). `plugin.php` is procedural, namespaced WordPress code. PHPCS here runs PSR-12 plus the WordPress **security, i18n, and escaping** sniffs — not full WPCS formatting. Match the style of the file you're in.
- **JS builds from src/ into build/.** Edit `src/connector-ui.js` (JSX), then run `npm run build`; never edit `build/` by hand. The build uses the classic JSX runtime with `createElement` from `window.wp.element` (see `babel.config.js`) because core provides no `react/jsx-runtime` script module — don't switch it to the automatic runtime. Everything bundles except `@wordpress/connectors`, which stays a static import resolved by core's script-modules import map (see `webpack.config.js`). Commit `build/` alongside source changes.
- **Core masks connector API keys.** Every `/wp/v2/settings` REST response replaces connector API-key values with a mask like `••••fj39` (`_wp_connectors_mask_api_key()` in core). The JS must never send the mask to a server or save it back (see `isMaskedKey` in `handleSave`), and the `test-connection` REST handler substitutes the stored option when it receives a mask-prefixed key. Core also validates AI-provider keys server-side on save and blanks them if validation fails.
- **Experimental APIs.** The UI depends on `@wordpress/connectors` `__experimentalRegisterConnector` / `__experimentalConnectorItem`. These can break between WordPress releases; when a WP upgrade breaks the settings card, look here first.
- **Provider registration is defensive.** `plugin.php` no-ops if `WordPress\AiClient\AiClient` doesn't exist, so the plugin activates safely without the AI Client. Keep that guard.
- **All nine settings** live in the `connectors` settings group with `show_in_rest => true`; the JS saves them through `saveEntityRecord('root', 'site', …)` (the `/wp/v2/settings` endpoint), so any new setting must be registered in PHP *and* wired into the JS temp-state/save/remove handlers.
- **Option prefix** is `connectors_ai_openai_compatible_servers_`. Changing an option name is a breaking change for existing installs; add migration code if you must.
- **Cache invalidation**: every `update_option_{setting}` hook calls `flush_models_cache()`. New settings that affect model listing need the same hook. (Note: `update_option_*` does not fire on first `add_option()` — known quirk.)
- **SSRF surface**: the `openai-compatible-servers/v1/test-connection` REST route and the `http_request_args` filter deliberately set `reject_unsafe_urls = false` so local/LAN servers work. Any change here is security-sensitive: keep the `manage_options` permission callback, and don't widen the URL match.
- **Provider detection is best-effort by design.** `detect_provider_type()` in `plugin.php` probes auxiliary, non-OpenAI-spec endpoints to guess which server is behind the configured base URL: Ollama's `GET {origin}/` (literal body `Ollama is running`), vLLM's `GET {origin}/version` (JSON `version` field), and LM Studio's `GET {origin}/api/v0/models` (JSON `data` array). None of these are guaranteed — a reverse proxy can mask any of them — so any probe failure (`WP_Error`, non-200, bad JSON) silently falls through to `null` rather than erroring; don't "fix" this into throwing or logging. The result rides along on the `test-connection` REST response as `provider`. Brand icons for a positive match live in `assets/images/providers/` (from LobeHub's MIT-licensed `lobe-icons`) and are resolved client-side in `src/connector-ui.js` via `new URL('../assets/images/providers/{slug}.svg', import.meta.url).href` — no PHP-to-JS data-passing needed since they're static build assets. Undetected servers keep the generic `assets/images/logo.svg`.
- **Text domain** is `ai-provider-for-openai-compatible-servers` and must match the plugin directory name. Every `__()`/`sprintf(__())` in PHP *and* JS needs it.

## Commands

```bash
composer install          # once
composer lint             # phpcs
composer format           # phpcbf auto-fix
npm install               # once
npm run build             # compile src/ (JSX) into build/
npm run start             # build in watch mode
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
