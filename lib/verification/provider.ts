/**
 * Age & identity verification. Phase 1 ships DemoProvider only.
 * Phase 2 adds DiditProvider / VeriffProvider behind this interface (document + selfie liveness).
 * We store the RESULT only: verified yes/no, age band passed, timestamp, provider reference, expiry.
 * Never the ID number, never the full date of birth.
 */

export interface VerificationStart {
  sessionId: string;
  /** Where to send the user (hosted flow) or null for an in-page flow. */
  redirectUrl: string | null;
}

export interface VerificationResult {
  sessionId: string;
  status: "pending" | "approved" | "declined" | "expired";
  /** Did the person meet the minimum age? Never the birth date itself. */
  ageBandPassed: number | null;
  /** Name as verified, used to make sure the delivery recipient is the verified person. */
  verifiedName: string | null;
  providerRef: string;
  checkedAt: string;
}

export interface AgeVerificationProvider {
  readonly id: "demo" | "didit" | "veriff";
  /** Plain-language label for the UI. */
  readonly label: string;
  start(input: { minAge: number; returnUrl: string }): Promise<VerificationStart>;
  getResult(sessionId: string): Promise<VerificationResult>;
}
