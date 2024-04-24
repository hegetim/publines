import BitSet from "bitset";


export function* bfs(start: number, neighbors: (v: number) => number[]) {
    const queue: number[] = [];
    const visited = new BitSet();
    visited.set(start, 1);
    queue.push(start);
    let next: number | undefined;
    while ((next = queue.shift()) !== undefined) {
        neighbors(next).filter(w => visited.get(w) === 0).forEach(w => {
            visited.set(w, 1);
            queue.push(w);
        });
        yield next;
    }
}
