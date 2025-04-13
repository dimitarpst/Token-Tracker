let url_tracker = "https://script.google.com/macros/s/AKfycbw5zf6W7KeeYmYcSzc_s96kg6oJVdmak0tnj_Pr0pbCO6CadaAHEFcUL3ZH9Jm-1ZSy/exec";
$(document).ready(function(){
  // Request notification permission if available
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(function(permission){
      console.log("Notification permission: " + permission);
    });
  }

  // Global chart instance
  window.myChart = null;

  // Data and user identity
  let localData = { Mitko: [], Aylin: [] };
  let currentUser = localStorage.getItem("currentUser");
  let currentDiamond = null;
  
  // Radial slider defaults: min=3, max=30 (or 90 in extended mode)
  let minValue = 3;
  let maxValue = 20; // as per your current value
  let crestValue = minValue;
  
  // Stats view: "tokens" (default) or "diamonds"
  let statsView = "tokens";

  // Get radial canvas and context (if present)
  const radialCanvas = document.getElementById("radialSlider");
  let ctx = null;
  if(radialCanvas){
    ctx = radialCanvas.getContext("2d");
  } else {
    console.error("radialSlider canvas not found!");
  }
  
  // Define canvas parameters for radial slider
  const centerX = radialCanvas ? radialCanvas.width / 2 : 0;
  const centerY = radialCanvas ? radialCanvas.height / 2 : 0;
  const radius = 100;
  const lineWidth = 20;

  if(!currentUser){
    $("#welcome-screen").removeClass("d-none");
    $("#main-app").addClass("d-none");
  } else {
    initUser(currentUser);
    $("#welcome-screen").addClass("d-none");
    $("#main-app").removeClass("d-none");
  }

  $(".choose-user").click(function(){
    currentUser = $(this).data("user");
    localStorage.setItem("currentUser", currentUser);
    initUser(currentUser);
    $("#welcome-screen").fadeOut(300, function(){
      $(this).addClass("d-none");
    });
    $("#main-app").removeClass("d-none");
  });

  function initUser(user){
    $("body").removeClass("mitko aylin").addClass(user.toLowerCase());
    let charImg = (user === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
    $("#character-image").attr("src", charImg);
    
    fetchRemoteData(() => {
      updateHistory();
      updateStats();
      updateCompare();
    });
  }
  
  function fetchRemoteData(callback) {
    const sheetUrl = url_tracker;
  
    $.ajax({
      url: sheetUrl,
      method: "GET",
      dataType: "jsonp",  // Required for JSONP
      jsonpCallback: "callback",  // Must match `?callback=callback`
      success: function(data){
        localData = { Mitko: [], Aylin: [] };
        data.forEach(entry => {
          console.log("Raw entry from sheet:", entry); // ✅ see what you’re working with
          console.log("Entry keys:", Object.keys(entry)); // ⛳️ виж дали имаш "ID"
console.log("Raw ID value:", entry.ID, typeof entry.ID);

          if(entry.User && localData[entry.User]){
            const parsed = {
              id: entry.ID && !isNaN(entry.ID) ? Number(entry.ID.toString().trim()) : 0,
              diamond: parseInt(entry.Diamonds),
              crests: parseInt(entry.Crests),
              date: entry.Date,
              timestamp: parseInt(entry.Timestamp) // можеш да го ползваш за други цели
            };
            
            console.log("Parsed entry:", parsed); // ✅ check if any field becomes NaN or undefined
            localData[entry.User].push(parsed);
          } else {
            console.warn("Skipping entry due to missing or invalid User:", entry.User);
          }
        });
        callback();
      },
      error: function(err){
        console.error("Failed to fetch Google Sheets data", err);
      }
    });
  }
  
  

  //===================== Sidebar / Overlay =====================
  $("#open-sidebar").click(function(){
    $("#sidebar").addClass("open");
    $("#overlay").fadeIn(300);
  });
  $("#close-sidebar, #overlay").click(function(e){
    e.stopPropagation();
    $("#sidebar").removeClass("open");
    $("#overlay").fadeOut(300);
  });
  $("#sidebar .nav-link").click(function(e){
    e.preventDefault();
    let tabId = $(this).data("tab");
    $(".tab-content").addClass("d-none");
    $("#tab-" + tabId).removeClass("d-none");
    $("#sidebar").removeClass("open");
    $("#overlay").fadeOut(300);
  });

  //===================== Settings =====================
  $("#change-user").click(function(){
    localStorage.removeItem("currentUser");
    location.reload();
  });
  $("#reset-data").click(function(){
    if(confirm("Are you sure you want to reset all data?")){
      localData = { Mitko: [], Aylin: [] };
      updateHistory();
      updateStats();
      updateCompare();
      alert("Data reset!");
    }
  });

  //===================== Stats Toggle (Tokens/Diamonds) =====================
  $("#toggle-tokens").click(function(){
    statsView = "tokens";
    $(this).addClass("active");
    $("#toggle-diamonds").removeClass("active");
    updateStats();
  });
  $("#toggle-diamonds").click(function(){
    statsView = "diamonds";
    $(this).addClass("active");
    $("#toggle-tokens").removeClass("active");
    updateStats();
  });

  //===================== Draw Option (Free / Diamond) =====================
  $(".draw-option").click(function(){
    const diamond = $(this).data("diamond");
    currentDiamond = diamond;
    const label = (diamond == 0) ? "Free Draw" : diamond + " Diamonds";
    $("#selected-draw-label").text(label);
    if(diamond == 0){
      $("#draw-type-icon").attr("src","assets/mystical_dial.png");
    } else {
      $("#draw-type-icon").attr("src","assets/diamond.png");
    }
    $("#extendedMode").prop("checked", false);
    maxValue = 20;
    crestValue = minValue;
    $("#crestValue").text(minValue);
    if(ctx){ drawRing(minValue); }
    $("#draw-input-screen").removeClass("d-none").css("display","flex").hide().fadeIn(300);
    $("#swipe-zone").hide();
  });

  //===================== Extended Mode Switch =====================
  $("#extendedMode").change(function(){
    maxValue = ($(this).is(":checked")) ? 90 : 20;
    crestValue = Math.max(minValue, Math.min(crestValue, maxValue));
    $("#crestValue").text(crestValue);
    if(ctx){ drawRing(crestValue); }
  });

  //===================== Radial Slider Drawing =====================
  function drawRing(value){
    if(!ctx) return;
    ctx.clearRect(0, 0, radialCanvas.width, radialCanvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    const fraction = (value - minValue) / (maxValue - minValue);
    const angle = fraction * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI/2, angle - Math.PI/2, false);
    ctx.strokeStyle = "#FFBCD9";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
    const endX = centerX + radius * Math.cos(angle - Math.PI/2);
    const endY = centerY + radius * Math.sin(angle - Math.PI/2);
    ctx.beginPath();
    ctx.arc(endX, endY, lineWidth / 1.8, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFC0CB";
    ctx.fill();
  }

  function updateValueFromAngle(angle){
    if(angle < 0){ angle += 2 * Math.PI; }
    const fraction = angle / (2 * Math.PI);
    const raw = minValue + fraction * (maxValue - minValue);
    crestValue = Math.round(raw);
    crestValue = Math.max(minValue, Math.min(crestValue, maxValue));
    $("#crestValue").text(crestValue);
    if(ctx){ drawRing(crestValue); }
  }

  let isDragging = false;
  function pointerDown(e){
    e.preventDefault();
    isDragging = true;
    pointerMove(e);
  }
  function pointerMove(e){
    if(!isDragging) return;
    e.preventDefault();
    let clientX, clientY;
    if(e.touches){
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = radialCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) + Math.PI/2;
    updateValueFromAngle(angle);
  }
  function pointerUp(e){
    isDragging = false;
  }

  radialCanvas.addEventListener("mousedown", pointerDown);
  radialCanvas.addEventListener("mousemove", pointerMove);
  radialCanvas.addEventListener("mouseup", pointerUp);
  radialCanvas.addEventListener("mouseleave", pointerUp);
  radialCanvas.addEventListener("touchstart", pointerDown, { passive: false });
  radialCanvas.addEventListener("touchmove", pointerMove, { passive: false });
  radialCanvas.addEventListener("touchend", pointerUp);
  radialCanvas.addEventListener("touchcancel", pointerUp);

  //===================== Submit / Cancel Draw =====================
  $("#submit-draw").click(function(){
    let entry = {
      diamond: currentDiamond,
      crests: crestValue,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(), // optional—you can omit if you prefer the server timestamp
      User: currentUser
    };
    localData[currentUser].push(entry);
    submitEntryToSheet(entry);
    if("Notification" in window && Notification.permission === "granted"){
      new Notification("Draw Recorded", {
        body: "You gained " + crestValue + " tokens!",
        icon: "assets/token.png"
      });
    }
    $("#draw-input-screen").fadeOut(300, function(){
      $(this).addClass("d-none");
    });
    $("#swipe-zone").show();
    updateHistory();
    updateStats();
    updateCompare();
  });
  
  $("#cancel-draw").click(function(){
    $("#draw-input-screen").fadeOut(300, function(){
      $(this).addClass("d-none");
    });
    $("#swipe-zone").show();
  });

  //===================== Google Sheets Backend Submission =====================
  function submitEntryToSheet(entry){
    // Replace this URL with your published Google Apps Script web app URL.
    const scriptURL = url_tracker;
    $.ajax({
      url: scriptURL,
      method: "POST",
      data: entry,
      success: function(response){
        console.log("Entry submitted to Google Sheets: ", response);
      },
      error: function(err){
        console.error("Error submitting entry to Google Sheets:", err);
      }
    });
  }

  //===================== Update UI Functions =====================
  function updateHistory(){
    let historyList = $("#history-list");
    historyList.empty();
    localData[currentUser].forEach(function(entry){
      let diamondText = (entry.diamond == 0) ? "Free" : entry.diamond + "💎";
      let listItem = `<li class="list-group-item d-flex justify-content-between align-items-center">
      <span>${entry.date}: ${ (entry.diamond == 0 ? "Free" : entry.diamond + "💎") } → ${entry.crests}
        <img src="assets/token.png" class="small-icon">
      </span>
      <button class="btn btn-sm btn-outline-danger delete-entry" data-id="${entry.id}"><i class="fa fa-trash"></i></button>
    </li>`;
      historyList.append(listItem);
    });
    $("#draw-list").empty();
    localData[currentUser].forEach(function(entry){
      let diamondText = (entry.diamond == 0) ? "Free" : entry.diamond + "💎";
      let card = `<div class="card mb-2">
        <div class="card-body">
          <p class="card-text">
            ${entry.date}: ${diamondText} → ${entry.crests}
            <img src="assets/token.png" alt="Token" class="small-icon">
          </p>
        </div>
      </div>`;
      $("#draw-list").append(card);
    });
  }

  function updateStats(){
    let entries = localData[currentUser];
    if(statsView === "tokens"){
      let totalCrests = entries.reduce((sum, entry) => sum + entry.crests, 0);
      $("#stats-summary").html("Total Tokens: <span id='total-crest'>" + totalCrests + "</span> <img src='assets/token.png' alt='Token' class='small-icon'> / 1200");
      let progressPercent = Math.min((totalCrests / 1200) * 100, 100);
      $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");
      let labels = entries.map((_, i) => "Draw " + (i + 1));
      let dataPoints = entries.map(e => e.crests);
      if(window.myChart){ window.myChart.destroy(); }
      window.myChart = new Chart(document.getElementById("stats-chart"), {
        type: "bar",
        data: { labels: labels, datasets: [{ label: "Crests per Draw", data: dataPoints, backgroundColor: "#FFD4D4" }] },
        options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
      });
    } else {
      let totalDiamonds = entries.reduce((sum, entry) => sum + (entry.diamond > 0 ? entry.diamond : 0), 0);
      $("#stats-summary").html("Total Diamonds Spent: <span id='total-crest'>" + totalDiamonds + "</span> <img src='assets/diamond.png' alt='Diamond' class='small-icon'>");
      let progressPercent = Math.min((totalDiamonds / 1200) * 100, 100);
      $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");
      let labels = entries.map((_, i) => "Draw " + (i + 1));
      let dataPoints = entries.map(e => (e.diamond > 0 ? e.diamond : 0));
      if(window.myChart){ window.myChart.destroy(); }
      window.myChart = new Chart(document.getElementById("stats-chart"), {
        type: "bar",
        data: { labels: labels, datasets: [{ label: "Diamonds per Draw", data: dataPoints, backgroundColor: "#FFDEAD" }] },
        options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
      });
    }
  }

  function updateCompare(){
    let mitkoTotal = localData["Mitko"].reduce((sum, e) => sum + e.crests, 0);
    let aylinTotal = localData["Aylin"].reduce((sum, e) => sum + e.crests, 0);
    $("#compare-mitko").text(mitkoTotal + " Crests");
    $("#compare-aylin").text(aylinTotal + " Crests");
  }

  $(document).on("click", ".delete-entry", function() {
    const id = $(this).data("id"); 
    if (confirm("Are you sure you want to delete this entry?")) {
      $.post(url_tracker, {
        action: "delete",
        id: id
      }, function(response) {
        console.log("Delete response:", response);
        fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
        });
      });
    }
  });
  
  
  $(document).on("click", ".edit-entry", function() {
    const timestamp = $(this).data("timestamp");
    const entry = localData[currentUser].find(e => e.timestamp == timestamp);
    if(entry){
      // Prompt could be replaced with a modal
      const newDiamond = prompt("Edit Diamonds:", entry.diamond);
      const newCrests = prompt("Edit Crests:", entry.crests);
      if(newDiamond !== null && newCrests !== null){
        editEntryInSheet({
          timestamp: entry.timestamp,
          diamond: parseInt(newDiamond),
          crests: parseInt(newCrests),
          user: currentUser
        });
      }
    }
  });

  function deleteEntryFromSheet(timestamp){
    $.post(url_tracker, {
      action: "delete",
      timestamp
    }, function(res){
      console.log("Deleted:", res);
      fetchRemoteData(() => {
        updateHistory();
        updateStats();
        updateCompare();
      });
    });
  }
  
  function editEntryInSheet(entry){
    $.post(url_tracker, {
      action: "edit",
      timestamp: entry.timestamp,
      diamond: entry.diamond,
      crests: entry.crests,
      user: entry.user
    }, function(res){
      console.log("Edited:", res);
      fetchRemoteData(() => {
        updateHistory();
        updateStats();
        updateCompare();
      });
    });
  }
  
  

  //===================== Sidebar Swipe Handling ======================
  let startX = 0, currentX = 0, threshold = 50;
  $(document).on("touchstart", function(e){
    let touchX = e.originalEvent.touches[0].clientX;
    startX = (touchX <= 30) ? touchX : null;
  });
  $(document).on("touchmove", function(e){
    currentX = e.originalEvent.touches[0].clientX;
  });
  $(document).on("touchend", function(){
    if(!$("#draw-input-screen").hasClass("d-none")){
      startX = null;
      return;
    }
    if(startX !== null){
      let diffX = currentX - startX;
      if(diffX > threshold && !$("#sidebar").hasClass("open")){
        $("#sidebar").addClass("open");
        $("#overlay").fadeIn(300);
      } else if(diffX < -threshold && $("#sidebar").hasClass("open")){
        $("#sidebar").removeClass("open");
        $("#overlay").fadeOut(300);
      }
    }
    startX = null;
  });
});
