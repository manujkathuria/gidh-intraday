# Gidh 44-Day Replay Memory

Generated from market feature tables by `quant/replay_memory.py`.
This is exploratory memory, not a trading rulebook.

## Day 001 - 2026-07-13

Shape mix: rest=137, accepted_green=41, accepted_red=11, runner=8, dip_recover=5, pump_fade=4
Echo mix: new=210

Top green characters:
- `KALYANKJIL` 8.76%, RVOL n/a, VWAP 0.12%, event_expansion, new
- `BAJAJHLDNG` 5.48%, RVOL n/a, VWAP -0.21%, rest, new
- `HCLTECH` 5.34%, RVOL n/a, VWAP 1.02%, runner, new
- `TCS` 5.20%, RVOL n/a, VWAP 0.89%, runner, new
- `VOLTAS` 5.18%, RVOL n/a, VWAP 1.45%, runner, new

Top red characters:
- `INDIANB` -3.01%, RVOL n/a, VWAP -1.07%, seller, new
- `ATHERENERG` -2.76%, RVOL n/a, VWAP -1.90%, seller, new
- `BDL` -2.74%, RVOL n/a, VWAP -0.42%, seller, new
- `GVT&D` -2.47%, RVOL n/a, VWAP -0.03%, rest, new
- `GRASIM` -2.10%, RVOL n/a, VWAP -0.75%, accepted_red, new

Memory-worthy rows:
- `KALYANKJIL`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=strong, open=sprint, volume=unknown
- `HCLTECH`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=unknown
- `TCS`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=unknown
- `VOLTAS`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=unknown
- `UNIONBANK`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=unknown
- `INFY`: green with acceptance; shape=runner, pressure=neutral, open=lean_up, volume=unknown
- `BHEL`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=unknown
- `PAYTM`: green with acceptance; shape=runner, pressure=strong, open=sprint, volume=unknown

## Day 002 - 2026-07-14

Shape mix: rest=128, accepted_red=35, accepted_green=17, seller=10, pump_fade=8, dip_recover=7
Echo mix: same_neighborhood=129, changed_character=46, faded_from_strength=14, continued_green=9, continued_red=6

Top green characters:
- `CONCOR` 5.24%, RVOL 4.56, VWAP 0.72%, runner, continued_green
- `ADANIPOWER` 4.45%, RVOL 2.10, VWAP 0.71%, runner, changed_character
- `SUPREMEIND` 4.41%, RVOL 1.31, VWAP 0.83%, runner, changed_character
- `MCX` 4.28%, RVOL 3.05, VWAP 0.86%, runner, changed_character
- `SBICARD` 4.05%, RVOL 7.09, VWAP 1.57%, runner, continued_green

Top red characters:
- `KFINTECH` -3.56%, RVOL 0.61, VWAP -1.41%, seller, faded_from_strength
- `KPITTECH` -3.23%, RVOL 0.55, VWAP -1.22%, seller, faded_from_strength
- `LODHA` -3.13%, RVOL 1.06, VWAP -0.73%, seller, changed_character
- `ICICIPRULI` -3.12%, RVOL 0.57, VWAP -0.38%, seller, changed_character
- `MAHABANK` -3.06%, RVOL 0.94, VWAP -0.92%, seller, continued_red

Memory-worthy rows:
- `MCX`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `ADANIPOWER`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `SHRIRAMFIN`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `SBICARD`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `CONCOR`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `CHOLAFIN`: early weakness absorbed later; shape=dip_recover, pressure=strong, open=dump, volume=loud
- `TIINDIA`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `RADICO`: early strength rejected later; shape=pump_fade, pressure=strong, open=sprint, volume=loud

## Day 003 - 2026-07-15

Shape mix: rest=141, accepted_red=26, accepted_green=19, pump_fade=14, runner=5, seller=3
Echo mix: same_neighborhood=135, changed_character=42, rested=10, continued_green=6, faded_from_strength=6

Top green characters:
- `ATHERENERG` 6.04%, RVOL 4.77, VWAP 0.61%, runner, continued_green
- `BHEL` 4.60%, RVOL 1.48, VWAP 2.98%, runner, changed_character
- `SWIGGY` 4.30%, RVOL 1.79, VWAP 2.17%, runner, bounce_from_weakness
- `ABB` 4.18%, RVOL 3.12, VWAP 0.82%, runner, continued_green
- `FORCEMOT` 4.02%, RVOL 2.08, VWAP 1.46%, runner, changed_character

Top red characters:
- `PATANJALI` -14.72%, RVOL 33.48, VWAP -1.03%, event_collapse, changed_character
- `DELHIVERY` -3.67%, RVOL 2.35, VWAP -0.81%, seller, changed_character
- `ADANIPOWER` -3.55%, RVOL 0.87, VWAP -0.82%, seller, faded_from_strength
- `VEDL` -2.76%, RVOL 2.09, VWAP -1.18%, seller, changed_character
- `ADANIGREEN` -2.47%, RVOL 0.61, VWAP -0.40%, accepted_red, faded_from_strength

Memory-worthy rows:
- `PATANJALI`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=dump, volume=event_loud
- `FORCEMOT`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=quiet, volume=loud
- `DELHIVERY`: red with rejection; shape=seller, pressure=strong, open=dump, volume=loud
- `VEDL`: red with rejection; shape=seller, pressure=weak, open=quiet, volume=loud
- `ATHERENERG`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `ABB`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `HYUNDAI`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `MANKIND`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud

## Day 004 - 2026-07-16

Shape mix: rest=138, accepted_red=41, seller=8, dip_recover=8, accepted_green=7, pump_fade=4
Echo mix: same_neighborhood=128, changed_character=47, continued_red=14, faded_from_strength=9, continued_green=8

Top green characters:
- `ABB` 6.17%, RVOL 6.24, VWAP -0.94%, rest, continued_green
- `IEX` 5.33%, RVOL 4.36, VWAP 1.78%, runner, continued_green
- `UPL` 5.33%, RVOL 3.65, VWAP 1.65%, runner, changed_character
- `SRF` 4.07%, RVOL 5.38, VWAP 0.53%, runner, continued_green
- `BHEL` 3.96%, RVOL 3.59, VWAP 3.94%, dip_recover, continued_green

Top red characters:
- `ICICIGI` -4.71%, RVOL 11.72, VWAP 0.86%, event_collapse, changed_character
- `HDFCAMC` -4.46%, RVOL 2.30, VWAP -0.33%, seller, changed_character
- `ETERNAL` -4.28%, RVOL 0.93, VWAP -1.59%, seller, faded_from_strength
- `NAM-INDIA` -4.26%, RVOL 2.77, VWAP -0.15%, rest, same_neighborhood
- `ATHERENERG` -4.15%, RVOL 1.30, VWAP -0.99%, seller, faded_from_strength

Memory-worthy rows:
- `ICICIGI`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=dump, volume=event_loud
- `UPL`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `HDFCAMC`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `ANGELONE`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `IEX`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `SRF`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `BHEL`: early weakness absorbed later; shape=dip_recover, pressure=strong, open=dump, volume=loud
- `ATHERENERG`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=normal

## Day 005 - 2026-07-17

Shape mix: rest=129, accepted_green=30, accepted_red=23, seller=15, dip_recover=7, runner=3
Echo mix: same_neighborhood=119, changed_character=48, continued_red=22, faded_from_strength=8, rested=6

Top green characters:
- `FEDERALBNK` 5.87%, RVOL 8.46, VWAP 1.94%, runner, changed_character
- `KALYANKJIL` 5.54%, RVOL 0.61, VWAP 1.54%, runner, changed_character
- `BHARATFORG` 4.47%, RVOL 2.84, VWAP 1.57%, runner, changed_character
- `KOTAKBANK` 3.50%, RVOL 1.45, VWAP 1.26%, accepted_green, changed_character
- `SONACOMS` 2.98%, RVOL 2.63, VWAP 0.96%, accepted_green, continued_green

Top red characters:
- `BHEL` -5.33%, RVOL 1.87, VWAP -3.17%, seller, faded_from_strength
- `POWERINDIA` -4.58%, RVOL 1.07, VWAP -1.33%, seller, continued_red
- `GVT&D` -4.28%, RVOL 1.05, VWAP -0.63%, seller, continued_red
- `PATANJALI` -4.24%, RVOL 0.31, VWAP -2.23%, seller, continued_red
- `BLUESTARCO` -3.77%, RVOL 0.72, VWAP -1.55%, seller, changed_character

Memory-worthy rows:
- `FEDERALBNK`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `BHARATFORG`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `LICI`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `BHEL`: cooled after prior strength; shape=seller, pressure=strong, open=quiet, volume=normal
- `KALYANKJIL`: green with acceptance; shape=runner, pressure=strong, open=sprint, volume=quiet
- `POLYCAB`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `BLUESTARCO`: red with rejection; shape=seller, pressure=strong, open=dump, volume=quiet
- `AMBER`: red with rejection; shape=seller, pressure=strong, open=dump, volume=normal

## Day 006 - 2026-07-20

Shape mix: rest=125, accepted_green=61, accepted_red=13, dip_recover=3, runner=3, seller=2
Echo mix: same_neighborhood=112, changed_character=51, bounce_from_weakness=16, rested=13, continued_green=12

Top green characters:
- `TORNTPHARM` 4.90%, RVOL 0.55, VWAP 0.70%, runner, bounce_from_weakness
- `JSWENERGY` 4.76%, RVOL 2.51, VWAP 0.76%, runner, changed_character
- `UNIONBANK` 4.62%, RVOL 1.39, VWAP 0.92%, runner, changed_character
- `COLPAL` 3.77%, RVOL 3.39, VWAP 0.64%, accepted_green, continued_green
- `VEDL` 3.64%, RVOL 0.84, VWAP 0.90%, accepted_green, bounce_from_weakness

Top red characters:
- `AUBANK` -4.06%, RVOL 4.71, VWAP -0.62%, seller, changed_character
- `YESBANK` -2.92%, RVOL 2.29, VWAP -0.12%, rest, same_neighborhood
- `SBICARD` -2.70%, RVOL 0.57, VWAP -1.20%, seller, changed_character
- `MARUTI` -2.21%, RVOL 1.38, VWAP -0.20%, rest, same_neighborhood
- `CDSL` -1.98%, RVOL 0.67, VWAP -0.49%, accepted_red, changed_character

