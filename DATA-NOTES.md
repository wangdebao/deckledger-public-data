# Public reference data

This repository contains only public card metadata, USD reference prices and update scripts. No personal collection, website source or credential is stored here. Card images are not mirrored. Source: https://tcgcsv.com/ (TCGplayer reference data); names and associated rights remain with their respective owners. No claim of exclusive ownership or license over third-party data is made.

Scheduled pure Node.js refresh: approximately 06:17 Asia/Shanghai daily (22:17 UTC). GitHub schedules can be delayed and inactive public repositories may have schedules disabled after 60 days without activity. Successful daily data commits provide repository activity; failures require attention. There are no AI calls. Standard public-repository hosted runners are used, not paid larger runners.

The first complete run must pass before this feed is usable. Each run validates all 18 games and rejects >5% drops in card or price coverage compared with the last valid snapshot. Data is published in one Git commit, never as a partial batch. Clients should pin reads to that commit. Failure keeps the prior commit intact. USD reference prices are not local CNY quotes and not offers to buy/sell.

This scheduled task refreshes the data repository only. Website deployment/integration must be separately verified before claiming end-to-end automatic updates.

