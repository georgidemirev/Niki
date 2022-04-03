"use strict";
const express = require('express');
const router = express.Router();
const sanitize = require('mongo-sanitize');
const ash = require('express-async-handler');
const createError = require('http-errors');
const base64url = require('base64url');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const emailRenderer = require('../../services/email/renderer');
const moment = require('moment-timezone');
const graph = require('fbgraph');
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/user');
const Campaign = require('../../models/campaign');
const spawn = require("child_process").spawn;
const { mailgunClient, mailgunOrigin } = require('../../services/email/config');
const subjects = require('../../services/email/i18n/subjects');
const Mustache = require('mustache');

/**
 * @swagger
 * tags:
 *   name: Influencer
 *   description: Influencer management
 */


/**
* @swagger
*
* /influencer/all:
*   get:
*     summary: Get all influencers data
*     tags: [Influencer]
*     consumes:
*       application/json
*     produces:
*       application/json
*/
router.get('/all', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.exists({ _id: id, tokens: token });
  if (!user) throw createError(401, 'Unauthorized User');

  const influencers = await User.find({ role: "influencer", is_approved: true }, { email: 0, fbgraph_token: 0 }).exec();

  return res.send({ success: true, influencers: influencers });
}));


/**
 * @swagger
 *
 * /influencer/all:
 *   post:
 *     summary: Get all influencers data
 *     tags: [Influencer]
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: body
 *         name: body
 *         type: object
 *         properties:
 *           sort_by:
 *             type: string
 *             enum: [followers, eng_rate, new]
 *           category:
 *             type: string
 *           chаnnel:
 *             type: string
 *           keyword:
 *             type: string
 *           connected:
 *             type: string
 *             enum: [connected, unconnected, all]
 *           gender:
 *             type: string
 *             enum: [male, female]
 *           age:
 *             type: string,
 *             enum: [13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+]
 *           country:
 *             type: string
 *           city:
 *             type: string
 *     consumes:
 *       application/json
 *     produces:
 *       application/json
 *     responses:
 *       '200':
 *         description: "{success: true, influencers: influencers}"
 */
router.post('/all', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));
  const user = await User.findOne({ _id: id, tokens: token }, { admin: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const sort_by = sanitize(req.body.sort_by);
  const country = sanitize(req.body.country);
  const city = sanitize(req.body.city);
  let sort_condition = {};
  switch (sort_by) {
    case "followers":
      sort_condition = { "instagram_total_followers": -1 };
      break;
    case "eng_rate":
      sort_condition = { "instagram_engagement_rate": -1 };
      break;
    case "new":
      sort_condition = { _id: -1 };
      break;
    default:
      sort_condition = { "instagram_total_followers": -1 };
      break;
  }
  let query = { role: "influencer", is_approved: true }

  const category = sanitize(req.body.category);
  if (category) {
    query.categories = category;
  }

  if (country) {
    query.country = country;
  }

  if (city) {
    query.city = city;
  }

  const channel = sanitize(req.body.channel);
  if (channel) {
    query["channels.source"] = channel;
  }

  const keyword = sanitize(req.body.keyword);
  if (keyword) {
    query['$text'] = { $search: "\"" + keyword + "\"" }
  }

  const connected = sanitize(req.body.connected);
  switch (connected) {
    case "connected":
      query.fbgraph_token = { $exists: true };
      break;
    case "unconnected":
      query.fbgraph_token = { $exists: false };
      break;
    default:
      break;
  }

  const unapproved = sanitize(req.body.unapproved);
  if (unapproved) {
    query.is_approved = false;
  }

  const gender = sanitize(req.body.gender);
  if (gender) {
    query.instagram_followers_top = gender;
  }

  const age = sanitize(req.body.age);
  if (age) {
    query.instagram_age_top = age;
  }

  let filter = {
    name: 1, role: 1, profile_picture: 1,
    instagram_total_followers: 1, instagram_engagement_rate: 1, is_approved: 1
  }

  if (user.admin >= 1) {
    filter.email = 1;
    filter.phone_number = 1;
  }
  const influencers = await User.aggregate([{ $match: query }, { $project: filter }, { $sort: sort_condition }]);
  return res.send({ success: true, influencers: influencers });
}));


