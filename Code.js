var TEMPLATE_SHEET_NAME = "#Template";
var MEMBER_SHEET_NAME = "#Members";
var COLUMN_PRICE = 3;
var COLUMN_PRODUCT = 4;
var COLUMN_VARIATION = 5;
var COLUMN_TOPPING = 6;
var COLUMN_SUMMARY = 8;
var ROW_RECORD = 2;

function getDayString() {
  var today = new Date();
  var year = today.getFullYear();
  var month = today. getMonth() + 1;
  var day = today.getDate();
  
  return year + '-' + (month >= 10 ? month : '0' + month) + '-' + (day >= 10 ? day : '0' + day);
}

function createSheet(menu, vender_id, group, guest) {
  var name = '[' + getDayString() + '] ' + menu[0];
  var products = menu[1];
  var toppings = menu[2];
  var spreadsheet = SpreadsheetApp.getActive();
  var templateSheet = spreadsheet.getSheetByName(TEMPLATE_SHEET_NAME);
  var sheet = spreadsheet.getSheetByName(name);
  if (sheet == null) {
    sheet = spreadsheet.insertSheet(name, {template: templateSheet});
  }
  
  sheet.getRange(1, 1,).setNote(vender_id);

  var members = getMembers(group);
  var total = members.length + parseInt(guest);
  initMembers(sheet, members, total);
  
  var product_index = total * 2 + 6;
  var product_result = initProducts(sheet, products, product_index);
  var product_values = product_result[0];
  var max_topping = product_result[1];
  initProductFormula(sheet, product_index, product_values, total);

  var topping_index = product_index + product_values.length + 1;
  var topping_values = initToppings(sheet, topping_index, toppings, max_topping);
  fixDatas(sheet, product_index, product_values, total, max_topping);
  initPriceFormula(sheet, product_index, product_values, topping_index, topping_values, total, max_topping);
  initSummaryFormula(sheet, total, max_topping);

  var note_index = topping_index + topping_values.length + 1;
  initNote(sheet, product_index, product_values, topping_index, topping_values, note_index, total, max_topping);
  
  sheet.hideRows(total + 4, topping_index + topping_values.length - total - 2);
  sheet.showSheet();
}

function getMembers(group) {
  var spreadsheet = SpreadsheetApp.getActive();
  var sheet = spreadsheet.getSheetByName(MEMBER_SHEET_NAME);
  var lastColumn = sheet.getLastColumn();
  var groups = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var foundColumn = 0;
  for (var index in groups) {
    if (groups[index] == group) {
      foundColumn = parseInt(index) + 1;
      break;
    }
  }
  
  if (foundColumn == 0) {
    // NOTE: Group not found!
    return [];
  }
  
  var members = [];
  var lastRow = sheet.getLastRow();
  var temp_members = sheet.getRange(ROW_RECORD, foundColumn, lastRow - 1, 1).getValues();
  for (var index in temp_members) {
    if (temp_members[index][0] != "") {
      members.push([temp_members[index][0]]);
    }
  }
  
  return members;
}

function initMembers(sheet, members, total) {
  if (total > 0) {
    sheet.insertRowsBefore(ROW_RECORD, total);
    if (members.length > 0) {
      sheet.getRange(ROW_RECORD, 1, members.length, 1).setValues(members);
    }
    
    sheet.insertRowsBefore(4 + total, total);
  }
}

function initSummaryFormula(sheet, total, max_topping) {
  var formula1 = "=SORT(UNIQUE($D$2:$D$" + (total + 2) + "), 1, TRUE)";
  sheet.getRange(total + 4, COLUMN_PRODUCT).setFormula(formula1);
  
  var formula2 = "=IF($D" + (total + 4) + " <> \"\", COUNTIF($D$2:$D$" + (total + 2) + ", $D" + (total + 4) + "),\"\")";
  sheet.getRange(total + 4, COLUMN_PRICE, total + 1, 1).setFormula(formula2);
  
  var end_index = (max_topping > 0) ? max_topping : 1;
  var end_column = String.fromCharCode("F".charCodeAt(0) + end_index + 1);
  var formula3 = "=SORT(UNIQUE(FILTER($" + end_column + "$2:$" + end_column + "$" + (total + 2) + ", $" + end_column + "$2:$" + end_column + "$" + (total + 2) + "<> \"\")), 1, TRUE)";
  sheet.getRange(total + 4, COLUMN_PRODUCT + 2).setFormula(formula3);
  
  var formula4 = "=IF($F" + (total + 4) + " <> \"\", COUNTIF($" + end_column + "$2:$" + end_column + "$" + (total + 2) + ", $F" + (total + 4) + "), \"\")";
  sheet.getRange(total + 4, COLUMN_PRICE + 2, total + 1, 1).setFormula(formula4);
}

