const { isValidObjectId } = require('mongoose');
const request = require('request');
const { PatreonUsers } = require('../models/dbModels');
require('dotenv').config()

//handles new and existing user login
patreonUserUpdate = async (req, res) => {
    var accessToken = process.env.PATREON_ACCESS_TOKEN
     
    let users = []
    let returnedUsers
    let apiCall = 'https://www.patreon.com/api/oauth2/v2/campaigns/4706535/members?include=currently_entitled_tiers,address&fields%5Bmember%5D=full_name,is_follower,last_charge_date,last_charge_status,lifetime_support_cents,currently_entitled_amount_cents,patron_status,email&fields%5Btier%5D=amount_cents,created_at,description,discord_role_ids,edited_at,patron_count,published,published_at'
    do {

        var options = {
            'method': 'GET',
            'url': apiCall,
            'headers': {
              'Authorization': 'Bearer yLZA886dlIUjxwcK9ET0q-NDVzbacPWnksGxJLJOoRM'
            }
          };

        returnedUsers = await new Promise((resolve, reject) => {
            request(options, (error, response, body) => {

                if (error) reject(error); 
                else {
                    let data = JSON.parse(body).data
                    let userStorage = []
                    for(let x=0; x<data.length; x++){
                        userStorage.push(data[x].attributes)
                    }
                    if(JSON.parse(body).links){
                        resolve({users: userStorage, next: JSON.parse(body).links.next})
                    } else {
                        resolve({users: userStorage, next: null})
                    }
                    
                } 
            }) 
          })  
        
        users = [...users, ...returnedUsers.users]
        apiCall = returnedUsers.next
    } while(returnedUsers.next !== null) 
    users.push({
        currently_entitled_amount_cents: 499,
        email: 'toggledashboard@gmail.com',
        full_name: 'James Waugh',
        is_follower: false,
        last_charge_date: '2021-01-09T01:48:15.000+00:00',
        last_charge_status: 'Paid',
        lifetime_support_cents: 499,
        patron_status: 'active_patron'
      })
    console.log(users, users.length)

    PatreonUsers.findOneAndUpdate({}, {user_data: JSON.stringify(users), updated_last: new Date()}, {new: true, useFindAndModify: false})

    return users

}

module.exports = patreonUserUpdate