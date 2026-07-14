<?php

/**
 * OpenAI Compatible Servers model metadata directory class.
 *
 * @since 1.0.0
 *
 * @package WordPress\OpenAiCompatibleServersProvider
 */

declare(strict_types=1);

namespace WordPress\OpenAiCompatibleServersProvider\Metadata;

if (!defined('ABSPATH')) {
    exit;
}

use WordPress\AiClient\Messages\Enums\ModalityEnum;
use WordPress\AiClient\Providers\Http\DTO\Request;
use WordPress\AiClient\Providers\Http\DTO\Response;
use WordPress\AiClient\Providers\Http\Enums\HttpMethodEnum;
use WordPress\AiClient\Providers\Http\Exception\ResponseException;
use WordPress\AiClient\Providers\Models\DTO\ModelMetadata;
use WordPress\AiClient\Providers\Models\DTO\SupportedOption;
use WordPress\AiClient\Providers\Models\Enums\CapabilityEnum;
use WordPress\AiClient\Providers\Models\Enums\OptionEnum;
use WordPress\AiClient\Providers\OpenAiCompatibleImplementation\AbstractOpenAiCompatibleModelMetadataDirectory;
use WordPress\OpenAiCompatibleServersProvider\Provider\OpenAiCompatibleServersProvider;

/**
 * Class for the OpenAI Compatible Servers model metadata directory.
 *
 * @since 1.0.0
 *
 * @phpstan-type ModelsResponseData array{
 *     data: list<array{id: string, name?: string, display_name?: string}>
 * }
 */
