//const { S3Client } = require("@aws-sdk/client-s3");
//require("dotenv").config();

//const s3 = new S3Client({
//  region: process.env.AWS_REGION,
//  credentials: {
//    accessKeyId: process.env.AWS_ACCESS_KEY,
//    secretAccessKey: process.env.AWS_SECRET_KEY,
//  },
//});

//module.exports = s3;
const { S3Client } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const https = require("https");

require("dotenv").config();

const agent = new https.Agent({
  maxSockets: 350, //  increase from default 50
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: agent,
  }),
});

module.exports = s3;
