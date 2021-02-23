var z = 0;

const failedResponse = (client, target, user) => {
    let responseArray = [
        "Hmmmm... I don't know that one.",
        "Yeah... you're gonna have to be more specific.",
        "Beep Boop Beep. Item not found. Please try again.",
      ]

      client.say(target, responseArray[z++%responseArray.length])
}

module.exports = failedResponse