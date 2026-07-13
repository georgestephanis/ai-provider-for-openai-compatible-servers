<?php

/**
 * Plugin Name: AI Provider for OpenAI Compatible Servers
 * Plugin URI: https://github.com/georgestephanis/ai-provider-for-openai-compatible-servers
 * Description: Run local OpenAI-compatible servers (LM Studio, Ollama, vLLM, etc.) with the WordPress AI Client.
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Version: 1.0.0
 * Author: George Stephanis
 * Author URI: https://georgestephanis.wordpress.com
 * License: GPL-2.0-or-later
 * License URI: https://spdx.org/licenses/GPL-2.0-or-later.html
 * Text Domain: ai-provider-for-openai-compatible-servers
 *
 * @package WordPress\OpenAiCompatibleServersProvider
 */

declare(strict_types=1);

namespace WordPress\OpenAiCompatibleServersProvider;

use WordPress\AiClient\AiClient;
use WordPress\OpenAiCompatibleServersProvider\Provider\OpenAiCompatibleServersProvider;

if (!defined('ABSPATH')) {
    return;
}

const VERSION = '1.0.0';

require_once __DIR__ . '/src/autoload.php';

/**
 * Registers the OpenAI Compatible Servers provider with the AI Client.
 *
 * @since 1.0.0
 *
 * @return void
 */
function register_provider(): void
{
    if (!class_exists(AiClient::class)) {
        return;
    }

    $registry = AiClient::defaultRegistry();

    if ($registry->hasProvider(OpenAiCompatibleServersProvider::class)) {
        return;
    }

    $registry->registerProvider(OpenAiCompatibleServersProvider::class);
}
add_action('init', __NAMESPACE__ . '\\register_provider', 5);

/**
 * Registers settings for the OpenAI Compatible Servers connector.
 *
 * @since 1.0.0
 *
 * @return void
 */
function register_settings(): void
{
    // API Key setting.
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_api_key',
        array(
            'type'              => 'string',
            'label'             => __(
                'OpenAI Compatible Servers API Key',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'API key for the OpenAI Compatible Servers connector.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => '',
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
        )
    );

    // Base URL setting.
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_base_url',
        array(
            'type'              => 'string',
            'label'             => __(
                'OpenAI Compatible Servers Base URL',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Base URL for the OpenAI Compatible Servers connector.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => 'http://localhost:11434/v1',
            'show_in_rest'      => true,
            'sanitize_callback' => 'esc_url_raw',
        )
    );

    // Model mode setting (autodetect or manual).
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_model_mode',
        array(
            'type'              => 'string',
            'label'             => __(
                'Model Selection Mode',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Model selection mode (autodetect or manual).',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => 'autodetect',
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
        )
    );

    // Manual models listing setting (comma-separated list of models).
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_models',
        array(
            'type'              => 'string',
            'label'             => __(
                'Manual Model List',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'List of manually specified models.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => '',
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
        )
    );

    // Context length setting.
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_context_length',
        array(
            'type'              => 'integer',
            'label'             => __(
                'Context Length',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Maximum context length in tokens.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => 0,
            'show_in_rest'      => true,
            'sanitize_callback' => 'absint',
        )
    );

    // Disable thinking setting.
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_disable_thinking',
        array(
            'type'              => 'boolean',
            'label'             => __(
                'Disable Thinking',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Disable thinking/reasoning blocks on thinking models.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => false,
            'show_in_rest'      => true,
            'sanitize_callback' => 'rest_sanitize_boolean',
        )
    );

    // Custom HTTP headers (JSON string).
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_headers',
        array(
            'type'              => 'string',
            'label'             => __(
                'Custom HTTP Headers',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Custom headers to pass with each request.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => '[]',
            'show_in_rest'      => true,
            'sanitize_callback' => 'sanitize_text_field',
        )
    );

    // Supports images / multimodal capabilities.
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_supports_images',
        array(
            'type'              => 'boolean',
            'label'             => __(
                'Supports Images',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Toggle image/multimodal support on the model.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => false,
            'show_in_rest'      => true,
            'sanitize_callback' => 'rest_sanitize_boolean',
        )
    );

    // Enable DeepSeek R1 system prompt folding format.
    register_setting(
        'connectors',
        'connectors_ai_openai_compatible_servers_enable_r1_format',
        array(
            'type'              => 'boolean',
            'label'             => __(
                'Enable R1 Message Format',
                'ai-provider-for-openai-compatible-servers'
            ),
            'description'       => __(
                'Enables message folding for R1 reasoning compatibility.',
                'ai-provider-for-openai-compatible-servers'
            ),
            'default'           => false,
            'show_in_rest'      => true,
            'sanitize_callback' => 'rest_sanitize_boolean',
        )
    );
}
add_action('init', __NAMESPACE__ . '\\register_settings', 10);

