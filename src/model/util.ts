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
