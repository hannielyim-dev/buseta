var versionCurrent = 1;

var refreshTimer = null;
var countdownTimer = null;
var countdownNumber = 20;

var weatherTimer = null; 

// var activeRouteList = [];
var etaList = [];
var isReload = true;
var message = "";

const CONFIG_URL = 'https://gist.githubusercontent.com/hannielyim-dev/fda2bd3bd3e76275b3e62b0f381cf184/raw/bus_config.json';
const HKO_URL = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc';
const HKO_WARN_URL = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc';
var hko_last_icon = "";

var is_data_found = false;

// 💡 根據最新官方說明書（第 9 頁）的 .code 欄位精準修正 Key 值
const HKO_PRECISE_ICONS = {
  // 🌧️ 暴雨警告系列 (精準區分顏色)
  "WRAINA": "raina",   // 黃色暴雨警告信號
  "WRAINR": "rainr",   // 紅色暴雨警告信號
  "WRAINB": "rainb",   // 黑色暴雨警告信號
  
  // 🔥 火災危險警告系列 (精準區分顏色)
  "WFIREY": "firey",   // 黃色火災危險警告
  "WFIRER": "firer",   // 紅色火災危險警告
  
  // 🌪️ 熱帶氣旋警告信號系列 (風球信號)
  "TC1": "tc1", "TC3": "tc3", 
  "TC8NE": "tc8ne", "TC8NW": "tc8nw", "TC8SE": "tc8se", "TC8SW": "tc8sw", 
  "TC9": "tc9", "TC10": "tc10",
  
  // ⚡ 其他天氣警告 (對照說明書：Key 必須完全符合 API 回傳的 code 欄位值)
  "WTS": "ts",          // 💡 修正：雷暴警告（API 回傳 "WTS"，對應官方圖標 ts.gif）
  "WCOLD": "cold",      // 寒冷天氣警告
  "WHOT": "hot",        // 酷熱天氣警告
  "WMSGNL": "mon",      // 強烈季候風信號
  "WL": "slip",         // 山泥傾瀉警告
  "WFNTSA": "ntflood",  // 新界北部水浸特別報告
  "WFROST": "frost",    // 霜凍警告
  "WTMW": "tsunami"     // 海嘯警告
};

async function getConfigByKey(key) {
  try {
    const response = await fetch(CONFIG_URL);
    console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const config = await response.json();
    return config[key] || null;
  } catch (error) {
    console.error('Failed to retrieve config key:', error);
  }
}