class OpenAiCompatibleServersModelMetadataDirectory extends AbstractOpenAiCompatibleModelMetadataDirectory
{
    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected function createRequest(HttpMethodEnum $method, string $path, array $headers = [], $data = null): Request
    {
        return new Request(
            $method,
            OpenAiCompatibleServersProvider::url($path),
            $headers,
            $data
        );
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected function sendListModelsRequest(): array
    {
        $mode = get_option('connectors_ai_openai_compatible_servers_model_mode', 'autodetect');
        if ('manual' === $mode) {
            $manual_models_str = get_option('connectors_ai_openai_compatible_servers_models', '');
            if (!empty($manual_models_str)) {
                $manual_models = array_map('trim', explode(',', $manual_models_str));
                $models = [];

                $capabilities = [
                    CapabilityEnum::textGeneration(),
                    CapabilityEnum::chatHistory(),
                ];

                $options = [
                    new SupportedOption(OptionEnum::systemInstruction()),
                    new SupportedOption(OptionEnum::maxTokens()),
                    new SupportedOption(OptionEnum::temperature()),
                    new SupportedOption(OptionEnum::topP()),
                    new SupportedOption(OptionEnum::stopSequences()),
                    new SupportedOption(OptionEnum::outputMimeType(), ['text/plain', 'application/json']),
                    new SupportedOption(OptionEnum::outputSchema()),
                    new SupportedOption(OptionEnum::functionDeclarations()),
                    new SupportedOption(OptionEnum::customOptions()),
                    new SupportedOption(OptionEnum::outputModalities(), [[ModalityEnum::text()]]),
                ];

                if ((bool) get_option('connectors_ai_openai_compatible_servers_supports_images', false)) {
                    $options[] = new SupportedOption(OptionEnum::inputModalities(), [
                        [ModalityEnum::text()],
                        [ModalityEnum::text(), ModalityEnum::image()],
                    ]);
                } else {
                    $options[] = new SupportedOption(OptionEnum::inputModalities(), [[ModalityEnum::text()]]);
                }

                foreach ($manual_models as $model_id) {
                    if (empty($model_id)) {
                        continue;
                    }

                    /**
                     * Filters the options supported by a specific OpenAI Compatible model.
                     *
                     * @since 1.0.0
                     *
                     * @param array  $options  SupportedOption instances array.
                     * @param string $model_id Model identifier.
                     * @param string $mode     Either 'manual' or 'autodetect'.
                     */
                    $model_options = apply_filters(
                        'connectors_ai_openai_compatible_servers_model_options',
                        $options,
                        $model_id,
                        'manual'
                    );

                    /**
                     * Filters the capabilities supported by a specific OpenAI Compatible model.
                     *
                     * @since 1.0.0
                     *
                     * @param array  $capabilities CapabilityEnum instances array.
                     * @param string $model_id     Model identifier.
                     * @param string $mode         Either 'manual' or 'autodetect'.
                     */
                    $model_capabilities = apply_filters(
                        'connectors_ai_openai_compatible_servers_model_capabilities',
                        $capabilities,
                        $model_id,
                        'manual'
                    );

                    $models[$model_id] = new ModelMetadata(
                        $model_id,
                        $model_id,
                        $model_capabilities,
                        $model_options
                    );
                }
                return $models;
            }
        }

        return parent::sendListModelsRequest();
    }

    /**
     * {@inheritDoc}
     *
     * @since 1.0.0
     */
    protected function parseResponseToModelMetadataList(Response $response): array
    {
        /** @var ModelsResponseData $responseData */
        $responseData = $response->getData();
        if (!isset($responseData['data']) || !is_array($responseData['data'])) {
            throw ResponseException::fromMissingData('OpenAI Compatible', 'data');
        }

        $capabilities = [
            CapabilityEnum::textGeneration(),
            CapabilityEnum::chatHistory(),
        ];

        $options = [
            new SupportedOption(OptionEnum::systemInstruction()),
            new SupportedOption(OptionEnum::maxTokens()),
            new SupportedOption(OptionEnum::temperature()),
            new SupportedOption(OptionEnum::topP()),
            new SupportedOption(OptionEnum::stopSequences()),
            new SupportedOption(OptionEnum::outputMimeType(), ['text/plain', 'application/json']),
            new SupportedOption(OptionEnum::outputSchema()),
            new SupportedOption(OptionEnum::functionDeclarations()),
            new SupportedOption(OptionEnum::customOptions()),
            new SupportedOption(OptionEnum::outputModalities(), [[ModalityEnum::text()]]),
        ];

        if ((bool) get_option('connectors_ai_openai_compatible_servers_supports_images', false)) {
            $options[] = new SupportedOption(OptionEnum::inputModalities(), [
                [ModalityEnum::text()],
                [ModalityEnum::text(), ModalityEnum::image()],
            ]);
        } else {
            $options[] = new SupportedOption(OptionEnum::inputModalities(), [[ModalityEnum::text()]]);
        }

        $models = [];
        foreach ($responseData['data'] as $modelData) {
            if (!isset($modelData['id'])) {
                continue;
            }
            $modelId = $modelData['id'];
            $modelName = $modelData['name'] ?? $modelData['display_name'] ?? $modelId;

            /**
             * Filters the options supported by a specific OpenAI Compatible model.
             *
             * @since 1.0.0
             *
             * @param array  $options  SupportedOption instances array.
             * @param string $modelId  Model identifier.
             * @param string $mode     Either 'manual' or 'autodetect'.
             */
            $model_options = apply_filters(
                'connectors_ai_openai_compatible_servers_model_options',
                $options,
                $modelId,
                'autodetect'
            );

            /**
             * Filters the capabilities supported by a specific OpenAI Compatible model.
             *
             * @since 1.0.0
             *
             * @param array  $capabilities CapabilityEnum instances array.
             * @param string $modelId      Model identifier.
             * @param string $mode         Either 'manual' or 'autodetect'.
             */
            $model_capabilities = apply_filters(
                'connectors_ai_openai_compatible_servers_model_capabilities',
                $capabilities,
                $modelId,
                'autodetect'
            );

            $models[] = new ModelMetadata(
                $modelId,
                $modelName,
                $model_capabilities,
                $model_options
            );
        }

        return $models;
    }
}
