"use strict";
const express = require('express');
const router = express.Router();
const base64url = require('base64url');
const crypto = require('crypto');
const sanitize = require('mongo-sanitize');
const ash = require('express-async-handler');
const createError = require('http-errors');
const emailRenderer = require('../../services/email/renderer');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment-timezone');
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/user');
const Organization = require('../../models/organization');
const Campaign = require('../../models/campaign');
const { mailgunClient, mailgunOrigin } = require('../../services/email/config');
const subjects = require('../../services/email/i18n/subjects');
const Mustache = require('mustache');


/**
 * @swagger
 * tags:
 *   name: Organization
 *   description: Organization management
 */

/**
* @swagger
*
* /organization/campaign/all:
*   get:
*     summary: Get all organization campaigns - Manager/Executive
*     tags: [Organization]
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

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  let campaigns = await Campaign.find(
    { _id: { $in: organization.campaigns } },
    { title: 1, start_date: 1, end_date: 1, budget: 1, target: 1, influencers: 1 }
  ).populate('influencers.influencer', "email name profile_picture post_price story_price video_price")
    .populate('influencers.manager', "email name profile_picture")
    .populate('organization').exec();

  return res.send({ success: true, campaigns: campaigns });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}:
*   get:
*     summary: Get a single organization campaign - Manager/Executive
*     tags: [Organization]
*     security:
*       - Bearer: []
*     produces:
*       application/json
*     parameters:
*      - in: path
*        name: campaign_id
*        schema:
*          type: string
*        required: true
*     responses:
*       '200':
*         description: "{ success: true, campaign: campaign }"
*/
router.get('/campaign/:campaign_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1, name: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).populate('influencers.influencer', "email name profile_picture post_price story_price video_price instagram_posts instagram_total_followers instagram_stories")
    .populate('influencers.manager', "email name profile_picture")
    .populate('organization').exec();

  const start = new Date(campaign.start_date).setHours(0, 0, 0, 0);
  const end = new Date(campaign.end_date).setHours(23, 59, 59, 999)

  for (let campaign_influencer of campaign.influencers) {
    if (campaign_influencer.influencer.instagram_posts != undefined) {
      let campaign_hashtags = [];
      for (let hashtag of campaign_influencer.hashtags) {
        if (hashtag[0] == "#") {
          campaign_hashtags.push(hashtag.substring(1))
        } else {
          campaign_hashtags.push(hashtag)
        }
      }

      let campaign_mentions = [];
      for (let mention of campaign_influencer.mentions) {
        if (mention[0] == "@") {
          campaign_mentions.push(mention.substring(1))
        } else {
          campaign_mentions.push(mention)
        }
      }

      let campaign_posts = campaign_influencer.influencer.instagram_posts.filter(post => ('hashtags' in post && post.hashtags.some(item => campaign_hashtags.some(hashtag => hashtag.toLowerCase() == item.toLowerCase()))) || ('mentions' in post && post.mentions.some(item => campaign_mentions.some(mention => mention.toLowerCase() == item.toLowerCase()))));
      let campaign_stories = campaign_influencer.influencer.instagram_stories.filter(story => ('hashtags' in story && story.hashtags.some(item => campaign_hashtags.some(hashtag => hashtag.toLowerCase() == item.toLowerCase()))) || ('mentions' in story && story.mentions.some(item => campaign_mentions.some(mention => mention.toLowerCase() == item.toLowerCase()))));

      campaign_posts = campaign_posts.filter(post => (start <= Date.parse(post.timestamp) && Date.parse(post.timestamp) <= end));
      campaign_stories = campaign_stories.filter(story => (start <= Date.parse(story.timestamp) && Date.parse(story.timestamp) <= end));

      for (let campaign_post of campaign_posts) {
        campaign_post.engagement_rate = (campaign_post.engagement / campaign_influencer.influencer.instagram_total_followers) * 100
      }

      campaign_influencer.posts = campaign_posts;
      campaign_influencer.stories = campaign_stories;

      if (campaign_id == "60f927a9f851dd36668ed4dd" && campaign_influencer.influencer._id == "5f6c9e4661b1bb670a1efeb3") {
        let fake_posts = [
          { "impressions": "70k", "reach": "30k", "engagement": "4.6k", "like_count": "3.5k", "comments_count": "1.1k", "media_url": "https://i.ibb.co/nPCyb8Q/snack1.png", "media_type": "CAROUSEL_ALBUM", "caption": "Протеинови мъфини с боровинки 😍😍", "engagement_rate": 7.8 },
          { "impressions": "55k", "reach": "35k", "engagement": "12.6k", "like_count": "10.5k", "comments_count": "2.1k", "media_url": "https://i.ibb.co/KmCQDnH/snack2.jpg", "media_type": "CAROUSEL_ALBUM", "caption": "Барчета, кексчета, дори не знам как да го нарека 😅", "engagement_rate": 8.8 }
        ]
        campaign_influencer.posts = fake_posts;
      }
    }
  }

  return res.send({ success: true, campaign: campaign });
}));


