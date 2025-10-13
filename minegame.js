import { characters, weapons, items } from './list.js';

export function playMinigame(type, callback, playerHealth, selectedCharacter, selectedWeapons, inventory) {
    console.log("شروع مینی‌گیم:", { type, playerHealth, selectedCharacter, selectedWeapons, inventory });

    // چک وجود المنت‌ها
    const modal = document.getElementById("minigame-modal");
    if (!modal) {
        console.error("المنت #minigame-modal پیدا نشد!");
        callback("error");
        return;
    }
    const modalContent = modal.querySelector(".modal-content");
    if (!modalContent) {
        console.error("المنت .modal-content پیدا نشد!");
        callback("error");
        return;
    }

    // چک ورودی‌ها
    if (!selectedCharacter || !selectedWeapons || !selectedWeapons[0]) {
        console.error("ورودی‌های نامعتبر:", { selectedCharacter, selectedWeapons });
        callback("error");
        return;
    }

    // متغیرهای اولیه
    const enemy = characters[Math.floor(Math.random() * characters.length)];
    let enemyHealth = 200;
    let currentPlayerHealth = playerHealth || 200;
    let enemyWeapons = getRandomItems(weapons, 2);
    let activePlayerWeapon = selectedWeapons[0];
    let activeEnemyWeapon = enemyWeapons[0];
    let distance = [50, 70, 100][Math.floor(Math.random() * 3)];
    let iceActive = false;
    let iceShotsBlocked = 0;
    let enemyIceActive = false;
    let enemyIceShotsBlocked = 0;
    let fightTimeLeft = 60;
    let playerShotsLeft = 4;
    let clickCount = 0;
    let lastEnemyActionTime = Date.now();

    // مدیریت صداها
    const backgroundAudio = new Audio("./music/gun/Enemy.mp3");
    const weaponSound = new Audio(); // برای شلیک بازیکن و دشمن
    const noAmmoSound = new Audio("./music/gun/ammo.mp3");

    // تابع برای توقف همه صداها
    function stopAllSounds() {
        backgroundAudio.pause();
        weaponSound.pause();
        noAmmoSound.pause();
    }

    // پخش آهنگ پس‌زمینه فقط یک‌بار
    backgroundAudio.play().catch(e => console.error("خطا در پخش آهنگ پس‌زمینه:", e));

    function getRandomItems(array, count) {
        const shuffled = array.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // استایل‌های داخلی
    const styles = `
        <style>
            #minigame-modal {
                display: flex;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, #0a0a23, #1b1b3a);
                z-index: 1000;
                justify-content: center;
                align-items: center;
                font-family: 'Roboto', sans-serif;
                animation: bgPulse 8s infinite alternate;
            }
            @keyframes bgPulse {
                0% { background: linear-gradient(45deg, #0a0a23, #1b1b3a); }
                100% { background: linear-gradient(45deg, #1b1b3a, #0a0a23); }
            }
            .modal-content {
                background: #0f0f2d;
                padding: min(2vw, 10px);
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0, 255, 204, 0.4);
                max-width: min(90vw, 600px);
                width: 100%;
                color: #fff;
                text-align: center;
                animation: slideIn 0.5s ease-out;
                display: flex;
                flex-direction: column;
                gap: min(1.5vw, 8px);
            }
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .minigame-header {
                font-size: clamp(1.2rem, 2.5vw, 1.6rem);
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #00ffcc;
                text-shadow: 0 0 6px #00ffcc;
            }
            .entities-container {
                display: flex;
                justify-content: space-between;
                gap: min(2vw, 10px);
                flex-wrap: wrap;
            }
            .entity-box {
                flex: 0 1 min(25vw, 150px);
                background: rgba(255, 255, 255, 0.05);
                padding: min(1.5vw, 8px);
                border-radius: 8px;
                border: 2px solid #00ffcc;
                transition: transform 0.3s, box-shadow 0.3s;
                position: relative;
            }
            .entity-box:hover {
                box-shadow: 0 0 12px #00ffcc;
            }
            .entity-box.active {
                animation: shake 0.2s;
            }
            .entity-image {
                width: min(25vw, 90px);
                height: min(25vw, 90px);
                object-fit: cover;
                border-radius: 6px;
                border: 2px solid #00ffcc;
                margin-bottom: min(1vw, 6px);
            }
            .hp-bar-container {
                width: 100%;
                height: 7px;
                background: #222;
                border-radius: 3px;
                overflow: hidden;
                margin: min(1vw, 6px) 0;
                border: 1px solid #00ffcc;
            }
            .hp-bar {
                height: 100%;
                background: linear-gradient(to right, #00ff66, #00cc33);
                transition: width 0.4s ease-in-out;
            }
            .hp-text {
                font-size: clamp(0.6rem, 1.5vw, 0.8rem);
                margin: 3px 0;
                color: #e0e0e0;
            }
            .action-image {
                width: min(10vw, 40px);
                height: min(10vw, 40px);
                object-fit: contain;
                margin: min(0.5vw, 3px) 0;
            }
            .weapon-box, .action-box {
                display: flex;
                gap: min(1vw, 5px);
                justify-content: center;
                flex-wrap: wrap;
            }
            .weapon-image, .item-image {
                width: min(10vw, 35px);
                height: min(10vw, 35px);
                object-fit: contain;
                cursor: pointer;
                border: 2px solid transparent;
                border-radius: 4px;
                transition: border 0.2s, transform 0.2s;
            }
            .weapon-image.active {
                border: 2px solid #00ffcc;
                transform: scale(1.1);
            }
            .weapon-image:hover, .item-image:hover {
                transform: scale(1.1);
                border: 2px solid #00ffcc;
            }
            .action-container {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: min(1.5vw, 8px);
                margin-top: min(1.5vw, 8px);
                max-height: 20vh;
                overflow-y: auto;
                padding: min(1vw, 5px);
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
            }
            .shoot-circle {
                width: min(20vw, 80px);
                height: min(20vw, 80px);
                border-radius: 50%;
                background: radial-gradient(circle, #00ff66, #006622);
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                margin: min(1.5vw, 8px) auto;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 0 15px rgba(0, 255, 102, 0.6);
                animation: moveHorizontally 2s infinite alternate;
            }
            @keyframes moveHorizontally {
                0% { left: 30%; }
                100% { left: 60%; }
            }
            .shoot-circle:hover {
                transform: scale(1.15) translateX(-50%);
                box-shadow: 0 0 25px rgba(0, 255, 102, 0.9);
            }
            .shoot-circle:active {
                transform: scale(0.95) translateX(-50%);
            }
            .shoot-timer {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: clamp(1rem, 2vw, 1.2rem);
                font-weight: bold;
                color: #fff;
                text-shadow: 0 0 4px #000;
            }
            .distance-text {
                font-size: clamp(0.7rem, 1.6vw, 0.9rem);
                color: #00ffcc;
                margin: min(1vw, 6px) 0;
            }
            .fight-timer {
                font-size: clamp(0.6rem, 1.4vw, 0.8rem);
                color: #ff3333;
                margin-top: min(1vw, 6px);
            }
            .damage-text {
                position: absolute;
                font-size: clamp(0.8rem, 1.8vw, 1rem);
                font-weight: bold;
                pointer-events: none;
                animation: damageFloat 2s ease-out forwards;
            }
            @keyframes damageFloat {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-40px); }
            }
            @keyframes shake {
                0% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                50% { transform: translateX(2px); }
                75% { transform: translateX(-2px); }
                100% { transform: translateX(0); }
            }
            @keyframes flash {
                0% { opacity: 1; }
                50% { opacity: 0.3; }
                100% { opacity: 1; }
            }
            @media (max-width: 600px) {
                .entities-container {
                    justify-content: space-around;
                    gap: min(2vw, 10px);
                }
                .entity-box {
                    flex: 0 1 min(30vw, 130px);
                }
                .entity-image {
                    width: min(25vw, 80px);
                    height: min(25vw, 80px);
                }
                .shoot-circle {
                    width: min(25vw, 70px);
                    height: min(25vw, 70px);
                }
                .weapon-image, .item-image {
                    width: min(12vw, 30px);
                    height: min(12vw, 30px);
                }
            }
        </style>
    `;

    // شرایط اولیه
    if (type === "stealth") {
        const initialDamage = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
        enemyHealth = Math.max(0, enemyHealth - initialDamage);
        showDamageAnimation(initialDamage, "enemy", "yellow");
    } else if (type === "ambush") {
        const initialDamage = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
        currentPlayerHealth = Math.max(0, currentPlayerHealth - initialDamage);
        showDamageAnimation(initialDamage, "player", "red");
    } else if (type === "direct") {
        if (!playerHealth || playerHealth === 200) {
            currentPlayerHealth = 200;
            enemyHealth = 200;
        }
    }

    // رابط کاربری
    modalContent.innerHTML = `
        ${styles}
        <h2 class="minigame-header">${type === "stealth" ? "مبارزه مخفیانه" : type === "direct" ? "نبرد رو در رو" : "مبارزه غافلگیر شدن"}</h2>
        <div class="entities-container">
            <div class="entity-box" id="enemy-box">
                <img src="${enemy.image}" class="entity-image" id="enemy-image">
                <div class="hp-bar-container">
                    <div class="hp-bar" id="enemy-hp-bar" style="width: ${(enemyHealth / 200) * 100}%"></div>
                </div>
                <div class="hp-text" id="enemy-hp">${enemyHealth}/200</div>
                <div class="action-box">
                    <img src="${activeEnemyWeapon.image}" class="action-image" id="enemy-action-image">
                </div>
            </div>
            <div class="entity-box" id="player-box">
                <img src="${selectedCharacter.image}" class="entity-image" id="player-image">
                <div class="hp-bar-container">
                    <div class="hp-bar" id="player-hp-bar" style="width: ${(currentPlayerHealth / 200) * 100}%"></div>
                </div>
                <div class="hp-text" id="player-hp">${currentPlayerHealth}/200</div>
                <div class="weapon-box">
                    <img src="${selectedWeapons[0].image}" class="weapon-image ${activePlayerWeapon === selectedWeapons[0] ? 'active' : ''}" id="weapon1-image">
                    ${selectedWeapons[1] ? `<img src="${selectedWeapons[1].image}" class="weapon-image ${activePlayerWeapon === selectedWeapons[1] ? 'active' : ''}" id="weapon2-image">` : ''}
                </div>
            </div>
        </div>
        <div class="distance-text">فاصله: <span id="distance">${distance} متر</span></div>
        <div class="shoot-circle" id="shoot-circle">
            <span class="shoot-timer" id="shoot-timer">${playerShotsLeft}</span>
        </div>
        <div class="fight-timer" id="fight-timer">زمان باقی‌مانده: ${fightTimeLeft.toFixed(1)}</div>
        <div class="action-container">
            <img src="${items.find(i => i.name === 'مدکیت').image}" class="item-image" id="medkit-btn" ${inventory.medkit === 0 || currentPlayerHealth >= 200 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <img src="${items.find(i => i.name === 'یخ').image}" class="item-image" id="ice-btn" ${inventory.ice === 0 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <img src="${items.find(i => i.name === 'نارنجک').image}" class="item-image" id="grenade-btn" ${inventory.grenade === 0 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <img src="./image/enemy/run.png" class="item-image" id="escape-btn">
        </div>
    `;
    modal.style.display = "flex";

    // به‌روزرسانی نوارهای HP
    function updateHPBars() {
        const playerHP = document.getElementById("player-hp");
        const playerHPBar = document.getElementById("player-hp-bar");
        const enemyHP = document.getElementById("enemy-hp");
        const enemyHPBar = document.getElementById("enemy-hp-bar");
        if (playerHP && playerHPBar && enemyHP && enemyHPBar) {
            playerHP.textContent = `${currentPlayerHealth}/200`;
            playerHPBar.style.width = `${(currentPlayerHealth / 200) * 100}%`;
            enemyHP.textContent = `${enemyHealth}/200`;
            enemyHPBar.style.width = `${(enemyHealth / 200) * 100}%`;
        } else {
            console.error("نوارهای HP پیدا نشدند!");
        }
    }

    // انیمیشن دمیج با عدد متحرک
    function showDamageAnimation(damage, target, color) {
        const img = document.getElementById(`${target}-image`);
        const box = document.getElementById(`${target}-box`);
        if (!img || !box) {
            console.error(`تصویر یا باکس ${target} پیدا نشد!`);
            return;
        }
        const damageText = document.createElement("span");
        damageText.textContent = `${damage > 0 ? '-' : '+'}${Math.abs(damage)}`;
        damageText.className = "damage-text";
        damageText.style.color = color;
        damageText.style.left = `${img.offsetLeft + img.offsetWidth / 2}px`;
        damageText.style.top = `${img.offsetTop + img.offsetHeight / 2}px`;
        modalContent.appendChild(damageText);
        box.classList.add("active");
        box.style.animation = `shake 0.2s, flash 0.3s`;
        setTimeout(() => {
            box.classList.remove("active");
            box.style.animation = "";
            damageText.remove();
        }, 2000);
    }

    // تایمر مبارزه
    const fightTimer = setInterval(() => {
        fightTimeLeft -= 0.1;
        const fightTimerElement = document.getElementById("fight-timer");
        if (fightTimerElement) {
            fightTimerElement.textContent = `زمان باقی‌مانده: ${fightTimeLeft.toFixed(1)}`;
        }
        if (fightTimeLeft <= 0) {
            if (currentPlayerHealth > 0 && enemyHealth > 0) {
                modal.style.display = "none";
                clearInterval(fightTimer);
                stopAllSounds();
                callback("escape", "دشمن فرار کرد!");
            }
        }
        if (currentPlayerHealth <= 0 || enemyHealth <= 0) {
            endMinigame();
        }
        // نوبت دشمن
        const currentTime = Date.now();
        if (currentTime - lastEnemyActionTime >= getRandomActionInterval()) {
            enemyTurn();
            lastEnemyActionTime = currentTime;
        }
    }, 100);

    // فاصله زمانی تصادفی برای عمل دشمن
    function getRandomActionInterval() {
        return Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
    }

    // محاسبه دمیج
    function calculateDamage(weapon, distance) {
        let baseDamage = 0;
        if (weapon.type === "Sniper") {
            baseDamage = distance >= 70 ? 60 : 40;
        } else if (weapon.type === "AR") {
            baseDamage = distance <= 70 ? 30 : 15;
        } else if (weapon.type === "SMG") {
            baseDamage = distance === 50 ? 40 : distance === 70 ? 20 : 7;
        }
        const isCritical = Math.random() < 0.10;
        return Math.floor(baseDamage * (isCritical ? 1.5 : 1) * (0.9 + Math.random() * 0.2));
    }

    // شلیک بازیکن
    function playerShoot() {
        const shootTimer = document.getElementById("shoot-timer");
        clickCount++;
        if (shootTimer) shootTimer.textContent = playerShotsLeft - clickCount;
        if (clickCount >= playerShotsLeft) {
            // پخش صدای شلیک بازیکن
            stopAllSounds();
            weaponSound.src = `./music/gun/${activePlayerWeapon.type.toLowerCase()}.mp3`;
            weaponSound.play().catch(e => console.error(`خطا در پخش صدای شلیک ${activePlayerWeapon.type}:`, e));
            // شلیک واقعی
            if (!enemyIceActive) {
                const damage = calculateDamage(activePlayerWeapon, distance);
                enemyHealth = Math.max(0, enemyHealth - damage);
                showDamageAnimation(damage, "enemy", "yellow");
            } else {
                enemyIceShotsBlocked--;
                if (enemyIceShotsBlocked <= 0) enemyIceActive = false;
            }
            clickCount = 0;
            playerShotsLeft = 4;
            if (shootTimer) shootTimer.textContent = playerShotsLeft;
            updateHPBars();
            setTimeout(enemyTurn, 500);
        }
    }

    // نوبت دشمن
    function enemyTurn() {
        if (enemyHealth <= 0) return;
        const enemyBox = document.getElementById("enemy-box");
        const enemyActionImage = document.getElementById("enemy-action-image");
        if (!enemyBox || !enemyActionImage) {
            console.error("المنت enemy-box یا enemy-action-image پیدا نشد!");
            return;
        }
        enemyBox.classList.add("active");
        let enemyChoice = Math.random();
        if (enemyChoice < 0.70) {
            activeEnemyWeapon = enemyWeapons[Math.floor(Math.random() * enemyWeapons.length)];
            enemyActionImage.src = activeEnemyWeapon.image;
            setTimeout(() => {
                enemyBox.classList.remove("active");
            }, 300);
            enemyShoot();
        } else {
            const enemyItem = ["مدکیت", "یخ", "نارنجک", "run"][Math.floor(Math.random() * 4)];
            enemyActionImage.src = items.find(i => i.name === enemyItem)?.image || activeEnemyWeapon.image;
            if (enemyItem === "مدکیت" && enemyHealth < 200) {
                const healAmount = Math.floor(Math.random() * (40 - 20 + 1)) + 20;
                enemyHealth = Math.min(200, enemyHealth + healAmount);
                showDamageAnimation(-healAmount, "enemy", "green");
            } else if (enemyItem === "یخ") {
                enemyIceActive = true;
                enemyIceShotsBlocked = 2;
            } else if (enemyItem === "نارنجک" && !iceActive) {
                const damage = Math.floor(Math.random() * (30 - 15 + 1)) + 15;
                currentPlayerHealth = Math.max(0, currentPlayerHealth - damage);
                showDamageAnimation(damage, "player", "red");
            } else if (enemyItem === "run" && Math.random() < 0.25) {
                modal.style.display = "none";
                clearInterval(fightTimer);
                stopAllSounds();
                callback("escape", "دشمن فرار کرد!");
                return;
            }
            updateHPBars();
            playerShotsLeft = 4;
            clickCount = 0;
            const shootTimer = document.getElementById("shoot-timer");
            if (shootTimer) shootTimer.textContent = playerShotsLeft;
            setTimeout(() => {
                enemyBox.classList.remove("active");
                enemyActionImage.src = activeEnemyWeapon.image;
            }, 300);
        }
    }

    // شلیک دشمن
    function enemyShoot() {
        // پخش صدای شلیک دشمن
        stopAllSounds();
        weaponSound.src = `./music/gun/${activeEnemyWeapon.type.toLowerCase()}.mp3`;
        weaponSound.play().catch(e => console.error(`خطا در پخش صدای شلیک ${activeEnemyWeapon.type}:`, e));
        if (!iceActive) {
            const damage = calculateDamage(activeEnemyWeapon, distance);
            currentPlayerHealth = Math.max(0, currentPlayerHealth - damage);
            showDamageAnimation(damage, "player", "red");
        } else {
            iceShotsBlocked--;
            if (iceShotsBlocked <= 0) iceActive = false;
        }
        updateHPBars();
        playerShotsLeft = 4;
        clickCount = 0;
        const shootTimer = document.getElementById("shoot-timer");
        if (shootTimer) shootTimer.textContent = playerShotsLeft;
    }

    // پایان مینی‌گیم
    function endMinigame() {
        clearInterval(fightTimer);
        modal.style.display = "none";
        stopAllSounds();
        if (currentPlayerHealth <= 0) {
            callback("death");
        } else if (enemyHealth <= 0) {
            callback("win", { enemyName: enemy.name, enemyImage: enemy.image });
        }
    }

    // مدیریت انتخاب‌ها
    const shootCircle = document.getElementById("shoot-circle");
    const medkitBtn = document.getElementById("medkit-btn");
    const iceBtn = document.getElementById("ice-btn");
    const grenadeBtn = document.getElementById("grenade-btn");
    const escapeBtn = document.getElementById("escape-btn");
    const weapon1Btn = document.getElementById("weapon1-image");
    const weapon2Btn = document.getElementById("weapon2-image");

    if (shootCircle) shootCircle.onclick = playerShoot;
    if (medkitBtn) medkitBtn.onclick = () => {
        if (inventory.medkit === 0 || currentPlayerHealth >= 200) {
            stopAllSounds();
            noAmmoSound.play().catch(e => console.error("خطا در پخش صدای ammo:", e));
            noAmmoSound.onended = () => {
                if (modal.style.display === "flex") {
                    backgroundAudio.play().catch(e => console.error("خطا در پخش دوباره آهنگ پس‌زمینه:", e));
                }
            };
            return;
        }
        const playerBox = document.getElementById("player-box");
        const weapon1Image = document.getElementById("weapon1-image");
        if (!playerBox || !weapon1Image) {
            console.error("المنت player-box یا weapon1-image پیدا نشد!");
            return;
        }
        playerBox.classList.add("active");
        const medkitImage = items.find(i => i.name === 'مدکیت').image;
        console.log("تغییر به تصویر مدکیت:", medkitImage);
        weapon1Image.src = medkitImage;
        setTimeout(() => {
            playerBox.classList.remove("active");
            inventory.medkit--;
            currentPlayerHealth = Math.min(200, currentPlayerHealth + 50);
            showDamageAnimation(-50, "player", "green");
            medkitBtn.src = items.find(i => i.name === 'مدکیت').image;
            medkitBtn.style.opacity = inventory.medkit === 0 ? "0.5" : "1";
            medkitBtn.style.cursor = inventory.medkit === 0 ? "not-allowed" : "pointer";
            updateHPBars();
            weapon1Image.src = activePlayerWeapon.image;
        }, 300);
    };
    if (iceBtn) iceBtn.onclick = () => {
        if (inventory.ice === 0) {
            stopAllSounds();
            noAmmoSound.play().catch(e => console.error("خطا در پخش صدای ammo:", e));
            noAmmoSound.onended = () => {
                if (modal.style.display === "flex") {
                    backgroundAudio.play().catch(e => console.error("خطا در پخش دوباره آهنگ پس‌زمینه:", e));
                }
            };
            return;
        }
        const playerBox = document.getElementById("player-box");
        const weapon1Image = document.getElementById("weapon1-image");
        if (!playerBox || !weapon1Image) {
            console.error("المنت player-box یا weapon1-image پیدا نشد!");
            return;
        }
        playerBox.classList.add("active");
        const iceImage = items.find(i => i.name === 'یخ').image;
        console.log("تغییر به تصویر یخ:", iceImage);
        weapon1Image.src = iceImage;
        setTimeout(() => {
            playerBox.classList.remove("active");
            inventory.ice--;
            iceActive = true;
            iceShotsBlocked = 2;
            iceBtn.src = items.find(i => i.name === 'یخ').image;
            iceBtn.style.opacity = inventory.ice === 0 ? "0.5" : "1";
            iceBtn.style.cursor = inventory.ice === 0 ? "not-allowed" : "pointer";
            weapon1Image.src = activePlayerWeapon.image;
        }, 300);
    };
    if (grenadeBtn) grenadeBtn.onclick = () => {
        if (inventory.grenade === 0) {
            stopAllSounds();
            noAmmoSound.play().catch(e => console.error("خطا در پخش صدای ammo:", e));
            noAmmoSound.onended = () => {
                if (modal.style.display === "flex") {
                    backgroundAudio.play().catch(e => console.error("خطا در پخش دوباره آهنگ پس‌زمینه:", e));
                }
            };
            return;
        }
        const playerBox = document.getElementById("player-box");
        const weapon1Image = document.getElementById("weapon1-image");
        if (!playerBox || !weapon1Image) {
            console.error("المنت player-box یا weapon1-image پیدا نشد!");
            return;
        }
        playerBox.classList.add("active");
        const grenadeImage = items.find(i => i.name === 'نارنجک').image;
        console.log("تغییر به تصویر نارنجک:", grenadeImage);
        weapon1Image.src = grenadeImage;
        setTimeout(() => {
            playerBox.classList.remove("active");
            inventory.grenade--;
            if (!enemyIceActive) {
                const damage = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
                enemyHealth = Math.max(0, enemyHealth - damage);
                showDamageAnimation(damage, "enemy", "yellow");
            }
            grenadeBtn.src = items.find(i => i.name === 'نارنجک').image;
            grenadeBtn.style.opacity = inventory.grenade === 0 ? "0.5" : "1";
            grenadeBtn.style.cursor = inventory.grenade === 0 ? "not-allowed" : "pointer";
            updateHPBars();
            weapon1Image.src = activePlayerWeapon.image;
        }, 300);
    };
    if (escapeBtn) escapeBtn.onclick = () => {
        const playerBox = document.getElementById("player-box");
        const weapon1Image = document.getElementById("weapon1-image");
        if (!playerBox || !weapon1Image) {
            console.error("المنت player-box یا weapon1-image پیدا نشد!");
            return;
        }
        playerBox.classList.add("active");
        const escapeImage = "./image/enemy/run.png";
        console.log("تغییر به تصویر فرار:", escapeImage);
        weapon1Image.src = escapeImage;
        setTimeout(() => {
            playerBox.classList.remove("active");
            if (Math.random() < 0.9) {
                modal.style.display = "none";
                clearInterval(fightTimer);
                stopAllSounds();
                callback("escape", "شما فرار کردید!");
            } else {
                modal.style.display = "none";
                clearInterval(fightTimer);
                stopAllSounds();
                callback("death");
            }
            weapon1Image.src = activePlayerWeapon.image;
        }, 300);
    };
    if (weapon1Btn) weapon1Btn.onclick = () => {
        activePlayerWeapon = selectedWeapons[0];
        document.getElementById("weapon1-image").classList.add("active");
        if (weapon2Btn) document.getElementById("weapon2-image").classList.remove("active");
    };
    if (weapon2Btn) weapon2Btn.onclick = () => {
        activePlayerWeapon = selectedWeapons[1];
        document.getElementById("weapon2-image").classList.add("active");
        document.getElementById("weapon1-image").classList.remove("active");
    };

    // انیمیشن جابه‌جایی دکمه شوت
    function updateShootCirclePosition() {
        const shootCircle = document.getElementById("shoot-circle");
        if (shootCircle) {
            const randomLeft = 30 + Math.random() * 30;
            shootCircle.style.left = `${randomLeft}%`;
            shootCircle.style.transform = `translateX(-50%) rotate(${Math.random() * 360}deg)`;
        }
    }
    setInterval(updateShootCirclePosition, 2000);
    updateShootCirclePosition();

    updateHPBars();
}
                