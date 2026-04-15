import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "@/hooks/useFileUpload";

describe("useFileUpload", () => {
  it("deve iniciar sem arquivo e sem erro", () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.file).toBeNull();
    expect(result.current.error).toBe("");
  });

  it("deve aceitar arquivo PDF via handleFileChange", () => {
    const { result } = renderHook(() => useFileUpload());

    const pdfFile = new File(["content"], "test.pdf", { type: "application/pdf" });
    const event = {
      target: { files: [pdfFile] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    expect(result.current.file).toBe(pdfFile);
    expect(result.current.error).toBe("");
  });

  it("deve rejeitar arquivo não-PDF via handleFileChange", () => {
    const { result } = renderHook(() => useFileUpload());

    const txtFile = new File(["content"], "test.txt", { type: "text/plain" });
    const event = {
      target: { files: [txtFile] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    expect(result.current.file).toBeNull();
    expect(result.current.error).toBe("Formato inválido. Envie um arquivo PDF ou Excel (.xlsx).");
  });

  it("deve aceitar arquivo PDF via handleDrop", () => {
    const { result } = renderHook(() => useFileUpload());

    const pdfFile = new File(["content"], "dropped.pdf", { type: "application/pdf" });
    const event = {
      preventDefault: jest.fn(),
      dataTransfer: { files: [pdfFile] },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDrop(event);
    });

    expect(result.current.file).toBe(pdfFile);
    expect(result.current.error).toBe("");
  });

  it("deve rejeitar arquivo não-PDF via handleDrop", () => {
    const { result } = renderHook(() => useFileUpload());

    const imgFile = new File(["content"], "image.png", { type: "image/png" });
    const event = {
      preventDefault: jest.fn(),
      dataTransfer: { files: [imgFile] },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDrop(event);
    });

    expect(result.current.file).toBeNull();
    expect(result.current.error).toBe("Formato inválido. Envie um arquivo PDF ou Excel (.xlsx).");
  });

  it("deve limpar arquivo e erro com clearFile", () => {
    const { result } = renderHook(() => useFileUpload());

    // Primeiro seleciona um arquivo
    const pdfFile = new File(["content"], "test.pdf", { type: "application/pdf" });
    const event = {
      target: { files: [pdfFile] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });
    expect(result.current.file).toBe(pdfFile);

    // Depois limpa
    act(() => {
      result.current.clearFile();
    });

    expect(result.current.file).toBeNull();
    expect(result.current.error).toBe("");
  });

  it("deve permitir setar erro manualmente", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.setError("Erro customizado");
    });

    expect(result.current.error).toBe("Erro customizado");
  });
});
