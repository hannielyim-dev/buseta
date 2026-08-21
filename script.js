var versionDropdown = document.getElementById("version");
var versionCurrent = 1;

var refreshTimer = null;
var countdownTimer = null;
var countdownNumber = 30;

var activeRouteList = [];
var etaList = [];
var isReload = true;
var message = "";

versionDropdown.addEventListener("change", function(event) {
  var selectedVersion = event.target.value;
  stopLiveTracking();
  
  if (selectedVersion === "1") {
    alert("Loading version 1 features...");
    versionCurrent = 1;
  } else if (selectedVersion === "2") {
    versionCurrent = 2;
    if(document.getElementById('weather')) document.getElementById('weather').style.display = 'none';
    if(document.getElementById('results')) document.getElementById('results').style.width = '100%';
    
    // 💡 直接讀取來自 routes.js 的資料
    activeRouteList = [
      {"tagId": "id2", "route": "40E", "routeType": "w", "dir":"O", "dir2":"", "stopId": "0D4E07F475845DB3", "stopId2": "", "syncTime": "0700-0900", "syncWkday": "12345"},
      {"tagId": "id3", "route": "980X", "routeType": "g", "dir":"O", "dir2":"", "stopId": "6BD93B827893E41E", "stopId2": "003083", "syncTime": "0700-0900", "syncWkday": "12345"},
      {"tagId": "id1", "route": "89D", "routeType": "w", "dir":"O", "dir2":"", "stopId": "6BD93B827893E41E", "stopId2": "", "syncTime": "0700-2300", "syncWkday": "67"},
      {"tagId": "id7", "route": "287", "routeType": "w", "dir":"I", "dir2":"", "stopId": "0D4E07F475845DB3", "stopId2": "", "syncTime": "0700-2200", "syncWkday": "1234567"},
      {"tagId": "id4", "route": "286C", "routeType": "w", "dir":"O", "dir2":"", "stopId": "B1A047E011F022D2", "stopId2": "", "syncTime": "1032-1900", "syncWkday": "1234567"},
      {"tagId": "id5", "route": "40X", "routeType": "w", "dir":"O", "dir2":"", "stopId": "0D4E07F475845DB3", "stopId2": "", "syncTime": "1200-1700", "syncWkday": "1234567"},
      {"tagId": "id6", "route": "680", "routeType": "r", "dir":"O", "dir2":"I", "stopId": "0C81107C4ABFCD56", "stopId2": "003075", "syncTime": "0700-2030", "syncWkday": "1234567"},
	  {"tagId": "id9", "route": "980X", "routeType": "g", "dir":"I", "dir2":"", "stopId": "52C01B7F122297BD", "stopId2": "001034", "syncTime": "1750-1930", "syncWkday": "12345"}
    ];
    isReload = true;
    startLiveTracking();
    
  } else if (selectedVersion === "3") {
    versionCurrent = 3;
    if(document.getElementById('weather')) document.getElementById('weather').style.display = 'none';
    if(document.getElementById('results')) document.getElementById('results').style.width = '100%';

    // 💡 直接讀取來自 routes.js 的資料
    activeRouteList = [
      {"tagId": "id7", "route": "97", "routeType": "b", "dir":"", "dir2":"O", "stopId": "", "stopId2": "002212", "syncTime": "0500-1000", "syncWkday": "12345"},
      {"tagId": "id8", "route": "90", "routeType": "b", "dir":"", "dir2":"O", "stopId": "", "stopId2": "002212", "syncTime": "1000-1900", "syncWkday": "1234567"}
    ];
    isReload = true;
    startLiveTracking();
  }    
});

function startLiveTracking() {
    fetchBusETA(activeRouteList);
    startCountdown();
    refreshTimer = setInterval(function() {
        fetchBusETA(activeRouteList);
        startCountdown(); 
    }, 30000); 
}

function stopLiveTracking() {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    var statusDiv = document.getElementById('timerStatus');
    if (statusDiv) statusDiv.innerHTML = "";
}

function startCountdown() {
    countdownNumber = 30;
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
  if (currentDay === 0) currentDay = 7; 
  
  var allowedDays = bus.syncWkday.split(''); 
  if (allowedDays.indexOf(String(currentDay)) === -1) return false; 
  
  var currentHour = padZero(now.getHours());
  var currentMin = padZero(now.getMinutes());
  var currentTimeNum = parseInt(String(currentHour) + String(currentMin)); 
  
  var timeParts = bus.syncTime.split('-'); 
  var startTimeNum = parseInt(timeParts[0]);
  var endTimeNum = parseInt(timeParts[1]);
  
  if (currentTimeNum < startTimeNum || currentTimeNum > endTimeNum) return false; 
  return true; 
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
                    var filteredData = data.data.filter(function(item) {
                        return isCtb ? (item.route === pBus.route && item.dir === pBus.dir2) : (item.route === pBus.route && item.dir === pBus.dir);
                    });
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
                if (item.eta) {
                    var totalSeconds = Math.floor((new Date(item.eta) - new Date()) / 1000);
                    if (totalSeconds > 0) {
                        var diffMinutes = Math.floor(totalSeconds / 60);
                        var fontSizeStyle = (cnt === 0) ? "font-size: 80px; line-height: 80px;" : "font-size: 22px;";
                        if (diffMinutes <= 5) fontSizeStyle += "color: #9E1B1B;";
                        dynamicRemainingText = '<span style="' + fontSizeStyle + ' font-weight:bold;">' + diffMinutes + '</span>m ' + padZero(totalSeconds % 60) + 's';
                    } else {
                        dynamicRemainingText = "<span style='color:orange; font-weight:bold;'>抵達中/已過</span>";
                    }
                } else { dynamicRemainingText = "X"; }
                displayDetails += '<div class="eta-row"><p style="margin: 2px 0;"><small style="color: #777;">' + remark + '</small> <span style="color: green;">(' + dynamicRemainingText + ')</span><span style="margin-left: 10px; color:blue; font-weight:bold; font-size: 16px;">' + etaTime + '</span></p></div>';
            }
        }
        var cardDiv = '<div class="c-route"><p class="route-general route-' + bus.routeType + '"><strong>' + bus.route + '</strong></p><p style="color: #555; font-weight: bold;">' + dest + '</p></div><div class="c-details">' + displayDetails + '</div>';
        if (resultsByRouteDiv) resultsByRouteDiv.innerHTML = cardDiv;
        processRouteAtIndex(index + 1);
    }
  }
  processRouteAtIndex(0);
}
