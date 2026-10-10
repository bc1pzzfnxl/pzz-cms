import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { getImageDimensions } from "./imageMeta";

export function rehypeOptimizedImages() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;

      const props = node.properties;
      if (!props.loading) props.loading = "lazy";
      if (!props.decoding) props.decoding = "async";

      const src = props.src;
      if ((!props.width || !props.height) && typeof src === "string") {
        const dims = getImageDimensions(src);
        if (dims.width && dims.height) {
          props.width = dims.width;
          props.height = dims.height;
        }
      }
    });
  };
}
