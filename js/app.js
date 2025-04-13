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
  
  // Radial slider defaults
  let minValue = 3;
  let maxValue = 20;
  let crestValue = minValue;
  
  // Stats view: "tokens" (default) or "diamonds"
  let statsView = "tokens";

  // Get radial canvas and context
  const radialCanvas = document.getElementById("radialSlider");
  let ctx = radialCanvas ? radialCanvas.getContext("2d") : null;
  
  // Define canvas parameters for radial slider
  const centerX = radialCanvas ? radialCanvas.width / 2 : 0;
  const centerY = radialCanvas ? radialCanvas.height / 2 : 0;
  const radius = 100;
  const lineWidth = 20;

  // Check which user is active
  if(!currentUser){
    $("#welcome-screen").removeClass("d-none");
    $("#main-app").addClass("d-none");
  } else {
    initUser(currentUser);
    $("#welcome-screen").addClass("d-none");
    $("#main-app").removeClass("d-none");
  }

  //===================== USER SELECTION =====================
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
  
  //===================== FETCH REMOTE DATA =====================
  function fetchRemoteData(callback) {
    $.ajax({
      url: url_tracker,
      method: "GET",
      dataType: "jsonp",  // Required for JSONP
      jsonpCallback: "callback",
      success: function(data){
        // Reset local data
        localData = { Mitko: [], Aylin: [] };

        data.forEach(entry => {
          // Only process valid user & user array
          if(entry.User && localData[entry.User]){
            // Convert the "Timestamp" (human-readable string) to a numeric ms value
            const timestampMs = new Date(entry.Timestamp).getTime();

            // Parse your row fields
            const parsed = {
              // The ID column (Entry_Id) is your unique row ID
              id: String(entry.Entry_Id), 
              diamond: parseInt(entry.Diamonds) || 0,
              crests: parseInt(entry.Crests) || 0,
              // We'll store the numeric ms for easy math
              timestamp: timestampMs,
              user: entry.User
            };

            console.log("Parsed entry:", parsed); 
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

  //===================== SIDEBAR / OVERLAY =====================
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

  //===================== SETTINGS =====================
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

  //===================== STATS TOGGLE =====================
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

  //===================== DRAW OPTION (FREE / DIAMOND) =====================
  $(".draw-option").click(function(){
    const diamond = $(this).data("diamond");
    currentDiamond = diamond;
    const label = (diamond === 0) ? "Free Draw" : diamond + " Diamonds";
    $("#selected-draw-label").text(label);

    $("#draw-type-icon").attr("src", diamond === 0 
      ? "assets/mystical_dial.png"
      : "assets/diamond.png"
    );

    $("#extendedMode").prop("checked", false);
    maxValue = 20;
    crestValue = minValue;
    $("#crestValue").text(minValue);

    if(ctx){ drawRing(minValue); }
    $("#draw-input-screen").removeClass("d-none").css("display","flex").hide().fadeIn(300);
    $("#swipe-zone").hide();
  });

  //===================== EXTENDED MODE SWITCH =====================
  $("#extendedMode").change(function(){
    maxValue = $(this).is(":checked") ? 90 : 20;
    crestValue = Math.max(minValue, Math.min(crestValue, maxValue));
    $("#crestValue").text(crestValue);
    if(ctx){ drawRing(crestValue); }
  });

  //===================== RADIAL SLIDER =====================
  function drawRing(value){
    if(!ctx) return;
    ctx.clearRect(0, 0, radialCanvas.width, radialCanvas.height);

    // Background ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Filled arc
    const fraction = (value - minValue) / (maxValue - minValue);
    const angle = fraction * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI/2, angle - Math.PI/2, false);
    ctx.strokeStyle = "#FFBCD9";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Knob circle
    const endX = centerX + radius * Math.cos(angle - Math.PI/2);
    const endY = centerY + radius * Math.sin(angle - Math.PI/2);
    ctx.beginPath();
    ctx.arc(endX, endY, lineWidth / 1.8, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFC0CB";
    ctx.fill();
  }

  function updateValueFromAngle(angle){
    if(angle < 0) { angle += 2 * Math.PI; }
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

  radialCanvas?.addEventListener("mousedown", pointerDown);
  radialCanvas?.addEventListener("mousemove", pointerMove);
  radialCanvas?.addEventListener("mouseup", pointerUp);
  radialCanvas?.addEventListener("mouseleave", pointerUp);
  radialCanvas?.addEventListener("touchstart", pointerDown, { passive: false });
  radialCanvas?.addEventListener("touchmove", pointerMove, { passive: false });
  radialCanvas?.addEventListener("touchend", pointerUp);
  radialCanvas?.addEventListener("touchcancel", pointerUp);

  //===================== SUBMIT / CANCEL DRAW =====================
  $("#submit-draw").click(function(){
    let entry = {
      diamond: currentDiamond,
      crests: crestValue,
      // We'll just store a numeric timestamp
      timestamp: Date.now(),
      User: currentUser
    };

    // Add to local array
    localData[currentUser].push({
      id: null, // server will assign real Entry_Id
      diamond: entry.diamond,
      crests: entry.crests,
      user: currentUser,
      timestamp: entry.timestamp
    });

    // Send to Google Sheets
    submitEntryToSheet(entry);

    // Optional browser notification
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

  //===================== SHEETS BACKEND SUBMISSION =====================
  function submitEntryToSheet(entry){
    $.ajax({
      url: url_tracker,
      method: "POST",
      data: {
        diamond: entry.diamond,
        crests: entry.crests,
        timestamp: entry.timestamp,
        User: entry.User
      },
      success: function(response){
        console.log("Entry submitted to Google Sheets: ", response);
      },
      error: function(err){
        console.error("Error submitting entry to Google Sheets:", err);
      }
    });
  }

  //===================== UPDATE UI FUNCTIONS =====================
  function updateHistory(){
    let historyList = $("#history-list");
    historyList.empty();

    localData[currentUser].forEach(function(entry){
      // Show date from the numeric timestamp
      let drawDate = new Date(entry.timestamp).toLocaleDateString();

      // If diamond=0, show mystical dial icon. Otherwise show diamonds + 💎
      let diamondText = (entry.diamond === 0)
        ? `<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw">`
        : entry.diamond + "💎";

      let listItem = `
        <li class="list-group-item d-flex align-items-center">
          <span class="me-auto">
            ${drawDate}: ${diamondText} → ${entry.crests}
            <img src="assets/token.png" class="small-icon">
          </span>
          <button
            class="btn btn-sm btn-outline-danger delete-entry"
            data-id="${entry.id}"
          >
            <i class="fa fa-trash"></i>
          </button>
          <button
            class="btn btn-sm btn-outline-primary edit-entry ms-2"
            data-id="${entry.id}"
          >
            <i class="fa fa-edit"></i>
          </button>
        </li>`;
      historyList.append(listItem);
    });

    // For the "Home" tab, show the same info
    $("#draw-list").empty();
    localData[currentUser].forEach(function(entry){
      let drawDate = new Date(entry.timestamp).toLocaleDateString();
      let diamondText = (entry.diamond === 0)
        ? `<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw">`
        : entry.diamond + "💎";

      let card = `
        <div class="card mb-2">
          <div class="card-body d-flex align-items-center">
            <p class="card-text m-0 me-auto">
              ${drawDate}: ${diamondText} → ${entry.crests}
              <img src="assets/token.png" alt="Token" class="small-icon">
            </p>
            <button
              class="btn btn-sm btn-outline-danger delete-entry"
              data-id="${entry.id}"
            >
              <i class="fa fa-trash"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-primary edit-entry ms-2"
              data-id="${entry.id}"
            >
              <i class="fa fa-edit"></i>
            </button>
          </div>
        </div>`;
      $("#draw-list").append(card);
    });
  }

  function updateStats(){
    let entries = localData[currentUser];
    if(!entries) return;

    if(statsView === "tokens"){
      let totalCrests = entries.reduce((sum, e) => sum + e.crests, 0);
      $("#stats-summary").html(`
        Total Tokens:
        <span id='total-crest'>${totalCrests}</span>
        <img src='assets/token.png' alt='Token' class='small-icon'>
        / 1200
      `);

      let progressPercent = Math.min((totalCrests / 1200) * 100, 100);
      $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");

      let labels = entries.map((_, i) => "Draw " + (i + 1));
      let dataPoints = entries.map(e => e.crests);

      if(window.myChart){ window.myChart.destroy(); }
      window.myChart = new Chart(document.getElementById("stats-chart"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Crests per Draw",
            data: dataPoints,
            backgroundColor: "#FFD4D4"
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false } }
        }
      });

    } else {
      let totalDiamonds = entries.reduce((sum, e) => sum + (e.diamond > 0 ? e.diamond : 0), 0);
      $("#stats-summary").html(`
        Total Diamonds Spent:
        <span id='total-crest'>${totalDiamonds}</span>
        <img src='assets/diamond.png' alt='Diamond' class='small-icon'>
      `);

      let progressPercent = Math.min((totalDiamonds / 1200) * 100, 100);
      $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");

      let labels = entries.map((_, i) => "Draw " + (i + 1));
      let dataPoints = entries.map(e => (e.diamond > 0 ? e.diamond : 0));

      if(window.myChart){ window.myChart.destroy(); }
      window.myChart = new Chart(document.getElementById("stats-chart"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Diamonds per Draw",
            data: dataPoints,
            backgroundColor: "#FFDEAD"
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  function updateCompare(){
    let mitkoTotal = localData["Mitko"].reduce((sum, e) => sum + e.crests, 0);
    let aylinTotal = localData["Aylin"].reduce((sum, e) => sum + e.crests, 0);
    $("#compare-mitko").text(mitkoTotal + " Crests");
    $("#compare-aylin").text(aylinTotal + " Crests");
  }

  //===================== DELETE ENTRY =====================
  $(document).on("click", ".delete-entry", function() {
    const id = $(this).data("id"); 
    if(!id) {
      console.warn("No ID found on this entry — cannot delete from sheet.");
      return;
    }

    if (confirm("Are you sure you want to delete this entry?")) {
      $.post(url_tracker, {
        action: "delete",
        id: id
      }, function(response) {
        console.log("Delete response:", response);
        // Refresh from server
        fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
        });
      });
    }
  });

  //===================== EDIT ENTRY =====================
  $(document).on("click", ".edit-entry", function() {
    // We pass the row ID to the server to find and update the row
    const id = $(this).data("id");
    let entry = localData[currentUser].find(e => String(e.id) === String(id));
    if(!entry) {
      console.warn("Could not find local entry with id:", id);
      return;
    }

    const newDiamond = prompt("Edit Diamonds:", entry.diamond);
    const newCrests = prompt("Edit Crests:", entry.crests);

    if(newDiamond !== null && newCrests !== null){
      // Update on the server
      $.post(url_tracker, {
        action: "edit",
        id: entry.id,
        diamond: parseInt(newDiamond),
        crests: parseInt(newCrests),
        user: currentUser
      }, function(res){
        console.log("Edited:", res);
        // Refresh from server to get updated data
        fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
        });
      });
    }
  });

  //===================== SWIPE HANDLING FOR SIDEBAR =====================
  let startX = 0, currentX = 0, threshold = 50;
  $(document).on("touchstart", function(e){
    let touchX = e.originalEvent.touches[0].clientX;
    // Only track if near left edge
    startX = (touchX <= 30) ? touchX : null;
  });
  $(document).on("touchmove", function(e){
    currentX = e.originalEvent.touches[0].clientX;
  });
  $(document).on("touchend", function(){
    // Don't handle swipe if the "draw input screen" is open
    if(!$("#draw-input-screen").hasClass("d-none")){
      startX = null;
      return;
    }
    if(startX !== null){
      let diffX = currentX - startX;
      if(diffX > threshold && !$("#sidebar").hasClass("open")){
        // Open sidebar
        $("#sidebar").addClass("open");
        $("#overlay").fadeIn(300);
      } else if(diffX < -threshold && $("#sidebar").hasClass("open")){
        // Close sidebar
        $("#sidebar").removeClass("open");
        $("#overlay").fadeOut(300);
      }
    }
    startX = null;
  });
});
