let rowsData = [];
let filteredRowsData = [];
let currentIndex = 0;
let sheetModal;
let celebrationTimeoutId;

function getCellValue(row, index) {
    if (!row || !row.c || !row.c[index] || row.c[index].v === null || row.c[index].v === undefined) {
        return "";
    }
    return String(row.c[index].v).trim();
}

function parseDurationMs(rawDuration) {
    const parsed = parseInt(rawDuration, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return 10000;
    }
    return parsed * 1000;
}

function normalizeEffect(rawEffect) {
    const effect = (rawEffect || "").toLowerCase().trim();
    if (effect === "stars" || effect === "fireworks" || effect === "both") {
        return effect;
    }
    return "both";
}

function toMonthDay(rawDate) {
    const value = (rawDate || "").trim();
    if (!value) return "";

    // Already MM-DD
    if (/^\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    // Google date literal: Date(2026,2,12)
    if (value.startsWith("Date(")) {
        const parts = value.match(/\d+/g);
        if (parts && parts.length >= 3) {
            const month = String(parseInt(parts[1], 10) + 1).padStart(2, "0");
            const day = String(parseInt(parts[2], 10)).padStart(2, "0");
            return `${month}-${day}`;
        }
    }

    // Human readable dates like "March 12, 2026"
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${month}-${day}`;
    }

    return "";
}

function isCelebrationDateMatch(rawDate) {
    const raw = (rawDate || "").trim();
    if (!raw) return false;

    // First try whole value (supports "March 12, 2026" and "Date(2026,2,12)")
    const singleDate = toMonthDay(raw);
    let configuredDates = [];

    if (singleDate) {
        configuredDates = [singleDate];
    } else {
        // Fallback for multiple values like "03-12,03-20"
        configuredDates = raw
            .split(",")
            .map(d => toMonthDay(d))
            .filter(Boolean);
    }

    const today = getTodayDateString();
    return configuredDates.includes(today);
}

function parseCelebrationConfig(configRow) {
    return {
        celebrationDate: getCellValue(configRow, 0),
        wishText: getCellValue(configRow, 1),
        durationMs: parseDurationMs(getCellValue(configRow, 2)),
        effect: normalizeEffect(getCellValue(configRow, 3))
    };
}

function isConfigRow(row) {
    const durationRaw = getCellValue(row, 2);
    const effectRaw = getCellValue(row, 3);
    const durationLooksValid = /^\d+$/.test(durationRaw);
    const effectLooksValid = ["stars", "fireworks", "both"].includes(effectRaw.toLowerCase());

    // Config row is identified by duration/effect pattern in col C/D
    return durationLooksValid || effectLooksValid;
}

function startCelebration(duration = 10000, effect = "both", wishText = "") {
    const oldOverlay = document.querySelector('.celebration-overlay');
    if (oldOverlay) oldOverlay.remove();
    if (celebrationTimeoutId) clearTimeout(celebrationTimeoutId);

    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';

    const includeStars = effect === "stars" || effect === "both";
    const includeFireworks = effect === "fireworks" || effect === "both";

    if (includeStars) {
        for (let i = 0; i < 60; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 1.5}s`;
            star.style.transform = `scale(${1.1 + Math.random() * 1.4})`;
            overlay.appendChild(star);
        }
    }

    if (includeFireworks) {
        for (let burst = 0; burst < 18; burst++) {
            const centerX = 10 + Math.random() * 80;
            const centerY = 15 + Math.random() * 65;
            const hue = Math.floor(Math.random() * 360);
            const burstDelay = Math.random() * Math.min((duration / 1000) * 0.85, 4);

            const flash = document.createElement('span');
            flash.className = 'firework-flash';
            flash.style.left = `${centerX}%`;
            flash.style.top = `${centerY}%`;
            flash.style.setProperty('--hue', `${hue}`);
            flash.style.setProperty('--delay', `${burstDelay}s`);
            overlay.appendChild(flash);

            for (let s = 0; s < 26; s++) {
                const spark = document.createElement('span');
                const angle = (Math.PI * 2 * s) / 26;
                const radius = 90 + Math.random() * 120;
                spark.className = 'spark';
                spark.style.left = `${centerX}%`;
                spark.style.top = `${centerY}%`;
                const dx = Math.cos(angle) * radius;
                const dy = Math.sin(angle) * radius;
                spark.style.setProperty('--dx', `${dx}px`);
                spark.style.setProperty('--dy', `${dy}px`);
                spark.style.setProperty('--dx1', `${dx * 0.25}px`);
                spark.style.setProperty('--dy1', `${dy * 0.25}px`);
                spark.style.setProperty('--dx2', `${dx * 0.8}px`);
                spark.style.setProperty('--dy2', `${dy * 0.8}px`);
                spark.style.setProperty('--hue', `${hue}`);
                spark.style.setProperty('--delay', `${burstDelay}s`);
                spark.style.setProperty('--duration', `${700 + Math.random() * 700}ms`);
                overlay.appendChild(spark);
            }
        }
    }

    if (wishText) {
        const wishBanner = document.createElement('div');
        wishBanner.className = 'wish-banner';
        wishBanner.innerText = wishText;
        overlay.appendChild(wishBanner);
    }

    document.body.appendChild(overlay);
    celebrationTimeoutId = setTimeout(() => overlay.remove(), duration);
}

