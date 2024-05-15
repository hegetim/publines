const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = merge(common, {
    entry: {
        experiments: './src/experiments.ts'
    },
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/model\/XmlUtils\.ts/, './NodeXmlUtils.ts')
    ],
    target: 'node',
    mode: 'production'
});
