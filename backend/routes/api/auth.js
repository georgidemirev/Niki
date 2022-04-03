"use strict";
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const base64url = require('base64url');
const sanitize = require('mongo-sanitize');
const validator = require('validator');
const ash = require('express-async-handler');
const createError = require('http-errors');
const emailRenderer = require('../../services/email/renderer');
const User = require('../../models/user');
const Organization = require('../../models/organization');
const countriesMainLanguageJson = require('../../services/email/i18n/countries_main_language_mapping.json');
const { mailgunClient, mailgunOrigin } = require('../../services/email/config');
const subjects = require('../../services/email/i18n/subjects');


/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication management
 */


/**
* @swagger
*
* /auth/create_account/admin:
*   post:
*     summary: Create an admin account - Admin
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           code:
*             type: string
*           name:
*             type: string
*           email:
*             type: string
*             format: email
*           password:
*             type: string
*     responses:
*       '200':
*         description: "{success: true, token: token}"
*/
router.post('/create_account/admin', ash(async (req, res) => {
  const email = sanitize(req.body.email);
  const password = sanitize(req.body.password);
  const name = sanitize(req.body.name);

  if (email == undefined || password == undefined || name == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (!validator.isEmail(email)) throw createError(400, 'The email is not formatted correctly');

  const emailRegEx = new RegExp(["^", email, "$"].join(""), "i");
  const emailTaken = await User.exists({ email: emailRegEx });
  if (emailTaken) throw createError(400, 'Email is taken');

  const user = new User({
    name: name,
    email: email,
    password: password,
    country: "Bulgaria",
    lang: "bg",
    role: "manager"
  });

  const token = user._id + '-' + base64url(crypto.randomBytes(64));
  user.tokens.push(token);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(user.password, salt);

  user.password = hash;
  await user.save();

  return res.send({ success: true, token: token });
}));


/**
* @swagger
*
* /auth/create_account/organization:
*   post:
*     summary: Create a manager account and a linked organization - Admin
*     tags: [Authentication]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           email:
*             type: string
*             format: email
*           name:
*             type: string
*           organization_name:
*             type: string
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/create_account/organization', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  let user = await User.exists({ _id: id, tokens: token, admin: { $gte: 1 } });
  if (!user) throw createError(401, 'Unauthorized User');

  const email = sanitize(req.body.email);
  const name = sanitize(req.body.name);
  const organization_name = sanitize(req.body.organization_name);

  if (email == undefined || name == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (!validator.isEmail(email)) throw createError(400, 'The email is not formatted correctly');

  const emailRegEx = new RegExp(["^", email, "$"].join(""), "i");
  const emailTaken = await User.exists({ email: emailRegEx });
  if (emailTaken) throw createError(400, 'Email is taken');

  const manager = new User({
    name: name,
    email: email,
    password: base64url(crypto.randomBytes(64)),
    role: "manager",
    enrollment_token: base64url(crypto.randomBytes(64))
  });

  const organization = new Organization({
    name: organization_name,
    manager: manager._id,
    executives: []
  });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(manager.password, salt);
  manager.password = hash;

  await manager.save();
  await organization.save();

  const data = {
    from: mailgunOrigin,
    to: email,
    subject: 'influ.ai Invitation',
    html: 'Create an account by clicking this link ...' + manager.enrollment_token
  };

  // await mailgunClient.messages().send(data);

  return res.send({ success: true });
}));


/**
* @swagger
*
* /auth/create_account/executive:
*   post:
*     summary: Create an executive account - Manager
*     tags: [Authentication]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           name:
*             type: string
*           email:
*             type: string
*             format: email
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/create_account/executive', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  let user = await User.findOne({ _id: id, tokens: token, role: "manager" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const email = sanitize(req.body.email);
  const name = sanitize(req.body.name);

  if (email == undefined || name == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (!validator.isEmail(email)) throw createError(400, 'The email is not formatted correctly');

  const emailRegEx = new RegExp(["^", email, "$"].join(""), "i");
  const emailTaken = await User.exists({ email: emailRegEx });
  if (emailTaken) throw createError(400, 'Email is taken');

  let organization = await Organization.findOne({ manager: user._id }, { executives: 1 }).exec();
  if (!organization) throw createError(400, 'Organization not found');

  let executive = new User({
    name: name,
    email: email,
    password: base64url(crypto.randomBytes(64)),
    role: "executive",
    enrollment_token: base64url(crypto.randomBytes(64))
  });

  organization.executives.push(executive._id);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(executive.password, salt);
  executive.password = hash;

  await executive.save();
  await organization.save();

  const data = {
    from: mailgunOrigin,
    to: email,
    subject: 'influ.ai Invitation',
    html: 'Create an account by clicking this link ...' + executive.enrollment_token
  };

  // await mailgunClient.messages().send(data);

  return res.send({ success: true });
}));


/**
* @swagger
*
* /auth/create_account/activate:
*   post:
*     summary: Activate a user account - Manager/Executive
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           enrollment_token:
*             type: string
*           password:
*             type: string
*           password_repeat:
*             type: string
*     responses:
*       '200':
*         description: "{success: true, token: token}"
*/
router.post('/create_account/activate', ash(async (req, res) => {
  const enrollment_token = sanitize(req.body.enrollment_token);
  const password = sanitize(req.body.password);
  const password_repeat = sanitize(req.body.password_repeat);

  if (enrollment_token == "" ||
    enrollment_token == undefined ||
    password == undefined ||
    password_repeat == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (password != password_repeat) {
    throw createError(400, 'Passwords do not match');
  }

  if (password.length < 5) {
    throw createError(400, 'Password should contain 5 or more characters');
  }

  let user = await User.findOne({ enrollment_token: enrollment_token }).exec();
  if (!user) throw createError(400, 'Already registered');

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const token = user._id + '-' + base64url(crypto.randomBytes(64));

  user.enrollment_token = "";
  user.password = hash;
  user.tokens.push(token);

  await user.save();

  return res.send({ success: true, token: token });
}));


/**
* @swagger
*
* /auth/create_account/influencer:
*   post:
*     summary: Registration - Influencers
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           name:
*             type: string
*           email:
*             type: string
*             format: email
*           phone_number:
*             type: string
*           about:
*             type: string
*           topics:
*             type: array
*             items:
*               type: string
*           categories:
*             type: array
*             items:
*               type: string
*           channels:
*             type: array
*             items:
*               type: object
*               properties:
*                 source:
*                   type: string
*                 link:
*                   type: string
*           gender:
*             type: string
*           password:
*             type: string
*           country:
*             type: string
*           city:
*             type: string
*     responses:
*       '200':
*         description: "{success: true, token: token}"
*/
router.post('/create_account/influencer', ash(async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const phone_number = sanitize(req.body.phone_number);
  const about = sanitize(req.body.about);
  const topics = sanitize(req.body.topics);
  const categories = sanitize(req.body.categories);
  const channels = sanitize(req.body.channels);
  const gender = sanitize(req.body.gender);
  const post_price = sanitize(req.body.post_price);
  const story_price = sanitize(req.body.story_price);
  const video_price = sanitize(req.body.video_price);
  const password = sanitize(req.body.password);
  const country = sanitize(req.body.country);
  const city = sanitize(req.body.city);
  if (email == undefined || password == undefined || name == undefined ||
    categories == undefined || channels == undefined || gender == undefined ||
    post_price == undefined || story_price == undefined || video_price == undefined || country == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (password.length < 5) {
    throw createError(400, 'Password should contain 5 or more characters');
  }

  if (!validator.isEmail(email)) {
    throw createError(400, 'The email is not formatted correctly');
  }

  const emailRegEx = new RegExp(["^", email, "$"].join(""), "i");
  const query_email = { is_unregistered: true, email: emailRegEx };
  const existing_user_with_email = await User.exists(query_email);

  const influencer_username = get_influencer_username(channels);
  const query_username = { is_unregistered: true, username: influencer_username };
  const existing_user_with_username = await User.exists(query_username);

  const emailTaken = await User.exists({ email: emailRegEx });

  if (existing_user_with_email) {
    await User.deleteOne({ email: emailRegEx });
  }
  else if (existing_user_with_username) {
    await User.deleteOne({ username: influencer_username });
  }
  else if (emailTaken) {
    throw createError(400, 'Email is taken');
  }

  const user = new User({
    name: name,
    email: email,
    password: password,
    categories: categories,
    channels: channels,
    gender: gender,
    post_price: post_price,
    story_price: story_price,
    video_price: video_price,
    country: country,
    lang: countriesMainLanguageJson[country],
    role: "influencer"
  });

  if (phone_number != undefined) {
    user.phone_number = phone_number;
  }

  if (about != undefined) {
    user.about = about;
  }

  if (topics != undefined) {
    user.topics = topics;
  }

  if (city != undefined) {
    user.city = city;
  }

  const token = user._id + '-' + base64url(crypto.randomBytes(64));
  user.tokens.push(token);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(user.password, salt);

  user.password = hash;
  await user.save();

  return res.send({ success: true, token: token });
}));

function get_influencer_username(channels) {
  for (let channel of channels) {
    if (channel.link.includes("instagram")) {
      return channel.link.split("instagram.com/")[1].replace("/", "").split('?')[0];
    }
  }
}

/**
* @swagger
*
* /auth/change_password:
*   post:
*     summary: Change password - Any
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           old_password:
*             type: string
*           new_password:
*             type: string
*           new_password_repeat:
*             type: string
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/change_password', ash(async (req, res) => {
  if (!req.headers || !req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  let user = await User.findOne({ _id: id, tokens: token }, { _id: 1, password: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const old_password = sanitize(req.body.old_password);
  const new_password = sanitize(req.body.new_password);
  const new_password_repeat = sanitize(req.body.new_password_repeat);

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) throw createError(400, "Wrong password");

  if (old_password == undefined || new_password == undefined || new_password_repeat == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (new_password != new_password_repeat) {
    throw createError(400, 'Passwords do not match');
  }

  if (new_password.length < 6) {
    throw createError(400, 'Passwords length must be more than 5');
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(new_password, salt);

  user.password = hash;
  await user.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /auth/forgot_password:
*   post:
*     summary: Forgot password - Any
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           email:
*             type: string
*             format: email
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/forgot_password', ash(async (req, res) => {
  const email = sanitize(req.body.email);

  if (email == undefined) {
    throw createError(400, "Missing API request data");
  }

  if (!validator.isEmail(email)) {
    throw createError(400, 'The email is not formatted correctly');
  }

  let user = await User.findOne({ email: email }, { forgot_password_token: 1 }).exec();
  if (!user) throw createError(400, 'User not found');


  user.forgot_password_token = base64url(crypto.randomBytes(64));
  await user.save();

  const influencer = await User.findOne({ email: email }).exec();
  const emailData = { baseURL: req.app.locals.BASE_URL, token: user.forgot_password_token };
  const emailTemplateName = "forgot_password";
  const data = {
    from: mailgunOrigin,
    to: email,
    subject: subjects[emailTemplateName][influencer.lang],
    html: emailRenderer.renderEmail(influencer.lang, emailTemplateName, emailData)
  };

  await mailgunClient.messages().send(data);

  return res.send({ success: true });
}));


/**
* @swagger
*
* /auth/forgot_password/check/{forgot_password_token}:
*   post:
*     summary: Forgot password restore - Any
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: forgot_password_token
*         schema:
*           type: string
*         required: true
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/forgot_password/check/:forgot_password_token', ash(async (req, res) => {
  const forgot_password_token = sanitize(req.params.forgot_password_token);
  let user = await User.exists({ forgot_password_token: forgot_password_token });
  if (!user) {
    return res.send({ success: false });
  } else {
    return res.send({ success: true });
  }
}));


/**
* @swagger
*
* /auth/forgot_password/set/{forgot_password_token}:
*   post:
*     summary: Forgot password restore - Any
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: forgot_password_token
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           password:
*             type: string
*           password_repeat:
*             type: string
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/forgot_password/set/:forgot_password_token', ash(async (req, res) => {
  const forgot_password_token = sanitize(req.params.forgot_password_token);
  const new_password = sanitize(req.body.password);
  const new_password_repeat = sanitize(req.body.password_repeat);

  if (new_password == undefined || new_password_repeat == undefined ||
    forgot_password_token == undefined || forgot_password_token == "") {
    throw createError(400, 'Missing API request data');
  }

  let user = await User.findOne({ forgot_password_token: forgot_password_token }, { password: 1, forgot_password_token: 1 }).exec();
  if (!user) throw createError(400, 'Incorrect token');

  if (new_password != new_password_repeat) {
    throw createError(400, 'Passwords do not match');
  }

  if (new_password.length < 6) {
    throw createError(400, 'Passwords length must be more than 5');
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(new_password, salt);

  user.password = hash;
  user.forgot_password_token = "";
  await user.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /auth/login:
*   post:
*     summary: Login - All
*     tags: [Authentication]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: body
*         name: body
*         type: object
*         properties:
*           email:
*             type: string
*             format: email
*           password:
*             type: string
*     responses:
*       '200':
*         description: "{success: true, token: token}"
*/
router.post('/login', ash(async (req, res) => {
  let email = sanitize(req.body.email);
  const password = sanitize(req.body.password);

  if (email == undefined || password == undefined) {
    throw createError(400, "Missing API request data");
  }

  if (!validator.isEmail(email)) {
    throw createError(400, 'The email is not formatted correctly');
  }

  email = email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')


  const emailRegEx = new RegExp(["^", email, "$"].join(""), "i");

  let user = await User.findOne({ email: emailRegEx }, { _id: 1, tokens: 1, password: 1 }).exec();
  if (!user) throw createError(400, "Wrong email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw createError(400, "Wrong email or password");

  const token = user._id + '-' + base64url(crypto.randomBytes(64));

  if (user.tokens.length > 100) {
    user.tokens.shift();
  }

  user.tokens.push(token);
  await user.save();

  return res.send({ success: true, token: token });
}));


/**
* @swagger
*
* /auth/logout:
*   post:
*     summary: Logout - All
*     tags: [Authentication]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/logout', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  let user = await User.findOne({ _id: id, tokens: token }, { tokens: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  user.tokens.splice(user.tokens.indexOf(token), 1);

  const result = await user.save();
  return res.send({ success: true });
}));


module.exports = router;
