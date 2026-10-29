import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return (
    <>
      <h1 className="m-0 text-[30px] font-bold text-ink">Termos de Uso</h1>
      <p className="m-0 rounded-xl bg-primary-soft p-3.5 text-sm">
        Texto provisório, pendente de revisão jurídica antes do lançamento. Versão 2026-10-29.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">1. O serviço</h2>
      <p className="m-0">
        O belezaOur é uma plataforma que conecta clientes a estabelecimentos de beleza e permite agendar serviços
        online. O estabelecimento é o único responsável pelos serviços que presta e pelos preços que anuncia.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">2. Conta do estabelecimento</h2>
      <p className="m-0">
        Para criar a conta, o dono informa nome completo, e-mail, CPF ou CNPJ e uma senha. Os dados devem ser
        verdadeiros e atualizados. O dono é responsável por manter a senha em sigilo e por tudo o que for feito com a
        conta.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">3. Pagamentos</h2>
      <p className="m-0">
        Os pagamentos online são processados pelo Asaas. O CPF ou CNPJ informado é usado para identificar o titular
        junto ao processador de pagamentos.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">4. Conteúdo e conduta</h2>
      <p className="m-0">
        Todo perfil é revisado antes de ir ao ar. Informações falsas, conteúdo ilegal ou uso abusivo da plataforma podem
        levar à suspensão ou ao bloqueio da conta.
      </p>
      <h2 className="m-0 mt-2 text-xl font-bold text-ink">5. Alterações</h2>
      <p className="m-0">Estes termos podem mudar. Quando mudarem, a nova versão será publicada nesta página.</p>
    </>
  );
}