// 💡 修正 1：在 function 前面務必加上 async
async function fetchHKOData() {
  try {
   // 💡 同時發送兩個 API 請求 (包含詳細警告資訊)
	const [weatherRes, warnRes] = await Promise.all([
	  fetch(HKO_URL), // 你的現時天氣 API 網址
	  fetch(HKO_WARN_URL)
	]);

	if (!weatherRes.ok || !warnRes.ok) throw new Error("API 請求失敗");
	
	const hkoData = await weatherRes.json();
    const warnData = await warnRes.json();
    console.log(hkoData);
    console.log(warnData);
	
	var warningIconsHTML = "";
	var hasActiveWarning = false;
	// 檢查 warnsum 是否有資料
    if (warnData && Object.keys(warnData).length > 0) {
        // 使用 Flexbox 讓多個警告圖標可以橫向排成一排
        var iconTags = "";
        
        for (var key in warnData) {
            var alertItem = warnData[key];
            
            // 只有當 actionCode 是 ISSUE (代表目前正生效中) 時才渲染
            if (alertItem && alertItem.actionCode === "ISSUE") {
                var currentCode = alertItem.code; // 這裡會拿到 "WRAINB", "WHOT", "WFNTSA" 等等
				
				console.log(currentCode);
                
                if (currentCode && HKO_PRECISE_ICONS[currentCode]) {
                    hasActiveWarning = true;
                    var imgName = HKO_PRECISE_ICONS[currentCode];
                    var imgURL = "https://www.hko.gov.hk/en/wxinfo/dailywx/images/" + imgName + ".gif";
					console.log(imgURL);
                    
                    // 生成警告圖標圖片標籤
                    iconTags += "<img src='" + imgURL + "' title='" + alertItem.name + "'>";
                }
            }
        }
        
        // 如果有任何生效中的警告，用一個容器把所有圖標包起來
        if (hasActiveWarning) {
            warningIconsHTML = "<div class = 'warning-symbol'>" + iconTags + "</div>";
        }
    }
	document.getElementById("weather-signal").innerHTML = warningIconsHTML;

    const icon = hkoData["icon"] || null;
    var message = (hkoData["warningMessage"] || "") + (hkoData["specialWxTips"] || "");
        
    // 💡 修正 2：將原本的引號換行符號 /n 改為網頁適用的 <br> 標籤
	var shatinTemp = "N/A";
    var shatinRain = "0";

    // (A) 尋找沙田的氣溫
    if (hkoData.temperature && hkoData.temperature.data) {
        const tempArray = hkoData.temperature.data;
        for (var i = 0; i < tempArray.length; i++) {
            if (tempArray[i].place === "沙田") {
				shatinTemp = tempArray[i].value + "°" + tempArray[i].unit; // 取得溫度數值
                break;
            }
        }
    }

    // (B) 尋找沙田的雨量
    if (hkoData.rainfall && hkoData.rainfall.data) {
        const rainArray = hkoData.rainfall.data;
        for (var j = 0; j < rainArray.length; j++) {
            if (rainArray[j].place === "沙田") {
                // 天文台雨量資料通常會提供最高值 (max)
                shatinRain = rainArray[j].max !== undefined ? rainArray[j].max : (rainArray[j].value || "0");
                break;
            }
        }
    }
	
	
    var message = "<p style='font-size: 30px; margin: 0'><strong>" +(shatinTemp) + "  ☔︎" +(shatinRain) + "</strong></p>" + (hkoData["warningMessage"] || "") + (hkoData["specialWxTips"] || "");
    console.log("HKO data: " + icon + "," + message);
	
    // 顯示同步時間
    var now = new Date();
    var lastSyncTime = padZero(now.getHours()) + ":" + padZero(now.getMinutes());
    
    // 💡 這裡改用 <br>，這樣在網頁 innerHTML 渲染時才會真正換行
    message += "<br>(" + lastSyncTime + ")";
	
    var weatherIcon = document.getElementById("weather-icon");
    var weatherMsg = document.getElementById("weather-msg");
		
    // 💡 修正 3：利用標準的字串相加，把 icon 變數正確拼進網址中
    if (weatherIcon && hko_last_icon !== icon && icon) {
        weatherIcon.src = "https://www.hko.gov.hk/images/HKOWxIconOutline/pic" + icon + ".png";
    }
		
	if (versionCurrent === "2") {
		message = message.replace("市民", "牛姐");
	}
		
    if (weatherMsg) {
        weatherMsg.innerHTML = message;
    }
	
    hko_last_icon = icon;
	
  } catch (error) {
    console.error('Failed to retrieve HKO Data:', error);
  }
}



window.addEventListener("DOMContentLoaded", function() {
  var searchString = window.location.search;
  
  // 相容 /id=X 的網址格式
  if (!searchString && window.location.href.indexOf('id=') !== -1) {
    var parts = window.location.href.split('id=');
    searchString = '?id=' + parts[parts.length - 1];
  }
  
  var urlParams = new URLSearchParams(searchString);
  var idParam = urlParams.get('id'); 
  
  // 如果網址沒有帶 id，預設載入版本 1
  if (!idParam) { idParam = "1"; }
  
  // 執行載入
  loadVersionData(idParam);
});

// 💡 2. 將原本的判斷邏輯獨立成一個 Function
async function loadVersionData(selectedVersion) {
  stopLiveTracking();
  
  if (selectedVersion === "1") {
    alert("Loading version 1 features...");
    versionCurrent = 1;
  } else {
    // 💡 Use 'await' to resolve the Promise into the actual route array
	const routeList = await getConfigByKey(selectedVersion);
	if (routeList) {
		versionCurrent = selectedVersion;
		console.log("Version Selected: " + selectedVersion);
		if(document.getElementById('weather')) document.getElementById('weather').style.width = '20%';
		if(document.getElementById('results')) document.getElementById('results').style.width = '80%';
		
		isReload = true;
		startLiveTracking(routeList);
	} else {
		alert("No setting found");
	}
  }    
}

function startLiveTracking(activeRouteList) {
    fetchBusETA(activeRouteList);
    startCountdown();
    refreshTimer = setInterval(function() {
		if (is_data_found === false) {
			window.location.reload();
		}
        fetchBusETA(activeRouteList);
        startCountdown(); 
    }, 20000); 
	 // 🌤️ 2. 天氣邏輯：立刻執行一次，之後每 15 分鐘 (900000 毫秒) 執行一次
    fetchHKOData();
    weatherTimer = setInterval(function() {
        fetchHKOData();
    }, 900000); // 15 分鐘
}

function stopLiveTracking() {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    clearInterval(weatherTimer); // 💡 停止追蹤時，記得也要清除天氣計時器
    var statusDiv = document.getElementById('timerStatus');
    if (statusDiv) statusDiv.innerHTML = "";
}

