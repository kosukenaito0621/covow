/**
 * 英語の文言。キーはここが基準で、ja.ts は同じキーをすべて持つ（型で確かめる）。
 * 画面のラベルは短く。小さなラベルの大文字化は CSS（uppercase）で行い、ここでは普通の書き方にする。
 * {name} の形で値を差し込める。
 */
export const en = {
  "common.required": "Required",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.retry": "Try again",
  "common.loading": "Loading",
  "common.loadError": "Couldn't load. Check your connection and try again.",
  "common.saveError": "Couldn't save. Check your connection and try again.",
  "common.demo": "Demo",
  "common.demoAria": "Showing demo data",

  "nav.main": "Main",
  "nav.home": "Home",
  "nav.plans": "Plans",
  "nav.insights": "Insights",
  "nav.settings": "Settings",

  "home.leftToSpend": "Left to spend",
  "home.budget": "Budget",
  "home.spent": "Spent",
  "home.planned": "Planned",
  "home.avgPerDay": "Avg / day",
  "home.upcoming": "Upcoming",
  "home.all": "All",
  "home.prevMonth": "Previous month",
  "home.nextMonth": "Next month",
  "home.setBudget": "Set this month's budget",
  "home.noRecords": "No records yet",
  "home.noRecordsBody": "Add something you want to buy, and your spending will show up here.",
  "home.addFirst": "Add your first plan",
  "home.overdue": "{count} unpurchased plans from earlier months",
  "home.weekPeak": "This week's highest spending was {weekday}: {amount}",

  "metric.spent": "Spent",
  "metric.planned": "Planned",
  "metric.used": "Used",
  "metric.items": "{count} items",
  "metric.budgetUsed": "Budget used",
  "metric.usedValue": "{percent}%, {used} of {budget}",
  "metric.overBudget": "Over budget",
  "metric.spentAria": "Spent this month {amount}",
  "metric.plannedAria": "Planned {amount}, {count} items",
  "delta.up": "Up {percent}% from the same day last month",
  "delta.down": "Down {percent}% from the same day last month",
  "delta.same": "About the same as the same day last month",
  "delta.none": "No record for the same day last month",
  "delta.short": "vs last mo.",

  "week.prev": "Previous week",
  "week.next": "Next week",
  "week.current": "Week shown",
  "week.pickDay": "Pick a day",
  "week.today": "today",

  "status.planned": "To buy",
  "status.purchased": "Bought",
  "status.canceled": "Canceled",
  "badge.fromPlan": "From plan",
  "badge.uncategorized": "Uncategorized",

  "plan.add": "Add plan",
  "attention.overBudgetConfirm": "This may go over budget. Want to review it?",
  "attention.overBy": "{amount} over budget",
} as const;

export type MessageKey = keyof typeof en;
