"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAnchorRecord,
  findDuplicateAnchorRecordForCurrent,
} from "@/lib/anchors/history";
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

    revalidatePath("/anchors");
    revalidatePath("/guard");
    redirect(`/anchors?duplicateAnchor=1&existingAnchorId=${duplicate.id}`);
  }

  await createAnchorRecord({
    label,
    createdById: user.id,
    createdByName: user.name,
  });

  revalidatePath("/anchors");
  revalidatePath("/guard");
  redirect("/anchors");
}

export async function updateAnchorPublication(formData: FormData) {
  await assertPermission(
    "UPDATE_ANCHOR_PUBLICATION",
    "Your current local role does not allow updating anchor publication details.",
  );
  const id = requiredString(formData, "id");

  await prisma.anchorRecord.update({
    where: { id },
    data: {
      publishedUrl: optionalString(formData, "publishedUrl"),
      publicationNotes: optionalString(formData, "publicationNotes"),
    },
  });

  revalidatePath("/anchors");
  revalidatePath("/guard");
  redirect("/anchors");
}