/**
* @swagger
*
* /influencer/youtube/generate_url:
*   post:
*     summary: Youtube integration
*     tags: [Influencer]
*     consumes:
*       application/json
*     produces:
*       application/json
*/
router.post('/youtube/generate_url', ash(async (req, res) => {
  // if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  // const token = req.headers['authorization'].split(' ')[1];
  // const id = token.slice(0, token.indexOf('-'));

  // const user = await User.exists({ _id: id, tokens: token });
  // if (!user) throw createError(401, 'Unauthorized User');

  const clientSecret = 'XeD_zzcTZXer1H6Gd2XP26ti';
  const clientId = '420521072271-3bsll1lun24p3pm91l8clvvs3g3epd0i.apps.googleusercontent.com';
  const redirectUrl = 'http://localhost:3000';
  const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);



  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.readonly']
  });

  console.log(authUrl)

  return res.send({ success: true, url: authUrl });
}));


/**
* @swagger
*
* /influencer/instagram/generate_url:
*   post:
*     summary: Instagram integration
*     tags: [Influencer]
*     consumes:
*       application/json
*     produces:
*       application/json
*/
router.post('/instagram/generate_url', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const campaign_id = sanitize(req.body.campaign_id);
  const invitation_token = sanitize(req.body.invitation_token);

  let oauth_params = {
    "client_id": req.app.locals.FB_CLIENT_ID,
    "redirect_uri": req.app.locals.BASE_URL + '/influencer/instagram_integration',
    "scope": 'pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights'
  }

  if (campaign_id && invitation_token) {
    oauth_params['state'] = campaign_id + "," + invitation_token;
  }

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  var authUrl = graph.getOauthUrl(oauth_params);

  return res.send({ success: true, url: authUrl });
}));


/**
* @swagger
*
* /influencer/instagram/store_token:
*   post:
*     summary: Instagram integration
*     tags: [Influencer]
*     consumes:
*       application/json
*     produces:
*       application/json
*/
router.post('/instagram/store_token', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let fb_code = sanitize(req.body.code);
  if (fb_code == undefined) throw createError(400, 'Missing API request data');

  let oauth_params = {
    "client_id": req.app.locals.FB_CLIENT_ID,
    "redirect_uri": req.app.locals.BASE_URL + '/influencer/instagram_integration',
    "client_secret": req.app.locals.FB_CLIENT_SECRET,
    "code": fb_code
  };

  graph.authorize(oauth_params, function (err, facebookRes) {
    if (err) {
      return res.send({ success: false, msg: err });
    } else {
      const access_token = facebookRes.access_token;

      graph.get("https://graph.facebook.com/v7.0/me/accounts?access_token=" + access_token, function (err, result) {
        if (result.data.length == 1) {
          const page_id = result.data[0].id;
          graph.get("https://graph.facebook.com/v7.0/" + page_id + "?fields=instagram_business_account&access_token=" + access_token, function (err, result) {
            if (result == undefined || result.instagram_business_account == undefined) {
              return res.send({ success: false });
            }

            const ig_id = result.instagram_business_account.id;
            user.instagram_id = ig_id;
            user.fbgraph_token = access_token;
            user.save(function (err) {
              const pullInstagramData = spawn('python3', [__dirname + "/../../scripts/instagram_data.py", user._id, process.env.NODE_ENV]);

              // for debuging:
              // pullInstagramData.stderr.on('data', (data) => {
              //   console.error(data.toString());
              // });

              pullInstagramData.stdout.on('end', function (data) {
                return res.send({ success: true });
              })
            });
          });
        } else if (result.data.length == 0) {
          return res.send({ success: false });
        } else {
          let pages = [];

          for (const page of result.data) {
            pages.push({ name: page.name, id: page.id });
          }

          return res.send({ success: false, pages: pages });
        }
      });
    }
  });
}));


