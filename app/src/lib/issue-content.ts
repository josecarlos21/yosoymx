import issueContentJson from "../../shared/content/issue-content.json" with { type: "json" };

export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
};

export type PdfResource = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  href: string;
};

export type CommunityKind = "comment" | "history";

export type IssueContent = typeof issueContentJson;

export const issueContent = issueContentJson as IssueContent;

export const issueNavigation = issueContent.navigation as NavigationItem[];
export const issuePdfResources = issueContent.resources.pdfs as PdfResource[];

export function normalizePdfHref(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
