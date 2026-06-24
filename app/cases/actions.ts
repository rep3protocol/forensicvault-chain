"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { assertPermission } from "@/lib/auth/requirePermission";
import { prisma } from "@/lib/prisma";

export async function createCase(formData: FormData) {
  const owner = await assertPermission(
    "CREATE_CASE",
    "Your current local role does not allow creating cases.",
  );
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const jurisdiction = formData.get("jurisdiction")?.toString().trim() || null;
  const tags = formData.get("tags")?.toString().trim() || null;

  if (!title) {
    throw new Error("Title is required.");
  }

  const caseItem = await prisma.case.create({
    data: {
      title,
      description,
      jurisdiction,
      tags,
      ownerId: owner.id,
    },
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(owner),
    action: AUDIT_ACTIONS.CASE_CREATED,
    category: "CASE",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "Case",
    targetId: caseItem.id,
    targetLabel: caseItem.title,
    summary: `Case created: ${caseItem.title}`,
    metadata: {
      caseId: caseItem.id,
      title: caseItem.title,
      jurisdiction: caseItem.jurisdiction,
      tagsCount: tags ? tags.split(",").filter(Boolean).length : 0,
      status: caseItem.status,
      descriptionLength: description?.length ?? 0,
    },
  });

  revalidatePath("/cases");
  revalidatePath("/");
  redirect("/cases");
}
