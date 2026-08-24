var versionCurrent = 1;

var refreshTimer = null;
var countdownTimer = null;
var countdownNumber = 15;

// var activeRouteList = [];
var etaList = [];
var isReload = true;
var message = "";

const CONFIG_URL = 'https://gist.githubusercontent.com/hannielyim-dev/fda2bd3bd3e76275b3e62b0f381cf184/raw/bus_config.json';

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
  } else if (selectedVersion === "2") {
    versionCurrent = 2;
    if(document.getElementById('weather')) document.getElementById('weather').style.display = 'none';
    if(document.getElementById('results')) document.getElementById('results').style.width = '100%';
    
    isReload = true;
    // 💡 Use 'await' to resolve the Promise into the actual route array
    const routeList = await getConfigByKey("2");
    if (routeList) startLiveTracking(routeList);
    
  } else if (selectedVersion === "3") {
    versionCurrent = 3;
    if(document.getElementById('weather')) document.getElementById('weather').style.display = 'none';
    if(document.getElementById('results')) document.getElementById('results').style.width = '100%';

    isReload = true;
    // 💡 Use 'await' to resolve the Promise into the actual route array
    const routeList = await getConfigByKey("3");
    if (routeList) startLiveTracking(routeList);
  }    
}

function startLiveTracking(activeRouteList) {
    fetchBusETA(activeRouteList);
    startCountdown();
    refreshTimer = setInterval(function() {
        fetchBusETA(activeRouteList);
        startCountdown(); 
    }, 15000); 
}

function stopLiveTracking() {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    var statusDiv = document.getElementById('timerStatus');
    if (statusDiv) statusDiv.innerHTML = "";
}

function startCountdown() {
    countdownNumber = 15;
    var statusDiv = document.getElementById('timerStatus');
    if (!statusDiv) return; 
    statusDiv.innerHTML = "🔄 自動更新數據倒數：<b>" + countdownNumber + "</b> 秒...";
    
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function() {
        countdownNumber--;
        if (countdownNumber > 0) {
            statusDiv.innerHTML = "🔄 自動更新數據倒數：<b>" + countdownNumber + "</b> 秒...";
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

  console.log(currentTotalMinutes + "(" + startTotalMinutes + "-" + endTotalMinutes + ")" );

  if (isNaN(startTotalMinutes) || isNaN(endTotalMinutes)) return true;

  return (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes); 
}

function getBusETADataXHR(pBus, url, isCtb, callback) {
    var xhr = new XMLHttpRequest();
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
        var displayDetails = "", dest = "未知目的地"; 
        if (etaList.length === 0) {
            displayDetails = "<p style='color:red;'>暫無即時班次更新 (X)</p>";
        } else {
            var loopsToRun = Math.min(etaList.length, 5);
            for (var cnt = 0; cnt < loopsToRun; cnt++) {
                var item = etaList[cnt]; 
                if (dest == "未知目的地") dest = item.dest_tc || "未知目的地";
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
                displayDetails += '<div class="' + rowClass + '"><p style="margin: 2px 0;"><small style="color: #777;">' + remark + '</small> <span style="color: green;">(' + dynamicRemainingText + ')</span><span style="margin-left: 10px; color:blue; font-weight:bold; font-size: 16px;">' + etaTime + '</span></p></div>';
            }
        }
        var cardDiv = '<div class="c-route"><p class="route-general route-' + bus.routeType + '"><strong>' + bus.route + '</strong></p><p style="color: #555; font-weight: bold;">' + dest + '</p></div><div class="c-details">' + displayDetails + '</div>';
        if (resultsByRouteDiv) resultsByRouteDiv.innerHTML = cardDiv;
        processRouteAtIndex(index + 1);
    }
  }
  processRouteAtIndex(0);
}
