
import {read_event_from_Wallets} from "./poly_list_events_by_wallets.js"
import { get_trade_since } from "./poly_list_recently_trades.js"
import { get_markets_pricefeed,market_price_to_telegram_message } from "./poly_market_pricefeeds.js";
import { PolyBot } from "./bot.js";
import {send_message_to_telegram} from "./telegram_bot.js"
import chalk from "chalk";


///////////////////////////////////
/// PARAMETER SECTION
const TARGET_WALLETS = [];
const PROCESS_MARKET_PER_LOOP = 20;
const QUERY_SECOND_AGO = 30;
const MINIMUM_PRICE_THRESHOLD = 1.0;
const TELEGRAM_BOT_TOKEN = '';
const TELEGRAM_CHAT_ID = '';
/////////////////////////////////////


let pending_markets = new Array();
let to_process_markets = new Array();

let bot = new PolyBot();
bot.start_load_callback = async(out_data) => {

    out_data.events = new Set();
    out_data.markets = new Set();

    //# change api call if you has other strategy to load.
    const events = await read_event_from_Wallets(TARGET_WALLETS);

    Object.values(events).forEach(_event => {
        _event.forEach(e => {

            let total_size = 0;
            e.positions.forEach(p => {total_size += p.size});
            if(total_size > 0)
            {
                out_data.markets.add(e.market_slug);
                out_data.events.add(e.event_slug);
            }
        });
    });

    console.log(chalk.gray("[LOADER] : Data is loaded"));
    console.log(out_data);
}

bot.interval_load_callback = async(out_data) => {
    
    console.log("[Collector] : Try to fetch new market");
    
    ///////////////////////////////////////
    // STRATEGY CODE SECTION.
    // Change strategy to collect event and market change here.
    const trades = await get_trade_since(TARGET_WALLETS,QUERY_SECOND_AGO);
    
    //////////////////////////////////////

    if(trades.length == 0)
        console.log(chalk.yellow("[Collector] : No data return for this loop"));

    trades.forEach(t => {
        if(!out_data.markets.has(t.market_slug))
        {
            out_data.markets.add(t.market_slug);
            console.log(chalk.green(`[Collector] : Market Added ${t.market_slug}`));
        }
        if(!out_data.events.has(t.event_slug))
        {
            out_data.events.add(t.event_slug);
            console.log(chalk.green(`[Collector] : Event Added ${t.event_slug}`));
        }
    });
    console.log("=======================================");
    return true;
}

bot.process_callback = async(out_data,out_notification) => {
    
    console.log("[PROCESSOR] : Process data query");
    if(pending_markets.length == 0)
    {
        console.log("[PROCESSOR] : Refill pending buffer to refill market again");
        pending_markets = [... out_data.markets];
    }

    let remain_count = PROCESS_MARKET_PER_LOOP;
    while((remain_count > 0) && (pending_markets.length > 0)){
        to_process_markets.push(pending_markets.pop());
        remain_count--;
    }

    console.log(`[PROCESSOR] : ${to_process_markets.length} market to process`);
    const market_price_feed = await get_markets_pricefeed(to_process_markets,"SELL");
    to_process_markets.length = 0;

    console.log(`[PROCESSOR] : ${market_price_feed.length} market price retrieved`);
    console.log(`[PROCESSOR] : ${pending_markets.length} remain in pending buffer`);

    ///////////////////////////////////////
    // STRATEGY CODE SECTION.
    // Want to change , How to filter market change HERE
    market_price_feed.forEach(e => {
        if(e.total < MINIMUM_PRICE_THRESHOLD)
            out_notification.push(e);
    });
    ///////////////////////////////////////

    console.log(chalk.green(`[PROCESSOR] : Found ${out_notification.length} total outcome below ${MINIMUM_PRICE_THRESHOLD} record`));
    console.log("=======================================");
    return true;
}

bot.notifier_callback = async(in_out_notifications) => {
    console.log(chalk.yellow(`[NOTIFIER] : Notify ${in_out_notifications.length} records`));
    while(in_out_notifications.length > 0){
        const e = in_out_notifications.pop();

        ///////////////////////////////////////
        // STRATEGY CODE SECTION.
        // Want to change how to notify -- change here.
        send_message_to_telegram(market_price_to_telegram_message(e),TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_ID);
        ///////////////////////////////////////
    }
    console.log("=======================================");
    return true;
} 

bot.StartCollector();
bot.StartProcessor();
bot.StartNotifier();
