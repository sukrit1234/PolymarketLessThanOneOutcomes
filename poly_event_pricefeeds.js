export async function get_event_pricefeed(slug,side) {
  try {
    // 1. Get Event & Market Details from Gamma API
    const eventResp = await fetch(`https://gamma-api.polymarket.com/events/slug/${slug}`);
    
    if (!eventResp.ok) 
        throw new Error("Failed to fetch event data");

    const eventData = await eventResp.json();

    if (eventData.markets.length === 0) {
      console.log("No event found.");
      return {};
    }

    let marketMap = {}; // market_id -> {question , yes , no}
    let payload = [];   // The batch request payload
    let tokenMap = {}; //clobTokenId -> marketId

    let marketMetaMap = {};

    // 2. Prepare the Batch Payload
    // We collect ALL "Yes" token IDs to ask for their prices in one go.
    eventData.markets.forEach(market => {
        if (market.closed) 
          return;
      
        const outcomes = JSON.parse(market.outcomes);
        if(outcomes.length == 0)
          return;

        const clobTokenIds = JSON.parse(market.clobTokenIds);
        marketMetaMap[market.id] = {
            outcomes : outcomes,
            token_ids : clobTokenIds
        };

        marketMap[market.id] = {
            id : market.id,
            question : market.question,
            prices : {},
            total : 0,
        };  

        if(outcomes.length != clobTokenIds.length)
        {
            console.log("Outcome and clobToken mismatch");
            return{};
        }

        for (let i = 0; i < outcomes.length; i++) {
           marketMap[market.id].prices[outcomes[i]] = 0;
           tokenMap[clobTokenIds[i]] = market.id;
            payload.push({
                token_id: clobTokenIds[i],
                side: side
            });
        }
    });

    // 3. Execute Batch Request (CLOB API)
    // endpoint: POST https://clob.polymarket.com/prices
    const priceResp = await fetch("https://clob.polymarket.com/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!priceResp.ok) 
        throw new Error(`CLOB Error: ${priceResp.status}`);

    const priceData = await priceResp.json();
    // priceData is an object where keys are TokenIDs
    for (const item of payload) {
      
      const tokenId = item.token_id;
      let price = 0;
      if (priceData[tokenId]) {
         if(side == "SELL")
            price = parseFloat(priceData[tokenId].SELL || 0);
          else if(side == "BUY")
            price = parseFloat(priceData[tokenId].BUY || 0);      
      }

      const market_id = tokenMap[tokenId];
      if (price > 0) {
            const index = marketMetaMap[market_id].token_ids.findIndex(id => id === tokenId); 
            marketMap[market_id].prices[marketMetaMap[market_id].outcomes[index]] = price;
            marketMap[market_id].total += price; 
        }
    }

    let total_prices = {};
    for (const market_id in marketMap) {
        const m = marketMap[market_id];
        for(let outcome in m.prices){
            if(!total_prices.hasOwnProperty(outcome))
              total_prices[outcome] = 0;
            total_prices[outcome] += m.prices[outcome];
        }
    }
    return {total_prices : total_prices ,markets : Object.values(marketMap)};
  } catch (error) {
    console.error("Error:", error.message);
  }
}

export async function get_events_pricefeed (event_slugs,side) {

    // 1. Fire all requests in parallel
    const promises = event_slugs.map(slug => get_event_pricefeed(slug,side));
    const results = await Promise.all(promises);

    return results.flat();
}