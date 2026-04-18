import type { TimelineItem } from '../../lib/api';

type MessageNode = {
  kind: 'message';
  key: `message-${number}`;
  item: TimelineItem;
};

type TimeDividerNode = {
  kind: 'time-divider';
  key: `time-divider-${number}`;
  label: string;
  timestamp: string;
};

export type ChatRenderNode = MessageNode | TimeDividerNode;

const TIME_DIVIDER_THRESHOLD_MS = 15 * 60 * 1000;
const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;

export function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - diff);
  return weekStart;
}

function isYesterday(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

function isSameWeek(date: Date, now: Date) {
  return getWeekStart(date).getTime() === getWeekStart(now).getTime();
}

function formatTimeDividerLabel(timestamp: string, now = new Date()) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const time = formatClockTime(date);

  if (isSameDay(date, now)) {
    return time;
  }

  if (isYesterday(date, now)) {
    return `昨天 ${time}`;
  }

  if (isSameWeek(date, now)) {
    return `${WEEKDAY_LABELS[date.getDay()]} ${time}`;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

function shouldInsertTimeDivider(previousTimestamp: string | null, currentTimestamp: string) {
  if (!previousTimestamp) return true;

  const previousDate = new Date(previousTimestamp);
  const currentDate = new Date(currentTimestamp);

  if (Number.isNaN(previousDate.getTime()) || Number.isNaN(currentDate.getTime())) {
    return true;
  }

  if (!isSameDay(previousDate, currentDate)) {
    return true;
  }

  return currentDate.getTime() - previousDate.getTime() >= TIME_DIVIDER_THRESHOLD_MS;
}

export function buildChatRenderNodes(items: TimelineItem[], now = new Date()): ChatRenderNode[] {
  const nodes: ChatRenderNode[] = [];
  let previousTimestamp: string | null = null;

  for (const item of items) {
    if (shouldInsertTimeDivider(previousTimestamp, item.createdAt)) {
      nodes.push({
        kind: 'time-divider',
        key: `time-divider-${item.id}`,
        label: formatTimeDividerLabel(item.createdAt, now),
        timestamp: item.createdAt,
      });
    }

    nodes.push({
      kind: 'message',
      key: `message-${item.id}`,
      item,
    });
    previousTimestamp = item.createdAt;
  }

  return nodes;
}
