<?php
/**
 * Uninstall handler: removes all options created by this plugin.
 *
 * @since 1.0.0
 *
 * @package WordPress\OpenAiCompatibleServersProvider
 */

declare(strict_types=1);

if (!defined('WP_UNINSTALL_PLUGIN')) {
    return;
}

$connector_option_names = array(
    'connectors_ai_openai_compatible_servers_api_key',
    'connectors_ai_openai_compatible_servers_base_url',
    'connectors_ai_openai_compatible_servers_model_mode',
    'connectors_ai_openai_compatible_servers_models',
    'connectors_ai_openai_compatible_servers_context_length',
    'connectors_ai_openai_compatible_servers_disable_thinking',
    'connectors_ai_openai_compatible_servers_headers',
    'connectors_ai_openai_compatible_servers_supports_images',
    'connectors_ai_openai_compatible_servers_enable_r1_format',
);

foreach ($connector_option_names as $connector_option_name) {
    delete_option($connector_option_name);
}
