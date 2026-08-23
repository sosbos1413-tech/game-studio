# V1.6.9 — Studio Knowledge & Deep Production

## Added
- Studio Knowledge system with 9 persistent skill domains: Engine, Gameplay, Story/Quests, Dialogues, Level Design, AI, World Design, Graphics, and Sound.
- Per-domain XP and Levels gained from actual released projects.
- Genre-aware knowledge growth: different game genres train different studio disciplines.
- Small, capped Production efficiency bonus from studio knowledge; higher knowledge improves related quality gains and slightly reduces bug/fatigue growth.
- Knowledge XP breakdown inside the post-release summary.
- Dedicated Studio Knowledge window in the R&D hub.
- Visual Topic Atlas with discovered and unknown topics, rarity, and shard discovery.
- Compact visual topic picker in the Create Game wizard.
- Research Center 2.0 organization by real disciplines while preserving the existing timed research queue.
- Game History 2.0 comparison cards showing review, units sold, cost, income, profit, release week, fans gained, and sales rank.

## Changed
- R&D hub now includes dedicated Topic Atlas and Studio Knowledge destinations.
- Packs & Collection topic cards use the new visual collection layout.
- Production task metadata now shows the relevant Studio Knowledge Level.
- Saves from V1.6.8.1 receive derived Studio Knowledge XP from their existing game history without losing prior data.
- Build/version UI updated to V1.6.9.

## Preserved
- V1.6.8.1 navigation/window system.
- Research timing, RP, cash costs, engine workshop, cards, shards, genres, platforms, living sales, awards, franchises, legacy, market, and industry systems.
- Existing LocalStorage key and migration path.

## Validation
- Two complete projects played in Chromium with different genres.
- Knowledge XP applied once per release and not duplicated by double finalize.
- Research still starts through the timed queue after categorization.
- Topic shard discovery works.
- Migration from V1.6.8.1 preserves cash, fans, reputation, engines, tokens, shards, and history.
- Responsive checks passed on 320x568, 390x844, and 430x932.
- 0 JavaScript errors.
- 0 console errors.