/**
* @swagger
*
* /influencer/instagram/page_choice/{page_id}:
*   post:
*     summary: Instagram integration
*     tags: [Influencer]
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: page_id
*         schema:
*           type: string
*         required: true
*/
router.post('/instagram/page_choice/:page_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1, fbgraph_token: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const page_id = sanitize(req.params.page_id);

  graph.get("https://graph.facebook.com/v7.0/" + page_id + "?fields=instagram_business_account&access_token=" + user.fbgraph_token, function (err, result) {
    if (result.instagram_business_account == undefined) {
      return res.send({ success: false });
    }

    const ig_id = result.instagram_business_account.id;
    user.instagram_id = ig_id;
    user.save(function (err) {
      const pullInstagramData = spawn('python3', [__dirname + "/../../scripts/instagram_data.py", user._id, process.env.NODE_ENV]);

      pullInstagramData.stdout.on('end', function (data) {
        return res.send({ success: true });
      })
    });

  });
}));

/**
* @swagger
*
* /influencer/campaign/{campaign_id}/influencer_invitation/{invitation_token}:
*   get:
*     summary: Get influencer invitation data  - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: path
*         name: invitation_token
*         schema:
*           type: string
*         required: true
*     responses:
*       '200':
*         description: "{success: true, campaign: campaign, organization: campaign.organization}"
*/
router.get('/campaign/:campaign_id/influencer_invitation/:invitation_token', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const invitation_token = sanitize(req.params.invitation_token);

  if (invitation_token == "") throw createError(400, 'Wrong invitation token');

  let campaign = await Campaign.findOne({ _id: campaign_id }, { influencers: 1, title: 1, start_date: 1, end_date: 1 }).populate('influencers.manager', "email name profile_picture")
    .populate('influencers.influencer', "email name profile_picture post_price story_price video_price")
    .populate('organization').exec();
  if (!campaign) throw createError(400, 'Campaign does not exist');

  campaign.influencers = campaign.influencers.filter(e => e.invitation_token == invitation_token);
  if (campaign.influencers.length != 1) throw createError(400, 'Wrong invitation token');

  return res.send({ success: true, campaign: campaign });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/influencer_invitation/existing/{invitation_token}:
*   post:
*     summary: Make a decision about joining a campaign (Existing influencer) - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: path
*         name: invitation_token
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           decision:
*             type: string
*             enum: [accept, decline]
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/influencer_invitation/existing/:invitation_token', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const invitation_token = sanitize(req.params.invitation_token);
  const decision = sanitize(req.body.decision);

  // console.log('decision in server is', decision)

  if (decision != "accept" && decision != "decline") throw createError(400, 'Wrong decision option');
  if (invitation_token == "") throw createError(400, 'Wrong invitation token');

  let campaign = await Campaign.findOne({ _id: campaign_id }, { influencers: 1, title: 1 }).exec();

  let influencer = campaign.influencers.find(e => e.invitation_token == invitation_token);
  if (!influencer) throw createError(400, 'Wrong invitation token');

  const manager = await User.findOne({ _id: influencer.manager }, { _id: 1, email: 1 }).exec();

  influencer.invitation_token = "";
  if (decision == "accept") {
    // todo: manager change status
    // influencer.status = "negotiating";
    influencer.status = "accepted";
    const emailTemplateName = "influencer_accepted";
    const emailData = { baseURL: req.app.locals.BASE_URL, campaignTitle: campaign.title, influencerName: influencer.name, campaignId: campaign._id, influencerId: influencer._id };
    const emailHtml = emailRenderer.renderEmail(manager.lang, emailTemplateName, emailData);
    const subject = Mustache.render(subjects[emailTemplateName][manager.lang], { campaign: campaign.name, name: influencer.name });
    const data = {
      from: mailgunOrigin,
      to: [manager.email],
      subject: subject,
      html: emailHtml
    };
    await mailgunClient.messages().send(data);
  } else {
    influencer.status = "declined";
    const emailTemplateName = "influencer_declined";
    const emailData = { baseURL: req.app.locals.BASE_URL, campaignTitle: campaign.title, influencerName: influencer.name, campaignId: campaign._id };
    const emailHtml = emailRenderer.renderEmail(manager.lang, emailTemplateName, emailData);
    const subject = Mustache.render(subjects[emailTemplateName][manager.lang], { campaign: campaign.name, name: influencer.name });
    const data = {
      from: mailgunOrigin,
      to: [manager.email],
      subject: subject,
      html: emailHtml
    };
    await mailgunClient.messages().send(data);
  }

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/influencer_invitation/new/{invitation_token}:
*   post:
*     summary: Make a decision about joining a campaign (New influencer) - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: path
*         name: invitation_token
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           decision:
*             type: string
*             enum: [accept, decline]
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/influencer_invitation/new/:invitation_token', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1, email: 1, name: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const invitation_token = sanitize(req.params.invitation_token);
  const decision = sanitize(req.body.decision);

  if (decision != "accept" && decision != "decline") throw createError(400, 'Wrong decision option');
  if (invitation_token == "") throw createError(400, 'Wrong invitation token');

  let campaign = await Campaign.findOne({ _id: campaign_id }, { influencers: 1 }).exec();

  let influencer = campaign.influencers.find(e => e.invitation_token == invitation_token);
  if (!influencer) throw createError(400, 'Wrong invitation token');

  const manager = await User.findOne({ _id: influencer.manager }, { _id: 1, email: 1 }).exec();

  influencer.invitation_token = "";

  if (decision == "accept") {
    // todo: manager change status
    // influencer.status = "negotiating";
    influencer.status = "accepted";
    const emailTemplateName = "influencer_accepted";
    const emailData = { baseURL: req.app.locals.BASE_URL, campaignTitle: campaign.title, influencerName: influencer.name, campaignId: campaign._id, influencerId: influencer._id };
    const emailHtml = emailRenderer.renderEmail(manager.lang, emailTemplateName, emailData);
    const subject = Mustache.render(subjects[emailTemplateName][manager.lang], { campaign: campaign.name, name: influencer.name });
    const data = {
      from: mailgunOrigin,
      to: [manager.email],
      subject: subject,
      html: emailHtml
    };
    await mailgunClient.messages().send(data);
  } else {
    influencer.status = "declined";
    const emailTemplateName = "influencer_declined";
    const emailData = { baseURL: req.app.locals.BASE_URL, campaignTitle: campaign.title, influencerName: influencer.name, campaignId: campaign._id };
    const emailHtml = emailRenderer.renderEmail(manager.lang, emailTemplateName, emailData);
    const subject = Mustache.render(subjects[emailTemplateName][manager.lang], { campaign: campaign.name, name: influencer.name });

    const data = {
      from: mailgunOrigin,
      to: [manager.email],
      subject: subject,
      html: emailHtml
    };
    await mailgunClient.messages().send(data);
  }

  influencer.email = user.email;
  influencer.name = user.name;
  influencer.influencer = user._id;

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /influencer/single/{influencer_id}:
*   get:
*     summary: Get influencer data - Influencer
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
*         description: "{ success: true, influencer: influencer }"
*/
router.get('/single/:influencer_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token }, { admin: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const influencer_id = sanitize(req.params.influencer_id);

  let filter = {
    topics: 1,
    categories: 1,
    name: 1,
    email: 1,
    about: 1,
    channels: 1,
    city: 1,
    country: 1,
    gender: 1,
    role: 1,
    is_approved: 1,
    instagram_hashtags: 1,
    instagram_mentions: 1,
    instagram_total_followers: 1,
    profile_picture: 1,
    instagram_cities: 1,
    instagram_age: 1,
    instagram_followers_top: 1,
    instagram_followers: 1,
    instagram_age_top: 1,
    instagram_engagement_rate: 1,
    instagram_monthly_engagement: 1,
    instagram_collaborations: { $slice: 10 },
    instagram_hashtags: { $slice: 10 },
    instagram_mentions: { $slice: 10 }
  };

  if (user.admin && user.admin >= 1) {
    filter.post_price = 1;
    filter.story_price = 1;
    filter.video_price = 1;
    filter.phone_number = 1;
  }

  if (["6138e5ee0b5a96733ff7a9b9"].includes(user._id.toString())) {
    filter.post_price = 1;
    filter.story_price = 1;
    filter.video_price = 1;
    filter.phone_number = 1;
  }

  const influencer = await User.findOne({ _id: influencer_id, role: "influencer" }, filter).exec();
  if (!influencer) throw createError(401, 'Unauthorized User');

  if (!user.admin && influencer_id != user._id.toString()) {
    if (!influencer.is_approved) throw createError(400, "User is not approved");
  }

  // Very untidy and inefficient because we store monthly eng as an object (should be fixed in the future and never repeated)
  if (influencer.instagram_monthly_engagement) {
    var instagram_monthly = {};
    Object.keys(influencer.instagram_monthly_engagement).slice(-6).forEach(ele => instagram_monthly[ele] = influencer.instagram_monthly_engagement[ele]);
    influencer.instagram_monthly_engagement = instagram_monthly;
  }

  return res.send({ success: true, influencer: influencer });
}));



