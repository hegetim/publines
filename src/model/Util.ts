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

export const cls = (...names: (string | { [index: string]: boolean })[]) => {
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
