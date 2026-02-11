import type {
  PageContentData,
  PreparedMarkdownPageContent,
} from "./pageContentContracts.ts";
import { prepareDomStage } from "./domPreparationStage.ts";
import { segmentMarkdownStage } from "./markdownSegmentationStage.ts";
import { transformDomStageToMarkdown } from "./markdownTransformationStage.ts";

const prepareMarkdownPageContent = (
  pageData: PageContentData,
): PreparedMarkdownPageContent => {
  const preparedDom = prepareDomStage(pageData);
  const markdownExtraction = transformDomStageToMarkdown(preparedDom);
  const segmented = segmentMarkdownStage({
    anchors: markdownExtraction.anchors,
    content: markdownExtraction.content,
    locateViewportCenter: preparedDom.locateViewportCenter,
    pageNumber: pageData.pageNumber,
    viewportIndex: markdownExtraction.viewportIndex,
  });
  return {
    anchors: segmented.anchors,
    chunked: segmented.chunked,
    prefixTokenCounter: segmented.prefixTokenCounter,
    title: pageData.title,
    url: pageData.url,
    viewportPage: segmented.viewportPage,
  };
};

export type { PageContentData, PreparedMarkdownPageContent };
export { prepareMarkdownPageContent };
