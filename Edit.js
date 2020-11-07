function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('🐼 foodpanda')
      .addItem('🍔 建立訂單', 'createOrder')
      .addItem('🗒 檢視訂單', 'summaryOrder')
      .addItem('💳 通知取餐', 'notifyTakeOff')
      .addItem('🎉 通知付款', 'notifyPayment')
      .addToUi();
}

function createOrder() {
  var template = HtmlService.createTemplateFromFile('OrderRequest');
  template.groups = getMemberGroups();
  var text = template.evaluate().getContent();
  var html = HtmlService.createHtmlOutput(text)
      .setWidth(600)
      .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Create Order');
}

function submitOrder(url, group, guest) {
  var vender_id = fetchVender(url);
  if (vender_id == 0) {
    SpreadsheetApp.getUi().alert("Foodpanda response error, please try again!");
    return;
  }
  
  var menu = fetchMenu(vender_id);
  if (menu == null) {
    SpreadsheetApp.getUi().alert("Foodpanda response error, please try again!");
    return;
  }
  
  log(menu[0])
  createSheet(menu, vender_id, group, guest);
}

function log(vender_name) {
  try {
    var email = encodeURI(Session.getActiveUser().getEmail());
    var name = encodeURI(vender_name);
    var url = "https://script.google.com/macros/s/AKfycbyEvDHr8L5V4CmaQlcXUHpMmLLG9uhVC9vfEDeig928fLzhFg8/exec";
    url += "?email=" + email + "&name=" + name;
    var options = {
      muteHttpExceptions: true,
    };
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    // NOTE: Ignore error
  }
}

function getMemberGroups() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(MEMBER_SHEET_NAME);
  var maxColumn = sheet.getLastColumn();
  var values = sheet.getRange(1, 1, 1, maxColumn).getValues()[0];
  return values;
}

function onEdit(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName().startsWith('#')) {
    return;
  }
  
  if (e.range.rowStart != e.range.rowEnd || e.range.columnStart != e.range.columnEnd) {
    return;
  }
  
  if (e.range.columnStart == COLUMN_PRODUCT) {
    var last_row = sheet.getLastRow();
    var members = sheet.getRange(last_row, 2).getValue();
    var max_topping = sheet.getRange(last_row, 3).getValue();
    
    var product = getSelectedCell(sheet, e.range.rowStart, COLUMN_PRODUCT);
    var variants = getVariantsFromProduct(sheet, product);
    if (variants.length > 0) {
      var rule = SpreadsheetApp.newDataValidation().requireValueInList(variants).build();
      var variantion_range = sheet.getRange(e.range.rowStart, COLUMN_VARIATION);
      variantion_range.clearContent();
      variantion_range.setDataValidation(rule);
      
      var topping_range = sheet.getRange(e.range.rowStart, COLUMN_TOPPING, 1, max_topping);
      topping_range.clearDataValidations();
      topping_range.clearContent();
    } else {
      var variantion_range = sheet.getRange(e.range.rowStart, COLUMN_VARIATION);
      variantion_range.clearDataValidations();
      variantion_range.clearContent();
      
      var topping_range = sheet.getRange(e.range.rowStart, COLUMN_TOPPING, 1, max_topping);
      topping_range.clearDataValidations();
      topping_range.clearContent();
      
      var variant = getSelectedCell(sheet, e.range.rowStart, 5);
      var toppings = getToppingsByProductAndVariant(sheet, product, variant);
      for (var topping_index in toppings) {
        var topping_list = toppings[topping_index];
        var rule = SpreadsheetApp.newDataValidation().requireValueInList(topping_list).build();
        var index = COLUMN_TOPPING + parseInt(topping_index);
        sheet.getRange(e.range.rowStart, index).setDataValidation(rule);
      }
    }
  } else if (e.range.columnStart == COLUMN_VARIATION) {
    var last_row = sheet.getLastRow();
    var max_topping = sheet.getRange(last_row, 3).getValue();
    
    sheet.getRange(e.range.rowStart, COLUMN_TOPPING, 1, max_topping).clearDataValidations();
    sheet.getRange(e.range.rowStart, COLUMN_TOPPING, 1, max_topping).clearContent();
    
    var product = getSelectedCell(sheet, e.range.rowStart, COLUMN_PRODUCT);
    var variant = getSelectedCell(sheet, e.range.rowStart, COLUMN_VARIATION);
    
    var toppings = getToppingsByProductAndVariant(sheet, product, variant);
    for (var topping_index in toppings) {
      var topping_list = toppings[topping_index];
      var rule = SpreadsheetApp.newDataValidation().requireValueInList(topping_list).build();
      var index = COLUMN_TOPPING + parseInt(topping_index);
      sheet.getRange(e.range.rowStart, index).setDataValidation(rule);
    }
  }
}