Memory-worthy rows:
- `PNB`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `AUBANK`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `JSWENERGY`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `UNIONBANK`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=normal
- `TORNTPHARM`: bounced after prior weakness; shape=runner, pressure=neutral, open=sprint, volume=quiet
- `SBICARD`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=quiet
- `OIL`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `MANAPPURAM`: green with acceptance; shape=accepted_green, pressure=weak, open=lean_down, volume=loud

## Day 007 - 2026-07-21

Shape mix: rest=138, accepted_green=31, accepted_red=26, pump_fade=7, seller=5, dip_recover=2
Echo mix: same_neighborhood=125, changed_character=46, rested=14, continued_green=12, faded_from_strength=9

Top green characters:
- `TVSMOTOR` 5.68%, RVOL 3.33, VWAP 1.25%, runner, changed_character
- `MANAPPURAM` 3.97%, RVOL 4.41, VWAP 1.00%, accepted_green, continued_green
- `MUTHOOTFIN` 3.02%, RVOL 1.41, VWAP 0.53%, accepted_green, changed_character
- `SHRIRAMFIN` 2.69%, RVOL 1.76, VWAP 0.42%, accepted_green, changed_character
- `PRESTIGE` 2.50%, RVOL 0.45, VWAP 1.09%, accepted_green, changed_character

Top red characters:
- `PREMIERENE` -3.82%, RVOL 0.67, VWAP -1.40%, seller, changed_character
- `WAAREEENER` -3.55%, RVOL 1.95, VWAP -1.24%, seller, changed_character
- `DIXON` -3.06%, RVOL 0.64, VWAP -0.48%, seller, faded_from_strength
- `PAYTM` -2.92%, RVOL 3.23, VWAP -2.43%, pump_fade, changed_character
- `AMBER` -2.68%, RVOL 0.85, VWAP -0.59%, seller, changed_character

Memory-worthy rows:
- `TVSMOTOR`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=quiet, volume=loud
- `PAYTM`: early strength rejected later; shape=pump_fade, pressure=strong, open=sprint, volume=loud
- `NHPC`: cooled after prior strength; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `WAAREEENER`: red with rejection; shape=seller, pressure=weak, open=quiet, volume=normal
- `PREMIERENE`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=quiet
- `DIXON`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=quiet
- `BANKBARODA`: cooled after prior strength; shape=seller, pressure=weak, open=lean_down, volume=normal
- `AMBER`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 008 - 2026-07-22

Shape mix: rest=113, accepted_red=54, seller=22, accepted_green=13, dip_recover=5, pump_fade=2
Echo mix: same_neighborhood=101, changed_character=73, continued_red=22, faded_from_strength=6, continued_green=5

Top green characters:
- `BAJAJ-AUTO` 3.85%, RVOL 2.37, VWAP 1.77%, accepted_green, changed_character
- `KALYANKJIL` 3.10%, RVOL 0.50, VWAP -0.09%, rest, continued_green
- `NESTLEIND` 2.72%, RVOL 4.06, VWAP 0.78%, accepted_green, changed_character
- `TATACONSUM` 2.12%, RVOL 1.26, VWAP 0.74%, accepted_green, changed_character
- `POLYCAB` 1.93%, RVOL 1.26, VWAP -0.03%, rest, same_neighborhood

Top red characters:
- `OFSS` -7.35%, RVOL 1.36, VWAP -4.16%, seller, changed_character
- `BANDHANBNK` -7.32%, RVOL 14.80, VWAP -2.39%, event_collapse, continued_red
- `ADANIGREEN` -4.91%, RVOL 1.27, VWAP -1.89%, seller, changed_character
- `PGEL` -4.90%, RVOL 1.40, VWAP -0.81%, seller, continued_red
- `SRF` -4.57%, RVOL 3.19, VWAP -1.95%, seller, faded_from_strength

Memory-worthy rows:
- `BANDHANBNK`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=dump, volume=event_loud
- `SRF`: cooled after prior strength; shape=seller, pressure=strong, open=lean_down, volume=loud
- `OFSS`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=normal
- `YESBANK`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `ADANIGREEN`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `GODREJPROP`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=normal
- `LUPIN`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `SAGILITY`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 009 - 2026-07-23

Shape mix: rest=144, accepted_red=31, accepted_green=13, seller=11, pump_fade=6, dip_recover=3
Echo mix: same_neighborhood=125, changed_character=34, continued_red=32, rested=10, continued_green=4

Top green characters:
- `DRREDDY` 6.25%, RVOL 3.12, VWAP 1.52%, runner, changed_character
- `HEROMOTOCO` 3.71%, RVOL 3.00, VWAP 0.39%, accepted_green, changed_character
- `SBILIFE` 3.28%, RVOL 1.22, VWAP 0.95%, accepted_green, changed_character
- `MOTHERSON` 2.71%, RVOL 1.12, VWAP 0.18%, rest, changed_character
- `BAJAJ-AUTO` 2.54%, RVOL 1.44, VWAP 0.41%, accepted_green, continued_green

Top red characters:
- `SRF` -7.79%, RVOL 3.82, VWAP -3.01%, seller, continued_red
- `ADANIGREEN` -5.86%, RVOL 2.53, VWAP -1.29%, seller, continued_red
- `OFSS` -4.55%, RVOL 10.81, VWAP 0.99%, event_collapse, continued_red
- `BANDHANBNK` -4.29%, RVOL 1.55, VWAP -1.75%, seller, continued_red
- `ADANIENT` -4.23%, RVOL 1.31, VWAP -1.43%, seller, continued_red

Memory-worthy rows:
- `OFSS`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=weak, open=dump, volume=event_loud
- `DRREDDY`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=sprint, volume=loud
- `INDUSINDBK`: red with rejection; shape=seller, pressure=strong, open=dump, volume=loud
- `SRF`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `ADANIGREEN`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `NHPC`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `NESTLEIND`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=normal
- `PETRONET`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 010 - 2026-07-24

Shape mix: rest=111, accepted_green=64, accepted_red=12, dip_recover=9, runner=6, pump_fade=6
Echo mix: same_neighborhood=105, changed_character=75, rested=9, continued_green=8, bounce_from_weakness=6

Top green characters:
- `KPITTECH` 6.63%, RVOL 3.68, VWAP 1.32%, runner, changed_character
- `TATAELXSI` 5.30%, RVOL 2.10, VWAP 1.14%, runner, changed_character
- `GODFRYPHLP` 4.66%, RVOL 2.34, VWAP 2.03%, runner, changed_character
- `AUBANK` 4.55%, RVOL 1.38, VWAP 2.42%, runner, changed_character
- `PERSISTENT` 4.44%, RVOL 1.40, VWAP 1.19%, runner, changed_character

Top red characters:
- `MOTILALOFS` -7.57%, RVOL 25.40, VWAP 0.99%, event_collapse, changed_character
- `SWIGGY` -3.00%, RVOL 2.26, VWAP 1.25%, dip_recover, changed_character
- `POWERINDIA` -2.96%, RVOL 1.07, VWAP -1.27%, seller, changed_character
- `GVT&D` -2.89%, RVOL 1.87, VWAP 0.39%, rest, continued_red
- `KALYANKJIL` -2.24%, RVOL 0.20, VWAP -1.02%, accepted_red, continued_red

Memory-worthy rows:
- `MOTILALOFS`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=dump, volume=event_loud
- `KPITTECH`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=lean_up, volume=loud
- `TATAELXSI`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=sprint, volume=loud
- `GODFRYPHLP`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=quiet, volume=loud
- `SWIGGY`: early weakness absorbed later; shape=dip_recover, pressure=weak, open=dump, volume=loud
- `SONACOMS`: early strength rejected later; shape=pump_fade, pressure=strong, open=sprint, volume=loud
- `CIPLA`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `AUBANK`: green with acceptance; shape=runner, pressure=weak, open=quiet, volume=normal

## Day 011 - 2026-07-27

Shape mix: rest=140, accepted_green=35, accepted_red=19, seller=5, dip_recover=4, runner=3
Echo mix: same_neighborhood=123, changed_character=46, continued_green=23, rested=8, continued_red=4

Top green characters:
- `KFINTECH` 8.68%, RVOL 11.97, VWAP 2.04%, event_expansion, changed_character
- `CONCOR` 8.49%, RVOL 5.14, VWAP 0.95%, event_expansion, changed_character
- `SAGILITY` 5.89%, RVOL 5.63, VWAP 0.35%, runner, bounce_from_weakness
- `LAURUSLABS` 5.31%, RVOL 5.42, VWAP 1.10%, runner, continued_green
- `ETERNAL` 5.15%, RVOL 1.34, VWAP 0.93%, runner, changed_character

Top red characters:
- `BANKINDIA` -4.83%, RVOL 2.94, VWAP -0.94%, seller, changed_character
- `SUPREMEIND` -4.40%, RVOL 1.10, VWAP -1.96%, seller, faded_from_strength
- `ONGC` -3.88%, RVOL 1.90, VWAP -1.09%, seller, continued_red
- `FORCEMOT` -2.98%, RVOL 1.34, VWAP -0.73%, seller, changed_character
- `INDUSTOWER` -2.66%, RVOL 1.04, VWAP -1.53%, seller, changed_character

Memory-worthy rows:
- `KFINTECH`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `CONCOR`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `IDFCFIRSTB`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=quiet, volume=event_loud
- `SAGILITY`: bounced after prior weakness; shape=runner, pressure=neutral, open=sprint, volume=loud
- `BANKINDIA`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `LAURUSLABS`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `ETERNAL`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=normal
- `SUPREMEIND`: cooled after prior strength; shape=seller, pressure=neutral, open=lean_up, volume=normal

## Day 012 - 2026-07-28

Shape mix: rest=126, accepted_green=32, accepted_red=24, seller=8, pump_fade=7, dip_recover=7
Echo mix: same_neighborhood=108, changed_character=55, continued_green=24, rested=11, continued_red=8

