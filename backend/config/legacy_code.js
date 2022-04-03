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

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, {_id: 1}).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({$or: [{manager: user._id}, {executives: user._id}]}, {campaigns: 1}).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)){
    throw createError(400, 'Campaing not found');
  }

  let campaign = await Campaign.exists({_id: campaign_id});
  if (!campaign) throw createError(400, 'Campaing not found');


  organization.campaigns = organization.campaigns.filter(e => e.toString() !== campaign_id.toString());

  await organization.save();
  await Campaign.deleteOne({ _id: campaign_id }).exec();

  return res.send({ success: true});
}));


/**
* @swagger
*
* /organization/campaign/{campaign_id}/add_influencers:
*   post:
*     summary: Add influencers to campaign - Manager/Executive
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
*           influencers:
*             type: array
*             items:
*               type: object
*               properties:
*                 name:
*                   type: string
*                 email:
*                   type: string
*                   format: email
*                 requirements:
*                   type: string
*                 vision:
*                   type: string
*                 hashtags:
*                   type: array
*                   items:
*                     type: string
*                 mentions:
*                   type: array
*                   items:
*                     type: string
*                 status:
*                   type: string
*                 special_notes:
*                   type: string
*                 n_posts:
*                   type: integer
*                 n_stories:
*                   type: integer
*                 budget:
*                   type: integer
*     responses:
*       '200':
*         description: "{success: true}"
*/
router.post('/campaign/:campaign_id/add_influencers', ash(async (req, res) => {
  if (!req.headers && req.headers['authorization']) throw createError(400, 'User not found');
  const token = req.headers['authorization'].split(' ')[1];
  const id = token.slice(0, token.indexOf('-'));

  const user = await User.findOne({ _id: id, tokens: token, role: { $in: ["manager", "executive"] } }, {_id: 1}).exec();
  if (!user) throw createError(401, 'Unauthorized User');

  let organization = await Organization.findOne({$or: [{manager: user._id}, {executives: user._id}]}, {campaigns: 1}).exec();
  if (!organization) throw createError(500, 'Internal server error');

  const campaign_id = ObjectId(sanitize(req.params.campaign_id));

  if (!campaign_id || !organization.campaigns.includes(campaign_id)){
    throw createError(400, 'Campaing not found');
  }

  const influencers = sanitize(req.body.influencers);
  if (!influencers) throw createError(400, 'Missing API request data');

  let campaign = await Campaign.findOne({_id: campaign_id}, {influencers: 1, title: 1}).exec();

  let errors = [];

  for (var i=0; i < influencers.length; i++){
    const itoken = base64url(crypto.randomBytes(30));

    if (influencers[i].requirements == undefined || influencers[i].vision == undefined ||
        influencers[i].hashtags == undefined || influencers[i].mentions == undefined ||
        influencers[i].status == undefined || influencers[i].email == undefined ||
        influencers[i].budget == undefined || influencers[i].name == undefined){
          throw createError(400, 'Missing API request data');
    }

    const influencer_email =  influencers[i].email;

    if (campaign.influencers.find(e => e.email === influencer_email)){
      errors.push("User with email " + influencer_email + " already exists");
      continue;
    }

    let special_notes = influencers[i].special_notes;
    let n_posts = influencers[i].n_posts;
    let n_stories = influencers[i].n_stories;

    if (special_notes == undefined) special_notes = "";
    if (n_posts == undefined) special_notes = 0;
    if (n_stories == undefined) special_notes = 0;

    let influencer = {
      name: influencers[i].name,
      email: influencers[i].email,
      invitation_token: itoken,
      n_posts: n_posts,
      n_stories: n_stories,
      budget: influencers[i].budget,
      requirements: influencers[i].requirements,
      vision: influencers[i].vision,
      hashtags: influencers[i].special_notes,
      mentions: influencers[i].mentions,
      special_notes: special_notes,
      status: influencers[i].status,
      creatives: [],
      files: []
    };


    // if (req.files) {
    //   const filenames = Object.keys(req.files);
    //   if (filenames.length > 0) {
    //     for (i=0; i < filenames.length; i++){
    //       const name = base64url(crypto.randomBytes(64));
    //       const filename = name + '.' + req.files[filenames[i]].name.split('.').pop();
    //       const uploadPath = path.join(__dirname, '../../..', 'uploads/'+ filename);
    //       let file = req.files[filenames[i]];
    //       await file.mv(uploadPath);
    //       influencer.files.push({title: filenames[i].name, filename: filename});
    //     }
    //   }
    // }

    campaign.influencers.push(influencer);

    const data = {
      from: mailgunOrigin,
      to: influencers[i].email,
      subject: 'influ.ai - '+ campaign.title +' Invitation',
      html: 'You are invited to '+ campaign.title + ' ... ' + itoken
    };

    // await mg.messages().send(data);
  }

  await campaign.save();

  if (errors){
    return res.send({ success: true, errors: errors });
  } else {
    return res.send({ success: true });
  }
}));
