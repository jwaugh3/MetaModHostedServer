const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const usersSchema = new Schema({
    twitch_ID: String, 
    login_username: String,
    display_name: String,
    broadcaster_type: String,
    profile_image: String,
    email: String,
    refresh_token: String,
    last_sign_in: Date,
    created_on: Date,
    mods: [{}]
})

const Users = mongoose.model('users', usersSchema)

const userSettingsSchema = new Schema({
    twitch_ID: String,
    settings: String
})

const UserSettings = mongoose.model('user_settings', userSettingsSchema)

const ItemsSchema = new Schema({
    id: Number,
    item_name: String,
    command_line: String,
    price: Number,
    price_per_slot: Number,
    trader: String,
    trader_price: Number,
    trader_currency: String
})

const Items = mongoose.model('items', ItemsSchema)

const PatreonUsersSchema = new Schema({
    user_data: String,
    updated_last: Date
})

const PatreonUsers = mongoose.model('patreon_users', PatreonUsersSchema)

const FleamarketbotSettingsSchema = new Schema({
    channel: String,    //channel bot should join
    mode: String,   //all chat, mod only, sub only
    delay: Number,  //time in seconds bot should delay a response
    lastTriggered: Date,    //last time bot sent a message
    targetRequester: Boolean,    //should bot response with @target
    channelConnected: String,    //channel bot will connect to
    lastChanged: Date,      //last time the bot switched channels
    tier: String    //patreon tier
})

const FleamarketbotSettings = mongoose.model('fleamarketbot_settings', FleamarketbotSettingsSchema)

const ChannelPointRewardsSchema = new Schema({
    channel: String,
    custom_rewards: [{
        reward_id: String,
        reward_type: String,
        reward_settings: String,
        redemptions: [String],
        winners: [String],
        timedRedemptions: [{}]
    }]
})

const ChannelPointRewards = mongoose.model('channel_point_rewards', ChannelPointRewardsSchema)

module.exports = {
    Users,
    UserSettings,
    Items,
    PatreonUsers,
    FleamarketbotSettings,
    ChannelPointRewards
}