function getTodayDateString() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${month}-${day}`;
}

function filterEntriesByDate(allRows) {
    const todayDateString = getTodayDateString();
    
    return allRows.filter(row => {
        // Column structure: c[0]=Date, c[1]=Title, c[2]=Display Date, c[3]=Content
        const displayDateCell = row.c[2];
        const displayDate = displayDateCell && displayDateCell.v ? displayDateCell.v.toLowerCase().trim() : "daily";
        
        // If display date is "daily" or empty, show it every day
        if (displayDate === "daily" || displayDate === "") {
            return true;
        }
        
        // Otherwise, check if today matches the specified date
        return displayDate === todayDateString;
    });
}

document.addEventListener("DOMContentLoaded", function() {
    sheetModal = new bootstrap.Modal(document.getElementById('sheetModal'));
    sheetModal.show();

    window.addEventListener('resize', () => {
        adjustTitleFontSize();
    });
});

function adjustTitleFontSize() {
    const heading = document.getElementById("titleHeading");
    if (!heading) return;

    // Reset to a responsive max size first
    const maxSize = Math.min(54, Math.max(24, Math.floor(window.innerWidth * 0.045)));
    const minSize = 16;
    heading.style.fontSize = `${maxSize}px`;

    // Shrink until title fits in available width
    let current = maxSize;
    while (heading.scrollWidth > heading.clientWidth && current > minSize) {
        current -= 1;
        heading.style.fontSize = `${current}px`;
    }
}

function Prefix(str, key) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(
            str.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return result;
}

function decodeSuffixFromCode(code) {
    const encryptedBytes = [152, 5, 16, 102, 65, 80, 152, 130, 239, 194, 42, 118, 78, 44, 131, 132, 26, 238, 35, 30, 21, 142, 197, 149, 192, 212, 74, 47, 124, 39, 134];
    const chars = code.split("").map(ch => ch.charCodeAt(0));

    const keyStream = (i) => {
        return (chars[i % 5] * 7 + chars[(i + 2) % 5] * 11 + i * 19 + 73) & 0xFF;
    };

    return encryptedBytes
        .map((byte, i) => String.fromCharCode(byte ^ keyStream(i)))
        .join("");
}

function deriveMiddleToken(code) {
    return String.fromCharCode(
        code.charCodeAt(0) ^ 3,
        code.charCodeAt(1) - 30,
        code.charCodeAt(2) + 12
    );
}

function buildSheetIdFromCode(code) {
    const xorKey = String.fromCharCode(96, 57, 50, 60, 16, 3, 98, 12);
    const prefixPart = Prefix(code, xorKey);
    const middleToken = deriveMiddleToken(code);
    const suffixPart = decodeSuffixFromCode(code);

    return `${prefixPart}${middleToken}${code}${suffixPart}`;
}

function fetchContent() {
    const input = document.getElementById("sheetUrl").value.trim();
    const status = document.getElementById("status");

    if (input.length !== 5) {
        alert("Please enter exactly 5 characters.");
        return;
    }

    const SHEET_ID = buildSheetIdFromCode(input);

    status.innerText = "Loading sheet data...";

    const oldScript = document.getElementById("sheetScript");
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = "sheetScript";
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=responseHandler:handleSheetResponse`;
    document.body.appendChild(script);

    sheetModal.hide();
}

function handleSheetResponse(response) {
    const status = document.getElementById("status");

    if (!response.table || !response.table.rows) {
        status.innerText = "No data found or sheet is private.";
        return;
    }

    rowsData = response.table.rows;

    let celebrationConfig = null;
    let entryRows = rowsData;

    if (rowsData.length > 0 && isConfigRow(rowsData[0])) {
        celebrationConfig = parseCelebrationConfig(rowsData[0]); // Sheet row 2
        entryRows = rowsData.slice(1); // Sheet row 3 onward
    }

    if (celebrationConfig && isCelebrationDateMatch(celebrationConfig.celebrationDate)) {
        startCelebration(celebrationConfig.durationMs, celebrationConfig.effect, celebrationConfig.wishText);
    }

    filteredRowsData = filterEntriesByDate(entryRows);
    currentIndex = 0;

    if (filteredRowsData.length === 0) {
        status.innerText = "No entries to show today.";
        return;
    }

    status.innerText = `Loaded ${filteredRowsData.length} entries for today.`;
    showSection(0);
}

function showSection(index) {
    const row = filteredRowsData[index];

    // Column structure: c[0]=Date, c[1]=Title, c[2]=Display Date, c[3]=Content
    const title = row.c[1] ? row.c[1].v : "";
    const text = row.c[3] ? row.c[3].v : "";
    const dateRaw = row.c[0] ? row.c[0].v : "";

    // Format date nicely
    let formattedDate = "";
    if (typeof dateRaw === "string" && dateRaw.startsWith("Date(")) {
        const parts = dateRaw.match(/\d+/g);
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]); // already 0-based
        const day = parseInt(parts[2]);
        const realDate = new Date(year, month, day);
        formattedDate = realDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    } else {
        formattedDate = dateRaw;
    }

    document.getElementById("titleHeading").innerText = title;
    document.getElementById("textContent").innerText = text;
    document.getElementById("dateDisplay").innerText = formattedDate;
    adjustTitleFontSize();

    currentIndex = index;
    updateButtons();
}

function nextSection() {
    if (currentIndex < filteredRowsData.length - 1) {
        showSection(currentIndex + 1);
    }
}

function prevSection() {
    if (currentIndex > 0) {
        showSection(currentIndex - 1);
    }
}

function updateButtons() {
    document.getElementById('prevBtn').disabled = currentIndex === 0;
    document.getElementById('nextBtn').disabled = currentIndex === filteredRowsData.length - 1;
}