function initProducts(sheet, products, product_index) {
  var max_topping = 0;
  var product_values = [];
  products.forEach((product) => {
    product.Variations.forEach((variation) => {
      var name = product.Name;
      if (variation.Price == 0) {
        // NOTE: Ignore 0 price product
        return;
      }
  
      if (variation.Name) {
        name += ' (' + variation.Name + ')';
      }
  
      if (variation.Toppings.length > max_topping) {
        max_topping = variation.Toppings.length;
      }
  
      var product_item = [name, product.Name, variation.Name, variation.Price, variation.Toppings.join(', ').toString()];
      product_values.push(product_item);
    });
  });

  if (product_values.length > 0) {
    sheet.getRange(product_index, 3, product_values.length, product_values[0].length).setValues(product_values);
  }

  return [product_values, max_topping];
}

function initProductFormula(sheet, product_index, product_values, total) {
  var product_range = sheet.getRange(product_index, 4, product_values.length, 1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInRange(product_range).build();
  sheet.getRange(ROW_RECORD, COLUMN_PRODUCT, total + 1).setDataValidation(rule);
}

function initToppings(sheet, topping_index, toppings, max_topping) {
  var topping_values = [];
  toppings.forEach((topping) => {
    topping.Options.forEach((option) => {
      var topping_item = [topping.Id, option.Name, option.Price];
      topping_values.push(topping_item);
    });
  });
  
  if (topping_values.length > 0) {
    sheet.getRange(topping_index, 3, topping_values.length, topping_values[0].length).setValues(topping_values);
  }

  if (max_topping > 1) {
    sheet.insertColumnsAfter(COLUMN_TOPPING, max_topping - 1);
    
    var title = [];
    for (var count = 0; count < max_topping; ++count) {
      title.push("Topping " + (count + 1));
    }
    
    sheet.getRange(1, COLUMN_TOPPING, 1, max_topping).setValues([title]);
  }

  return topping_values;
}

function fixDatas(sheet, product_index, product_values, total, max_topping) {
  if (max_topping > 1) {
    var sourceRange = sheet.getRange(product_index, COLUMN_TOPPING + max_topping, product_values.length, 1);
    var data = sourceRange.getValues();
    var targetRange = sheet.getRange(product_index, COLUMN_TOPPING + 1, product_values.length, 1);
    targetRange.setValues(data);
    sourceRange.clearContent();
  }
  
  var end_index = (max_topping > 0) ? (max_topping - 1) : 0;
  var end_column = String.fromCharCode("F".charCodeAt(0) + end_index);
  var formula = "=JOIN(IF($D2 <> \"\", \" \", \"\"), $D2:$" + end_column + "2)";
  sheet.getRange(ROW_RECORD, COLUMN_SUMMARY + end_index, total + 1, 1).setFormula(formula);
}

function initPriceFormula(sheet, product_index, product_values, topping_index, topping_values, total, max_topping) {
  var product_range = "$C$" + product_index + ":$F$" + (product_index + product_values.length);
  var product_lookup_1 = "VLOOKUP($D2, " + product_range + ", 4, FALSE)";
  var product_lookup_2 = "VLOOKUP($D2 & \" (\" & $E2 & \")\", " + product_range + ", 4, FALSE)";
  var formula = "=IF($D2=\"\", \"\", IF($E2=\"\", IF(ISNA(" + product_lookup_1 + "), 0, " + product_lookup_1 + "), IF(ISNA(" + product_lookup_2 + "), 0, " + product_lookup_2 + "))";
  var topping_range = "$D$" + topping_index + ":$E$" + (topping_index + topping_values.length);
  var start_column = "F".charCodeAt(0);
  for (var count = 0; count < max_topping; ++count) {
    var column_notion = String.fromCharCode(start_column + count);
    var topping_lookup = "VLOOKUP($" + column_notion + "2, " + topping_range + ", 2, FALSE)";
    formula += " + IF($" + column_notion + "2=\"\", 0, IF(ISNA(" + topping_lookup + "), 0, " + topping_lookup + "))";
  }
  
  formula += ")";
  sheet.getRange(ROW_RECORD, COLUMN_PRICE, total + 1).setFormula(formula);
}

function initNote(sheet, product_index, product_values, topping_index, topping_values, note_index, total, max_topping) {
  sheet.getRange(note_index, 1).setValue("!");
  sheet.getRange(note_index, 2).setFormula("=ROW($B$" + (total + 3) + ") - 2");
  sheet.getRange(note_index, 3).setValue(max_topping);
  sheet.getRange(note_index, 4).setFormula("=ROW($D$" + product_index + ")");
  sheet.getRange(note_index, 5).setFormula("=ROW($D$" + (product_index + product_values.length)  + ")");
  sheet.getRange(note_index, 6).setFormula("=ROW($D$" + topping_index + ")");
  sheet.getRange(note_index, 7).setFormula("=ROW($D$" + (topping_index + topping_values.length)  + ")");
}