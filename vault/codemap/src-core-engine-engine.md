---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4484行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L96 **export** interface `ApplyResult`
- L101 **export** fn `applyAction`
- L113 **export** class `IllegalAction`
- L115 interface `Response`
- L166 fn `describeTrigger`
- L176 fn `bindSubjectFilters`
- L202 fn `bindCondition`
- L209 fn `bindEvent`
- L227 **export** class `Ctx`

## メソッド

- L240 `handle`
- L344 `manualMoveByRule`
- L378 `manual`
- L386 `nextPhase`
- L393 `enterPhase`
- L399 `runPhase`
- L501 `turnSwitch`
- L539 `chargeMana`
- L552 `playCard`
- L637 `playAlt`
- L652 `payAlt`
- L696 `battleBonus`
- L710 `attack`
- L732 `respond`
- L755 `run`
- L776 `insertFront`
- L780 `flushTriggers`
- L801 `offerHandTriggers`
- L841 `pickManaToUntap`
- L857 `gateCandidates`
- L864 `gateReady`
- L874 `fireZoneGates`
- L890 `execZoneGate`
- L933 `addTrigger`
- L938 `execPickTrigger`
- L961 `takeResponse`
- L967 `effectTasks`
- L972 `exec`
- L1668 `execShieldTrigger`
- L1703 `conditionalTrigger`
- L1709 `execAttackSwap`
- L1776 `stackFromBattle`
- L1807 `execCommandUnseal`
- L1837 `sealCard`
- L1852 `afterSealRemoved`
- L1868 `crossGear`
- L1875 `godLinkHeads`
- L1888 `linkGod`
- L1898 `checkForcedAttack`
- L1903 `execLeave`
- L2211 `payCandidates`
- L2250 `execEffect`
- L3331 `useFree`
- L3343 `playFree`
- L3367 `execMove`
- L3427 `popTop`
- L3446 `faceUpShields`
- L3452 `removeFromShield`
- L3470 `placeOnShield`
- L3494 `putUnder`
- L3511 `setTapped`
- L3519 `moveTo`
- L3528 `putIntoBattle`
- L3548 `lookAtTop`
- L3647 `awakenLink`
- L3678 `unlink`
- L3700 `removeOwnSeals`
- L3729 `soulRaid`
- L3761 `withTargets`
- L3896 `abilityTasks`
- L3910 `triggerFrom`
- L3946 `triggerOthers`
- L3954 `whoMatches`
- L3959 `emit`
- L4190 `random`
- L4196 `shuffle`
- L4205 `topOfDeck`
- L4210 `draw`
- L4229 `deckToGrave`
- L4235 `moveCard`
- L4358 `checkStateBased`
- L4401 `gameOver`
- L4419 `sendUnderToDeckBottom`
- L4431 `avertLossUnder`
- L4447 `avertLoss`
- L4472 `name`
- L4480 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:244 · CROSS:246 · HYPERIZE:258 · CONCEDE:267 · MANUAL_MOVE:270 · MANUAL_TAP:281 · MANUAL_DRAW:286 · MANUAL_SHUFFLE:291 · MANUAL_POWER:296 · MANUAL_LOG:301 · NEXT_PHASE:311 · END_TURN:314 · CHARGE_MANA:317 · PLAY_CARD:319 · ATTACK:322 · TAP_ABILITY:324

### runPhase
start:406 · draw:456 · end:466

### exec
phase:975 · turnSwitch:979 · effect:983 · denyTriggers:999 · confirmOptional:1019 · castSpell:1034 · spellToGrave:1046 · enterBattle:1109 · leave:1344 · commandUnseal:1347 · attackSwap:1350 · attackSwapOrder:1353 · pickTrigger:1366 · abilityEnd:1369 · kirifudash:1372 · attackEnd:1387 · linkRelease:1404 · hyperize:1422 · blockStep:1443 · attackResolve:1463 · battle:1487 · battleWon:1530 · beforeBreak:1534 · breakShields:1542 · shieldTrigger:1646 · orderShieldTriggers:1649

### execLeave
stay:2006 · shedUnder:2008 · underToDeckBottom:2023 · unflip:2033 · shedTop:2042 · seal:2054 · escape:2063 · destroySelf:2073 · faceUpShieldToGrave:2076 · avertCost:2094 · payCards:2127 · destroyOther:2157

### execEffect
draw:2257 · addManaFromDeck:2272 · addShieldFromDeck:2274 · choose:2276 · nextSummonDiscount:2281 · markUsed:2285 · deckTopTo:2288 · revealUntilSameCost:2314 · discardRandom:2335 · destroyDuplicates:2358 · seal:2376 · discardUnder:2380 · optional:2419 · opponentMay:2422 · ifChosen:2426 · repeat:2431 · chooseDest:2446 · revealTopAll:2465 · revealUntil:2492 · attachGear:2524 · buzzRenda:2554 · upToTimes:2583 · magibomber:2593 · manual:2625 · extraTurn:2637 · skipRestOfTurn:2641 · useOnce:2650 · zoneGate:2653 · dSwitchFlip:2655 · winGame:2661 · breakShields:2665 · selfAction:2668 · turnStatic:2713 · playFree:2729 · flipSelf:2733 · destroyTopCard:2753 · splitFate:2768 · castSelfTwin:2799 · castOwnTwin:2804 · atTurnEnd:2822 · useAbilityOf:2835 · godLink:2863 · godUnlink:2878 · swapGraveMana:2896 · shieldForce:2905 · dynamo:2921 · shieldPlus:2931 · handPlay:2973 · grSummon:3001 · afterAttack:3012 · chooseNumber:3020 · lookAtHand:3030 · tapOrUntap:3035 · fight:3053 · fightPair:3061 · gachinko:3098 · conditional:3117 · chooseOne:3122 · lookAtTop:3145 · powerMod:3147 · grantKeyword:3165 · move:3185 · bounce:3188 · toHand:3189 · shieldToHand:3190 · graveyardToHand:3191 · toMana:3192 · toGraveyard:3193 · toShield:3194 · toDeckBottom:3195 · toDeckTop:3196 · putIntoBattle:3197 · destroy:3199 · tap:3203 · untap:3205 · putSelfIntoBattle:3212 · shuffleDeck:3219 · graveToDeckBottom:3225 · graveyardToDeck:3248 · revealTopCard:3255 · playRevealed:3271 · soulRaid:3285 · removeOwnSeals:3287 · awakenLink:3289 · shieldGamble:3292 · playFromHandFree:3312

### execMove
battle:3387 · under:3395 · deckTop:3398 · deckBottom:3403 · shieldTop:3405

### emit
CARD_DRAWN:3964 · CREATURE_SUMMONED:3969 · CREATURE_DESTROYED:4041 · CARD_MOVED:4066 · CREATURE_LEFT:4075 · ATTACK_DECLARED:4086 · CREATURE_TAPPED:4096 · SHIELD_LEFT:4101 · UNDER_LEFT:4113 · CARD_TARGETED:4120 · BLOCKED:4123 · BATTLE_WON:4128 · TURN_STARTED:4141 · TURN_ENDED:4144 · BROKE_SHIELDS:4147 · SHIELD_BROKEN:4151 · SHIELD_ADDED:4156 · CARD_DISCARDED:4160 · CARD_PLAYED:4171 · SPELL_CAST:4178

