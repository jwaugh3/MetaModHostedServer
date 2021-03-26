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

const TwitchViewersSchema = new Schema({
    twitch_ID: String,
    twitch_username: String,
    discord_ID: String,
    discord_username: String,
    discord_discriminator: String,
    rank: [{}]
})

const TwitchViewers = mongoose.model('twitch_viewers', TwitchViewersSchema)

module.exports = {
    Users,
    UserSettings,
    ChannelPointRewards,
    TwitchViewers
}