import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import api from './api';
import middlewares from './utils/middlewares';
const app = express();
const port = process.env.PORT || 9000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(middlewares);
app.use('/api', api);
app.use(express.static(path.resolve(__dirname, '../', 'public')));
app.listen(port);

console.log(`Listening on port ${port}`);