function startCountdown() {
    countdownNumber = 20;
    var statusDiv = document.getElementById('timerStatus');
    if (!statusDiv) return; 
    // statusDiv.innerHTML = "🔄 自動更新數據倒數：<b>" + countdownNumber + "</b> 秒...";
	statusDiv.innerHTML = "<span onclick='window.location.reload();' style='cursor: pointer;' title='點擊重新整理網頁'>🔄 自動更新數據倒數：<b>" + countdownNumber + "</b> 秒...</span>";
    
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function() {
        countdownNumber--;
        if (countdownNumber > 0) {
            //statusDiv.innerHTML = "🔄 自動更新數據倒數：<b>" + countdownNumber + "</b> 秒...";
			statusDiv.innerHTML = "<span onclick='window.location.reload();' style='cursor: pointer;' title='點擊重新整理網頁'>🔄 自動更新數據倒數：<b>" + countdownNumber + "</b> 秒...</span>";
        } else {
            clearInterval(countdownTimer);
        }
    }, 1000);
}


function padZero(num) {
    return num < 10 ? '0' + num : num;
}

function isBusActiveTodayNow(bus) {
  var now = new Date();
  var currentDay = now.getDay();
  if (currentDay === 0) currentDay = 7; // Convert Sunday to 7
  
  var allowedDays = bus.syncWkday.split(''); 
  if (allowedDays.indexOf(String(currentDay)) === -1) return false; 
  
  if (!bus.syncTime || bus.syncTime.length < 9) return true;

  // Total minutes past midnight for the current time
  var currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();

  // Parse start time (e.g., "0158" -> 1 hour * 60 + 58 mins = 118 mins)
  var startStr = bus.syncTime.substring(0, 4);
  var startHours = parseInt(startStr.substring(0, 2), 10);
  var startMins = parseInt(startStr.substring(2, 4), 10);
  var startTotalMinutes = (startHours * 60) + startMins;

  // Parse end time (e.g., "0159" -> 1 hour * 60 + 59 mins = 119 mins)
  var endStr = bus.syncTime.substring(5, 9);
  var endHours = parseInt(endStr.substring(0, 2), 10);
  var endMins = parseInt(endStr.substring(2, 4), 10);
  var endTotalMinutes = (endHours * 60) + endMins;

  //console.log(currentTotalMinutes + "(" + startTotalMinutes + "-" + endTotalMinutes + ")" );

  if (isNaN(startTotalMinutes) || isNaN(endTotalMinutes)) return true;

  return (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes); 
}

function getBusETADataXHR(pBus, url, isCtb, callback) {
    var xhr = new XMLHttpRequest();
	console.log("Processing url: " + url);
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (!data.data || data.data.length === 0) {
                        message += "路線 " + pBus.route + " 暫無實時班次資訊<br>";
                        callback();
                        return;
                    }
                    var filteredData = [];
					for (var i = 0; i < data.data.length; i++) {
						var item = data.data[i];
						if (isCtb) {
							if (item.route === pBus.route && item.dir === pBus.dir2) {
								filteredData.push(item);
							}
						} else {
							if (item.route === pBus.route && item.dir === pBus.dir) {
								filteredData.push(item);
							}
						}
					}
                    if (filteredData.length > 0) {
                        for (var cnt = 0; cnt < filteredData.length; cnt++) {
                            var etaItem = filteredData[cnt]; 
                            etaList.push({
                                "eta": etaItem.eta, 
                                "rmk_tc": etaItem.rmk_tc || "", 
                                "dest_tc": etaItem.dest_tc || "目的地",
                                "company": isCtb ? "城巴" : "九巴"
                            });
                        }
                    }
                } catch (err) { console.error(err); }
            }
            callback(); 
        }
    };
	
	// 🚨 這是專為解決九巴 HTTPS 連線失敗加裝的防禦保護：
    xhr.onerror = function() {
        console.log("XHR 網路連線或安全憑證握手失敗！強制跳往下一條路線。");
        callback(); // 💡 關鍵：就算九巴 HTTPS 被舊手機阻擋，也強制放行執行 callback，絕不斷線！
    };
	
    xhr.send();
}

