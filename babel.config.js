/**
 * The default preset compiles JSX with the automatic runtime, which imports
 * from react/jsx-runtime — a module WordPress core does not provide in the
 * script-modules import map. Use the classic runtime instead, targeting the
 * createElement pulled off window.wp.element in the source.
 */
module.exports = {
	presets: [ '@wordpress/babel-preset-default' ],
	plugins: [
		[
			'@babel/plugin-transform-react-jsx',
			{
				runtime: 'classic',
				pragma: 'createElement',
				pragmaFrag: 'Fragment',
			},
		],
	],
};