/**
* @swagger
*
* /organization/campaign/create:
*   post:
*     summary: Create a campaign - Manager/Executive
*     tags: [Organization]
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
*           title:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           target:
*             type: string
*           budget:
*             type: integer
*           start_date:
*             type: string
*             format: date
*           end_date:
*             type: string
*             format: date
*     responses:
*       '200':
*         description: "{success: true, campaign_id: string}"
*/
router.post('/campaign/create', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { _id: 1, campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const title = sanitize(req.body.title);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const target = sanitize(req.body.target);
  const budget = sanitize(req.body.budget);
  const start_date = sanitize(req.body.start_date);
  const end_date = sanitize(req.body.end_date);

  if (title == undefined || hashtags == undefined ||
    target == undefined || start_date == undefined ||
    end_date == undefined || mentions == undefined) {
    throw createError(400, 'Missing API request data');
  }

  const campaign = new Campaign({
    title: title,
    hashtags: hashtags,
    mentions: mentions,
    target: target,
    budget: budget,
    influencers: [],
    start_date: start_date,
    end_date: end_date,
    organization: organization._id
  });

  await campaign.save();

  organization.campaigns.push(campaign._id);

  await organization.save();

  return res.send({ success: true, campaign_id: campaign._id });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/update:
*   post:
*     summary: Update a campaign - Manager/Executive
*     tags: [Organization]
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
*       - in: body
*         name: body
*         type: object
*         properties:
*           title:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           target:
*             type: string
*           budget:
*             type: integer
*           start_date:
*             type: string
*             format: date
*           end_date:
*             type: string
*             format: date
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/update', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  const title = sanitize(req.body.title);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const target = sanitize(req.body.target);
  const budget = sanitize(req.body.budget);
  const start_date = sanitize(req.body.start_date);
  const end_date = sanitize(req.body.end_date);

  if (title != undefined) campaign.title = title;
  if (hashtags != undefined) campaign.hashtags = hashtags;
  if (mentions != undefined) campaign.mentions = mentions;
  if (target != undefined) campaign.target = target;
  if (budget != undefined) campaign.budget = budget;
  if (start_date != undefined) campaign.start_date = start_date;
  if (end_date != undefined) campaign.end_date = end_date;

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/delete:
*   post:
*     summary: Delete a campaign - Manager/Executive
*     tags: [Organization]
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
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/delete', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  await Campaign.deleteOne({ _id: campaign_id }).exec();
  organization.campaigns = organization.campaigns.filter(campaign => !campaign._id.equals(campaign_id));

  await organization.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/brief/create:
*   post:
*     summary: Create a default biref for the campaign - Manager/Executive
*     tags: [Organization]
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
*       - in: body
*         name: body
*         type: object
*         properties:
*           requirements:
*             type: string
*           vision:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           special_notes:
*             type: string
*           n_posts:
*             type: integer
*           n_stories:
*             type: integer
*           n_videos:
*             type: integer
*           budget:
*             type: integer
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/brief/create', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  const requirements = sanitize(req.body.requirements);
  const vision = sanitize(req.body.vision);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const budget = sanitize(req.body.budget);

  if (requirements == undefined || vision == undefined ||
    hashtags == undefined || mentions == undefined ||
    budget == undefined) {
    throw createError(400, 'Missing API request data');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }, { _id: 1 }).exec();

  let special_notes = sanitize(req.body.special_notes);
  let n_posts = sanitize(req.body.n_posts);
  let n_stories = sanitize(req.body.n_stories);
  let n_videos = sanitize(req.body.n_videos);

  if (special_notes == undefined) special_notes = "";
  if (n_posts == undefined) n_posts = 0;
  if (n_stories == undefined) n_stories = 0;
  if (n_videos == undefined) n_videos = 0;

  const default_brief = {
    n_posts: n_posts,
    n_stories: n_stories,
    n_videos: n_videos,
    requirements: requirements,
    vision: vision,
    hashtags: hashtags,
    mentions: mentions,
    budget: budget,
    special_notes: special_notes
  };

  campaign.default_brief = default_brief;

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/add_influencer/existing/{influencer_id}:
*   post:
*     summary: Add existing influencers to campaign - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           name:
*             type: string
*           email:
*             type: string
*             format: email
*           requirements:
*             type: string
*           vision:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           special_notes:
*             type: string
*           n_posts:
*             type: integer
*           n_stories:
*             type: integer
*           n_videos:
*             type: integer
*           budget:
*             type: integer
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/add_influencer/existing/:influencer_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { name: 1, campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaign not found');
  }

  const influencer_id = sanitize(req.params.influencer_id);

  const influencer = await User.findOne({ _id: influencer_id }).exec();
  if (!influencer) throw createError(400, 'Influencer not found');

  let campaign = await Campaign.findOne({ _id: campaign_id }, { influencers: 1, title: 1 }).exec();

  let campaign_influencer_emails = campaign.influencers.map(influencer => influencer.email);

  if (campaign_influencer_emails.includes(influencer.email)) {
    throw createError(400, 'Influencer already added to campaign');
  }

  const requirements = sanitize(req.body.requirements);
  const vision = sanitize(req.body.vision);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const budget = sanitize(req.body.budget);

  if (requirements == undefined || vision == undefined ||
    hashtags == undefined || mentions == undefined ||
    budget == undefined) {
    throw createError(400, 'Missing API request data');
  }

  let special_notes = sanitize(req.body.special_notes);
  let n_posts = sanitize(req.body.n_posts);
  let n_stories = sanitize(req.body.n_stories);
  let n_videos = sanitize(req.body.n_videos);

  if (special_notes == undefined) special_notes = "";
  if (n_posts == undefined) n_posts = 0;
  if (n_stories == undefined) n_stories = 0;
  if (n_videos == undefined) n_videos = 0;

  const itoken = base64url(crypto.randomBytes(30));

  let invitation = {
    name: influencer.name,
    email: influencer.email,
    manager: user._id,
    influencer: influencer._id,
    invitation_token: itoken,
    n_posts: n_posts,
    n_stories: n_stories,
    n_videos: n_videos,
    budget: budget,
    requirements: requirements,
    vision: vision,
    hashtags: hashtags,
    mentions: mentions,
    special_notes: special_notes,
    status: "waiting",
    creatives: []
  };

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.post_file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', '../uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.post_file;
    await file.mv(uploadPath);

    invitation.contract_organization = filename;
  }

  campaign.influencers.push(invitation);
  const emailTemplateName = "invite_influencer";
  const emailData = { baseURL: req.app.locals.BASE_URL, organizationName: organization.name, campaignId: campaign._id, campaignTitle: campaign.title, token: itoken };
  const emailHtml = emailRenderer.renderEmail(influencer.lang, emailTemplateName, emailData);
  const subject = Mustache.render(subjects[emailTemplateName][influencer.lang], { campaign: campaign.title, name: invitation.name });
  const data = {
    from: mailgunOrigin,
    to: [influencer.email],
    subject: subject,
    html: emailHtml
  };

  await mailgunClient.messages().send(data);

  await campaign.save();

  return res.send({ success: true });
}));



