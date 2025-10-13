import { characters, locations, weapons, items, enemyChoices } from './list.js';
import { playMinigame } from './minegame.js';
import { stageFlow } from './mission.js';

let currentStage = "intro";
let previousStage = null;
let selectedCharacter = null;
let selectedLocation = null;
let selectedWeapons = [];
let inventory = { medkit: 0, ice: 1, grenade: 0 };
let gameHistory = [];
let currentHealth = 200;
let survivors = 50;
let kills = 0;
let audioPlaying = false;
let timeInterval = null;
let timerInterval = null;
let selectedStrategy = null;
let safeZones = [];
let unsafeZones = [];

const audio = document.getElementById("background-audio");
const toggleAudioButton = document.getElementById("toggle-audio");

function getDateTime() {
    const now = new Date();
    const days = ["یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
    const day = days[now.getDay()];
    const date = now.toLocaleDateString("fa-IR");
    const time = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return { date: `${day} ${date}`, time };
}

function formatDialogContent(content) {
    const { date, time } = getDateTime();
    return `<div>${date}</div><div><span class="time">${time}</span></div><div><br></div><div>${content}</div>`;
}

function formatHistoryContent(history) {
    return history.map((entry, index) => {
        const [time, action] = entry.split(" | ");
        return `<div>${index + 1}. ${time} - ${action}</div>`;
    }).join("");
}

function updateDialogTime() {
    if (["dialog-character", "dialog-location", "dialog-minigame", "dialog-zone1", "dialog-zone1-5"].includes(currentStage)) {
        const dialogText = document.getElementById("dialog-text");
        const content = dialogText.querySelector("div:last-child").textContent;
        dialogText.innerHTML = formatDialogContent(content);
    }
}

function getRandomItems(array, count, exclude = []) {
    const filtered = array.filter(item => !exclude.includes(item));
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, filtered.length));
}

function toggleAudio() {
    if (audioPlaying) {
        audio.pause();
        toggleAudioButton.textContent = "🔇";
        audioPlaying = false;
    } else {
        audio.play().catch(e => console.error("خطا در پخش آهنگ:", e));
        toggleAudioButton.textContent = "🔊";
        audioPlaying = true;
    }
}

function updateHealth(amount) {
    currentHealth = Math.min(200, Math.max(0, currentHealth + amount));
    document.getElementById("health-value").textContent = `HP ${currentHealth}/200`;
    document.getElementById("health-bar").style.width = `${(currentHealth / 200) * 100}%`;
    if (currentHealth <= 0) {
        gameHistory.push(`${getDateTime().time} | شما کشته شدید!`);
        nextStage("game-over", gameHistory.join("\n"));
    }
}

function updateInventory(item, count) {
    if (item === "مدکیت") {
        if (currentHealth < 200) {
            const needed = Math.ceil((200 - currentHealth) / 70);
            const used = Math.min(count, needed);
            updateHealth(used * 70);
            count -= used;
        }
        inventory.medkit = Math.min(inventory.medkit + count, items.find(i => i.name === "مدکیت").max);
    } else if (item === "یخ") {
        inventory.ice = Math.min(inventory.ice + count, items.find(i => i.name === "یخ").max);
    } else if (item === "نارنجک") {
        inventory.grenade = Math.min(inventory.grenade + count, items.find(i => i.name === "نارنجک").max);
    }
    document.getElementById("medkit-count").querySelector("span").textContent = inventory.medkit;
    document.getElementById("ice-count").querySelector("span").textContent = inventory.ice;
    document.getElementById("grenade-count").querySelector("span").textContent = inventory.grenade;
}

function updateSurvivors() {
    survivors = Math.max(1, survivors - Math.floor(Math.random() * 3) + 1);
    document.getElementById("survivors-count").textContent = survivors;
}

function updateKills() {
    kills += 1;
    document.getElementById("kills-count").textContent = kills;
}

