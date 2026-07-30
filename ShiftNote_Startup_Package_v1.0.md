---
title: "ShiftNote — AI Documentation Copilot for Nurses"
subtitle: "Startup Package v1.0 — Strategy, Product Requirements, Architecture, AI Guardrails, Compliance, Roadmap & Go-to-Market"
date: "July 2026"
---

# 0. How to use this document

**Audience:** founders, clinical advisors, investors, prospective facility partners, and the engineering team (human or AI-assisted).

**Structure:** each section is self-contained and can be lifted into a pitch deck, a Jira epic, or an AI coding prompt without rewriting.

| If you are… | Read |
|---|---|
| An investor or facility executive | §1, §2, §3, §9, §10 |
| A clinical advisor / DON / nurse leader | §3, §4, §7, §10, §11 |
| A developer or AI coding agent | §4.6, §5, §6, §7, §8, Appendix A–C |
| A designer | §4, §5.6 |

**Status of every number in this document:** figures marked `[SOURCED]` come from the references in Appendix D. Figures marked `[MODEL]` are assumptions to be validated — they are structured so you can replace the input and the conclusion recalculates. Do not present `[MODEL]` numbers to an investor as findings.

**Prior art note:** this package is a substantial revision of an earlier concept ("Voice-to-Text for Nurses" → "AI Nursing Documentation Copilot"). §2 explains what changed and why. The original instinct — solve the workflow, not the technology — was correct and is preserved.

---

# 1. Executive summary

**Product:** ShiftNote is a dictation-first documentation copilot built for the *nursing shift*, not the *physician encounter*. A nurse speaks for 20–60 seconds after a patient interaction; ShiftNote produces reviewed, attributable, multi-format documentation (narrative, SOAP, DAR, SBAR, med administration, incident, end-of-shift handoff) that the nurse verifies and files into whatever system their employer uses.

**The problem:** nurses spend roughly 23–40% of a shift on documentation depending on setting and measurement method `[SOURCED]`. In home health and hospice, 30–45 minutes of post-visit charting per visit is routine, much of it unpaid after-hours work `[SOURCED]`. Forty percent of nurses intend to leave their role by 2029, with documentation burden named as a contributing factor `[SOURCED]`. Each RN departure costs a US employer roughly $61,000 `[SOURCED]`.

**Why now, and why this shape:**

1. Ambient AI scribing crossed from pilot to standard of care in 2026, but almost entirely for *physicians* — and, since mid-2026, for nurses only inside large Epic health systems (Abridge for Nurses) and inside PointClickCare's own EHR `[SOURCED]`. The incumbents have taken the top of the market.
2. That leaves a large, unserved remainder: floor nurses in facilities the enterprise vendors will never call on, home and community nurses, agency and per-diem staff, and essentially the entire nursing workforce outside North America. There are ~29.8 million nurses globally; ~3.9–4.8 million are in the US `[SOURCED]`.
3. Ambient capture — recording the patient — is generating active litigation under state all-party consent statutes, with damages of up to $5,000 per recording under California's CIPA `[SOURCED]`. **Dictation-first capture avoids this entire class of exposure**, because the nurse is the only recorded speaker.

**The wedge:** *the shift, not the encounter.* Every incumbent models documentation as one clinician + one patient + one conversation → one note. Nursing is one clinician + 6–30 patients + 12 hours + constant interruption → many notes, several formats, one handoff. Nothing on the market is built around that object.

**The business:** prosumer-led acquisition (individual nurses, consumer price points), facility-closed revenue (the DON/administrator buys seats once nurses are already using it). Priced for a salaried professional, not a billing physician — the $99/clinician/month anchor from the physician scribe market does not transfer.

**Beachhead:** Philippines private hospitals, LTC and home-care agencies (founder is based in Davao — in-person discovery, low CAC, fast iteration), running in parallel with 1–2 US or Australian design-partner facilities in long-term care or home health. Expand from the beachhead into the global English-speaking nursing diaspora, which is disproportionately Filipino.

**What we are explicitly not building in v1:** EHR write-back integrations, ambient patient-conversation capture, clinical suggestions or advice, autonomous form-filling in a third-party EHR, and analytics dashboards.

**The 90-day objective:** prove that a nurse using ShiftNote for a full shift produces documentation that a nurse manager rates as *equal or better in quality* than their current documentation, in *less than half the time*, with **zero fabricated clinical facts** across a 200-note audited sample.

---

# 2. What changed from the original concept — and why

This is the most important section for anyone who saw the earlier version of this idea.

## 2.1 The market moved between the original concept and today

| Original assumption | 2026 reality `[SOURCED]` | Consequence |
|---|---|---|
| Nursing documentation AI is a gap nobody has filled | Abridge for Nurses shipped to 250+ Epic health systems in May 2026, co-developed with Mayo Clinic and Epic | The acute-care hospital segment is closed to a startup |
| Sitting beside PointClickCare avoids competing with the EHR | PointClickCare shipped its own native Ambient Scribe (Mar 2026), Chart Advisor, Referral Advisor and Billing Advisor (Jun 2026), and has 400+ marketplace partners | You would be competing with the landlord on their own property |
| "Copy button, no integration needed" is a differentiator | Doximity Scribe is free to verified US clinicians and is copy/paste-only; PatientNotes markets "works with any EHR via clipboard" at ~$50/mo | The clipboard bridge is table stakes, not a moat |
| $99/month subscriptions are achievable | That price is anchored on physicians who bill; self-serve scribe pricing sits at $39–$119/clinician/month for prescribers | Nurses are salaried and cannot expense this; individual pricing must be consumer-grade |

**None of this kills the idea. It relocates it.** The original strategic instinct — sell a productivity tool to the worker, not a system to the IT department — is exactly right, and it is *more* right now that the enterprise segment is being consolidated by EHR vendors.

## 2.2 Five changes to the plan

**Change 1 — From "encounter scribe" to "shift copilot."**
The unit of work is the shift, not the note. That means: a persistent patient roster for the shift, carry-forward state with provenance, an end-of-shift handoff assembled from everything captured, and the ability to dictate about patient 4 while walking away from patient 7. No incumbent is built this way.

**Change 2 — Dictation-first, not ambient.**
The original flow (nurse speaks, AI structures) was already dictation. Make that an explicit, defended product principle rather than an implementation detail. Benefits: no patient consent problem under all-party consent statutes; works during wound care, med pass, incident documentation and any moment with no conversation to capture; works in noisy corridors; drastically lower audio volume and cost; and it is the only capture mode that is honest about what nursing documentation actually is — the nurse's clinical judgement, not a transcript of small talk.

**Change 3 — "Same as yesterday" is redesigned, not removed.**
The original vision had the AI learn preferences until the nurse could say *"same as yesterday"* and the AI would fill it in. As specified, that is **copy-forward cloning** — the single most-flagged documentation-integrity risk in the industry, associated with note bloat, propagated error, wrong-chart documentation, reimbursement-fraud scrutiny and at least one physician found liable in a patient death `[SOURCED]`. It also has an estimated 66–90% clinician prevalence, so it is not hypothetical.
**Redesign:** *Carry-Forward with Mandatory Diff.* ShiftNote surfaces the prior entry item-by-item; the nurse must actively confirm, change or drop each item; anything carried is tagged as carried in the provenance record. This converts the single riskiest feature into a compliance-grade differentiator and something a Director of Nursing will actively pay for.

**Change 4 — No clinical suggestions in v1.**
The original spec included "patient has fever → AI suggests monitor temperature, notify physician if temperature exceeds…" Even disclaimed as "not medical advice," that is a clinical recommendation and moves the product toward FDA's Software-as-a-Medical-Device boundary. The January 2026 revised FDA CDS guidance keeps documentation assistance outside device regulation while continuing to assert authority over software that substitutes for clinical judgement or is used in time-critical decisions `[SOURCED]`.
**Replacement:** *Documentation-completeness prompts only* — "you documented a PRN administration but not the patient's response," "no pain reassessment recorded after the intervention." These are administrative, auditable, and are what facilities actually get cited for.

**Change 5 — The Chrome extension is a phase-2 convenience, not the killer feature.**
Auto-detecting the right textbox in a licensed third-party EHR and autofilling it means DOM injection into an application governed by someone else's terms of service, breaking on every EHR release, and creating exactly the wrong-patient paste failure mode the Joint Commission warns about. Phase 2 ships a **desktop companion with confirmed-target copy** (select patient → confirm identifiers → copy). The real integration path is a marketplace/API partnership, not screen automation.

