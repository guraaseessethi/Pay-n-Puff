import type { AgeVerificationProvider, VerificationResult, VerificationStart } from "./provider";

/**
 * DEMO ONLY (Phase 1). No real check runs: no camera frames are captured, sent or stored.
 * It always approves, so it must never be wired up in production. getVerificationProvider()
 * refuses to return it when NEXT_PUBLIC_DATA_SOURCE=supabase.
 */
export class DemoProvider implements AgeVerificationProvider {
  readonly id = "demo" as const;
  readonly label = "Demo: no real check runs";

  async start(_input?: { minAge: number; returnUrl: string }): Promise<VerificationStart> {
    return { sessionId: `demo-${crypto.randomUUID()}`, redirectUrl: null };
  }

  async getResult(sessionId: string, name = "Demo Customer", minAge = 19): Promise<VerificationResult> {
    if (!sessionId.startsWith("demo-")) {
      return { sessionId, status: "declined", ageBandPassed: null, verifiedName: null, providerRef: sessionId, checkedAt: new Date().toISOString() };
    }
    return {
      sessionId,
      status: "approved",
      ageBandPassed: minAge,
      verifiedName: name,
      providerRef: sessionId,
      checkedAt: new Date().toISOString(),
    };
  }
}

/** Phase 1 returns the demo provider. Phase 2 returns Didit/Veriff (typed as AgeVerificationProvider). */
export function getVerificationProvider(): DemoProvider {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase") {
    throw new Error("No production verification provider configured. DemoProvider is Phase 1 only.");
  }
  return new DemoProvider();
}