Top green characters:
- `KALYANKJIL` 7.61%, RVOL 0.74, VWAP 2.49%, runner, changed_character
- `COFORGE` 7.21%, RVOL 6.23, VWAP 1.21%, runner, continued_green
- `LODHA` 6.31%, RVOL 6.33, VWAP 2.38%, runner, continued_green
- `SWIGGY` 4.79%, RVOL 2.01, VWAP 1.37%, runner, continued_green
- `IEX` 4.42%, RVOL 2.28, VWAP 1.34%, runner, continued_green

Top red characters:
- `SUZLON` -9.73%, RVOL 4.42, VWAP -3.38%, event_collapse, changed_character
- `VBL` -7.57%, RVOL 9.28, VWAP -1.95%, seller, changed_character
- `HINDUNILVR` -7.11%, RVOL 7.11, VWAP -2.59%, pump_fade, changed_character
- `GODFRYPHLP` -4.74%, RVOL 8.66, VWAP -1.17%, seller, faded_from_strength
- `DMART` -4.39%, RVOL 4.17, VWAP 0.05%, rest, same_neighborhood

Memory-worthy rows:
- `SUZLON`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=dump, volume=event_loud
- `VBL`: red with rejection; shape=seller, pressure=neutral, open=quiet, volume=loud
- `HINDUNILVR`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `GODFRYPHLP`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `BEL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `TATAPOWER`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `COALINDIA`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `SAIL`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud

## Day 013 - 2026-07-29

Shape mix: rest=142, accepted_green=34, accepted_red=14, pump_fade=6, seller=5, runner=5
Echo mix: same_neighborhood=124, changed_character=46, rested=13, continued_green=13, bounce_from_weakness=6

Top green characters:
- `KAYNES` 11.74%, RVOL 8.55, VWAP 2.71%, event_expansion, continued_green
- `CROMPTON` 7.21%, RVOL 2.05, VWAP 1.84%, runner, changed_character
- `SWIGGY` 5.33%, RVOL 3.81, VWAP 0.19%, rest, continued_green
- `DIVISLAB` 5.20%, RVOL 2.43, VWAP 1.45%, runner, changed_character
- `KPITTECH` 4.74%, RVOL 7.35, VWAP 0.64%, runner, continued_green

Top red characters:
- `PHOENIXLTD` -4.37%, RVOL 3.92, VWAP -0.80%, seller, changed_character
- `MPHASIS` -4.28%, RVOL 1.22, VWAP -2.40%, seller, changed_character
- `ADANIPORTS` -3.53%, RVOL 3.31, VWAP -0.53%, seller, changed_character
- `ICICIGI` -2.97%, RVOL 0.27, VWAP -0.52%, seller, changed_character
- `KFINTECH` -2.72%, RVOL 0.62, VWAP -0.91%, seller, faded_from_strength

Memory-worthy rows:
- `KAYNES`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `CROMPTON`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=lean_up, volume=loud
- `DIVISLAB`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `PHOENIXLTD`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `JIOFIN`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=quiet, volume=loud
- `ADANIPORTS`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `LTF`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `KPITTECH`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud

## Day 014 - 2026-07-30

Shape mix: rest=140, accepted_green=22, accepted_red=17, dip_recover=15, seller=9, pump_fade=5
Echo mix: same_neighborhood=138, changed_character=40, rested=12, continued_green=8, faded_from_strength=6

Top green characters:
- `SONACOMS` 7.31%, RVOL 2.51, VWAP 2.46%, runner, changed_character
- `SAGILITY` 4.10%, RVOL 1.70, VWAP 0.90%, runner, continued_green
- `TVSMOTOR` 3.06%, RVOL 2.17, VWAP 0.77%, accepted_green, continued_green
- `HEROMOTOCO` 3.04%, RVOL 2.11, VWAP 0.36%, accepted_green, changed_character
- `PAGEIND` 2.93%, RVOL 1.40, VWAP 0.33%, accepted_green, changed_character

Top red characters:
- `COLPAL` -3.90%, RVOL 1.57, VWAP -0.73%, seller, changed_character
- `ADANIPORTS` -3.83%, RVOL 2.96, VWAP -0.59%, seller, continued_red
- `TIINDIA` -3.82%, RVOL 3.89, VWAP -1.01%, seller, continued_red
- `PREMIERENE` -3.40%, RVOL 2.11, VWAP -0.52%, seller, changed_character
- `ANGELONE` -3.33%, RVOL 2.11, VWAP -0.68%, seller, changed_character

Memory-worthy rows:
- `SONACOMS`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `PREMIERENE`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `KPITTECH`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=loud
- `ANGELONE`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `DABUR`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `TIINDIA`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `ADANIPORTS`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `WAAREEENER`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud

## Day 015 - 2026-07-31

Shape mix: rest=138, accepted_green=31, accepted_red=21, pump_fade=7, seller=7, runner=3
Echo mix: same_neighborhood=125, changed_character=56, bounce_from_weakness=10, continued_red=6, faded_from_strength=5

Top green characters:
- `BAJAJFINSV` 5.08%, RVOL 3.18, VWAP 1.36%, runner, changed_character
- `BAJFINANCE` 4.20%, RVOL 4.86, VWAP 1.50%, runner, continued_green
- `KEI` 4.08%, RVOL 1.81, VWAP -0.14%, rest, changed_character
- `HYUNDAI` 4.00%, RVOL 7.98, VWAP 0.31%, runner, continued_green
- `TORNTPHARM` 3.88%, RVOL 1.48, VWAP 1.74%, accepted_green, changed_character

Top red characters:
- `SAGILITY` -5.55%, RVOL 1.17, VWAP -1.85%, seller, faded_from_strength
- `APLAPOLLO` -5.24%, RVOL 2.63, VWAP -2.08%, seller, changed_character
- `MANKIND` -5.07%, RVOL 6.13, VWAP 0.61%, dip_recover, changed_character
- `DIXON` -4.07%, RVOL 1.20, VWAP -3.30%, seller, changed_character
- `KALYANKJIL` -3.34%, RVOL 0.51, VWAP -1.55%, seller, changed_character

Memory-worthy rows:
- `MANKIND`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `BAJAJFINSV`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `APLAPOLLO`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `ABCAPITAL`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `PERSISTENT`: early weakness absorbed later; shape=dip_recover, pressure=strong, open=dump, volume=loud
- `HYUNDAI`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `BAJFINANCE`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `LICHSGFIN`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud

## Day 016 - 2026-08-03

Shape mix: rest=124, accepted_green=29, accepted_red=24, pump_fade=10, seller=9, runner=6
Echo mix: same_neighborhood=124, changed_character=47, continued_green=13, continued_red=9, rested=7

Top green characters:
- `APLAPOLLO` 6.96%, RVOL 12.86, VWAP 2.20%, event_expansion, bounce_from_weakness
- `JUBLFOOD` 6.90%, RVOL 4.18, VWAP 1.70%, runner, changed_character
- `LTM` 5.93%, RVOL 4.12, VWAP 0.76%, runner, changed_character
- `ABB` 5.68%, RVOL 2.62, VWAP 2.59%, runner, bounce_from_weakness
- `GODFRYPHLP` 4.85%, RVOL 3.13, VWAP 0.53%, runner, changed_character

Top red characters:
- `TORNTPHARM` -4.55%, RVOL 1.05, VWAP -1.23%, seller, faded_from_strength
- `GAIL` -4.46%, RVOL 4.47, VWAP -0.14%, rest, faded_from_strength
- `IEX` -4.32%, RVOL 2.63, VWAP -0.74%, seller, changed_character
- `BAJFINANCE` -2.93%, RVOL 1.39, VWAP -1.46%, seller, faded_from_strength
- `DELHIVERY` -2.81%, RVOL 0.92, VWAP -0.47%, seller, faded_from_strength

Memory-worthy rows:
- `APLAPOLLO`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `MUTHOOTFIN`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=dump, volume=event_loud
- `JUBLFOOD`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `LTM`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=quiet, volume=loud
- `ABB`: bounced after prior weakness; shape=runner, pressure=neutral, open=sprint, volume=loud
- `GODFRYPHLP`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `IEX`: red with rejection; shape=seller, pressure=strong, open=quiet, volume=loud
- `AUROPHARMA`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud

## Day 017 - 2026-08-04

Shape mix: rest=136, accepted_red=40, seller=15, accepted_green=11, pump_fade=3, event_expansion=2
Echo mix: same_neighborhood=121, changed_character=58, faded_from_strength=10, continued_red=8, rested=7

Top green characters:
- `ATHERENERG` 8.41%, RVOL 5.20, VWAP 0.67%, event_expansion, changed_character
- `KEI` 5.75%, RVOL 14.24, VWAP 2.39%, event_expansion, changed_character
- `GODFRYPHLP` 4.22%, RVOL 3.98, VWAP -0.03%, rest, continued_green
- `CGPOWER` 4.10%, RVOL 2.09, VWAP 0.94%, runner, changed_character
- `SAIL` 3.41%, RVOL 1.97, VWAP 1.25%, accepted_green, changed_character

Top red characters:
- `UPL` -5.96%, RVOL 4.82, VWAP -1.09%, seller, faded_from_strength
- `POWERGRID` -3.91%, RVOL 0.88, VWAP -0.52%, seller, changed_character
- `MOTHERSON` -3.52%, RVOL 2.05, VWAP -0.92%, seller, changed_character
- `PRESTIGE` -3.34%, RVOL 0.98, VWAP -0.71%, seller, changed_character
- `OBEROIRLTY` -3.25%, RVOL 1.02, VWAP -1.00%, seller, changed_character

Memory-worthy rows:
- `KEI`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `ATHERENERG`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=strong, open=sprint, volume=event_loud
- `LICI`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=sprint, volume=event_loud
- `UPL`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `CGPOWER`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=sprint, volume=loud
- `DABUR`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `HDFCLIFE`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `MOTHERSON`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud

## Day 018 - 2026-08-05

Shape mix: rest=143, accepted_red=29, accepted_green=17, pump_fade=12, seller=6, dip_recover=2
Echo mix: same_neighborhood=126, changed_character=38, continued_red=20, rested=16, bounce_from_weakness=6

Top green characters:
- `PNBHOUSING` 4.65%, RVOL 7.26, VWAP -1.04%, pump_fade, changed_character
- `HINDZINC` 4.57%, RVOL 4.75, VWAP 1.89%, runner, continued_green
- `JUBLFOOD` 3.65%, RVOL 7.01, VWAP 0.42%, accepted_green, changed_character
- `SONACOMS` 3.41%, RVOL 1.18, VWAP 0.71%, accepted_green, changed_character
- `BOSCHLTD` 3.37%, RVOL 6.10, VWAP -0.50%, rest, same_neighborhood

Top red characters:
- `NHPC` -4.47%, RVOL 2.05, VWAP -2.37%, seller, changed_character
- `NYKAA` -4.18%, RVOL 7.03, VWAP -0.58%, seller, continued_red
- `BSE` -4.10%, RVOL 3.09, VWAP -0.82%, seller, changed_character
- `ICICIGI` -3.48%, RVOL 1.84, VWAP -1.58%, seller, continued_red
- `CUMMINSIND` -3.01%, RVOL 1.72, VWAP -0.90%, seller, changed_character

Memory-worthy rows:
- `PNBHOUSING`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `BSE`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `NHPC`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `GODREJPROP`: bounced after prior weakness; shape=pump_fade, pressure=weak, open=sprint, volume=loud
- `NYKAA`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `HINDZINC`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=quiet, volume=loud
- `BHARTIARTL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `KEI`: early strength rejected later; shape=pump_fade, pressure=strong, open=sprint, volume=loud

