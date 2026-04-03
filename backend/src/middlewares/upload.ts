import { Request, Response, NextFunction } from "express";
import Busboy from "busboy";
import { AuthRequest } from "./auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB para PDFs

export function uploadPdf(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({ success: false, error: "Content-Type deve ser multipart/form-data" });
    return;
  }

  const busboy = Busboy({
    headers: req.headers,
    limits: { fileSize: MAX_FILE_SIZE },
  });

  let fileBuffer: Buffer | null = null;
  let fileName = "";
  let fileMimeType = "";
  let fileSize = 0;
  const formFields: Record<string, string> = {};

  busboy.on("field", (fieldname: string, val: string) => {
    formFields[fieldname] = val;
  });

  busboy.on("file", (_fieldname, file, info) => {
    const { filename, mimeType } = info;
    fileName = filename;
    fileMimeType = mimeType;

    const isPdf =
      mimeType === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      file.resume();
      res.status(400).json({
        success: false,
        error: "Formato de arquivo inválido. Envie um arquivo PDF (.pdf)",
      });
      return;
    }

    const chunks: Buffer[] = [];
    file.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      fileSize += chunk.length;
    });

    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
    });

    file.on("limit", () => {
      res.status(400).json({
        success: false,
        error: "Arquivo muito grande. Tamanho máximo: 10MB",
      });
    });
  });

  busboy.on("finish", () => {
    if (!fileBuffer) {
      if (!res.headersSent) {
        res.status(400).json({ success: false, error: "Nenhum arquivo enviado" });
      }
      return;
    }

    (req as AuthRequest).file = {
      buffer: fileBuffer,
      originalname: fileName,
      mimetype: fileMimeType,
      size: fileSize,
    };
    (req as unknown as Record<string, unknown>).formFields = formFields;

    next();
  });

  busboy.on("error", () => {
    if (!res.headersSent) {
      res.status(400).json({ success: false, error: "Erro ao processar arquivo" });
    }
  });

  // Cloud Functions Gen 2 passa rawBody
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (rawBody) {
    busboy.end(rawBody);
  } else {
    req.pipe(busboy);
  }
}
