function testFoodpanda() {
  var vender_id = fetchVender('https://www.foodpanda.com.tw/restaurant/z8bq'); // z0dj
  var menu = fetchMenu(vender_id);
  createSheet(menu, vender_id, "Compass", 10);
}

function fetchVender(url) {
  var response = UrlFetchApp.fetch(url);
  if (response.getResponseCode() != 200) {
    Logger.log("Error!");
    return;
  }
  
  var contents = response.getContentText();
  var pattern = /data-vendor='{\"id\":([0-9]+),/;
  var matches = contents.match(pattern);
  if (matches) {
    return matches[1];
  } else {
    return 0;
  }
}

function fetchRestaurant(vender_id) {
  var options = {
    "headers": {
      "X-Requested-With": "XMLHttpRequest"
    }
  };
  var response = UrlFetchApp.fetch('https://www.foodpanda.com.tw/api/v1/vendors/' + vender_id + '?language_id=6', options);

  if (response.getResponseCode() != 200) {
    Logger.log("Error!");
    return {};
  }
  
  var contents = response.getContentText();
  var json = JSON.parse(contents);
  
  var name = json.name;
  var url = json.web_path;
  var phone = json.customer_phone;
  var address = json.address + json.address_line2;
  var map = "https://www.google.co.in/maps/@" + json.latitude + "," + json.longitude + ",16z";
  return {
    name: name,
    url: url,
    phone: phone,
    address: address,
    map: map
  };
}

function fetchMenu(vender_id) {
  var options = {
    "headers": {
      "X-Requested-With": "XMLHttpRequest"
    }
  };
  var response = UrlFetchApp.fetch('https://www.foodpanda.com.tw/api/v1/vendors/' + vender_id + '?language_id=6', options);
  if (response.getResponseCode() != 200) {
    Logger.log("Error!");
    return;
  }
  
  var contents = response.getContentText();
  var json = JSON.parse(contents);
  
  var toppings = [];
  for (var key in json.toppings) {
    var topping = json.toppings[key];
    var topping_item = {
      "Id": key,
      "Name": topping.name,
      "Options": []
    };
                        
    topping.options.forEach((option) =>{
      var option_item = {
        "Name": option.name,
        "Price": option.price
      };
      topping_item.Options.push(option_item);
    });
  
    toppings.push(topping_item);
  };

  var products = []
  json.menus.forEach((menu) => {
    menu.menu_categories.forEach((menu_category) => {
      menu_category.products.forEach((product) => {
        var product_item = {
          "Name": product.name,
          "Variations": []
        };

        product.product_variations.forEach((product_variation) => {
          var variation = {
            "Name": product_variation.name,
            "Price": product_variation.price,
            "Toppings": product_variation.topping_ids
          };
          product_item.Variations.push(variation);
        });
        products.push(product_item);
      });
    });
  });

  return [json.name, products, toppings];
}