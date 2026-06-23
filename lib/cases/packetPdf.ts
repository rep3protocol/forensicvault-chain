import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  CasePacketData,
  custodyStatus,
  formatPacketDate,
  yesNo,
} from "@/lib/cases/packet";

type PdfColor = ReturnType<typeof rgb>;

function safeText(value: unknown) {
  return String(value ?? "N/A");
}

export async function createCasePacketPdf(packet: CasePacketData) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function newPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  function ensureSpace(spaceNeeded = 40) {
    if (y - spaceNeeded < margin + 20) {
      newPage();
    }
  }

  function wrapText(text: unknown, size = 9, width = maxWidth) {
    const words = safeText(text).replace(/\s+/g, " ").split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (regularFont.widthOfTextAtSize(test, size) <= width) {
        current = test;
        continue;
      }

      if (current) lines.push(current);

      if (regularFont.widthOfTextAtSize(word, size) > width) {
        let chunk = "";
        for (const char of word) {
          const testChunk = chunk + char;
          if (regularFont.widthOfTextAtSize(testChunk, size) <= width) {
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

    if (current) lines.push(current);
    return lines;
  }

  function drawLine(
    text: unknown,
    options?: { size?: number; bold?: boolean; color?: PdfColor },
  ) {
    const size = options?.size ?? 9;
    ensureSpace(size + 8);
    page.drawText(safeText(text), {
      x: margin,
      y,
      size,
      font: options?.bold ? boldFont : regularFont,
      color: options?.color ?? rgb(0, 0, 0),
    });
    y -= size + 6;
  }

  function drawWrapped(text: unknown, size = 9, indent = 0) {
    const lines = wrapText(text, size, maxWidth - indent);
    for (const line of lines) {
      ensureSpace(size + 8);
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      y -= size + 5;
    }
  }

  function section(title: string) {
    ensureSpace(55);
    y -= 8;
    drawLine(title, { size: 14, bold: true, color: rgb(0.05, 0.2, 0.35) });
  }

  function field(label: string, value: unknown) {
    ensureSpace(26);
    page.drawText(`${label}:`, {
      x: margin,
      y,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    const lines = wrapText(value, 9, maxWidth - 155);
    for (let i = 0; i < Math.max(lines.length, 1); i++) {
      ensureSpace(14);
      page.drawText(i === 0 ? lines[i] ?? "N/A" : lines[i], {
        x: margin + 155,
        y,
        size: 9,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      y -= 14;
    }
  }

  function bullet(value: unknown) {
    drawWrapped(`- ${safeText(value)}`, 8.5, 10);
  }

  const { caseItem, integritySummary, ledger } = packet;

  drawLine("ForensicVault Chain", { size: 20, bold: true });
  drawLine("Case Packet", { size: 16, bold: true });
  drawLine("LOCAL TESTNET - TEST_VAULT HAS NO REAL VALUE.", {
    size: 10,
    bold: true,
    color: rgb(0.65, 0.35, 0),
  });
  field("Generated", formatPacketDate(packet.generatedAt));

  section("1. Case Information");
  field("Case Title", caseItem.title);
  field("Description", caseItem.description ?? "No description provided.");
  field("Jurisdiction", caseItem.jurisdiction ?? "N/A");
  field("Status", caseItem.status);
  field("Tags", caseItem.tags ?? "N/A");
  field("Case ID", caseItem.id);
  field("Created", formatPacketDate(caseItem.createdAt));
  field("Updated", formatPacketDate(caseItem.updatedAt));
  field("Owner", caseItem.owner?.name ?? "N/A");

  section("2. Case Integrity Summary");
  field("Total Evidence Items", integritySummary.totalEvidenceItems);
  field("Total Duplicate Hash Groups", integritySummary.totalDuplicateHashGroups);
  field("Total Custody Events", integritySummary.totalCustodyEvents);
  field("Total Verifications", integritySummary.totalVerifications);
  field("Matched Verifications", integritySummary.matchedVerifications);
  field("Failed/Non-Matching Verifications", integritySummary.failedVerifications);
  field("Latest Ledger Block Height", integritySummary.latestLedgerBlockHeight ?? "N/A");
  field("Latest Ledger Block Hash", integritySummary.latestLedgerBlockHash ?? "N/A");

  section("3. Evidence Inventory");
  if (caseItem.evidence.length === 0) {
    field("Evidence", "No evidence items are registered for this case.");
  }
  caseItem.evidence.forEach((item, index) => {
    const duplicateCount = packet.duplicateCounts.get(item.sha256Hash) ?? 0;
    section(`Evidence ${index + 1}: ${item.originalName}`);
    field("Evidence ID", item.id);
    field("Evidence Type", item.evidenceType);
    field("MIME Type", item.mimeType ?? "N/A");
    field("Size Bytes", item.sizeBytes ?? "N/A");
    field("Status", item.status);
    field("SHA-256 Hash", item.sha256Hash);
    field("Registered Block Height", item.registeredBlockHeight ?? "N/A");
    field("Registered Transaction Hash", item.registeredTxHash ?? "N/A");
    field("Created", formatPacketDate(item.createdAt));
    field("Duplicate Hash Detected", yesNo(duplicateCount > 1));
    field("Duplicate Count", duplicateCount > 1 ? duplicateCount : 0);
  });

  section("4. Latest Verification For Each Evidence Item");
  caseItem.evidence.forEach((item, index) => {
    const latestVerification = item.verifications[0];
    section(`Verification ${index + 1}: ${item.originalName}`);
    if (!latestVerification) {
      field("Latest Verification Result", "Not verified");
      return;
    }
    field("Latest Verification Result", latestVerification.matched ? "MATCH" : "NO MATCH");
    field("Original Hash", latestVerification.originalHash);
    field("Provided Hash", latestVerification.providedHash);
    field("Chain Valid", yesNo(latestVerification.chainValid));
    field("Signatures Valid", yesNo(latestVerification.signaturesValid));
    field("Integrity Score", latestVerification.integrityScore);
    field("Verification Date", formatPacketDate(latestVerification.createdAt));
  });

  section("5. Custody Timeline For Each Evidence Item");
  caseItem.evidence.forEach((item, evidenceIndex) => {
    section(`Custody ${evidenceIndex + 1}: ${item.originalName}`);
    field("Custody Chain Status", custodyStatus(item.registeredTxHash, item.custodyEvents));
    if (item.custodyEvents.length === 0) {
      field("Custody Events", "No custody events have been recorded.");
      return;
    }
    item.custodyEvents.forEach((event, eventIndex) => {
      section(`Custody Event ${eventIndex + 1}: ${event.action}`);
      field("Action", event.action);
      field("Actor Name", event.actorName);
      field("Actor Role", event.actorRole);
      field("Notes", event.notes ?? "No notes.");
      field("Previous Event Hash", event.previousEventHash ?? "N/A");
      field("Event Hash", event.eventHash);
      field("Block Height", event.blockHeight ?? "N/A");
      field("Transaction Hash", event.txHash ?? "N/A");
      field("Created", formatPacketDate(event.createdAt));
    });
  });

  section("6. Duplicate Hash Groups");
  if (packet.duplicateGroups.length === 0) {
    field("Duplicate Groups", "No duplicate SHA-256 hash groups were found.");
  }
  packet.duplicateGroups.forEach((group, index) => {
    section(`Duplicate Group ${index + 1}`);
    field("SHA-256 Hash", group.sha256Hash);
    field("Count", group.count);
    group.evidence.forEach((item) => {
      bullet(`${item.originalName} | ${item.id} | ${formatPacketDate(item.createdAt)}`);
    });
    drawWrapped(
      "Identical SHA-256 hashes indicate identical file content, even if filenames or upload times differ. This is not proof of tampering by itself.",
      8.5,
    );
  });

  section("7. Ledger References");
  field("Latest Ledger Block Height", ledger.latestLedgerBlock?.height ?? "N/A");
  field("Latest Ledger Block Hash", ledger.latestLedgerBlock?.blockHash ?? "N/A");
  field("Total Ledger Blocks", ledger.totalLedgerBlocks);
  field("Registration Transaction Hashes", ledger.registrationTxHashes.join(", ") || "N/A");
  field("Verification Transaction Hashes", ledger.verificationTxHashes.join(", ") || "N/A");
  field("Custody Event Transaction Hashes", ledger.custodyTxHashes.join(", ") || "N/A");
  field(
    "Case-Related Transaction References",
    ledger.caseTransactions.map((transaction) => `${transaction.type}: ${transaction.txHash}`).join(", ") ||
      "N/A",
  );

  const pages = pdfDoc.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawText(
      `ForensicVault Chain local MVP/testnet | LOCAL TESTNET - TEST_VAULT HAS NO REAL VALUE. | Page ${
        index + 1
      } of ${pages.length}`,
      {
        x: margin,
        y: 24,
        size: 7.5,
        font: regularFont,
        color: rgb(0.25, 0.25, 0.25),
      },
    );
  });

  return pdfDoc.save();
}
