// 1. Find your dropdown menu by its ID
var versionDropdown = document.getElementById("version");
var versionCurrent = 1;

// 🕒 GLOBAL TIMERS: Variables to track our 30-second repeating loops
var refreshTimer = null;
var countdownTimer = null;
var countdownNumber = 30;

// Track the active route list globally so the timer can read it anytime
var activeRouteList = [];
var etaList = [];
var isReload = true;

// 2. Listen for when the user picks a new option
versionDropdown.addEventListener("change", function(event) {
  
  var selectedVersion = event.target.value;
  console.log("The user selected version: " + selectedVersion);
  
  // Clear any existing active loops whenever the user changes the dropdown selection
  stopLiveTracking();
  
  if (selectedVersion === "1") {
    alert("Loading version 1 features...");
    versionCurrent = 1;
  } else if (selectedVersion === "2") {
    versionCurrent = 2;
    
	document.getElementById('weather').style.display = 'none';
	document.getElementById('results').style.width = '100%'
    // Save version 2 routes to our global variable
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
    
    // Start tracking the live updates automatically
    startLiveTracking();
    
  } else if (selectedVersion === "3") {
    versionCurrent = 3;
	
	document.getElementById('weather').style.display = 'none';
	document.getElementById('results').style.width = '100%'

	activeRouteList = [
      {"tagId": "id7", "route": "97", "routeType": "b", "dir":"", "dir2":"O", "stopId": "", "stopId2": "002212", "syncTime": "0500-1000", "syncWkday": "12345"},
      {"tagId": "id8", "route": "90", "routeType": "b", "dir":"", "dir2":"O", "stopId": "", "stopId2": "002212", "syncTime": "1000-1900", "syncWkday": "1234567"}
    ];
	
	isReload = true;    
	
	// Start tracking the live updates automatically
    startLiveTracking();
  }    
});

// ⏳ TIMER LOGIC: Start the auto-refresh loops
function startLiveTracking() {
    // Run the data fetch immediately the first time
    fetchBusETA(activeRouteList);
    
    // Reset and start the visual countdown text
    startCountdown();
    
    // Set up the 30-second loop to re-fetch data
    refreshTimer = setInterval(function() {
        fetchBusETA(activeRouteList);
        startCountdown(); // Reset countdown clock back to 30
    }, 30000); // 30000 ms = 30 seconds
}

// 🛑 TIMER LOGIC: Clear out all timers and clean up screen indicators
function stopLiveTracking() {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    var statusDiv = document.getElementById('timerStatus');
    if (statusDiv) {
        statusDiv.innerHTML = "";
    }
}

// 🕒 HELPER: Ticks countdown number down every 1 second on your screen UI
function startCountdown() {
    countdownNumber = 30;
    var statusDiv = document.getElementById('timerStatus');
    if (!statusDiv) return; // Skip if element doesn't exist in HTML layout
    
    statusDiv.innerHTML = `🔄 自動更新數據倒數：<b>${countdownNumber}</b> 秒...`;
    
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function() {
        countdownNumber--;
        if (countdownNumber > 0) {
            statusDiv.innerHTML = `🔄 自動更新數據倒數：<b>${countdownNumber}</b> 秒...`;
        } else {
            clearInterval(countdownTimer);
        }
    }, 1000);
}

function isBusActiveTodayNow(bus) {
  var now = new Date();
  
  // 1. 檢查星期幾 (JavaScript 中 0代表星期日, 1-6代表星期一至六)
  // 為了對應你的設定 (1234567，其中7代表星期日)，我們將 0 轉換為 7
  var currentDay = now.getDay();
  if (currentDay === 0) currentDay = 7; 
  
  var allowedDays = bus.syncWkday.split(''); // 把 "467" 拆成 ['4', '6', '7']
  if (!allowedDays.indexOf(String(currentDay)) === -1) return false; // 舊版不支援 includes，改用 indexOf
  /*if (!allowedDays.includes(String(currentDay))) {
    return false; // 今天不屬於設定的星期，不更新
  }*/
  
  // 2. 檢查時間範圍 (例如 "0700-2300")
  var currentHour = String(now.getHours()).padStart(2, '0');
  var currentMin = String(now.getMinutes()).padStart(2, '0');
  var currentTimeNum = parseInt(currentHour + currentMin); // 變成數字例如 0730
  
  var timeParts = bus.syncTime.split('-'); // 拆成 ["0700", "2300"]
  var startTimeNum = parseInt(timeParts[0]);
  var endTimeNum = parseInt(timeParts[1]);
  
  if (currentTimeNum < startTimeNum || currentTimeNum > endTimeNum) {
    return false; // 當前時間不在營運範圍內，不更新
  }
  
  return true; // 通過所有檢查，可以更新
}

