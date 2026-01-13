const DD_MM_YYYY = /^\d{2}-\d{2}-\d{4}$/;
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

const toYyyyMmDdFromDdMmYyyy = ({ ddMmYyyy }: { ddMmYyyy: string }) => {
  const [dd, mm, yyyy] = ddMmYyyy.split('-');
  return `${yyyy}-${mm}-${dd}`;
};

const toArmeniaMidnightUtcIso = ({ yyyyMmDd }: { yyyyMmDd: string }) => {
  // Armenia is UTC+04:00 (no DST). Midnight in Armenia becomes 20:00:00Z of the previous day.
  return new Date(`${yyyyMmDd}T00:00:00+04:00`).toISOString();
};

export const normalizeSrcAmProductionDate = ({
  date,
}: {
  date: string;
}): string => {
  const trimmed = date.trim();

  // Already a full ISO timestamp
  if (/T/.test(trimmed)) {
    const asDate = new Date(trimmed);
    if (Number.isNaN(asDate.getTime())) {
      throw new Error('Invalid ISO date');
    }
    return asDate.toISOString();
  }

  // YYYY-MM-DD
  if (YYYY_MM_DD.test(trimmed)) {
    return toArmeniaMidnightUtcIso({ yyyyMmDd: trimmed });
  }

  // DD-MM-YYYY (common UI format)
  if (DD_MM_YYYY.test(trimmed)) {
    const yyyyMmDd = toYyyyMmDdFromDdMmYyyy({ ddMmYyyy: trimmed });
    return toArmeniaMidnightUtcIso({ yyyyMmDd });
  }

  throw new Error('Invalid date format');
};

