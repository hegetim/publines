import _ from "lodash";

export const as = <T>(t: T): T => t

export const assertExhaustive = (_: never): never => { throw TypeError("unreachable code") }

type Body<T extends { kind: K; }, K extends string, R> =
    { [P in T['kind']]: (t: T extends { kind: P; } ? T : never) => R };

export const matchByKind = <T extends { kind: K }, K extends string, R>(t: T, body: Body<T, K, R>): R => {
    return body[t.kind](t as any);
}

export const matchString = <K extends string, R>(k: K, body: { [P in K]: () => R }) => {
    return body[k]();
}

export function* windows<T>(array: T[], size: number) {
    for (let i = 0; i + size <= array.length; i++) {
        yield array.slice(i, i + size);
    }
}

export function* windows2<T>(array: T[]) {
    for (let i = 0; i + 2 <= array.length; i++) {
        yield [array[i], array[i + 1]] as [T, T];
    }
}

export type ClassNames = (string | { [index: string]: boolean })[];
export const cls = (...names: ClassNames) => {
    const joined = names.flatMap(name =>
        _.isString(name) ? [name] : _.toPairs(name).filter(([_, flag]) => flag).map(([s, _]) => s)
    ).join(" ");
    return { className: joined };
}

export const calcTextSize = (() => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    svg.setAttribute('class', 'off-screen-element');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.innerHTML = '<text>initial</text>';
    window.addEventListener("load", () => document.body.append(svg));
    const textNode = svg.firstChild! as SVGTextElement;
    return (text: string) => {
        textNode.textContent = text;
        return textNode.getBBox();
    };
})();

type Tail<T extends readonly any[] = readonly []> = T extends readonly [infer _, ...infer R] ? R : [];

export const tail = <T extends readonly any[]>(tuple: readonly [...T]) => tuple.slice(1) as readonly any[] as Tail<T>

export type TupleToUnion<T extends readonly string[]> = (T)[number]

export const toCharBase = (n: number) => {
    let res = '';
    while (n >= 0) {
        const char = n % 26;
        res = String.fromCharCode(65 + char) + res;
        n = n / 26 - 1;
    }
    return res;
}

export const expectIntOrFail = (a: any) => {
    if (typeof a === 'number' || typeof a === 'bigint') {
        const n = Number(a);
        if (Number.isInteger(n)) { return n; }
    }
    throw new TypeError(`${a} is not an int`);
}

export const hash = (o: any): number => Array.from(JSON.stringify(o))
    .reduce((acc, n) => (acc * 17 + (n.codePointAt(0) ?? 0)) % 4294967296, 43);

export const intersperse = <T>(ts: T[], f: (before: T, i: number) => T) =>
    ts.reduce((acc, t, i) => i === ts.length - 1 ? [...acc, t] : [...acc, t, f(t, i)], [] as T[])

export const expand = <T>(ts: T[], newLen: number, zero: () => T): void => {
    ts.push(...Array.from({ length: newLen - ts.length }, zero));
}
