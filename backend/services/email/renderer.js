const Mustache = require("mustache");
const fs = require("fs");

function getFileContents(path) {
  return fs.readFileSync(path, "utf8").toString();
}

function renderEmail(language, template, ...locales) {
  if (locales[0].baseURL == null) {
    throw new Error("baseURL is required");
  }
  const baseTemplatePath = `${__dirname}/i18n/templates/${language}/base.html`;
  const baseTemplateContent = getFileContents(baseTemplatePath);
  const templatePath = `${__dirname}/i18n/templates/${language}/${template}.html`;
  const templateContent = getFileContents(templatePath);
  const renderedInternal = Mustache.render(templateContent, ...locales);
  const renderedBase = Mustache.render(baseTemplateContent, {
    internal: renderedInternal,
    baseURL: locales[0].baseURL,
  });
  return renderedBase;
}

exports.renderEmail = renderEmail;
