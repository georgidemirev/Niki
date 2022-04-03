"use strict";
const express = require('express');
const router = express.Router();
const ash = require('express-async-handler');
const sanitize = require('mongo-sanitize');
const emailRenderer = require('../../services/email/renderer');
const createError = require('http-errors');
const User = require('../../models/user');
const { mailgunClient, mailgunOrigin } = require('../../services/email/config');
const subjects = require('../../services/email/i18n/subjects');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */


/**
 * @swagger
 *
 * /admin/expiry_reminder:
 *   post:
 *     summary: Get user data
 *     tags: [User]
 *     security:                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 *       - Bearer: []
 *     produces:
 *       application/json
 *     responses:
 *       '200':
 *         description: "{ success: true, user: user }"
 */
router.post('/expiry_reminder', ash(async (req, res) => {
  const code = sanitize(req.body.code);
  const email = sanitize(req.body.email);
  const name = sanitize(req.body.name);
  const expiry_date = sanitize(req.body.expiry_date);

  if (code != "paI5Udsu1w1W^!BDbILNep@VVlrr!t") throw createError(400, 'Unauthorized');

  const influencer = await Users.findOne({ email: email }).exec();
  const emailTemplateName = "expiry_reminder";
  const emailData = { baseURL: req.app.locals.BASE_URL, name: name, expiry_date: expiry_date };
  const emailHtml = emailRenderer.renderEmail(influencer.lang, emailTemplateName, emailData);
  const data = {
    from: mailgunOrigin,
    to: [email],
    subject: subjects[emailTemplateName][influencer.lang],
    html: emailHtml
  };
  await mailgunClient.messages().send(data);

  return res.send({ success: true });
}));


/**
 * @swagger
 *
 * /admin/influencers/new:
 *   post:
 *     summary: Get influencer data by new
 *     tags: [Admin]
 *     security:
 *       - Bearer: []
 *     produces:
 *       application/json
 *     responses:
 *       '200':
 *         description: "{ success: true, user: user }"
 */
router.post('/influencers/new', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.exists({ _id: id, tokens: token, admin: { $gte: 1 } });
  if (!user) throw createError(401, 'Unauthorized User');

  let query = { role: "influencer" }

  const influencers = await User.find(query,
    {
      name: 1, role: 1, profile_picture: 1,
      instagram_total_followers: 1, instagram_engagement_rate: 1
    }
  ).sort({ _id: -1 }).exec();

  return res.send({ success: true, influencers: influencers });
}));

/**
 * @swagger
 *
 * /admin/influencers/unapproved:
 *   get:
 *     summary: Get all influencers who are not approved by admin 
 *     tags: [Admin]
 *     security:
 *       - Bearer: []
 *     produces:
 *       application/json
 *     responses:
 *       '200':
 *         description: "{ success: true, influencers: influencers }"
 */
router.get('/influencers/unapproved', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));
  console.log(token, id);
  const user = await User.exists({ _id: id, tokens: token, admin: { $gte: 1 } });
  console.log(user);
  if (!user) throw createError(401, 'Unauthorized User');
  let query = { is_approved: false, role: "influencer" };
  const unapproved_influencers = await User.find(query, {
    name: 1, channels: 1, profile_picture: 1, instagram_total_followers: 1, about: 1, role: 1
  }).exec();
  return res.send({ success: true, unapproved_influencers: unapproved_influencers });

}));


/**
* @swagger
*
* /admin/approve_influencer/{influencer_id}:
*   post:
*     summary: Approve influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*       - in: path
*         influencer_id: influencer_id
*         schema:
*           type: string
*     responses:
*       '200':
*         description: "{ success: true}"
*/
router.post('/approve_influencer/:influencer_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.exists({ _id: id, tokens: token, admin: { $gte: 1 } });
  if (!user) throw createError(401, 'Unauthorized User');
  const influencer_id = sanitize(req.params.influencer_id);
  let query = { _id: influencer_id, role: "influencer" };
  const influencer = await User.findOne(query, {
    _id: 1, is_approved: 1
  }).exec();
  influencer.is_approved = true;
  await influencer.save();
  return res.send({ success: true });

}));


/**
* @swagger
*
* /admin/deny_influencer/{influencer_id}:
*   post:
*     summary: Deny influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: influencer_id
*         schema:
*           type: string
*     responses:
*       '200':
*         description: "{ success: true }"
*/
router.post('/deny_influencer/:influencer_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.exists({ _id: id, tokens: token, admin: { $gte: 1 } });
  if (!user) throw createError(401, 'Unauthorized User');
  const influencer_id = sanitize(req.params.influencer_id);
  let query = { _id: influencer_id, role: "influencer" };
  await User.updateOne(query, { $unset: { is_approved: 1 } }).exec();
  return res.send({ success: true });

}));


module.exports = router;
