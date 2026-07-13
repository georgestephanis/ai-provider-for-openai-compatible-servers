# AI Provider for OpenAI Compatible Servers

Connect self-hosted, OpenAI-compatible inference servers — **Ollama, LM Studio, vLLM, llama.cpp, LocalAI**, and anything else that speaks the OpenAI Chat Completions API — to the **WordPress AI Client**.

Once connected, any plugin or feature built on the WordPress AI Client can generate text using your own models, on your own hardware, with no data leaving your network.

## Features

- **Any OpenAI-compatible endpoint** — point it at `http://localhost:11434/v1` (Ollama's default) or any other base URL, local or remote.
- **Model autodetection** — queries the server's `/models` endpoint and registers everything it finds, or lets you hand-pick / manually specify models.
- **Connectors UI integration** — a full setup card on the WordPress Connectors settings screen with a built-in "Test Credentials" button that lists detected models.
- **Optional API key** — many local servers don't require one; a bearer token is sent only when configured.
- **Custom HTTP headers** — for reverse proxies, Cloudflare Access, or other gateways in front of your server.
- **Reasoning-model conveniences** — optionally disable thinking/reasoning blocks, and an R1-style message-folding mode that merges the system prompt into the first user message for models (e.g. DeepSeek-R1) that don't accept a `system` role.
- **Context length override** — cap `num_ctx` / `max_tokens` for memory-constrained servers.
- **Vision support toggle** — advertise image input capability for multimodal models (LLaVA, Llama 3.2 Vision, Qwen-VL, …).

## Requirements

- WordPress 6.9 or later (with the WordPress AI Client / Connectors available)
- PHP 7.4 or later
- A running OpenAI-compatible inference server reachable from your WordPress host

## Installation

1. Copy this directory to `wp-content/plugins/ai-provider-for-openai-compatible-servers/`.
2. Activate **AI Provider for OpenAI Compatible Servers** from the Plugins screen.
3. Go to **Settings → Connectors**, find **OpenAI Compatible**, and click **Set up**.
4. Enter your server's base URL (including the `/v1` suffix, e.g. `http://localhost:11434/v1`), an API key if your server requires one, click **Test Credentials**, and **Save**.

## Configuration reference

All settings are stored as WordPress options (settings group `connectors`) and exposed over the REST API to the Connectors UI:

| Option | Purpose |
| --- | --- |
| `connectors_ai_openai_compatible_servers_base_url` | Server base URL (default `http://localhost:11434/v1`) |
| `connectors_ai_openai_compatible_servers_api_key` | Bearer token, optional |
| `connectors_ai_openai_compatible_servers_model_mode` | `autodetect` or `manual` |
| `connectors_ai_openai_compatible_servers_models` | Comma-separated model IDs (manual mode) |
| `connectors_ai_openai_compatible_servers_context_length` | Context length override in tokens (`0` = off) |
| `connectors_ai_openai_compatible_servers_disable_thinking` | Suppress reasoning blocks on thinking models |
| `connectors_ai_openai_compatible_servers_headers` | Custom HTTP headers, JSON array of `{key, value}` |
| `connectors_ai_openai_compatible_servers_supports_images` | Advertise image input support |
| `connectors_ai_openai_compatible_servers_enable_r1_format` | Fold system prompt into first user message |

## Development

```bash
composer install   # PHP linting toolchain (PHPCS + WordPress sniffs)
npm install        # JS/CSS linting via @wordpress/scripts

composer lint      # PHP coding standards check
composer format    # Auto-fix PHP where possible
npm run lint:js    # ESLint (WordPress preset)
npm run lint:css   # Stylelint (WordPress preset)
npm run plugin-zip # Build a distributable zip
```

There is no compile step — `assets/js/connector-ui.js` is shipped as an ES module and enqueued via `wp_register_script_module()`.

See [AGENTS.md](AGENTS.md) for architecture notes and contributor/agent guidance.

## License

GPL-2.0-or-later. See [License URI](https://spdx.org/licenses/GPL-2.0-or-later.html).
