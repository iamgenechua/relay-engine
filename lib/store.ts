import { Report } from './types'

const reports: Report[] = []

export function addReport(
  report: Omit<Report, 'id' | 'createdAt'>
): Report {
  const full: Report = {
    ...report,
    id: `RPT-${String(Math.floor(Math.random() * 900000) + 100000)}`,
    createdAt: new Date().toISOString(),
  }
  reports.push(full)
  return full
}

export function getReports(): Report[] {
  return [...reports].reverse()
}
