import { fail, finite, TupleToUnion } from "./Util";

export interface Codec<T> {
    enc: (t: T) => string,
    dec: (s: string) => readonly [T | undefined, string],
}

export const numberCodec = (): Codec<number> => ({
    enc: (n: number) => n.toString() + '!',
    dec: (s: string) => {
        const [head, tail] = s.split(/!(.*)/);
        if (tail === undefined) return [undefined, s];
        else return [finite(Number.parseFloat(head!)), tail];
    }
});

export const enumCodec = <K extends string, T extends readonly K[]>(keys: T): Codec<TupleToUnion<T>> => ({
    enc: t => number2ascii(keys.indexOf(t)),
    dec: s => {
        const i = ascii2number(s[0]!);
        return [i === undefined ? undefined : keys[i], s.slice(1)];
    }
})

const number2ascii = (i: number) => i >= 0 && i < 27 ? String.fromCharCode(i + 97) : fail(`unsupported: ${i}`);
const ascii2number = (s: string) => {
    const n = s.charCodeAt(0) - 97;
    return n >= 0 && n < 27 ? n : undefined;
}

export const singletonCodec = <T>(key: string, singleton: T): Codec<T> => ({
    enc: _t => key,
    dec: s => [s.slice(0, key.length) === key ? singleton : undefined, s.slice(key.length)]
});

export const or = <A, B>(a: Codec<A>, b: Codec<B>, isA: (ab: A | B) => boolean): Codec<A | B> => ({
    enc: t => isA(t) ? a.enc(t as A) : b.enc(t as B),
    dec: s => {
        const [aa, tail] = a.dec(s);
        if (aa === undefined) return b.dec(s);
        else return [aa, tail];
    }
});

export type CodecsForProduct<T> = { [P in keyof T]: Codec<T[P]> };

const productId = '*';

export const productCodec = <T extends {}>(codecs: CodecsForProduct<T>): Codec<T> => ({
    enc: t => {
        const res = [productId];
        for (const k in codecs) {
            res.push(codecs[k].enc(t[k]));
        }
        return res.join('');
    },
    dec: s => {
        if (!s.startsWith(productId)) return [undefined, s]
        const res: any = {};
        let rem = s.slice(1);
        for (const k in codecs) {
            const [val, tail] = codecs[k].dec(rem);
            if (val === undefined) return [undefined, s];
            res[k] = val;
            rem = tail;
        }
        return [res, rem];
    },
});

export const concat = <T extends readonly any[]>(codecs: CodecsForProduct<T>): Codec<T> => ({
    enc: t => t.map((x, i) => codecs[i]!.enc(x)).join(''),
    dec: s => {
        const res: any[] = [];
        let rem = s;
        for (const cc of codecs) {
            const [val, tail] = cc.dec(rem);
            if (val === undefined) return [undefined, s];
            res.push(val);
            rem = tail;
        }
        return [res as unknown as T, rem] as const;
    },
});

export const bimap = <A, B>(cc: Codec<A>, f: (a: A) => B, g: (b: B) => A): Codec<B> => ({
    enc: b => cc.enc(g(b)),
    dec: s => {
        const [res, tail] = cc.dec(s);
        if (res === undefined) return [undefined, tail];
        else return [f(res), tail];
    }
});
