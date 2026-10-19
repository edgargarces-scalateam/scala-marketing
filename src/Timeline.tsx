import { useState } from 'react';
import type { Task } from './domain';
import { useI18n } from './i18n';
const DAY = 86400000;
const day = (value: string) => Date.parse(value + 'T00:00:00Z') / DAY;
export function Timeline({ tasks, open }: { tasks: Task[]; open: (task: Task) => void }) {
  const { t, language } = useI18n();
  const [mode, setMode] = useState('Week');
  const sorted = [...tasks].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  const today = day(new Date().toISOString().slice(0, 10));
  const start = sorted.length ? Math.min(...sorted.map(task => day(task.start))) : today;
  const end = sorted.length ? Math.max(...sorted.map(task => day(task.end))) : today;
  const monthStep = mode === 'Month' ? 1 : 3;
  const anchor = new Date(start * DAY);
  if (mode === 'Month' || mode === 'Quarter') {
    anchor.setUTCDate(1);
    if (mode === 'Quarter') anchor.setUTCMonth(Math.floor(anchor.getUTCMonth() / 3) * 3);
  }
  const rangeStart = anchor.getTime() / DAY;
  const ticks = [rangeStart];
  while (ticks[ticks.length - 1] <= end) {
    const previous = ticks[ticks.length - 1];
    const next = new Date(previous * DAY);
    if (mode === 'Month' || mode === 'Quarter') next.setUTCMonth(next.getUTCMonth() + monthStep);
    else next.setUTCDate(next.getUTCDate() + (mode === 'Day' ? 1 : 7));
    ticks.push(next.getTime() / DAY);
  }
  const count = ticks.length - 1;
  const total = ticks[count] - rangeStart;
  const width = Math.max(640, count * (mode === 'Day' ? 52 : 160));
  const format = (value: number) => new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value * DAY));
  return <section className="panel timeline">
    <div className="panel-title"><div><h2>{t('Campaign timeline')}</h2><p>{t('Click an activity to view details or edit its dates.')}</p></div>
      <select aria-label={t('Timeline scale')} value={mode} onChange={event => setMode(event.target.value)}>{['Day','Week','Month','Quarter'].map(value => <option key={value} value={value}>{t(value)}</option>)}</select>
    </div>
    {!sorted.length ? <p className="empty">{t('No activities match your filters.')}</p> : <div className="schedule-scroll" tabIndex={0} role="region" aria-label={t('Campaign timeline')}>
      <div className="schedule" style={{ width: width + 260 }}>
        <div className="schedule-heading"><strong className="schedule-label">{t('Activity')}</strong><div className="schedule-dates" style={{width}}>{ticks.slice(0, -1).map((tick, index) => <span key={tick} style={{width: (ticks[index + 1] - tick) / total * width}}>{format(tick)}</span>)}</div></div>
        {sorted.map(task => <div className="schedule-row" key={task.id}>
          <button className="schedule-label" onClick={() => open(task)}><strong>{task.title}</strong><small>{task.assignee || '—'} · {t(task.status)}</small></button>
          <div className="schedule-track" style={{width}}>
            {ticks.slice(0, -1).map(tick => <span key={tick} className="schedule-gridline" style={{left: `${(tick - rangeStart) / total * 100}%`}} />)}
            {today >= rangeStart && today < rangeStart + total && <span className="schedule-today" style={{left: `${(today - rangeStart) / total * 100}%`}} />}
            <button className={`schedule-bar ${task.status === 'Completed' ? 'done' : task.status === 'Blocked' ? 'blocked' : ''} ${task.kind === 'milestone' ? 'milestone' : ''}`} style={{left: `${(day(task.start) - rangeStart) / total * 100}%`, width: `${(day(task.end) - day(task.start) + 1) / total * 100}%`}} onClick={() => open(task)} aria-label={`${task.title}: ${format(day(task.start))} – ${format(day(task.end))}`} title={`${task.title}\n${format(day(task.start))} – ${format(day(task.end))}`}><span>{task.kind === 'milestone' ? '◆' : task.title}</span></button>
          </div>
        </div>)}
      </div>
    </div>}
  </section>;
}
