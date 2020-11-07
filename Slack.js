// SlackBot:
//   Setting Page: https://aktsk.slack.com/apps/A0F81R8ET-slackbot?next_id=0
//   Url: https://aktsk.slack.com/services/hooks/slackbot?token=XXXX
var SlackBot = function(token) {
  this.token = token;
  
  this.sendToChannel = function(message, channel) { // NOTE: #channel or channel (private channel)
    return this.internalSend(message, encodeURI(channel));
  }
  
  this.sendToUser = function(message, user) { // NOTE: @user
    return this.internalSend(message, encodeURI(user));
  }
  
  this.internalSend = function(message, target) {
    var options = {
      "method": "post",
      "payload": message
    };

    var url = this.getUrl(target);
    var fetch = UrlFetchApp.fetch(url, options);
    return fetch.getResponseCode();
  }
  
  this.getUrl = function (channel) {
    return "https://aktsk.slack.com/services/hooks/slackbot?token=" + this.token + "&channel=" + channel;
  }
}

// Incoming WebHooks:
//   Setting Page: https://aktsk.slack.com/apps/A0F7XDUAZ-incoming-webhooks?next_id=0
//   Url: https://hooks.slack.com/services/TXXX/BXXX/XXXX
//   Message Attachment: https://api.slack.com/docs/message-attachments
var IncomingWebHook = function(serviceId, botId, token, userName, icon) {
  this.serviceId = serviceId;
  this.botId = botId;
  this.token = token;
  this.userName = userName;
  this.icon = icon;
  
  this.send = function(param) {
    var payload = this.parsePayload(param);
    var options = {
      "method": "post",
      "payload": JSON.stringify(payload)
    };

    var url = this.getUrl();
    var fetch = UrlFetchApp.fetch(url, options);
    return fetch.getResponseCode();
  };
  
  this.parsePayload = function(param) {
    var payload = new SlackPayload();
    if (param === null) {
      return payload;
    }
    
    if (this.userName) {
      payload.username = this.userName;
    }
    
    if (this.icon) {
      if (this.icon.indexOf("http") == 0) {
        payload.icon_url = this.icon;
      } else {
        payload.icon_emoji = this.icon;
      }
    }
    
    if (param.text) {
      payload.text = param.text;
    }
    
    if (param.detail && param.detail.length > 0) {
      payload.text += "\n<" + param.detail + "|Click here> for details!";
    }
    
    //if (param.mentions && param.mentions.length > 0) {
    //  payload.text += this.parseMention(param.mentions);
    //}
    
    payload.channel = param.channel;
    
    if (param.attachments && param.attachments.length > 0) {
      payload.attachments = param.attachments;
    }
    
    return payload;
  };
  
  //this.parseMention = function(mentions) {
  //  var result = "";
  //  for (var index in mentions) {
  //    var mention = mentions[index];
  //    if (mention === null || typeof mention !== 'string') {
  //      continue;
  //    }
  //    
  //    var mention = mentions[index].trim().toLowerCase();
  //    if (mention.length > 0 && allMentions[mention]) {
  //      result += allMentions[mention]; 
  //    }
  //  }
  //
  //  return result;
  //}
  
  this.getUrl = function() {
    return "https://hooks.slack.com/services/" + this.serviceId + "/" + this.botId + "/" + this.token;
  }
}

// Bot:
//   Setting Page: https://aktsk.slack.com/apps/A0F7YS25R-bots?next_id=0
//   Document: https://api.slack.com/bot-users
//   API Token: xoxb-0000-0000-XXXX

// Not Supported.

///////////////////////////////////////////////////////////////////////////////////////////////////////

var SlackField = function() {
  this.title = "";
  this.value = "";
  this.short = false;
}

var SlackConfirm = function() {
  this.title = "";
  this.text = "";
  this.ok_text = "Yes";
  this.dismiss_text = "No";
}

var SlackAction = function() {
  this.name = "";
  this.text = "";
  this.style = "default";
  this.type = "button";
  this.value = "";
  this.confirm = null;
}

var SlackAttachment = function() {
  this.title = "";
  this.color = "";
  this.callback_id = "";
  this.fields = [];
  this.actions = [];
}

var SlackPayload = function() {
  this.text = "";
  this.channel = "";
  this.attachments = [];
}

var SlackParam = function() {
  this.text = "";
  this.detail = "";
  //this.mentions = [];
  this.channel = "";
  this.attachments = [];
}