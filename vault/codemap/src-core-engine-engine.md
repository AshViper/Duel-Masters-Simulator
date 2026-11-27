---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4113行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L94 **export** interface `ApplyResult`
- L99 **export** fn `applyAction`
- L111 **export** class `IllegalAction`
- L113 interface `Response`
- L164 fn `describeTrigger`
- L174 fn `bindCondition`
- L181 fn `bindEvent`
- L199 **export** class `Ctx`

## メソッド

- L212 `handle`
- L316 `manualMoveByRule`
- L350 `manual`
- L358 `nextPhase`
- L365 `enterPhase`
- L371 `runPhase`
- L460 `turnSwitch`
- L497 `chargeMana`
- L510 `playCard`
- L595 `playAlt`
- L610 `payAlt`
- L652 `battleBonus`
- L666 `attack`
- L688 `respond`
- L711 `run`
- L732 `insertFront`
- L736 `flushTriggers`
- L757 `offerHandTriggers`
- L792 `gateCandidates`
- L799 `gateReady`
- L809 `fireZoneGates`
- L825 `execZoneGate`
- L868 `addTrigger`
- L873 `execPickTrigger`
- L896 `takeResponse`
- L902 `effectTasks`
- L907 `exec`
- L1539 `execShieldTrigger`
- L1574 `conditionalTrigger`
- L1580 `execAttackSwap`
- L1647 `stackFromBattle`
- L1678 `execCommandUnseal`
- L1708 `sealCard`
- L1723 `afterSealRemoved`
- L1739 `crossGear`
- L1746 `checkForcedAttack`
- L1751 `execLeave`
- L2030 `payCandidates`
- L2065 `execEffect`
- L3007 `useFree`
- L3019 `playFree`
- L3043 `execMove`
- L3102 `popTop`
- L3121 `faceUpShields`
- L3127 `removeFromShield`
- L3145 `placeOnShield`
- L3169 `putUnder`
- L3186 `setTapped`
- L3194 `moveTo`
- L3203 `putIntoBattle`
- L3223 `lookAtTop`
- L3312 `awakenLink`
- L3343 `unlink`
- L3365 `removeOwnSeals`
- L3394 `soulRaid`
- L3426 `withTargets`
- L3561 `abilityTasks`
- L3569 `triggerFrom`
- L3605 `triggerOthers`
- L3613 `whoMatches`
- L3618 `emit`
- L3828 `random`
- L3834 `shuffle`
- L3843 `topOfDeck`
- L3848 `draw`
- L3867 `deckToGrave`
- L3873 `moveCard`
- L3987 `checkStateBased`
- L4030 `gameOver`
- L4048 `sendUnderToDeckBottom`
- L4060 `avertLossUnder`
- L4076 `avertLoss`
- L4101 `name`
- L4109 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:216 · CROSS:218 · HYPERIZE:230 · CONCEDE:239 · MANUAL_MOVE:242 · MANUAL_TAP:253 · MANUAL_DRAW:258 · MANUAL_SHUFFLE:263 · MANUAL_POWER:268 · MANUAL_LOG:273 · NEXT_PHASE:283 · END_TURN:286 · CHARGE_MANA:289 · PLAY_CARD:291 · ATTACK:294 · TAP_ABILITY:296

### runPhase
start:378 · draw:418 · end:428

### exec
phase:910 · turnSwitch:914 · effect:918 · confirmOptional:931 · castSpell:946 · spellToGrave:958 · enterBattle:1021 · leave:1221 · commandUnseal:1224 · attackSwap:1227 · attackSwapOrder:1230 · pickTrigger:1243 · abilityEnd:1246 · kirifudash:1249 · attackEnd:1264 · linkRelease:1281 · hyperize:1299 · blockStep:1320 · attackResolve:1339 · battle:1363 · battleWon:1406 · beforeBreak:1410 · breakShields:1418 · shieldTrigger:1517 · orderShieldTriggers:1520

### execLeave
stay:1825 · shedUnder:1827 · underToDeckBottom:1842 · unflip:1852 · shedTop:1861 · seal:1873 · escape:1882 · destroySelf:1892 · faceUpShieldToGrave:1895 · avertCost:1913 · payCards:1946 · destroyOther:1976

### execEffect
draw:2072 · addManaFromDeck:2087 · addShieldFromDeck:2089 · choose:2091 · nextSummonDiscount:2096 · markUsed:2100 · deckTopTo:2103 · revealUntilSameCost:2129 · discardRandom:2150 · destroyDuplicates:2173 · seal:2191 · discardUnder:2195 · optional:2234 · opponentMay:2237 · ifChosen:2241 · repeat:2246 · chooseDest:2261 · revealUntil:2280 · attachGear:2306 · buzzRenda:2336 · upToTimes:2365 · magibomber:2375 · manual:2407 · extraTurn:2419 · skipRestOfTurn:2423 · useOnce:2432 · zoneGate:2435 · dSwitchFlip:2437 · winGame:2443 · breakShields:2447 · selfAction:2450 · turnStatic:2495 · playFree:2511 · flipSelf:2515 · destroyTopCard:2535 · splitFate:2550 · castSelfTwin:2581 · castOwnTwin:2586 · shieldForce:2604 · dynamo:2620 · shieldPlus:2630 · handPlay:2672 · grSummon:2700 · afterAttack:2711 · chooseNumber:2719 · lookAtHand:2729 · tapOrUntap:2734 · fight:2752 · fightPair:2760 · gachinko:2797 · conditional:2816 · chooseOne:2821 · lookAtTop:2844 · powerMod:2846 · grantKeyword:2864 · move:2884 · bounce:2887 · toHand:2888 · shieldToHand:2889 · graveyardToHand:2890 · toMana:2891 · toGraveyard:2892 · toShield:2893 · toDeckBottom:2894 · toDeckTop:2895 · putIntoBattle:2896 · destroy:2898 · tap:2902 · untap:2904 · putSelfIntoBattle:2911 · shuffleDeck:2918 · graveyardToDeck:2924 · revealTopCard:2931 · playRevealed:2947 · soulRaid:2961 · removeOwnSeals:2963 · awakenLink:2965 · shieldGamble:2968 · playFromHandFree:2988

### execMove
battle:3063 · under:3070 · deckTop:3073 · deckBottom:3078 · shieldTop:3080

### emit
CARD_DRAWN:3623 · CREATURE_SUMMONED:3628 · CREATURE_DESTROYED:3686 · CARD_MOVED:3704 · CREATURE_LEFT:3713 · ATTACK_DECLARED:3724 · CREATURE_TAPPED:3734 · SHIELD_LEFT:3739 · UNDER_LEFT:3751 · CARD_TARGETED:3758 · BLOCKED:3761 · BATTLE_WON:3766 · TURN_STARTED:3779 · TURN_ENDED:3782 · BROKE_SHIELDS:3785 · SHIELD_BROKEN:3789 · SHIELD_ADDED:3794 · CARD_DISCARDED:3798 · CARD_PLAYED:3809 · SPELL_CAST:3816

