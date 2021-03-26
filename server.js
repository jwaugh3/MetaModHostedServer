const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { authRoutes } = require('./routes/authRoutes');
const { connectRoutes } = require('./routes/connectRoutes')
const { apiRoutes } = require('./routes/apiRoutes');
const { channelPointsManagerRoutes } = require('./routes/appsAPI/channelPointsManagerRoutes');
const { twitchBotRestart, customTwitchBotRestart } = require('./twitchBot/twitchBot')
require('dotenv').config()

twitchBotRestart()
customTwitchBotRestart()

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
app.use('/connect', connectRoutes)
app.use('/api', apiRoutes)
app.use('/channelPointsManager', channelPointsManagerRoutes)

const server = app.listen(process.env.PORT, process.env.LOCAL_HOST, ()=> {
	console.log('listening on port ' + process.env.PORT)
});