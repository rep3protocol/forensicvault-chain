"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAnchorRecord,
  findDuplicateAnchorRecordForCurrent,
} from "@/lib/anchors/history";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { assertPermission } from "@/lib/auth/requirePermission";
import { prisma } from "@/lib/prisma";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalString(formData: FormData, key: string) {
  const value = stringValue(formData, key).trim();
  return value.length > 0 ? value : null;
}

function requiredString(formData: FormData, key: string) {
  const value = stringValue(formData, key).trim();

  if (!value) {
    throw new Error(`Missing required anchor field: ${key}`);
  }

  return value;
}

export async function saveCurrentAnchorRecord(formData: FormData) {
  const user = await assertPermission(
    "SAVE_ANCHOR",
    "Your current local role does not allow saving anchor snapshots.",
  );
  const label = optionalString(formData, "label");
  const duplicate = await findDuplicateAnchorRecordForCurrent();

  if (duplicate) {
    if (label) {
      await prisma.anchorRecord.update({
        where: { id: duplicate.id },
        data: { label },
      });
    }

    await recordAuditEventSafe({
      ...getAuditActorFromUser(user),
      action: AUDIT_ACTIONS.ANCHOR_DUPLICATE_PREVENTED,
      category: "ANCHOR",
      severity: "NOTICE",
      outcome: "SUCCESS",
      targetType: "AnchorRecord",
      targetId: duplicate.id,
      targetLabel: duplicate.label ?? `height-${duplicate.latestBlockHeight}`,
      summary: "Duplicate anchor snapshot prevented",
      metadata: {
        anchorRecordId: duplicate.id,
        latestBlockHeight: duplicate.latestBlockHeight,
        latestBlockHash: duplicate.latestBlockHash,
        ledgerRoot: duplicate.ledgerRoot,
        duplicate: true,
      },
    });

    revalidatePath("/anchors");
    revalidatePath("/guard");
    redirect(`/anchors?duplicateAnchor=1&existingAnchorId=${duplicate.id}`);
  }

  const anchor = await createAnchorRecord({
    label,
    createdById: user.id,
    createdByName: user.name,
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.ANCHOR_SNAPSHOT_SAVED,
    category: "ANCHOR",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "AnchorRecord",
    targetId: anchor.id,
    targetLabel: anchor.label ?? `height-${anchor.latestBlockHeight}`,
    summary: "Anchor snapshot saved",
    metadata: {
      anchorRecordId: anchor.id,
      latestBlockHeight: anchor.latestBlockHeight,
      latestBlockHash: anchor.latestBlockHash,
      ledgerRoot: anchor.ledgerRoot,
      duplicate: false,
    },
  });

  revalidatePath("/anchors");
  revalidatePath("/guard");
  redirect("/anchors");
}

export async function updateAnchorPublication(formData: FormData) {
  const user = await assertPermission(
    "UPDATE_ANCHOR_PUBLICATION",
    "Your current local role does not allow updating anchor publication details.",
  );
  const id = requiredString(formData, "id");
  const publishedUrl = optionalString(formData, "publishedUrl");
  const publicationNotes = optionalString(formData, "publicationNotes");

  await prisma.anchorRecord.update({
    where: { id },
    data: {
      publishedUrl,
      publicationNotes,
    },
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.ANCHOR_PUBLICATION_UPDATED,
    category: "ANCHOR",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "AnchorRecord",
    targetId: id,
    summary: "Anchor publication details updated",
    metadata: {
      anchorRecordId: id,
      publishedUrlPresent: Boolean(publishedUrl),
      publicationNotesLength: publicationNotes?.length ?? 0,
    },
  });

  revalidatePath("/anchors");
  revalidatePath("/guard");
  redirect("/anchors");
}