function fetchBusETA(routeList) {
  var resultsDiv = document.getElementById('results');
  if (isReload) resultsDiv.innerHTML = ""; 
  message = "";
  is_data_found = false;

  function processRouteAtIndex(index) {
    if (index >= routeList.length) {
        isReload = false;
        var msgDiv = document.getElementById("message");
        if (msgDiv) msgDiv.innerHTML = message;
        return;
    }
    var bus = routeList[index];
    if (isReload) {
        var card = document.createElement('div');
        card.className = 'eta-card';
        card.id = bus.tagId;
        resultsDiv.appendChild(card);
    }
    var resultsByRouteDiv = document.getElementById(bus.tagId);
    if (!isBusActiveTodayNow(bus)) {
        if (resultsByRouteDiv) {
            resultsByRouteDiv.innerHTML = "";
            resultsByRouteDiv.className = "eta-card-inactive";
        }
        processRouteAtIndex(index + 1);
        return;
    } else {
        if (resultsByRouteDiv) resultsByRouteDiv.className = "eta-card";
    }
    message += "正在處理: " + bus.route + "<br>";
    etaList = []; 

    if (bus.stopId !== "") {
        var kmb_url = "https://data.etabus.gov.hk/v1/transport/kmb/eta/" + bus.stopId + "/" + bus.route + "/1";
        getBusETADataXHR(bus, kmb_url, false, function() { checkAndRunCtb(); });
    } else {
        checkAndRunCtb();
    }

    function checkAndRunCtb() {
        if (bus.stopId2 !== "") {
            var ctb_url = "https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/" + bus.stopId2 + "/" + bus.route;
            getBusETADataXHR(bus, ctb_url, true, function() { renderAndGoNext(); });
        } else {
            renderAndGoNext();
        }
    }

    function renderAndGoNext() {
        etaList.sort(function(a, b) {
            if (!a.eta) return 1; if (!b.eta) return -1;
            return new Date(a.eta).getTime() - new Date(b.eta).getTime();
        });
        var displayDetails = "", dest = ""; 
        if (etaList.length === 0) {
            displayDetails = "<p style='color:red;'>暫無即時班次更新 (X)</p>";
        } else {
            var loopsToRun = Math.min(etaList.length, 5);
            for (var cnt = 0; cnt < loopsToRun; cnt++) {
                var item = etaList[cnt]; 
                if (dest == "") dest = item.dest_tc || "";
                if (item.rmk_tc == "九巴時段" || !item.eta) continue;
                   
                var etaTime = "無資料";
                if (item.eta) {
                    var dateObj = new Date(item.eta);
                    etaTime = padZero(dateObj.getHours()) + ":" + padZero(dateObj.getMinutes()) + ":" + padZero(dateObj.getSeconds());
                }
                var remark = item.rmk_tc || "";
                if (bus.stopId !== "" && bus.stopId2 !== "") remark = item.company + " - " + remark;
                
                var dynamicRemainingText = "";
				var rowClass = "eta-row";
                if (item.eta) {
                    var totalSeconds = Math.floor((new Date(item.eta).getTime() - new Date().getTime()) / 1000);
                    if (totalSeconds > 0) {
                        var diffMinutes = Math.floor(totalSeconds / 60);
                        var fontSizeStyle = (cnt === 0) ? "font-size: 80px; line-height: 80px;" : "font-size: 22px;";
                        if (diffMinutes <= 5) {
							fontSizeStyle += "color: #9E1B1B;";
							rowClass = "eta-row flash-red";
						}
                        dynamicRemainingText = '<span style="' + fontSizeStyle + ' font-weight:bold;">' + diffMinutes + '</span>m ' + padZero(totalSeconds % 60) + 's';
                    } else {
                        dynamicRemainingText = "<span style='color:orange; font-weight:bold;'>抵達中/已過</span>";
                    }
                } else { dynamicRemainingText = "X"; }
                displayDetails += '<div class="' + rowClass + '"><p class="eta-remain-time"> <span style="color: green;">(' + dynamicRemainingText + ')</p></span><div style="display: inline-block;"><small style="color: #777;">' + remark + '</small><br><span class="eta-time">' + etaTime + '</span></p></div></div>';
            }
			is_data_found = true;
        }
		
		// 💡 1. 檢查路線名稱（例如 "89D"）的最後一個字元是不是英文字母 (A-Z)
		var formattedRoute = bus.route; // 預設值

		if (/[A-Z]$/i.test(bus.route)) {
			// 如果最後一個字是字母，將其拆開：抓取除了最後一碼以外的全部字元 + 最後一碼字母
			var routeNumber = bus.route.slice(0, -1);
			var routeLetter = bus.route.slice(-1);
			
			// 用 span 標籤把最後的字母包起來，並賦予一個 class 名稱叫 "small-suffix"
			formattedRoute = routeNumber + '<span class="small-suffix">' + routeLetter + '</span>';
		}

        var cardDiv = '<div class="c-route"><p class="route-general route-' + bus.routeType + '"><strong>' + formattedRoute 
					+ '</strong></p><p class="route-dest">' + dest + '</p></div><div class="c-details">' + displayDetails + '</div>';
        if (resultsByRouteDiv) resultsByRouteDiv.innerHTML = cardDiv;
        processRouteAtIndex(index + 1);
    }
  }
  processRouteAtIndex(0);
}
