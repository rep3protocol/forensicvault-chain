"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth/requirePermission";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { prisma } from "@/lib/prisma";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function requiredStringValue(formData: FormData, key: string) {
  const value = stringValue(formData, key).trim();

  if (!value) {
    throw new Error(`Missing required Shield field: ${key}`);
  }

  return value;
}

function nullableStringValue(formData: FormData, key: string) {
  const value = stringValue(formData, key).trim();
  return value.length > 0 ? value : null;
}

export async function acknowledgeShieldAlert(formData: FormData) {
  const user = await assertPermission(
    "ACKNOWLEDGE_SHIELD_ALERT",
    "Your current local role does not allow acknowledging Shield alerts.",
  );
  const alertId = requiredStringValue(formData, "alertId");
  const alertTitle = requiredStringValue(formData, "alertTitle");
  const severity = requiredStringValue(formData, "severity");
  const category = requiredStringValue(formData, "category");
  const reference = nullableStringValue(formData, "reference");
  const reason = requiredStringValue(formData, "reason");
  const note = nullableStringValue(formData, "note");

  await prisma.shieldAlertAcknowledgement.upsert({
    where: { alertId },
    update: {
      alertTitle,
      severity,
      category,
      reference,
      reason,
      note,
      acknowledgedById: user.id,
      acknowledgedByName: user.name,
      acknowledgedAt: new Date(),
    },
    create: {
      alertId,
      alertTitle,
      severity,
      category,
      reference,
      reason,
      note,
      acknowledgedById: user.id,
      acknowledgedByName: user.name,
    },
  });

  await prisma.shieldEvent.create({
    data: {
      eventType: "ALERT_ACKNOWLEDGED",
      alertId,
      severity,
      category,
      title: alertTitle,
      description: note
        ? `Alert acknowledged with note: ${note}`
        : "Alert acknowledged without a note.",
      actorId: user.id,
      actorName: user.name,
      metadataJson: JSON.stringify({ reference, reason }),
    },
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.SHIELD_ALERT_ACKNOWLEDGED,
    category: "SHIELD",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "ShieldAlert",
    targetId: alertId,
    targetLabel: alertTitle,
    summary: `Shield alert acknowledged: ${alertTitle}`,
    metadata: {
      alertId,
      severity,
      category,
      noteLength: note?.length ?? 0,
      acknowledgedByName: user.name,
    },
  });

  revalidatePath("/guard");
  redirect("/guard");
}

export async function clearShieldAcknowledgement(formData: FormData) {
  const user = await assertPermission(
    "CLEAR_SHIELD_ACKNOWLEDGEMENT",
    "Your current local role does not allow clearing Shield acknowledgements.",
  );
  const alertId = requiredStringValue(formData, "alertId");
  const existing = await prisma.shieldAlertAcknowledgement.findUnique({
    where: { alertId },
  });

  if (existing) {
    await prisma.shieldAlertAcknowledgement.delete({
      where: { alertId },
    });
  }

  await prisma.shieldEvent.create({
    data: {
      eventType: "ACKNOWLEDGEMENT_CLEARED",
      alertId,
      severity: existing?.severity,
      category: existing?.category,
      title: existing?.alertTitle ?? "Shield acknowledgement cleared",
      description: existing
        ? "Alert acknowledgement was cleared. The active alert is unacknowledged again if the rule still matches."
        : "A clear acknowledgement request was recorded, but no acknowledgement existed.",
      actorId: user.id,
      actorName: user.name,
      metadataJson: existing
        ? JSON.stringify({
            reference: existing.reference,
            reason: existing.reason,
            acknowledgedByName: existing.acknowledgedByName,
            acknowledgedAt: existing.acknowledgedAt.toISOString(),
          })
        : null,
    },
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.SHIELD_ACKNOWLEDGEMENT_CLEARED,
    category: "SHIELD",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "ShieldAlert",
    targetId: alertId,
    targetLabel: existing?.alertTitle ?? alertId,
    summary: "Shield acknowledgement cleared",
    metadata: {
      alertId,
      severity: existing?.severity ?? null,
      category: existing?.category ?? null,
      acknowledgedByName: existing?.acknowledgedByName ?? null,
    },
  });

  revalidatePath("/guard");
  redirect("/guard");
}
