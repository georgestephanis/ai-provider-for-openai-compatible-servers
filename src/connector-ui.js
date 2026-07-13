/* eslint-disable @wordpress/no-unsafe-wp-apis -- Connectors settings API is experimental as of WP 7.0; no stable alternative exists yet. */
import {
	__experimentalRegisterConnector,
	__experimentalConnectorItem as ConnectorItem,
} from '@wordpress/connectors';
/* eslint-enable @wordpress/no-unsafe-wp-apis */

const {
	TextControl,
	Button,
	RadioControl,
	CheckboxControl,
	__experimentalHStack: HStack,
	__experimentalVStack: VStack,
} = window.wp.components;
const { useState, useEffect, createElement, Fragment } = window.wp.element;
const { __, sprintf } = window.wp.i18n;
const { useSelect, useDispatch } = window.wp.data;

// createElement/Fragment back the classic JSX pragma configured in babel.config.js.
// eslint-disable-next-line no-unused-vars -- referenced by compiled JSX output.
const _pragmaRefs = [ createElement, Fragment ];

const apiKeySettingName = 'connectors_ai_openai_compatible_servers_api_key';
const baseUrlSettingName = 'connectors_ai_openai_compatible_servers_base_url';
const modelModeSettingName =
	'connectors_ai_openai_compatible_servers_model_mode';
const modelsSettingName = 'connectors_ai_openai_compatible_servers_models';
const contextLengthSettingName =
	'connectors_ai_openai_compatible_servers_context_length';
const disableThinkingSettingName =
	'connectors_ai_openai_compatible_servers_disable_thinking';
const headersSettingName = 'connectors_ai_openai_compatible_servers_headers';
const supportsImagesSettingName =
	'connectors_ai_openai_compatible_servers_supports_images';
const enableR1FormatSettingName =
	'connectors_ai_openai_compatible_servers_enable_r1_format';

// Brand icons for inference servers we can best-effort detect via the test-connection
// probe (see detect_provider_type() in plugin.php). Resolved relative to this module's
// own URL so no server-side data-passing is needed for static assets.
const PROVIDER_ICONS = {
	ollama: new URL(
		/* webpackIgnore: true */ '../assets/images/providers/ollama.svg',
		import.meta.url
	).href,
	vllm: new URL(
		/* webpackIgnore: true */ '../assets/images/providers/vllm.svg',
		import.meta.url
	).href,
	lmstudio: new URL(
		/* webpackIgnore: true */ '../assets/images/providers/lmstudio.svg',
		import.meta.url
	).href,
};

const PROVIDER_NAMES = {
	ollama: 'Ollama',
	vllm: 'vLLM',
	lmstudio: 'LM Studio',
};

/**
 * Clean badge component to show connection status.
 */
const ConnectedBadge = () => (
	<span
		style={ {
			color: '#345b37',
			backgroundColor: '#eff8f0',
			padding: '4px 12px',
			borderRadius: '2px',
			fontSize: '13px',
			fontWeight: 500,
			whiteSpace: 'nowrap',
		} }
	>
		{ __( 'Connected', 'ai-provider-for-openai-compatible-servers' ) }
	</span>
);

/**
 * Label for the connector's expand/collapse toggle button.
 *
 * @param {boolean} isBusy      Whether a request is in flight.
 * @param {boolean} isExpanded  Whether the settings panel is expanded.
 * @param {boolean} isConnected Whether the connector is currently connected.
 * @return {string} The button label.
 */
function getToggleButtonLabel( isBusy, isExpanded, isConnected ) {
	if ( isBusy ) {
		return __( 'Checking…', 'ai-provider-for-openai-compatible-servers' );
	}
	if ( isExpanded ) {
		return __( 'Cancel', 'ai-provider-for-openai-compatible-servers' );
	}
	if ( isConnected ) {
		return __( 'Edit', 'ai-provider-for-openai-compatible-servers' );
	}
	return __( 'Set up', 'ai-provider-for-openai-compatible-servers' );
}

