/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const parseXml = (raw: string) => new DOMParser().parseFromString(raw, 'application/xml');
