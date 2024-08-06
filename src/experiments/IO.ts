/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { open } from 'node:fs/promises';

export const saveToFile = async (path: string, data: any) => {
    const handle = await open(path, 'w');
    await handle.write(JSON.stringify(data)).finally(() => handle.close());
}

export const readFromFile = async <T>(path: string) => {
    const handle = await open(path, 'r');
    const raw = await handle.readFile('utf-8').finally(() => handle.close());
    return JSON.parse(raw) as T;
}

export const useCache = async <T>(path: string, f: () => Promise<T>): Promise<T> => open(path, 'r').then(
    async handle => {
        const raw = await handle.readFile('utf-8').finally(() => handle.close());
        return JSON.parse(raw) as T;
    },
    async err => {
        if (err['code'] === 'ENOENT') {
            const res = await f();
            return saveToFile(path, res).then(() => res);
        } else {
            console.error(err);
            return Promise.reject(err);
        }
    }
);
