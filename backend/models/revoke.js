"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RevokeSchema = new Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  reason: {
    type: String,
  },
  fbgraph_token: {
    type: String,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
});


const Revoke = mongoose.model('Revoke', RevokeSchema);

module.exports = RevokeSchema;