## Day 019 - 2026-08-06

Shape mix: rest=133, accepted_red=49, accepted_green=13, runner=7, seller=5, pump_fade=2
Echo mix: same_neighborhood=124, changed_character=54, continued_red=20, faded_from_strength=5, bounce_from_weakness=3

Top green characters:
- `MAZDOCK` 6.32%, RVOL 8.08, VWAP 1.28%, runner, changed_character
- `GVT&D` 5.74%, RVOL 2.67, VWAP 2.55%, runner, changed_character
- `HAL` 5.08%, RVOL 8.47, VWAP 1.06%, runner, changed_character
- `COCHINSHIP` 4.66%, RVOL 4.55, VWAP 1.13%, runner, changed_character
- `CUMMINSIND` 4.42%, RVOL 5.74, VWAP 0.79%, runner, bounce_from_weakness

Top red characters:
- `BLUESTARCO` -5.25%, RVOL 7.66, VWAP -2.50%, seller, continued_red
- `POLICYBZR` -4.26%, RVOL 4.10, VWAP -1.97%, seller, changed_character
- `SONACOMS` -3.95%, RVOL 0.86, VWAP -1.54%, seller, faded_from_strength
- `POWERGRID` -3.16%, RVOL 2.33, VWAP -0.52%, seller, changed_character
- `BSE` -2.82%, RVOL 1.56, VWAP -1.41%, seller, continued_red

Memory-worthy rows:
- `MAZDOCK`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `HAL`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `CUMMINSIND`: bounced after prior weakness; shape=runner, pressure=neutral, open=sprint, volume=loud
- `GVT&D`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `COCHINSHIP`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `BDL`: bounced after prior weakness; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `POLICYBZR`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `POWERGRID`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud

## Day 020 - 2026-08-07

Shape mix: rest=150, accepted_green=25, accepted_red=15, pump_fade=9, seller=7, runner=2
Echo mix: same_neighborhood=136, changed_character=42, rested=12, continued_red=7, bounce_from_weakness=7

Top green characters:
- `MOTHERSON` 8.66%, RVOL 7.45, VWAP 1.10%, event_expansion, changed_character
- `AUROPHARMA` 4.93%, RVOL 2.31, VWAP 1.29%, runner, bounce_from_weakness
- `FORTIS` 4.33%, RVOL 3.97, VWAP 1.85%, runner, changed_character
- `SONACOMS` 3.82%, RVOL 1.23, VWAP 1.53%, accepted_green, bounce_from_weakness
- `JUBLFOOD` 3.62%, RVOL 1.69, VWAP 0.64%, accepted_green, changed_character

Top red characters:
- `CROMPTON` -7.78%, RVOL 8.64, VWAP -1.38%, seller, changed_character
- `TRENT` -3.43%, RVOL 2.50, VWAP -0.64%, seller, changed_character
- `BLUESTARCO` -3.18%, RVOL 5.83, VWAP -0.78%, seller, continued_red
- `LTF` -3.09%, RVOL 0.81, VWAP -0.67%, seller, changed_character
- `SWIGGY` -3.08%, RVOL 1.08, VWAP -1.14%, seller, continued_red

Memory-worthy rows:
- `MOTHERSON`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=strong, open=sprint, volume=event_loud
- `CROMPTON`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `FORTIS`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `AUROPHARMA`: bounced after prior weakness; shape=runner, pressure=neutral, open=sprint, volume=loud
- `GODREJCP`: red with rejection; shape=seller, pressure=neutral, open=lean_up, volume=loud
- `TRENT`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `BLUESTARCO`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `BRITANNIA`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud

## Day 021 - 2026-08-10

Shape mix: rest=136, accepted_red=28, accepted_green=24, seller=11, dip_recover=6, runner=3
Echo mix: same_neighborhood=125, changed_character=50, continued_green=11, faded_from_strength=10, bounce_from_weakness=5

Top green characters:
- `PAYTM` 9.97%, RVOL 5.58, VWAP 2.38%, event_expansion, continued_green
- `KAYNES` 5.37%, RVOL 3.51, VWAP -0.36%, pump_fade, changed_character
- `MCX` 5.15%, RVOL 2.73, VWAP 1.53%, runner, changed_character
- `DELHIVERY` 4.81%, RVOL 3.95, VWAP 0.76%, runner, continued_green
- `BSE` 4.08%, RVOL 2.45, VWAP 1.24%, runner, changed_character

Top red characters:
- `BHARATFORG` -7.32%, RVOL 6.83, VWAP -1.54%, seller, faded_from_strength
- `PFC` -6.55%, RVOL 5.19, VWAP -1.92%, seller, changed_character
- `RECLTD` -6.43%, RVOL 3.01, VWAP -2.21%, seller, changed_character
- `AMBER` -4.54%, RVOL 3.24, VWAP -0.90%, seller, changed_character
- `LUPIN` -3.86%, RVOL 3.92, VWAP -0.14%, rest, continued_red

Memory-worthy rows:
- `PAYTM`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=strong, open=sprint, volume=event_loud
- `BHARATFORG`: cooled after prior strength; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `PFC`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `RECLTD`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `KAYNES`: early strength rejected later; shape=pump_fade, pressure=strong, open=sprint, volume=loud
- `MCX`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_down, volume=loud
- `AMBER`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `INOXWIND`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud

## Day 022 - 2026-08-11

Shape mix: rest=139, accepted_red=35, accepted_green=10, seller=9, dip_recover=7, pump_fade=7
Echo mix: same_neighborhood=133, changed_character=47, continued_red=11, rested=11, faded_from_strength=4

Top green characters:
- `POLICYBZR` 7.02%, RVOL 2.74, VWAP 2.01%, runner, continued_green
- `ZYDUSLIFE` 6.70%, RVOL 8.94, VWAP 2.51%, runner, changed_character
- `NAUKRI` 4.55%, RVOL 5.60, VWAP -0.25%, rest, continued_green
- `DRREDDY` 4.03%, RVOL 1.96, VWAP 1.60%, runner, changed_character
- `MCX` 3.68%, RVOL 2.26, VWAP 1.83%, accepted_green, continued_green

Top red characters:
- `ADANIGREEN` -3.96%, RVOL 1.28, VWAP -0.92%, seller, changed_character
- `POWERINDIA` -3.92%, RVOL 1.61, VWAP -1.31%, seller, faded_from_strength
- `GODREJPROP` -3.53%, RVOL 0.83, VWAP -1.38%, seller, changed_character
- `MANAPPURAM` -3.36%, RVOL 1.13, VWAP -1.34%, seller, changed_character
- `JSWENERGY` -3.26%, RVOL 1.16, VWAP -1.40%, seller, faded_from_strength

Memory-worthy rows:
- `ZYDUSLIFE`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `OIL`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `POLICYBZR`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `BHARATFORG`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `DRREDDY`: green with acceptance; shape=runner, pressure=neutral, open=quiet, volume=normal
- `POWERINDIA`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=normal
- `ADANIGREEN`: red with rejection; shape=seller, pressure=weak, open=dump, volume=normal
- `GODREJPROP`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=normal

## Day 023 - 2026-08-12

Shape mix: rest=154, accepted_green=21, accepted_red=20, dip_recover=5, runner=3, seller=3
Echo mix: same_neighborhood=131, changed_character=38, continued_red=24, rested=7, bounce_from_weakness=5

Top green characters:
- `NATIONALUM` 5.12%, RVOL 5.45, VWAP 0.45%, runner, changed_character
- `FORCEMOT` 5.00%, RVOL 2.76, VWAP 0.84%, runner, changed_character
- `INDUSTOWER` 4.11%, RVOL 2.35, VWAP 2.28%, runner, changed_character
- `BHEL` 3.88%, RVOL 1.26, VWAP 1.77%, accepted_green, changed_character
- `MAHABANK` 3.87%, RVOL 2.56, VWAP 0.76%, accepted_green, changed_character

Top red characters:
- `PIIND` -8.17%, RVOL 13.30, VWAP -2.73%, event_collapse, continued_red
- `FORTIS` -5.27%, RVOL 3.85, VWAP -0.74%, seller, continued_red
- `TCS` -4.31%, RVOL 1.94, VWAP 0.01%, rest, same_neighborhood
- `MANAPPURAM` -4.15%, RVOL 5.61, VWAP -0.98%, seller, continued_red
- `VMM` -3.01%, RVOL 1.24, VWAP 0.25%, rest, changed_character