/**
* @swagger
*
* /influencer/campaign/all:
*   get:
*     summary: Get all influencer campaigns - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     responses:
*       '200':
*         description: "{ success: true, campaigns: campaigns }"
*/
router.get('/campaign/all', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["influencer"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const user_id = ObjectId(user._id);

  let campaigns = await Campaign.find(
    { "influencers.influencer": user_id },
    { title: 1, start_date: 1, end_date: 1, target: 1, "influencers.$": 1 }
  ).populate('organization').exec();

  campaigns = campaigns.filter(c => c.influencers[0].status == "accepted");

  return res.send({ success: true, campaigns: campaigns });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}:
*   get:
*     summary: Get a single influencer campaign - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*     responses:
*       '200':
*         description: "{ success: true, campaign: campaign }"
*/
router.get('/campaign/:campaign_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["influencer"] } }, { _id: 1, instagram_posts: 1, instagram_total_followers: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const user_id = ObjectId(user._id);
  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  const campaign = await Campaign.findOne(
    { _id: campaign_id, "influencers.influencer": user_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).populate('influencers.influencer', "email influencer name profile_picture post_price story_price video_price")
    .populate('influencers.manager', "email name profile_picture")
    .populate('organization').exec();

  if (!campaign) throw createError(401, 'Unauthorized User');

  campaign.influencers = [campaign.influencers.find(influencerObj => influencerObj.influencer._id == user_id.toString())];

  let campaign_hashtags = [];
  for (let hashtag of campaign.influencers[0].hashtags) {
    if (hashtag[0] == "#") {
      campaign_hashtags.push(hashtag.substring(1))
    } else {
      campaign_hashtags.push(hashtag)
    }
  }

  let campaign_posts = user.instagram_posts.filter(post => post.hashtags.some(item => campaign_hashtags.includes(item)));

  for (let campaign_post of campaign_posts) {
    campaign_post.engagement_rate = (campaign_post.engagement / user.instagram_total_followers) * 100
  }

  campaign.influencers[0].posts = campaign_posts;

  return res.send({ success: true, campaign: campaign });
}));



