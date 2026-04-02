/**
 * Service para montagem de mensagens personalizadas para WhatsApp
 */

import { Contato, Imovel } from "../models/Imovel";
import { MensagemTemplate } from "../models/Tenant";
import { getSaudacao } from "../utils/textUtils";

class MessageBuilderService {
  /**
   * Monta a mensagem personalizada para um contato
   */
  montarMensagem(contato: Contato, template: MensagemTemplate): string {
    const saudacao = getSaudacao();
    const nome = contato.nome;
    const operacaoTexto = this.montarOperacao(contato.imoveis);

    return (
      `${saudacao} ${nome}, tudo bem?\n` +
      `Sou o ${template.nomeCorretor}, ${template.cargo} do ${template.nomeEmpresa}. ` +
      `Estou entrando em contato para saber se você tem interesse em conversarmos sobre ${operacaoTexto}.\n\n` +
      `Fico à disposição!`
    );
  }

  /**
   * Monta a mensagem com saudação fixa (para preview na tela de revisão)
   */
  montarMensagemPreview(contato: Contato, template: MensagemTemplate): string {
    const nome = contato.nome;
    const operacaoTexto = this.montarOperacao(contato.imoveis);

    return (
      `{saudação} ${nome}, tudo bem?\n` +
      `Sou o ${template.nomeCorretor}, ${template.cargo} do ${template.nomeEmpresa}. ` +
      `Estou entrando em contato para saber se você tem interesse em conversarmos sobre ${operacaoTexto}.\n\n` +
      `Fico à disposição!`
    );
  }

  /**
   * Monta o nome do contato para identificação no sistema
   */
  montarNomeContato(contato: Contato): string {
    const primeiroImovel = contato.imoveis[0];
    const referencia = this.getReferencia(primeiroImovel);
    return `${contato.nome} - ${referencia}`;
  }

  /**
   * Monta o trecho de operação + imóveis da mensagem
   *
   * 1 imóvel:  "a venda do seu imóvel no Landing Home"
   * 2 imóveis: "a venda do seu imóvel no Landing Home e a locação do seu imóvel na Renascenca, 112"
   * 3+ imóveis: "a venda dos seus imóveis no Landing Home, na Renascenca, 112 e na Rua X, 200"
   */
  private montarOperacao(imoveis: Imovel[]): string {
    if (imoveis.length === 1) {
      return this.montarOperacaoUnica(imoveis[0]);
    }

    // Múltiplos imóveis - verificar se todas as operações são iguais
    const operacoes = new Set(imoveis.map((im) => im.operacao));
    const todasIguais = operacoes.size === 1;

    if (todasIguais) {
      return this.montarOperacaoMultiplosIguais(imoveis);
    }

    return this.montarOperacaoMultiplosDiferentes(imoveis);
  }

  /**
   * Um imóvel: "a venda do seu imóvel no Landing Home"
   */
  private montarOperacaoUnica(imovel: Imovel): string {
    const op = this.getOperacaoLabel(imovel.operacao);
    const ref = this.getReferencia(imovel);
    return `a ${op} do seu imóvel no ${ref}`;
  }

  /**
   * Múltiplos imóveis com mesma operação:
   * "a locação dos seus imóveis na Renascenca, 112 (Apt 2) e na Renascenca, 112 (Apt 3)"
   */
  private montarOperacaoMultiplosIguais(imoveis: Imovel[]): string {
    const op = this.getOperacaoLabel(imoveis[0].operacao);
    const refs = imoveis.map((im) => this.getReferencia(im));
    const listaRefs = this.juntarLista(refs.map((r) => `no ${r}`));
    return `a ${op} dos seus imóveis ${listaRefs}`;
  }

  /**
   * Múltiplos imóveis com operações diferentes:
   * "a venda do seu imóvel no Landing Home e a locação do seu imóvel na Renascenca, 112"
   */
  private montarOperacaoMultiplosDiferentes(imoveis: Imovel[]): string {
    const partes = imoveis.map((im) => {
      const op = this.getOperacaoLabel(im.operacao);
      const ref = this.getReferencia(im);
      return `a ${op} do seu imóvel no ${ref}`;
    });
    return this.juntarLista(partes);
  }

  /**
   * Retorna a referência do imóvel: Edifício ou Endereço + Número
   */
  private getReferencia(imovel: Imovel): string {
    if (imovel.edificio) {
      if (imovel.apartamento) {
        return `${imovel.edificio} (Apt ${imovel.apartamento})`;
      }
      return imovel.edificio;
    }

    let ref = imovel.endereco;
    if (imovel.numero) {
      ref += `, ${imovel.numero}`;
    }
    if (imovel.apartamento) {
      ref += ` (Apt ${imovel.apartamento})`;
    }
    return ref;
  }

  /**
   * Retorna o label da operação
   */
  private getOperacaoLabel(operacao: Imovel["operacao"]): string {
    switch (operacao) {
      case "venda":
        return "venda";
      case "locacao":
        return "locação";
      case "venda e locacao":
        return "venda e locação";
    }
  }

  /**
   * Junta itens com vírgula e "e" no último
   * ["A", "B", "C"] -> "A, B e C"
   */
  private juntarLista(itens: string[]): string {
    if (itens.length === 1) return itens[0];
    if (itens.length === 2) return `${itens[0]} e ${itens[1]}`;
    const ultimo = itens[itens.length - 1];
    const resto = itens.slice(0, -1);
    return `${resto.join(", ")} e ${ultimo}`;
  }
}

export default new MessageBuilderService();
