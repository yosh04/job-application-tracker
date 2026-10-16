export function prefixCvFilename(company: string, originalName: string): string {
  const basename = originalName.split(/[\\/]/).pop()?.replace(/[<>:"|?*\x00-\x1f]/g, "_").trim() || "cv";
  const companyPrefix =
    company
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "Empresa";
  const prefix = `${companyPrefix}_`;
  return basename.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())
    ? basename
    : `${prefix}${basename}`;
}
