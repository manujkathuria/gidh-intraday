import logging
from datetime import datetime
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from quant.engine.macro_scanner import run_macro_scan

logger = logging.getLogger("quant.scheduler")

IST = pytz.timezone("Asia/Kolkata")

def execute_scheduled_scan():
    now_ist = datetime.now(IST)
    session_date = now_ist.strftime("%Y-%m-%d")
    snapshot_time = "09:45:00"
    
    logger.info(f"Executing daily 09:45 AM Macro Hunter scan for session {session_date}")
    try:
        res = run_macro_scan(session_date=session_date, snapshot_time=snapshot_time, persist=True)
        logger.info(f"09:45 AM Macro scan complete: {len(res['shorts'])} Shorts, {len(res['longs'])} Longs saved (Run ID: {res['run_id']})")
    except Exception as e:
        logger.error(f"Error executing 09:45 AM macro scan: {e}", exc_info=True)

def start_scheduler():
    scheduler = BackgroundScheduler(timezone=IST)
    
    # Run Macro Hunter at 09:45 AM IST sharp once per day (Monday to Friday)
    scheduler.add_job(
        execute_scheduled_scan,
        trigger=CronTrigger(day_of_week='mon-fri', hour=9, minute=45, timezone=IST),
        id="macro_scan_0945_daily",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Quant Macro Scheduler started: Configured to run once daily at 09:45 AM IST (Mon-Fri).")
    return scheduler
