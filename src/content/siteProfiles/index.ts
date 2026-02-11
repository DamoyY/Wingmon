import type { GetPageContentResponse } from "../../shared/index.ts";
import resolveGoogleSearchProfile from "./googleSearchProfile.js";

export type SiteProfileContext = {
  pageNumber: number;
  title: string;
  url: string;
};

type SiteProfileResolver = (
  context: SiteProfileContext,
) => GetPageContentResponse | null;

const siteProfileResolvers: readonly SiteProfileResolver[] = [
  resolveGoogleSearchProfile,
];

const resolveSiteProfileContent = (
  context: SiteProfileContext,
): GetPageContentResponse | null => {
  for (const resolveSiteProfile of siteProfileResolvers) {
    const content = resolveSiteProfile(context);
    if (content !== null) {
      return content;
    }
  }
  return null;
};

export { resolveSiteProfileContent };
export default resolveSiteProfileContent;
