"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  title: String,
  hashtags: [String],
  mentions: [String],
  target: {
    type: String,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
  },
  default_brief: {
    n_posts: Number,
    n_stories: Number,
    n_videos: Number,
    requirements: String,
    vision: String,
    hashtags: [String],
    mentions: [String],
    budget: {
      type: Number,
      default: 0,
    },
    special_notes: String,
  },
  influencers: [
    {
      manager: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      influencer: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      email: String,
      invitation_token: String,
      n_posts: Number,
      n_stories: Number,
      n_videos: Number,
      requirements: String,
      vision: String,
      hashtags: [String],
      mentions: [String],
      posts: [Object],
      stories: [Object],
      budget: {
        type: Number,
        default: 0,
      },
      contract_organization: String,
      contract_influencer: String,
      special_notes: String,
      status: {
        type: String,
        enum: ["waiting", "negotiating", "declined", "accepted"],
      },
      comments: [
        {
          sender: {
            type: String,
            enum: ["manager", "influencer"],
          },
          attachments: [
            {
              name: String,
              url: String,
              mimetype: String,
            },
          ],
          body: String,
          date: Date,
        },
      ],
      creatives: [
        {
          post_date: Date,
          post_text: String,
          notes: String,
          caption_tags: [String],
          hashtags: [String],
          mentions: [String],
          post_file: String,
          post_link: String,
          status: {
            type: String,
            default: "waiting",
            enum: ["waiting", "accepted"],
          },
          post_type: {
            type: String,
            enum: ["text", "image", "story", "video"],
          },
          comments: [
            {
              sender: {
                type: String,
                enum: ["manager", "influencer"],
              },
              body: String,
              date: Date,
            },
          ],
        },
      ],
    },
  ],
  budget: Number,
  start_date: Date,
  end_date: Date,
});

CampaignSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    const retJson = {
      _id: ret._id,
      title: ret.title,
      hashtags: ret.hashtags,
      mentions: ret.mentions,
      target: ret.target,
      default_brief: ret.default_brief,
      influencers: ret.influencers,
      budget: ret.budget,
      start_date: ret.start_date,
      end_date: ret.end_date,
      organization: ret.organization,
      posts: ret.posts,
      stories: ret.stories,
    };

    return retJson;
  },
});

const Campaign = mongoose.model("Campaign", CampaignSchema);

module.exports = Campaign;
