"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_PUBLIC_KEY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

async function getOrCreateDefaultUser() {
  return prisma.user.upsert({
    where: { publicKey: DEFAULT_PUBLIC_KEY },
    update: {},
    create: {
      name: "Local Investigator",
      role: "Investigator",
      publicKey: DEFAULT_PUBLIC_KEY,
    },
  });
}

export async function createCase(formData: FormData) {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const jurisdiction = formData.get("jurisdiction")?.toString().trim() || null;
  const tags = formData.get("tags")?.toString().trim() || null;

  if (!title) {
    throw new Error("Title is required.");
  }

  const owner = (await getCurrentUser()) ?? (await getOrCreateDefaultUser());

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
