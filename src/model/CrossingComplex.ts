
interface GridNode<T extends GridNode<T>> {
    top: T | undefined,
    right: T | undefined,
    bottom: T | undefined,
    left: T | undefined,
}

interface Cell extends GridNode<Cell> {
    hLineId: number,
    vLineId: number,
    tlCorner: Corner,
    meetings: number[],
}

type Corner = GridNode<Corner> & (
    {
        kind: 'internal' | 'incomplete',
    } | {
        kind: 'boundary',
        prev: Corner & { kind: 'boundary'; },
        next: Corner & { kind: 'boundary'; },
        measure: number,
    }
);

const empty = <T extends GridNode<T>>(): GridNode<T> =>
    ({ top: undefined, right: undefined, bottom: undefined, left: undefined });

const xxx: Corner = ({ ...empty(), kind: 'internal' });