import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditLogFilters = {
  q?: string;
  category?: string;
  action?: string;
  severity?: string;
  outcome?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogQueryResult = {
  events: Awaited<ReturnType<typeof getAuditLogs>>["events"];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.category) where.category = filters.category;
  if (filters.action) where.action = filters.action;
  if (filters.severity) where.severity = filters.severity;
  if (filters.outcome) where.outcome = filters.outcome;
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.targetId) where.targetId = filters.targetId;

  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) {
      where.timestamp.gte = new Date(filters.from);
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      where.timestamp.lte = toDate;
    }
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { summary: { contains: q } },
      { actorName: { contains: q } },
      { actorEmail: { contains: q } },
      { targetLabel: { contains: q } },
      { targetId: { contains: q } },
      { auditHash: { contains: q } },
      { action: { contains: q } },
    ];
  }

  return where;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
  const where = buildWhere(filters);

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { sequence: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    events,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAuditFilterOptions() {
  const [categories, actions, severities, outcomes, targetTypes] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["category"], select: { category: true } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.auditLog.findMany({ distinct: ["severity"], select: { severity: true } }),
    prisma.auditLog.findMany({ distinct: ["outcome"], select: { outcome: true } }),
    prisma.auditLog.findMany({ distinct: ["targetType"], select: { targetType: true } }),
  ]);

  return {
    categories: categories.map((item) => item.category).filter(Boolean).sort(),
    actions: actions.map((item) => item.action).filter(Boolean).sort(),
    severities: severities.map((item) => item.severity).filter(Boolean).sort(),
    outcomes: outcomes.map((item) => item.outcome).filter(Boolean).sort(),
    targetTypes: targetTypes
      .map((item) => item.targetType)
      .filter((value): value is string => Boolean(value))
      .sort(),
  };
}

export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({ where: { id } });
}

export async function getRecentAuditLogs(limit = 20) {
  return prisma.auditLog.findMany({
    orderBy: { sequence: "desc" },
    take: limit,
  });
}

export async function getAuditStats() {
  const [total, denied, high, critical, failed] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { outcome: "DENIED" } }),
    prisma.auditLog.count({ where: { severity: "HIGH" } }),
    prisma.auditLog.count({ where: { severity: "CRITICAL" } }),
    prisma.auditLog.count({ where: { outcome: { in: ["FAILURE", "ERROR"] } } }),
  ]);

  const latest = await prisma.auditLog.findFirst({
    orderBy: { sequence: "desc" },
    select: { sequence: true, auditHash: true },
  });

  return { total, denied, high, critical, failed, latest };
}
