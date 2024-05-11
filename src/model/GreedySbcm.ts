/*********************************************************************************
 * Greedy heuristic for storyline block crossing minimization                    *
 * algorithm and code originally by Tim Herrmann                                 *
 * see https://gitlab2.informatik.uni-wuerzburg.de/s335460/masterarbeit-herrmann *
 * some type annotations by Florian Thiele                                       *
 * see commit c89ba797da13acd93a0262cd061ba257367d91ec                           *
 *********************************************************************************/

import { BlockCrossings, Realization, Storyline } from "./Storyline";

type Group = { author: number, position: number }[];

interface PairInfo {
    char1: Group[number];
    char2: Group[number];
    gNrOfChar1: number;
    gNrOfChar2: number;
    isFirst: boolean;
};

/** return solution of heuristic start permutation */
export function heuristicPermutation(C: number[], M: number[][], k: number) {
    // make sure first meeting is possible
    let currentP = M[0]!;
    let restC = C;
    for (let i = 0; i < M[0]!.length; i++) {
        restC = restC.filter(e => e !== M[0]![i]);
    }
    let A = buildSimilarityMatrix(C, M, -1, 2 * k);

    // find best partner around current starting permutation
    for (; ;) {
        // setup
        if (restC.length <= 0) {
            break;
        }
        let currentBestSimilarity = -1;
        let currentBestChar = [restC[0]!];
        let isTop = true;
        let indexTop = C.indexOf(currentP[0]!);
        let indexBot = C.indexOf(currentP[currentP.length - 1]!);

        // look for best partner character
        for (let j = 0; j < restC.length; j++) {
            if (A[j]![indexTop]! > currentBestSimilarity) {
                currentBestSimilarity = A[j]![indexTop]!;
                currentBestChar = [restC[j]!];
                isTop = true;
            }
            if (A[j]![indexBot]! > currentBestSimilarity) {
                currentBestSimilarity = A[j]![indexBot]!;
                currentBestChar = [restC[j]!];
                isTop = false;
            }
        }

        // add best char to start permutation and remove it from restC
        if (isTop) {
            currentP = currentBestChar.concat(currentP);
        } else {
            currentP = currentP.concat(currentBestChar);
        }
        restC = restC.filter(e => e !== currentBestChar[0]);
    }
    return currentP;
}

/** returns an object (isValid, startElementIndex)
  * isValid is true if all authors of meeting_authors are adjacent in permutation p
  * startElement is the position of the first element of meeting m in permutation p
                 todo: may be first author in permutation thats in the meeting */
function isValidMeeting(p: number[], meeting_authors: number[]) {
    for (let i = 0; i < p.length; i++) {
        if (meeting_authors.includes(p[i]!)) {
            if ((i + meeting_authors.length - 1) > p.length) {
                return { isValid: false, startElementIndex: 0 };
            }
            for (let j = i + 1; j < i + meeting_authors.length; j++) {
                if (!meeting_authors.includes(p[j]!)) {
                    return { isValid: false, startElementIndex: 0 };
                }
            }
            return { isValid: true, startElementIndex: i };
        }
    }
    return { isValid: false, startElementIndex: 0 };
}

/** returns a matrix which describes the similarity between every character-pair */
function buildSimilarityMatrix(p: number[], meetings: number[][], i: number, t: number): number[][] {
    // create empty similarity matrix
    let A: number[][] = [];
    for (let i = 0; i < p.length; i++) {
        A[i] = [];
        for (let j = 0; j < p.length; j++) {
            A[i]![j] = 0;
        }
    }
    // increase similarity of pairs in the matrix
    const stop = Math.min(meetings.length - i, t);
    for (let mNr = i + 1; mNr < stop + i; mNr++) { // iterate meetings
        for (let pNr = 0; pNr < p.length; pNr++) { // iterate characters of current permutation
            if (meetings[mNr]!.includes(p[pNr]!)) { // found a char in current meeting
                for (let pNr2 = 0; pNr2 < p.length; pNr2++) { // iterate through other characters of this permutation
                    if (pNr !== pNr2 && meetings[mNr]!.includes(p[pNr2]!)) { // find pair that's part of same meeting
                        A[pNr]![pNr2] += 1 / (mNr - i); // increase their similarity value
                    }
                }
            }
        }
    }
    return A;
}

/** returns array of permutations (array of objects each) of meeting m in permutation p */
function buildGroups(p: number[], m: number[]): Group[] {
    let G: Group[] = [];
    let i: number = 0;
    while (i < p.length) {
        if (m.includes(p[i]!)) {
            let group: Group = [];
            group.push({ author: p[i]!, position: i });
            for (let j = i + 1; j < p.length; j++) {
                if (m.includes(p[j]!)) {
                    group.push({ author: p[j]!, position: j });
                    i++;
                } else {
                    break;
                }
            }
            G.push(group);
        }
        i++;
    }
    return G;
}

