---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3606行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L87 **export** interface `ApplyResult`
- L92 **export** fn `applyAction`
- L104 **export** class `IllegalAction`
- L106 interface `Response`
- L155 fn `describeTrigger`
- L164 fn `bindEvent`
- L182 **export** class `Ctx`

## メソッド

- L195 `handle`
- L280 `manual`
- L288 `nextPhase`
- L295 `enterPhase`
- L301 `runPhase`
- L382 `turnSwitch`
- L418 `chargeMana`
- L431 `playCard`
- L513 `playAlt`
- L528 `payAlt`
- L566 `battleBonus`
- L580 `attack`
- L602 `respond`
- L625 `run`
- L646 `insertFront`
- L650 `flushTriggers`
- L661 `offerHandTriggers`
- L691 `gateCandidates`
- L698 `gateReady`
- L708 `fireZoneGates`
- L724 `execZoneGate`
- L767 `addTrigger`
- L772 `execPickTrigger`
- L795 `takeResponse`
- L801 `effectTasks`
- L806 `exec`
- L1366 `execShieldTrigger`
- L1401 `conditionalTrigger`
- L1407 `execAttackSwap`
- L1465 `stackFromBattle`
- L1496 `execCommandUnseal`
- L1526 `sealCard`
- L1541 `afterSealRemoved`
- L1556 `execLeave`
- L1816 `execEffect`
- L2601 `useFree`
- L2613 `playFree`
- L2637 `execMove`
- L2681 `popTop`
- L2700 `faceUpShields`
- L2706 `removeFromShield`
- L2724 `placeOnShield`
- L2748 `putUnder`
- L2765 `setTapped`
- L2773 `moveTo`
- L2782 `putIntoBattle`
- L2797 `lookAtTop`
- L2884 `awakenLink`
- L2915 `unlink`
- L2937 `removeOwnSeals`
- L2966 `soulRaid`
- L2998 `withTargets`
- L3127 `abilityTasks`
- L3135 `triggerFrom`
- L3171 `triggerOthers`
- L3179 `whoMatches`
- L3184 `emit`
- L3353 `random`
- L3359 `shuffle`
- L3368 `topOfDeck`
- L3373 `draw`
- L3392 `deckToGrave`
- L3398 `moveCard`
- L3509 `checkStateBased`
- L3550 `gameOver`
- L3569 `avertLoss`
- L3594 `name`
- L3602 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:199 · CROSS:201 · HYPERIZE:214 · CONCEDE:223 · MANUAL_MOVE:226 · MANUAL_TAP:236 · MANUAL_DRAW:241 · MANUAL_SHUFFLE:246 · MANUAL_POWER:251 · MANUAL_LOG:256 · NEXT_PHASE:266 · END_TURN:268 · CHARGE_MANA:270 · PLAY_CARD:272 · ATTACK:275

### runPhase
start:308 · draw:345 · end:350

### exec
phase:809 · turnSwitch:813 · effect:817 · confirmOptional:830 · castSpell:841 · spellToGrave:853 · enterBattle:916 · leave:1096 · commandUnseal:1099 · attackSwap:1102 · pickTrigger:1105 · abilityEnd:1108 · kirifudash:1111 · attackEnd:1126 · linkRelease:1135 · hyperize:1153 · blockStep:1174 · attackResolve:1193 · battle:1217 · battleWon:1253 · beforeBreak:1257 · breakShields:1265 · shieldTrigger:1361

### execLeave
stay:1625 · shedUnder:1627 · unflip:1642 · shedTop:1651 · seal:1663 · escape:1672 · destroySelf:1682 · faceUpShieldToGrave:1685 · avertCost:1703 · destroyOther:1736

### execEffect
draw:1823 · addManaFromDeck:1838 · addShieldFromDeck:1840 · choose:1842 · markUsed:1847 · deckTopTo:1850 · discardRandom:1876 · destroyDuplicates:1894 · seal:1912 · discardUnder:1916 · optional:1955 · opponentMay:1958 · ifChosen:1962 · repeat:1967 · chooseDest:1982 · revealUntil:2001 · upToTimes:2027 · magibomber:2037 · manual:2069 · extraTurn:2080 · useOnce:2084 · zoneGate:2087 · dSwitchFlip:2089 · winGame:2095 · breakShields:2099 · selfAction:2102 · turnStatic:2141 · playFree:2156 · flipSelf:2160 · destroyTopCard:2180 · splitFate:2195 · castSelfTwin:2226 · castOwnTwin:2231 · shieldPlus:2244 · handPlay:2286 · grSummon:2314 · afterAttack:2325 · chooseNumber:2333 · lookAtHand:2343 · tapOrUntap:2348 · fight:2366 · fightPair:2374 · gachinko:2393 · conditional:2412 · chooseOne:2417 · lookAtTop:2440 · powerMod:2442 · grantKeyword:2458 · move:2478 · bounce:2481 · toHand:2482 · shieldToHand:2483 · graveyardToHand:2484 · toMana:2485 · toGraveyard:2486 · toShield:2487 · toDeckBottom:2488 · toDeckTop:2489 · putIntoBattle:2490 · destroy:2492 · tap:2496 · untap:2498 · putSelfIntoBattle:2505 · shuffleDeck:2512 · graveyardToDeck:2518 · revealTopCard:2525 · playRevealed:2541 · soulRaid:2555 · removeOwnSeals:2557 · awakenLink:2559 · shieldGamble:2562 · playFromHandFree:2582

### execMove
battle:2642 · under:2649 · deckTop:2652 · deckBottom:2657 · shieldTop:2659

### emit
CARD_DRAWN:3189 · CREATURE_SUMMONED:3194 · CREATURE_DESTROYED:3228 · CREATURE_LEFT:3246 · ATTACK_DECLARED:3257 · CREATURE_TAPPED:3267 · SHIELD_LEFT:3271 · UNDER_LEFT:3283 · CARD_TARGETED:3290 · BLOCKED:3293 · BATTLE_WON:3298 · TURN_STARTED:3311 · TURN_ENDED:3314 · BROKE_SHIELDS:3317 · SHIELD_BROKEN:3321 · SHIELD_ADDED:3326 · CARD_DISCARDED:3330 · CARD_PLAYED:3334 · SPELL_CAST:3341

