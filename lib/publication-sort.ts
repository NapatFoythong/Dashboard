import { compareText, type Work } from "./analytics.ts";

export type PublicationSort = "newest" | "oldest" | "month-newest" | "month-oldest" | "title-asc" | "title-desc" | "author-asc" | "author-desc" | "type-asc" | "type-desc";

export function orderWorks(works: Work[], sort: PublicationSort): Work[] {
  return [...works].sort((a, b) => {
    const author = (row: Work) => row.authors.join(", ");
    const monthKey = (row: Work) => row.year * 12 + (Number(row.month) || 0);
    const primary = sort === "newest" ? b.year - a.year : sort === "oldest" ? a.year - b.year
      : sort === "month-newest" ? monthKey(b) - monthKey(a) : sort === "month-oldest" ? monthKey(a) - monthKey(b)
      : sort === "title-asc" ? compareText(a.detail, b.detail) : sort === "title-desc" ? compareText(b.detail, a.detail)
      : sort === "author-asc" ? compareText(author(a), author(b)) : sort === "author-desc" ? compareText(author(b), author(a))
      : sort === "type-asc" ? compareText(a.type, b.type) : compareText(b.type, a.type);
    return primary || (sort === "month-newest" || sort === "month-oldest" ? b.year - a.year || (Number(b.month) || 0) - (Number(a.month) || 0) : b.year - a.year) || compareText(a.detail, b.detail) || a.id - b.id;
  });
}
