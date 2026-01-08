import axios from "axios"

async function get_trade_since_for_wallet(wallet,targetTimestamp,limit) {
    const url = 'https://data-api.polymarket.com/activity';
    let offset = 0;
    let gatheredTrades = [];
    
    try {
        // Loop until we find the time boundary
        while (true) {

            // 1. Fetch batch
            const response = await axios.get(url, {
                params: {
                    user: wallet,
                    limit: limit,
                    offset: offset,
                    type: 'TRADE',
                    sortBy: 'TIMESTAMP',
                    sortDirection: 'DESC' // Critical: Ensures we get newest first
                }
            });

            const activities = response.data;
            // 2. Immediate Exit if Empty
            if (!activities || activities.length === 0) 
                break;

            // 3. Filter current batch
            // We use a simple loop to find the "cut-off" point
            let stopFetching = false;
            
            for (const trade of activities) {
                if (trade.timestamp >= targetTimestamp) {

                   const _t = {
                        event_slug: trade.eventSlug,
                        market: trade.title,
                        market_slug : trade.slug,
                        outcome: trade.outcome,
                        size: parseFloat(trade.size),
                        value: (parseFloat(trade.size) * parseFloat(trade.price)),
                        price: trade.price,
                        side : trade.side
                    };

                    gatheredTrades.push(_t);
                } else {
                    // We found a trade OLDER than target.
                    // Because list is sorted DESC, EVERYTHING after this is also old.
                    stopFetching = true;
                    break; 
                }
            }

            // 4. Decision: Do we need more data?
            // If we stopped inside the loop (stopFetching === true), we are done.
            // If the batch was full (length === limit) AND we didn't stop, we need the next page.
            if (stopFetching || activities.length < limit) {
                break;
            }

            // Prepare next batch
            offset += limit;
        }
        return gatheredTrades;

    } catch (error) {
        console.error("API Error:", error.message);
        return [];
    }
}

export async function get_trade_since(wallets,secondsAgo) {

    const limit = 50;
    
    const timeStampForAgo = ((Date.now() - (secondsAgo * 1000))/1000);
    // 2. Fire requests in Parallel (Batch)
    const promises = wallets.map(wallet => get_trade_since_for_wallet(wallet, timeStampForAgo));
    
    // 3. Wait for all to finish
    const results = await Promise.all(promises);

    // 4. Flatten results (Response is an array of arrays)
    return results.flat();
}