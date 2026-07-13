=== AI Provider for OpenAI Compatible Servers ===
Contributors: georgestephanis
Tags: ai, ollama, openai, llm, local ai
Requires at least: 7.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://spdx.org/licenses/GPL-2.0-or-later.html

Connect local or self-hosted OpenAI-compatible servers (Ollama, LM Studio, vLLM, and more) to the WordPress AI Client.

== Description ==

This plugin registers a provider for the WordPress AI Client that talks to any server implementing the OpenAI Chat Completions API — including Ollama, LM Studio, vLLM, llama.cpp, and LocalAI.

Run AI features in WordPress against models on your own hardware. No third-party AI service, no per-token billing, and no content leaving your network.

= Features =

* Connect to any OpenAI-compatible base URL, local or remote (defaults to Ollama's `http://localhost:11434/v1`).
* Autodetect available models from the server's `/models` endpoint, or specify models manually.
* Setup card on the Connectors settings screen with a one-click connection test.
* Optional API key (bearer token) for servers that require authentication.
* Custom HTTP headers for reverse proxies and gateways.
* Advanced options for reasoning models: disable thinking blocks, and an R1-style message format that folds the system prompt into the first user message (needed for DeepSeek-R1).
* Context length override and a vision/multimodal support toggle.

= Requirements =

* The WordPress AI Client must be available (WordPress 6.9+).
* A running OpenAI-compatible inference server reachable from your web server.

== Installation ==

1. Install and activate the plugin.
2. Go to Settings → Connectors and locate "OpenAI Compatible".
3. Click "Set up", enter your server's base URL (including `/v1`), and an API key if needed.
4. Click "Test Credentials" to verify the connection and detect models, then Save.

== Frequently Asked Questions ==

= Which servers are supported? =

Anything that implements the OpenAI-compatible `/v1/models` and `/v1/chat/completions` endpoints: Ollama, LM Studio, vLLM, llama.cpp server, LocalAI, and many others.

= Do I need an API key? =

Only if your server requires one. Local servers like Ollama usually don't; leave the field empty or use a placeholder value.

= Can my server run on a different machine? =

Yes. Enter any base URL reachable from your WordPress host. The plugin allows requests to the configured base URL even when it resolves to a local/private address.

= Does this send my content to a third party? =

No. Requests go only to the server base URL you configure.

== Changelog ==

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