/**
* @swagger
*
* /influencer/campaign/{campaign_id}/upload_contract:
*   post:
*     summary: Upload contract to a brief - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*     responses:
*       '200':
*         description: "{ success: true, campaign: campaign }"
*/
router.post('/campaign/:campaign_id/upload_contract', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const body = sanitize(req.body.body);

  if (body == undefined) {
    throw createError(400, 'Missing API request data');
  }

  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(e => e.influencer.toString() == user_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.post_file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', 'uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.post_file;
    await file.mv(uploadPath);

    influencer.contract_influencer = filename;
  } else {
    throw createError(400, 'Contract not uploaded');
  }

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/comment/attachment:
*   post:
*     summary: Add an attachment comment to a brief - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     consumes:
*       - multipart/form-data
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: formData
*         name: attachment
*         type: file
*     responses:
*       '200':
*         description: "{ success: true, campaign: campaign }"
*/
router.post('/campaign/:campaign_id/comment/attachment', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(e => e.influencer.toString() == user_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  const comment = {
    sender: "influencer",
    date: moment.parseZone(moment().tz("Europe/Sofia").format("YYYY-MM-DD HH:mm"))
  };

  let message_text = "";

  if (req.body.comment) {
    comment.body = sanitize(req.body.comment);
    message_text = comment.body;
  }

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', '../uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.file;
    await file.mv(uploadPath);
    comment.attachments = [
      {
        name: req.files.file.name,
        url: "uploads/" + campaign._id + "/" + filename,
        mimetype: req.files.file.mimetype
      }
    ];
    message_text = "Image attached";
  }

  influencer.comments.unshift(comment);

  const manager = await User.findOne({ _id: influencer.manager }, { _id: 1, email: 1 }).exec();

  if (message_text) {
    const emailTemplateName = "new_message_manager";
    const emailData = { baseURL: req.app.locals.BASE_URL, campaignTitle: campaign.title, influencerName: influencer.name, campaignId: campaign._id, message: message_text };
    const emailHtml = emailRenderer.renderEmail(manager.lang, emailTemplateName, emailData);
    const subject = Mustache.render(subjects[emailTemplateName][manager.lang], emailData, { campaign: campaign.title });
    const data = {
      from: mailgunOrigin,
      to: [manager.email],
      subject: subject,
      html: emailHtml
    };

    await mailgunClient.messages().send(data);
  }

  await campaign.save();

  return res.send({ success: true, comment: comment });
}));



