import React from "react"
import { as } from "../model/util"
import { DrawingInfo, bcWidth, drawSLine, mkBcMetrics } from "./StorylineUtils"

export const StorylineTest = () => {
    const info = as<DrawingInfo>({ lineDist: 10, stretch: .4, crossing2crossingMargin: 10, crossing2meetingMargin: 10, meeting2meetingMargin: 10 });
    const [m1, m2, m3, m4] = [mkBcMetrics(info, 0, 0, 1), mkBcMetrics(info, 1, 3, 4), mkBcMetrics(info, 3, 3, 4), mkBcMetrics(info, 0, 1, 4)];
    const [w1, w2, w3, w4] = [bcWidth(m1), bcWidth(m2), bcWidth(m3), bcWidth(m4)];
    console.log({ w1, w2, w3, w4 })
    const commons = { fill: "none", stroke: "black", strokeWidth: 1 };
    return <svg viewBox={`0 0 ${70 + w1 + w2 + w3 + w4} 60`}>
        <path {...commons} d={`M 10 10 h 10 ${drawSLine(m1, 0)} h 10 ${drawSLine(m2, 1)} h ${20 + w1} ${drawSLine(m4, 2)} h 10`} />
        <path {...commons} d={`M 10 20 h 10 ${drawSLine(m1, 1)} h ${30 + w1 + w2} ${drawSLine(m4, 0)} h 10`} />
        <path {...commons} d={`M 10 30 h ${20 + w1} ${drawSLine(m2, 2)} h 10 ${drawSLine(m3, 3)} h 10 ${drawSLine(m4, 4)} h 10`} />
        <path {...commons} d={`M 10 40 h ${20 + w1} ${drawSLine(m2, 3)} h 10 ${drawSLine(m3, 4)} h 10 ${drawSLine(m4, 3)} h 10`} />
        <path {...commons} d={`M 10 50 h ${20 + w1} ${drawSLine(m2, 4)} h ${20 + w1} ${drawSLine(m4, 1)} h10`} />
    </svg>
}