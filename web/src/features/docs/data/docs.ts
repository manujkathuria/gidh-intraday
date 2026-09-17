import { DocArticle } from "./types";
import { QUANT_DOCS } from "./quantDocs";
import { BACKEND_DOCS } from "./backendDocs";

export * from "./types";
export * from "./quantDocs";
export * from "./backendDocs";

export const ALL_DOCS: DocArticle[] = [
  ...QUANT_DOCS,
  ...BACKEND_DOCS
];
