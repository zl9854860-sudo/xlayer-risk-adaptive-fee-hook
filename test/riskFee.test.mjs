import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_FEE_CONFIG,
  HOOK_PERMISSION_MASK,
  OVERRIDE_FEE_FLAG,
  feeForRisk,
  feeOverrideForRisk,
  validateFeeConfig,
} from "../src/riskFee.mjs";

test("uses the expected v4 hook permission mask", () => {
  assert.equal(HOOK_PERMISSION_MASK, 0x1080n);
});

test("returns calm fee for low risk", () => {
  assert.equal(feeForRisk(0), DEFAULT_FEE_CONFIG.calmFee);
  assert.equal(feeForRisk(2_499), DEFAULT_FEE_CONFIG.calmFee);
});

test("interpolates between calm and alert fee in the warm band", () => {
  assert.equal(feeForRisk(2_500), 500);
  assert.equal(feeForRisk(4_250), 1_750);
  assert.equal(feeForRisk(5_999), 2_999);
});

test("interpolates between alert and max fee in the alert band", () => {
  assert.equal(feeForRisk(6_000), 3_000);
  assert.equal(feeForRisk(8_000), 6_500);
  assert.equal(feeForRisk(10_000), 10_000);
});

test("sets the Uniswap override flag on returned swap fee", () => {
  assert.equal(feeOverrideForRisk(8_000), OVERRIDE_FEE_FLAG | 6_500);
});

test("rejects invalid risk scores and fee configs", () => {
  assert.throws(() => feeForRisk(10_001), /invalid risk score/);
  assert.throws(() => validateFeeConfig({ calmFee: 3_000, alertFee: 500, maxFee: 10_000 }), /invalid fee config/);
});
