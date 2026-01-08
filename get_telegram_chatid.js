async function getChatId(token) {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

getChatId('Place Telegram Bot Token Here');