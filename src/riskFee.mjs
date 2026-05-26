export const HOOK_PERMISSION_MASK = 0x1080n;
export const OVERRIDE_FEE_FLAG = 0x400000;
export const MAX_RISK_BPS = 10_000;

export const DEFAULT_FEE_CONFIG = Object.freeze({
  calmFee: 500,
  alertFee: 3_000,
  maxFee: 10_000,
});

export function validateFeeConfig(config) {
  if (
    !Number.isInteger(config.calmFee) ||
    !Number.isInteger(config.alertFee) ||
    !Number.isInteger(config.maxFee) ||
    config.calmFee > config.alertFee ||
    config.alertFee > config.maxFee ||
    config.maxFee > 1_000_000
  ) {
    throw new Error("invalid fee config");
  }
}

export function feeForRisk(riskBps, config = DEFAULT_FEE_CONFIG) {
  validateFeeConfig(config);
  if (!Number.isInteger(riskBps) || riskBps < 0 || riskBps > MAX_RISK_BPS) {
    throw new Error("invalid risk score");
  }

  if (riskBps < 2_500) return config.calmFee;
  if (riskBps < 6_000) {
    return interpolate(config.calmFee, config.alertFee, riskBps - 2_500, 3_500);
  }
  return interpolate(config.alertFee, config.maxFee, riskBps - 6_000, 4_000);
}

export function feeOverrideForRisk(riskBps, config = DEFAULT_FEE_CONFIG) {
  return feeForRisk(riskBps, config) | OVERRIDE_FEE_FLAG;
}

function interpolate(fromFee, toFee, offset, width) {
  return fromFee + Math.floor(((toFee - fromFee) * offset) / width);
}
