export class PolyBot {
    constructor() {
    
        this.data = {};
        this.notify_datas = new Array();
        this.collector_interval_seconds = 3;
        this.processor_interval_seconds = 5;
        this.notifier_interval_seconds = 5;

        this.start_load_callback = async (out_data) => { 
            console.warn("⚠️ No start load callback defined yet."); 
        };
        this.interval_load_callback = async (out_data) => { 
            console.warn("⚠️ No interval load callback defined yet."); 
        };
        this.process_callback = async (in_data,out_notifydatas) => { 
            console.warn("⚠️ No process callback defined yet."); 
        };
        this.notifier_callback = async (in_out_notifydatas) => { 
            console.warn("⚠️ No Notifier defined yet."); 
        };


        this.is_on_collecting = false;
        this.is_on_processing = false;
        this.is_on_notifiing = false;


        this.pending_to_notify_buffer = new Array(); 
    }

    

    async StartCollector() {
        console.log("Collect market slug and id");

        this.start_load_callback(this.data);
        console.log(`Market load completed`);

        const the_id = setInterval(async () => {
            if (this.is_on_collecting) 
                return;
            
            this.is_on_collecting = true;
            try 
            {
                const result = await this.interval_load_callback(this.data);
                if(!result)
                    clearInterval(the_id);
            } 
            catch (error) {
                console.error("Collector Error", error);
            }
            finally{
                this.is_on_collecting = false;
            }
        }, this.collector_interval_seconds*1000);
    }


    async StartProcessor() {

        console.log("Processor Stared");

        const the_id = setInterval(async () => {
            if (this.is_on_processing) 
                return;

            this.is_on_processing = true;
            try {
                const result = await this.process_callback(this.data,this.notify_datas);
                if(!result)
                    clearInterval(the_id);
            } 
            catch (error) {
                console.error("Processor Error", error);
            } 
            finally {
                this.is_on_processing = false;
            }
        }, this.processor_interval_seconds*1000);
    }

    async StartNotifier() {
        console.log("Notifier Started");
        const the_id = setInterval(async () => {
            if (this.is_on_notifiing) 
                return;

            this.is_on_notifiing = true;
            try {
                if(this.pending_to_notify_buffer.length == 0)
                {
                    this.pending_to_notify_buffer = this.notify_datas.slice(); 
                    this.notify_datas.length = 0;
                }
                const result = await this.notifier_callback(this.pending_to_notify_buffer);
                if(!result)
                    clearInterval(the_id);
            } 
            catch (error) {
                console.error("Notifier Error", error);
            } 
            finally {
                this.is_on_notifiing = false;
            }
        }, this.notifier_interval_seconds*1000);
    }
}