/**
 * Flush models cache on settings changes.
 *
 * @since 1.0.0
 *
 * @return void
 */
function flush_models_cache(): void
{
    try {
        if (!class_exists(AiClient::class)) {
            return;
        }
        $provider = AiClient::defaultRegistry()->getProvider('openai-compatible-servers');
        if ($provider) {
            $directory = $provider::modelMetadataDirectory();
            if (method_exists($directory, 'invalidateCaches')) {
                $directory->invalidateCaches();
            }
        }
    } catch (\Throwable $e) {
        // Fail silently.
    }
}
$connector_option_names = array(
    'connectors_ai_openai_compatible_servers_base_url',
    'connectors_ai_openai_compatible_servers_api_key',
    'connectors_ai_openai_compatible_servers_model_mode',
    'connectors_ai_openai_compatible_servers_models',
    'connectors_ai_openai_compatible_servers_context_length',
    'connectors_ai_openai_compatible_servers_disable_thinking',
    'connectors_ai_openai_compatible_servers_headers',
    'connectors_ai_openai_compatible_servers_supports_images',
    'connectors_ai_openai_compatible_servers_enable_r1_format',
);
foreach ($connector_option_names as $connector_option_name) {
    // `update_option_{option}` only fires on subsequent saves; `add_option_{option}` covers
    // the option's first-ever save, which otherwise leaves a stale (or empty) models cache.
    add_action('update_option_' . $connector_option_name, __NAMESPACE__ . '\\flush_models_cache');
    add_action('add_option_' . $connector_option_name, __NAMESPACE__ . '\\flush_models_cache');
}
unset($connector_option_names, $connector_option_name);

/**
 * Checks whether a request URL targets the same scheme+host+port as a configured base URL.
 *
 * Used instead of a raw string-prefix match, which would let e.g. a base URL of
 * `http://host` also match `http://host.evil.com`.
 *
 * @since 1.0.0
 *
 * @param string $url      Request URL being checked.
 * @param string $base_url Configured base URL to match against.
 * @return bool Whether the URL's origin matches the base URL's origin.
 */
function url_matches_base_url_origin(string $url, string $base_url): bool
{
    $url_parts = wp_parse_url($url);
    $base_parts = wp_parse_url($base_url);

    if (!$url_parts || !$base_parts || empty($url_parts['host']) || empty($base_parts['host'])) {
        return false;
    }

    $url_scheme = strtolower($url_parts['scheme'] ?? '');
    $base_scheme = strtolower($base_parts['scheme'] ?? '');
    $url_port = $url_parts['port'] ?? ('https' === $url_scheme ? 443 : 80);
    $base_port = $base_parts['port'] ?? ('https' === $base_scheme ? 443 : 80);

    return $url_scheme === $base_scheme
        && strtolower($url_parts['host']) === strtolower($base_parts['host'])
        && $url_port === $base_port;
}

/**
 * Filter HTTP request arguments to allow local server connections.
 *
 * @since 1.0.0
 *
 * @param array  $args Request arguments.
 * @param string $url  Request URL.
 * @return array Modified request arguments.
 */
function allow_local_requests_for_our_connector(array $args, string $url): array
{
    $base_url = get_option('connectors_ai_openai_compatible_servers_base_url');
    if ($base_url && url_matches_base_url_origin($url, $base_url)) {
        $args['reject_unsafe_urls'] = false;
    }
    return $args;
}
add_filter('http_request_args', __NAMESPACE__ . '\\allow_local_requests_for_our_connector', 10, 2);

/**
 * Register custom REST API routes for connection tests.
 *
 * @since 1.0.0
 *
 * @return void
 */
function register_rest_routes(): void
{
    register_rest_route(
        'openai-compatible-servers/v1',
        '/test-connection',
        array(
            'methods'             => 'POST',
            'callback'            => __NAMESPACE__ . '\\handle_test_connection_rest',
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        )
    );
}
add_action('rest_api_init', __NAMESPACE__ . '\\register_rest_routes');

/**
 * Checks whether a string is a syntactically valid HTTP header field name.
 *
 * @since 1.0.0
 *
 * @param string $name Header field name.
 * @return bool Whether the name is a valid HTTP token.
 */
function is_valid_http_header_name(string $name): bool
{
    return (bool) preg_match('/^[!#$%&\'*+\-.^_`|~0-9A-Za-z]+$/', $name);
}

/**
 * Checks whether a string is safe to use as an HTTP header field value.
 *
 * @since 1.0.0
 *
 * @param string $value Header field value.
 * @return bool Whether the value contains no CR/LF characters.
 */
