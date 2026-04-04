/**
 * Controller para processamento de PDFs
 */

import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import pdfParserService from "../services/PdfParserService";
import dataCleanerService from "../services/DataCleanerService";
import deduplicacaoService from "../services/DeduplicacaoService";
import messageBuilderService from "../services/MessageBuilderService";
import logger from "../utils/logger";
import { processarPdfFormFieldsSchema } from "../schemas/pdfSchemas";
import tenantRepository from "../repositories/TenantRepository";

class PdfController {
  /**
   * Processa PDF e retorna contatos para revisão
   * POST /api/pdf/processar
   */
  async processar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;
      const file = req.file;

      if (!file) {
        ResponseHelper.badRequest(res, "Nenhum arquivo enviado");
        return;
      }

      const formFields = (req as unknown as Record<string, unknown>).formFields as Record<string, string> || {};
      const { filtroOperacao } = processarPdfFormFieldsSchema.parse(formFields);

      logger.info("Processando PDF", {
        tenantId,
        fileName: file.originalname,
        fileSize: file.size,
        filtroOperacao,
      });

      // 1. Extrair dados brutos do PDF
      const brutos = await pdfParserService.extrairDoPdf(file.buffer);

      if (brutos.length === 0) {
        ResponseHelper.badRequest(
          res,
          "Nenhum imóvel encontrado no PDF. Verifique se o formato está correto."
        );
        return;
      }

      // 2. Limpar, normalizar e agrupar
      let contatos = dataCleanerService.processar(brutos);

      // 3. Aplicar filtro de operação
      if (filtroOperacao !== "todos") {
        contatos = contatos
          .map((contato) => ({
            ...contato,
            imoveis: contato.imoveis
              .filter((im) => {
                if (filtroOperacao === "venda") {
                  return im.operacao === "venda" || im.operacao === "venda e locacao";
                }
                if (filtroOperacao === "locacao") {
                  return im.operacao === "locacao" || im.operacao === "venda e locacao";
                }
                return true;
              })
              .map((im) => {
                // Ajustar operação para quem tem ambos
                if (im.operacao === "venda e locacao") {
                  return {
                    ...im,
                    operacao: filtroOperacao as "venda" | "locacao",
                    // Limpar o valor que não é da operação filtrada
                    valorVenda: filtroOperacao === "venda" ? im.valorVenda : "",
                    valorLocacao: filtroOperacao === "locacao" ? im.valorLocacao : "",
                  };
                }
                return im;
              }),
          }))
          .filter((contato) => contato.imoveis.length > 0);
      }

      if (contatos.length === 0) {
        ResponseHelper.badRequest(
          res,
          `Nenhum contato encontrado com operação de ${filtroOperacao === "venda" ? "venda" : "locação"}. Tente com outro filtro.`
        );
        return;
      }

      // 3. Verificar deduplicação com envios anteriores
      const contatosComStatus = await deduplicacaoService.verificar(
        tenantId,
        contatos
      );

      // 4. Buscar template do tenant
      const tenant = await tenantRepository.buscarPorId(tenantId);
      const template = tenant?.mensagemTemplate || {
        nomeCorretor: "Corretor",
        nomeEmpresa: "Imobiliária",
        cargo: "corretor",
      };

      // 5. Gerar preview das mensagens
      const resultado = contatosComStatus.map((contato) => ({
        ...contato,
        nomeContato: messageBuilderService.montarNomeContato(contato),
        mensagemPreview:
          contato.status === "novo"
            ? messageBuilderService.montarMensagemPreview(contato, template)
            : "",
      }));

      const novos = resultado.filter((c) => c.status === "novo").length;
      const jaEnviados = resultado.filter(
        (c) => c.status === "ja_enviado"
      ).length;

      logger.info("PDF processado com sucesso", {
        tenantId,
        totalBrutos: brutos.length,
        totalContatos: contatos.length,
        novos,
        jaEnviados,
      });

      ResponseHelper.success(
        res,
        {
          contatos: resultado,
          resumo: {
            totalImoveisNoPdf: brutos.length,
            totalImoveis: contatos.reduce((acc, c) => acc + c.imoveis.length, 0),
            totalContatos: contatos.length,
            novos,
            jaEnviados,
          },
          pdfOrigem: file.originalname,
        },
        `${novos} contato(s) novo(s) encontrado(s)${
          jaEnviados > 0
            ? `, ${jaEnviados} já enviado(s) anteriormente`
            : ""
        }`
      );
    } catch (error) {
      logger.error("Erro ao processar PDF", { tenantId: req.user?.tenantId }, error);

      if (error instanceof Error && error.message.includes("Erro ao processar o PDF")) {
        ResponseHelper.badRequest(res, error.message);
        return;
      }

      ResponseHelper.internalError(res, "Erro ao processar o PDF");
    }
  }
}

export default new PdfController();