## 2.3 What was right and is preserved

- Sell productivity to the worker, not software to the institution.
- One capture, many outputs. This remains the strongest single feature.
- Offline-first. LTC facilities, home visits and rural hospitals have unreliable connectivity, and every incumbent assumes bandwidth.
- Shadow nurses before writing code. This is in the plan as a gated Phase 0 with a deliverable.
- Documentation is a wedge into a broader nursing workflow layer — but the wedge has to win first.

---

# 3. Market and opportunity

## 3.1 The problem, quantified

| Evidence | Figure | Source class |
|---|---|---|
| Nurse shift time spent in the EHR | ~23% of a 12-hour shift (peer-reviewed, 2025) | `[SOURCED]` |
| Nurse shift time on documentation tasks | ~35–40% (US Surgeon General advisory; mixed-methods studies) | `[SOURCED]` |
| LTC nursing documentation share of working time | up to one-third (German JMIR study) | `[SOURCED]` |
| Home health post-visit charting | 30–45 min per visit; 2–3 hours/evening common | `[SOURCED]` |
| Nurses intending to leave role by 2029 | 40% (KLAS Arch Collaborative, 80,147 acute-care nurses) | `[SOURCED]` |
| US RN vacancy rate / cost per departure | 9.8% / ~$61,000 per nurse | `[SOURCED]` |
| Recoverable time from ambient capture (Epic Clarity, 29,467 encounters) | 20.6 min per 12-hr shift at ≥60% capture; 36.3 min best-in-class ceiling | `[SOURCED]` |

**Read that last row carefully.** The most rigorous published estimate of recoverable nursing documentation time is roughly **20–36 minutes per 12-hour shift**, not the 60–120 minutes the original concept claimed. Any pitch built on "we save 90 minutes a shift" will be dismantled by an informed CNO in the first meeting. Build the ROI case on 20–35 minutes plus quality and completeness gains, and let the pilot data argue upward if it earns it.

## 3.2 Market sizing

Third-party estimates of the ambient/AI clinical documentation market vary by an order of magnitude depending on definition — roughly **USD 0.6B–4.0B in 2025**, with 2026 estimates clustering around **USD 1.2–1.7B** and CAGRs of 20–30% `[SOURCED]`. Cite a range, name the source, and move on; nobody credible treats these as precise.

More useful is a bottom-up count of who could actually use ShiftNote:

| Segment | Population | Notes |
|---|---|---|
| Nurses worldwide | ~29.8M | WHO/ICN State of the World's Nursing 2025 `[SOURCED]` |
| US registered nurses | ~3.9–4.85M | Depending on source and licensure basis `[SOURCED]` |
| Philippines — beachhead | Tens of thousands of hospital, LTC, clinic and home-care nurses | Discovery target: quantify in Phase 0 |

**Serviceable obtainable market, first 24 months `[MODEL]`:** 2,000–8,000 paying individual seats plus 5–20 facility contracts. At a blended $10/seat/month that is roughly USD 250K–1.0M ARR — a real business, not a unicorn narrative, and the correct target for a bootstrapped or pre-seed team. Model this honestly; a fabricated TAM slide destroys credibility with anyone who has sold into healthcare.

## 3.3 Where the whitespace actually is

Sorted by defensibility against incumbents:

1. **Non-Epic, non-PCC facilities and the long tail** — independent SNFs, assisted living, group homes, private duty nursing, correctional health, school and occupational health, dialysis, clinics on regional or homegrown EMRs, and facilities still partly on paper. No enterprise sales team will ever visit these buyers.
2. **Outside North America** — Philippines, SEA, the Gulf, Australia/NZ aged care, and the UK. Lower price sensitivity to a $5–15 product, essentially no EHR-native AI, and a nursing workforce that already communicates in English.
3. **Shift-shaped workflows** — handoff/endorsement, incident reports, med-pass documentation, wound care series, restraint and behaviour monitoring, and family communication logs. These are nursing artifacts that no physician scribe generates.
4. **Accented and code-switched English** — a large share of the global nursing workforce speaks English as a second language or code-switches (Taglish, Hinglish, Arabic-English). ASR accuracy degrades measurably on accented and disfluent speech `[SOURCED]`. A product that is demonstrably better here has a real, testable technical moat and a natural evangelist base.

## 3.4 Competitive landscape

| Competitor | Segment | Strength | Where ShiftNote wins |
|---|---|---|---|
| **Abridge for Nurses** | Epic health systems | Deep Epic integration, linked evidence, Mayo co-development, 250+ systems | Not sold to facilities without Epic; enterprise contract only; encounter-shaped |
| **Epic AI Charting** | Epic customers | Native, bundled, ~42% of US acute market | Only exists inside Epic |
| **PointClickCare Ambient Scribe / Advisor** | US skilled nursing | Native to the dominant LTPAC EHR; billing and MDS adjacency | Practice-group/prescriber-oriented; ShiftNote serves the floor nurse and non-PCC facilities |
| **Nuance DAX / Suki / Nabla / Commure / DeepScribe** | Physician ambient | Mature, funded, validated | Physician-shaped; priced for billers |
| **Freed / Heidi / PatientNotes / Doximity Scribe** | Solo & small practice, self-serve | Low friction, $0–$119/mo, clipboard workflows | Physician/NP-shaped; no shift model, no handoff, no offline design |
| **Eleos / Lime / AutoMynd / IO Health** | Home health & hospice | OASIS/HOPE-aware, compliance-first | US-only, agency-sold, enterprise motion |
| **NurseMagic (Amesite)** | Nurse-facing consumer + enterprise | Closest direct analogue; nurse-branded | Public app-store download signals suggest weak consumer traction — evidence that a generic nurse AI app without a workflow wedge struggles to retain |

**The strategic read:** every competitor is either (a) locked to an EHR you do not control, (b) shaped around a physician encounter, or (c) selling enterprise contracts to buyers a small team cannot reach. The gap is a nurse-shaped, self-serve, offline-capable, EHR-agnostic tool with a facility upgrade path — sold first where enterprise vendors do not go.

## 3.5 Honest risks to the thesis

- **Commoditization.** Note generation from a transcript is close to a solved problem and its cost is falling. The defensibility is in the shift model, the evaluation harness, the compliance posture and the distribution — not the LLM call.
- **Vendor absorption.** If PointClickCare, WellSky, MatrixCare and HCHB all ship good native nursing scribes, the US long tail shrinks. Mitigation: geography, and the segments that have no EHR at all.
- **The buyer may not care.** Facilities pay for reimbursement, survey defensibility and turnover — not for nurse convenience. §11 builds the ROI case on those terms, not on minutes saved.
- **Clinical trust.** One published fabricated-fact incident can end the company. §7 and §8 exist for this reason and are not optional.

---

# 4. Product definition

## 4.1 Positioning

> **ShiftNote — documentation that keeps up with the shift.**
> Speak for twenty seconds. Get a note you can stand behind.

**Positioning statement (internal):** For bedside, community and long-term-care nurses who lose 20–40% of every shift to charting, ShiftNote is a dictation-first documentation copilot that turns short spoken observations into verified, multi-format nursing documentation. Unlike ambient scribes built for physician encounters and locked to a single EHR, ShiftNote is built around a full shift with many patients, works offline, records only the nurse, and never asserts a clinical fact the nurse did not say.

