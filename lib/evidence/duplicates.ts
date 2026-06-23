import { prisma } from "@/lib/prisma";

export type DuplicateEvidenceItem = {
  id: string;
  originalName: string;
  sha256Hash: string;
  createdAt: Date;
  case: {
    id: string;
    title: string;
  };
};

const duplicateEvidenceSelect = {
  id: true,
  originalName: true,
  sha256Hash: true,
  createdAt: true,
  case: {
    select: {
      id: true,
      title: true,
    },
  },
} as const;

export async function findDuplicateEvidenceByHash(
  sha256Hash: string,
  options?: { excludeEvidenceId?: string },
) {
  return prisma.evidenceItem.findMany({
    where: {
      sha256Hash,
      ...(options?.excludeEvidenceId
        ? { id: { not: options.excludeEvidenceId } }
        : {}),
    },
    select: duplicateEvidenceSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function getDuplicateEvidenceForItem(evidenceId: string) {
  const evidence = await prisma.evidenceItem.findUnique({
    where: { id: evidenceId },
    select: {
      id: true,
      sha256Hash: true,
    },
  });

  if (!evidence) {
    return null;
  }

  const duplicates = await findDuplicateEvidenceByHash(evidence.sha256Hash, {
    excludeEvidenceId: evidence.id,
  });

  return {
    sha256Hash: evidence.sha256Hash,
    duplicateCount: duplicates.length + 1,
    duplicates,
  };
}

export async function countEvidenceByHash(sha256Hash: string) {
  return prisma.evidenceItem.count({
    where: { sha256Hash },
  });
}

export async function getDuplicateCountsByHashes(sha256Hashes: string[]) {
  const uniqueHashes = [...new Set(sha256Hashes)].filter(Boolean);
  const counts = new Map<string, number>();

  if (uniqueHashes.length === 0) {
    return counts;
  }

  const grouped = await prisma.evidenceItem.groupBy({
    by: ["sha256Hash"],
    where: {
      sha256Hash: { in: uniqueHashes },
    },
    _count: {
      _all: true,
    },
  });

  for (const item of grouped) {
    counts.set(item.sha256Hash, item._count._all);
  }

  return counts;
}
