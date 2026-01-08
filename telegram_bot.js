

export async function send_message_to_telegram(text,token,chat_id) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chat_id,
                text: text,
                parse_mode : "HTML",
            })
        });

        const data = await response.json();
        if (!data.ok) 
            throw new Error(data.description);
        console.log('[TELEGRAM MSG] : Notification sent!');
        
    } catch (error) {
        console.error('[TELEGRAM MSG]Failed to send:', error.message);
    }
}