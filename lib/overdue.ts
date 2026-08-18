// Tasks whose dueDate is before this are artifacts of the old epoch-date bug
// (new Date(null) === Jan 2 1970). They have NO real due date and must never
// count as overdue. The platform launched in 2026, so nothing legitimately
// overdue predates 2020.
export const MIN_OVERDUE_DUE_DATE = new Date("2020-01-01T00:00:00.000Z");