function createTopping(sheet, rangeStart, rangeEnd) {
  var toppings = {};
  var values = sheet.getRange(rangeStart, 3, rangeEnd - rangeStart, 2).getValues();
  for (var index in values) {
    var item = values[index];
    var id = item[0];
    var name = item[1];
    if (id in toppings) {
      toppings[id].push(name);
    } else {
      toppings[id] = [name];
    }
  }
  
  return toppings;
}

function getSelectedCell(sheet, row, column) {
  return sheet.getRange(row, column).getValue();
}

function getVariantsFromProduct(sheet, product) {
  var lastRow = sheet.getLastRow();
  var info_values = sheet.getRange(lastRow, 4, 1, 2).getValues()[0];
  var product_index = info_values[0];
  var product_length = info_values[1] - product_index;
  var products_list = sheet.getRange(product_index, 4, product_length, 5).getValues();
  
  var variations = [];
  for (var product_index in products_list) {
    var product_item = products_list[product_index];
    var product_name = product_item[0];
    var product_variation = product_item[1];
    if (product_variation && product == product_name) {
      variations.push(product_variation);
    }
  }
  
  return variations;
}

function getToppingsByProductAndVariant(sheet, product, variant) {
  var lastRow = sheet.getLastRow();
  var info_values = sheet.getRange(lastRow, 3, 1, 5).getValues()[0];
  var max_topping = info_values[0];
  var product_index = info_values[1];
  var product_length = info_values[2] - product_index;
  var products_list = sheet.getRange(product_index, 4, product_length, 4).getValues();
  
  var topping_index = info_values[3];
  var topping_length = info_values[4] - topping_index;
  var toppings_list = sheet.getRange(topping_index, 3, topping_length, 3).getValues();

  var topping_ids = [];
  for (var product_index in products_list) {
    var product_item = products_list[product_index];
    var product_name = product_item[0];
    var product_variation = product_item[1];
    var product_topping_ids = product_item[3];
    if (product == product_name && variant == product_variation) {
      topping_ids = product_topping_ids.split(", ");
      break;
    }
  }
  
  var topping_results = [];
  for (var topping_id_index in topping_ids) {
    var topping_result = [];
    var topping_id = topping_ids[topping_id_index];
    for (var topping_index in toppings_list) {
      var topping_item = toppings_list[topping_index];
      var topping_item_name = topping_item[0];
      var topping_item_id = topping_item[1];
      if (topping_id == topping_item_id) {
        topping_result.push(topping_item_name);
      }
    }
    
    if (topping_result.length > 0) {
      topping_results.push(topping_result);
    }
  }
  
  return topping_results;
}

