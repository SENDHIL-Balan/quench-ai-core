declare module "pdf-parse" {
  const parsePdf: (data: Uint8Array) => Promise<{ text: string }>;
  export default parsePdf;
}
