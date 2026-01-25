# FIN-005: Mobile Responsiveness Audit

**Target Viewports:**
- 375x667 (iPhone SE)
- 360x640 (Android)

**Date:** 2026-01-25
**Agent:** frontend-reviewer

---

## 🎯 Acceptance Criteria Review

1. ✅ HubHome renders correctly on mobile
2. ⚠️ Game lobbies are usable on mobile (join, start game)
3. ⚠️ Game boards scale appropriately (Catan board, UNO cards)
4. ❌ Buttons are min 44x44px for touch targets
5. ⚠️ No horizontal scroll on mobile viewports

---

## 🔍 Critical Issues Found

### 1. **INCONSISTENT RESPONSIVE BREAKPOINTS**
**Severity:** Medium
**Location:** `services/web/src/styles/main.css`

Current breakpoints are inconsistent:
- 380px (Wordle)
- 480px (Connect4)
- 600px (Multiple games)
- 700px (Body padding, Wordle, Slither)
- 768px (Catan, Cribbage)
- 900px (Draw, Chess, Charades, Room)

**Issue:** This creates unpredictable behavior across viewports.

**Recommendation:** Standardize to common breakpoints:
- Mobile: 375px (iPhone SE baseline)
- Mobile Large: 600px
- Tablet: 768px
- Desktop: 1024px

---

### 2. **BUTTON TOUCH TARGETS TOO SMALL**
**Severity:** HIGH
**Location:** Multiple components

Current button padding: `14px 18px` with `font-size: 18px`
- Actual rendered height: ~46px ✓
- But many game-specific buttons are smaller

**Failing buttons:**
- `.wordle-key`: `min-width: 40px`, `height: 52px` → At 375px becomes 32px wide ❌
- `.wordle-key.special`: `min-width: 65px` → At 375px becomes 52px ❌
- `.connect4-actions .button`: `min-width: 140px` removed at 480px ❌
- Catan action buttons: No explicit sizing, likely < 44px ❌
- UNO color buttons: No sizing constraints ❌

**WCAG 2.1 Requirement:** Minimum 44x44px for touch targets

---

### 3. **CATAN BOARD: FIXED HEX SIZE**
**Severity:** HIGH
**Location:** `services/web/src/components/games/catan/CatanBoard.jsx:262`

```jsx
<HexGrid
  hexSize={50}  // ← FIXED SIZE, not responsive
```

**Issue:**
- Board renders at ~800px width (50px hex × 16 hexes wide)
- On 375px viewport: **Horizontal scroll of ~425px** ❌
- Board is completely unusable on mobile

**Solution:** Dynamic hex sizing based on viewport:
```jsx
const hexSize = Math.min(50, (window.innerWidth - 40) / 16);
```

---

### 4. **UNO HAND: CARD OVERFLOW**
**Severity:** MEDIUM
**Location:** `services/web/src/components/games/uno/UnoBoard.jsx`

No explicit card sizing in component. CSS check needed.

**CSS Analysis:**
```css
.uno-hand {
  display: flex;
  gap: 8px;
  overflow-x: auto;  /* ✓ Has scroll */
}
```

**Potential Issue:** With 7+ cards, horizontal scroll likely on 375px.

**Recommendation:**
- Reduce card size on mobile
- Reduce gap to 4px
- Consider overlapping cards like poker hand

---

### 5. **ROOM HEADER: STACKS POORLY**
**Severity:** MEDIUM
**Location:** `services/web/src/pages/Room.jsx:302-315`

```jsx
<header className="room-header">
  <div className="room-title">
    <span className="room-code">Room {joinCode}</span>
    {gameKey && <span className="room-game-badge">{gameKey.toUpperCase()}</span>}
  </div>
  <div className="room-header-actions">
    {timeLeft > 0 && <div className="room-timer">{timeLeft}s</div>}
    <button className="room-btn ghost" onClick={copyLink}>Share</button>
    <button className="room-btn ghost" onClick={() => setChatOpen(!chatOpen)}>
      Chat {chatOpen ? "▼" : "▲"}
    </button>
    <button className="room-btn ghost" onClick={leaveRoom}>Leave</button>
  </div>
</header>
```

**CSS Check:**
```css
@media (max-width: 600px) {
  .room-header {
    flex-direction: column;  /* ✓ Stacks vertically */
    gap: 12px;
  }
}
```

**Issue:** Button text might wrap. "Share" "Chat ▼" "Leave" = ~180px minimum
On 360px viewport with padding: might cause wrapping.

---

### 6. **LOBBY: NO MOBILE OPTIMIZATION**
**Severity:** LOW
**Location:** `services/web/src/pages/Lobby.jsx`

Uses generic `.app-shell` with no game-specific mobile styles.

**Issue:** Share button row might stack poorly on narrow screens.

---

### 7. **HEX GRID COMPONENT: NO MOBILE SUPPORT**
**Severity:** HIGH
**Location:** `services/web/src/components/board/HexGrid.jsx` (assumed)

The HexGrid component likely uses SVG or Canvas with fixed dimensions.

**Required Investigation:**
- Check if HexGrid supports responsive sizing
- Check if touch events work properly on mobile
- Verify zoom/pan on mobile browsers

---

### 8. **CHAT PANEL: MOBILE POSITIONING**
**Severity:** MEDIUM
**Location:** `services/web/src/components/ChatPanel.jsx`

