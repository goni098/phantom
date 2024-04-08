export const toBase64 = (str: string) => Buffer.from(str).toString("base64");

export const toUtf8 = (base64: string) =>
  Buffer.from(base64, "base64").toString("utf-8");
