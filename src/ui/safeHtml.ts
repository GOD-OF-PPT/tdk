import { FilterXSS, escapeAttrValue } from 'xss';
import type { IWhiteList } from 'xss';

const commonAttributes = ['id', 'class', 'title', 'role', 'style', 'hidden'];
const whiteList: IWhiteList = {};
for (const tag of [
  'article', 'aside', 'b', 'button', 'div', 'em', 'footer', 'form', 'h1', 'h2',
  'h3', 'header', 'input', 'label', 'p', 'section', 'small', 'span', 'strong',
  'table', 'tbody', 'td', 'th', 'thead', 'tr',
]) {
  whiteList[tag] = [...commonAttributes];
}
whiteList.button!.push('type', 'disabled');
whiteList.input!.push('type', 'name', 'value', 'min', 'max', 'step', 'maxlength', 'autocomplete', 'required');
whiteList.label!.push('for');
whiteList.td!.push('colspan');
whiteList.th!.push('colspan');

const svgAttributes = [
  ...commonAttributes, 'viewbox', 'preserveaspectratio', 'x', 'y', 'x1', 'y1',
  'x2', 'y2', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'd', 'points',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-opacity', 'opacity', 'offset', 'stop-color', 'stop-opacity',
];
for (const tag of ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'defs', 'radialgradient', 'stop']) {
  whiteList[tag] = [...svgAttributes];
}

const color = /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8})$/i;
const paint = /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|none|currentcolor|transparent|black|white|url\(#[\w-]+\))$/i;
const sanitizer = new FilterXSS({
  whiteList,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed', 'template', 'math', 'foreignobject', 'noscript'],
  css: {
    whiteList: {
      color,
      background: color,
      'border-color': color,
      'border-left-color': color,
      width: /^\d+(?:\.\d+)?%$/,
      'animation-delay': /^\d+(?:\.\d+)?ms$/,
    },
  },
  onTagAttr(_tag, name, value) {
    if (['fill', 'stroke', 'stop-color'].includes(name) && !paint.test(value)) return '';
    if (/^(?:aria|data)-[a-z][a-z\d-]*$/.test(name)) {
      return `${name}="${escapeAttrValue(value)}"`;
    }
  },
});

/** Render only approved game UI markup; URLs, event handlers and active embeds are excluded. */
export function setSanitizedHtml(target: Element, markup: string): void {
  const safeMarkup = sanitizer.process(markup);
  const parsed = new DOMParser().parseFromString(safeMarkup, 'text/html');
  target.replaceChildren(...Array.from(parsed.body.childNodes));
}