Memory-worthy rows:
- `GODREJCP`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=lean_up, volume=event_loud
- `PIIND`: abnormal collapse; keep separate from normal weakness; shape=event_collapse, pressure=neutral, open=dump, volume=event_loud
- `NATIONALUM`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `FORCEMOT`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `INDUSTOWER`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `FORTIS`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `MANAPPURAM`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `ZYDUSLIFE`: early weakness absorbed later; shape=dip_recover, pressure=strong, open=dump, volume=loud

## Day 024 - 2026-08-13

Shape mix: rest=142, accepted_green=26, accepted_red=26, seller=8, pump_fade=4, dip_recover=2
Echo mix: same_neighborhood=129, changed_character=48, continued_red=11, rested=10, faded_from_strength=5

Top green characters:
- `SOLARINDS` 7.86%, RVOL 9.05, VWAP 3.37%, runner, changed_character
- `ASTRAL` 6.20%, RVOL 27.72, VWAP 1.11%, event_expansion, continued_green
- `CONCOR` 3.76%, RVOL 2.21, VWAP 0.78%, accepted_green, changed_character
- `BDL` 3.46%, RVOL 5.79, VWAP 0.85%, accepted_green, continued_green
- `APLAPOLLO` 3.43%, RVOL 1.29, VWAP 0.72%, accepted_green, changed_character

Top red characters:
- `FORCEMOT` -4.26%, RVOL 1.39, VWAP -1.55%, seller, faded_from_strength
- `GMRAIRPORT` -4.08%, RVOL 1.33, VWAP -0.95%, seller, changed_character
- `PAGEIND` -3.87%, RVOL 6.13, VWAP -2.12%, seller, changed_character
- `SAIL` -3.48%, RVOL 0.61, VWAP -1.48%, seller, changed_character
- `ATHERENERG` -3.24%, RVOL 0.78, VWAP -0.02%, rest, faded_from_strength

Memory-worthy rows:
- `ASTRAL`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `SOLARINDS`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=lean_up, volume=loud
- `PAGEIND`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `JIOFIN`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `FORCEMOT`: cooled after prior strength; shape=seller, pressure=neutral, open=lean_down, volume=normal
- `GMRAIRPORT`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `SAIL`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=quiet
- `HINDALCO`: red with rejection; shape=seller, pressure=strong, open=dump, volume=normal

## Day 025 - 2026-08-14

Shape mix: rest=142, accepted_red=36, accepted_green=15, seller=7, dip_recover=6, pump_fade=3
Echo mix: same_neighborhood=139, changed_character=44, continued_red=13, continued_green=6, faded_from_strength=4

Top green characters:
- `IDEA` 4.29%, RVOL 2.38, VWAP 0.88%, runner, changed_character
- `APOLLOHOSP` 3.53%, RVOL 4.36, VWAP 0.90%, accepted_green, changed_character
- `OFSS` 3.14%, RVOL 0.62, VWAP 1.35%, dip_recover, bounce_from_weakness
- `BHARTIARTL` 2.73%, RVOL 2.02, VWAP 0.20%, rest, changed_character
- `ADANIENT` 2.53%, RVOL 1.67, VWAP 0.88%, accepted_green, changed_character

Top red characters:
- `LAURUSLABS` -3.36%, RVOL 0.76, VWAP -1.49%, seller, changed_character
- `NBCC` -3.03%, RVOL 1.76, VWAP -0.99%, seller, changed_character
- `ZYDUSLIFE` -2.75%, RVOL 0.55, VWAP -1.32%, seller, continued_red
- `LTF` -2.67%, RVOL 0.81, VWAP -0.68%, seller, continued_red
- `HINDZINC` -2.61%, RVOL 1.08, VWAP -0.34%, seller, continued_red

Memory-worthy rows:
- `IDEA`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `SOLARINDS`: cooled after prior strength; shape=dip_recover, pressure=strong, open=dump, volume=loud
- `ASHOKLEY`: red with rejection; shape=seller, pressure=strong, open=lean_up, volume=loud
- `AMBER`: early weakness absorbed later; shape=dip_recover, pressure=weak, open=dump, volume=loud
- `MAXHEALTH`: early weakness absorbed later; shape=dip_recover, pressure=weak, open=dump, volume=loud
- `NBCC`: red with rejection; shape=seller, pressure=weak, open=dump, volume=normal
- `LAURUSLABS`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=normal
- `OFSS`: bounced after prior weakness; shape=dip_recover, pressure=neutral, open=dump, volume=quiet

## Day 026 - 2026-08-17

Shape mix: rest=139, accepted_green=35, accepted_red=19, dip_recover=6, pump_fade=5, seller=3
Echo mix: same_neighborhood=132, changed_character=53, rested=10, bounce_from_weakness=6, faded_from_strength=3

Top green characters:
- `MOTILALOFS` 5.68%, RVOL 4.39, VWAP 1.19%, runner, changed_character
- `INOXWIND` 5.42%, RVOL 3.00, VWAP 1.51%, runner, changed_character
- `OBEROIRLTY` 4.38%, RVOL 6.67, VWAP 0.82%, runner, changed_character
- `SUZLON` 3.82%, RVOL 1.28, VWAP 1.11%, accepted_green, changed_character
- `ASHOKLEY` 3.56%, RVOL 2.08, VWAP 1.10%, accepted_green, bounce_from_weakness

Top red characters:
- `VOLTAS` -4.97%, RVOL 7.58, VWAP -1.43%, seller, faded_from_strength
- `SUNPHARMA` -3.29%, RVOL 0.83, VWAP -0.98%, seller, changed_character
- `IDEA` -2.76%, RVOL 0.87, VWAP -0.99%, seller, faded_from_strength
- `INFY` -2.39%, RVOL 0.46, VWAP -0.61%, accepted_red, changed_character
- `BDL` -2.35%, RVOL 2.43, VWAP -0.89%, accepted_red, changed_character

Memory-worthy rows:
- `VOLTAS`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `MOTILALOFS`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `OBEROIRLTY`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=quiet, volume=loud
- `INOXWIND`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=quiet, volume=loud
- `NMDC`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `COCHINSHIP`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `SUNPHARMA`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `IDEA`: cooled after prior strength; shape=seller, pressure=strong, open=lean_down, volume=normal

## Day 027 - 2026-08-18

Shape mix: rest=137, accepted_red=43, accepted_green=12, dip_recover=9, seller=7, pump_fade=1
Echo mix: same_neighborhood=134, changed_character=47, faded_from_strength=12, continued_red=6, continued_green=5

Top green characters:
- `TIINDIA` 7.63%, RVOL 13.21, VWAP 1.11%, event_expansion, changed_character
- `BOSCHLTD` 3.85%, RVOL 2.33, VWAP 1.22%, accepted_green, changed_character
- `LTF` 3.50%, RVOL 2.27, VWAP 1.52%, dip_recover, continued_green
- `IDEA` 3.22%, RVOL 2.31, VWAP 1.34%, accepted_green, bounce_from_weakness
- `MCX` 3.05%, RVOL 1.50, VWAP 0.75%, accepted_green, continued_green

Top red characters:
- `SBICARD` -4.36%, RVOL 2.30, VWAP -1.42%, seller, changed_character
- `OBEROIRLTY` -4.07%, RVOL 4.78, VWAP -1.60%, seller, faded_from_strength
- `INOXWIND` -3.85%, RVOL 1.43, VWAP -0.93%, seller, faded_from_strength
- `LODHA` -2.86%, RVOL 0.64, VWAP -0.92%, seller, changed_character
- `SUZLON` -2.72%, RVOL 0.96, VWAP -1.09%, seller, faded_from_strength

Memory-worthy rows:
- `TIINDIA`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `OBEROIRLTY`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=loud
- `SBICARD`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `LTF`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `PIIND`: early weakness absorbed later; shape=dip_recover, pressure=weak, open=dump, volume=loud
- `DLF`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `INOXWIND`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=normal
- `COLPAL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 028 - 2026-08-19

Shape mix: rest=136, accepted_red=47, accepted_green=12, seller=8, dip_recover=5, runner=1
Echo mix: same_neighborhood=128, changed_character=49, continued_red=24, rested=4, faded_from_strength=2

Top green characters:
- `KAYNES` 4.72%, RVOL 1.30, VWAP 1.18%, runner, changed_character
- `NAM-INDIA` 3.17%, RVOL 1.51, VWAP 1.30%, accepted_green, changed_character
- `PNBHOUSING` 2.63%, RVOL 1.21, VWAP 1.22%, accepted_green, changed_character
- `DIXON` 2.47%, RVOL 1.52, VWAP 0.92%, accepted_green, changed_character
- `SBICARD` 2.40%, RVOL 1.73, VWAP 0.94%, accepted_green, bounce_from_weakness

Top red characters:
- `POWERINDIA` -4.56%, RVOL 1.39, VWAP -1.00%, seller, changed_character
- `ADANIENSOL` -4.16%, RVOL 1.64, VWAP -1.00%, seller, changed_character
- `LTF` -3.67%, RVOL 3.10, VWAP -0.40%, seller, faded_from_strength
- `BDL` -3.15%, RVOL 1.08, VWAP -1.00%, seller, changed_character
- `PAGEIND` -2.85%, RVOL 1.27, VWAP -0.64%, seller, continued_red

Memory-worthy rows:
- `LTF`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `PETRONET`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `KAYNES`: green with acceptance; shape=runner, pressure=neutral, open=lean_up, volume=normal
- `POWERINDIA`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `ADANIENSOL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `BDL`: red with rejection; shape=seller, pressure=strong, open=dump, volume=normal
- `MCX`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=normal
- `CGPOWER`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 029 - 2026-08-20

Shape mix: rest=153, accepted_red=29, accepted_green=20, seller=3, pump_fade=3, dip_recover=2
Echo mix: same_neighborhood=145, changed_character=40, continued_red=10, continued_green=7, rested=5

