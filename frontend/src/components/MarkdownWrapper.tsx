"use client";

import type { ReactNode } from "react";
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx";

// Porta de frontend/src/components/MarkdownWrapper: formatação do WhatsApp
// (*negrito*, ~riscado~), HTML cru desligado e só estas tags renderizadas.
const ALLOWED = ["a", "b", "strong", "em", "u", "code", "del"];

const ELEMENTS = [
  "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "big", "blockquote",
  "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del",
  "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins",
  "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "marquee", "menu", "menuitem", "meta",
  "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre",
  "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span",
  "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time",
  "title", "tr", "track", "u", "ul", "var", "video", "wbr", "circle", "clipPath", "defs", "ellipse",
  "foreignObject", "g", "image", "line", "linearGradient", "marker", "mask", "path", "pattern", "polygon",
  "polyline", "radialGradient", "rect", "stop", "svg", "text", "tspan"
];

function CustomLink({ children, ...props }: { children?: ReactNode; href?: string }) {
  return (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function PlainChildren({ children }: { children?: ReactNode }) {
  return <>{children ?? null}</>;
}

const OPTIONS: MarkdownToJSX.Options = {
  disableParsingRawHTML: true,
  forceInline: true,
  overrides: {
    ...Object.fromEntries(ELEMENTS.filter(el => !ALLOWED.includes(el)).map(el => [el, { component: PlainChildren }])),
    a: { component: CustomLink }
  }
};

export const toMarkdown = (text: string): string => text.replace(/\*(.*?)\*/g, "**$1**").replace(/~(.*?)~/g, "~~$1~~");

export default function MarkdownWrapper({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Markdown options={OPTIONS}>{toMarkdown(children)}</Markdown>;
}
