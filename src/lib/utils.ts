import type { MarkdownHeading } from "astro";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { HeadingHierarchy } from "@/lib/types";


// for shadcn components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// Helper function to capitalize the first letter of a string
export const capitalizeFirstLetter = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Note: content-derived helpers have moved to src/lib/content.ts

// Function to build breadcrumb structure
export function buildBreadcrumbs(
  slug: string,
): { title: string; link: string }[] {
  const parts = slug.split("/");
  const breadcrumbs: { title: string; link: string }[] = [];
  let currentPath = "";

  parts.forEach((part) => {
    if (part) {
      currentPath += `/${part}`;
      breadcrumbs.push({
        title: part,
        link: `${currentPath}`,
      });
    }
  });

  return breadcrumbs;
}

// create headings for ToC
export function createHeadingHierarchy(headings: MarkdownHeading[]) {
  const topLevelHeadings: HeadingHierarchy[] = [];

  headings.forEach((heading) => {
    const h = {
      ...heading,
      subheadings: [],
    };

    if (h.depth >= 2) {
      topLevelHeadings.push(h);
    } else {
      let parent = topLevelHeadings[topLevelHeadings.length - 1];
      if (parent) {
        parent.subheadings.push(h);
      }
    }
  });

  return topLevelHeadings;
}
