export function userDisplayName(email: string | null | undefined): string {
  const localPart = email?.trim().split("@")[0];
  if (!localPart) return "Mi espacio";

  const words = localPart
    .replace(/[._+-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "Mi espacio";
  return words.map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1)).join(" ");
}