function updateWeaponsDisplay() {
    const weapon1Image = document.getElementById("weapon1-image");
    const weapon2Image = document.getElementById("weapon2-image");
    weapon1Image.style.display = selectedWeapons[0] ? "block" : "none";
    weapon2Image.style.display = selectedWeapons[1] ? "block" : "none";
    if (selectedWeapons[0]) weapon1Image.src = selectedWeapons[0].image;
    if (selectedWeapons[1]) weapon2Image.src = selectedWeapons[1].image;
}

function displayChoices(items, stage) {
    const choicesDiv = document.getElementById("choices");
    choicesDiv.innerHTML = "";
    choicesDiv.className = stage === "character" ? "character-choices" : "choices";

    console.log(`نمایش گزینه‌ها برای مرحله ${stage}:`, items); // لاگ برای دیباگ

    if (!items || items.length === 0) {
        console.error(`خطا: هیچ گزینه‌ای برای مرحله ${stage} وجود ندارد!`);
        choicesDiv.innerHTML = "<p>خطا: هیچ گزینه‌ای برای نمایش وجود ندارد!</p>";
        return;
    }

    items.forEach(item => {
        if (!item || !item.name) {
            console.error(`آیتم نامعتبر در مرحله ${stage}:`, item);
            return;
        }
        const choice = document.createElement("div");
        choice.classList.add("choice", stage === "character" ? "character" : stage === "intro" || stage === "game-over" || stage === "victory" ? stage : "stage-option");
        if (stage === "weapon" || stage === "weapon2" || stage === "weapon3" || stage === "weapon3-5") choice.classList.add("weapon");
        if (stage === "item" || stage === "item2" || stage === "item3" || stage === "item3-5") choice.classList.add("item");
        if (stage === "enemy") choice.classList.add("enemy");

        if (stage === "character") {
            choice.innerHTML = `<img src="${item.image}" alt="${item.name}">`;
        } else if (stage === "intro") {
            choice.innerHTML = `<p>شروع بازی</p>`;
        } else if (stage === "game-over" || stage === "victory") {
            choice.innerHTML = `<p>بازگشت به صفحه اصلی</p>`;
        } else if (["location", "location1-5", "location2", "location2-5", "zone1", "zone1-5"].includes(stage)) {
            choice.classList.add("location");
            choice.style.backgroundImage = `url(${item.image})`;
            choice.innerHTML = `<p>${item.name}</p>`;
        } else if (stage === "weapon" || stage === "weapon2" || stage === "weapon3" || stage === "weapon3-5") {
            choice.innerHTML = `<img src="${item.image}" alt="${item.name}"><p>${item.name}</p>`;
        } else if (stage === "item" || stage === "item2" || stage === "item3" || stage === "item3-5") {
            const count = item.name === "مدکیت" ? (stage === "item3-5" ? item.count() + 1 : item.count()) : 1;
            const displayName = item.name === "مدکیت" ? `${count} عدد مدکیت` : item.name;
            choice.innerHTML = `<p>${displayName}</p><img src="${item.image}" alt="${item.name}">`;
        } else if (stage === "enemy") {
            choice.innerHTML = `<p>${item.name}</p><img src="${item.image || './image/default.png'}" alt="${item.name}">`;
        } else if (stage === "strategy") {
            choice.innerHTML = `<p>${item.name}</p>`;
        } else if (stage === "enemy-pass") {
            choice.innerHTML = `<p>${item.name}</p><img src="${item.image}" alt="${item.name}">`;
        } else if (stage === "ask1" || stage === "ask2" || stage === "ask1-5" || stage === "ask2-5") {
            choice.innerHTML = `<p>${item.name}</p>`;
        }

        choice.addEventListener("click", () => selectChoice(item, stage));
        choicesDiv.appendChild(choice);
    });
}

