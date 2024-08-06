/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
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