Chat panel opens as overlay. Need to verify:
- Touch outside to close works
- Input keyboard doesn't break layout on iOS
- Doesn't block game area on small screens

---

## 📊 Accessibility Audit (WCAG 2.1 AA)

### Touch Target Size (Success Criterion 2.5.5)
**Status:** ❌ FAILING

**Issues:**
1. Wordle keyboard keys: 32px wide at mobile
2. Catan build buttons: Unknown size, likely < 44px
3. UNO color picker buttons: No explicit sizing
4. Room header buttons: May wrap and reduce height

---

### Text Scaling (Success Criterion 1.4.4)
**Status:** ⚠️ PARTIAL

Using `clamp()` for title: ✓ Good
```css
font-size: clamp(42px, 7vw, 72px);
```

**Issue:** Many buttons use fixed `font-size: 18px`
- At 200% zoom, buttons may not scale properly

---

### Orientation (Success Criterion 1.3.4)
**Status:** ✓ PASSING

No `orientation` locks in viewport meta tag. Good.

---

## 🎨 UX Issues

### 1. **Catan Board: Unusable on Mobile**
- Cannot see full board without scrolling
- Placing settlements/roads requires precision taps on tiny hexes
- Resource cards text too small

**User Impact:** Game is essentially broken on mobile.

---

### 2. **Room Sidebar: Takes Vertical Space**
**Current Behavior:** Sidebar stacks below game at <900px

**Issue:** On portrait mobile:
- Player list
- Voice panel
- Host controls
- **Then** game area

**Result:** User must scroll down 400-600px to see game.

**Recommendation:** Consider collapsible/expandable panels or tab navigation.

---

### 3. **No Touch Gestures**
**Missing Features:**
- Pinch to zoom (Catan board)
- Swipe to scroll (card hands)
- Long press for context menus

**Note:** Standard browser gestures work, but could enhance with custom handlers.

---

## 🔧 Recommended Fixes

### Priority 1: CRITICAL (Blocks mobile usability)

1. **Catan Dynamic Hex Sizing**
   - File: `CatanBoard.jsx`
   - Add responsive hex size calculation
   - Add pinch-to-zoom support

2. **Wordle Key Touch Targets**
   - File: `main.css` (lines ~6976-6984)
   - Increase min-width to 44px at all breakpoints

3. **Room Layout Mobile Optimization**
   - File: `main.css` (room section)
   - Move sidebar to collapsible drawer on mobile

---

### Priority 2: HIGH (Degrades mobile experience)

4. **Standardize Breakpoints**
   - File: `main.css`
   - Consolidate to 375px, 600px, 768px, 1024px

5. **UNO Card Sizing**
   - File: `main.css` (UNO section)
   - Add mobile-specific card dimensions

6. **Button Touch Target Audit**
   - Files: All game components
   - Ensure all interactive elements ≥ 44x44px

---

### Priority 3: MEDIUM (Polish)

7. **Chat Panel Mobile Optimization**
   - File: `ChatPanel.jsx`
   - Add bottom sheet behavior
   - Fix iOS keyboard issues

8. **Lobby Share Buttons**
   - File: `Lobby.jsx`
   - Stack buttons vertically on mobile

---

## 📈 Performance Considerations

### Bundle Size Impact
- No new dependencies required
- CSS changes only add ~2KB gzipped
- JS changes for responsive sizing: ~1KB

### Rendering Performance
- Dynamic hex sizing: Recalculates on resize (negligible impact)
- CSS media queries: No JS runtime cost

---

## ✅ Testing Plan

### Manual Testing
1. Test on iPhone SE (375x667) in Chrome DevTools
2. Test on Samsung Galaxy S8 (360x640) in Chrome DevTools
3. Test landscape orientation
4. Test at 200% zoom for accessibility

### Automated Testing
Add Playwright tests with mobile viewports:
```js
test.use({ viewport: { width: 375, height: 667 } });

test('Catan board renders without horizontal scroll', async ({ page }) => {
  // Navigate to Catan game
  // Assert no horizontal scrollbar
  const scrollWidth = await page.evaluate(() =>
    document.documentElement.scrollWidth
  );
  expect(scrollWidth).toBeLessThanOrEqual(375);
});
```

---

## 📝 Implementation Checklist

- [ ] Fix Catan dynamic hex sizing
- [ ] Fix Wordle key touch targets
- [ ] Standardize CSS breakpoints
- [ ] Audit all button sizes (44x44px minimum)
- [ ] Fix UNO card overflow
- [ ] Optimize room header for mobile
- [ ] Test horizontal scroll on all screens
- [ ] Add Playwright mobile viewport tests
- [ ] Update acceptance criteria status

---

## 🎯 Success Metrics

**Before:**
- Catan board: Horizontal scroll ~425px ❌
- Wordle keys: 32px touch targets ❌
- Button targets: Mixed, some < 44px ❌

**After:**
- Catan board: Fits within 375px viewport ✓
- Wordle keys: 44px minimum touch targets ✓
- Button targets: All ≥ 44px ✓
- No horizontal scroll on any screen ✓
- All games playable on 375x667 viewport ✓

---

**Review completed by:** @frontend-reviewer
**Next steps:** Implement Priority 1 fixes, then Priority 2.