function summaryOrder() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var vender_id = sheet.getRange(1, 1).getNote();
  if (vender_id == 0) {
    SpreadsheetApp.getUi().alert("Foodpanda response error, please try again!");
    return;
  }
  
  var restaurant_info = fetchRestaurant(vender_id);
  if (restaurant_info == null) {
    SpreadsheetApp.getUi().alert("Foodpanda response error, please try again!");
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var info_values = sheet.getRange(lastRow, 2, 1, 6).getValues()[0];
  var max_member = info_values[0];
  var max_summary = info_values[2] - max_member - 3;
  var summary = sheet.getRange(max_member + 3, COLUMN_VARIATION, max_summary, 2).getValues();
  var datas = [];
  for (var index in summary) {
    var item = summary[index];
    var item_name = item[1];
    if (item_name == "") {
      continue;
    }
    
    datas.push({
      name: item[1],
      amount: item[0]
    });
  }
  
  var template = HtmlService.createTemplateFromFile('OrderSummary');
  template.info = restaurant_info;
  template.datas = datas;
  var text = template.evaluate().getContent();
  var html = HtmlService.createHtmlOutput(text)
      .setWidth(600)
      .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, '檢視訂單');
}

function notifyTakeOff() {
  var template = HtmlService.createTemplateFromFile('TakeOffForm');
  template.userName = getUserName();
  var text = template.evaluate().getContent();
  var html = HtmlService.createHtmlOutput(text)
      .setWidth(600)
      .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, '通知取餐');
}

function sendArriveMessage(originMessage) {
  var bot = createBot();
  var datas = fetchOrderDatas();
  for (var index in datas) {
    var item = datas[index];
    var message = replaceParameters(originMessage, item);
    sendSlackMessage(bot, message, item.name);
  }
}

function sendArriveAndPayMessage(originMessage, originPayMessage) {
  var bot = createBot();
  var datas = fetchOrderDatas();
  for (var index in datas) {
    var item = datas[index];
    var message = replaceParameters(originMessage, item);
    if (item.paid == 0) {
      message += "\n" + replaceParameters(originPayMessage, item);
    }

    sendSlackMessage(bot, message, item.name);
  }
}

function notifyPayment() {
  var template = HtmlService.createTemplateFromFile('PaymentForm');
  template.userName = getUserName();
  var text = template.evaluate().getContent();
  var html = HtmlService.createHtmlOutput(text)
      .setWidth(600)
      .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, '通知繳費');
}

function sendPayMessage(originMessage) {
  var bot = createBot();
  var datas = fetchOrderDatas();
  for (var index in datas) {
    var item = datas[index];
    var message = replaceParameters(originMessage, item);
    if (item.paid != 0) {
      continue;
    }

    sendSlackMessage(bot, message, item.name);
  }
}

function fetchOrderDatas() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var info_values = sheet.getRange(lastRow, 2, 1, 6).getValues()[0];
  var max_member = info_values[0];
  var max_topping = info_values[1];
  var datas = sheet.getRange(2, 1, max_member, 7 + max_topping).getValues();
  var results = [];
  for (var index in datas) {
    var item = datas[index];
    var name = item[0];
    if (name == "") {
      continue;
    }

    var paid = item[1];
    var price = item[2];
    var summary = item[max_topping + 6];

    results.push({name: name, paid: paid, price: price, summary: summary});
  }

  return results;
}

function createBot() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var serviceId = scriptProperties.getProperty('SlackServiceId');
  var botId = scriptProperties.getProperty('SlackBotId');
  var token = scriptProperties.getProperty('SlackToken');
  
  return new IncomingWebHook(serviceId, botId, token, "Foodpanda", ":foodpanda:");
}

function sendSlackMessage(bot, message, name) {
  var param = new SlackPayload();
  param.text = message;
  param.channel = "@" + name;
  bot.send(param);
}

function replaceParameters(message, item) {
  return message.replace("{{name}}", item.name).replace("{{summary}}", item.summary).replace("{{price}}", item.price);
}

function getUserName() {
  var email = encodeURI(Session.getActiveUser().getEmail());
  return email.replace("@aktsk.com", "");
}

function testEdit() {
  var range = {
    rowStart: 2,
    rowEnd: 2,
    columnStart: 4,
    columnEnd: 4
  };
  var e = {
    range: range
  };
  onEdit(e);
}
