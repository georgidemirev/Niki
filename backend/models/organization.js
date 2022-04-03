"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrganizationSchema = new Schema({
  name: {
    type: String,
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  executives: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  campaigns: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Campaign'
    }
  ]
});

OrganizationSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    const retJson = {
      _id: ret._id,
      name: ret.name,
      admin: ret.admin,
      managers: ret.managers
    };

    return retJson;
  }
});

const Organization = mongoose.model('Organization', OrganizationSchema);

module.exports = Organization;
