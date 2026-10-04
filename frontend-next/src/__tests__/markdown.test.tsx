import { render } from "@testing-library/react";
import MarkdownWrapper, { toMarkdown } from "@/components/MarkdownWrapper";

describe("MarkdownWrapper", () => {
  it("converte a formatação do WhatsApp", () => {
    expect(toMarkdown("*negrito* e ~riscado~")).toBe("**negrito** e ~~riscado~~");
  });

  it("renderiza só as tags permitidas e links em nova aba", () => {
    const { container } = render(
      <MarkdownWrapper>{"*oi* [site](https://exemplo.com) <img src=x onerror=alert(1)> # titulo"}</MarkdownWrapper>
    );
    expect(container.querySelector("strong")?.textContent).toBe("oi");
    const link = container.querySelector("a");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("h1")).toBeNull();
  });
});