Top green characters:
- `GLENMARK` 3.32%, RVOL 1.14, VWAP 1.17%, accepted_green, bounce_from_weakness
- `MCX` 3.31%, RVOL 1.68, VWAP 1.06%, accepted_green, bounce_from_weakness
- `SBICARD` 3.30%, RVOL 4.15, VWAP 0.25%, accepted_green, continued_green
- `MOTILALOFS` 3.04%, RVOL 1.41, VWAP -0.17%, rest, same_neighborhood
- `PREMIERENE` 2.68%, RVOL 1.58, VWAP 0.25%, accepted_green, changed_character

Top red characters:
- `BDL` -3.12%, RVOL 1.31, VWAP -0.81%, seller, continued_red
- `PFC` -2.90%, RVOL 1.74, VWAP -0.66%, seller, changed_character
- `BSE` -2.75%, RVOL 1.44, VWAP -1.65%, seller, changed_character
- `RECLTD` -2.69%, RVOL 1.36, VWAP -0.16%, rest, same_neighborhood
- `GMRAIRPORT` -2.44%, RVOL 0.76, VWAP -0.98%, accepted_red, changed_character

Memory-worthy rows:
- `PFC`: red with rejection; shape=seller, pressure=weak, open=dump, volume=normal
- `BSE`: red with rejection; shape=seller, pressure=weak, open=lean_down, volume=normal
- `SWIGGY`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=normal
- `OIL`: bounced after prior weakness; shape=dip_recover, pressure=neutral, open=dump, volume=quiet
- `LICHSGFIN`: green with acceptance; shape=accepted_green, pressure=neutral, open=quiet, volume=loud
- `AUBANK`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `BDL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `ONGC`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=normal

## Day 030 - 2026-08-21

Shape mix: rest=157, accepted_red=26, accepted_green=18, dip_recover=4, seller=3, pump_fade=2
Echo mix: same_neighborhood=148, changed_character=37, rested=8, continued_red=8, continued_green=6

Top green characters:
- `BDL` 3.31%, RVOL 1.31, VWAP 0.57%, accepted_green, bounce_from_weakness
- `CDSL` 3.14%, RVOL 3.87, VWAP 0.49%, accepted_green, changed_character
- `VEDL` 2.89%, RVOL 2.15, VWAP 0.91%, accepted_green, continued_green
- `ICICIPRULI` 2.80%, RVOL 1.13, VWAP 0.54%, accepted_green, changed_character
- `POWERGRID` 2.80%, RVOL 2.19, VWAP 0.04%, rest, same_neighborhood

Top red characters:
- `KEI` -3.19%, RVOL 0.57, VWAP -0.71%, seller, changed_character
- `BRITANNIA` -2.94%, RVOL 2.01, VWAP -0.08%, rest, changed_character
- `CROMPTON` -2.73%, RVOL 3.94, VWAP -1.75%, seller, faded_from_strength
- `TIINDIA` -2.68%, RVOL 0.41, VWAP -0.65%, seller, changed_character
- `TORNTPHARM` -2.18%, RVOL 0.45, VWAP -0.56%, accepted_red, changed_character

Memory-worthy rows:
- `CROMPTON`: cooled after prior strength; shape=seller, pressure=neutral, open=quiet, volume=loud
- `KEI`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=quiet
- `TIINDIA`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=quiet
- `CDSL`: green with acceptance; shape=accepted_green, pressure=neutral, open=lean_up, volume=loud
- `BRITANNIA`: ordinary session memory; shape=rest, pressure=neutral, open=dump, volume=loud
- `HINDZINC`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `COFORGE`: early weakness absorbed later; shape=dip_recover, pressure=strong, open=dump, volume=quiet
- `SAIL`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=normal

## Day 031 - 2026-08-24

Shape mix: rest=162, accepted_red=32, pump_fade=6, accepted_green=5, seller=2, runner=2
Echo mix: same_neighborhood=150, changed_character=37, continued_red=8, rested=6, faded_from_strength=5

Top green characters:
- `MUTHOOTFIN` 4.55%, RVOL 2.46, VWAP 0.94%, runner, changed_character
- `SIEMENS` 4.54%, RVOL 3.40, VWAP 0.70%, runner, continued_green
- `VMM` 3.58%, RVOL 17.68, VWAP 0.16%, event_expansion, changed_character
- `GLENMARK` 3.28%, RVOL 1.45, VWAP 1.41%, accepted_green, changed_character
- `SAIL` 2.42%, RVOL 2.82, VWAP -0.14%, rest, changed_character

Top red characters:
- `DIXON` -3.13%, RVOL 2.11, VWAP -0.32%, seller, changed_character
- `CROMPTON` -2.66%, RVOL 1.21, VWAP -0.49%, seller, continued_red
- `PREMIERENE` -2.49%, RVOL 0.66, VWAP -0.92%, accepted_red, changed_character
- `HAL` -2.30%, RVOL 0.56, VWAP -0.60%, accepted_red, changed_character
- `SBILIFE` -2.10%, RVOL 0.63, VWAP -0.57%, accepted_red, changed_character

Memory-worthy rows:
- `VMM`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `MUTHOOTFIN`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `DIXON`: red with rejection; shape=seller, pressure=strong, open=dump, volume=loud
- `SIEMENS`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `CDSL`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `SAIL`: ordinary session memory; shape=rest, pressure=neutral, open=sprint, volume=loud
- `CROMPTON`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `OFSS`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=quiet

## Day 032 - 2026-08-25

Shape mix: rest=151, accepted_green=39, accepted_red=9, runner=4, pump_fade=3, dip_recover=3
Echo mix: same_neighborhood=148, changed_character=47, rested=5, faded_from_strength=3, continued_green=3

Top green characters:
- `IDEA` 7.88%, RVOL 4.13, VWAP 1.98%, runner, changed_character
- `PAYTM` 5.29%, RVOL 2.11, VWAP 1.88%, runner, changed_character
- `IREDA` 5.03%, RVOL 2.31, VWAP 2.71%, runner, changed_character
- `ANGELONE` 4.92%, RVOL 2.35, VWAP 1.88%, runner, changed_character
- `ADANIENT` 3.21%, RVOL 2.03, VWAP 1.85%, accepted_green, changed_character

Top red characters:
- `FEDERALBNK` -3.01%, RVOL 4.06, VWAP -0.27%, seller, changed_character
- `OIL` -2.42%, RVOL 0.40, VWAP -0.85%, accepted_red, changed_character
- `VMM` -2.10%, RVOL 1.39, VWAP -0.50%, accepted_red, faded_from_strength
- `RVNL` -1.60%, RVOL 1.70, VWAP -0.61%, accepted_red, continued_red
- `NATIONALUM` -1.50%, RVOL 0.44, VWAP 0.09%, rest, same_neighborhood

Memory-worthy rows:
- `IDEA`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `PAYTM`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=lean_up, volume=loud
- `IREDA`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=quiet, volume=loud
- `ANGELONE`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `FEDERALBNK`: red with rejection; shape=seller, pressure=neutral, open=quiet, volume=loud
- `OFSS`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=normal
- `SHREECEM`: green with acceptance; shape=accepted_green, pressure=weak, open=quiet, volume=loud
- `ADANIENT`: green with acceptance; shape=accepted_green, pressure=neutral, open=quiet, volume=loud

## Day 033 - 2026-08-26

Shape mix: rest=129, accepted_red=39, accepted_green=25, pump_fade=7, dip_recover=4, seller=4
Echo mix: same_neighborhood=128, changed_character=58, continued_green=11, rested=5, faded_from_strength=4

Top green characters:
- `SAIL` 5.14%, RVOL 2.09, VWAP 2.52%, dip_recover, continued_green
- `VEDL` 4.17%, RVOL 1.97, VWAP 1.57%, runner, changed_character
- `HINDZINC` 4.13%, RVOL 3.26, VWAP 1.43%, runner, changed_character
- `GVT&D` 3.94%, RVOL 1.00, VWAP 1.52%, accepted_green, changed_character
- `LICHSGFIN` 3.88%, RVOL 3.16, VWAP 0.79%, accepted_green, continued_green

Top red characters:
- `VBL` -5.96%, RVOL 7.34, VWAP -1.68%, seller, faded_from_strength
- `JUBLFOOD` -4.09%, RVOL 0.61, VWAP -2.03%, seller, changed_character
- `PREMIERENE` -4.00%, RVOL 2.64, VWAP -0.61%, seller, changed_character
- `CROMPTON` -2.82%, RVOL 2.88, VWAP -0.33%, seller, changed_character
- `DMART` -2.65%, RVOL 5.98, VWAP 0.10%, rest, same_neighborhood

Memory-worthy rows:
- `VBL`: cooled after prior strength; shape=seller, pressure=neutral, open=dump, volume=loud
- `HINDZINC`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `PREMIERENE`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `CROMPTON`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `SAIL`: early weakness absorbed later; shape=dip_recover, pressure=strong, open=dump, volume=loud
- `SAGILITY`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `VEDL`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=normal
- `JUBLFOOD`: red with rejection; shape=seller, pressure=strong, open=dump, volume=quiet

## Day 034 - 2026-08-27

Shape mix: rest=135, accepted_red=44, accepted_green=12, seller=10, pump_fade=7, runner=1
Echo mix: same_neighborhood=121, changed_character=53, rested=9, faded_from_strength=8, continued_red=8

Top green characters:
- `BHEL` 4.13%, RVOL 2.84, VWAP 0.40%, runner, changed_character
- `DELHIVERY` 3.56%, RVOL 1.27, VWAP 0.96%, accepted_green, changed_character
- `KALYANKJIL` 3.34%, RVOL 1.00, VWAP 0.83%, accepted_green, changed_character
- `ADANIPOWER` 3.18%, RVOL 4.91, VWAP 1.33%, accepted_green, changed_character
- `AMBER` 3.15%, RVOL 1.87, VWAP 0.12%, rest, same_neighborhood

Top red characters:
- `MANAPPURAM` -4.84%, RVOL 1.35, VWAP -1.40%, seller, changed_character
- `MUTHOOTFIN` -3.99%, RVOL 0.76, VWAP -1.53%, seller, changed_character
- `HINDALCO` -3.81%, RVOL 0.74, VWAP -1.15%, seller, changed_character
- `HDFCAMC` -3.48%, RVOL 2.88, VWAP -0.57%, seller, changed_character
- `SBICARD` -2.84%, RVOL 1.03, VWAP -0.93%, seller, changed_character

Memory-worthy rows:
- `BHEL`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `HDFCAMC`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `ZYDUSLIFE`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `MANAPPURAM`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=normal
- `MUTHOOTFIN`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=normal
- `HINDALCO`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=quiet
- `SBICARD`: red with rejection; shape=seller, pressure=strong, open=lean_down, volume=normal
- `VEDL`: cooled after prior strength; shape=seller, pressure=strong, open=dump, volume=normal

## Day 035 - 2026-08-28

Shape mix: rest=151, accepted_red=35, accepted_green=15, runner=4, seller=2, dip_recover=2
Echo mix: same_neighborhood=129, changed_character=39, continued_red=23, rested=9, faded_from_strength=6

Top green characters:
- `ATHERENERG` 6.19%, RVOL 3.52, VWAP 1.59%, runner, changed_character
- `COFORGE` 5.22%, RVOL 2.79, VWAP 1.64%, runner, changed_character
- `SAGILITY` 4.37%, RVOL 2.94, VWAP 1.10%, runner, changed_character
- `LTM` 4.09%, RVOL 2.74, VWAP 0.68%, runner, changed_character
- `APLAPOLLO` 3.80%, RVOL 1.37, VWAP 1.47%, accepted_green, continued_green

Top red characters:
- `CROMPTON` -3.13%, RVOL 1.27, VWAP -0.19%, rest, same_neighborhood
- `BDL` -2.84%, RVOL 0.84, VWAP -0.56%, seller, continued_red
- `KALYANKJIL` -2.72%, RVOL 0.57, VWAP -0.98%, seller, faded_from_strength
- `TVSMOTOR` -2.63%, RVOL 2.97, VWAP 0.90%, rest, continued_red
- `IDEA` -2.33%, RVOL 0.81, VWAP -0.55%, accepted_red, continued_red

Memory-worthy rows:
- `ATHERENERG`: loud runner with VWAP acceptance; shape=runner, pressure=strong, open=sprint, volume=loud
- `COFORGE`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `SAGILITY`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `LTM`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `PREMIERENE`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=loud
- `KALYANKJIL`: cooled after prior strength; shape=seller, pressure=strong, open=quiet, volume=quiet
- `KPITTECH`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `CONCOR`: green with acceptance; shape=accepted_green, pressure=weak, open=sprint, volume=loud

## Day 036 - 2026-08-31

Shape mix: rest=143, dip_recover=22, seller=16, accepted_red=16, accepted_green=11, pump_fade=1
Echo mix: same_neighborhood=142, changed_character=30, continued_red=20, rested=8, faded_from_strength=7

Top green characters:
- `SBICARD` 5.16%, RVOL 4.00, VWAP 1.51%, runner, changed_character
- `ASTRAL` 3.51%, RVOL 2.59, VWAP 1.35%, accepted_green, changed_character
- `CAMS` 3.45%, RVOL 2.70, VWAP 1.00%, accepted_green, continued_green
- `PAYTM` 3.41%, RVOL 0.43, VWAP 1.02%, accepted_green, bounce_from_weakness
- `INDHOTEL` 1.92%, RVOL 2.32, VWAP 0.41%, accepted_green, changed_character

Top red characters:
- `ADANIENSOL` -7.49%, RVOL 5.71, VWAP -1.73%, seller, continued_red
- `KAYNES` -6.82%, RVOL 1.66, VWAP -2.06%, seller, continued_red
- `ADANIENT` -6.32%, RVOL 5.07, VWAP -1.08%, seller, changed_character
- `LAURUSLABS` -4.23%, RVOL 3.70, VWAP -1.51%, seller, changed_character
- `ADANIPOWER` -3.94%, RVOL 1.97, VWAP -1.10%, seller, continued_red

Memory-worthy rows:
- `ADANIENT`: red with rejection; shape=seller, pressure=strong, open=dump, volume=loud
- `SBICARD`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `LAURUSLABS`: red with rejection; shape=seller, pressure=strong, open=dump, volume=loud
- `ETERNAL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `ADANIPORTS`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `GMRAIRPORT`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `HDFCBANK`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `ADANIENSOL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud

## Day 037 - 2026-09-01

Shape mix: rest=112, accepted_red=62, seller=27, accepted_green=6, dip_recover=2, pump_fade=1
Echo mix: same_neighborhood=98, changed_character=71, continued_red=28, bounce_from_weakness=4, faded_from_strength=4

Top green characters:
- `MPHASIS` 3.45%, RVOL 2.36, VWAP 0.31%, accepted_green, changed_character
- `ADANIGREEN` 3.11%, RVOL 3.08, VWAP 0.19%, rest, bounce_from_weakness
- `HCLTECH` 2.74%, RVOL 2.19, VWAP 0.11%, rest, same_neighborhood
- `PERSISTENT` 2.67%, RVOL 1.34, VWAP 0.38%, accepted_green, bounce_from_weakness
- `ATHERENERG` 2.60%, RVOL 1.78, VWAP 1.13%, accepted_green, changed_character

Top red characters:
- `KALYANKJIL` -5.98%, RVOL 1.05, VWAP -1.33%, seller, changed_character
- `NESTLEIND` -5.17%, RVOL 1.35, VWAP -0.94%, seller, changed_character
- `VMM` -4.60%, RVOL 0.76, VWAP -1.24%, seller, changed_character
- `MARUTI` -4.58%, RVOL 3.27, VWAP -0.87%, seller, changed_character
- `KEI` -4.39%, RVOL 1.25, VWAP -1.73%, seller, changed_character

Memory-worthy rows:
- `MARUTI`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `POLYCAB`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `TVSMOTOR`: red with rejection; shape=seller, pressure=neutral, open=lean_up, volume=loud
- `ADANIENSOL`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `KALYANKJIL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `NESTLEIND`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `KEI`: red with rejection; shape=seller, pressure=strong, open=dump, volume=normal
- `VMM`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 038 - 2026-09-02

