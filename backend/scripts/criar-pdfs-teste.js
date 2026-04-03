const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");

async function criarPdf(nomeArquivo, imoveis) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont("Helvetica");
  const fontBold = await doc.embedFont("Helvetica-Bold");

  let page = doc.addPage([595, 842]);
  let y = 800;
  const margin = 40;

  for (const imovel of imoveis) {
    if (y < 250) {
      page = doc.addPage([595, 842]);
      y = 800;
    }

    // Informações do imóvel
    page.drawText("Informações do imóvel - Ap", { x: margin, y, size: 10, font: fontBold });
    y -= 18;

    page.drawText("Data", { x: margin, y, size: 8, font: fontBold });
    page.drawText(imovel.data, { x: 80, y, size: 8, font });
    page.drawText("Edfício", { x: 200, y, size: 8, font: fontBold });
    page.drawText(imovel.edificio, { x: 250, y, size: 8, font });
    y -= 14;

    page.drawText("Referência", { x: margin, y, size: 8, font: fontBold });
    page.drawText(imovel.referencia, { x: 110, y, size: 8, font });
    page.drawText("Estilo", { x: 200, y, size: 8, font: fontBold });
    page.drawText("-", { x: 240, y, size: 8, font });
    page.drawText("N Andar", { x: 280, y, size: 8, font: fontBold });
    page.drawText(imovel.andar || "-", { x: 330, y, size: 8, font });
    page.drawText("Apt/Andar", { x: 380, y, size: 8, font: fontBold });
    page.drawText(imovel.aptAndar || "-", { x: 440, y, size: 8, font });
    page.drawText("Idade", { x: 480, y, size: 8, font: fontBold });
    page.drawText(imovel.idade || "-", { x: 510, y, size: 8, font });
    y -= 14;

    page.drawText("Construtora", { x: margin, y, size: 8, font: fontBold });
    page.drawText("-", { x: 110, y, size: 8, font });
    page.drawText("Chaves", { x: 200, y, size: 8, font: fontBold });
    page.drawText("COM PP MARCAR", { x: 245, y, size: 8, font });
    page.drawText("Uso", { x: 400, y, size: 8, font: fontBold });
    page.drawText("-", { x: 420, y, size: 8, font });
    y -= 14;

    page.drawText("Imed.", { x: margin, y, size: 8, font: fontBold });
    page.drawText("-", { x: 75, y, size: 8, font });
    page.drawText("Endereço", { x: 120, y, size: 8, font: fontBold });
    page.drawText(imovel.endereco, { x: 175, y, size: 8, font });
    y -= 14;

    page.drawText("Número", { x: margin, y, size: 8, font: fontBold });
    page.drawText(imovel.numero, { x: 90, y, size: 8, font });
    page.drawText("Apt", { x: 150, y, size: 8, font: fontBold });
    page.drawText(imovel.apt, { x: 175, y, size: 8, font });
    page.drawText("Bloco", { x: 230, y, size: 8, font: fontBold });
    page.drawText("-", { x: 265, y, size: 8, font });
    page.drawText("CEP", { x: 300, y, size: 8, font: fontBold });
    page.drawText(imovel.cep, { x: 325, y, size: 8, font });
    y -= 14;

    page.drawText("Bairro", { x: margin, y, size: 8, font: fontBold });
    page.drawText("CAMPO BELO", { x: 80, y, size: 8, font });
    y -= 14;

    // Campos do imóvel (compactados)
    page.drawText("Salas - Dormi S Suítes - Vagas S Á. útil 47 Metragem - A. total S", { x: margin, y, size: 7, font });
    y -= 12;
    page.drawText("Posição - Terraço S Closet - A Emb - 3o Rev - Jantar - Lav - Lareira -", { x: margin, y, size: 7, font });
    y -= 12;
    page.drawText("Jd Inv - Escr - S TV - S int - S Alm - S Desp - QE - WC - AS S", { x: margin, y, size: 7, font });
    y -= 12;
    page.drawText("Mobiliado - Ar cond - Sauna S Academia S Churrasqueira S", { x: margin, y, size: 7, font });
    y -= 14;

    page.drawText("Cons.", { x: margin, y, size: 8, font: fontBold });
    page.drawText("otima", { x: 75, y, size: 8, font });
    page.drawText("Elev.", { x: 120, y, size: 8, font: fontBold });
    page.drawText("S", { x: 150, y, size: 8, font });
    page.drawText("Recuo", { x: 180, y, size: 8, font: fontBold });
    page.drawText("-", { x: 215, y, size: 8, font });
    page.drawText("Ger", { x: 250, y, size: 8, font: fontBold });
    page.drawText("-", { x: 275, y, size: 8, font });
    page.drawText("Sf", { x: 300, y, size: 8, font: fontBold });
    page.drawText("S", { x: 315, y, size: 8, font });
    page.drawText("SJ", { x: 340, y, size: 8, font: fontBold });
    page.drawText("S", { x: 360, y, size: 8, font });
    page.drawText("Play", { x: 390, y, size: 8, font: fontBold });
    page.drawText("-", { x: 420, y, size: 8, font });
    y -= 14;

    page.drawText("Psic", { x: margin, y, size: 8, font: fontBold });
    page.drawText("S", { x: 70, y, size: 8, font });
    page.drawText("Quadr", { x: 100, y, size: 8, font: fontBold });
    page.drawText("-", { x: 140, y, size: 8, font });
    page.drawText("Est. Vis", { x: 180, y, size: 8, font: fontBold });
    page.drawText("-", { x: 225, y, size: 8, font });
    page.drawText("Status", { x: 260, y, size: 8, font: fontBold });
    page.drawText("-", { x: 300, y, size: 8, font });
    page.drawText("Atualizado", { x: 330, y, size: 8, font: fontBold });
    page.drawText("-", { x: 395, y, size: 8, font });
    page.drawText("Corretor", { x: 420, y, size: 8, font: fontBold });
    page.drawText("A", { x: 475, y, size: 8, font });
    page.drawText("QF", { x: 500, y, size: 8, font: fontBold });
    page.drawText("-", { x: 520, y, size: 8, font });
    y -= 16;

    // Descrição
    page.drawText("OTIMO LOCAL, PREDIO COM RECUO, VAGA PARA AUTO...", { x: margin, y, size: 7, font });
    y -= 14;

    // Indicador / Promotor
    page.drawText("Indicador", { x: margin, y, size: 8, font: fontBold });
    page.drawText("Milson", { x: 100, y, size: 8, font });
    page.drawText("Promotor", { x: 200, y, size: 8, font: fontBold });
    page.drawText("Milson", { x: 260, y, size: 8, font });
    y -= 14;

    page.drawText("Venda m", { x: margin, y, size: 8, font: fontBold });
    page.drawText("-", { x: 95, y, size: 8, font });
    page.drawText("2", { x: 103, y, size: 6, font });
    page.drawText("Aluguel m", { x: 150, y, size: 8, font: fontBold });
    page.drawText("-", { x: 210, y, size: 8, font });
    page.drawText("2", { x: 218, y, size: 6, font });
    page.drawText("Cond de pagamento", { x: 280, y, size: 8, font: fontBold });
    page.drawText("-", { x: 400, y, size: 8, font });
    page.drawText("IPTU", { x: 430, y, size: 8, font: fontBold });
    page.drawText("R$", { x: 460, y, size: 8, font });
    y -= 18;

    // Informações do proprietário
    page.drawText("Informações do proprietário", { x: margin, y, size: 10, font: fontBold });
    y -= 16;

    page.drawText("Proprietário", { x: margin, y, size: 8, font: fontBold });
    page.drawText(imovel.proprietario + " " + imovel.telefone, { x: 120, y, size: 8, font });
    y -= 14;

    page.drawText("Telefone", { x: margin, y, size: 8, font: fontBold });
    page.drawText(imovel.telefone, { x: 100, y, size: 8, font });
    page.drawText("E-mail", { x: 250, y, size: 8, font: fontBold });
    page.drawText("-", { x: 295, y, size: 8, font });
    y -= 14;

    page.drawText("Condomínio", { x: margin, y, size: 8, font: fontBold });
    page.drawText(imovel.condominio, { x: 115, y, size: 8, font });
    page.drawText("Locação", { x: 220, y, size: 8, font: fontBold });
    page.drawText(imovel.locacao, { x: 270, y, size: 8, font });
    page.drawText("Venda", { x: 400, y, size: 8, font: fontBold });
    page.drawText(imovel.venda, { x: 440, y, size: 8, font });
    y -= 30;
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync(nomeArquivo, pdfBytes);
  console.log("Criado: " + nomeArquivo + " (" + imoveis.length + " imoveis)");
}

