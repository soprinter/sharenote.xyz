import type { SocialObjects } from "@/lib/types";

const GOOGLE_ANALYTICS_FALLBACK_ID = "G-Z172WTEVZD";
export const GA_ID_PLACEHOLDER = "G-XXXXXXXXXX";

export const ANALYTICS = {
  googleAnalyticsId:
    import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID ?? GOOGLE_ANALYTICS_FALLBACK_ID,
} as const;

export const SITE = {
  website: "https://sharenote.xyz",
  author: "soprinter",
  desc: "Sharenote is a proof-of-work protocol that turns energy into verifiable notes. Use them to sort feeds, weight content, and audit mining payouts natively.",
  title: "Sharenote",
  ogImage: "/og-image.png",
  repo: "https://github.com/soprinter",
  twitterSite: "@soprinter",
  twitterCreator: "@soprinter",
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-US"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const menu_items: { title: string; href: string }[] = [
  {
    title: "Learn",
    href: "/learn/introduction",
  },
  {
    title: "The Market",
    href: "/the-market/spending-bills",
  },
  {
    title: "Specifications",
    href: "/specifications/snip-00",
  },
];

// Just works with top-level folders and files. For files, don't add extension as it looks for the slug, and not the file name.
export const side_nav_menu_order: string[] = [
  "learn",
  "learn/introduction",
  "learn/what-is-sharenote",
  "learn/use-cases",
  "learn/how-it-works",
  "learn/the-z-bit-standard",
  "learn/learn-by-example",
  "learn/glossary",
  "the-market",
  "the-market/spending-bills",
  "the-market/agent-integration",
  "the-market/hashrate-monetization",
  "the-market/planner-calculator",
  "the-market/skills",
  "the-market/vibe-coding",
  "the-market/faqs",
  "specifications",
  "specifications/snip-00",
  "specifications/snip-02",
  "specifications/snip-03",
  "specifications/snip-04",
  "specifications/snip-05",
];

// Don't delete anything. You can use 'true' or 'false'.
// These are global settings
export const docconfig = {
  hide_table_of_contents: false,
  hide_breadcrumbs: false,
  hide_side_navigations: false,
  hide_datetime: false,
  hide_time: true,
  hide_search: false,
  hide_repo_button: false,
  hide_author: true,
};

// Set your social. It will appear in footer. Don't change the `name` value.
export const Socials: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/soprinter/",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
];