Shape mix: rest=135, accepted_green=42, dip_recover=16, accepted_red=12, seller=3, pump_fade=1
Echo mix: same_neighborhood=127, changed_character=33, continued_red=23, bounce_from_weakness=13, rested=9

Top green characters:
- `JSWENERGY` 4.66%, RVOL 2.21, VWAP 0.91%, runner, changed_character
- `TATAPOWER` 3.93%, RVOL 2.57, VWAP 1.14%, accepted_green, changed_character
- `ADANIGREEN` 3.85%, RVOL 1.75, VWAP 0.82%, accepted_green, continued_green
- `VBL` 3.64%, RVOL 1.40, VWAP 0.73%, accepted_green, changed_character
- `KALYANKJIL` 3.61%, RVOL 1.79, VWAP 1.71%, accepted_green, bounce_from_weakness

Top red characters:
- `VOLTAS` -3.98%, RVOL 2.01, VWAP -0.94%, seller, changed_character
- `HEROMOTOCO` -3.60%, RVOL 2.74, VWAP 0.35%, rest, continued_red
- `ATHERENERG` -3.48%, RVOL 1.34, VWAP -2.29%, seller, faded_from_strength
- `KEI` -3.24%, RVOL 1.79, VWAP -0.63%, seller, continued_red
- `SONACOMS` -2.47%, RVOL 1.81, VWAP 0.29%, rest, continued_red

Memory-worthy rows:
- `JSWENERGY`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=quiet, volume=loud
- `VOLTAS`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `ATHERENERG`: cooled after prior strength; shape=seller, pressure=strong, open=lean_down, volume=normal
- `TATAPOWER`: green with acceptance; shape=accepted_green, pressure=weak, open=lean_up, volume=loud
- `RBLBANK`: green with acceptance; shape=accepted_green, pressure=neutral, open=quiet, volume=loud
- `UPL`: green with acceptance; shape=accepted_green, pressure=neutral, open=quiet, volume=loud
- `KEI`: red with rejection; shape=seller, pressure=weak, open=lean_down, volume=normal
- `LTF`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=normal

## Day 039 - 2026-09-03

Shape mix: rest=139, accepted_red=38, accepted_green=20, pump_fade=5, seller=4, dip_recover=3
Echo mix: same_neighborhood=131, changed_character=50, continued_green=7, faded_from_strength=6, rested=6

Top green characters:
- `SOLARINDS` 3.88%, RVOL 3.15, VWAP 0.01%, rest, continued_green
- `MAHABANK` 3.81%, RVOL 3.54, VWAP 0.04%, rest, same_neighborhood
- `INOXWIND` 3.62%, RVOL 3.09, VWAP 2.93%, dip_recover, continued_green
- `BSE` 3.32%, RVOL 1.29, VWAP 1.16%, accepted_green, changed_character
- `SBICARD` 2.97%, RVOL 1.69, VWAP -0.09%, rest, continued_green

Top red characters:
- `MCX` -3.89%, RVOL 0.87, VWAP -0.65%, seller, changed_character
- `FEDERALBNK` -3.52%, RVOL 1.48, VWAP -0.86%, seller, changed_character
- `APLAPOLLO` -3.41%, RVOL 2.25, VWAP -0.32%, seller, changed_character
- `KAYNES` -3.07%, RVOL 0.80, VWAP -1.17%, seller, changed_character
- `HCLTECH` -2.36%, RVOL 0.78, VWAP -0.20%, rest, same_neighborhood

Memory-worthy rows:
- `RBLBANK`: abnormal expansion; check whether it rests or continues; shape=event_expansion, pressure=neutral, open=sprint, volume=event_loud
- `APLAPOLLO`: red with rejection; shape=seller, pressure=strong, open=dump, volume=loud
- `INOXWIND`: early weakness absorbed later; shape=dip_recover, pressure=weak, open=dump, volume=loud
- `GODREJPROP`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `MCX`: red with rejection; shape=seller, pressure=strong, open=dump, volume=normal
- `FEDERALBNK`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `KAYNES`: red with rejection; shape=seller, pressure=weak, open=dump, volume=normal
- `IDFCFIRSTB`: green with acceptance; shape=accepted_green, pressure=neutral, open=lean_up, volume=loud

