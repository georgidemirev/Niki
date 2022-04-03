"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  country: {
    type: String
  },
  lang: {
    type: String,
  },
  city: {
    type: String
  },
  phone_number: {
    type: String
  },
  fbgraph_token: {
    type: String
  },
  fbgraph_token_expiry: String,
  fbgraph_expiry_reminder_sent: {
    type: Boolean,
    default: false
  },
  profile_picture: String,
  instagram_id: {
    type: String,
    default: ""
  },
  post_price: Number,
  story_price: Number,
  video_price: Number,
  admin: {
    type: Number,
    default: 0
  },
  instagram_cities: Object,
  instagram_age: Object,
  instagram_age_top: String,
  instagram_followers: Object,
  instagram_followers_top: String,
  instagram_hashtags: [{
    name: String,
    count: Number
  }],
  instagram_posts: [Object],
  instagram_stories: [Object],
  instagram_collaborations: [Object],
  instagram_mentions: [{
    name: String,
    count: Number
  }],
  instagram_engagement_rate: Number,
  instagram_total_followers: Number,
  instagram_data_collected: Date,
  instagram_monthly_engagement: Object,
  isntagram_posts_per_day: Object,
  role: {
    type: String,
    enum: ['admin', 'influencer', 'manager', 'executive'],
    required: true
  },
  enrollment_token: {
    type: String,
  },
  forgot_password_token: {
    type: String,
  },
  favorite_influencers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tokens: [String],
  about: String,
  topics: [String],
  categories: [
    {
      type: String,
      enum: [
        "Fashion & Beauty",
        "Health & Fitness",
        "Food & Drinks",
        "Lifestyle",
        "Family",
        "Interior Design",
        "Entertainment",
        "Inspiration",
        "Travel",
        "Technology",
        "Animals",
        "DIY & Craft",
        "Photography",
        "Art",
        "Design",
        "Outdoors",
        "Hobbies & Interests",
        "Sports",
        "Gaming",
        "Esports",
        "Comedy",
        "Films, Music, Books",
        "Business & Entrepreneurship"
      ]
    }
  ],
  channels: [
    {
      _id: false,
      source: {
        type: String,
        enum: ["instagram", "youtube", "tiktok", "facebook", "linkedin", "blog"]
      },
      link: String
    }
  ],
  location: String,
  gender: {
    type: String,
    enum: ["male", "female", "other"]
  },
  is_approved: {
    type: Boolean,
    default: false
  }
});

UserSchema.index({ _id: -1, tokens: -1 });
UserSchema.index({ email: -1 });
UserSchema.index({ instagram_total_followers: -1 });
UserSchema.index({ instagram_engagement_rate: -1 });
UserSchema.index({ topics: "text", categories: "text", about: "text", "instagram_hashtags.name": "text", "instagram_mentions.name": "text" });

UserSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    const retJson = {
      _id: ret._id,
      email: ret.email,
      name: ret.name,
      role: ret.role,
      profile_picture: ret.profile_picture,
      fbgraph_token: ret.fbgraph_token,
      post_price: ret.post_price,
      story_price: ret.story_price,
      video_price: ret.video_price,
      phone_number: ret.phone_number,
      favorite_influencers: ret.favorite_influencers,
      lang: ret.lang
    };

    if (ret.admin) {
      retJson.admin = ret.admin;
    }

    if (ret.role == "influencer") {
      retJson.about = ret.about;
      retJson.topics = ret.topics;
      retJson.categories = ret.categories;
      retJson.channels = ret.channels;
      retJson.location = ret.location;
      retJson.gender = ret.gender;
      retJson.post_price = ret.post_price;
      retJson.story_price = ret.story_price;
      retJson.video_price = ret.video_price;
      retJson.country = ret.country;
      if (ret.instagram_cities != undefined) retJson.instagram_cities = ret.instagram_cities;
      if (ret.instagram_followers != undefined) retJson.instagram_followers = ret.instagram_followers;
      if (ret.instagram_mentions != undefined) retJson.instagram_mentions = ret.instagram_mentions;
      if (ret.instagram_collaborations != undefined) retJson.instagram_collaborations = ret.instagram_collaborations;
      if (ret.instagram_hashtags != undefined) retJson.instagram_hashtags = ret.instagram_hashtags;
      if (ret.instagram_age != undefined) retJson.instagram_age = ret.instagram_age;
      if (ret.instagram_total_followers != undefined) retJson.instagram_total_followers = ret.instagram_total_followers;
      if (ret.instagram_engagement_rate != undefined) retJson.instagram_engagement_rate = ret.instagram_engagement_rate;
      if (ret.instagram_monthly_engagement != undefined) retJson.instagram_monthly_engagement = ret.instagram_monthly_engagement;
      if (ret.is_approved != undefined) retJson.is_approved = ret.is_approved;
      if (ret.city != undefined) retJson.city = ret.city;
    }
    if (ret.is_unregistered) {
      retJson.website = ret.website;
      retJson.is_unregistered = ret.is_unregistered;
    }
    return retJson;
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;