const keys = require('./keys');

const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

const { Pool } = require('pg');

const pgClient = new Pool({
	user: keys.pgUser,
	host: keys.pgHost,
	port: keys.pgPort,
	database: keys.pgDatabase,
	password: keys.pgPassword,
});

pgClient.on('connect', () => {
	pgClient
		.query('CREATE TABLE IF NOT EXISTS values (number INT)')
		.catch((err) => console.log(err));
});

const redis = require('redis');

const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => {
		1000;
	},
});

redisClient.on('error', (err) => {
	console.log(err);
});

const pub = redisClient.duplicate();

app.get('/', (req, res) => {
	res.send('HI');
});

app.get('/values/all', async (req, res) => {
	const values = await pgClient.query('SELECT * FROM values');

	res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
	redisClient.hgetall('values', (err, values) => {
		res.send(values);
	});
});

app.post('/values', async (req, res) => {
	const index = req.body.index;

	if (parseInt(index) > 30) {
		res.status(422).send('Index too high');
	}

	redisClient.hset('values', index, 'Nothing yet!');

	pub.publish('insert', index);

	pgClient.query('INSERT INTO values(NUMBER) VALUES($1)', [index]);

	res.send({ working: true });
});

app.listen(5000, (req, res) => {
	console.log('Listening');
});