function selectChoice(item, stage) {
    document.querySelectorAll(".choice").forEach(choice => {
        choice.classList.remove("selected");
        choice.style.pointerEvents = "none";
    });
    const selectedChoice = Array.from(document.querySelectorAll(".choice")).find(choice => choice.textContent.includes(item.name) || ["intro", "character", "game-over", "victory"].includes(stage));
    if (selectedChoice) {
        selectedChoice.classList.add("selected");
    }

    const context = {
        selectedItem: item,
        previousStage,
        selectedLocation,
        selectedStrategy,
        gameHistory,
        updateHealth,
        getDateTime,
        dialogMessage: null,
        eventChoice: null
    };

    if (stage === "intro") {
        gameHistory = [];
        currentHealth = 200;
        inventory = { medkit: 0, ice: 1, grenade: 0 };
        selectedWeapons = [];
        selectedStrategy = null;
        safeZones = [];
        unsafeZones = [];
        survivors = 50;
        kills = 0;
        updateHealth(0);
        updateInventory("یخ", 0);
        updateWeaponsDisplay();
        updateSurvivors();
        updateKills();
        if (!audioPlaying) {
            audio.play().catch(e => console.error("خطا در پخش آهنگ:", e));
            toggleAudioButton.textContent = "🔊";
            audioPlaying = true;
        }
    } else if (stage === "character") {
        selectedCharacter = item;
        gameHistory.push(`${getDateTime().time} | شخصیت انتخاب‌شده: ${item.name}`);
        document.getElementById("character-image").src = item.image;
        document.getElementById("character-image").style.display = "block";
        nextStage("dialog-character", `${item.name}: ${item.bio}`, item.image);
        return;
    } else if (["location", "location1-5", "location2", "location2-5"].includes(stage)) {
        selectedLocation = item;
        gameHistory.push(`${getDateTime().time} | منطقه انتخاب‌شده: ${item.name}`);
        document.getElementById("character-image").src = item.image;
        document.getElementById("character-image").style.display = "block";
        nextStage("dialog-location", `${item.name}: ${item.desc}`, item.image);
        return;
    } else if (["weapon", "weapon2", "weapon3", "weapon3-5"].includes(stage)) {
        if (selectedWeapons.length < 2) {
            selectedWeapons.push(item);
        } else {
            const modal = document.getElementById("weapon-swap-modal");
            const optionsDiv = document.getElementById("weapon-swap-options");
            optionsDiv.innerHTML = "";
            selectedWeapons.forEach((weapon, index) => {
                const choice = document.createElement("div");
                choice.classList.add("choice");
                choice.innerHTML = `<img src="${weapon.image}" alt="${weapon.name}"><p>${weapon.name}</p>`;
                choice.addEventListener("click", () => {
                    selectedWeapons[index] = item;
                    gameHistory.push(`${getDateTime().time} | اسلحه جایگزین‌شده: ${item.name} به‌جای ${weapon.name}`);
                    updateWeaponsDisplay();
                    modal.style.display = "none";
                    nextStage(stageFlow[stage].next, null, null);
                });
                optionsDiv.appendChild(choice);
            });
            modal.style.display = "flex";
            document.getElementById("weapon-swap-cancel").onclick = () => {
                modal.style.display = "none";
                document.querySelectorAll(".choice").forEach(choice => {
                    choice.classList.remove("selected");
                    choice.style.pointerEvents = "auto";
                });
            };
            return;
        }
        gameHistory.push(`${getDateTime().time} | اسلحه انتخاب‌شده: ${item.name}`);
        updateWeaponsDisplay();
    } else if (["item", "item2", "item3", "item3-5"].includes(stage)) {
        const count = item.name === "مدکیت" ? (stage === "item3-5" ? item.count() + 1 : item.count()) : 1;
        const displayName = item.name === "مدکیت" ? `${count} عدد مدکیت` : item.name;
        gameHistory.push(`${getDateTime().time} | آیتم انتخاب‌شده: ${displayName}`);
        updateInventory(item.name, count);
    } else if (stage === "zone1") {
        selectedLocation = item;
        gameHistory.push(`${getDateTime().time} | منطقه امن انتخاب‌شده: ${item.name}`);
    } else if (stage === "zone1-5") {
        selectedLocation = item;
        gameHistory.push(`${getDateTime().time} | منطقه امن انتخاب‌شده: ${item.name}`);
    } else if (stage === "enemy") {
        updateSurvivors();
        const outcome = Math.random() < item.deathChance ? "death" : "success";
        let healthLoss = 0;
        if (outcome === "success") {
            healthLoss = Math.floor(Math.random() * (item.healthLoss.max - item.healthLoss.min + 1)) + item.healthLoss.min;
            gameHistory.push(`${getDateTime().time} | رویداد دشمن: ${item.name} - نتیجه: موفقیت، کاهش جان: ${healthLoss}`);
            if (item.kill) {
                updateKills();
            }
            updateHealth(-healthLoss);
            if (currentHealth <= 0) {
                return;
            }
        } else {
            gameHistory.push(`${getDateTime().time} | رویداد دشمن: ${item.name} - نتیجه: مرگ`);
            updateHealth(-currentHealth);
            return;
        }
    } else if (["strategy", "enemy-pass", "ask1", "ask2", "ask1-5", "ask2-5"].includes(stage)) {
        gameHistory.push(`${getDateTime().time} | انتخاب در ${stage}: ${item.name}`);
    }

    const next = typeof stageFlow[stage].next === "function" ? stageFlow[stage].next(context) : stageFlow[stage].next;
    const minigameType = stageFlow[stage].minigameType ? stageFlow[stage].minigameType(context) : null;
    nextStage(next, null, null, minigameType);
}

