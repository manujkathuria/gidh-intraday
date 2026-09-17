export interface DocArticle {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  category: "quant" | "backend";
  readTime: string;
  content: string;
}
