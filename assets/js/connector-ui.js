/* eslint-disable @wordpress/no-unsafe-wp-apis -- Connectors settings API is experimental as of WP 6.9; no stable alternative exists yet. */
import {
	__experimentalRegisterConnector,
	__experimentalConnectorItem,
} from '@wordpress/connectors';
/* eslint-enable @wordpress/no-unsafe-wp-apis */

const {
	TextControl,
	Button,
	RadioControl,
	CheckboxControl,
	__experimentalHStack,
	__experimentalVStack,
} = window.wp.components;
const { useState, useEffect, createElement: el } = window.wp.element;
const { __, sprintf } = window.wp.i18n;
const { useSelect, useDispatch } = window.wp.data;

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

/**
 * Clean badge component to show connection status.
 */
const ConnectedBadge = () =>
	el(
		'span',
		{
			style: {
				color: '#345b37',
				backgroundColor: '#eff8f0',
				padding: '4px 12px',
				borderRadius: '2px',
				fontSize: '13px',
				fontWeight: 500,
				whiteSpace: 'nowrap',
			},
		},
		__( 'Connected', 'ai-provider-for-openai-compatible-servers' )
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
					} else {
						setAvailableModels( [] );
					}
				} )
				.catch( ( err ) => {
					if ( ! active ) {
						return;
					}
					// eslint-disable-next-line no-console -- surface unexpected failures for debugging; no sensitive data logged.
					console.warn( 'Failed to autodetect models:', err );
					setAvailableModels( [] );
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

				// If in manual mode and no models are selected yet, default to enabling all of them.
				if (
					tempModelMode === 'manual' &&
					tempSelectedCheckboxModels.length === 0 &&
					! tempExtraManualModels
				) {
					const allModelIds = data.data.map( ( m ) => m.id );
					setTempSelectedCheckboxModels( allModelIds );
				}

				setTestResult( {
					success: true,
					message: sprintf(
						/* translators: %d: number of models found */
						__(
							'Connection successful! Detected %d model(s).',
							'ai-provider-for-openai-compatible-servers'
						),
						data.data.length
					),
				} );

				createSuccessNotice(
					sprintf(
						/* translators: %d: number of models found */
						__(
							'Connection successful! Detected %d model(s).',
							'ai-provider-for-openai-compatible-servers'
						),
						data.data.length
					),
					{
						id: 'openai-compatible-servers-test-success',
						type: 'snackbar',
					}
				);
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
					[ apiKeySettingName ]: apiKeyToSave,
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

	return el(
		__experimentalConnectorItem,
		{
			logo,
			name,
			description,
			actionArea: el(
				__experimentalHStack,
				{ spacing: 3, expanded: false },
				isConnected && el( ConnectedBadge ),
				el(
					Button,
					{
						variant:
							isExpanded || isConnected
								? 'tertiary'
								: 'secondary',
						size: 'compact',
						onClick: () => setIsExpanded( ! isExpanded ),
						disabled: isBusy,
						isBusy,
					},
					getToggleButtonLabel( isBusy, isExpanded, isConnected )
				)
			),
		},
		isExpanded &&
			el(
				__experimentalVStack,
				{
					spacing: 4,
					className: 'connector-settings',
					style: { marginTop: '16px' },
				},
				el(
					'style',
					null,
					`
                #connectors_openai_compatible_servers_api_key_input {
                    -webkit-text-security: disc !important;
                }
            `
				),
				el( TextControl, {
					__next40pxDefaultSize: true,
					label: __(
						'Base URL (URL & Port)',
						'ai-provider-for-openai-compatible-servers'
					),
					value: tempBaseUrl,
					onChange: ( val ) => setTempBaseUrl( val ),
					placeholder: 'http://localhost:11434/v1',
					disabled: isBusy,
					help: __(
						'The base URL and port of your local OpenAI-compatible API server.',
						'ai-provider-for-openai-compatible-servers'
					),
				} ),
				el( TextControl, {
					__next40pxDefaultSize: true,
					id: 'connectors_openai_compatible_servers_api_key_input',
					label: __(
						'API Key',
						'ai-provider-for-openai-compatible-servers'
					),
					value: tempApiKey,
					onChange: ( val ) => setTempApiKey( val ),
					type: 'text',
					autoComplete: 'off',
					placeholder: 'local',
					disabled: isBusy,
					help: __(
						'Optional. Dummy value used if local server does not require key.',
						'ai-provider-for-openai-compatible-servers'
					),
				} ),

				el(
					__experimentalHStack,
					{
						alignment: 'flex-end',
						justify: 'space-between',
						spacing: 4,
						style: { marginBottom: '16px' },
					},
					el( RadioControl, {
						label: __(
							'Model Selection Mode',
							'ai-provider-for-openai-compatible-servers'
						),
						selected: tempModelMode,
						options: [
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
						],
						onChange: ( val ) => setTempModelMode( val ),
						disabled: isBusy || isTesting,
					} ),
					el(
						Button,
						{
							__next40pxDefaultSize: true,
							variant: 'secondary',
							onClick: handleTestCredentials,
							disabled: isBusy || isTesting,
							isBusy: isTesting,
							style: { marginBottom: '8px' },
						},
						__(
							'Test Credentials',
							'ai-provider-for-openai-compatible-servers'
						)
					)
				),
				testResult &&
					el(
						'div',
						{
							style: {
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
							},
						},
						testResult.success ? '✔ ' : '✖ ',
						testResult.message
					),
				tempModelMode === 'manual' &&
					el(
						__experimentalVStack,
						{ spacing: 4 },
						availableModels.length > 0 &&
							el(
								__experimentalVStack,
								{ spacing: 2 },
								el(
									'label',
									{
										style: {
											fontWeight: '600',
											fontSize: '13px',
											display: 'block',
											marginBottom: '4px',
										},
									},
									__(
										'Detected Models (select to enable)',
										'ai-provider-for-openai-compatible-servers'
									)
								),
								availableModels.map( ( model ) =>
									el( CheckboxControl, {
										key: model.id,
										label: model.id,
										checked:
											tempSelectedCheckboxModels.includes(
												model.id
											),
										onChange: ( isChecked ) => {
											if ( isChecked ) {
												setTempSelectedCheckboxModels( [
													...tempSelectedCheckboxModels,
													model.id,
												] );
											} else {
												setTempSelectedCheckboxModels(
													tempSelectedCheckboxModels.filter(
														( m ) => m !== model.id
													)
												);
											}
										},
									} )
								)
							),
						el( TextControl, {
							__next40pxDefaultSize: true,
							label: __(
								'Other Models (not listed above)',
								'ai-provider-for-openai-compatible-servers'
							),
							value: tempExtraManualModels,
							onChange: ( val ) =>
								setTempExtraManualModels( val ),
							placeholder: 'llama3.2, mistral',
							disabled: isBusy,
							help: __(
								'Enter comma-separated names of any other models you want to enable that are not in the detected list above.',
								'ai-provider-for-openai-compatible-servers'
							),
						} )
					),
				el(
					'details',
					{
						style: {
							marginTop: '16px',
							borderTop: '1px solid #eee',
							paddingTop: '16px',
						},
					},
					el(
						'summary',
						{
							style: {
								fontWeight: '600',
								cursor: 'pointer',
								marginBottom: '12px',
							},
						},
						__(
							'Advanced Settings',
							'ai-provider-for-openai-compatible-servers'
						)
					),
					el(
						__experimentalVStack,
						{ spacing: 4 },
						el( TextControl, {
							type: 'number',
							__next40pxDefaultSize: true,
							label: __(
								'Context Length (tokens)',
								'ai-provider-for-openai-compatible-servers'
							),
							value: tempContextLength || '',
							onChange: ( val ) =>
								setTempContextLength(
									val ? parseInt( val, 10 ) : 0
								),
							placeholder: __(
								'e.g., 8192',
								'ai-provider-for-openai-compatible-servers'
							),
							disabled: isBusy,
							help: __(
								'Optional. Configures num_ctx and max_tokens parameters to control server memory limits.',
								'ai-provider-for-openai-compatible-servers'
							),
						} ),
						el( CheckboxControl, {
							label: __(
								'Disable thinking/reasoning blocks',
								'ai-provider-for-openai-compatible-servers'
							),
							checked: tempDisableThinking,
							onChange: ( val ) => setTempDisableThinking( val ),
							disabled: isBusy,
							help: __(
								'Optimizes context usage and prevents long thinking preambles for reasoning models (e.g. Qwen 3.7 or DeepSeek-R1).',
								'ai-provider-for-openai-compatible-servers'
							),
						} ),
						el( CheckboxControl, {
							label: __(
								'Supports Images',
								'ai-provider-for-openai-compatible-servers'
							),
							checked: tempSupportsImages,
							onChange: ( val ) => setTempSupportsImages( val ),
							disabled: isBusy,
							help: __(
								'Enable this option if your local models support multimodal image inputs (e.g., Llama 3.2 Vision).',
								'ai-provider-for-openai-compatible-servers'
							),
						} ),
						el( CheckboxControl, {
							label: __(
								'Enable R1 Messages Format',
								'ai-provider-for-openai-compatible-servers'
							),
							checked: tempEnableR1Format,
							onChange: ( val ) => setTempEnableR1Format( val ),
							disabled: isBusy,
							help: __(
								'Wraps system instructions within the first user message instead of a separate system message (necessary for DeepSeek-R1 compatibility).',
								'ai-provider-for-openai-compatible-servers'
							),
						} ),

						// Custom HTTP Headers editor.
						el(
							__experimentalVStack,
							{
								spacing: 2,
								style: {
									borderTop: '1px dashed #eee',
									paddingTop: '16px',
									marginTop: '8px',
								},
							},
							el(
								'label',
								{
									style: {
										fontWeight: '600',
										fontSize: '13px',
										display: 'block',
									},
								},
								__(
									'Custom HTTP Headers',
									'ai-provider-for-openai-compatible-servers'
								)
							),
							tempHeaders.map( ( header, idx ) =>
								el(
									__experimentalHStack,
									{ key: idx, spacing: 2 },
									el( TextControl, {
										__next40pxDefaultSize: true,
										placeholder: __(
											'Header Name',
											'ai-provider-for-openai-compatible-servers'
										),
										value: header.key,
										onChange: ( val ) => {
											const next = [ ...tempHeaders ];
											next[ idx ].key = val;
											setTempHeaders( next );
										},
									} ),
									el( TextControl, {
										__next40pxDefaultSize: true,
										placeholder: __(
											'Value',
											'ai-provider-for-openai-compatible-servers'
										),
										value: header.value,
										onChange: ( val ) => {
											const next = [ ...tempHeaders ];
											next[ idx ].value = val;
											setTempHeaders( next );
										},
									} ),
									el(
										Button,
										{
											variant: 'secondary',
											onClick: () => {
												const next = tempHeaders.filter(
													( _, i ) => i !== idx
												);
												setTempHeaders( next );
											},
										},
										__(
											'Remove',
											'ai-provider-for-openai-compatible-servers'
										)
									)
								)
							),
							el(
								Button,
								{
									variant: 'secondary',
									size: 'small',
									onClick: () => {
										setTempHeaders( [
											...tempHeaders,
											{ key: '', value: '' },
										] );
									},
								},
								__(
									'Add Header',
									'ai-provider-for-openai-compatible-servers'
								)
							)
						)
					)
				),
				el(
					__experimentalHStack,
					{ justify: 'space-between', style: { width: '100%' } },
					el(
						Button,
						{
							__next40pxDefaultSize: true,
							variant: 'primary',
							disabled: isBusy,
							onClick: handleSave,
						},
						__(
							'Save',
							'ai-provider-for-openai-compatible-servers'
						)
					),
					isConnected &&
						el(
							Button,
							{
								variant: 'link',
								isDestructive: true,
								onClick: handleRemove,
								disabled: isBusy,
							},
							__(
								'Remove and replace',
								'ai-provider-for-openai-compatible-servers'
							)
						)
				)
			)
	);
}

// Intercept registry of 'openai-compatible-servers' connector to use our custom renderer.
__experimentalRegisterConnector( 'openai-compatible-servers', {
	render: OpenAiCompatibleServersConnector,
} );