/**
* @swagger
*
* /influencer/campaign/{campaign_id}/comment:
*   post:
*     summary: Add a comment to a brief - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     consumes:
*       - application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           body:
*             type: string
*     responses:
*       '200':
*         description: "{ success: true, campaign: campaign }"
*/
router.post('/campaign/:campaign_id/comment', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const body = sanitize(req.body.body);

  if (body == undefined) {
    throw createError(400, 'Missing API request data');
  }

  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(e => e.influencer.toString() == user_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  const comment = {
    body: body,
    sender: "influencer",
    date: moment.parseZone(moment().tz("Europe/Sofia").format("YYYY-MM-DD HH:mm"))
  };

  influencer.comments.unshift(comment);

  const manager = await User.findOne({ _id: influencer.manager }, { _id: 1, email: 1 }).exec();
  const emailTemplateName = "new_message_manager";
  const emailData = { baseURL: req.app.locals.BASE_URL, campaignTitle: campaign.title, influencerName: influencer.name, campaignId: campaign._id, message: comment.body };
  const emailHtml = emailRenderer.renderEmail(manager.lang, emailTemplateName, emailData);
  const subject = Mustache.render(subjects[emailTemplateName][manager.lang], { campaign: campaign.title });
  const data = {
    from: mailgunOrigin,
    to: [manager.email],
    subject: subject,
    html: emailHtml
  };

  await mailgunClient.messages().send(data);

  await campaign.save();

  return res.send({ success: true, comment: comment });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/add_creative:
*   post:
*     summary: Add a creative - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: formData
*         name: post_file
*         type: file
*       - in: body
*         name: body
*         type: object
*         properties:
*           notes:
*             type: string
*           post_text:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           caption_tags:
*             type: array
*             items:
*               type: string
*           post_type:
*             type: string
*             enum: [text, image, story, video]
*           post_link:
*             type: string
*           post_date:
*             type: string
*             format: date
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/add_creative', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  const notes = sanitize(req.body.notes);
  const post_text = sanitize(req.body.post_text);
  const hashtags = JSON.parse(sanitize(req.body.hashtags));
  const mentions = JSON.parse(sanitize(req.body.mentions));
  const post_type = sanitize(req.body.post_type);
  const post_link = sanitize(req.body.post_link);
  const caption_tags = JSON.parse(sanitize(req.body.caption_tags));
  const post_date = sanitize(req.body.post_date);

  if (hashtags == undefined || notes == undefined || post_date == undefined ||
    post_text == undefined || mentions == undefined || post_type == undefined ||
    caption_tags == undefined) {
    throw createError(400, 'Missing API request data');
  }

  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { _id: 1, title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(influencer => influencer.influencer.toString() == user_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = {
    post_date: post_date,
    post_text: post_text,
    notes: notes,
    caption_tags: caption_tags,
    hashtags: hashtags,
    mentions: mentions,
    post_type: post_type
  };

  if (post_link != undefined) {
    creative.post_link = post_link;
  }

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.post_file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', '../uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.post_file;
    await file.mv(uploadPath);

    creative.post_file = filename;
  }

  influencer.creatives.push(creative);
  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/creative/{creative_id}:
*   get:
*     summary: Get creative data by id - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: path
*         name: creative_id
*         schema:
*           type: string
*         required: true
*     responses:
*       '200':
*         description: "{ success: true, creative: creative}"
*/
router.get('/campaign/:campaign_id/creative/:creative_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const creative_id = ObjectId(sanitize(req.params.creative_id));

  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(e => e.influencer.toString() == user_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = influencer.creatives.find(e => e._id.toString() == creative_id.toString());
  if (!creative) throw createError(400, 'Creative not found');

  return res.send({ success: true, creative: creative });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/creative/{creative_id}/update:
*   post:
*     summary: Update a creative - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: path
*         name: creative_id
*         schema:
*           type: string
*         required: true
*       - in: formData
*         name: post_file
*         type: file
*       - in: body
*         name: body
*         type: object
*         properties:
*           notes:
*             type: string
*           post_text:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           caption_tags:
*             type: array
*             items:
*               type: string
*           post_type:
*             type: string
*             enum: [text, image, story, video]
*           post_link:
*             type: string
*           post_date:
*             type: string
*             format: date
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/creative/:creative_id/update', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const creative_id = ObjectId(sanitize(req.params.creative_id));


  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(e => e.influencer.toString() == user_id.toString());
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = influencer.creatives.find(e => e._id.toString() == creative_id.toString());
  if (!creative) throw createError(400, 'Creative not found');

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.post_file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', '../uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.post_file;
    await file.mv(uploadPath);

    creative.post_file = filename;
  }

  const notes = sanitize(req.body.notes);
  const post_text = sanitize(req.body.post_text);
  const hashtags = JSON.parse(sanitize(req.body.hashtags));
  const mentions = JSON.parse(sanitize(req.body.mentions));
  const post_type = sanitize(req.body.post_type);
  const caption_tags = JSON.parse(sanitize(req.body.caption_tags));
  const post_link = sanitize(req.body.post_link);
  const post_date = sanitize(req.body.post_date);

  if (notes != undefined) creative.notes = notes;
  if (post_text != undefined) creative.post_text = post_text;
  if (hashtags != undefined) creative.hashtags = hashtags;
  if (mentions != undefined) creative.mentions = mentions;
  if (post_type != undefined) creative.post_type = post_type;
  if (post_link != undefined) creative.post_link = post_link;
  if (caption_tags != undefined) creative.caption_tags = caption_tags;
  if (post_date != undefined) creative.post_date = post_date;

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /influencer/campaign/{campaign_id}/creative/{creative_id}/comment:
*   post:
*     summary: Add a comment to a creative - Influencer
*     tags: [Influencer]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: campaign_id
*         schema:
*           type: string
*         required: true
*       - in: path
*         name: creative_id
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           body:
*             type: string
*     responses:
*       '200':
*         description: "{ success: true }"
*/
router.post('/campaign/:campaign_id/creative/:creative_id/comment', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: "influencer" }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const creative_id = ObjectId(sanitize(req.params.creative_id));
  const body = sanitize(req.body.body);

  if (body == undefined) {
    throw createError(400, 'Missing API request data');
  }

  const user_id = ObjectId(user._id);

  let campaign = await Campaign.findOne(
    { _id: campaign_id },
    { title: 1, start_date: 1, end_date: 1, influencers: 1 }
  ).exec();
  if (!campaign) throw createError(400, 'Campaing not found');

  let influencer = campaign.influencers.find(e => e.influencer.toString() == user_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = influencer.creatives.find(e => e._id.toString() == creative_id.toString());
  if (!creative) throw createError(400, 'Creative not found');

  const comment = {
    body: body,
    sender: "influencer",
    date: moment.parseZone(moment().tz("Europe/Sofia").format("YYYY-MM-DD HH:mm"))
  };

  creative.comments.unshift(comment);

  await campaign.save();

  return res.send({ success: true });
}));


module.exports = router;
