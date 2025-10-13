
export const stageFlow = {
    intro: {
        next: "character"
    },
    character: {
        next: "dialog-character"
    },
    "dialog-character": {
        next: "location"
    },
    location: {
        next: "dialog-location"
    },
    "dialog-location": {
        next: (context) => {
            if (context.previousStage === "location") {
                return Math.random() < context.selectedLocation.enemyChance ? "enemy" : "weapon";
            } else if (["location1-5", "location2", "location2-5"].includes(context.previousStage)) {
                const randomEvent = Math.random();
                let eventChoice;
                if (randomEvent < 0.3) {
                    eventChoice = "حمله غافلگیرانه";
                    context.eventChoice = eventChoice;
                    context.gameHistory.push(`${context.getDateTime().time} | رویداد تصادفی: ${eventChoice}`);
                    return "minigame";
                } else if (randomEvent < 0.6) {
                    eventChoice = "ایردراپ";
                    context.eventChoice = eventChoice;
                    context.gameHistory.push(`${context.getDateTime().time} | رویداد تصادفی: ${eventChoice}`);
                    return "weapon3-5";
                } else {
                    eventChoice = "جستجوی عادی";
                    context.eventChoice = eventChoice;
                    context.gameHistory.push(`${context.getDateTime().time} | رویداد تصادفی: ${eventChoice}`);
                    return "weapon3";
                }
            }
            console.error(`مرحله غیرمنتظره در dialog-location: ${context.previousStage}`);
            return "weapon"; // مسیر پیش‌فرض
        },
        minigameType: (context) => context.eventChoice === "حمله غافلگیرانه" ? "ambush" : null
    },
    enemy: {
        next: "weapon"
    },
    weapon: {
        next: "item"
    },
    item: {
        next: "strategy"
    },
    strategy: {
        next: (context) => {
            context.selectedStrategy = context.selectedItem.name;
            if (context.selectedItem.name === "کمپ کردن") {
                return Math.random() < 0.5 ? "enemy-pass" : "dialog-zone1";
            }
            return "location1-5";
        }
    },
    "enemy-pass": {
        next: (context) => {
            return context.selectedItem.name === "حمله غافلگیرکننده" ? "minigame" : "dialog-zone1";
        },
        minigameType: (context) => context.selectedItem.name === "حمله غافلگیرکننده" ? "stealth" : null
    },
    minigame: {
        next: "dialog-minigame"
    },
    "dialog-minigame": {
        next: (context) => {
            if (context.dialogMessage === "شما کشته شدید!") {
                return "game-over";
            }
            if (context.selectedStrategy === "کمپ کردن" && context.minigameType === "stealth") {
                return "weapon2";
            }
            return "weapon3";
        }
    },
    weapon2: {
        next: "item2"
    },
    item2: {
        next: "dialog-zone1"
    },
    "dialog-zone1": {
        next: "zone1"
    },
    zone1: {
        next: "ask1"
    },
    ask1: {
        next: (context) => {
            if (context.selectedItem.name === "می‌خوام بمونم") {
                context.updateHealth(-50);
                return "ask2";
            }
            return "location2";
        }
    },
    ask2: {
        next: (context) => {
            if (context.selectedItem.name === "می‌خوام بمونم") {
                context.gameHistory.push(`${context.getDateTime().time} | شما کشته شدید!`);
                return "game-over";
            }
            context.updateHealth(-50);
            return "location2";
        }
    },
    location2: {
        next: "dialog-location"
    },
    "location1-5": {
        next: "dialog-location"
    },
    "weapon3-5": {
        next: "item3-5"
    },
    "item3-5": {
        next: "minigame",
        minigameType: () => "ambush"
    },
    weapon3: {
        next: "item3"
    },
    item3: {
        next: "victory"
    },
    "zone1-5": {
        next: "ask1-5"
    },
    "ask1-5": {
        next: (context) => {
            if (context.selectedItem.name === "می‌خوام بمونم") {
                context.updateHealth(-50);
                return "ask2-5";
            }
            return "location2-5";
        }
    },
    "ask2-5": {
        next: (context) => {
            if (context.selectedItem.name === "می‌خوام بمونم") {
                context.gameHistory.push(`${context.getDateTime().time} | شما کشته شدید!`);
                return "game-over";
            }
            context.updateHealth(-50);
            return "location2-5";
        }
    },
    "location2-5": {
        next: "dialog-location"
    },
    "game-over": {
        next: "intro"
    },
    victory: {
        next: "intro"
    }
};