/**
 * Custom settings renderer for the OpenAI Compatible Servers connector.
 * @param {Object} root0             Connector item props.
 * @param {string} root0.name        Connector display name.
 * @param {string} root0.description Connector description.
 * @param {string} root0.logo        Connector logo URL.
 */
function OpenAiCompatibleServersConnector( { name, description, logo } ) {
	const [ isExpanded, setIsExpanded ] = useState( false );
	const [ isBusy, setIsBusy ] = useState( false );

	// Read saved configuration settings from Core site settings.
	const {
		currentApiKey,
		currentBaseUrl,
		currentModelMode,
		currentModels,
		currentContextLength,
		currentDisableThinking,
		currentHeaders,
		currentSupportsImages,
		currentEnableR1Format,
	} = useSelect( ( select ) => {
		const store = select( 'core' );
		const settings = store.getEntityRecord( 'root', 'site' );

		if ( ! settings ) {
			return {
				currentApiKey: undefined,
				currentBaseUrl: undefined,
				currentModelMode: undefined,
				currentModels: undefined,
				currentContextLength: undefined,
				currentDisableThinking: undefined,
				currentHeaders: undefined,
				currentSupportsImages: undefined,
				currentEnableR1Format: undefined,
			};
		}

		return {
			currentApiKey: settings[ apiKeySettingName ] ?? '',
			currentBaseUrl: settings[ baseUrlSettingName ] ?? '',
			currentModelMode: settings[ modelModeSettingName ] ?? 'autodetect',
			currentModels: settings[ modelsSettingName ] ?? '',
			currentContextLength: settings[ contextLengthSettingName ] ?? 0,
			currentDisableThinking:
				settings[ disableThinkingSettingName ] ?? false,
			currentHeaders: settings[ headersSettingName ] ?? '[]',
			currentSupportsImages:
				settings[ supportsImagesSettingName ] ?? false,
			currentEnableR1Format:
				settings[ enableR1FormatSettingName ] ?? false,
		};
	}, [] );

	// Initial connected state. We are connected if the API Key and Base URL settings exist.
	const [ connectedState, setConnectedState ] = useState( false );
	useEffect( () => {
		if ( currentApiKey && currentBaseUrl ) {
			setConnectedState( true );
		}
	}, [ currentApiKey, currentBaseUrl ] );

	// Local form states.
	const [ tempApiKey, setTempApiKey ] = useState( '' );
	const [ tempBaseUrl, setTempBaseUrl ] = useState(
		'http://localhost:11434/v1'
	);
	const [ tempModelMode, setTempModelMode ] = useState( 'autodetect' );
	const [ tempSelectedCheckboxModels, setTempSelectedCheckboxModels ] =
		useState( [] );
	const [ tempExtraManualModels, setTempExtraManualModels ] = useState( '' );
	const [ tempContextLength, setTempContextLength ] = useState( 0 );
	const [ tempDisableThinking, setTempDisableThinking ] = useState( false );
	const [ tempHeaders, setTempHeaders ] = useState( [] );
	const [ tempSupportsImages, setTempSupportsImages ] = useState( false );
	const [ tempEnableR1Format, setTempEnableR1Format ] = useState( false );

	// Background autodetected models list (stores full model objects).
	const [ availableModels, setAvailableModels ] = useState( [] );
	const [ isTesting, setIsTesting ] = useState( false );
	const [ testResult, setTestResult ] = useState( null );
	const [ detectedProvider, setDetectedProvider ] = useState( null );
	const [ hasInitialized, setHasInitialized ] = useState( false );
	const [ hasModelsInitialized, setHasModelsInitialized ] = useState( false );

	// Initialize base settings from database once when they load.
	useEffect( () => {
		if ( currentApiKey === undefined || currentBaseUrl === undefined ) {
			return;
		}

		if ( ! hasInitialized ) {
			setTempApiKey( currentApiKey );
			setTempBaseUrl( currentBaseUrl );
			setTempModelMode( currentModelMode );
			setTempContextLength( currentContextLength );
			setTempDisableThinking( currentDisableThinking );
			setTempSupportsImages( currentSupportsImages );
			setTempEnableR1Format( currentEnableR1Format );
			try {
				if ( currentHeaders ) {
					const parsed = JSON.parse( currentHeaders );
					if ( Array.isArray( parsed ) ) {
						setTempHeaders( parsed );
					} else {
						setTempHeaders( [] );
					}
				} else {
					setTempHeaders( [] );
				}
			} catch ( e ) {
				setTempHeaders( [] );
			}
			setHasInitialized( true );
		}
	}, [
		currentApiKey,
		currentBaseUrl,
		currentModelMode,
		currentContextLength,
		currentDisableThinking,
		currentHeaders,
		currentSupportsImages,
		currentEnableR1Format,
		hasInitialized,
	] );

	// Parse currentModels into checked/extra manual list when autodetected models are loaded.
	useEffect( () => {
		if (
			currentModels === undefined ||
			availableModels.length === 0 ||
			hasModelsInitialized
		) {
			return;
		}

		const savedModels = currentModels
			.split( ',' )
			.map( ( m ) => m.trim() )
			.filter( Boolean );
		const autodetectedIds = availableModels.map( ( m ) => m.id );

		const checked = [];
		const custom = [];

		savedModels.forEach( ( modelId ) => {
			if ( autodetectedIds.includes( modelId ) ) {
				checked.push( modelId );
			} else {
				custom.push( modelId );
			}
		} );

		setTempSelectedCheckboxModels( checked );
		setTempExtraManualModels( custom.join( ', ' ) );
		setHasModelsInitialized( true );
	}, [ currentModels, availableModels, hasModelsInitialized ] );

	// Fetch models in the background when Base URL or API Key changes (proxied via REST to bypass CORS).
	useEffect( () => {
		if ( ! tempBaseUrl ) {
			return;
		}

		let active = true;

		const timeoutId = setTimeout( () => {
			window.wp
				.apiFetch( {
					path: '/openai-compatible-servers/v1/test-connection',
					method: 'POST',
					data: {
						base_url: tempBaseUrl,
						api_key: tempApiKey,
						headers: tempHeaders,
					},
				} )
				.then( ( data ) => {
					if ( ! active ) {
						return;
					}
					if ( data.success && Array.isArray( data.data ) ) {
						setAvailableModels( data.data );
						setDetectedProvider( data.provider || null );
					} else {
						setAvailableModels( [] );
						setDetectedProvider( null );
					}
				} )
				.catch( ( err ) => {
					if ( ! active ) {
						return;
					}
					// eslint-disable-next-line no-console -- surface unexpected failures for debugging; no sensitive data logged.
					console.warn( 'Failed to autodetect models:', err );
					setAvailableModels( [] );
					setDetectedProvider( null );
				} );
		}, 500 );

		return () => {
			active = false;
			clearTimeout( timeoutId );
		};
	}, [ tempBaseUrl, tempApiKey, tempHeaders ] );

	// Reset test result if connection parameters change.
	useEffect( () => {
		setTestResult( null );
		setDetectedProvider( null );
	}, [ tempBaseUrl, tempApiKey, tempHeaders ] );

	// Autopopulate advanced settings based on availableModels and active selections.
	useEffect( () => {
		if ( availableModels.length === 0 ) {
			return;
		}

		// Find which models are currently targeted.
		let activeModels = [];
		if ( tempModelMode === 'autodetect' ) {
			activeModels = [ availableModels[ 0 ] ];
		} else {
			activeModels = availableModels.filter( ( m ) =>
				tempSelectedCheckboxModels.includes( m.id )
			);
		}

		if ( activeModels.length === 0 ) {
			return;
		}

		// 1. Context window autodetection (using max_model_len).
		let detectedContext = 0;
		activeModels.forEach( ( model ) => {
			if (
				model.max_model_len &&
				model.max_model_len > detectedContext
			) {
				detectedContext = model.max_model_len;
			}
		} );
		if ( detectedContext > 0 && tempContextLength === 0 ) {
			setTempContextLength( detectedContext );
		}

		// 2. Multimodal Vision Autodetection (looking for vision keywords).
		let detectedVision = false;
		const visionKeywords = [
			'vl',
			'vision',
			'llava',
			'clip',
			'multimodal',
		];
		activeModels.forEach( ( model ) => {
			const searchStr = `${ model.id } ${ model.root || '' } ${
				model.name || ''
			}`.toLowerCase();
			if ( visionKeywords.some( ( kw ) => searchStr.includes( kw ) ) ) {
				detectedVision = true;
			}
		} );
		if ( detectedVision && ! tempSupportsImages ) {
			setTempSupportsImages( true );
		}

		// 3. R1 Messages format folding autodetection.
		let detectedR1 = false;
		activeModels.forEach( ( model ) => {
			const searchStr = `${ model.id } ${ model.root || '' } ${
				model.name || ''
			}`.toLowerCase();
			if (
				searchStr.includes( 'r1' ) ||
				searchStr.includes( 'deepseek-r1' )
			) {
				detectedR1 = true;
			}
		} );
		if ( detectedR1 && ! tempEnableR1Format ) {
			setTempEnableR1Format( true );
		}
	}, [
		availableModels,
		tempModelMode,
		tempSelectedCheckboxModels,
		tempContextLength,
		tempSupportsImages,
		tempEnableR1Format,
	] );

	const isConnected = connectedState;

	const { saveEntityRecord } = useDispatch( 'core' );
	const { createSuccessNotice, createErrorNotice } =
		useDispatch( 'core/notices' );

	const handleTestCredentials = async () => {
		setIsTesting( true );
		setTestResult( null );

		try {
			const data = await window.wp.apiFetch( {
				path: '/openai-compatible-servers/v1/test-connection',
				method: 'POST',
				data: {
					base_url: tempBaseUrl,
					api_key: tempApiKey,
					headers: tempHeaders,
				},
			} );

			if ( data.success && Array.isArray( data.data ) ) {
				setAvailableModels( data.data );
				setDetectedProvider( data.provider || null );

				// If in manual mode and no models are selected yet, default to enabling all of them.
				if (
					tempModelMode === 'manual' &&
					tempSelectedCheckboxModels.length === 0 &&
					! tempExtraManualModels
				) {
					const allModelIds = data.data.map( ( m ) => m.id );
					setTempSelectedCheckboxModels( allModelIds );
				}

				const providerName = PROVIDER_NAMES[ data.provider ];
				const successMessage = providerName
					? sprintf(
							/* translators: 1: number of models found, 2: detected provider name (e.g. Ollama) */
							__(
								'Connection successful! Detected %1$d model(s) via %2$s.',
								'ai-provider-for-openai-compatible-servers'
							),
							data.data.length,
							providerName
					  )
					: sprintf(
							/* translators: %d: number of models found */
							__(
								'Connection successful! Detected %d model(s).',
								'ai-provider-for-openai-compatible-servers'
							),
							data.data.length
					  );

				setTestResult( {
					success: true,
					message: successMessage,
				} );

				createSuccessNotice( successMessage, {
					id: 'openai-compatible-servers-test-success',
					type: 'snackbar',
				} );
			} else {
				throw new Error(
					data.message ||
						__(
							'Failed to connect to the server.',
							'ai-provider-for-openai-compatible-servers'
						)
				);
			}
		} catch ( error ) {
			// eslint-disable-next-line no-console -- surface unexpected failures for debugging; no sensitive data logged.
			console.error( 'Test credentials failed:', error );
			setTestResult( {
				success: false,
				message: sprintf(
					/* translators: %s: error message */
					__(
						'Connection failed: %s',
						'ai-provider-for-openai-compatible-servers'
					),
					error.message || error
				),
			} );
			createErrorNotice(
				sprintf(
					/* translators: %s: error message */
					__(
						'Connection failed: %s',
						'ai-provider-for-openai-compatible-servers'
					),
					error.message || error
				),
				{ id: 'openai-compatible-servers-test-error', type: 'snackbar' }
			);
		} finally {
			setIsTesting( false );
		}
	};

	const handleSave = async () => {
		setIsBusy( true );
		try {
			// Core masks connector API keys in REST settings responses ("••••fj39"),
			// so an untouched field holds the mask, not the key. Never save it back.
			const isMaskedKey = tempApiKey.trim().startsWith( '•' );
			const apiKeyToSave = tempApiKey.trim() || 'local';
			const baseUrlToSave =
				tempBaseUrl.trim() || 'http://localhost:11434/v1';
			const modelModeToSave = tempModelMode || 'autodetect';
			const customList = tempExtraManualModels
				.split( ',' )
				.map( ( m ) => m.trim() )
				.filter( Boolean );
			const modelsToSave = [
				...new Set( [ ...tempSelectedCheckboxModels, ...customList ] ),
			].join( ', ' );
			const contextLengthToSave = parseInt( tempContextLength, 10 ) || 0;
			const disableThinkingToSave = !! tempDisableThinking;
			const supportsImagesToSave = !! tempSupportsImages;
			const enableR1FormatToSave = !! tempEnableR1Format;

			const headersToSave = JSON.stringify(
				tempHeaders.filter( ( h ) => h.key.trim() !== '' )
			);

			await saveEntityRecord(
				'root',
				'site',
				{
					...( isMaskedKey
						? {}
						: { [ apiKeySettingName ]: apiKeyToSave } ),
					[ baseUrlSettingName ]: baseUrlToSave,
					[ modelModeSettingName ]: modelModeToSave,
					[ modelsSettingName ]: modelsToSave,
					[ contextLengthSettingName ]: contextLengthToSave,
					[ disableThinkingSettingName ]: disableThinkingToSave,
					[ headersSettingName ]: headersToSave,
					[ supportsImagesSettingName ]: supportsImagesToSave,
					[ enableR1FormatSettingName ]: enableR1FormatToSave,
				},
				{ throwOnError: true }
			);

			setConnectedState( true );
			setIsExpanded( false );
			setHasInitialized( false );
			setHasModelsInitialized( false );

			createSuccessNotice(
				__(
					'OpenAI Compatible Servers connected successfully.',
					'ai-provider-for-openai-compatible-servers'
				),
				{
					id: 'openai-compatible-servers-connect-success',
					type: 'snackbar',
				}
			);
		} catch ( error ) {
			// eslint-disable-next-line no-console -- surface unexpected failures for debugging; no sensitive data logged.
			console.error( 'Failed to save settings:', error );
			createErrorNotice(
				__(
					'Failed to save settings. Please verify the server is running.',
					'ai-provider-for-openai-compatible-servers'
				),
				{
					id: 'openai-compatible-servers-connect-error',
					type: 'snackbar',
				}
			);
		} finally {
			setIsBusy( false );
		}
	};

	/**
	 * Remove settings from the database (disconnect).
	 */
	const handleRemove = async () => {
		setIsBusy( true );
		try {
			await saveEntityRecord(
				'root',
				'site',
				{
					[ apiKeySettingName ]: '',
					[ baseUrlSettingName ]: '',
					[ modelModeSettingName ]: 'autodetect',
					[ modelsSettingName ]: '',
					[ contextLengthSettingName ]: 0,
					[ disableThinkingSettingName ]: false,
					[ headersSettingName ]: '[]',
					[ supportsImagesSettingName ]: false,
					[ enableR1FormatSettingName ]: false,
				},
				{ throwOnError: true }
			);

			setConnectedState( false );
			setTempApiKey( '' );
			setTempBaseUrl( 'http://localhost:11434/v1' );
			setTempModelMode( 'autodetect' );
			setTempSelectedCheckboxModels( [] );
			setTempExtraManualModels( '' );
			setTempContextLength( 0 );
			setTempDisableThinking( false );
			setTempHeaders( [] );
			setTempSupportsImages( false );
			setTempEnableR1Format( false );
			setHasInitialized( false );
			setHasModelsInitialized( false );

			createSuccessNotice(
				__(
					'OpenAI Compatible Servers disconnected.',
					'ai-provider-for-openai-compatible-servers'
				),
				{
					id: 'openai-compatible-servers-disconnect-success',
					type: 'snackbar',
				}
			);
		} catch ( error ) {
			// eslint-disable-next-line no-console -- surface unexpected failures for debugging; no sensitive data logged.
			console.error( 'Failed to disconnect:', error );
			createErrorNotice(
				__(
					'Failed to disconnect.',
					'ai-provider-for-openai-compatible-servers'
				),
				{
					id: 'openai-compatible-servers-disconnect-error',
					type: 'snackbar',
				}
			);
		} finally {
			setIsBusy( false );
		}
	};

	// Swap in the detected server's brand icon when we have one; otherwise fall back
	// to the generic logo registered by the provider metadata.
	const resolvedLogo = PROVIDER_ICONS[ detectedProvider ] || logo;

	return (
		<ConnectorItem
			logo={ resolvedLogo }
			name={ name }
			description={ description }
			actionArea={
				<HStack spacing={ 3 } expanded={ false }>
					{ isConnected && <ConnectedBadge /> }
					<Button
						variant={
							isExpanded || isConnected ? 'tertiary' : 'secondary'
						}
						size="compact"
						onClick={ () => setIsExpanded( ! isExpanded ) }
						disabled={ isBusy }
						isBusy={ isBusy }
					>
						{ getToggleButtonLabel(
							isBusy,
							isExpanded,
							isConnected
						) }
					</Button>
				</HStack>
			}
		>
			{ isExpanded && (
				<VStack
					spacing={ 4 }
					className="connector-settings"
					style={ { marginTop: '16px' } }
				>
					<TextControl
						__next40pxDefaultSize
						label={ __(
							'Base URL (URL & Port)',
							'ai-provider-for-openai-compatible-servers'
						) }
						value={ tempBaseUrl }
						onChange={ ( val ) => setTempBaseUrl( val ) }
						placeholder="http://localhost:11434/v1"
						disabled={ isBusy }
						help={ __(
							'The base URL and port of your local OpenAI-compatible API server.',
							'ai-provider-for-openai-compatible-servers'
						) }
					/>
					<TextControl
						__next40pxDefaultSize
						id="connectors_openai_compatible_servers_api_key_input"
						label={ __(
							'API Key',
							'ai-provider-for-openai-compatible-servers'
						) }
						value={ tempApiKey }
						onChange={ ( val ) => setTempApiKey( val ) }
						type="text"
						autoComplete="off"
						placeholder="local"
						disabled={ isBusy }
						help={ __(
							'Optional. Dummy value used if local server does not require key.',
							'ai-provider-for-openai-compatible-servers'
						) }
					/>

					<HStack
						alignment="flex-end"
						justify="space-between"
						spacing={ 4 }
						style={ { marginBottom: '16px' } }
					>
						<RadioControl
							label={ __(
								'Model Selection Mode',
								'ai-provider-for-openai-compatible-servers'
							) }
							selected={ tempModelMode }
							options={ [
								{
									label: __(
										'Autodetect all models from server',
										'ai-provider-for-openai-compatible-servers'
									),
									value: 'autodetect',
								},
								{
									label: __(
										'Manually specify models',
										'ai-provider-for-openai-compatible-servers'
									),
									value: 'manual',
								},
							] }
							onChange={ ( val ) => setTempModelMode( val ) }
							disabled={ isBusy || isTesting }
						/>
						<Button
							__next40pxDefaultSize
							variant="secondary"
							onClick={ handleTestCredentials }
							disabled={ isBusy || isTesting || ! hasInitialized }
							isBusy={ isTesting }
							style={ { marginBottom: '8px' } }
						>
							{ __(
								'Test Credentials',
								'ai-provider-for-openai-compatible-servers'
							) }
						</Button>
					</HStack>
					{ testResult && (
						<div
							style={ {
								fontSize: '13px',
								color: testResult.success
									? '#2e7d32'
									: '#d32f2f',
								backgroundColor: testResult.success
									? '#edf7ed'
									: '#fdeded',
								padding: '8px 12px',
								borderRadius: '4px',
								marginBottom: '16px',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
							} }
						>
							{ testResult.success ? '✔ ' : '✖ ' }
							{ testResult.message }
						</div>
					) }
					{ tempModelMode === 'manual' && (
						<VStack spacing={ 4 }>
							{ availableModels.length > 0 && (
								<VStack spacing={ 2 }>
									<span
										style={ {
											fontWeight: '600',
											fontSize: '13px',
											display: 'block',
											marginBottom: '4px',
										} }
									>
										{ __(
											'Detected Models (select to enable)',
											'ai-provider-for-openai-compatible-servers'
										) }
									</span>
									{ availableModels.map( ( model ) => (
										<CheckboxControl
											key={ model.id }
											label={ model.id }
											checked={ tempSelectedCheckboxModels.includes(
												model.id
											) }
											onChange={ ( isChecked ) => {
												if ( isChecked ) {
													setTempSelectedCheckboxModels(
														[
															...tempSelectedCheckboxModels,
															model.id,
														]
													);
												} else {
													setTempSelectedCheckboxModels(
														tempSelectedCheckboxModels.filter(
															( m ) =>
																m !== model.id
														)
													);
												}
											} }
										/>
									) ) }
								</VStack>
							) }
							<TextControl
								__next40pxDefaultSize
								label={ __(
									'Other Models (not listed above)',
									'ai-provider-for-openai-compatible-servers'
								) }
								value={ tempExtraManualModels }
								onChange={ ( val ) =>
									setTempExtraManualModels( val )
								}
								placeholder="llama3.2, mistral"
								disabled={ isBusy }
								help={ __(
									'Enter comma-separated names of any other models you want to enable that are not in the detected list above.',
									'ai-provider-for-openai-compatible-servers'
								) }
							/>
						</VStack>
					) }
					<details
						style={ {
							marginTop: '16px',
							borderTop: '1px solid #eee',
							paddingTop: '16px',
						} }
					>
						<summary
							style={ {
								fontWeight: '600',
								cursor: 'pointer',
								marginBottom: '12px',
							} }
						>
							{ __(
								'Advanced Settings',
								'ai-provider-for-openai-compatible-servers'
							) }
						</summary>
						<VStack spacing={ 4 }>
							<TextControl
								type="number"
								__next40pxDefaultSize
								label={ __(
									'Context Length (tokens)',
									'ai-provider-for-openai-compatible-servers'
								) }
								value={ tempContextLength || '' }
								onChange={ ( val ) =>
									setTempContextLength(
										val ? parseInt( val, 10 ) : 0
									)
								}
								placeholder={ __(
									'e.g., 8192',
									'ai-provider-for-openai-compatible-servers'
								) }
								disabled={ isBusy }
								help={ __(
									'Optional. Configures num_ctx and max_tokens parameters to control server memory limits.',
									'ai-provider-for-openai-compatible-servers'
								) }
							/>
							<CheckboxControl
								label={ __(
									'Disable thinking/reasoning blocks',
									'ai-provider-for-openai-compatible-servers'
								) }
								checked={ tempDisableThinking }
								onChange={ ( val ) =>
									setTempDisableThinking( val )
								}
								disabled={ isBusy }
								help={ __(
									'Optimizes context usage and prevents long thinking preambles for reasoning models (e.g. Qwen3.6–27B or DeepSeek-R1).',
									'ai-provider-for-openai-compatible-servers'
								) }
							/>
							<CheckboxControl
								label={ __(
									'Supports Images',
									'ai-provider-for-openai-compatible-servers'
								) }
								checked={ tempSupportsImages }
								onChange={ ( val ) =>
									setTempSupportsImages( val )
								}
								disabled={ isBusy }
								help={ __(
									'Enable this option if your local models support multimodal image inputs (e.g., Llama 3.2 Vision).',
									'ai-provider-for-openai-compatible-servers'
								) }
							/>
							<CheckboxControl
								label={ __(
									'Enable R1 Messages Format',
									'ai-provider-for-openai-compatible-servers'
								) }
								checked={ tempEnableR1Format }
								onChange={ ( val ) =>
									setTempEnableR1Format( val )
								}
								disabled={ isBusy }
								help={ __(
									'Wraps system instructions within the first user message instead of a separate system message (necessary for DeepSeek-R1 compatibility).',
									'ai-provider-for-openai-compatible-servers'
								) }
							/>

							{ /* Custom HTTP Headers editor. */ }
							<VStack
								spacing={ 2 }
								style={ {
									borderTop: '1px dashed #eee',
									paddingTop: '16px',
									marginTop: '8px',
								} }
							>
								<span
									style={ {
										fontWeight: '600',
										fontSize: '13px',
										display: 'block',
									} }
								>
									{ __(
										'Custom HTTP Headers',
										'ai-provider-for-openai-compatible-servers'
									) }
								</span>
								{ tempHeaders.map( ( header, idx ) => (
									<HStack key={ idx } spacing={ 2 }>
										<TextControl
											__next40pxDefaultSize
											placeholder={ __(
												'Header Name',
												'ai-provider-for-openai-compatible-servers'
											) }
											value={ header.key }
											onChange={ ( val ) => {
												const next = [ ...tempHeaders ];
												next[ idx ].key = val;
												setTempHeaders( next );
											} }
										/>
										<TextControl
											__next40pxDefaultSize
											placeholder={ __(
												'Value',
												'ai-provider-for-openai-compatible-servers'
											) }
											value={ header.value }
											onChange={ ( val ) => {
												const next = [ ...tempHeaders ];
												next[ idx ].value = val;
												setTempHeaders( next );
											} }
										/>
										<Button
											variant="secondary"
											onClick={ () => {
												const next = tempHeaders.filter(
													( _, i ) => i !== idx
												);
												setTempHeaders( next );
											} }
										>
											{ __(
												'Remove',
												'ai-provider-for-openai-compatible-servers'
											) }
										</Button>
									</HStack>
								) ) }
								<Button
									variant="secondary"
									size="small"
									onClick={ () => {
										setTempHeaders( [
											...tempHeaders,
											{ key: '', value: '' },
										] );
									} }
								>
									{ __(
										'Add Header',
										'ai-provider-for-openai-compatible-servers'
									) }
								</Button>
							</VStack>
						</VStack>
					</details>
					<HStack justify="space-between" style={ { width: '100%' } }>
						<Button
							__next40pxDefaultSize
							variant="primary"
							disabled={ isBusy || ! hasInitialized }
							onClick={ handleSave }
						>
							{ __(
								'Save',
								'ai-provider-for-openai-compatible-servers'
							) }
						</Button>
						{ isConnected && (
							<Button
								variant="link"
								isDestructive
								onClick={ handleRemove }
								disabled={ isBusy }
							>
								{ __(
									'Remove and replace',
									'ai-provider-for-openai-compatible-servers'
								) }
							</Button>
						) }
					</HStack>
				</VStack>
			) }
		</ConnectorItem>
	);
}

// Intercept registry of 'openai-compatible-servers' connector to use our custom renderer.
__experimentalRegisterConnector( 'openai-compatible-servers', {
	render: OpenAiCompatibleServersConnector,
} );
