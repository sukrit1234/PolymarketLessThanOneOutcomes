export async function get_market_pricefeed(slug,side) {
  try {
        const marketResp = await fetch(`https://gamma-api.polymarket.com/markets/slug/${slug}`);    
        if (!marketResp.ok) 
            throw new Error("Failed to fetch market data");

        const marketData = await marketResp.json();
        if (marketData == undefined) {
            console.log("No market found.");
            return null;
        }

        const outcomes = JSON.parse(marketData.outcomes);
        const clobTokenIds = JSON.parse(marketData.clobTokenIds);
        if(outcomes.length != clobTokenIds.length)
        {
            console.log("Outcome and clobToken mismatch");
            return null;
        }

        if(outcomes.length == 0)
        {
            console.log('No outcome for ${marketData.question}');
            return null;
        }

        const payload = [];
        for (let i = 0; i < outcomes.length; i++) {
            payload.push({
                token_id: clobTokenIds[i],
                side: side
            });
        }

    
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
        
        let out_price = {
            id : marketData.id,
            question : marketData.question,
            slug : marketData.slug,
            prices : {},
            total : 0
        };
        
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
            if (price > 0) {
                const index = clobTokenIds.findIndex(id => id === tokenId); 
                out_price.prices[outcomes[index]] = price;
                out_price.total += price;
            }
        }
        return out_price;
  } 
  catch (error) {
        console.error("Error:", error.message);
  }
}

export async function get_markets_pricefeed (market_slugs,side) {

    // 1. Fire all requests in parallel
    const promises = market_slugs.map(slug => get_market_pricefeed(slug,side));
    const results = await Promise.all(promises);

    return results.flat();
}

export function market_price_to_telegram_message(e){
    let _msg = "";
        _msg += "Market : <b>" + e.question + "</b>\n";
        _msg += "Market Id: <b>" + e.id + "</b>\n";

        if(Object.keys(e.prices).length > 0){
            _msg += "\n";
            _msg += "<b>Outcomes</b>\n";
            for(let outcome in e.prices)
                _msg += "<b>" + outcome + " : " + e.prices[outcome] + "</b>\n";
            _msg += "\n";
        }
        _msg += "Total : <b>" + e.total + "</b>\n";

        const _url = "https://polymarket.com/market/" + e.slug;
        _msg += "<a href='"+_url+"'><b>View on Polymarket</b></a>";
    return _msg;
}