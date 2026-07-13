<?php

/**
 * OpenAI Compatible Servers provider class.
 *
 * @since 1.0.0
 *
 * @package WordPress\OpenAiCompatibleServersProvider
 */

declare(strict_types=1);

namespace WordPress\OpenAiCompatibleServersProvider\Provider;

use WordPress\AiClient\AiClient;
use WordPress\AiClient\Common\Exception\RuntimeException;
use WordPress\AiClient\Providers\ApiBasedImplementation\AbstractApiProvider;
use WordPress\AiClient\Providers\ApiBasedImplementation\ListModelsApiBasedProviderAvailability;
use WordPress\AiClient\Providers\Contracts\ModelMetadataDirectoryInterface;
use WordPress\AiClient\Providers\Contracts\ProviderAvailabilityInterface;
use WordPress\AiClient\Providers\DTO\ProviderMetadata;
use WordPress\AiClient\Providers\Enums\ProviderTypeEnum;
use WordPress\AiClient\Providers\Http\Enums\RequestAuthenticationMethod;
use WordPress\AiClient\Providers\Models\Contracts\ModelInterface;
use WordPress\AiClient\Providers\Models\DTO\ModelMetadata;
use WordPress\OpenAiCompatibleServersProvider\Metadata\OpenAiCompatibleServersModelMetadataDirectory;
use WordPress\OpenAiCompatibleServersProvider\Models\OpenAiCompatibleServersTextGenerationModel;

/**
 * Class for the OpenAI Compatible Servers provider.
 *
 * @since 1.0.0
 */
class OpenAiCompatibleServersProvider extends AbstractApiProvider
{
    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected static function baseUrl(): string
    {
        $url = get_option('connectors_ai_openai_compatible_servers_base_url', 'http://localhost:11434/v1');
        if (empty($url)) {
            $url = 'http://localhost:11434/v1';
        }
        return rtrim($url, '/');
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected static function createModel(
        ModelMetadata $modelMetadata,
        ProviderMetadata $providerMetadata
    ): ModelInterface {
        $capabilities = $modelMetadata->getSupportedCapabilities();
        foreach ($capabilities as $capability) {
            if ($capability->isTextGeneration()) {
                return new OpenAiCompatibleServersTextGenerationModel($modelMetadata, $providerMetadata);
            }
        }

        throw new RuntimeException(
            esc_html('Unsupported model capabilities: ' . implode(', ', $capabilities))
        );
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected static function createProviderMetadata(): ProviderMetadata
    {
        $id = 'openai-compatible-servers';
        $name = 'OpenAI Compatible';
        $type = ProviderTypeEnum::server();
        $credentialsUrl = ''; // Local server, no central console
        $authMethod = RequestAuthenticationMethod::apiKey();

        $description = 'Local OpenAI-compatible servers (LM Studio, Ollama, vLLM, etc.)';
        if (function_exists('__')) {
            $description = __(
                'Local OpenAI-compatible servers (LM Studio, Ollama, vLLM, etc.)',
                'ai-provider-for-openai-compatible-servers'
            );
        }

        $logoPath = dirname(__DIR__, 2) . '/assets/images/logo.svg';

        return new ProviderMetadata(
            $id,
            $name,
            $type,
            $credentialsUrl,
            $authMethod,
            $description,
            $logoPath
        );
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected static function createProviderAvailability(): ProviderAvailabilityInterface
    {
        // Check valid API access by attempting to list models.
        return new ListModelsApiBasedProviderAvailability(
            static::modelMetadataDirectory()
        );
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected static function createModelMetadataDirectory(): ModelMetadataDirectoryInterface
    {
        return new OpenAiCompatibleServersModelMetadataDirectory();
    }
}
