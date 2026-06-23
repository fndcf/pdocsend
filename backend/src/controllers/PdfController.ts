/**
 * Controller para processamento de PDFs
 */

import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import pdfParserService from "../services/PdfParserService";
import excelParserService from "../services/ExcelParserService";
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
      const { filtroOperacao, valorVendaMin, valorVendaMax, valorLocacaoMin, valorLocacaoMax } = processarPdfFormFieldsSchema.parse(formFields);

      const isExcel = file.originalname.toLowerCase().endsWith(".xlsx");

      logger.info(`Processando ${isExcel ? "Excel" : "PDF"}`, {
        tenantId,
        fileName: file.originalname,
        fileSize: file.size,
        filtroOperacao,
      });

      // 1. Extrair dados brutos do arquivo (PDF ou Excel)
      const brutos = isExcel
        ? excelParserService.extrairDoExcel(file.buffer)
        : await pdfParserService.extrairDoPdf(file.buffer);

      if (brutos.length === 0) {
        ResponseHelper.badRequest(
          res,
          `Nenhum imóvel encontrado no ${isExcel ? "Excel" : "PDF"}. Verifique se o formato está correto.`
        );
        return;
      }

      // 2. Limpar, normalizar e agrupar
      const { contatos: contatosLimpos, telefoneInvalido } = dataCleanerService.processar(brutos);
      let contatos = contatosLimpos;

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

      // 4. Aplicar filtro de faixa de valores
      const parsarValorBRL = (v: string): number => {
        if (!v) return 0;
        return parseFloat(v.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".")) || 0;
      };
      const toNum = (v: string | undefined): number | null => {
        if (!v || v.trim() === "") return null;
        const n = parseFloat(v.trim());
        return isNaN(n) ? null : n;
      };
      const vMin = toNum(valorVendaMin);
      const vMax = toNum(valorVendaMax);
      const lMin = toNum(valorLocacaoMin);
      const lMax = toNum(valorLocacaoMax);

      if (vMin !== null || vMax !== null || lMin !== null || lMax !== null) {
        const vendaOk = (valorStr: string): boolean => {
          const v = parsarValorBRL(valorStr);
          if (v === 0) return false;
          if (vMin !== null && v < vMin) return false;
          if (vMax !== null && v > vMax) return false;
          return true;
        };
        const locacaoOk = (valorStr: string): boolean => {
          const v = parsarValorBRL(valorStr);
          if (v === 0) return false;
          if (lMin !== null && v < lMin) return false;
          if (lMax !== null && v > lMax) return false;
          return true;
        };
        const temFiltroVenda = vMin !== null || vMax !== null;
        const temFiltroLocacao = lMin !== null || lMax !== null;

        contatos = contatos
          .map((contato) => ({
            ...contato,
            imoveis: contato.imoveis
              .map((im) => {
                if (im.operacao === "venda e locacao") {
                  const passaVenda = !temFiltroVenda || vendaOk(im.valorVenda);
                  const passaLocacao = !temFiltroLocacao || locacaoOk(im.valorLocacao);
                  if (!passaVenda && !passaLocacao) return null;
                  if (!passaVenda) return { ...im, operacao: "locacao" as const, valorVenda: "" };
                  if (!passaLocacao) return { ...im, operacao: "venda" as const, valorLocacao: "" };
                  return im;
                }
                if (im.operacao === "venda" && temFiltroVenda && !vendaOk(im.valorVenda)) return null;
                if (im.operacao === "locacao" && temFiltroLocacao && !locacaoOk(im.valorLocacao)) return null;
                return im;
              })
              .filter((im): im is NonNullable<typeof im> => im !== null),
          }))
          .filter((contato) => contato.imoveis.length > 0);

        if (contatos.length === 0) {
          ResponseHelper.badRequest(res, "Nenhum imóvel encontrado na faixa de valor informada. Ajuste os filtros e tente novamente.");
          return;
        }
      }

      // 6. Verificar deduplicação com envios anteriores
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

      // 5. Gerar preview das mensagens com rotação balanceada de templates
      const novosCount = contatosComStatus.filter((c) => c.status === "novo").length;
      const numTemplates = template.templatesPersonalizados?.filter(Boolean).length || 1;
      const indicesTemplates = messageBuilderService.gerarIndicesBalanceados(novosCount, numTemplates);
      let novoIdx = 0;

      const resultado = contatosComStatus.map((contato) => ({
        ...contato,
        nomeContato: messageBuilderService.montarNomeContato(contato),
        mensagemPreview:
          contato.status === "novo"
            ? messageBuilderService.montarMensagemPreview(contato, template, indicesTemplates[novoIdx++])
            : "",
      }));

      const novos = resultado.filter((c) => c.status === "novo").length;
      const jaEnviados = resultado.filter(
        (c) => c.status === "ja_enviado"
      ).length;

      logger.info(`${isExcel ? "Excel" : "PDF"} processado com sucesso`, {
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
            telefoneInvalido,
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

      if (error instanceof Error && error.message.includes("Erro ao processar")) {
        ResponseHelper.badRequest(res, error.message);
        return;
      }

      ResponseHelper.internalError(res, "Erro ao processar o arquivo");
    }
  }
}

export default new PdfController();
