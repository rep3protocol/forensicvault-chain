"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  await prisma.case.create({
    data: {
      title,
      description,
      jurisdiction,
      tags,
      ownerId: owner.id,
    },
  });

  revalidatePath("/cases");
  revalidatePath("/");
  redirect("/cases");
}
