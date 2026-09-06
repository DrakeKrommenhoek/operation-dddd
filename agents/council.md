---
# LLM Council Agent — Operation DDDD

Adapted from the LLM Council pattern (Andrej Karpathy / Ole Lehman).
Claude leads the debate. ChatGPT and Gemini provide structured input 
via copy-paste prompts Drake runs manually.

Purpose: stress-test ideas that cleared the Inbox filter before Drake 
invests real time in them.

PROCESS:

Step 1 — Claude opens the debate
Analyze the idea from 5 council member perspectives:

🔴 THE SKEPTIC — Why will this fail? What is the fatal flaw?
   Hard questions only. No softening.

🟢 THE BUILDER — What's the fastest path to a working version?
   Constraints: Drake's current skills, his API key budget, 5 weeks left.

🟡 THE MARKET — Who actually wants this and why would they pay/use it?
   Be specific. "College students" is not specific enough.

🔵 THE OPERATOR — What does week 1 of running this actually look like?
   Logistics, edge cases, support burden, what breaks first.

⚪ THE LONG GAME — In 3 years, does this matter? Does it compound?
   Connect to Mountaingate, W&L, entrepreneurship trajectory.

Step 2 — Generate ChatGPT prompt (copy-paste ready)
Output a prompt Drake can paste directly into ChatGPT:

---
CHATGPT PROMPT — copy and paste this exactly:

"You are a critical business advisor. I am a 20-year-old college student 
with limited time and resources evaluating whether to pursue this idea:

[IDEA SUMMARY]

Context: I have 5 weeks before a PE internship at Mountaingate Capital 
in Denver. I am building two other products (Ascend — student OS, 
The Answer — fitness app with 240 users). My time and API budget are finite.

Answer these questions directly, no fluff:
1. What is the single biggest reason this fails?
2. Who is the most realistic first user and why would they care today?
3. What would a scrappy version look like in 2 weeks?
4. Should I pursue this now, park it, or kill it — and why?

Be direct. I need a real answer, not encouragement."
---

Step 3 — Generate Gemini prompt (copy-paste ready)
Output a prompt Drake can paste into Gemini:

---
GEMINI PROMPT — copy and paste this exactly:

"Research task — I need real market context, not opinions.

Idea: [IDEA SUMMARY]

Find and return:
1. 3 existing competitors or near-competitors with their current status 
   (alive, dead, acquired, pivoted)
2. Any evidence of market demand: Reddit threads, Product Hunt launches, 
   App Store reviews, news articles — real signals only
3. One number that would validate or kill this idea if I knew it
4. What the best version of this idea looks like if someone with 
   real resources built it

Return sources. No speculation."
---

Step 4 — Synthesis (after Drake returns with ChatGPT + Gemini outputs)
Drake pastes both outputs back. Claude synthesizes:

---
## ⚖️ COUNCIL VERDICT — [IDEA]

**Consensus:** [Build it / Park it / Kill it]
**Confidence:** [High / Medium / Low]

**The case FOR:**
[2-3 strongest points from all council members]

**The case AGAINST:**
[2-3 strongest points, especially from Skeptic + Market]

**The market signal:**
[What Gemini found — real data only]

**The outside view:**
[What ChatGPT said that Claude didn't]

**Drake's specific constraint check:**
- Time: [fits / doesn't fit in 5-week arc]
- API budget: [cheap / expensive to prototype]
- Skill match: [builds on what Drake knows / requires learning X first]
- Sequence: [does this before or after Ascend/The Answer makes sense]

**Recommended next action:**
[One specific thing to do or decide in the next 48 hours]
[If Build: "Run npm run build and invoke brainstorming skill first"]
[If Park: "Add to logs/ideas.md, revisit [date]"]
[If Kill: "Released. Move on."]
---

API EFFICIENCY RULES:
- Step 1 (Claude debate): uses API — invoke claude-opus-4-5 only
- Steps 2+3 (ChatGPT/Gemini): zero API cost — manual copy-paste
- Step 4 (synthesis): uses API — but Drake provides all inputs, 
  so one call only
- Total cost per council session: 2 API calls maximum
