'use strict';

const aws = require('aws-sdk');
const express = require('express');
const multer = require('multer');
const MulterS3 = require('multer-s3');
const request = require('request');
const yargs = require('yargs');

const args = yargs
    .usage('Usage: $0 --access-key [aws-access-key] --secret-key [aws-secret-key] --region [aws-region] --asset-bucket [bucket-name] --metadata-bucket [bucket-name] --port [number] --indexer [elastic-search-url]')
    .example('$0 --access-key AWS_ACCESS_KEY_ID --secret-key AWS_SECRET_ACCESS_KEY --region eu-west-1 --asset-bucket my-aws-asset-bucket --metadata-bucket my-aws-metatada-bucket')
    .demandOption(['access-key', 'secret-key', 'region', 'asset-bucket', 'metadata-bucket'])
    .default('asset-bucket-acl', 'private')
    .default('metadata-bucket-acl', 'private')
    .default('port', 4000)
    .default('host', '127.0.0.1')
    .describe('access-key', 'AWS Access Key')
    .describe('secret-key', 'AWS Secret Key')
    .describe('region', 'AWS Region')
    .describe('asset-bucket', 'Bucket for the images and videos')
    .describe('metadata-bucket', 'Bucket for the images and videos metadata')
    .argv;

args.artifactHost =  `http://${args.host}:${args.port}`;

if (undefined === args.metadataUrl) {
    args.metadataUrl = `${args.artifactHost}/metadata`;
}

const s3 =  new aws.S3({
    options: {
        accessKeyId: args.accessKey,
        secretAccessKey: args.secretKey,
        region: args.region
    }
});

const artifactBlobStorage = multer({
    storage: new MulterS3({
        s3,
        bucket: args.assetBucket,
        acl: args.assetBucketAcl
    })
});

const metadataBlobStorage = multer({
    storage: new MulterS3({
        s3,
        bucket: args.metadataBucket
    })
});

const app = express();

app.post('/metadata', metadataBlobStorage.single('metadata'), (req, res) => {
    //Multer already stored this metadata file in blobstorage
    res.status(200).send('');

    //Download and send metadata to indexer
    if (undefined !== args.indexer) {
        const indexer = {
            url: args.indexer,
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        };

        const source = {
            url: req.file.url,
            method: 'GET',
        };
        request(source).pipe(request(indexer)).on('response', (resIndexer) => {
            if (resIndexer.statusCode >= 300) {
                console.log(resIndexer.statusCode);
            }
        });
    }
});

app.post('/', artifactBlobStorage.any(), (req, res) => {
    // Multer has stored the artifact files on blob storage, lets handle the metadata of each blob
    const DefaultErrorText = '';
    console.log(req.files);
    if (undefined === req.files) {
        res.status(400).send(DefaultErrorText);
        return;
    }

    let userMetaData;
    if (undefined !== req.body.metadata) {
        try {
            userMetaData = JSON.parse(req.body.metadata);
        } catch (error) {
            res.status(400).send(DefaultErrorText);
            return;
        }
    }

    res.status(200).send('');

    //Save meta data for each file
    for (let i = 0; i < req.files.length; i++) {
        const SingleBlobMetadata = {
            url: req.files[i].url,
            originalname: req.files[i].originalname,
            mimetype: req.files[i].mimetype,
            metadata: userMetaData,
        };

        //Send meta data of this blob to be stored somewhere
        const metadataRequest = request.post(args.metadataUrl, (err) => { if (err) console.log(`Error sending metadata!${  err}`); });
        const form = metadataRequest.form();
        form.append('metadata', JSON.stringify(SingleBlobMetadata), {
            filename: 'metadata.json',
            contentType: 'application/json'
        });

    }
    console.log(userMetaData);
});

app.listen(args.port, () => {
    //console.log(args);
    console.log(`Listening for files on ${args.artifactHost}`);
    console.log(`Listening for metadata on ${args.metadataUrl}`);
});
