# TODO

Issues flagged during the 2026-07-13 code review, roughly in priority order. Check items off as they're resolved.

## 🔴 Urgent — before sharing or publishing anywhere

- [x] **Remove the API-key `console.log`.** `assets/js/connector-ui.js` (`handleTestCredentials`) logs the API key to the browser console: `console.log('[AI Connector] Testing connection. API Key value:', apiKeyToUse)`.
- [ ] **Rename the plugin directory** from `ai-connector-for-openai-compatible-servers` to `ai-provider-for-openai-compatible-servers` so it matches the new text domain (required for wp.org i18n). The folder rename needs to happen outside an active session, and the plugin must be reactivated afterwards (WP stores the active-plugin path).

## 🟠 Bugs / correctness

- [x] **Context length ≠ `max_tokens`.** `src/Models/OpenAiCompatibleServersTextGenerationModel.php` `createRequest()` sets `max_tokens` to the configured *context length*. In the OpenAI API, `max_tokens` caps output tokens; setting it to e.g. 65536 makes many servers reject the request. Also, `num_ctx` is an Ollama *native-API* option and is ignored by Ollama's OpenAI-compatible endpoint, so it's likely a no-op. Decide what this setting actually means (probably: separate "max output tokens" setting; drop or document `num_ctx`).
- [x] **`disable_thinking` sends non-standard params unconditionally** (`thinking`, `max_thinking_tokens`, `reasoning_effort`). Strict servers (e.g. vLLM in some configs, Apfel) reject unknown body fields with a 400. Send these selectively / make them configurable rather than all three at once.
- [ ] **Model cache not flushed on first save.** The `update_option_{option}` hooks in `plugin.php` don't fire when an option is first created (`add_option`). Add matching `add_option_{option}` hooks, or hook `updated_option`/`added_option` generically.
- [ ] **API-key field read via `document.getElementById()` hack.** `handleTestCredentials` and `handleSave` in `connector-ui.js` read the input's DOM value instead of the `tempApiKey` React state — that's masking a state-sync bug. Fix the state handling and drop the DOM reads.
- [ ] **No debounce on model autodetection.** The `useEffect` watching `tempBaseUrl`/`tempApiKey` fires a REST request (which triggers a server-side HTTP request) on *every keystroke*. Debounce it (~500ms) or fetch only on blur / "Test Credentials".
- [ ] **Mangled plugin header.** `plugin.php` header block had a garbled description and comment structure (partially cleaned up already). Verify the full docblock: `Plugin URI` points to `github.com/WordPress/ai-provider-for-openai-compatible-servers`, which may not exist; `Author: Antigravity` — confirm intended author/URI.

## 🟡 Security hardening (functional as-is, but tighten)

- [ ] **Constrain the `test-connection` SSRF surface.** `openai-compatible-servers/v1/test-connection` fetches an arbitrary user-supplied URL with `reject_unsafe_urls => false` and echoes the response back. It's gated by `manage_options`, which is defensible, but: validate the scheme (http/https only), consider limiting redirects (`'redirection' => 0`), and don't return raw upstream response bodies in error messages.
- [ ] **Validate custom header names/values.** Both the REST handler (`plugin.php`) and `createRequest()` pass user-provided header keys/values through unvalidated. Reject invalid header-name characters (CR/LF at minimum).
- [ ] **`http_request_args` filter scope.** `allow_local_requests_for_our_connector()` disables `reject_unsafe_urls` via a `strpos(...) === 0` prefix match on the configured base URL. Fine, but make sure the match can't be broadened accidentally (e.g. base URL `http://host` also matches `http://host.evil.com` — compare against `rtrim($base_url,'/') . '/'` or parse hosts).

## 🟢 Cleanup / polish

- [ ] **Add `uninstall.php`** deleting all nine `connectors_ai_openai_compatible_servers_*` options.
- [ ] **Experimental API dependency.** The UI relies on `__experimentalRegisterConnector` / `__experimentalConnectorItem` from `@wordpress/connectors` — expect churn across WP releases; re-verify on each core update.
- [ ] **JS lint pass.** `npm run lint:js` currently reports ~665 errors: mostly Prettier tabs-vs-spaces (auto-fixable via `npm run lint:js:fix`), plus real items — `no-console` statements, two `__()` calls missing the text domain (`'Checking…'`, `'Cancel'`, `'Edit'`, `'Set up'` around line 474), missing translator comments for `sprintf`-style strings, unused `plugin` prop and `isFetchingModels`, and two `react-hooks/exhaustive-deps` warnings.
- [ ] **PHP lint pass.** `composer lint` reports 44 errors / 23 warnings: 43 auto-fixable via `composer format`; real items are one unescaped exception message (`WordPress.Security.EscapeOutput.ExceptionNotEscaped` in `src/Provider/OpenAiCompatibleServersProvider.php`), one missing translators comment in `plugin.php`, and long-line warnings.
- [ ] **Script module version is hardcoded** (`'1.0.0'`) in `wp_register_script_module()` — define a plugin version constant and reuse it (or use `filemtime()` in dev).
- [ ] **Inconsistent REST error statuses.** `handle_test_connection_rest()` returns HTTP 400 for a missing base URL but HTTP 200 with `success: false` for all other failures — pick one convention.
- [ ] **`readme.txt` placeholders.** `Contributors: wordpressdotorg` is a placeholder — set the real wp.org username(s) before submission. Optional: add Screenshots and Donate link sections (validator notes).