/** returns the number of crossings in a block crossings for two groups and two characters */
function blockCrossingSize(g1: Group, g2: Group, isFirst: boolean, char2: number, maxG1: number): number {
    let dist: number;
    if (g1[0]!.position < g2[0]!.position) {
        if (isFirst) {
            dist = (maxG1) * (g2[char2]!.position - g1[0]!.position - maxG1 + 1);
        } else {
            dist = (maxG1) * (g2[char2]!.position - g1[maxG1 - 1]!.position - 1);
        }
    } else {
        if (isFirst) {
            dist = (maxG1) * (g1[0]!.position - g2[char2]!.position - 1);
        } else {
            dist = (maxG1) * (g1[0]!.position - g2[char2]!.position - maxG1 + 1);
        }
    }
    return dist;
}

/** returns best pair to merge according to heuristic and the size of the block crossing it creates */
function findBestPair(p: number[], G: Group[], A: number[][]): PairInfo {
    let maxA: number = 0;
    let minDis: number = blockCrossingSize(G[0]!, G[1]!, true, 0, G[0]!.length);
    let currentPair = { char1: G[0]![0]!, char2: G[1]![0]!, gNrOfChar1: 0, gNrOfChar2: 1, isFirst: true };
    for (let g1Nr = 0; g1Nr < G.length; g1Nr++) {
        for (let g2Nr = 0; g2Nr < G.length; g2Nr++) { // iterate through all group-pairs
            if (g1Nr !== g2Nr) {
                for (let char2 = 0; char2 < G[g2Nr]!.length; char2++) { // iterate through all characters of group 2
                    let maxG1 = G[g1Nr]!.length;
                    // number of crossings if char is first of group 1
                    let topDis = blockCrossingSize(G[g1Nr]!, G[g2Nr]!, true, char2, maxG1);
                    // number of crossings if char is last of group 1
                    let botDis = blockCrossingSize(G[g1Nr]!, G[g2Nr]!, false, char2, maxG1);
                    if (A[G[g1Nr]![0]!.position]![G[g2Nr]![char2]!.position]! > maxA) {
                        // checks if similarity between first char of group 1 and iterated char is better than current best
                        maxA = A[G[g1Nr]![0]!.position]![G[g2Nr]![char2]!.position]!;
                        currentPair = { char1: G[g1Nr]![0]!, char2: G[g2Nr]![char2]!, gNrOfChar1: g1Nr, gNrOfChar2: g2Nr, isFirst: true };
                        minDis = topDis;
                    }
                    if (A[G[g1Nr]![maxG1 - 1]!.position]![G[g2Nr]![char2]!.position]! > maxA) {
                        // checks if similarity between last char of group 1 and iterated char is better than current best
                        maxA = A[G[g1Nr]![maxG1 - 1]!.position]![G[g2Nr]![char2]!.position]!;
                        currentPair = { char1: G[g1Nr]![maxG1 - 1]!, char2: G[g2Nr]![char2]!, gNrOfChar1: g1Nr, gNrOfChar2: g2Nr, isFirst: false };
                        minDis = botDis;
                    }
                    if (A[G[g1Nr]![0]!.position]![G[g2Nr]![char2]!.position] === maxA && topDis < minDis) {
                        // like first IF, if similarity is the same, consider amount of crossings in bk
                        maxA = A[G[g1Nr]![0]!.position]![G[g2Nr]![char2]!.position]!;
                        currentPair = { char1: G[g1Nr]![0]!, char2: G[g2Nr]![char2]!, gNrOfChar1: g1Nr, gNrOfChar2: g2Nr, isFirst: true };
                        minDis = topDis;
                    }
                    if (A[G[g1Nr]![maxG1 - 1]!.position]![G[g2Nr]![char2]!.position] === maxA && botDis < minDis) {
                        // like second IF, if similarity is the same, consider amount of crossings in bk
                        maxA = A[G[g1Nr]![maxG1 - 1]!.position]![G[g2Nr]![char2]!.position]!;
                        currentPair = { char1: G[g1Nr]![maxG1 - 1]!, char2: G[g2Nr]![char2]!, gNrOfChar1: g1Nr, gNrOfChar2: g2Nr, isFirst: false };
                        minDis = botDis;
                    }
                }
            }
        }
    }
    return currentPair;
}


