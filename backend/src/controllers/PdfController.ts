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
import { db } from "../config/firebase";
import logger from "../utils/logger";

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

      logger.info("Processando PDF", {
        tenantId,
        fileName: file.originalname,
        fileSize: file.size,
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
      const contatos = dataCleanerService.processar(brutos);

      if (contatos.length === 0) {
        ResponseHelper.badRequest(
          res,
          "Nenhum contato válido encontrado. Verifique se os imóveis possuem proprietário, telefone e valor de venda ou locação."
        );
        return;
      }

      // 3. Verificar deduplicação com envios anteriores
      const contatosComStatus = await deduplicacaoService.verificar(
        tenantId,
        contatos
      );

      // 4. Buscar template do tenant
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();
      const template = tenantData?.mensagemTemplate || {
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
