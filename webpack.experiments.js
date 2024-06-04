const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');

module.exports = merge(common, {
    entry: {
        'exp-main': './src/experiments/Main.ts',
        'one-shot': './src/experiments/OneShot.ts',
        'benchmark': './src/experiments/Benchmark.ts'
    },
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/model\/XmlUtils\.ts/, './NodeXmlUtils.ts')
    ],
    target: 'node',
    mode: 'production',
    externals: {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
        canvas: "canvas",
    }
});
