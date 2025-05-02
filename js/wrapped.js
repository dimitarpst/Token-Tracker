$(document).ready(function() {

// --- Start Wrapped View Logic ---
let currentSlideIndex = 0;
let totalSlides = 0; // Will be updated dynamically

// Function to calculate stats needed for Wrapped
function calculateWrappedStats(currentUser, allLocalData) {
    const userEntries = allLocalData[currentUser] || [];
    const otherUser = currentUser === 'Mitko' ? 'Aylin' : 'Mitko';
    const otherUserEntries = allLocalData[otherUser] || [];

    // Base metrics for current user
    const baseMetrics = computeMetrics(userEntries);
    // Base metrics for other user (for comparison)
    const otherBaseMetrics = computeMetrics(otherUserEntries);

    // Initialize counters/variables for calculations
    let tokenFrequency = {};
    let mostFrequentTokenValue = null;
    let maxTokenFreq = 0;
    let drawTypeFrequency = { 0: 0, 25: 0, 50: 0, 450: 0, 500: 0 };
    let mostUsedDrawType = null;
    let maxDrawTypeFreq = 0;
    let doubleDigitDraws = 0;
    // ** Time of Day Counts **
    let timeOfDayCounts = { Morning: 0, Afternoon: 0, Evening: 0, LateNight: 0 };

    if (userEntries.length > 0) {
        userEntries.forEach(entry => {
            // Most Frequent Token
            tokenFrequency[entry.crests] = (tokenFrequency[entry.crests] || 0) + 1;

            // Most Used Draw Type
            if (drawTypeFrequency.hasOwnProperty(entry.diamond)) {
                drawTypeFrequency[entry.diamond]++;
            }

            // Double Digit Calculation
            if (entry.crests >= 10) {
                doubleDigitDraws++;
            }

            // ** Time of Day Calculation **
            const drawHour = new Date(entry.timestamp).getHours();
            if (drawHour >= 6 && drawHour < 12) { // 6 AM to 11:59 AM
                timeOfDayCounts.Morning++;
            } else if (drawHour >= 12 && drawHour < 18) { // 12 PM to 5:59 PM
                timeOfDayCounts.Afternoon++;
            } else if (drawHour >= 18 && drawHour < 23) { // 6 PM to 10:59 PM
                timeOfDayCounts.Evening++;
            } else { // 11 PM to 5:59 AM
                timeOfDayCounts.LateNight++;
            }
        });

        // Find Most Frequent Token (Final calculation)
        let currentMaxTokenFreq = 0;
        for (const token in tokenFrequency) {
            if (tokenFrequency[token] > currentMaxTokenFreq) {
                currentMaxTokenFreq = tokenFrequency[token];
                mostFrequentTokenValue = parseInt(token);
            }
        }
        maxTokenFreq = currentMaxTokenFreq;

        // Find Most Used Draw Type (Final calculation)
        for (const type in drawTypeFrequency) {
            if (drawTypeFrequency[type] > maxDrawTypeFreq) {
                maxDrawTypeFreq = drawTypeFrequency[type];
                mostUsedDrawType = parseInt(type);
            }
        }
    } // End if(userEntries.length > 0)

    // --- Find Peak Draw Time ---
    let peakTimeName = 'Anytime!'; // Default if no draws or perfect tie (unlikely)
    let peakTimeCount = 0;
    let peakTimeIcon = '<i class="fa-regular fa-clock fa-3x text-white-50"></i>'; // Default icon
    const timeEntries = Object.entries(timeOfDayCounts); // [ ['Morning', count], ['Afternoon', count], ... ]

    if (timeEntries.some(entry => entry[1] > 0)) { // Check if any draws exist
        timeEntries.sort((a, b) => b[1] - a[1]); // Sort descending by count
        peakTimeName = timeEntries[0][0]; // Name of the block with the highest count
        peakTimeCount = timeEntries[0][1]; // The highest count

        // Assign Icon based on peak time
        switch (peakTimeName) {
            case 'Morning':
                peakTimeIcon = '<i class="fa-solid fa-sun fa-3x text-warning"></i>';
                break;
            case 'Afternoon':
                peakTimeIcon = '<i class="fa-solid fa-cloud-sun fa-3x text-info"></i>';
                break;
            case 'Evening':
                peakTimeIcon = '<i class="fa-solid fa-cloud-moon fa-3x text-light"></i>';
                break;
            case 'LateNight':
                peakTimeIcon = '<i class="fa-solid fa-moon fa-3x text-secondary"></i>';
                peakTimeName = "Late Night"; // Add space for display
                break;
        }
    }


    // --- Format Most Used Draw Type Text/Icon ---
    let mostUsedDrawText = 'N/A';
    let mostUsedDrawIconHtml = '<i class="fa-solid fa-question fa-3x text-white-50"></i>';
    if (mostUsedDrawType !== null) {
        const drawImgClass = 'img-fluid my-2'; const iconSize = '80px';
        switch (mostUsedDrawType) {
            case 0: mostUsedDrawText = 'Free Draw'; mostUsedDrawIconHtml = `<img src="assets/mystical_dial.png" alt="Free Draw" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 25: mostUsedDrawText = '25 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 50: mostUsedDrawText = '50 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 450: mostUsedDrawText = '450 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw (10x)'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 500: mostUsedDrawText = '500 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw (10x)'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
        }
    }

    // --- Determine Draw Personality ---
    let personality = "The Balanced Tracker";
    if (baseMetrics.totalDraws > 5) {
        if (baseMetrics.totalFree > baseMetrics.totalDiamondDraws * 2) { personality = "The F2P Strategist"; }
        else if (baseMetrics.totalDiamondDraws > baseMetrics.totalFree * 2) {
            if (baseMetrics.tokensPerDraw > 10.5) { personality = "The Lucky Spender"; }
            else if (drawTypeFrequency[450] + drawTypeFrequency[500] > baseMetrics.totalDraws / 4) { personality = "The 10-Pull Enthusiast"; }
            else { personality = "The Diamond Investor"; }
        } else if (baseMetrics.tokensPerDraw >= 11) { personality = "The Token Magnet"; }
        else if (baseMetrics.tokensPerDraw < 7.5) { personality = "The Persistent Optimist"; }
        else if (drawTypeFrequency[25] > baseMetrics.totalDraws / 4 && baseMetrics.totalFree < baseMetrics.totalDiamondDraws) { personality = "The Daily Deal Hunter"; }
    } else if (baseMetrics.totalDraws > 0) { personality = "The Tracker Starter"; }
    else { personality = "The Observer"; }


    // --- Format Best Draw Cost ---
    let bestDrawCostHTML = 'N/A'; if (baseMetrics.bestDraw) { if (baseMetrics.bestDraw.diamond === 0) { bestDrawCostHTML = '<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw"> Free'; } else { bestDrawCostHTML = `${baseMetrics.bestDraw.diamond} <img src='assets/diamond.png' class='small-icon' alt='diamond'>`; } }

    // --- Calculate Percentages ---
    const totalDrawsOverall = baseMetrics.totalDraws || 1; // Avoid division by zero
    const freePercent = ((baseMetrics.totalFree / totalDrawsOverall) * 100).toFixed(1);
    const diamondPercent = ((baseMetrics.totalDiamondDraws / totalDrawsOverall) * 100).toFixed(1);
    const doubleDigitPercent = baseMetrics.totalDraws > 0 ? ((doubleDigitDraws / baseMetrics.totalDraws) * 100).toFixed(1) : "0.0";

    // --- Start NEW Calculations for Missing Slides ---

    // 1. Thinking Alike (Sync Count - Slide 11)
    let syncCount = 0;
    const syncTimeWindow = 10 * 60 * 1000; // 10 minutes in milliseconds
    if (userEntries.length > 0 && otherUserEntries.length > 0) {
        const sortedUserEntries = [...userEntries].sort((a, b) => a.timestamp - b.timestamp);
        const sortedOtherEntries = [...otherUserEntries].sort((a, b) => a.timestamp - b.timestamp);

        // Refined approach: count pairs only once
        syncCount = 0;
        const processedOtherIndices = new Set(); // Keep track of other entries already paired
        sortedUserEntries.forEach(uEntry => {
            for (let i = 0; i < sortedOtherEntries.length; i++) {
                // Skip if this 'other' entry was already part of a pair
                if (processedOtherIndices.has(i)) continue;

                const oEntry = sortedOtherEntries[i];
                if (Math.abs(uEntry.timestamp - oEntry.timestamp) <= syncTimeWindow) {
                    syncCount++;
                    processedOtherIndices.add(i); // Mark this 'other' entry as used
                    break; // Move to the next 'user' entry once a pair is found
                }
            }
        });
    }

    // 2. Teamwork (Combined Totals - Slide 12)
    const combinedDraws = baseMetrics.totalDraws + otherBaseMetrics.totalDraws;
    const combinedTokens = baseMetrics.totalCrests + otherBaseMetrics.totalCrests;

    // 3. Superlatives Basis (Slide 13) - Calculate the *actual* winners first
    const allEntries = [...userEntries, ...otherUserEntries];
    let actualSuperlativeWinners = {
        nightOwl: 'N/A',
        freebie: 'N/A',
        lucky: 'N/A',
        daily: 'N/A',
        jackpot: 'N/A'
    };

    if (allEntries.length > 0) {
        // Helper function to count draws in a time range
        const countDrawsInHourRange = (entries, startHour, endHour) => {
             return entries.filter(e => {
                const hour = new Date(e.timestamp).getHours();
                if (startHour < endHour) { // Normal range (e.g., 6 to 12)
                     return hour >= startHour && hour < endHour;
                } else { // Range wraps around midnight (e.g., 23 to 6)
                     return hour >= startHour || hour < endHour;
                }
             }).length;
        };

        // Night Owl (e.g., 11 PM - 5:59 AM) - Higher count wins
        const mitkoNightDraws = countDrawsInHourRange(userEntries, 23, 6);
        const aylinNightDraws = countDrawsInHourRange(otherUserEntries, 23, 6);
        if (mitkoNightDraws > aylinNightDraws) actualSuperlativeWinners.nightOwl = currentUser;
        else if (aylinNightDraws > mitkoNightDraws) actualSuperlativeWinners.nightOwl = otherUser;
        else if (mitkoNightDraws > 0) actualSuperlativeWinners.nightOwl = 'Both'; // Tie

        // Freebie (% Free Draws) - Higher percentage wins (min 1 draw needed)
        const mitkoFreePercent = baseMetrics.totalDraws > 0 ? (baseMetrics.totalFree / baseMetrics.totalDraws) : -1;
        const aylinFreePercent = otherBaseMetrics.totalDraws > 0 ? (otherBaseMetrics.totalFree / otherBaseMetrics.totalDraws) : -1;
        if (mitkoFreePercent > aylinFreePercent) actualSuperlativeWinners.freebie = currentUser;
        else if (aylinFreePercent > mitkoFreePercent) actualSuperlativeWinners.freebie = otherUser;
        else if (mitkoFreePercent >= 0) actualSuperlativeWinners.freebie = 'Both'; // Tie

        // Lucky (Avg Tokens/Draw) - Higher average wins (min 1 draw needed)
        const mitkoAvg = baseMetrics.totalDraws > 0 ? baseMetrics.tokensPerDraw : -1;
        const aylinAvg = otherBaseMetrics.totalDraws > 0 ? otherBaseMetrics.tokensPerDraw : -1;
        if (mitkoAvg > aylinAvg) actualSuperlativeWinners.lucky = currentUser;
        else if (aylinAvg > mitkoAvg) actualSuperlativeWinners.lucky = otherUser;
        else if (mitkoAvg >= 0) actualSuperlativeWinners.lucky = 'Both'; // Tie

        // Daily Deal (Count of 25 Diamond Draws) - Higher count wins
        const mitkoDailyCount = userEntries.filter(e => e.diamond === 25).length;
        const aylinDailyCount = otherUserEntries.filter(e => e.diamond === 25).length;
        if (mitkoDailyCount > aylinDailyCount) actualSuperlativeWinners.daily = currentUser;
        else if (aylinDailyCount > mitkoDailyCount) actualSuperlativeWinners.daily = otherUser;
        else if (mitkoDailyCount > 0) actualSuperlativeWinners.daily = 'Both'; // Tie

        // Jackpot (Count of 20+ Token Draws) - Higher count wins
        const mitkoJackpotCount = userEntries.filter(e => e.crests >= 20).length;
        const aylinJackpotCount = otherUserEntries.filter(e => e.crests >= 20).length;
        if (mitkoJackpotCount > aylinJackpotCount) actualSuperlativeWinners.jackpot = currentUser;
        else if (aylinJackpotCount > mitkoJackpotCount) actualSuperlativeWinners.jackpot = otherUser;
        else if (mitkoJackpotCount > 0) actualSuperlativeWinners.jackpot = 'Both'; // Tie
    }

    // // 4. Trailblazer (First Draw - Slide 14)
    // let trailblazerName = 'N/A';
    // if (allEntries.length > 0) {
    //     let firstTimestamp = Infinity;
    //     allEntries.forEach(entry => {
    //         if (entry.timestamp < firstTimestamp) {
    //             firstTimestamp = entry.timestamp;
    //             trailblazerName = entry.User; // User who made the first draw
    //         }
    //     });
    // }

    // --- Manually Set Trailblazer ---
    const manualTrailblazerName = 'Aylin'; // <<< SET WINNER HERE ('Aylin' or 'Mitko')
    // --- End Manual Setting ---

    // --- End NEW Calculations ---

    // --- Structure the final result object ---
    return {
        // Base user stats
        currentUser: currentUser,
        userEntriesExist: userEntries.length > 0,
        totalDraws: baseMetrics.totalDraws,
        totalCrests: baseMetrics.totalCrests,
        bestDrawCrests: baseMetrics.bestDraw ? baseMetrics.bestDraw.crests : null,
        bestDrawCostHTML: bestDrawCostHTML,
        mostFrequentTokenValue: mostFrequentTokenValue,
        mostFrequentTokenCount: maxTokenFreq,
        totalFree: baseMetrics.totalFree,
        totalDiamondDraws: baseMetrics.totalDiamondDraws,
        freeDrawPercent: freePercent,
        diamondDrawPercent: diamondPercent,
        mostUsedDrawTextHTML: mostUsedDrawText,
        mostUsedDrawIconHtml: mostUsedDrawIconHtml,
        avgTokens: baseMetrics.tokensPerDraw.toFixed(2),
        luckStatus: baseMetrics.luckStatus,
        personality: personality,
        totalDiamondsSpent: baseMetrics.totalDiamondsSpent.toFixed(0),
        doubleDigitDrawCount: doubleDigitDraws,
        doubleDigitDrawPercent: doubleDigitPercent,
        peakDrawTimeName: peakTimeName,
        peakDrawTimeCount: peakTimeCount,
        peakDrawTimeIconHTML: peakTimeIcon,

        // Other User Stats
        otherUser: otherUser,
        otherTotalDraws: otherBaseMetrics.totalDraws,
        otherTotalCrests: otherBaseMetrics.totalCrests,
        otherAvgTokens: otherBaseMetrics.tokensPerDraw.toFixed(2),

        // Newly added stats for specific slides
        syncCount: syncCount,
        combinedDraws: combinedDraws,
        combinedTokens: combinedTokens,
        actualSuperlativeWinners: actualSuperlativeWinners,
        trailblazerName: manualTrailblazerName
    };
}


// Function to show a specific slide (Handles navigation and progress)
function showWrappedSlide(index) {
    const $slides = $('#wrapped-slides-container .wrapped-slide');
    totalSlides = $slides.length;

    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;

    const $currentActive = $slides.filter('.active-slide');
    const $nextActive = $slides.eq(index);

    if ($currentActive.length && $currentActive.data('slide-index') !== index) {
        const direction = index > $currentActive.data('slide-index') ? 'next' : 'prev';
        // Apply exiting class to the current slide
        $currentActive.removeClass('active-slide').addClass(direction === 'next' ? 'exiting-next' : 'exiting-prev');
        // Remove exiting class after animation (match transition duration)
        setTimeout(() => {
            $currentActive.removeClass('exiting-next exiting-prev');
        }, 500); // Duration should match CSS transition
    }

    // Add active class to the target slide
    $nextActive.addClass('active-slide');
    currentSlideIndex = index;

    // Update navigation button states
    $('#prev-slide-btn').prop('disabled', currentSlideIndex === 0);
    $('#next-slide-btn').prop('disabled', currentSlideIndex === totalSlides - 1);

    // Update progress bar
    const progressPercent = totalSlides > 0 ? ((currentSlideIndex + 1) / totalSlides) * 100 : 0;
    // Ensure the inner progress bar element exists
    if ($('.wrapped-progress-bar .progress-inner').length === 0) {
        $('.wrapped-progress-bar').html('<div class="progress-inner"></div>');
    }
    $('.wrapped-progress-bar .progress-inner').css('width', progressPercent + '%');
}

// --- Event Handlers ---

// Button on Home tab to show Wrapped
$('#show-wrapped-btn').click(function() {
     if (!localData || !localData[currentUser]) {
         alert(`Please wait for data to load or select a user.`);
         return;
     }
     if (!Array.isArray(localData[currentUser]) || localData[currentUser].length === 0) {
         alert(`No draw data found for ${currentUser} to generate a summary.`);
         return;
     }

    const stats = calculateWrappedStats(currentUser, localData);
    if (!stats) {
        alert("Could not generate summary stats. Please try again later.");
        return;
    }
    console.log("Wrapped Stats:", stats); // Good for debugging

    // --- Define image sources *before* using them ---
    let userImgSrc = (currentUser === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
    let otherUserImgSrc = (stats.otherUser === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";

    // --- Populate ALL Slides Sequentially ---

    // Slide 0: Intro
    $("#wrapped-user-img").attr("src", userImgSrc);
    $("#wrapped-user-name-intro").text(stats.currentUser);

    // Slide 1: Total Draws
    $("#wrapped-total-draws").text(stats.totalDraws);

    // Slide 2: Total Tokens
    $("#wrapped-total-tokens").text(stats.totalCrests);

    // Slide 3: Best Draw
    $("#wrapped-best-draw-crests").text(stats.bestDrawCrests !== null ? stats.bestDrawCrests : 'N/A');
    $("#wrapped-best-draw-cost").html(stats.bestDrawCostHTML); // Use .html() for image tags

    // Slide 4: Frequent Token
    $("#wrapped-freq-token-value").text(stats.mostFrequentTokenValue !== null ? stats.mostFrequentTokenValue : '-');
    $("#wrapped-freq-token-count").text(stats.mostFrequentTokenCount);

    // Slide 5: Draw Style Breakdown
    $("#wrapped-free-draws").text(stats.totalFree);
    $("#wrapped-diamond-draws").text(stats.totalDiamondDraws);
    $("#wrapped-free-percent").text(stats.freeDrawPercent);
    $("#wrapped-diamond-percent").text(stats.diamondDrawPercent);

    // Slide 6: Go-To Draw
    $("#wrapped-most-used-draw-icon").html(stats.mostUsedDrawIconHtml); // Use .html() for image tags
    $("#wrapped-most-used-draw-text").html(stats.mostUsedDrawTextHTML); // Use .html() for image tags

    // Slide 7: Luck Score
    $("#wrapped-luck-status").text(stats.luckStatus);
    $("#wrapped-avg-tokens").text(stats.avgTokens);

    // Slide 8: Personality
    $("#wrapped-personality").text(stats.personality);

    // Slide 9: Peak Draw Time
    $("#wrapped-peak-time-icon").html(stats.peakDrawTimeIconHTML); // Use .html() for icon tag
    $("#wrapped-peak-time-name").text(stats.peakDrawTimeName);
    $("#wrapped-peak-time-desc").text(`You logged the most draws during the ${stats.peakDrawTimeName.toLowerCase()}!`);

    // Slide 10: Double Digit Dominance
    $("#wrapped-double-digit-percent").text(stats.doubleDigitDrawPercent);
    $("#wrapped-double-digit-count").text(stats.doubleDigitDrawCount);

    // Slide 11: Thinking Alike (Syncing Draws)
    $("#wrapped-sync-other-name").text(stats.otherUser);
    $("#wrapped-sync-count").text(stats.syncCount);
    // Adjust text based on the count
    if (stats.syncCount === 0) {
        $("#wrapped-slide[data-slide-index='11'] .slide-content p:last-child").text("Even when drawing apart, you were working towards the same goal! 😊");
    } else {
         $("#wrapped-slide[data-slide-index='11'] .slide-content p:last-child").text(`times! Were you drawing together? 😉`); // Default text if count > 0
    }

    // Slide 12: Teamwork
    $("#wrapped-combined-draws").text(stats.combinedDraws);
    $("#wrapped-combined-tokens").text(stats.combinedTokens);

    // Slide 13: Superlatives (Apply Aylin Favoritism Here)
    let superlativeWinners = { ...stats.actualSuperlativeWinners }; // Copy actual winners
    const aylinName = 'Aylin'; // Define names clearly
    const mitkoName = 'Mitko';

    // --- Apply the override logic ---
    superlativeWinners.freebie = aylinName; // Give Freebie to Aylin
    superlativeWinners.lucky = aylinName; // Give Lucky to Aylin
    superlativeWinners.jackpot = aylinName; // Give Jackpot to Aylin

    // Assign Night Owl and Daily based on who didn't get the others, or default to Mitko
    // If Aylin actually won Night Owl, give it to Mitko. If Mitko won, keep it Mitko. If tie, give to Mitko.
    if (superlativeWinners.nightOwl === aylinName || superlativeWinners.nightOwl === 'Both' || superlativeWinners.nightOwl === 'N/A') {
        superlativeWinners.nightOwl = mitkoName;
    } // Implicitly keeps Mitko if he won

    // If Aylin actually won Daily, give it to Mitko. If Mitko won, keep it Mitko. If tie, give to Mitko.
    if (superlativeWinners.daily === aylinName || superlativeWinners.daily === 'Both' || superlativeWinners.daily === 'N/A') {
        superlativeWinners.daily = mitkoName;
    }// Implicitly keeps Mitko if he won

    // Ensure Aylin always has her assigned ones even if calculations resulted in N/A initially
    if (superlativeWinners.freebie === 'N/A') superlativeWinners.freebie = aylinName;
    if (superlativeWinners.lucky === 'N/A') superlativeWinners.lucky = aylinName;
    if (superlativeWinners.jackpot === 'N/A') superlativeWinners.jackpot = aylinName;

    // --- Populate the HTML using the *modified* superlativeWinners ---
    $("#wrapped-likely-nightowl").text(superlativeWinners.nightOwl);
    $("#wrapped-likely-freebie").text(superlativeWinners.freebie);
    $("#wrapped-likely-lucky").text(superlativeWinners.lucky);
    $("#wrapped-likely-daily").text(superlativeWinners.daily);
    $("#wrapped-likely-jackpot").text(superlativeWinners.jackpot);

    // Slide 14: Trailblazer
    $("#wrapped-trailblazer-name").text(stats.trailblazerName);
    // Adjust text based on winner
    if (stats.trailblazerName === 'Aylin') {
        $("#wrapped-slide[data-slide-index='14'] .slide-content p:last-child").text("for getting the adventure started right away! Leading the charge! 🥳");
    } else if (stats.trailblazerName === 'Mitko') {
        $("#wrapped-slide[data-slide-index='14'] .slide-content p:last-child").text("for lighting the signal flare... making sure everything was ready for Aylin! 😉");
    } else {
        $("#wrapped-slide[data-slide-index='14'] .slide-content p:last-child").text("Hmm, couldn't determine the first draw!");
    }

    // Slide 15: Comparison (How You Stack Up)
    $("#wrapped-compare-user-img").attr("src", userImgSrc);
    $("#wrapped-compare-user-name").text(stats.currentUser);
    $("#wrapped-compare-user-draws").text(stats.totalDraws);
    $("#wrapped-compare-user-tokens").text(stats.totalCrests);
    $("#wrapped-compare-user-avg").text(stats.avgTokens);
    $("#wrapped-compare-other-img").attr("src", otherUserImgSrc);
    $("#wrapped-compare-other-name").text(stats.otherUser);
    $("#wrapped-compare-other-draws").text(stats.otherTotalDraws);
    $("#wrapped-compare-other-tokens").text(stats.otherTotalCrests);
    $("#wrapped-compare-other-avg").text(stats.otherAvgTokens);

    // Slide 16: Outro - No dynamic data needed

    // --- Show the view ---
    currentSlideIndex = 0; // Reset to first slide
    $('#wrapped-slides-container .wrapped-slide').removeClass('active-slide exiting-next exiting-prev'); // Clear states
    $('#wrapped-view').removeClass('d-none').hide().fadeIn(300, function() {
        showWrappedSlide(0); // Show the first slide properly after fade-in
    });
});

// Close button for Wrapped view
$('#close-wrapped-btn, #finish-wrapped-btn').click(function() {
    $('#wrapped-view').fadeOut(300, function() {
        $(this).addClass('d-none');
        // Reset slide states for next time
        $('#wrapped-slides-container .wrapped-slide').removeClass('active-slide exiting-next exiting-prev');
        $('.wrapped-progress-bar .progress-inner').css('width', '0%');
        // Ensure first slide is visually ready for next open, though showWrappedSlide(0) will handle activation
        $('#wrapped-slides-container .wrapped-slide').eq(0).addClass('active-slide');
    });
});

// Navigation buttons
$('#next-slide-btn').click(function() { showWrappedSlide(currentSlideIndex + 1); });
$('#prev-slide-btn').click(function() { showWrappedSlide(currentSlideIndex - 1); });

// --- End Wrapped View Logic ---
});