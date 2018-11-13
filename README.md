# artifact-store-s3: Storage for artifacts like videos, logs and screenshots to AWS S3


This project allows [Zalenium](https://zalando.github.io/zalenium) to store test artifacts eg: screenshots, videos to a S3 bucket. Most of the code is based on [adrichem artifact-store](https://github.com/adrichem/artifact-store) that allows the same but for Azure Blob Storage.

 https://github.com/adrichem/artifact-store

Post a multipart file upload to the / endpoint and the 'artifact-store' does the following:

1. Saves each file on [AWS S3](https://aws.amazon.com/pt/s3/).
2. Generates metadata for each file (url, originalname, mime-type)
3. If you included a key called 'metadata' in the form, its content is treated as a JSON object and included in the metadata.
4. Stores the metadata on [AWS S3](https://aws.amazon.com/pt/s3/).
5. Sends the metadata to [Elasticsearch](https://www.elastic.co/products/elasticsearch) for indexing.


## Running the artifact store

You first need to have Node.js installed (version 8.9.0 or greater) and run `npm install` to resolve the dependencies.

Running the artifact-store is quite simple, just supply it your AWS access key and specify the asset and metadata buckets that you created in S3.

```
node index.js  --access-key $AWS_ACCESS_KEY_ID \
  --secret-key $AWS_SECRET_ACCESS_KEY \
  --region $AWS_REGION \
  --asset-bucket $AWS_ASSET_BUCKET \
  --metadata-bucket $AWS_ASSET_METADATA_BUCKET
```

Testing sending data to S3 via artifact-store is also quite straightforward, here is a CURL multipart example:

```
curl -X POST \
  http://127.0.0.1:4000 \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Postman-Token: 300521a6-0fc8-4051-bb9a-54ba58ee7b64' \
  -H 'cache-control: no-cache' \
  -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
  -F files=@/file-path/filename.jpg
```

## Bugs

If you have a specific feature request or if you found a bug, please use GitHub [issues](https://github.com/lmmendes/artifact-store-s3/issues). Fork this project and send a pull request with improvements.
