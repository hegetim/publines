import { BlockCrossings } from "../model/Sbcm";

export interface DrawingInfo {
    lineDist: number,
    stretch: number,
}

export const bcWidth = (info: DrawingInfo, a: number, b: number, c: number) => {
    const hypo = ((b - a) + 2 * info.stretch * (c - a)) * info.lineDist;
    const cat1 = (2 * (b - a + info.stretch * (c - a)) - c) * info.lineDist;
    return Math.sqrt(hypo * hypo - cat1 * cat1);
}

export const drawSLine = (info: DrawingInfo, startIdx: number, a: number, b: number, c: number) => {

}