import { describe, expect, it } from "vitest";
import { maskCpfCnpjInput, normalizeCpfCnpj } from "./format";

describe("cpf/cnpj", () => {
  it("aplica máscara progressiva de CPF e troca para CNPJ após 11 dígitos", () => {
    expect(maskCpfCnpjInput("52998224725")).toBe("529.982.247-25");
    expect(maskCpfCnpjInput("11222333000181")).toBe("11.222.333/0001-81");
    expect(maskCpfCnpjInput("5299")).toBe("529.9");
  });

  it("valida dígitos verificadores", () => {
    expect(normalizeCpfCnpj("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpfCnpj("11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizeCpfCnpj("529.982.247-24")).toBeNull();
    expect(normalizeCpfCnpj("111.111.111-11")).toBeNull();
    expect(normalizeCpfCnpj("123")).toBeNull();
  });
});
