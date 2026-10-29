"use client";

import FullCalendar, { type CalendarRef, type EventInput } from "@fullcalendar/react";
import ptBr from "@fullcalendar/react/locales/pt-br";
import monarch from "@fullcalendar/react/themes/monarch";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useEffect, useMemo, useRef, useState } from "react";
import { personColors } from "@/lib/colors";
import { TZ, firstName, formatTime, hhmmToMinutes, minutesToHHMM } from "@/lib/format";
import { BLOCK_REASONS } from "@/lib/labels";
import type { Agenda, OwnerAppointment, TimeBlock } from "@/lib/types";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/monarch/theme.css";
import "./agenda-calendar.css";

export type AgendaView = "week" | "day";

type EventKind =
  | { kind: "appt"; appt: OwnerAppointment }
  | { kind: "block"; block: TimeBlock; proName: string }
  | { kind: "break" };

const VIEW_TYPE: Record<AgendaView, string> = { week: "timeGridWeek", day: "timeGridDay" };
const GRAY = "#8d989e";

const HH = (minutes: number) => `${minutesToHHMM(minutes)}:00`;

/** Abre rolada uma hora antes do "agora"; fora do expediente, no início dele. */
function scrollStart(slotMin: number, slotMax: number): number {
  const now = hhmmToMinutes(formatTime(new Date()));
  return now >= slotMin && now < slotMax ? Math.max(now - 60, slotMin) : slotMin;
}

