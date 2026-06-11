const DANGEROUS_ELEMENTS = "script, iframe, object, embed, meta, link, xml, base, form";
const SCRIPT_PROTOCOL = ["javascript", ":"].join("");
const BLOCKED_URL_PROTOCOLS = [
  SCRIPT_PROTOCOL,
  ["vbscript", ":"].join(""),
  ["data", ":"].join(""),
];

function removeComments(node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      return;
    }
    removeComments(child);
  });
}

function cleanStyle(styleValue) {
  return String(styleValue || "")
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const [propertyName, ...valueParts] = rule.split(":");
      const property = String(propertyName || "").trim().toLowerCase();
      const value = valueParts.join(":").trim().toLowerCase();

      if (!property || property.startsWith("mso-")) return false;
      if (["behavior", "-ms-behavior"].includes(property)) return false;
      if (["position"].includes(property) && ["fixed", "absolute"].includes(value)) return false;
      if (value.includes(SCRIPT_PROTOCOL)) return false;
      if (value.includes("expression(")) return false;
      if (/url\s*\(/i.test(value)) return false;

      return true;
    })
    .join("; ");
}

function cleanClassName(className) {
  return String(className || "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !/^mso/i.test(token))
    .join(" ");
}

export function normalizeHealthCheckupReportHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== "string") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  removeComments(doc.body);
  doc.body.querySelectorAll(DANGEROUS_ELEMENTS).forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "").trim();
      const lowerValue = value.toLowerCase();

      if (
        name === "contenteditable" ||
        name.startsWith("on") ||
        name.startsWith("data-") ||
        name.startsWith("xmlns") ||
        name.startsWith("o:") ||
        name.startsWith("w:") ||
        name.startsWith("v:")
      ) {
        node.removeAttribute(attr.name);
        return;
      }

      if (
        ["href", "src", "action", "formaction"].includes(name) &&
        BLOCKED_URL_PROTOCOLS.some((protocol) => lowerValue.startsWith(protocol))
      ) {
        node.removeAttribute(attr.name);
        return;
      }

      if (name === "style") {
        const cleanedStyle = cleanStyle(value);
        if (cleanedStyle) node.setAttribute("style", cleanedStyle);
        else node.removeAttribute("style");
        return;
      }

      if (name === "class") {
        const cleanedClassName = cleanClassName(value);
        if (cleanedClassName) node.setAttribute("class", cleanedClassName);
        else node.removeAttribute("class");
      }
    });
  });

  return doc.body.innerHTML.trim();
}
