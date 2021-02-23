const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { authRoutes } = require('./routes/authRoutes');
const { apiRoutes } = require('./routes/apiRoutes');
const twitchBot = require('./twitchBot/twitchBot')
// const { patreonRoutes } = require('./routes/patreonRoutes');
// const fleamarketbot = require('./apps/fleamarketbot/fleamarketbot');
// const fleamarketbotSetup = require('./apps/fleamarketbot/fleamarketbotSetup');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json()
const eventSubHandler = require('./eventSub/eventSub')
const { channelPointsManagerRoutes } = require('./routes/appsAPI/channelPointsManagerRoutes');
const { twitchBotRestart } = require('./twitchBot/twitchUtility')
require('dotenv').config()

// eventSubHandler('30978675', 'delete', null) //for testing purposes
// eventSubHandler('30978675', 'create', 'channel.channel_points_custom_reward_redemption.add') //for testing purposes 
// eventSubHandler(null, 'get', null)

twitchBotRestart()

//server setup
const app = express();

//cors setup 
app.use(cors({ origin: '*' }));
app.use(function(req, res, next) {
	// Request methods you wish to allow
	res.header('Access-Control-Allow-Methods', 'GET, POST');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware 
	next();
});

//connect to mongodb 
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }, (res) => {
	console.log('connected to mongodb');
});

//authorization route
app.use('/auth', authRoutes);
// app.use('/patreon', patreonRoutes)
app.use('/api', apiRoutes)
app.use('/channelPointsManager', channelPointsManagerRoutes)

const server = app.listen(process.env.PORT, process.env.LOCAL_HOST, ()=> {
	console.log('listening on port ' + process.env.PORT)
});