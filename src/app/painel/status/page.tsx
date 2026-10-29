"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BusinessImagesEditor } from "@/components/owner/image-upload";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { ErrorState, Spinner } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { useOwnerBusiness } from "@/lib/owner-queries";
import { RequireRole, useSignOut } from "@/lib/session";
import { publicLinkLabel } from "@/lib/site";

function Timeline() {
  const steps = [
    { icon: "check_circle", title: "Cadastro enviado", sub: "Dados, serviços e horários", state: "done" },
    { icon: "pending", title: "Revisão da equipe", sub: "Conferimos dados e fotos", state: "current" },
    {
      icon: "radio_button_unchecked",
      title: "Perfil no ar",
      sub: "Você recebe um aviso no WhatsApp e no e-mail",
      state: "todo",
    },
  ];
  return (
    <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
      {steps.map((s) => (
        <li key={s.title} className="flex items-start gap-3">
          <Icon
            name={s.icon}
            fill={s.state === "done"}
            size={24}
            className={s.state === "done" ? "text-ok" : s.state === "current" ? "text-warn" : "text-subtle"}
          />
          <div>
            <div className="font-bold">{s.title}</div>
            <div className="text-[13px] text-muted">{s.sub}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Status() {
  const router = useRouter();
  const q = useOwnerBusiness();
  const b = q.data;

  useEffect(() => {
    if (q.data === null || b?.status === "DRAFT") router.replace("/painel/cadastro");
  }, [q.data, b?.status, router]);

  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!b || b.status === "DRAFT") return <Spinner />;

  return (
    <div className="flex flex-col gap-5">
      <BusinessImagesEditor business={b} />
      <div className="text-[13px] text-muted">
        <Icon name="link" size={15} className="mr-1 align-[-3px]" />
        {publicLinkLabel(b.slug)}
      </div>

      {b.status === "PENDING" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="warn">EM ANÁLISE</Badge>
            <span className="text-[13px] text-muted">
              Prazo de até 24h úteis{b.submittedAt ? ` · enviado em ${formatShortDate(b.submittedAt)}` : ""}
            </span>
          </div>
          <h1 className="m-0 text-[28px] font-bold">Recebemos seu cadastro</h1>
          <Timeline />
          <p className="m-0 rounded-xl bg-bg p-3.5 text-sm leading-relaxed text-ink-2">
            Enquanto isso, adicione capa e logo acima: perfis com foto recebem mais agendamentos. Seu perfil só aparece
            para clientes depois da aprovação.
          </p>
        </section>
      ) : null}

      {b.status === "ACTIVE" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <Badge tone="ok" className="self-start">
            APROVADO · NO AR
          </Badge>
          <h1 className="m-0 text-[28px] font-bold">Seu perfil está no marketplace!</h1>
          <p className="m-0 text-sm text-muted">
            Clientes já podem encontrar e agendar. Divulgue seu link no Instagram e no WhatsApp.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${b.slug}`} className={buttonVariants({ variant: "outline-ink" })}>
              Ver meu perfil público
            </Link>
            <Link href="/painel" className={buttonVariants({ variant: "primary" })}>
              Abrir o painel
            </Link>
          </div>
        </section>
      ) : null}

      {b.status === "REJECTED" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <Badge tone="danger" className="self-start">
            AJUSTES NECESSÁRIOS
          </Badge>
          <h1 className="m-0 text-[28px] font-bold">Precisamos de alguns ajustes</h1>
          <p className="m-0 rounded-xl bg-danger-bg p-3.5 text-sm text-[#7a1a12]">
            {b.rejectionReason ?? "Confira nome, WhatsApp e endereço do negócio e envie novamente."}
          </p>
          <Link href="/painel/cadastro" className={buttonVariants({ variant: "ink", className: "self-start" })}>
            Revisar e reenviar
          </Link>
        </section>
      ) : null}

      {b.status === "SUSPENDED" ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <Badge tone="danger" className="self-start">
            SUSPENSO
          </Badge>
          <h1 className="m-0 text-[28px] font-bold">Perfil suspenso</h1>
          <p className="m-0 text-sm text-muted">
            Seu estabelecimento está fora do marketplace no momento. Fale com o suporte do belezaOur para reativar.
          </p>
          <a
            href="mailto:suporte@belezaour.app"
            className={buttonVariants({ variant: "outline", className: "self-start" })}
          >
            Falar com o suporte
          </a>
        </section>
      ) : null}
    </div>
  );
}

export default function OwnerStatusPage() {
  const signOut = useSignOut();
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Icon name="spa" size={24} />
          <b className="text-lg">belezaOur</b>
          <span className="hidden text-sm text-muted sm:inline">para profissionais</span>
        </Link>
        <Button variant="ghost" size="sm" icon="logout" onClick={() => signOut("/painel/entrar")}>
          Sair
        </Button>
      </header>
      <main className="mx-auto max-w-[640px] px-4 py-6 sm:py-10">
        <RequireRole role="BUSINESS_OWNER">
          <Status />
        </RequireRole>
      </main>
    </div>
  );
}