// 🚀 FIXED 1: 加上 async 關鍵字處理非同步請求
async function getBusETAData(pBus, url, isCtb = false) {
    try {
        var response = await fetch(url);
        var data = await response.json();

        if (!data.data || data.data.length === 0) {
            console.log(`路線 ${pBus.route} 暫無實時班次資訊`);
            return; // FIXED 2: 安全退出函數，不用 continue
        }
        
        var filteredData = [];
        if (isCtb) {
            // 城巴 API 只需要過濾路線名稱
			var filteredData = data.data.filter(function(item) {
				return item.route === pBus.route && item.dir === pBus.dir2;
			});
            //filteredData = data.data.filter(item => item.route === pBus.route && item.dir === pBus.dir2);
        } else {
            // 九巴 API 需要過濾路線與方向
			var filteredData = data.data.filter(function(item) {
				return item.route === pBus.route && item.dir === pBus.dir;
			});
            //filteredData = data.data.filter(item => item.route === pBus.route && item.dir === pBus.dir);
        }
		
        
        if (filteredData.length === 0) return;
      
        // 將撈到的排班塞進全域陣列中
        for (var cnt = 0; cnt < filteredData.length; cnt++) {
            var etaItem = filteredData[cnt]; 
            etaList.push({
                "eta": etaItem.eta, 
                "rmk_tc": etaItem.rmk_tc || "", // FIXED 4: 統一欄位名稱
                "dest_tc": etaItem.dest_tc || "目的地",
                "company": isCtb ? "城巴" : "九巴"
            });
        }
    } catch (err) {
        console.error("讀取 API 發生錯誤:", err);
    }
}
// 核心主渲染函數
async function fetchBusETA(routeList) {
  var resultsDiv = document.getElementById('results');
  if (isReload) {
	resultsDiv.innerHTML = ""; 
  }

  try {
    for (var bus of routeList) {
	  
	  if (isReload) {
	  	var card = document.createElement('div');
	    card.className = 'eta-card';
	    card.id = bus.tagId;
	    card.innerHTML = "";
	    resultsDiv.appendChild(card);
	  }
	  var resultsByRouteDiv = document.getElementById(bus.tagId);
      
	  if (!isBusActiveTodayNow(bus)) {
        console.log(`[跳過] 路線 ${bus.route} 目前非同步時間`);
		resultsByRouteDiv.innerHTML = "";
		resultsByRouteDiv.className= "eta-card-inactive"
        continue;
      } else {
		resultsByRouteDiv.className= "eta-card"
	  }
        
      var directionPath = bus.dir === "O" ? "outbound" : "inbound";
      console.log(`正在處理: ${bus.route} , 站點 ID: ${bus.stopId}`);
      
	  etaList = []; // 每次處理新路線前清空

	  // 1. FIXED 3: 加上 await，並將末端路徑改為正確的 directionPath
	  if (bus.stopId !== "") { 
		var url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${bus.stopId}/${bus.route}/1`;
		await getBusETAData(bus, url, false);
	  }
	  
	  // 2. 讀取聯營城巴 API 
	  if (bus.stopId2 !== "") { 
		var ctb_url = `https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/${bus.stopId2}/${bus.route}`;
		await getBusETAData(bus, ctb_url, true);
	  }
	  
	  
	  etaList.sort(function(a, b) {
			// 檢查是否有資料，防止因空值（null/undefined）導致程式崩潰
			if (!a.eta) return 1;
			if (!b.eta) return -1;
			
			// 用 .getTime() 轉做純數字進行精準比較，相容 Android 5 舊 WebView
			return new Date(a.eta).getTime() - new Date(b.eta).getTime();
	  });
	/*
	  // 新增優化：按時間先後順序對混合後的班次進行排序
	  etaList.sort((a, b) => new Date(a.eta) - new Date(b.eta));
	 */
	  var displayDetails = "";
      var dest = "未知目的地"; 
	  
      if (etaList.length === 0) {
		  displayDetails = "<p style='color:red;'>暫無即時班次更新 (X)</p>";
	  } else {
          // 最多只顯示 5 班車
          var loopsToRun = Math.min(etaList.length, 5);
          
          for (var cnt = 0; cnt < loopsToRun; cnt++) {
            var item = etaList[cnt]; 
			
			console.log(item);
			
            if (dest == "未知目的地") {
              dest = item.dest_tc || "未知目的地";
            }
			
			if (item.rmk_tc == "九巴時段") {
				continue;
			}
          
			if (!item.eta) {
				continue;
			}
				 
			//var etaTime = new Date(item.eta).toLocavarimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
			var etaTime = "無資料";

			if (item.eta) {
				var dateObj = new Date(item.eta);
				
				// 手動提取時、分、秒，並用 padStart 補足兩位數（例如把 9 變成 09）
				var hours = String(dateObj.getHours()).padStart(2, '0');
				var minutes = String(dateObj.getMinutes()).padStart(2, '0');
				var seconds = String(dateObj.getSeconds()).padStart(2, '0');
				
				// 拼接成 24 小時制的格式（例如：15:30:45）
				etaTime = hours + ":" + minutes + ":" + seconds;
			}

            var remark = item.rmk_tc || "";
			
			if (bus.stopId !== "" && bus.stopId2 !== "") { 
				remark = item.company + " - " + remark;
			}
			
            var dynamicRemainingText = "";
            
            if (item.eta) {
              var etaDate = new Date(item.eta);
              var currentDate = new Date();
              
              var diffMs = etaDate - currentDate;
              var totalSeconds = Math.floor(diffMs / 1000);
              
              if (totalSeconds > 0) {
                var diffMinutes = Math.floor(totalSeconds / 60);
                var diffSeconds = totalSeconds % 60;
                var formattedSeconds = String(diffSeconds).padStart(2, '0');
                
                // 第一班車的分鐘數放大到 80px，其餘正常顯示
                var fontSizeStyle = (cnt === 0) ? "font-size: 80px; line-height: 80px;" : "font-size: 22px;";
				fontSizeStyle += (diffMinutes <= 5) ? "color: #9E1B1B;" : "";
                
                dynamicRemainingText = `<span style="${fontSizeStyle} font-weight:bold;">${diffMinutes}</span>m ${formattedSeconds}s`;
              } else {
                dynamicRemainingText = "<span style='color:orange; font-weight:bold;'>抵達中/已過</span>";
              }
            } else {
              dynamicRemainingText = "X";
            }
            
            displayDetails += `
              <div class="eta-row">
                <p style="margin: 2px 0;"><small style="color: #777;">${remark}</small>
                    <span style="color: green;">(${dynamicRemainingText})</span>
                    <span style="margin-left: 10px; color:blue; font-weight:bold; font-size: 16px;">${etaTime}</span> 
                </p>
              </div>`;
          }
      }
	  
	  var cardDiv = `
			<div class="c-route">
			  <p class="route-general route-${bus.routeType}"><strong>${bus.route}</strong></p>
			  <p style="color: #555; font-weight: bold;">${dest}</p>
			</div>  
			<div class="c-details">
			  ${displayDetails}
			</div>
		  `;
		  

	  if (resultsByRouteDiv) {		  
		  resultsByRouteDiv.innerHTML = cardDiv;
		  
	  } 
	  /*else {
		  // 生成網頁上的路線卡片
		  var card = document.createElement('div');
		  card.className = 'eta-card';
		  card.id = bus.tagId;
		  
		  card.innerHTML = cardDiv;
		  resultsDiv.appendChild(card);
	  }*/
    }
	isReload = false;

  } catch (error) {
    resultsDiv.innerHTML = "<span style='color:red;'>資料加載錯誤，請檢查網路連線。</span>";
    console.error("主渲染程式錯誤:", error);
	isReload = true;
  }
}
