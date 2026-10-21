// Explicitly verified identity only; never infer matches from first names.
// Excel: MONCHANOK. CSV and official CV: MONCHANOK THONGTHEP.
// https://computing.psu.ac.th/cv/index?encode_id=50dd7ab163bd967414346852195d894e
export const FACULTY_ALIASES: Record<string, string> = {
  MONCHANOK: "MONCHANOK THONGTHEP",
};

export const canonicalFacultyName = (name: string) => FACULTY_ALIASES[name] ?? name;