async function main() {
  // PDF 1: Fernando (2 imóveis) + Maria (1 imóvel)
  await criarPdf("../teste-pdf-1.pdf", [
    {
      data: "02/04/2026", edificio: "Residencial Aurora", referencia: "900001",
      andar: "5", aptAndar: "8", idade: "3",
      endereco: "AVENIDA PAULISTA", numero: "1500", apt: "501", cep: "01310-100",
      proprietario: "Fernando Teste", telefone: "13 98120 8811",
      condominio: "R$1.200,00", locacao: "R$R$0,00", venda: "R$850.000,00"
    },
    {
      data: "02/04/2026", edificio: "-", referencia: "900002",
      andar: "-", aptAndar: "-", idade: "10",
      endereco: "RUA AUGUSTA", numero: "2000", apt: "302", cep: "01412-000",
      proprietario: "Maria Teste", telefone: "13 99149 9997",
      condominio: "R$800,00", locacao: "R$R$4.500,00", venda: "R$0,00"
    },
    {
      data: "02/04/2026", edificio: "Torre Norte", referencia: "900003",
      andar: "10", aptAndar: "4", idade: "5",
      endereco: "RUA OSCAR FREIRE", numero: "800", apt: "1002", cep: "01426-001",
      proprietario: "Fernando Teste", telefone: "13 98120 8811",
      condominio: "R$1.500,00", locacao: "R$R$5.000,00", venda: "R$1.200.000,00"
    },
  ]);

  // PDF 2: Carlos + Julia + Fernando (repetido do PDF 1 para testar dedup)
  await criarPdf("../teste-pdf-2.pdf", [
    {
      data: "02/04/2026", edificio: "Edifício Ipanema", referencia: "900004",
      andar: "8", aptAndar: "6", idade: "15",
      endereco: "ALAMEDA SANTOS", numero: "1200", apt: "801", cep: "01418-100",
      proprietario: "Carlos Silva", telefone: "11 99498 1135",
      condominio: "R$950,00", locacao: "R$R$0,00", venda: "R$720.000,00"
    },
    {
      data: "02/04/2026", edificio: "-", referencia: "900005",
      andar: "-", aptAndar: "-", idade: "20",
      endereco: "RUA CONSOLACAO", numero: "3000", apt: "-", cep: "01302-000",
      proprietario: "Julia Santos", telefone: "31 94711 505",
      condominio: "R$600,00", locacao: "R$R$3.800,00", venda: "R$0,00"
    },
    {
      data: "02/04/2026", edificio: "Residencial Aurora", referencia: "900001",
      andar: "5", aptAndar: "8", idade: "3",
      endereco: "AVENIDA PAULISTA", numero: "1500", apt: "501", cep: "01310-100",
      proprietario: "Fernando Teste", telefone: "13 98120 8811",
      condominio: "R$1.200,00", locacao: "R$R$0,00", venda: "R$850.000,00"
    },
  ]);
}

main().catch(console.error);
