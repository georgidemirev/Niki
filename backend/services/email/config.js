const mailgun = require('mailgun-js');
const subjects = require('../../services/email/i18n/subjects').subjects;

const mailgunApiKey = '12526dfa25ac6af0c7cf76f01e925545-9a235412-0ca142dd';
const mailgunDomain = 'influ.ai';
const mailgunHost = "api.eu.mailgun.net";

const mailgunOrigin = 'influ.ai <no-reply@influ.ai>';
const mailgunClient = mailgun({ apiKey: mailgunApiKey, domain: mailgunDomain, host: mailgunHost });


module.exports = {
    mailgunClient,
    mailgunOrigin
};
