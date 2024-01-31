export const as = <T>(t: T): T => t

export const assertExhaustive = (_: never): never => { throw TypeError("unreachable code") }
