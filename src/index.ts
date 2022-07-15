import fs from 'fs';
import fsE from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

// Arabic=ara
const ocr_language = 'ara';
const api_key = '482d73543c3626d5d5a190ef29d90695';

const startJob = async (fileName: string) => {
  const config = {
    method: 'post',
    url: 'https://api2.online-convert.com/jobs',
    headers: {
      'x-oc-api-key': api_key,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({
      conversion: [
        {
          target: 'txt',
          options: {
            ocr: true,
            language: ocr_language,
          },
        },
      ],
    }),
  };
  const resp = await axios(config);
  converter(resp.data, fileName);
};

const converter = async (jsonR: any, fileName: string) => {
  const filePath = path.resolve(__dirname, `../files/input/${fileName}.pdf`);
  const data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  const url = `${jsonR.server}/upload-file/${jsonR.id}`;
  console.log(url);
  const config = {
    method: 'post',
    url: url,
    headers: {
      'x-oc-api-key': api_key,
      ...data.getHeaders(),
    },
    data: data,
  };
  console.log('Uploading...');
  await axios(config);
  console.log('Uploaded!');
  let stat = true;
  const timer = (ms: number | undefined) =>
    new Promise((res) => setTimeout(res, ms));
  while (stat) {
    console.log('processing...');
    stat = await isDone(jsonR.id, fileName);
    if (stat) await timer(15000);
  }
  console.log('File converted!');
};

const isDone = async (id: string, fileName: string) => {
  const config = {
    method: 'get',
    url: `https://api2.online-convert.com/jobs/${id}`,
    headers: {
      'x-oc-api-key': api_key,
    },
  };

  const resp = await axios(config);
  const done =
    resp.data.status.info !== 'The file has been successfully converted.';

  if (!done) downloadFile(resp.data.output[0].uri, fileName);

  return done;
};

const downloadFile = async (uri: string, fileName: string) => {
  const imgPath = path.resolve(__dirname, `../files/output/${fileName}.txt`);
  const config = {
    method: 'get',
    url: uri,
  };
  const resp = await axios(config);
  const body = await resp.data;
  const from = path.resolve(__dirname, `../files/input/${fileName}.pdf`);
  const to = path.resolve(__dirname, `../done/${fileName}.pdf`);

  fs.writeFileSync(imgPath, body);
  fsE.move(from, to, function (err) {
    if (err) return console.error(err);
  });
};

const testFolder = path.resolve(__dirname, `../files/input/`);

fs.readdirSync(testFolder).forEach((file) => {
  startJob(file.slice(0, -4));
});