function nextStage(stage, dialogContent = "", dialogImage = null, minigameType = null) {
    clearInterval(timerInterval);
    clearInterval(timeInterval);
    document.getElementById("dialog-text").innerHTML = "";
    document.getElementById("dialog-image").style.display = "none";
    document.getElementById("choices").innerHTML = "";
    previousStage = currentStage;
    currentStage = stage;

    console.log(`انتقال به مرحله: ${stage}, مرحله قبلی: ${previousStage}, safeZones: ${safeZones.map(z => z.name).join(", ")}`);

    document.getElementById("stage-title").textContent = {
        intro: "ای بازمانده، آماده نبرد هستی؟ مراقب باش، هیچ راه برگشتی نیست!",
        character: "شخصیت مورد علاقه خود را انتخاب کنید",
        location: "انتخاب منطقه فرود",
        weapon: "انتخاب اسلحه",
        item: "انتخاب آیتم",
        strategy: "استراتژی خود را برای ادامه بازی انتخاب کنید",
        "enemy-pass": "دشمن از کنار شما رد شد! چه می‌کنید؟",
        weapon2: "انتخاب اسلحه جدید پس از پیروزی",
        item2: "انتخاب آیتم جدید پس از پیروزی",
        zone1: "انتخاب منطقه امن پس از کوچک‌تر شدن زون",
        "dialog-zone1": "زون کوچک‌تر شد!",
        ask1: "می‌خواهید در منطقه ناامن بمانید یا به منطقه امن بروید؟",
        ask2: "آخرین شانس! بمانید یا به منطقه امن بروید؟",
        "location1-5": "انتخاب منطقه جدید برای گشت و گذار",
        location2: "انتخاب منطقه امن برای ادامه بازی",
        weapon3: "انتخاب اسلحه جدید",
        item3: "انتخاب آیتم جدید",
        "weapon3-5": "انتخاب اسلحه قوی از ایردراپ",
        "item3-5": "انتخاب آیتم فراوان از ایردراپ",
        "zone1-5": "انتخاب منطقه امن پس از کوچک‌تر شدن زون",
        "dialog-zone1-5": "زون دوباره کوچک‌تر شد!",
        "ask1-5": "می‌خواهید در منطقه ناامن بمانید یا به منطقه امن بروید؟",
        "ask2-5": "آخرین شانس! بمانید یا به منطقه امن بروید؟",
        "location2-5": "انتخاب منطقه امن برای ادامه بازی",
        enemy: "رویداد دشمن!",
        minigame: "نبرد رو در رو",
        "dialog-character": "مشخصات شخصیت",
        "dialog-location": "مشخصات منطقه",
        "dialog-minigame": "نتیجه نبرد",
        "game-over": "گزارش بازی",
        victory: "شما برنده شدید!"
    }[stage] || "";

    if (stage === "intro") {
        document.getElementById("timer").style.display = "none";
        displayChoices([{ name: "شروع بازی" }], "intro");
    } else if (stage === "character") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(characters.slice(0, 10), "character");
        startTimer();
    } else if (stage === "location") {
        document.getElementById("timer").style.display = "flex";
        const randomLocations = getRandomItems(locations, 4);
        displayChoices(randomLocations, "location");
        startTimer();
    } else if (stage === "weapon") {
        document.getElementById("timer").style.display = "flex";
        const randomWeapons = getRandomItems(weapons, 4);
        displayChoices(randomWeapons, "weapon");
        startTimer();
    } else if (stage === "item") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(items, "item");
        startTimer();
    } else if (stage === "strategy") {
        document.getElementById("timer").style.display = "flex";
        displayChoices([
            { name: "کمپ کردن" },
            { name: "گشت و گذار" }
        ], "strategy");
        startTimer();
    } else if (stage === "enemy-pass") {
        document.getElementById("timer").style.display = "flex";
        displayChoices([
            { name: "حمله غافلگیرکننده", image: "./image/enemy/fight.png" },
            { name: "رها کردن دشمن", image: "./image/enemy/run.png" }
        ], "enemy-pass");
        startTimer();
    } else if (stage === "weapon2") {
        document.getElementById("timer").style.display = "flex";
        const randomWeapons = getRandomItems(weapons, 4);
        displayChoices(randomWeapons, "weapon2");
        startTimer();
    } else if (stage === "item2") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(items, "item2");
        startTimer();
    } else if (stage === "dialog-zone1") {
        if (!safeZones.length) {
            safeZones = getRandomItems(locations, 4, unsafeZones);
            if (!safeZones.includes(selectedLocation)) {
                safeZones[Math.floor(Math.random() * safeZones.length)] = selectedLocation;
            }
            unsafeZones = locations.filter(loc => !safeZones.includes(loc));
            gameHistory.push(`${getDateTime().time} | زون کوچک‌تر شد، مناطق ناامن: ${unsafeZones.map(z => z.name).join(", ")}`);
            dialogContent = `زون کوچک‌تر شد! مناطق امن: ${safeZones.map(z => z.name).join(", ")}`;
            dialogImage = selectedLocation.image;
        }
        document.getElementById("timer").style.display = "none";
        document.getElementById("dialog-image").src = dialogImage;
        document.getElementById("dialog-image").style.display = "block";
        document.getElementById("dialog-text").innerHTML = formatDialogContent(dialogContent);
        timeInterval = setInterval(updateDialogTime, 1000);
        setTimeout(() => {
            clearInterval(timeInterval);
            document.getElementById("dialog-text").innerHTML = "";
            document.getElementById("dialog-image").style.display = "none";
            nextStage("zone1");
        }, 3000);
    } else if (stage === "zone1") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(safeZones, "zone1");
        startTimer();
    } else if (stage === "ask1") {
        document.getElementById("timer").style.display = "flex";
        displayChoices([
            { name: "می‌خوام بمونم" },
            { name: "می‌خوام برم منطقه امن" }
        ], "ask1");
        startTimer();
    } else if (stage === "ask2") {
        document.getElementById("timer").style.display = "flex";
        displayChoices([
            { name: "می‌خوام بمونم" },
            { name: "می‌خوام برم منطقه امن" }
        ], "ask2");
        startTimer();
   startTimer();
    } else if (stage === "location1-5") {
        document.getElementById("timer").style.display = "flex";
        const randomLocations = getRandomItems(locations, 4, [selectedLocation]);
        displayChoices(randomLocations, "location1-5");
        startTimer();
    } else if (stage === "location2") {
        document.getElementById("timer").style.display = "flex";
        const randomSafeZones = getRandomItems(safeZones, 4);
        displayChoices(randomSafeZones, "location2");
        startTimer();
    } else if (stage === "weapon3") {
        document.getElementById("timer").style.display = "flex";
        const randomWeapons = getRandomItems(weapons, 4);
        displayChoices(randomWeapons, "weapon3");
        startTimer();
    } else if (stage === "item3") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(items, "item3");
        startTimer();
    } else if (stage === "weapon3-5") {
        document.getElementById("timer").style.display = "flex";
        const strongWeapons = weapons.filter(w => ["زیاد", "خیلی کم"].includes(w.rarity));
        const randomWeapons = getRandomItems(strongWeapons, 4);
        displayChoices(randomWeapons, "weapon3-5");
        startTimer();
    } else if (stage === "item3-5") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(items, "item3-5");
        startTimer();
    } else if (stage === "dialog-zone1-5") {
        if (!safeZones.length) {
            unsafeZones = getRandomItems(locations, 4);
            if (!unsafeZones.includes(selectedLocation)) {
                unsafeZones[Math.floor(Math.random() * unsafeZones.length)] = selectedLocation;
            }
            safeZones = locations.filter(loc => !unsafeZones.includes(loc));
            gameHistory.push(`${getDateTime().time} | زون کوچک‌تر شد، مناطق ناامن: ${unsafeZones.map(z => z.name).join(", ")}`);
            dialogContent = `زون دوباره کوچک‌تر شد! مناطق امن: ${safeZones.map(z => z.name).join(", ")}`;
            dialogImage = selectedLocation.image;
        }
        document.getElementById("timer").style.display = "none";
        document.getElementById("dialog-image").src = dialogImage;
        document.getElementById("dialog-image").style.display = "block";
        document.getElementById("dialog-text").innerHTML = formatDialogContent(dialogContent);
        timeInterval = setInterval(updateDialogTime, 1000);
        setTimeout(() => {
            clearInterval(timeInterval);
            document.getElementById("dialog-text").innerHTML = "";
            document.getElementById("dialog-image").style.display = "none";
            nextStage("zone1-5");
        }, 3000);
    } else if (stage === "zone1-5") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(safeZones, "zone1-5");
        startTimer();
    } else if (stage === "ask1-5") {
        document.getElementById("timer").style.display = "flex";
        displayChoices([
            { name: "می‌خوام بمونم" },
            { name: "می‌خوام برم منطقه امن" }
        ], "ask1-5");
        startTimer();
    } else if (stage === "ask2-5") {
        document.getElementById("timer").style.display = "flex";
        displayChoices([
            { name: "می‌خوام بمونم" },
            { name: "می‌خوام برم منطقه امن" }
        ], "ask2-5");
        startTimer();
    } else if (stage === "location2-5") {
        document.getElementById("timer").style.display = "flex";
        const randomSafeZones = getRandomItems(safeZones, 4);
        displayChoices(randomSafeZones, "location2-5");
        startTimer();
    } else if (stage === "enemy") {
        document.getElementById("timer").style.display = "flex";
        displayChoices(enemyChoices, "enemy");
        startTimer();
    } else if (stage === "minigame") {
        document.getElementById("timer").style.display = "none";
        playMinigame(minigameType, (result, enemyInfo) => {
            let dialogMessage = "";
            if (result === "win") {
                dialogMessage = `دشمن ${enemyInfo?.enemyName} کشته شد!`;
                updateKills();
            } else if (result === "death") {
                dialogMessage = "شما کشته شدید!";
                updateHealth(-currentHealth);
            } else if (result === "escape") {
                dialogMessage = enemyInfo;
            }
            gameHistory.push(`${getDateTime().time} | ${dialogMessage}`);
            nextStage("dialog-minigame", dialogMessage, null, minigameType);
        }, currentHealth, selectedCharacter, selectedWeapons, inventory);
    } else if (["dialog-character", "dialog-location", "dialog-minigame"].includes(stage)) {
        document.getElementById("timer").style.display = "none";
        if (dialogImage && stage !== "game-over") {
            document.getElementById("dialog-image").src = dialogImage;
            document.getElementById("dialog-image").style.display = "block";
        }
        document.getElementById("dialog-text").innerHTML = formatDialogContent(dialogContent);
        timeInterval = setInterval(updateDialogTime, 1000);
        setTimeout(() => {
            clearInterval(timeInterval);
            document.getElementById("dialog-text").innerHTML = "";
            document.getElementById("dialog-image").style.display = "none";
            const context = {
                previousStage,
                selectedLocation,
                selectedStrategy,
                dialogMessage: dialogContent,
                minigameType,
                eventChoice: null,
                gameHistory, // اصلاح: اضافه کردن gameHistory به context
                updateHealth, // اصلاح: اضافه کردن updateHealth
                getDateTime, // اصلاح: اضافه کردن getDateTime
                selectedItem: null // اصلاح: اضافه کردن selectedItem برای سازگاری
            };
            console.log('context in dialog stages:', context); // لاگ برای دیباگ
            const next = typeof stageFlow[stage].next === "function" ? stageFlow[stage].next(context) : stageFlow[stage].next;
            const nextMinigameType = stageFlow[stage].minigameType ? stageFlow[stage].minigameType(context) : null;
            nextStage(next, null, null, nextMinigameType);
        }, 3000);
    } else if (stage === "game-over") {
        document.getElementById("timer").style.display = "none";
        document.getElementById("dialog-text").innerHTML = formatHistoryContent(gameHistory);
        displayChoices([{ name: "بازگشت به صفحه اصلی" }], "game-over");
    } else if (stage === "victory") {
        document.getElementById("timer").style.display = "none";
        document.getElementById("dialog-text").innerHTML = formatHistoryContent(gameHistory);
        displayChoices([{ name: "بازگشت به صفحه اصلی" }], "victory");
    }
}

