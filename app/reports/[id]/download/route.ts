import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { getDuplicateEvidenceForItem } from "@/lib/evidence/duplicates";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatDate(value?: Date | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function custodyStatus(
  registeredTxHash: string | null,
  events: { previousEventHash: string | null; eventHash: string }[]
) {
  if (events.length === 0) return "No custody events recorded.";
  if (!registeredTxHash) return "Custody chain broken: missing registration transaction hash.";
  if (events[0].previousEventHash !== registeredTxHash) return "Custody chain broken.";

  for (let i = 1; i < events.length; i++) {
    if (events[i].previousEventHash !== events[i - 1].eventHash) {
      return "Custody chain broken.";
    }
  }

  return "Custody chain valid.";
}

function safeText(value: unknown) {
  return String(value ?? "N/A");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const evidence = await prisma.evidenceItem.findUnique({
    where: { id },
    include: {
      case: true,
      custodyEvents: {
        orderBy: { createdAt: "asc" },
      },
      verifications: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
  }

  const duplicateInfo = await getDuplicateEvidenceForItem(evidence.id);
  const duplicateDetected = (duplicateInfo?.duplicates.length ?? 0) > 0;
  const latestVerification = evidence.verifications[0];

  const registrationBlock =
    evidence.registeredBlockHeight !== null
      ? await prisma.ledgerBlock.findUnique({
          where: { height: evidence.registeredBlockHeight },
        })
      : null;

  const registrationTransaction =
    evidence.registeredTxHash !== null
      ? await prisma.ledgerTransaction.findUnique({
          where: { txHash: evidence.registeredTxHash },
        })
      : null;

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  function ensureSpace(spaceNeeded = 40) {
    if (y - spaceNeeded < margin) {
      newPage();
    }
  }

  function drawText(text: string, options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }) {
    const size = options?.size ?? 10;
    const font = options?.bold ? boldFont : regularFont;
    const color = options?.color ?? rgb(0, 0, 0);

    ensureSpace(size + 8);

    page.drawText(text, {
      x: margin,
      y,
      size,
      font,
      color,
    });

    y -= size + 6;
  }

  function wrapText(text: string, size = 9) {
    const words = safeText(text).replace(/\s+/g, " ").split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const width = regularFont.widthOfTextAtSize(test, size);

      if (width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);

        if (regularFont.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = "";
          for (const char of word) {
            const testChunk = chunk + char;
            if (regularFont.widthOfTextAtSize(testChunk, size) <= maxWidth) {
              chunk = testChunk;
            } else {
              if (chunk) lines.push(chunk);
              chunk = char;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }

    if (current) lines.push(current);
    return lines;
  }

  function drawWrapped(text: string, size = 9) {
    const lines = wrapText(text, size);
    for (const line of lines) {
      drawText(line, { size });
    }
  }

  function section(title: string) {
    ensureSpace(50);
    y -= 8;
    drawText(title, { size: 15, bold: true, color: rgb(0.05, 0.2, 0.35) });
  }

  function field(label: string, value: unknown) {
    ensureSpace(30);

    page.drawText(`${label}:`, {
      x: margin,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(` ${safeText(value)}`, {
      x: margin + 145,
      y,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
      maxWidth: maxWidth - 145,
    });

    y -= 16;
  }

  function longField(label: string, value: unknown) {
    ensureSpace(40);
    drawText(`${label}:`, { size: 10, bold: true });
    drawWrapped(safeText(value), 8.5);
    y -= 4;
  }

  drawText("ForensicVault Chain", { size: 20, bold: true });
  drawText("Evidence Integrity Report", { size: 16, bold: true });
  drawText("LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.", {
    size: 10,
    bold: true,
    color: rgb(0.65, 0.35, 0),
  });
  field("Generated", formatDate(new Date()));
  drawWrapped(
    "This report summarizes local cryptographic integrity checks, custody records, and ledger references. It is not a legal certification.",
    9
  );

  section("1. Case Information");
  field("Case Title", evidence.case.title);
  longField("Case ID", evidence.case.id);
  field("Status", evidence.case.status);
  field("Jurisdiction", evidence.case.jurisdiction ?? "N/A");
  field("Description", evidence.case.description ?? "No description provided.");
  field("Tags", evidence.case.tags ?? "N/A");
  field("Created", formatDate(evidence.case.createdAt));

  section("2. Evidence Information");
  longField("Evidence ID", evidence.id);
  field("Original File Name", evidence.originalName);
  field("Evidence Type", evidence.evidenceType);
  field("MIME Type", evidence.mimeType ?? "N/A");
  field("Size Bytes", evidence.sizeBytes ?? "N/A");
  field("Status", evidence.status);
  longField("Stored Path", evidence.storedPath ?? "N/A");
  longField("SHA-256", evidence.sha256Hash);
  field("Created", formatDate(evidence.createdAt));

  section("3. Duplicate Hash Review");
  field("Duplicate SHA-256 Detected", yesNo(duplicateDetected));
  field("Duplicate Count", duplicateDetected ? duplicateInfo?.duplicateCount : 0);
  if (duplicateDetected) {
    longField(
      "Matching Evidence",
      duplicateInfo?.duplicates
        .map((duplicate) => `${duplicate.originalName} (${duplicate.id})`)
        .join(", ") ?? "N/A",
    );
  } else {
    field("Matching Evidence", "No matching evidence found.");
  }
  drawWrapped("Identical SHA-256 hashes indicate identical file content.", 9);

  section("4. Registration Ledger Reference");
  field("Registered Block Height", evidence.registeredBlockHeight ?? "N/A");
  longField("Registered Transaction Hash", evidence.registeredTxHash ?? "N/A");
  field("Transaction Type", registrationTransaction?.type ?? "N/A");
  longField("Registration Block Hash", registrationBlock?.blockHash ?? "N/A");
  longField("Merkle Root", registrationBlock?.merkleRoot ?? "N/A");
  field("Registration Timestamp", formatDate(registrationBlock?.timestamp));
  field("Validator", registrationBlock?.validator ?? "N/A");

  section("5. Latest Verification");

  if (latestVerification) {
    field("Result", latestVerification.matched ? "MATCH" : "FAILED");
    longField("Original Hash", latestVerification.originalHash);
    longField("Provided Hash", latestVerification.providedHash);
    field("Hash Matched", yesNo(latestVerification.matched));
    field("Ledger Chain Valid", yesNo(latestVerification.chainValid));
    field("Signatures Valid", yesNo(latestVerification.signaturesValid));
    field("Integrity Score", latestVerification.integrityScore);
    field("Verification Timestamp", formatDate(latestVerification.createdAt));
    field("Notes", latestVerification.notes ?? "N/A");
  } else {
    field("Verification", "No verification has been recorded for this evidence item.");
  }

  section("6. Custody Chain");
  field(
    "Custody Chain Status",
    custodyStatus(evidence.registeredTxHash, evidence.custodyEvents)
  );

  section("7. Custody Timeline");

  if (evidence.custodyEvents.length === 0) {
    field("Custody Events", "No custody events have been recorded.");
  } else {
    evidence.custodyEvents.forEach((event, index) => {
      section(`Event ${index + 1}: ${event.action}`);
      field("Actor Name", event.actorName);
      field("Actor Role", event.actorRole);
      field("Notes", event.notes ?? "No notes.");
      longField("Previous Event Hash", event.previousEventHash ?? "N/A");
      longField("Event Hash", event.eventHash);
      field("Block Height", event.blockHeight ?? "N/A");
      longField("Transaction Hash", event.txHash ?? "N/A");
      field("Timestamp", formatDate(event.createdAt));
    });
  }

  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    p.drawText(
      `ForensicVault Chain · Local TESTNET Report · Page ${index + 1} of ${pages.length}`,
      {
        x: margin,
        y: 25,
        size: 8,
        font: regularFont,
        color: rgb(0.25, 0.25, 0.25),
      }
    );
  });

  const pdfBytes = await pdfDoc.save();

  const safeFileName = evidence.originalName
    .replace(/[^a-z0-9.\-_]+/gi, "-")
    .slice(0, 80);

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="forensicvault-report-${safeFileName}.pdf"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
