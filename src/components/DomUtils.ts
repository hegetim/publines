
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