/** returns new permutation after a pair and their respective groups got merged */
function adaptPermutation(pair: PairInfo, p: number[], G: Group[], _A: number[][]): [number[], [number, number, number]] {
    let newP: number[] = [];
    let bc: [number, number, number];
    let g1Length = G[pair.gNrOfChar1]!.length;
    if (pair.char1.position < pair.char2.position) {
        let middle = 0;
        if (pair.isFirst) {
            for (let i = 0; i < p.length; i++) {	// g1 before g2, g1 first element
                if (i < pair.char1.position) {
                    newP.push(p[i]!);
                } else if (i <= pair.char2.position - g1Length) {
                    newP.push(p[i + g1Length]!);
                    middle++;
                } else if (i <= pair.char2.position) {
                    newP.push(p[i - middle]!);
                } else {
                    newP.push(p[i]!);
                }
            }
            bc = [pair.char1.position, pair.char1.position + g1Length - 1, pair.char2.position];
        } else {
            for (let i = 0; i < p.length; i++) {	// g1 before g2, g1 last element
                if (i <= pair.char1.position - g1Length) {
                    newP.push(p[i]!);
                } else if (i < pair.char2.position - g1Length) {
                    newP.push(p[i + g1Length]!);
                    middle++;
                } else if (i < pair.char2.position) {
                    newP.push(p[i - middle]!);
                } else {
                    newP.push(p[i]!);
                }
            }
            bc = [pair.char1.position - g1Length + 1, pair.char1.position, pair.char2.position - 1];
        }
    } else {
        if (pair.isFirst) {
            for (let i = 0; i < p.length; i++) {	// g2 before g1, g1 first element
                if (i <= pair.char2.position) {
                    newP.push(p[i]!);
                } else if (i <= pair.char2.position + g1Length) {
                    newP.push(p[pair.char1.position - pair.char2.position + i - 1]!);
                } else if (i < pair.char1.position + g1Length) {
                    newP.push(p[i - g1Length]!);
                } else {
                    newP.push(p[i]!);
                }
            }
            bc = [pair.char2.position + 1, pair.char1.position - 1, pair.char1.position + g1Length - 1];
        } else {
            for (let i = 0; i < p.length; i++) {	// g2 before g1, g1 last element
                if (i < pair.char2.position) {
                    newP.push(p[i]!);
                } else if (i < pair.char2.position + g1Length) {
                    newP.push(p[pair.char1.position - g1Length - pair.char2.position + i + 1]!);
                } else if (i <= pair.char1.position) {
                    newP.push(p[i - g1Length]!);
                } else {
                    newP.push(p[i]!);
                }
            }
            bc = [pair.char2.position, pair.char1.position - g1Length, pair.char1.position];
        }
    }
    return [newP, bc];
}

export const greedySbcmStep = (story: Storyline, lookahead: number, init: number[]): [Realization, number[]] => {
    const meetings = story.meetings;
    const blockCrossings: BlockCrossings[] = [[]]; // first meeting always fits

    let currentPermutation = init;
    let firstMeetingInPermutation: boolean = true;
    let i: number = 0;

    while (i < meetings.length) {

        // check already satisfied meetings
        while (i < meetings.length) {
            const meetingInfo = isValidMeeting(currentPermutation, meetings[i]!);
            if (!meetingInfo.isValid) {
                break;
            } else {
                if (!firstMeetingInPermutation) {
                    blockCrossings.push([]);
                }
                if (i == meetings.length - 1) {
                    return [{ initialPermutation: init, blockCrossings }, currentPermutation];
                }
                firstMeetingInPermutation = false;
                i++;
            }
        }

        // find suitable crossings and update permutations
        const A = buildSimilarityMatrix(currentPermutation, meetings, i, lookahead);
        const newBcs: BlockCrossings = [];
        for (; ;) {
            const G = buildGroups(currentPermutation, meetings[i]!);
            if (G.length <= 1) {
                break;
            }
            const pairInfo = findBestPair(currentPermutation, G, A);
            const [nextP, nextBc] = adaptPermutation(pairInfo, currentPermutation, G, A);
            currentPermutation = nextP;
            newBcs.push(nextBc);
            firstMeetingInPermutation = true;
        }
        blockCrossings.push(newBcs);
    }
    return [{ initialPermutation: init, blockCrossings }, currentPermutation];
}

export const greedySbcm = (storyline: Storyline, lookahead: number): Realization => {
    const meetings = storyline.meetings;
    const allAuthors = Array.from({ length: Math.max(...meetings.flat()) + 1 }, (_, i) => i);
    const initialPermutation: number[] = heuristicPermutation(allAuthors, meetings, lookahead);
    return greedySbcmStep(storyline, lookahead, initialPermutation)[0];
}
