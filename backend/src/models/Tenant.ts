import { Timestamp } from "firebase-admin/firestore";

export interface Tenant {
  id?: string;
  nome: string;
  zapiInstanceId: string;
  zapiToken: string;
  zapiClientToken: string;
  mensagemTemplate: MensagemTemplate;
  limiteDiario: number;
  criadoEm: Timestamp;
}

export interface MensagemTemplate {
  nomeCorretor: string;
  nomeEmpresa: string;
  cargo: string;
  textoPersonalizado?: string;
}

export interface User {
  id?: string;
  email: string;
  nome: string;
  tenantId: string;
  role: "admin" | "usuario";
  criadoEm: Timestamp;
}
