"use strict";
const express = require('express');
const router = express.Router();
const ash = require('express-async-handler');
const sanitize = require('mongo-sanitize');
const createError = require('http-errors');
const User = require('../../models/user');
const Organization = require('../../models/organization');
const ObjectId = require('mongoose').Types.ObjectId;

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management
 */


/**
 * @swagger
 *
 * /users/me:
 *   get:
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
router.get('/me', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ tokens: token })
    .populate('favorite_influencers', '_id email name profile_picture post_price story_price video_price lang').exec();
  if (!user) throw createError(401, 'Unauthorized User');

  if (user.role == "manager" || user.role == "executive") {
    const organization = await Organization.findOne({ $or: [{ manager: user._id }, { executives: user._id }] }, { name: 1 }).exec();

    return res.send({ success: true, user: user, organization: organization });
  } else {
    return res.send({ success: true, user: user });
  }

}));


/**
* @swagger
*
* /users/update:
*   post:
*     summary: Update user data
*     tags: [User]
*     security:
*       - Bearer: []
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
*           about:
*             type: string
*           topics:
*             type: string
*           categories:
*             type: string
*           country:
*             type: string
*           city:
*             type: string
*     responses:
*       '200':
*         description: "{ success: true, user: user }"
*/
router.post('/update', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ tokens: token }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const about = sanitize(req.body.about);
  const topics = sanitize(req.body.topics);
  const categories = sanitize(req.body.categories);
  const post_price = sanitize(req.body.post_price);
  const story_price = sanitize(req.body.story_price);
  const video_price = sanitize(req.body.video_price);
  const phone_number = sanitize(req.body.phone_number);
  const country = sanitize(req.body.country);
  const city = sanitize(req.body.city);
  const lang = sanitize(req.body.lang);

  if (name != undefined) user.name = name;
  if (email != undefined) user.email = email;
  if (about != undefined) user.about = about;
  if (topics != undefined) user.topics = topics;
  if (categories != undefined) user.categories = categories;
  if (post_price != undefined) user.post_price = post_price;
  if (story_price != undefined) user.story_price = story_price;
  if (video_price != undefined) user.video_price = video_price;
  if (phone_number != undefined) user.phone_number = phone_number;
  if (country != undefined) user.country = country;
  if (city != undefined) user.city = city;
  if (lang != undefined) user.lang = lang;

  await user.save();

  return res.send({ success: true });

}));


/**
* @swagger
*
* /users/favorite/{user_id}:
*   post:
*     summary: Add / Remove favourite user - Manager/Executive
*     tags: [User]
*     security:
*       - Bearer: []
*     consumes:
*       application/json
*     produces:
*       application/json
*     parameters:
*       - in: path
*         name: user_id
*         schema:
*           type: string
*         required: true
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/favorite/:user_id', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, { _id: 1, favorite_influencers: 1 }).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  const user_id = ObjectId(sanitize(req.params.user_id));
  let favorite_user = await User.exists({ _id: user_id });
  if (!favorite_user) throw createError(500, 'Favorite user does not exist');

  if (user.favorite_influencers.includes(user_id)) {
    user.favorite_influencers = user.favorite_influencers.filter(favorite => !favorite.equals(user_id));
  } else {
    user.favorite_influencers.push(ObjectId(user_id));
  }

  await user.save();

  const return_user = await User.findOne({ _id: user._id })
    .populate('favorite_influencers', '_id email name profile_picture post_price story_price video_price').exec();

  return res.send({ success: true, user: return_user });
}));


module.exports = router;