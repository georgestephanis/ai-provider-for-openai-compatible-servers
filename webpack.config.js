/**
 * Builds src/connector-ui.js as a script module (ESM) into build/.
 *
 * Requires the --experimental-modules flag, which makes the wp-scripts
 * config export a [ script, module ] pair; we derive from the module one.
 * Everything is bundled except @wordpress/connectors, which stays a static
 * import satisfied by core's script-modules import map.
 */
const { join } = require( 'path' );
const DependencyExtractionWebpackPlugin = require( '@wordpress/dependency-extraction-webpack-plugin' );

const configs = require( '@wordpress/scripts/config/webpack.config' );
const moduleConfig = Array.isArray( configs ) ? configs[ 1 ] : null;

if ( ! moduleConfig ) {
	throw new Error(
		'Run wp-scripts build/start with --experimental-modules to build the script module.'
	);
}

module.exports = {
	...moduleConfig,
	entry: {
		'connector-ui': join( __dirname, 'src', 'connector-ui.js' ),
	},
	output: {
		...moduleConfig.output,
		path: join( __dirname, 'build' ),
	},
	plugins: [
		...moduleConfig.plugins.filter(
			( plugin ) =>
				plugin.constructor.name !== 'DependencyExtractionWebpackPlugin'
		),
		new DependencyExtractionWebpackPlugin( {
			requestToExternalModule( request ) {
				if ( request === '@wordpress/connectors' ) {
					return request;
				}
			},
		} ),
	],
};
