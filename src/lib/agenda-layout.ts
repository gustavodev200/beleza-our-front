export interface Interval {
  id: string;
  start: number; // minutos desde 00:00
  end: number;
}

export interface Placed<T extends Interval> {
  item: T;
  lane: number;
  lanes: number;
}

/**
 * Distribui intervalos sobrepostos em faixas lado a lado (§5.5). Cada grupo
 * de itens que se encadeiam por sobreposição divide a largura igualmente.
 */
export function layoutLanes<T extends Interval>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: Placed<T>[] = [];
  let group: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    for (const p of group) p.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd && group.length) flush();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    group.push({ item, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd === -Infinity ? item.end : groupEnd, item.end);
  }
  if (group.length) flush();
  return result;
}