**Three claims we will defend with data, and nothing more:**
1. Less time charting (target: ≥50% reduction in time-to-complete a documentation event, measured).
2. Nothing invented (target: 0 fabricated clinical facts per 200 audited notes).
3. Nothing lost (target: ≥30% improvement in documentation completeness against a facility's own audit checklist).

## 4.2 Personas

**P1 — Maria, staff nurse, 12-hour shift, LTC facility, 22 residents.** *Primary.*
Charts in gaps between tasks and finishes after clock-out. Wi-Fi is unreliable in the east wing. Uses a personal phone despite an official policy discouraging it — a documented, widespread reality `[SOURCED]`. Success = clock out on time with complete charting.

**P2 — Joel, home health nurse, 6 visits/day.** *Primary.*
Charts in the car and again at night. OASIS-heavy. Success = no evening charting.

**P3 — Rina, charge nurse / shift lead.** *Secondary.*
Owns endorsement/handoff and incident documentation. Success = handoff assembled from what actually happened, not from memory at hour 12.

**P4 — Ms. Delos Reyes, Director of Nursing / Administrator.** *Economic buyer.*
Cares about survey findings, chart completeness, ADR/denial defensibility, agency hours and turnover. Does not care about nurse convenience as a line item, but does care about retention. Success = defensible charts and fewer staff resignations.

**P5 — IT / Compliance officer.** *Gatekeeper.*
Cares about BAAs, where PHI lives, retention, audit logs, SSO and whether staff can install this on personal phones. Success = a security questionnaire he can complete without escalating.

## 4.3 Jobs to be done

| # | Job | Current workaround | ShiftNote |
|---|---|---|---|
| J1 | Record what I just did before I forget it | Scrap paper, brain sheet, memory | 20-second dictation, patient-tagged |
| J2 | Turn observations into the format this chart demands | Retype from paper into the EHR | One capture → many formats |
| J3 | Not lose four hours a week to after-shift charting | Unpaid overtime | Capture at the point of care |
| J4 | Hand off without missing anything | Verbal recall + notes | Handoff assembled from the shift's own record |
| J5 | Write a defensible incident report under stress | Freeform typing, often hours later | Guided structure, timestamped, completeness prompts |
| J6 | Not get cited for a documentation gap | Manager audit after the fact | Completeness prompts before filing |

## 4.4 Non-negotiable design principles

These are constraints on every future feature decision. A feature that violates one of these does not ship.

| # | Principle | Rationale |
|---|---|---|
| **D1** | **Dictation-first. The nurse is the only recorded speaker.** Ambient patient capture is not in the roadmap without a facility-level consent workflow and legal review. | Avoids all-party consent statutes and the active litigation around them `[SOURCED]` |
| **D2** | **The model may only render what was said.** Facts are extracted, then rendered. Anything not stated becomes an explicit gap, never an inference. | Fabrication is the existential risk |
| **D3** | **No number is generated.** Vitals, doses, times and volumes are extracted as entities and confirmed in the UI before appearing in output. | A hallucinated dose is a patient-safety event |
| **D4** | **Every generated sentence is traceable to a transcript span.** | Linked evidence is now the market standard `[SOURCED]` |
| **D5** | **The nurse attests before anything leaves the app.** No auto-file, no silent export. | The clinician remains the author and is legally responsible `[SOURCED]` |
| **D6** | **Carry-forward requires an explicit per-item diff confirmation.** | Copy-forward cloning is a documented patient-safety and fraud risk `[SOURCED]` |
| **D7** | **Documentation prompts only — never clinical recommendations.** | Keeps the product outside the FDA CDS device boundary `[SOURCED]` |
| **D8** | **Offline-capable by default; the shift does not stop for the network.** | LTC/home/rural connectivity is unreliable |
| **D9** | **PHI minimization.** Audio deleted on finalization by default; no PHI in analytics, logs, crash reports or non-BAA services. | Sending PHI to a non-covered service is itself a breach `[SOURCED]` |
| **D10** | **Patient context must be confirmed before any copy or export.** | Wrong-chart documentation is the top copy-paste harm `[SOURCED]` |

## 4.5 Core flow

```
SHIFT START
  └─ Nurse opens app → confirms unit + shift → loads/creates patient roster
      (roster entries are local labels or facility-provisioned IDs — see §5.4)

DURING SHIFT  (repeat 10–40× per shift)
  └─ Tap patient  →  hold to record  →  speak 15–60 s  →  release
      └─ Local encrypted queue (works offline)
          └─ Upload when connected → medical ASR → entity extraction
              └─ REVIEW CARD:
                  • extracted vitals / meds / times shown as editable chips
                  • unconfirmed numbers highlighted amber, blocking
                  • gaps listed ("no response to PRN documented")
              └─ Nurse confirms chips → selects format(s)
                  └─ Generated draft, each sentence tap-to-see-source
                      └─ Nurse edits → ATTEST → note locked + hashed
                          └─ Copy / export / (phase 3) push to EHR

SHIFT END
  └─ "Build handoff" → SBAR/endorsement assembled from the shift's attested notes
      └─ Nurse reviews → attests → copy/export/share to next shift
```

## 4.6 MVP scope — 8 weeks of build, not 4

The original plan allocated four weeks. Voice capture, offline queue, medical ASR, entity extraction, multi-format generation, provenance, draft history, patient list and a Chrome extension is not a four-week build for a small team — and healthcare software that ships half-finished does not get a second meeting. Eight weeks of build following four weeks of discovery is the honest number.

### In scope (v1.0)

| ID | Feature | Acceptance criteria |
|---|---|---|
| F1 | Secure auth | Email + password with MFA option; session timeout ≤15 min idle; biometric unlock; no PHI in auth provider profile fields |
| F2 | Shift & roster | Create shift (unit, date, shift type); add patients by facility ID/room/initials; roster auto-clears at shift end per retention policy |
| F3 | Push-to-talk capture | Hold-to-record from roster or patient card; visible level meter; max 180 s per capture; capture continues if screen locks |
| F4 | Offline queue | Captures persist encrypted on-device; auto-upload on reconnect; queue visible with per-item state; no data loss on force-quit (verified by test) |
| F5 | Medical ASR | BAA-covered, medical-tuned vendor; per-word confidence retained; low-confidence terms flagged in the review card |
| F6 | Structured extraction | JSON per Appendix A: vitals, medications, routes, doses, times, observations, interventions, responses, gaps |
| F7 | Confirmation UI | Every numeric entity must be confirmed or edited before generation; unconfirmed numerics block the Generate action |
| F8 | Multi-format generation | Narrative, SOAP, DAR/Focus, SBAR, Medication Administration, Incident, Shift Handoff. One capture → any subset |
| F9 | Provenance | Tap any generated sentence → highlights the transcript span it came from; unsupported sentences cannot be produced (see §6.6) |
| F10 | Completeness prompts | Rule-based, per-format checklist; documentation-only wording; dismissible with reason |
| F11 | Edit + attest | Full text editing; attestation captures user, timestamp, device, app version; note becomes immutable and hashed after attest |
| F12 | Confirmed copy/export | Copy requires an on-screen patient-identity confirmation; exported text carries a header with patient ref, author, date/time and "AI-assisted, clinician-reviewed" |
| F13 | Shift handoff builder | Assembles SBAR/endorsement from the shift's attested notes; nurse edits and attests |
| F14 | History & audit | Per-note version history: raw transcript, extraction, generated draft, final attested text, and the diff between draft and final |
| F15 | Retention controls | Audio deleted on attest by default; configurable 0–30 days; user-initiated purge; automatic roster purge |

### Explicitly out of scope for v1.0

Chrome extension · EHR write-back or FHIR integration · ambient patient capture · clinical suggestions · analytics dashboards · team collaboration · scheduling · billing/coding · care plans · patient-facing anything · multi-language output (English only in v1; accented-English *input* is in scope and is a priority).

## 4.7 The v1 demo script

If the demo cannot survive this, the product is not ready.

1. Airplane mode on. Record: *"Room 214, Mrs. Santos, 0900. Alert, oriented times three. BP one-twenty over eighty, pulse 78, temp 37.1. Gave metformin five hundred milligrams by mouth. Tolerated it fine, no nausea. Ambulated to the bathroom with a one-person assist, steady."*
2. Airplane mode off. Show queue uploading.
3. Review card appears: BP 120/80, HR 78, T 37.1 °C, metformin 500 mg PO @ 09:00 — each as a confirmable chip. Gap flagged: *"No pain assessment documented."*
4. Change the temperature to 37.4 in the chip. Show the change propagating.
5. Generate Narrative + DAR + Medication record from the one capture.
6. Tap the sentence "Tolerated medication without adverse effect" → the source phrase "tolerated it fine, no nausea" highlights.
7. Attempt to copy → identity confirmation modal → copy succeeds with header stamp.
8. Attest. Show the audit record: transcript, extraction, draft, final, diff, timestamp.
9. End shift → handoff generated across all patients touched.

---

# 5. System architecture

## 5.1 Principles

- **PHI travels the shortest possible path.** Device → BAA-covered storage → BAA-covered compute → BAA-covered ASR/LLM → BAA-covered database. Nothing else touches it, ever.
- **Every third-party service handling PHI must have a signed BAA before a single byte flows.** Sending PHI to a vendor without one is itself a reportable breach regardless of whether anything leaks `[SOURCED]`.
- **Stateless AI calls.** No conversation memory in the model provider; all state lives in our database.
- **The client is not trusted.** All authorization is enforced server-side; security rules are a second line, not the first.

## 5.2 Reference architecture

```
┌───────────────────────────────────────────────────────────────┐
│  CLIENT — Flutter (iOS / Android / tablet)                     │
│  • Push-to-talk capture (Opus/AAC, 16 kHz mono)                │
│  • Local encrypted queue (SQLCipher / platform keystore)       │
│  • Review + confirm UI, provenance viewer, attestation         │
│  • App Check / device attestation; no PHI in analytics or logs │
└───────────────┬───────────────────────────────────────────────┘
                │ TLS 1.2+, short-lived token
                ▼
┌───────────────────────────────────────────────────────────────┐
│  API LAYER — Cloud Functions / Cloud Run (BAA-covered region)  │
│  • authZ, tenancy, rate limits, audit write                    │
│  • signed upload URLs to object storage                        │
└───┬──────────────┬──────────────┬─────────────────────────────┘
    │              │              │
    ▼              ▼              ▼
┌─────────┐  ┌───────────┐  ┌───────────────────────────────────┐
│ Object  │  │ Firestore │  │ PIPELINE (queue-backed, idempotent)│
│ storage │  │ (PHI, per │  │  1. ASR  → medical-tuned, BAA      │
│ (audio, │  │  tenant)  │  │  2. EXTRACT → JSON schema (A.1)    │
│ TTL)    │  │           │  │  3. VALIDATE → numeric/entity gate │
└─────────┘  └───────────┘  │  4. GENERATE → per-format renderer │
                            │  5. VERIFY → provenance + support  │
                            └───────────────────────────────────┘
                                          │
                                          ▼
                            ┌───────────────────────────────────┐
                            │ AUDIT LOG (append-only, WORM-ish) │
                            │ hash-chained; separate retention  │
                            └───────────────────────────────────┘

Phase 2:  Web companion (Next.js/React) — same API, reads Firestore live
Phase 3:  Integration adapters — FHIR / marketplace partner APIs
```

## 5.3 Technology choices, with the trade-offs stated

| Layer | Recommendation | Why / caution |
|---|---|---|
| **Mobile** | Flutter. FlutterFlow acceptable for v1 UI **only if** you export code early and own the Firebase project. | FlutterFlow accelerates the roster/review screens. Caution: never route PHI through FlutterFlow-hosted test/API tooling, and confirm what their platform stores. Plan the export before it becomes expensive. |
| **Backend** | Firebase/GCP under a signed Google Cloud BAA. Firestore + Cloud Functions/Run + Cloud Storage. | **Critical:** the BAA covers a specific list of products which changes. Google Analytics for Firebase, Crashlytics, Performance Monitoring, A/B Testing and ML Kit cloud APIs are commonly *not* covered `[SOURCED]`. Sources also disagree on Firebase Authentication's status — several recommend Google Cloud Identity Platform instead. **Action: read Google's current Covered Products list and record the decision in writing before writing auth code.** |
| **ASR** | Medical-tuned, BAA-backed. Shortlist: AssemblyAI Universal-3 Pro with Medical Mode, Deepgram Nova-3 Medical, AWS Transcribe Medical. | Published missed-entity rates on medical terms: ~3.2% / ~8.7% / ~24.4% respectively on the AssemblyAI benchmark — vendor-published, so treat as directional `[SOURCED]`. **Do not use raw Whisper for clinical audio:** peer-reviewed work found ~1% of clear-audio transcriptions contained entirely fabricated phrases, with disfluent and accented speech worse `[SOURCED]`. |
| **LLM** | Any frontier model available under a signed BAA with zero-retention/eyes-off configuration. Abstract behind an interface so the provider is swappable. | OpenAI offers a Healthcare Addendum + BAA for eligible zero-retention API use; Anthropic and the major clouds offer BAAs with varying surface coverage and exclusions `[SOURCED]`. Verify surface-by-surface. |
| **Auth** | Identity provider that is explicitly BAA-covered; SSO/SAML for facilities in phase 3. | Never store PHI in user profile attributes or custom claims. |
| **Web companion** | React + TypeScript, same API. | Ships before the browser extension; no third-party DOM injection. |
| **Observability** | Self-hosted or BAA-covered logging with PHI scrubbing at the SDK boundary. | Crash reporters are a classic accidental-PHI leak. |

## 5.4 Data model (Firestore, tenant-scoped)

```
tenants/{tenantId}
  ├─ meta: { name, type: facility|individual, region, retentionDays, plan }
  └─ users/{userId}
       meta: { role: nurse|charge|admin, license, unit, mfaEnabled }

tenants/{tenantId}/shifts/{shiftId}
  { userId, unit, shiftType, startedAt, endedAt, status, patientRefCount }

tenants/{tenantId}/patientRefs/{patientRefId}
  { label, room, facilityMRN?, createdAt, purgeAt }        # minimal identifiers only

tenants/{tenantId}/captures/{captureId}
  { shiftId, patientRefId, userId, capturedAt, durationSec,
    audioPath, audioPurgeAt, state: queued|uploaded|asr|extracted|ready|failed,
    asr: { vendor, model, text, words:[{w,start,end,conf}], overallConf },
    extraction: <Appendix A.1>,
    confirmations: [{ entityId, confirmedBy, confirmedAt, originalValue, finalValue }] }

tenants/{tenantId}/notes/{noteId}
  { captureIds:[], patientRefId, format, draftText, finalText,
    provenance: [{ sentenceIdx, spanStart, spanEnd, entityIds:[] }],
    carriedForward: [{ field, sourceNoteId, confirmedAt }],
    gaps: [{ code, severity, dismissedReason? }],
    status: draft|attested, attestation: { userId, at, deviceId, appVersion, hash },
    exportedAt?, exportTargets:[] }

tenants/{tenantId}/auditLog/{eventId}        # append-only, hash-chained
  { at, userId, action, subjectType, subjectId, prevHash, hash, meta }
```

**Rules:** cross-tenant reads are impossible by construction (tenant ID in every path, enforced server-side and in security rules). `patientRefs` hold the minimum identifiers required for the nurse to know whose chart it is — a room number and initials are usually enough, and are still PHI. Audio has an independent TTL from notes.

## 5.5 API surface (v1)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/v1/shifts` | Start a shift |
| `POST` | `/v1/shifts/{id}/end` | End shift, trigger handoff eligibility, schedule roster purge |
| `POST` | `/v1/patient-refs` | Create a shift-scoped patient reference |
| `POST` | `/v1/captures` | Reserve capture, return signed upload URL |
| `PUT` | *(signed URL)* | Upload audio |
| `POST` | `/v1/captures/{id}/complete` | Enqueue pipeline; idempotent on client-generated capture ID |
| `GET` | `/v1/captures/{id}` | Poll state + extraction (or subscribe via Firestore listener) |
| `POST` | `/v1/captures/{id}/confirmations` | Confirm/edit extracted entities |
| `POST` | `/v1/notes:generate` | `{captureIds[], formats[]}` → drafts. **Rejects if unconfirmed numerics exist.** |
| `PATCH` | `/v1/notes/{id}` | Edit draft text |
| `POST` | `/v1/notes/{id}/attest` | Lock, hash, write audit event |
| `POST` | `/v1/notes/{id}/export` | Record export intent + target; returns stamped text |
| `POST` | `/v1/shifts/{id}/handoff` | Build handoff draft from attested notes |
| `DELETE` | `/v1/captures/{id}/audio` | Immediate audio purge |

## 5.6 Offline behaviour

- Captures are written to an encrypted local store **before** any network call, with a client-generated UUID used as the idempotency key.
- The queue survives force-quit, OS kill, battery death and app update. This is an explicit test case, not an assumption.
- Uploads resume on connectivity change; exponential backoff with jitter; per-item retry cap then a visible "needs attention" state.
- Notes can be edited offline; attestation requires connectivity so the audit event is durable and the timestamp is server-authoritative.
- Local store is purged on logout, on remote wipe, and on retention expiry.

---

# 6. AI pipeline and prompt engineering guide

This section is written to be handed directly to a developer or an AI coding agent.

## 6.1 The pipeline is four stages, not one

The single most common mistake in this product category is one prompt: *"here is a transcript, write a SOAP note."* That prompt will invent vital signs, normalize a dose it misheard, and smooth over what the nurse did not say. The pipeline separates *what was said* from *how it is written*:

```
ASR ──► EXTRACT (JSON, no prose) ──► VALIDATE (deterministic code) ──► GENERATE (prose from JSON only) ──► VERIFY (support check)
```

**Generation never sees the raw transcript as its source of truth.** It sees the validated JSON plus the transcript *for tone only*. Any fact not in the JSON cannot be rendered.

## 6.2 Stage 1 — ASR

- Medical-tuned model; retain word-level confidence and timings (needed for provenance).
- Domain boosting: feed the facility's formulary, common resident names/room numbers, and unit-specific vocabulary as keyterm hints.
- Any word below a confidence threshold inside a numeric or medication entity is flagged and surfaced in amber in the review card.
- Store the transcript verbatim. Never "clean it up" before extraction.

## 6.3 Stage 2 — Extraction

System prompt (production-ready starting point):

```
You are a clinical information extractor for nursing documentation.
You convert a nurse's spoken dictation into structured JSON.

ABSOLUTE RULES
1. Extract only what is explicitly stated. Never infer, complete, normalize
   upward, or add clinically plausible detail.
2. If a field is not stated, omit it. Do not guess. Do not write "WNL",
   "unremarkable", or "no acute distress" unless the nurse said it.
3. Never convert, round, or correct a number. Record it exactly as spoken,
   with the unit as spoken. If the unit was not stated, set "unit": null
   and add a gap.
4. If a medication name is uncertain or not a recognizable medication,
   set "uncertain": true. Do not substitute a similar-sounding drug.
5. Times: record as spoken. Only resolve to ISO time when the dictation
   states a clock time. Relative times ("this morning") stay as text.
6. Output valid JSON matching the schema. No prose, no markdown, no
   commentary before or after.

GAPS
For each required-but-absent element in the applicable checklist, emit a
gap object. Gaps are documentation-completeness observations only. Never
emit clinical advice, recommendations, or suggested interventions.
```

User message: `{transcript, word_confidences, shift_context, format_targets}`.
Set temperature to 0. Enforce the schema with structured output / JSON mode. Reject and retry once on schema failure; on second failure, surface the raw transcript to the nurse with an explicit "automatic extraction failed — please review manually" state. **Never silently degrade.**

## 6.4 Stage 3 — Validation (deterministic code, not the model)

| Check | Action on failure |
|---|---|
| Every numeric entity has a value, a unit and a source span | Mark unconfirmed → blocks generation |
| Vitals within physiologically possible bounds | Flag amber, require explicit confirmation; **never auto-correct** |
| Medication name resolves against a drug reference | Flag as uncertain, require confirmation |
| Dose/route/frequency triplet complete | Emit gap |
| Every entity has a transcript span | Drop the entity and log a pipeline defect |
| Patient reference present and matches the active roster entry | Hard block |

Out-of-range vitals are **flagged, never corrected**. If a nurse says a blood pressure of 220/140, that may be exactly what they measured, and it is the most important sentence in the chart.

## 6.5 Stage 4 — Generation

One prompt per format, all sharing this preamble:

```
You render validated clinical facts into a nursing note. You are a
formatter, not a clinician.

INPUT: a JSON object of confirmed facts, plus the original transcript
provided ONLY as a reference for the nurse's phrasing and tone.

RULES
1. Every clinical assertion in your output must correspond to a fact in
   the JSON. You may not add findings, interpretations, assessments,
   plans, or normal findings that are not in the JSON.
2. Use only the numbers in the JSON, exactly as given.
3. Do not write a plan or recommendation unless a plan was stated in the
   JSON by the nurse.
4. Do not pad. A short note about a short interaction is correct.
5. If a section of the requested format has no supporting facts, write
   the section header followed by: [Not documented]
6. Output the note text only.
7. For each sentence you write, also return the list of fact IDs it is
   based on, in the "support" array.
```

Output contract: `{ "text": "...", "sentences": [{ "idx":0, "text":"...", "support":["v1","m2"] }] }`

### Format-specific rules

| Format | Sections | Nursing-specific constraint |
|---|---|---|
| **Narrative** | Chronological prose | Past tense, third person, no interpretation |
| **SOAP** | S/O/A/P | "A" is a *nursing* assessment (response, tolerance, status), never a medical diagnosis. If the nurse stated no plan, P = `[Not documented]` |
| **DAR / Focus** | Data / Action / Response | Response section may not be filled unless a response was stated — the most commonly missing element in real charts |
| **SBAR** | Situation / Background / Assessment / Recommendation | "R" carries only what the nurse said they would do or did request |
| **Medication administration** | Drug, dose, route, time, site, response, wastage | Every field either present or `[Not documented]`. No inferred routes |
| **Incident report** | Time, location, witnesses, description, immediate action, notifications, follow-up | Strictly factual, no attribution of cause or fault |
| **Shift handoff** | SBAR + pending tasks + escalations | Assembled only from **attested** notes in the shift; unattested drafts are excluded |

## 6.6 Stage 5 — Verification (the hallucination gate)

After generation, run automatically:

1. **Support check** — every sentence must have a non-empty `support` array. Unsupported sentences are stripped and logged as a defect.
2. **Numeric fidelity** — extract all numbers from the generated text; every one must exist in the confirmed JSON. Any mismatch fails the whole note.
3. **Entity fidelity** — every medication and clinical term in the output must exist in the JSON or the transcript.
4. **Negation integrity** — a small classifier or rule set checks that negated findings in the transcript ("no nausea") are not rendered positively.
5. On any failure: do not show the draft. Show the review card and a plain message that generation could not be verified. **A missing note is recoverable; a wrong note is not.**

## 6.7 Evaluation harness — build this in week one

Nothing ships without it. This is the actual technical moat.

- **Golden set:** 200+ real dictations across settings and accents (Filipino, Indian, Nigerian, US, UK English at minimum), each with a nurse-authored reference note.
- **Adversarial set:** 50 recordings designed to break the pipeline — background alarms, two people talking, a nurse correcting herself mid-sentence ("BP was 140... no, sorry, 120 over 80"), sound-alike drugs (hydralazine/hydroxyzine), ambiguous times, code-switching.

| Metric | Definition | Ship gate |
|---|---|---|
| **Fabricated Fact Rate** | Clinical assertions in output with no basis in audio, per 100 notes | **0.0 — non-negotiable** |
| **Numeric Fidelity** | % of numbers in output exactly matching audio | 100% |
| **Missed Entity Rate** | % of clinically relevant entities in audio absent from extraction | <5% |
| **Negation Accuracy** | % of negated findings rendered correctly | >99% |
| **Gap Recall** | % of true documentation gaps flagged | >80% |
| **Edit Distance** | Median % of characters changed by the nurse before attesting | <15% and falling |
| **Time to Attest** | Median seconds from capture end to attestation | <90 s |

Run the full harness on every prompt change and every model version change. Model providers update models; a silent regression here is a patient-safety event.

## 6.8 Unit cost model `[MODEL]`

Replace with measured values; the structure is what matters.

```
Per capture (assume 45 s of audio):
  ASR         45 s  × $0.004–0.008 / min  ≈ $0.003–0.006
  Extraction  ~1.2k in / 0.8k out tokens  ≈ $0.004–0.012
  Generation  ~1.0k in / 0.6k out × N formats (N≈2)  ≈ $0.006–0.020
  Verification (rules + small model)      ≈ $0.001–0.003
  ──────────────────────────────────────────────────
  ≈ $0.015–0.041 per capture

Per nurse per shift: 15 captures ≈ $0.23–0.62
Per nurse per month (18 shifts):   ≈ $4.10–11.10  ← the number that decides pricing
```

**This is the single most important number in the business.** At $11/month of COGS, a $9.99 consumer price is loss-making. Levers: cache and reuse extraction across formats (one extraction, N renders — already in the design), route to a smaller model for extraction, cap free-tier captures, and batch verification. Target gross margin ≥70% before scaling paid acquisition.

---

# 7. Compliance, privacy and safety

Not a legal opinion. Engage a healthcare attorney in each market before launch.

## 7.1 The compliance posture in one page

| Domain | Position |
|---|---|
| **HIPAA (US)** | ShiftNote is a Business Associate. Signed BAA required *with* every facility customer, and *from* every subprocessor (cloud, ASR, LLM). Individual-nurse tier requires either a personal-use model with facility acknowledgement or a facility BAA — see §7.5 |
| **Recording consent** | Dictation-only capture means the nurse is the sole recorded party, which materially reduces exposure under all-party consent statutes. If ambient capture is ever added, it requires facility-level consent workflow and counsel `[SOURCED]` |
| **FDA (US)** | Documentation assistance sits outside the device definition under the January 2026 CDS guidance. Documentation-completeness prompts only; no clinical recommendations; no time-critical decision support `[SOURCED]` |
| **Documentation integrity** | AI-assisted content is labeled; carry-forward requires per-item confirmation; nurse attests as author; full audit trail `[SOURCED]` |
| **Philippines** | Data Privacy Act (RA 10173) and NPC rules: appoint a DPO, conduct a Privacy Impact Assessment, maintain a privacy management program and security measures, register processing. DOH eHealth privacy guidance applies to hospital systems `[SOURCED]` |
| **GDPR/UK** | If EU/UK nurses sign up: lawful basis, DPA with each processor, DPIA, EU/UK data residency |
| **Australia** | Privacy Act + My Health Records; aged care providers have additional obligations |

## 7.2 Data handling rules (engineering-enforceable)

1. PHI at rest is encrypted with customer-managed keys where the platform supports it; in transit TLS 1.2+.
2. Audio is deleted on attestation by default. Configurable 0–30 days. Retention is per-tenant and auditable.
3. Transcripts are retained only as long as the note is editable, then optionally hashed and discarded.
4. **No PHI in:** analytics, crash reporting, performance monitoring, product telemetry, error messages, support tickets, LLM provider training, or any service not on a current BAA covered-products list.
5. Access is role-based and tenant-scoped. A nurse sees only their own notes. A DON sees notes for their unit only if the facility contract grants it and it is disclosed to staff.
6. Audit log is append-only and hash-chained; retention independent of and longer than note retention.
7. Breach runbook: detection → containment → assessment → notification within statutory windows. Write it before launch, not after an incident.

## 7.3 The safety commitments, stated publicly

Put these on the website. They are the marketing.

> 1. ShiftNote records only the nurse. It never listens to your patients.
> 2. ShiftNote will not write a clinical fact you did not say.
> 3. Every sentence traces back to your own words.
> 4. Nothing leaves the app until you review and sign it.
> 5. ShiftNote does not give clinical advice.
> 6. Your recordings are deleted when your note is signed.

## 7.4 Certifications roadmap

| Stage | Target | Trigger |
|---|---|---|
| Pre-launch | HIPAA Security Risk Analysis, policies, BAAs, DPO appointment, PH Privacy Impact Assessment | Before first PHI |
| Month 6 | Penetration test, vulnerability management, formal SDLC | Before first facility contract |
| Month 9–12 | SOC 2 Type I → Type II | First enterprise security questionnaire |
| Month 18+ | HITRUST, ISO 27001 | Only if a specific deal requires it |

## 7.5 The hardest open question — individual nurses and PHI

If a nurse installs ShiftNote personally and dictates about a patient, PHI is disclosed to a vendor with whom their employer has no BAA. That is a real problem, and it is the reason several nurse-facing AI apps stay vague about it.

**Three viable answers — pick one and commit before launch:**

- **(A) Facility-first.** Individual accounts are limited to non-PHI use (education, practice, template building). Clinical use requires a facility account with a signed BAA. Cleanest legally, slowest to grow.
- **(B) De-identified capture.** The app enforces reference-only identifiers (room + initials) and strips identifiers at the boundary. Reduces but does not eliminate exposure; re-identification risk is real in a small facility.
- **(C) Direct-to-nurse with facility acknowledgement.** Onboarding requires the nurse to attest that their employer permits the tool, plus a one-page BAA-lite the nurse can hand to their manager.

**Recommendation: launch (A) + (B) in the Philippines beachhead, where the regulatory analysis is different and the facility relationship is direct, and do not open unrestricted individual US clinical accounts until counsel signs off.** This is a genuine constraint on the "viral consumer app" growth story and should be treated as a strategic decision, not a legal footnote.

---

# 8. Roadmap and delivery plan

## 8.1 Phase 0 — Discovery (Weeks 1–4). **Gated: no production code until the deliverable exists.**

The original plan's instinct to shadow nurses first was right. Here it is with a definition of done.

| Week | Activity | Deliverable |
|---|---|---|
| 1 | Recruit 10–15 nurses across 4 settings (hospital ward, LTC/nursing home, home care, clinic). Davao-area facilities first. | Signed participation consents; setting matrix |
| 1–3 | Shadow 3 full shifts per setting. Time-and-motion log every documentation event: what, where, how long, interrupted or not, duplicated or not. | **Documentation Event Inventory** — a spreadsheet of every charting act, with frequency and duration |
| 2–3 | Collect 200+ voice samples of nurses describing real (de-identified) care events, in their natural accent and register | **Golden corpus v0** for the eval harness |
| 3 | Collect 30–50 real (de-identified) notes per format from each setting | **Format library** — what these facilities actually accept |
| 4 | Structured interviews with 3 DONs/administrators on what they get cited for and what they would pay for | **Buyer value map** |
| 4 | Paper/Figma prototype tested with 8 nurses | Kill-or-continue decision |

**Phase 0 exit criteria (all must be true):**
- The Documentation Event Inventory shows ≥20 minutes per shift addressable by dictation-first capture.
- At least 8 of 10 nurses, after using the prototype, say they would use it on their next shift.
- At least 2 facilities give a written letter of intent to pilot.

If these fail, change the product before building it. This is the cheapest decision point in the entire venture.

## 8.2 Phase 1 — MVP build (Weeks 5–12)

| Sprint | Weeks | Deliverable |
|---|---|---|
| S1 | 5–6 | Auth, tenancy, shift + roster, audit log skeleton, security rules, BAAs signed |
| S2 | 7–8 | Capture, encrypted local queue, offline sync, signed upload, ASR integration, transcript view |
| S3 | 9–10 | Extraction schema, validation layer, review/confirm UI, provenance store, **eval harness v1 running in CI** |
| S4 | 11 | Generation for 4 formats (Narrative, SOAP, DAR, Medication), verification gate, edit + attest |
| S5 | 12 | Confirmed copy/export, note history + diff, retention controls, incident + SBAR + handoff builder, hardening |

**Phase 1 exit criteria:** all §6.7 ship gates met on the golden set; the §4.7 demo runs end to end on a real device with airplane mode.

## 8.3 Phase 2 — Pilot (Weeks 13–20)

- 20–30 nurses across 2–3 facilities. At least one PH facility and one international design partner.
- Instrumented from day one against the §10 metrics.
- Weekly on-site sessions in the Davao facilities — this proximity is a genuine advantage over a remote US competitor.
- Ship the **web companion** (not the extension) in week 16: same account, side-by-side with whatever EHR the nurse uses, confirmed copy.
- Ship **carry-forward with mandatory diff** in week 18 — the feature the DON buys.

**Phase 2 exit criteria (the go/no-go for spending real money):**
- ≥60% of enrolled nurses still using it in week 8 of the pilot.
- Median time-to-attest <90 seconds.
- Zero fabricated facts in a 200-note blinded audit by a nurse reviewer.
- Documentation completeness improved against the facility's own audit tool.
- At least one facility willing to sign a paid contract.

## 8.4 Phase 3 — Commercialize (Months 6–9)

Facility console (roster provisioning, seat management, retention policy, unit-level audit) · SSO · billing · SOC 2 Type I · pricing live · 3–5 paying facilities · first 500 individual accounts.

## 8.5 Phase 4 — Integrate and expand (Months 9–18)

- **One** integration, chosen by pilot demand — most likely a marketplace/API partnership with an LTPAC or home-health EHR rather than screen automation. Note that PointClickCare operates a marketplace with 400+ partners and third-party scribes have gone through it `[SOURCED]`; a partnership is the realistic path, and a competitive-conflict risk to assess honestly.
- Browser extension, only if the web companion proves the demand and only as confirmed-target assist.
- Additional formats: OASIS-aware prompts, MDS support, aged-care documentation for AU/NZ.
- Second language: Filipino/Taglish input handling as a first-class feature.

## 8.6 What not to build, ranked by how tempting it is

1. A dashboard for administrators. (Nobody has ever bought a nursing product for its dashboard.)
2. Clinical suggestions. (Regulatory and safety exposure, no revenue.)
3. Deep EHR write-back before 500 users. (Months of work for a feature that only matters at scale.)
4. Team chat / collaboration. (Solved by existing tools.)
5. Care-plan generation. (Different, harder, more regulated product.)

---

# 9. Pricing, unit economics and go-to-market

## 9.1 Pricing model

Physician scribe pricing ($39–$119/clinician/month self-serve, $200–$1,200+ enterprise) is anchored on clinicians who generate billable revenue `[SOURCED]`. **Nurses are salaried, frequently pay for their own scrubs and CEUs, and will not personally pay $99/month.** Price the individual tier like a consumer productivity app and take the margin at the facility tier.

| Tier | Price | Includes | Buyer |
|---|---|---|---|
| **Free** | $0 | 10 captures/month, 2 formats, 7-day history | Nurse (acquisition) |
| **Pro** | US$12–19/mo (₱349–549 in PH; localize by market) | Unlimited captures, all formats, handoff builder, full history, offline | Nurse |
| **Team** | US$8–12/seat/mo, 10-seat minimum | Pro + shared templates, unit roster, admin console, retention policy, BAA | Charge nurse / small agency |
| **Facility** | US$6–10/seat/mo at 50+ seats, annual | Team + SSO, audit exports, completeness reporting, onboarding, support SLA | DON / Administrator |
| **Enterprise** | Custom | Facility + integration, custom formats, dedicated environment | Multi-site operator |

Validate against the §6.8 COGS model. If per-nurse COGS lands near $11/month, the Free tier must be capped tightly and Pro cannot be below ~$15.

## 9.2 The ROI story — for the buyer, not the user

Nurse convenience does not open a budget line. These do:

| Value driver | How to quantify | Source of the buyer's pain |
|---|---|---|
| **Retention** | RN departure ≈ $61,000; a 1-point reduction in turnover at a 120-nurse facility ≈ $73K/yr `[SOURCED]` | Vacancy rates, agency spend |
| **Agency & overtime** | Charting-driven overtime hours × loaded rate | Payroll |
| **Survey defensibility** | Deficiency citations traced to documentation gaps | Last survey report |
| **Reimbursement & denials** | ADR/denial rate attributable to insufficient documentation of skilled need | Revenue cycle |
| **Recovered care time** | 20–36 min/shift `[SOURCED]` × shifts × loaded hourly rate | Staffing model |

**Pilot ROI worksheet (give this to the DON, let them fill it in):**

```
A  Nurses in pilot                          ____
B  Shifts per nurse per month               ____
C  Minutes saved per shift (measured)       ____   ← from the pilot, not the brochure
D  Loaded hourly cost of a nurse            ____
E  Monthly time value    = A×B×C/60×D       ____
F  Documentation-driven citations avoided   ____
G  Turnover reduction value (modelled)      ____
H  ShiftNote cost        = A × seat price   ____
   ─────────────────────────────────────────────
   Net monthly value     = E + F + G − H    ____
```

## 9.3 Go-to-market sequence

**Motion 1 — Nurse-led, Philippines (Months 0–6).** Founder-led recruitment through Davao nursing networks, PNA chapters, and nursing schools. In-person onboarding at 2–3 facilities. Nursing-student ambassadors. Facebook and TikTok nursing communities, which in the Philippines are the actual professional network. Target: 500 individual accounts, 3 facility pilots.

**Motion 2 — Facility-closed (Months 6–12).** Once 5+ nurses at a facility are already using it, approach the DON with their own usage data and the ROI worksheet. This is the single highest-converting motion in workforce software and the reason the free tier exists.

**Motion 3 — Diaspora and second market (Months 12–24).** The Filipino nursing diaspora in the Gulf, US, UK, Canada, Australia and NZ is a natural distribution channel from a Philippines-built product with demonstrably strong accented-English handling. Choose the second market by where pilot demand actually appears, not by TAM size.

**Channels that will not work:** paid search against "AI medical scribe" (you will pay physician-scribe CAC for a nurse-priced product), health-system conference booths, and cold outbound to CNOs.

## 9.4 Funding posture

The realistic path is bootstrap or a small pre-seed through the Phase 2 exit criteria. Healthcare investors will ask for evidence of clinical safety, a compliance posture and retention — all three of which are Phase 2 outputs. Raising before them means raising on a story; raising after means raising on data.

---

# 10. Measurement, pilot design and evidence

## 10.1 The metrics that matter

| Category | Metric | Target (pilot) |
|---|---|---|
| **Safety** | Fabricated fact rate | 0 per 200 notes |
| | Numeric fidelity | 100% |
| | Wrong-patient copy events | 0 |
| **Quality** | Documentation completeness vs facility audit tool | +30% |
| | Nurse-manager blinded quality rating vs baseline notes | ≥ parity |
| | Median edit distance before attest | <15% |
| **Efficiency** | Time to complete a documentation event | −50% |
| | Minutes of after-shift charting | −50% |
| | Time to attest (median) | <90 s |
| **Adoption** | Week-8 retention of enrolled nurses | ≥60% |
| | Captures per nurse per shift | ≥8 |
| | Proportion of shifts with a completed handoff | ≥70% |
| **Business** | Free → Pro conversion | ≥5% |
| | Facility pilot → paid conversion | ≥1 of 3 |

## 10.2 Pilot design

- **Design:** within-subject pre/post. Two weeks of baseline time-and-motion observation before the app is installed, then eight weeks of use. Within-subject avoids the sample-size problem of a small pilot.
- **Blinded quality audit:** a nurse manager rates 100 baseline and 100 ShiftNote-assisted notes on the facility's own audit rubric, blinded to origin.
- **Safety audit:** an independent nurse reviewer listens to 200 recordings and compares them against the attested notes, scoring for fabricated, missing and altered facts. This is the study that lets you sell to anyone.
- **Exit interviews** with every participant, including those who stopped using it. The dropouts are the most valuable interviews you will do.

## 10.3 Publish it

A short, honest write-up of the pilot — including what did not work — is worth more than any marketing site in this category. It is what makes a DON, a nursing board and an investor take a two-person team seriously.

---

# 11. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | The model fabricates a clinical fact that reaches a chart | Medium | **Fatal** | Four-stage pipeline, verification gate, 0-tolerance ship gate, blinded safety audit, incident runbook |
| R2 | PHI sent to a non-BAA service (analytics, crash reporter, model provider) | **High** without discipline | Severe | Covered-products checklist reviewed at every dependency addition; PHI scrubbing at SDK boundary; pre-launch data-flow map |
| R3 | EHR vendors absorb the feature in the long tail | High over 3 years | Severe | Geographic beachhead; segments without EHRs; shift model as differentiation; partnership option |
| R4 | Nurses cannot use personal phones at work | Medium | High | Validate in Phase 0 discovery; tablet/desktop capture path; facility-provisioned device story |
| R5 | Individual-tier PHI exposure question (§7.5) blocks growth | **High** | High | Decide the model before launch, not after |
| R6 | ASR accuracy on accented/code-switched English is worse than assumed | Medium | High | Benchmark on own corpus in Phase 0; vendor bake-off; domain boosting; make it a differentiator, not a defect |
| R7 | Facilities forbid the tool | Medium | High | Facility-first motion; the safety commitments in §7.3 are the sales asset |
| R8 | COGS exceeds price at consumer tiers | Medium | High | §6.8 cost model measured from week one; extraction caching; tight free tier |
| R9 | Copy-paste into an EHR is disallowed by facility policy | Medium | Medium | Position as draft-preparation; note the provenance and attestation controls; integration path in Phase 4 |
| R10 | Solo/small founding team burns out on a 3-front build (mobile, backend, AI eval) | High | Medium | Sequence ruthlessly; §8.6 not-building list is a real commitment |
| R11 | Model provider changes a model and silently degrades output | Medium | High | Pinned model versions; eval harness in CI; no auto-upgrade |
| R12 | Litigation risk from documentation used in a malpractice case | Low | Severe | Nurse-as-author framing, attestation record, provenance, retained audit trail, professional liability insurance |

---

# 12. Decisions required before Week 1

These are blocking. Answer them in writing.

| # | Decision | Owner | Default recommendation |
|---|---|---|---|
| 1 | Beachhead market and first two facilities | Founder | Davao LTC/home-care + one hospital ward |
| 2 | Individual-tier PHI model (§7.5 A/B/C) | Founder + counsel | A + B until US counsel signs off |
| 3 | Cloud + BAA vendor set, confirmed against current covered-products lists | Tech lead | GCP/Firebase (Firestore, Cloud Functions/Run, Cloud Storage) + Identity Platform |
| 4 | ASR vendor after a bake-off on your own accented corpus | Tech lead | Test AssemblyAI Medical Mode vs Deepgram Nova-3 Medical; do not use raw Whisper |
| 5 | LLM provider with BAA + zero retention; abstraction layer in place | Tech lead | Provider-agnostic interface from day one |
| 6 | FlutterFlow: use with early code export, or start in raw Flutter | Tech lead | FlutterFlow for v1 UI, export by Phase 2 |
| 7 | The three claims you will defend publicly (§4.1) | Founder | As written |
| 8 | Who is the clinical advisor, and are they paid or equity-compensated | Founder | Recruit a practising DON in Phase 0 |
| 9 | Free-tier cap, set from the measured COGS number | Founder | 10 captures/month until COGS is known |
| 10 | Kill criteria and the date you will honour them | Founder | Phase 0 and Phase 2 exit criteria as written |

---

# Appendix A — Extraction schema

```json
{
  "capture_id": "string",
  "patient_ref": "string",
  "captured_at": "ISO-8601",
  "author_ref": "string",
  "asr": { "vendor": "string", "model": "string", "overall_confidence": 0.0 },
  "vitals": [
    { "id": "v1", "type": "blood_pressure|heart_rate|temperature|respiratory_rate|spo2|pain|weight|glucose",
      "value": "string", "unit": "string|null", "measured_at": "string|null",
      "span": [0, 0], "confidence": 0.0, "confirmed": false }
  ],
  "medications": [
    { "id": "m1", "name": "string", "dose": "string|null", "unit": "string|null",
      "route": "PO|IV|IM|SC|PR|topical|inhaled|null", "time": "string|null",
      "site": "string|null", "response": "string|null", "held": false, "refused": false,
      "uncertain": false, "span": [0, 0], "confirmed": false }
  ],
  "observations": [
    { "id": "o1", "category": "neuro|cardiac|respiratory|gi|gu|skin|mobility|behaviour|pain|nutrition|psychosocial|other",
      "text": "string", "negated": false, "span": [0, 0] }
  ],
  "interventions": [
    { "id": "i1", "text": "string", "time": "string|null", "span": [0, 0] } ],
  "responses": [
    { "id": "r1", "to": "m1|i1", "text": "string", "span": [0, 0] } ],
  "communications": [
    { "id": "c1", "party": "physician|family|charge_nurse|other", "content": "string",
      "time": "string|null", "span": [0, 0] } ],
  "stated_plan": [
    { "id": "p1", "text": "string", "span": [0, 0] } ],
  "gaps": [
    { "code": "MISSING_RESPONSE|MISSING_PAIN_REASSESS|MISSING_UNIT|MISSING_TIME|MISSING_SITE|INCOMPLETE_MED_TRIPLET",
      "severity": "info|warn|block", "message": "string", "related": ["m1"] } ],
  "uncertain_terms": [ { "text": "string", "span": [0, 0], "confidence": 0.0 } ]
}
```

# Appendix B — Prompt library index

| ID | Purpose | Temperature | Output |
|---|---|---|---|
| `EXTRACT.v1` | Transcript → Appendix A JSON | 0.0 | JSON (schema-enforced) |
| `GEN.NARRATIVE.v1` | JSON → chronological narrative | 0.2 | `{text, sentences[]}` |
| `GEN.SOAP.v1` | JSON → SOAP | 0.2 | `{text, sentences[]}` |
| `GEN.DAR.v1` | JSON → Data/Action/Response | 0.2 | `{text, sentences[]}` |
| `GEN.SBAR.v1` | JSON → SBAR | 0.2 | `{text, sentences[]}` |
| `GEN.MEDADMIN.v1` | JSON → medication administration record | 0.0 | `{text, sentences[]}` |
| `GEN.INCIDENT.v1` | JSON → incident report | 0.0 | `{text, sentences[]}` |
| `GEN.HANDOFF.v1` | Attested notes → shift endorsement | 0.2 | `{text, sentences[]}` |
| `VERIFY.NEGATION.v1` | Negation integrity check | 0.0 | `{pass, violations[]}` |

Version every prompt. Store prompt version on every note. Never edit a prompt in place — new version, re-run the eval harness, compare.

# Appendix C — Glossary

**ADR** — Additional Documentation Request (payer audit). **ASR** — Automatic Speech Recognition. **Attestation** — the clinician's signed confirmation that a note is accurate and is their own. **BAA** — Business Associate Agreement. **CDS** — Clinical Decision Support. **DAR** — Data/Action/Response note format. **DON** — Director of Nursing. **Endorsement** — shift handover (Philippine usage). **LTPAC** — Long-Term and Post-Acute Care. **MDS** — Minimum Data Set (US SNF assessment). **MER** — Missed Entity Rate. **OASIS** — Outcome and Assessment Information Set (US home health). **PDPM/PDGM** — US payment models for SNF and home health. **PHI** — Protected Health Information. **SBAR** — Situation/Background/Assessment/Recommendation. **SNF** — Skilled Nursing Facility. **ZDR** — Zero Data Retention.

# Appendix D — Sources

Documentation burden and workforce: US Surgeon General's Advisory on Health Worker Burnout (via AACN); KLAS Arch Collaborative, *Reducing Nursing Documentation Burden 2025* (80,147 acute-care nurses); *Charting the path forward: Nursing perspectives on documentation and change*, ScienceDirect 2025 (Epic Clarity dose-response analysis, 29,467 encounters); 2025 NSI National Health Care Retention & RN Staffing Report; *Electronic health record system use and documentation burden of acute and critical care nurse clinicians*, PMC; WHO/ICN *State of the World's Nursing 2025*; WHO Nursing and Midwifery fact sheet (17 Jul 2025).

Competitive landscape: Abridge press release (Abridge/Mayo/Epic, Jul 2024) and Healthcare IT News, *Abridge releases ambient AI tech for nurses* (May 2026); STAT, *Epic launches AI Charting* (Feb 2026); PointClickCare press releases, *Next-Generation EHR for Practice Groups* (Mar 2026) and *Advisor Suite* (Jun 2026); Commure and OmniMD 2026 AI-scribe pricing comparisons; Freed, Heidi, PatientNotes and Doximity published pricing; Amesite/NurseMagic announcements; Eleos, Lime Health, AutoMynd, IO Health product pages.

Safety and documentation integrity: Koenecke et al., *Careless Whisper: Speech-to-Text Hallucination Harms* (ACM FAccT 2024); AP/Healthcare Brew reporting on Whisper hallucination in medical transcription; The Joint Commission *Quick Safety* Issue 10, *Preventing copy-and-paste errors in EHRs*; ECRI / Partnership for Health IT Patient Safety, *Copy/Paste: Prevalence, Problems, and Best Practices*; NIST IR 8166; AssemblyAI and Deepgram published medical ASR benchmarks.

Regulatory and privacy: FDA, *Clinical Decision Support Software* final guidance (6 Jan 2026), with analyses by Covington & Burling and Arnold & Porter; American Bar Association Health Law, *Ambient AI Scribes — Efficiency Gains vs Emerging Privacy and Cybersecurity Risks* (Feb 2026); reporting on the Sharp HealthCare ambient-recording class action (Jan 2026); state all-party consent summaries; Google Cloud HIPAA Compliance covered-products documentation; OpenAI Healthcare Addendum and BAA; vendor BAA comparison guides (2026); Philippines Data Privacy Act RA 10173, NPC guidance, DOH AO 2012-0007 and AO 2016-0037.

Market sizing (ranges, definitions differ): Fortune Business Insights, Astute Analytica, SNS Insider, Research and Markets, Towards Healthcare, DataIntelo — 2025 estimates spanning USD 0.6B–4.0B with 2026 figures clustering at USD 1.2–1.7B.

*All web sources accessed July 2026. Figures should be re-verified before use in fundraising or contractual materials.*

---

*ShiftNote Startup Package v1.0 — prepared July 2026. This document is a working plan, not legal, clinical, or financial advice. Engage qualified healthcare counsel in each market before processing patient information.*
