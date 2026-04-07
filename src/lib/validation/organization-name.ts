export const ORGANIZATION_NAME_MIN_LENGTH = 2;
export const ORGANIZATION_NAME_MAX_LENGTH = 120;
export const ORGANIZATION_NAME_PATTERN = /^[\p{L}\p{M}\d .,'&()/-]+$/u;

export function normalizeOrganizationName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateOrganizationName(value: string): string {
  const normalized = normalizeOrganizationName(value);

  if (!normalized) {
    return 'Tên tổ chức là bắt buộc.';
  }

  if (normalized.length < ORGANIZATION_NAME_MIN_LENGTH) {
    return `Tên tổ chức cần có ít nhất ${ORGANIZATION_NAME_MIN_LENGTH} ký tự.`;
  }

  if (normalized.length > ORGANIZATION_NAME_MAX_LENGTH) {
    return `Tên tổ chức không được vượt quá ${ORGANIZATION_NAME_MAX_LENGTH} ký tự.`;
  }

  if (!ORGANIZATION_NAME_PATTERN.test(normalized)) {
    return "Tên tổ chức chỉ được chứa chữ, số, khoảng trắng và các ký tự . , ' & ( ) / -.";
  }

  return '';
}
