import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="m-0 text-[30px] font-bold text-ink">Política de Privacidade</h1>
      <p className="m-0 rounded-xl bg-primary-soft p-3.5 text-sm">
        Texto provisório, pendente de revisão jurídica antes do lançamento. Versão 2026-10-29.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">1. Dados que coletamos</h2>
      <p className="m-0">
        No cadastro do estabelecimento: nome completo, e-mail, CPF ou CNPJ e senha (guardada apenas em forma
        criptografada). Também guardamos a data e a versão do aceite destes documentos.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">2. Para que usamos</h2>
      <p className="m-0">
        Para criar e proteger sua conta, operar o painel, enviar avisos do serviço e identificar o titular junto ao
        Asaas, nosso processador de pagamentos.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">3. Compartilhamento</h2>
      <p className="m-0">
        Não vendemos dados. Compartilhamos apenas o necessário com prestadores que operam a plataforma, como o
        processador de pagamentos e o envio de e-mails.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">4. Seus direitos</h2>
      <p className="m-0">
        Conforme a LGPD, você pode pedir acesso, correção ou exclusão dos seus dados falando com o suporte do belezaOur.
      </p>
    </>
  );
}
