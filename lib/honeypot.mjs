import warningTemplate from "./html/warning-template.mjs";
import bannedTemplate from "./html/banned-template.mjs";

const ENTRY_PATH = "/__clankers";
const TRIGGER_PATH = "/articles.md";
const BLOG_POST_LINK = "https://blog.caelondev.net/posts/screw-you-naughty-nut-munchers";

function normalize(pathname) {
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}

function isEntryPath(pathname) {
  return normalize(pathname) === ENTRY_PATH;
}

function isTriggerPath(pathname) {
  return normalize(pathname) === TRIGGER_PATH;
}

function buildWarningPage() {
  return warningTemplate
    .replaceAll("{{TRIGGER_PATH}}", TRIGGER_PATH)
    .replaceAll("{{BLOG-POST-LINK}}", BLOG_POST_LINK);
}

function buildBannedPage(ip) {
  return bannedTemplate
    .replaceAll("{{IP}}", ip)
    .replaceAll(
      "{{DISCORD_URL}}",
      "https://discord.com/users/1264839050427367570",
    );
}

export {
  ENTRY_PATH,
  TRIGGER_PATH,
  isEntryPath,
  isTriggerPath,
  buildWarningPage,
  buildBannedPage,
};