/**
* @swagger
*
* /organization/campaign/{campaign_id}/add_influencer/new:
*   post:
*     summary: Add new influencers to campaign - Manager/Executive
*     tags: [Organization]
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
*       - in: body
*         name: body
*         type: object
*         properties:
*           name:
*             type: string
*           email:
*             type: string
*             format: email
*           requirements:
*             type: string
*           vision:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           special_notes:
*             type: string
*           n_posts:
*             type: integer
*           n_stories:
*             type: integer
*           n_videos:
*             type: integer
*           budget:
*             type: integer
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/add_influencer/new', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1, name: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }, { influencers: 1, title: 1 }).exec();
  let campaign_influencer_emails = campaign.influencers.map(influencer => influencer.email);

  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const requirements = sanitize(req.body.requirements);
  const vision = sanitize(req.body.vision);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const budget = sanitize(req.body.budget);

  if (name == undefined || email == undefined || requirements == undefined ||
    vision == undefined || hashtags == undefined || mentions == undefined ||
    budget == undefined) {
    throw createError(400, 'Missing API request data');
  }

  if (campaign_influencer_emails.includes(email)) {
    throw createError(400, 'Influencer already added to campaign');
  }

  let special_notes = sanitize(req.body.special_notes);
  let n_posts = sanitize(req.body.n_posts);
  let n_stories = sanitize(req.body.n_stories);
  let n_videos = sanitize(req.body.n_videos);

  if (special_notes == undefined) special_notes = "";
  if (n_posts == undefined) n_posts = 0;
  if (n_stories == undefined) n_stories = 0;
  if (n_videos == undefined) n_videos = 0;

  const itoken = base64url(crypto.randomBytes(30));

  let invitation = {
    name: name,
    email: email,
    manager: user._id,
    invitation_token: itoken,
    n_posts: n_posts,
    n_stories: n_stories,
    n_videos: n_videos,
    budget: budget,
    requirements: requirements,
    vision: vision,
    hashtags: hashtags,
    mentions: mentions,
    special_notes: special_notes,
    status: "waiting",
    lang: "en",
    creatives: []
  };

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.post_file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', '../uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.post_file;
    await file.mv(uploadPath);

    invitation.contract_organization = filename;
  }

  campaign.influencers.push(invitation);

  const emailTemplateName = "invite_influencer";
  const emailData = { baseURL: req.app.locals.BASE_URL, organizationName: organization.name, campaignId: campaign._id, campaignTitle: campaign.title, token: itoken };
  const emailHtml = emailRenderer.renderEmail(invitation.lang, emailTemplateName, emailData);
  const subject = Mustache.render(subjects[emailTemplateName][invitation.lang], { campaign: campaign.title, name: invitation.name });
  const data = {
    from: mailgunOrigin,
    to: [invitation.email],
    subject: subject,
    html: emailHtml
  };

  await mailgunClient.messages().send(data);

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/brief/update:
*   post:
*     summary: Update a default biref for the campaign - Manager/Executive
*     tags: [Organization]
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
*       - in: body
*         name: body
*         type: object
*         properties:
*           requirements:
*             type: string
*           vision:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           special_notes:
*             type: string
*           n_posts:
*             type: integer
*           n_stories:
*             type: integer
*           n_videos:
*             type: integer
*           budget:
*             type: integer
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/brief/update', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  const requirements = sanitize(req.body.requirements);
  const vision = sanitize(req.body.vision);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const budget = sanitize(req.body.budget);
  const special_notes = sanitize(req.body.special_notes);
  const n_posts = sanitize(req.body.n_posts);
  const n_stories = sanitize(req.body.n_stories);
  const n_videos = sanitize(req.body.n_videos);

  if (requirements != undefined) campaign.requirements = requirements;
  if (hashtags != undefined) campaign.hashtags = hashtags;
  if (mentions != undefined) campaign.mentions = mentions;
  if (budget != undefined) campaign.budget = budget;
  if (special_notes != undefined) campaign.special_notes = special_notes;
  if (n_posts != undefined) campaign.n_posts = n_posts;
  if (n_stories != undefined) campaign.n_stories = n_stories;
  if (n_videos != undefined) campaign.n_videos = n_videos;

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/influencer/{influencer_id}/update:
*   post:
*     summary: Update a breif of a campaing influencer - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
*         schema:
*           type: string
*         required: true
*       - in: body
*         name: body
*         type: object
*         properties:
*           requirements:
*             type: string
*           vision:
*             type: string
*           hashtags:
*             type: array
*             items:
*               type: string
*           mentions:
*             type: array
*             items:
*               type: string
*           status:
*             type: string
*           special_notes:
*             type: string
*           n_posts:
*             type: integer
*           n_stories:
*             type: integer
*           n_videos:
*             type: integer
*           budget:
*             type: integer
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/influencer/:influencer_id/update', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const influencer_id = ObjectId(sanitize(req.params.influencer_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }, { influencers: 1 }).exec();
  let influencer = campaign.influencers.find(e => e._id === influencer_id);
  if (!influencer) throw createError(400, 'Influencer not found');

  const special_notes = sanitize(req.body.special_notes);
  const n_posts = sanitize(req.body.n_posts);
  const n_stories = sanitize(req.body.n_stories);
  const n_videos = sanitize(req.body.n_videos);
  const requirements = sanitize(req.body.requirements);
  const hashtags = sanitize(req.body.hashtags);
  const mentions = sanitize(req.body.mentions);
  const status = sanitize(req.body.status);
  const budget = sanitize(req.body.budget);

  if (special_notes != undefined) influencer.special_notes = special_notes;
  if (n_posts != undefined) influencer.n_posts = n_posts;
  if (n_stories != undefined) influencer.n_stories = n_stories;
  if (n_videos != undefined) influencer.n_videos = n_videos;
  if (requirements != undefined) influencer.requirements = requirements;
  if (hashtags != undefined) influencer.hashtags = hashtags;
  if (mentions != undefined) influencer.mentions = mentions;
  if (status != undefined) influencer.status = status;
  if (budget != undefined) influencer.budget = budget;

  if (req.files) {
    const name = base64url(crypto.randomBytes(64));
    const filename = name + '.' + req.files.post_file.name.split('.').pop();
    const foldername = path.join(__dirname, '../..', 'uploads/' + campaign._id + "/");
    fs.ensureDirSync(foldername);
    const uploadPath = foldername + filename;
    let file = req.files.post_file;
    await file.mv(uploadPath);

    influencer.contract_organization = filename;
  }

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/influencer/{influencer_id}/comment:
*   post:
*     summary: Comment on influencer brief - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
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
router.post('/campaign/:campaign_id/influencer/:influencer_id/comment', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const influencer_id = ObjectId(sanitize(req.params.influencer_id));
  const body = sanitize(req.body.body);

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  if (body == undefined) {
    throw createError(400, 'Missing API request data');
  }

  let influencer = campaign.influencers.find(e => e._id.toString() === influencer_id.toString());
  if (!influencer) throw createError(400, 'Influencer not found');

  const comment = {
    body: body,
    sender: "manager",
    date: moment.parseZone(moment().tz("Europe/Sofia").format("YYYY-MM-DD HH:mm"))
  };

  influencer.comments.unshift(comment);
  const emailTemplateName = "new_message_influencer";
  const emailData = { baseURL: req.app.locals.BASE_URL, message: comment.body, campaignId: campaign._id, campaignTitle: campaign.title, influencerId: influencer_id };
  const emailHtml = emailRenderer.renderEmail(influencer.lang, emailTemplateName, emailData);
  const subject = Mustache.render(subjects[emailTemplateName][influencer.lang], { campaign: campaign.title });
  const data = {
    from: mailgunOrigin,
    to: [influencer.email],
    subject: subject,
    html: emailHtml
  };

  await mailgunClient.messages().send(data);

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/influencer/{influencer_id}/attachment:
*   post:
*     summary: Add an attachment comment to a brief - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
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
router.post('/campaign/:campaign_id/influencer/:influencer_id/comment/attachment', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const influencer_id = ObjectId(sanitize(req.params.influencer_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  let influencer = campaign.influencers.find(e => e._id.toString() === influencer_id.toString());
  if (!influencer) throw createError(400, 'Influencer not found');

  const comment = {
    sender: "manager",
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

  if (message_text) {
    const emailTemplateName = "new_message_influencer";
    const emailData = { baseURL: req.app.locals.BASE_URL, message: message_text, campaignId: campaign._id, campaignTitle: campaign.title, influencerId: influencer._id };
    const emailHtml = emailRenderer.renderEmail(influencer.lang, emailTemplateName, emailData);
    const subject = Mustache.render(subjects[emailTemplateName][influencer.lang], { campaign: campaign.title });
    const data = {
      from: mailgunOrigin,
      to: [influencer.email],
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
* /organization/campaign/{campaign_id}/influencer/{influencer_id}/creative/{creative_id}:
*   get:
*     summary: Get creative data - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
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
*         description: "{ success: true, creative: creative }"
*/
router.get('/campaign/:campaign_id/influencer/:influencer_id/creative/:creative_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const influencer_id = ObjectId(sanitize(req.params.influencer_id));
  const creative_id = ObjectId(sanitize(req.params.creative_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  let influencer = campaign.influencers.find(e => e._id.toString() === influencer_id.toString());
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = influencer.creatives.find(e => e._id.toString() == creative_id.toString());
  if (!creative) throw createError(400, 'Creative not found');

  return res.send({ success: true, creative: creative });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/influencer/{influencer_id}/creative/{creative_id}/comment:
*   post:
*     summary: Comment on creative - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
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
*         description: "{ success: true, campaign: campaign }"
*/
router.post('/campaign/:campaign_id/influencer/:influencer_id/creative/:creative_id/comment', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const influencer_id = ObjectId(sanitize(req.params.influencer_id));
  const creative_id = ObjectId(sanitize(req.params.creative_id));
  const body = sanitize(req.body.body);

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  if (body == undefined) {
    throw createError(400, 'Missing API request data');
  }

  let influencer = campaign.influencers.find(e => e._id.toString() === influencer_id.toString());
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = influencer.creatives.find(e => e._id.toString() == creative_id.toString());
  if (!creative) throw createError(400, 'Creative not found');

  const comment = {
    body: body,
    sender: "manager",
    date: moment.parseZone(moment().tz("Europe/Sofia").format("YYYY-MM-DD HH:mm"))
  };

  creative.comments.unshift(comment);

  await campaign.save();

  return res.send({ success: true });
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/influencer/{influencer_id}/creative/{creative_id}/change_status:
*   post:
*     summary: Comment on creative - Manager/Executive
*     tags: [Organization]
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
*         name: influencer_id
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
*           status:
*             type: string
*             enum: [waiting, accepted]
*     responses:
*       '200':
*         description: "{ success: true, campaign: campaign }"
*/
router.post('/campaign/:campaign_id/influencer/:influencer_id/creative/:creative_id/change_status', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { campaigns: 1 }).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));
  const influencer_id = ObjectId(sanitize(req.params.influencer_id));
  const creative_id = ObjectId(sanitize(req.params.creative_id));
  const status = sanitize(req.body.status);

  if (!campaign_id || !organization.campaigns.includes(campaign_id)) {
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.findOne({ _id: campaign_id }).exec();

  if (status == undefined) {
    throw createError(400, 'Missing API request data');
  }

  let influencer = campaign.influencers.find(e => e._id.toString() === influencer_id.toString());
  if (!influencer) throw createError(400, 'Influencer not found');

  let creative = influencer.creatives.find(e => e._id.toString() == creative_id.toString());
  if (!creative) throw createError(400, 'Creative not found');

  creative.status = status;


  await campaign.save();

  return res.send({ success: true });
}));


module.exports = router;