function startTimer() {
    let timeLeft = 10;
    const timerBar = document.getElementById("timer-bar");
    const timerValue = document.getElementById("timer-value");
    timerBar.style.width = "100%";
    timerBar.style.backgroundColor = "#39FF14";

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        const percentage = (timeLeft / 10) * 100;
        timerBar.style.width = `${percentage}%`;
        timerValue.textContent = timeLeft.toFixed(1);

        if (percentage <= 50) timerBar.style.backgroundColor = "#FFA500";
        if (percentage <= 20) timerBar.style.backgroundColor = "#FF0000";

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            const choices = document.querySelectorAll(".choice");
            const randomChoice = choices[Math.floor(Math.random() * choices.length)];
            if (randomChoice) {
                randomChoice.click();
            }
        }
    }, 100);
}

document.getElementById("character-image").addEventListener("click", () => {
    const modal = document.getElementById("image-modal");
    const modalImage = document.getElementById("modal-image");
    modalImage.src = document.getElementById("character-image").src;
    modal.style.display = "flex";
});

document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("image-modal").style.display = "none";
});

toggleAudioButton.addEventListener("click", toggleAudio);

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && audioPlaying) {
        audio.pause();
        toggleAudioButton.textContent = "🔇";
        audioPlaying = false;
    }
});

nextStage("intro");