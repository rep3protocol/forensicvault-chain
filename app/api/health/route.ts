import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "ForensicVault Chain",
    database: "sqlite",
    token: "TEST_VAULT",
    warning: "TEST_VAULT is a fake local test token with no real value.",
  });
}
