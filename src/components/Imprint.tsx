/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from "react"
import { intersperse } from "../model/Util";

export const Imprint = (props: {}) => {
    const [items, setItems] = useState<ImprintItem[]>([]);

    useEffect(() => {
        getCsv()
            .then(parseCsv)
            .then(setItems)
            .catch(err => { console.error("failed to load imprint csv"); console.error(err) });
    }, []);

    return <span className='main-page-imprint'>
        {intersperse(
            items.map(({ logoRef, text, url }, i) => <span key={`${i}.0`} className="main-imprint-item">
                {logoRef.length > 0 ? <img src={logoRef} /> : ""}
                {url.length > 0 ? <a href={url}>{text}</a> : <span>{text}</span>}
            </span>),
            (_0, i) => <span key={`${i}.1`}>•</span>
        )}
    </span>
}

const configUrl = './imprint.csv'

const getCsv = async () => fetch(configUrl)
    .then(response => response.text())
    .catch(reason => {
        console.error("failed to load imprint csv");
        console.error(reason);
        return "gh.svg,find us on GitHub,https://github.com/hegetim/publines";
    })

const parseCsv = (raw: string): ImprintItem[] =>
    raw.split(/\r?\n|\r|\n/g).flatMap(line => {
        if (line === '' || line.startsWith("#")) return []; // skip empty lines and comments
        const [logoRef, text, url] = line.split(/,/);
        if (logoRef === undefined || url === undefined || text === undefined) {
            console.warn(`invalid line in imprint csv: ${line}`);
            return [];
        }
        else return [{ logoRef, text, url }];
    })

interface ImprintItem {
    logoRef: string,
    url: string,
    text: string,
}
