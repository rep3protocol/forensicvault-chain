export function shortenHash(
  value: string | null | undefined,
  prefix = 10,
  suffix = 6,
): string {
  if (!value) {
    return "—";
  }

  if (value.length <= prefix + suffix + 1) {
    return value;
  }

  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}
