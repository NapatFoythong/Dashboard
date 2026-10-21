import { compareText, type Work } from "./analytics.ts";

export type PublicationSort = "newest" | "oldest" | "title-asc" | "title-desc" | "author-asc" | "author-desc" | "type-asc" | "type-desc";

export function orderWorks(works: Work[], sort: PublicationSort): Work[] {
  return [...works].sort((a, b) => {
    const author = (row: Work) => row.authors.join(", ");
    const primary = sort === "newest" ? b.year - a.year : sort === "oldest" ? a.year - b.year
      : sort === "title-asc" ? compareText(a.detail, b.detail) : sort === "title-desc" ? compareText(b.detail, a.detail)
      : sort === "author-asc" ? compareText(author(a), author(b)) : sort === "author-desc" ? compareText(author(b), author(a))
      : sort === "type-asc" ? compareText(a.type, b.type) : compareText(b.type, a.type);
    return primary || b.year - a.year || compareText(a.detail, b.detail) || a.id - b.id;
  });
}
