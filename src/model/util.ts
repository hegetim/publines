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