function is_valid_http_header_value(string $value): bool
{
    return false === strpos($value, "\r") && false === strpos($value, "\n");
}

/**
 * Handle connection test REST API request.
 *
 * @since 1.0.0
 *
 * @param \WP_REST_Request $request The REST request.
 * @return \WP_REST_Response The REST response.
 */
function handle_test_connection_rest(\WP_REST_Request $request): \WP_REST_Response
{
    $params = $request->get_json_params();
    $base_url = isset($params['base_url']) ? sanitize_text_field($params['base_url']) : '';
    $api_key = isset($params['api_key']) ? sanitize_text_field($params['api_key']) : '';
    $custom_headers = isset($params['headers']) ? $params['headers'] : array();

    // Core masks connector API keys in REST settings responses ("••••fj39"), so the UI
    // may echo the mask back rather than the real key. Substitute the stored key.
    if (preg_match('/^\x{2022}/u', $api_key)) {
        $api_key = (string) get_option('connectors_ai_openai_compatible_servers_api_key', '');
    }

    if (empty($base_url)) {
        return new \WP_REST_Response(array(
            'success' => false,
            'message' => __('Base URL is required.', 'ai-provider-for-openai-compatible-servers'),
        ), 200);
    }

    $scheme = strtolower((string) wp_parse_url($base_url, PHP_URL_SCHEME));
    if (!in_array($scheme, array('http', 'https'), true)) {
        return new \WP_REST_Response(array(
            'success' => false,
            'message' => __('Base URL must use the http or https scheme.', 'ai-provider-for-openai-compatible-servers'),
        ), 200);
    }

    $clean_url = rtrim($base_url, '/') . '/models';

    $headers = array(
        'Content-Type' => 'application/json',
    );
    if (!empty($api_key)) {
        $headers['Authorization'] = 'Bearer ' . $api_key;
    }

    // Merge custom headers, skipping anything that isn't a syntactically valid header.
    if (is_array($custom_headers)) {
        foreach ($custom_headers as $header) {
            if (!isset($header['key'], $header['value'])) {
                continue;
            }
            $key = trim((string) $header['key']);
            $value = (string) $header['value'];
            if ('' === $key || !is_valid_http_header_name($key) || !is_valid_http_header_value($value)) {
                continue;
            }
            $headers[$key] = $value;
        }
    }

    // Temporarily add filter to allow local request target if it matches our base URL.
    $allow_local_filter = function (array $args, string $url) use ($base_url) {
        if (url_matches_base_url_origin($url, $base_url)) {
            $args['reject_unsafe_urls'] = false;
        }
        return $args;
    };
    add_filter('http_request_args', $allow_local_filter, 10, 2);

    $response = wp_remote_get($clean_url, array(
        'headers'    => $headers,
        'timeout'    => 15,
        'redirection' => 0,
    ));

    remove_filter('http_request_args', $allow_local_filter);

    if (is_wp_error($response)) {
        return new \WP_REST_Response(array(
            'success' => false,
            'message' => $response->get_error_message(),
        ), 200);
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($code < 200 || $code >= 300) {
        return new \WP_REST_Response(array(
            'success' => false,
            /* translators: %d: HTTP status code */
            'message' => sprintf(__('Server returned status %d.', 'ai-provider-for-openai-compatible-servers'), $code),
        ), 200);
    }

    $data = json_decode($body, true);
    if (!is_array($data) || !isset($data['data'])) {
        return new \WP_REST_Response(array(
            'success' => false,
            'message' => __(
                'Invalid JSON response from server /models endpoint.',
                'ai-provider-for-openai-compatible-servers'
            ),
        ), 200);
    }

    return new \WP_REST_Response(array(
        'success' => true,
        'data'    => $data['data'],
    ), 200);
}

/**
 * Enqueues scripts and styles for the Connectors settings page.
 *
 * @since 1.0.0
 *
 * @param string $hook_suffix The current admin page hook.
 * @return void
 */
function enqueue_connector_scripts(string $hook_suffix): void
{
    $current_screen = get_current_screen();
    $is_connectors_page = (
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only page-identity check, no state change.
        (isset($_GET['page']) && 'options-connectors-wp-admin' === $_GET['page']) ||
        ($current_screen && 'options-connectors' === $current_screen->id)
    );

    if (!$is_connectors_page) {
        return;
    }

    wp_register_script_module(
        'openai-compatible-servers-connector-ui',
        plugin_dir_url(__FILE__) . 'assets/js/connector-ui.js',
        array(
            array(
                'import' => 'static',
                'id'     => '@wordpress/connectors',
            ),
        ),
        VERSION
    );
    wp_enqueue_script_module('openai-compatible-servers-connector-ui');
}
add_action('admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_connector_scripts');
