/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { JSDOM } from 'jsdom';

export const parseXml = (raw: string) => new (new JSDOM("")).window.DOMParser().parseFromString(raw, 'application/xml');
