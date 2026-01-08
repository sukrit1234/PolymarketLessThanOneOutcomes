import axios from "axios"

// Helper function to process a single wallet
async function fetchWalletPositions(address) {
    const url = 'https://data-api.polymarket.com/positions';
    try {
        const response = await axios.get(url, {
            params: {
                user: address,
                limit: 1000,
                sortBy: 'CURRENT',
                sortDirection: 'DESC'
            }
        });

        // Return object with address and data to keep track of who owns what
        return { 
            address: address, 
            positions: response.data, 
            success: true 
        };

    } catch (error) {
        // Return error state instead of crashing
        return { 
            address: address, 
            error: error.message, 
            success: false 
        };
    }
}

export async function read_event_from_Wallets(wallets) {
    // 1. Fire all requests in parallel
    const promises = wallets.map(wallet => fetchWalletPositions(wallet));
    const results = await Promise.all(promises);

    let out_events = {};
    // 2. Process results
    results.forEach(result => {
        
        if (!result.success) 
            return;
        
        const positions = result.positions;
        if (!positions || positions.length === 0) 
            return;
        
        // Group by Event Title
        const eventsMap = {}
        positions.forEach(pos => {

            if (parseFloat(pos.size) >= 1) { // Filter out dust
                if ((pos.redeemable === false) && parseFloat(pos.curPrice) >= 0.1) {
                    if (!eventsMap.hasOwnProperty(pos.title)) {
                        eventsMap[pos.title] =  {
                            event_slug: pos.eventSlug,
                            market: pos.title,
                            market_slug : pos.slug,
                            positions: []
                        };
                    }
                
                    eventsMap[pos.title].positions.push({
                        outcome: pos.outcome,
                        size: parseFloat(pos.size),
                        value: (parseFloat(pos.size) * parseFloat(pos.curPrice)),
                        price: pos.curPrice
                    });
                }
            }
        });
        out_events[result.address] = Object.values(eventsMap);
    });
    return out_events;
}