## Day 040 - 2026-09-04

Shape mix: rest=151, accepted_red=33, accepted_green=18, seller=3, pump_fade=3, runner=1
Echo mix: same_neighborhood=141, changed_character=39, continued_red=12, rested=5, faded_from_strength=5

Top green characters:
- `APLAPOLLO` 4.29%, RVOL 1.49, VWAP 1.13%, runner, bounce_from_weakness
- `IDEA` 3.65%, RVOL 1.08, VWAP 0.59%, accepted_green, changed_character
- `KAYNES` 3.36%, RVOL 0.92, VWAP 1.52%, accepted_green, bounce_from_weakness
- `SBILIFE` 3.21%, RVOL 2.12, VWAP 0.74%, accepted_green, changed_character
- `PFC` 3.17%, RVOL 2.03, VWAP 0.64%, accepted_green, changed_character

Top red characters:
- `ATHERENERG` -3.65%, RVOL 1.20, VWAP -0.43%, seller, continued_red
- `SRF` -3.23%, RVOL 1.45, VWAP -0.52%, seller, changed_character
- `KEI` -2.86%, RVOL 6.55, VWAP -1.36%, seller, faded_from_strength
- `HCLTECH` -2.36%, RVOL 1.22, VWAP -0.91%, accepted_red, continued_red
- `MPHASIS` -2.36%, RVOL 0.36, VWAP -1.05%, accepted_red, changed_character

Memory-worthy rows:
- `KEI`: cooled after prior strength; shape=seller, pressure=neutral, open=lean_down, volume=loud
- `APLAPOLLO`: bounced after prior weakness; shape=runner, pressure=neutral, open=quiet, volume=normal
- `SRF`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `POLYCAB`: red with rejection; shape=accepted_red, pressure=neutral, open=dump, volume=loud
- `IEX`: red with rejection; shape=accepted_red, pressure=neutral, open=dump, volume=loud
- `SBILIFE`: green with acceptance; shape=accepted_green, pressure=neutral, open=lean_up, volume=loud
- `PFC`: green with acceptance; shape=accepted_green, pressure=weak, open=quiet, volume=loud
- `HAVELLS`: red with rejection; shape=accepted_red, pressure=neutral, open=dump, volume=loud

## Day 041 - 2026-09-07

Shape mix: rest=139, accepted_red=44, accepted_green=16, seller=7, pump_fade=2, dip_recover=2
Echo mix: same_neighborhood=130, changed_character=49, continued_red=16, faded_from_strength=5, rested=4

Top green characters:
- `BOSCHLTD` 3.64%, RVOL 1.15, VWAP 1.12%, accepted_green, changed_character
- `IDEA` 3.51%, RVOL 1.38, VWAP 0.67%, accepted_green, continued_green
- `SUPREMEIND` 3.42%, RVOL 2.06, VWAP 0.54%, accepted_green, changed_character
- `ZYDUSLIFE` 3.41%, RVOL 1.21, VWAP 0.30%, accepted_green, bounce_from_weakness
- `SBICARD` 2.89%, RVOL 1.12, VWAP 1.45%, accepted_green, changed_character

Top red characters:
- `SAIL` -4.67%, RVOL 1.27, VWAP -1.05%, seller, changed_character
- `GODREJPROP` -3.56%, RVOL 1.38, VWAP -0.60%, seller, changed_character
- `ICICIPRULI` -3.27%, RVOL 1.41, VWAP -1.20%, seller, changed_character
- `OFSS` -3.14%, RVOL 0.86, VWAP -0.57%, seller, continued_red
- `KEI` -3.11%, RVOL 2.64, VWAP -0.53%, seller, continued_red

Memory-worthy rows:
- `KEI`: red with rejection; shape=seller, pressure=weak, open=dump, volume=loud
- `SAIL`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `GODREJPROP`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=normal
- `ICICIPRULI`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `BHEL`: red with rejection; shape=seller, pressure=neutral, open=lean_down, volume=quiet
- `SUPREMEIND`: green with acceptance; shape=accepted_green, pressure=weak, open=sprint, volume=loud
- `RVNL`: red with rejection; shape=accepted_red, pressure=weak, open=quiet, volume=loud
- `OFSS`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal

## Day 042 - 2026-09-08

Shape mix: rest=153, accepted_red=26, accepted_green=22, dip_recover=6, pump_fade=2, runner=1
Echo mix: same_neighborhood=143, changed_character=33, continued_red=16, rested=8, continued_green=4

Top green characters:
- `KALYANKJIL` 4.09%, RVOL 1.18, VWAP 1.06%, runner, changed_character
- `LAURUSLABS` 3.86%, RVOL 0.92, VWAP 0.87%, accepted_green, continued_green
- `BANDHANBNK` 3.42%, RVOL 3.89, VWAP 0.94%, accepted_green, changed_character
- `HAL` 2.75%, RVOL 2.85, VWAP 0.29%, accepted_green, changed_character
- `GVT&D` 2.57%, RVOL 5.03, VWAP 1.04%, accepted_green, changed_character

Top red characters:
- `BPCL` -2.35%, RVOL 0.91, VWAP -0.71%, accepted_red, changed_character
- `BLUESTARCO` -2.21%, RVOL 2.89, VWAP -0.60%, accepted_red, changed_character
- `PETRONET` -1.99%, RVOL 0.74, VWAP -0.70%, accepted_red, changed_character
- `HINDPETRO` -1.92%, RVOL 0.67, VWAP -1.01%, accepted_red, changed_character
- `ANGELONE` -1.91%, RVOL 0.39, VWAP -0.40%, accepted_red, changed_character

Memory-worthy rows:
- `POWERINDIA`: early weakness absorbed later; shape=dip_recover, pressure=weak, open=dump, volume=loud
- `KALYANKJIL`: green with acceptance; shape=runner, pressure=neutral, open=sprint, volume=normal
- `LODHA`: early weakness absorbed later; shape=dip_recover, pressure=neutral, open=dump, volume=normal
- `BANDHANBNK`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `GVT&D`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `HAL`: green with acceptance; shape=accepted_green, pressure=neutral, open=sprint, volume=loud
- `BLUESTARCO`: red with rejection; shape=accepted_red, pressure=neutral, open=dump, volume=loud
- `KAYNES`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=quiet

## Day 043 - 2026-09-09

Shape mix: rest=136, accepted_red=41, accepted_green=17, pump_fade=7, seller=5, runner=3
Echo mix: same_neighborhood=134, changed_character=50, continued_red=13, continued_green=4, rested=4

Top green characters:
- `ADANIENT` 4.87%, RVOL 3.54, VWAP 0.64%, runner, changed_character
- `PAYTM` 4.53%, RVOL 2.17, VWAP 0.87%, runner, changed_character
- `MAXHEALTH` 4.36%, RVOL 2.47, VWAP 0.47%, runner, changed_character
- `SWIGGY` 3.36%, RVOL 1.36, VWAP 1.31%, accepted_green, changed_character
- `ADANIPOWER` 3.33%, RVOL 1.74, VWAP 0.39%, accepted_green, continued_green

Top red characters:
- `HDFCLIFE` -3.50%, RVOL 3.93, VWAP -0.44%, seller, continued_red
- `LODHA` -3.28%, RVOL 1.24, VWAP -1.54%, seller, changed_character
- `MOTILALOFS` -2.91%, RVOL 0.38, VWAP -1.26%, seller, changed_character
- `GODREJPROP` -2.65%, RVOL 0.89, VWAP -1.36%, seller, changed_character
- `UNITDSPR` -2.57%, RVOL 0.89, VWAP -0.28%, seller, changed_character

Memory-worthy rows:
- `ADANIENT`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `PAYTM`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `MAXHEALTH`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `HDFCLIFE`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=loud
- `BIOCON`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `NHPC`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `LT`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `LODHA`: red with rejection; shape=seller, pressure=neutral, open=quiet, volume=normal

## Day 044 - 2026-09-10

Shape mix: rest=130, accepted_red=52, accepted_green=13, seller=7, pump_fade=6, runner=2
Echo mix: same_neighborhood=125, changed_character=54, continued_red=17, faded_from_strength=6, rested=5

Top green characters:
- `BLUESTARCO` 4.41%, RVOL 2.30, VWAP 0.91%, runner, changed_character
- `FORCEMOT` 4.21%, RVOL 3.43, VWAP 0.64%, runner, changed_character
- `MANAPPURAM` 3.77%, RVOL 1.33, VWAP 0.85%, accepted_green, changed_character
- `PNBHOUSING` 3.37%, RVOL 1.45, VWAP 0.71%, accepted_green, bounce_from_weakness
- `ATHERENERG` 2.83%, RVOL 1.81, VWAP 1.32%, accepted_green, changed_character

Top red characters:
- `IDEA` -5.48%, RVOL 1.79, VWAP -2.22%, seller, changed_character
- `ADANIENSOL` -3.92%, RVOL 0.40, VWAP -1.34%, seller, changed_character
- `KAYNES` -3.27%, RVOL 0.78, VWAP -1.51%, seller, changed_character
- `DIXON` -3.16%, RVOL 1.31, VWAP -1.06%, seller, continued_red
- `SUZLON` -2.75%, RVOL 1.11, VWAP -1.38%, seller, changed_character

Memory-worthy rows:
- `FORCEMOT`: loud runner with VWAP acceptance; shape=runner, pressure=weak, open=sprint, volume=loud
- `BLUESTARCO`: loud runner with VWAP acceptance; shape=runner, pressure=neutral, open=sprint, volume=loud
- `OIL`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `IDEA`: red with rejection; shape=seller, pressure=strong, open=dump, volume=normal
- `CANBK`: early strength rejected later; shape=pump_fade, pressure=neutral, open=sprint, volume=loud
- `ADANIENSOL`: red with rejection; shape=seller, pressure=weak, open=dump, volume=quiet
- `KAYNES`: red with rejection; shape=seller, pressure=neutral, open=dump, volume=normal
- `SUZLON`: red with rejection; shape=seller, pressure=neutral, open=quiet, volume=normal