export default function AgendaCalendar({
  data,
  hidden,
  view,
  anchor,
  selected,
  proName,
  onSelect,
  onBlockClick,
}: {
  data: Agenda | undefined;
  hidden: Set<string>;
  view: AgendaView;
  anchor: string;
  selected: string | null;
  proName: (id: string) => string;
  onSelect: (appointmentId: string) => void;
  onBlockClick: (blockId: string) => void;
}) {
  const ref = useRef<CalendarRef>(null);
  // Só valem na montagem; depois o efeito abaixo assume a navegação.
  const [initial] = useState(() => ({ view, anchor }));

  // A página é a dona do estado (dia âncora + visão); o calendário só obedece.
  useEffect(() => {
    const api = ref.current?.getApi();
    if (!api) return;
    if (api.view.type !== VIEW_TYPE[view]) api.changeView(VIEW_TYPE[view], anchor);
    else api.gotoDate(anchor);
  }, [view, anchor]);

  const { slotMin, slotMax } = useMemo(() => {
    const open = data?.hours ?? [];
    if (!open.length) return { slotMin: 8 * 60, slotMax: 20 * 60 };
    const start = Math.floor(Math.min(...open.map((h) => h.opensAt)) / 60) * 60;
    const end = Math.ceil(Math.max(...open.map((h) => h.closesAt)) / 60) * 60;
    return { slotMin: start, slotMax: Math.max(end, start + 60) };
  }, [data?.hours]);

  // Fora do expediente fica hachurado; a pausa vira um intervalo dentro do dia.
  const businessHours = useMemo(
    () =>
      (data?.hours ?? []).flatMap((h) => {
        const days = [h.weekday];
        if (h.breakStart === null || h.breakEnd === null) {
          return [{ daysOfWeek: days, startTime: minutesToHHMM(h.opensAt), endTime: minutesToHHMM(h.closesAt) }];
        }
        return [
          { daysOfWeek: days, startTime: minutesToHHMM(h.opensAt), endTime: minutesToHHMM(h.breakStart) },
          { daysOfWeek: days, startTime: minutesToHHMM(h.breakEnd), endTime: minutesToHHMM(h.closesAt) },
        ];
      }),
    [data?.hours],
  );

  const events = useMemo<EventInput[]>(() => {
    const list: EventInput[] = [];
    for (const h of data?.hours ?? []) {
      if (h.breakStart === null || h.breakEnd === null) continue;
      list.push({
        id: `break-${h.weekday}`,
        display: "background",
        daysOfWeek: [h.weekday],
        startTime: HH(h.breakStart),
        endTime: HH(h.breakEnd),
        extendedProps: { kind: "break" } satisfies EventKind,
      });
    }
    for (const a of data?.appointments ?? []) {
      if (hidden.has(a.professional.id) || a.status === "CANCELED") continue;
      list.push({
        id: a.id,
        start: a.startsAt,
        end: a.endsAt,
        title: a.serviceName,
        color: personColors(a.professional.name).strong,
        contrastColor: "#fff",
        extendedProps: { kind: "appt", appt: a } satisfies EventKind,
      });
    }
    for (const b of data?.blocks ?? []) {
      if (hidden.has(b.professionalId)) continue;
      list.push({
        id: `block-${b.id}`,
        start: b.startsAt,
        end: b.endsAt,
        title: "Bloqueado",
        color: GRAY,
        contrastColor: "#fff",
        extendedProps: { kind: "block", block: b, proName: proName(b.professionalId) } satisfies EventKind,
      });
    }
    return list;
  }, [data, hidden, proName]);

  return (
    <div className="bo-agenda h-full">
      <FullCalendar
        ref={ref}
        plugins={[monarch, timeGridPlugin]}
        initialView={VIEW_TYPE[initial.view]}
        initialDate={initial.anchor}
        scrollTime={HH(scrollStart(slotMin, slotMax))}
        headerToolbar={false}
        height="100%"
        expandRows
        allDaySlot={false}
        locale={ptBr}
        timeZone={TZ}
        firstDay={1}
        nowIndicator
        slotMinTime={HH(slotMin)}
        slotMaxTime={HH(slotMax)}
        slotDuration="00:30:00"
        slotHeaderInterval="01:00:00"
        slotHeaderFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotMinHeight={28}
        eventMinHeight={26}
        eventShortHeight={40}
        businessHours={businessHours}
        events={events}
        slotEventOverlap={false}
        nonBusinessHoursClass="bo-closed"
        slotHeaderInnerClass="bo-hour"
        dayLaneClass={(info) => (info.isToday ? "bo-today-lane" : "")}
        nowIndicatorLineClass="bo-now-line"
        nowIndicatorDotClass="bo-now-dot"
        columnEventInnerClass="bo-ev-inner"
        backgroundEventClass="bo-break"
        backgroundEventContent={() => <span className="bo-break-label">Pausa</span>}
        columnEventClass={(info) => {
          const x = info.event.extendedProps as EventKind;
          if (x.kind === "block") return "bo-ev bo-ev-block";
          if (x.kind !== "appt") return "bo-ev";
          return [
            "bo-ev",
            x.appt.status === "PENDING" && "bo-ev-pending",
            (x.appt.status === "NO_SHOW" || x.appt.status === "COMPLETED") && "bo-ev-faded",
            selected === x.appt.id && "bo-ev-selected",
          ]
            .filter(Boolean)
            .join(" ");
        }}
        dayHeaderContent={(info) => (
          <div className={info.isToday ? "bo-dh bo-dh-today" : "bo-dh"}>
            <span className="bo-dh-wd">{info.weekdayText}</span>
            <span className="bo-dh-num">{info.dayNumberText}</span>
          </div>
        )}
        eventContent={(info) => {
          const x = info.event.extendedProps as EventKind;
          if (x.kind === "block") {
            const reason = BLOCK_REASONS.find((r) => r.id === x.block.reason)?.label;
            return (
              <div className="bo-ev-body" title="Toque para remover o bloqueio">
                <span className="bo-ev-title">Bloqueado · {firstName(x.proName)}</span>
                <span className="bo-ev-sub">{reason}</span>
              </div>
            );
          }
          if (x.kind !== "appt") return null;
          const a = x.appt;
          const short = a.durationMinutes <= 30;
          const title = (
            <>
              {a.isNewForOwner && a.origin === "APP" ? <span className="bo-ev-new" aria-label="Novo" /> : null}
              {a.serviceName}
            </>
          );
          const sub = `${formatTime(a.startsAt)} · ${firstName(a.client.name)}`;
          return short ? (
            <div className="bo-ev-body bo-ev-row">
              <span className="bo-ev-title">{title}</span>
              <span className="bo-ev-sub">{sub}</span>
            </div>
          ) : (
            <div className="bo-ev-body">
              <span className="bo-ev-title">{title}</span>
              <span className="bo-ev-sub">{sub}</span>
            </div>
          );
        }}
        eventClick={(info) => {
          const x = info.event.extendedProps as EventKind;
          if (x.kind === "appt") onSelect(x.appt.id);
          else if (x.kind === "block") onBlockClick(x.block.id);
        }}
      />
    </div>
  );
}
