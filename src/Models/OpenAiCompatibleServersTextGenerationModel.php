<?php
/**
 * OpenAI Compatible Servers text generation model class.
 *
 * @since 1.0.0
 *
 * @package WordPress\OpenAiCompatibleServersProvider
 */

declare(strict_types=1);

namespace WordPress\OpenAiCompatibleServersProvider\Models;

use WordPress\AiClient\Providers\Http\DTO\Request;
use WordPress\AiClient\Providers\Http\Enums\HttpMethodEnum;
use WordPress\AiClient\Providers\OpenAiCompatibleImplementation\AbstractOpenAiCompatibleTextGenerationModel;
use WordPress\OpenAiCompatibleServersProvider\Provider\OpenAiCompatibleServersProvider;

/**
 * Class for an OpenAI Compatible Servers text generation model.
 *
 * @since 1.0.0
 */
class OpenAiCompatibleServersTextGenerationModel extends AbstractOpenAiCompatibleTextGenerationModel
{
    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected function createRequest(HttpMethodEnum $method, string $path, array $headers = [], $data = null): Request
    {
        // Inject custom headers configured in settings.
        $custom_headers_str = get_option('connectors_ai_openai_compatible_servers_headers', '[]');
        $custom_headers = json_decode($custom_headers_str, true);
        if (is_array($custom_headers)) {
            foreach ($custom_headers as $header) {
                if (isset($header['key']) && isset($header['value']) && '' !== trim($header['key'])) {
                    $headers[$header['key']] = $header['value'];
                }
            }
        }

        if ('chat/completions' === $path && is_array($data)) {
            // Context Length configures the model's context window, not the output length,
            // so it must not be sent as `max_tokens` (which caps output tokens and would make
            // strict servers reject the request). `num_ctx` is passed through best-effort for
            // servers that read it directly from the request body; it's a no-op elsewhere.
            $context_length = (int) get_option('connectors_ai_openai_compatible_servers_context_length', 0);
            if ($context_length > 0 && !isset($data['num_ctx'])) {
                $data['num_ctx'] = $context_length;
            }

            // Only send the two broadly-recognized thinking-control conventions (Qwen/vLLM's
            // `thinking` flag and OpenAI's `reasoning_effort`). `max_thinking_tokens` is dropped:
            // it's the least standard of the three and the most likely to trip strict servers'
            // "unknown field" validation, without adding anything `thinking: false` doesn't
            // already convey.
            $disable_thinking = (bool) get_option('connectors_ai_openai_compatible_servers_disable_thinking', false);
            if ($disable_thinking) {
                $data['thinking'] = false;
                $data['reasoning_effort'] = 'low';
            }
        }

        return new Request(
            $method,
            OpenAiCompatibleServersProvider::url($path),
            $headers,
            $data,
            $this->getRequestOptions()
        );
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected function prepareMessagesParam(array $messages, ?string $systemInstruction = null): array
    {
        $enable_r1 = (bool) get_option('connectors_ai_openai_compatible_servers_enable_r1_format', false);
        if ($enable_r1 && $systemInstruction) {
            // Prepend system prompt to the first user message instead of sending it with the 'system' role.
            if (!empty($messages)) {
                $first_message = $messages[0];
                $parts = $first_message->getParts();
                if (!empty($parts) && $parts[0]->getType()->isText()) {
                    $original_text = $parts[0]->getText();
                    $new_text = $systemInstruction . "\n\n" . $original_text;

                    // Reconstruct message part and update the first message.
                    $new_part = new \WordPress\AiClient\Messages\DTO\MessagePart($new_text);
                    $new_parts = array_merge([$new_part], array_slice($parts, 1));
                    $messages[0] = new \WordPress\AiClient\Messages\DTO\Message($first_message->getRole(), $new_parts);
                }
            }
            $systemInstruction = null;
        }

        return parent::prepareMessagesParam($messages, $systemInstruction);
    }
}
