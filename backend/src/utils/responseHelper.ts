import { Response } from "express";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const ResponseHelper = {
  success<T>(res: Response, data?: T, message?: string) {
    const response: ApiResponse<T> = { success: true, data, message };
    res.status(200).json(response);
  },

  created<T>(res: Response, data?: T, message?: string) {
    const response: ApiResponse<T> = { success: true, data, message };
    res.status(201).json(response);
  },

  badRequest(res: Response, error: string) {
    const response: ApiResponse = { success: false, error };
    res.status(400).json(response);
  },

  unauthorized(res: Response, error = "Não autorizado") {
    const response: ApiResponse = { success: false, error };
    res.status(401).json(response);
  },

  forbidden(res: Response, error = "Acesso negado") {
    const response: ApiResponse = { success: false, error };
    res.status(403).json(response);
  },

  notFound(res: Response, error = "Não encontrado") {
    const response: ApiResponse = { success: false, error };
    res.status(404).json(response);
  },

  conflict(res: Response, error: string) {
    const response: ApiResponse = { success: false, error };
    res.status(409).json(response);
  },

  internalError(res: Response, error = "Erro interno do servidor") {
    const response: ApiResponse = { success: false, error };
    res.status(500).json(response);
  },
};
