"use strict";
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const createError = require('http-errors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();
app.use(cors());
app.use(fileUpload());

let db = require('./config/keys').mongoprod;

app.locals.BASE_URL = "https://app.influ.ai";
app.locals.FB_CLIENT_ID = "241881377023810";
app.locals.FB_CLIENT_SECRET = "3cd26fce3a6a481d16496bb3196d4a65";

if (process.env.NODE_ENV === 'dev') {
  db = require('./config/keys').mongodev;
  app.locals.BASE_URL = "http://localhost:3000";
  app.locals.FB_CLIENT_ID = "198396868272066";
  app.locals.FB_CLIENT_SECRET = "a1cf4141ebbd33cd779e516348d8db52";

  const swaggerOptions = {
    swaggerDefinition: {
      info: {
        title: "Internal API",
        version: "1.0.0",
        description: "Internal API documentation",
        servers: [{ url: "http://localhost:8080" }]
      },
      basePath: '/api',
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
    apis: ["./routes/api/*.js"],
  };

  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}


mongoose.connect(db, { useUnifiedTopology: true, useNewUrlParser: true, poolSize: 20 })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));
mongoose.set('useCreateIndex', true);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(helmet());
app.enable("trust proxy");

async function start() {
  const port = "8080";

  // ROUTES
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/profile_images', express.static(path.join(__dirname, '../profile_images')));
  app.use('/campaigns', express.static(path.join(__dirname, '../campaigns')));
  app.use('/api/auth', require('./routes/api/auth'));
  app.use('/api/users', require('./routes/api/user'));
  app.use('/api/organization', require('./routes/api/organization'));
  app.use('/api/influencer', require('./routes/api/influencer'));
  app.use('/api/admin', require('./routes/api/admin'));

  // ERROR HANDLERS
  app.use((req, res, next) => {
    next(createError(404));
  });

  app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.send({ success: false, msg: error.message });
  });

  // Listen the server
  app.listen(port);
  console.log('Server listening on port ' + port);
}

start();
