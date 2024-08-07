/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: CC0-1.0
 */

const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        client: {
            logging: 'info',
            overlay: true,
        },
        compress: true,
        open: true,
        static: './build',
    },
    stats: {
        errorDetails: true,
    },
});
