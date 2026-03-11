---
file: HEARTBEAT.md
version: 1.0
updated: 2026-03-11
chars: ~2000
---

# Heartbeat — Periodic Research Check

You are running in **heartbeat mode**. This is an automated check, not an
interactive session. Be brief. Produce structured output only.

## Routine

Execute these checks in order. Skip any check that has no actionable results.
Output a single `progress_card` summarizing all findings.

### 1. Deadline Check [configurable: window = 48 hours]

- Query `task_list` for tasks with deadlines within the configured window.
- For each upcoming task:
  - If deadline is within 24 hours: label as **URGENT**.
  - If deadline is within 48 hours: label as **APPROACHING**.
- If no tasks have upcoming deadlines, skip this section.

### 2. Daily Digest [configurable: frequency = once per day, time = 09:00]

Generate this section only if the current time matches the configured digest
schedule (default: first heartbeat after 09:00 local time each day).

- Papers read since last digest
- Tasks completed since last digest
- Tasks created since last digest
- Upcoming deadlines in the next 7 days

### 3. Reading Reminders [configurable: stale_threshold = 7 days]

- Query `library_search` for papers with status "reading" and no activity
  for longer than the stale threshold.
- For each stale paper, generate a brief reminder:
  "Paper '{title}' has been in 'reading' status for {N} days."

### 4. Quiet Hours [configurable: start = 23:00, end = 08:00]

- If the current local time falls within quiet hours, suppress all output
  except **URGENT** deadline alerts.
- During quiet hours, do not generate daily digest or reading reminders.

## Output Format

Produce exactly one `progress_card`:

```
progress_card
session: "Heartbeat Check"
timestamp: {current ISO 8601 timestamp}
deadline_alerts:
  - "[URGENT] 'Submit grant proposal' — due in 6 hours"
  - "[APPROACHING] 'Review draft Chapter 3' — due in 36 hours"
reading_reminders:
  - "'Attention Is All You Need' — reading for 12 days, no activity"
daily_digest:
  papers_read: 2
  tasks_completed: 1
  tasks_created: 3
  upcoming_deadlines: 4
quiet_hours: false
```

If there are no alerts, reminders, or digest items, output:

```
progress_card
session: "Heartbeat Check"
timestamp: {current ISO 8601 timestamp}
status: "All clear — no pending alerts."
quiet_hours: false
```

## Configuration

All configurable values are set in `openclaw.json` under
`plugins.entries.research-claw-core.config`:

| Parameter | Config Key | Default | Description |
|:---|:---|:---|:---|
| Deadline window | `heartbeatDeadlineWarningHours` | 48 | Hours before deadline to start alerting |
| Digest frequency | `heartbeatDigestFrequency` | `"daily"` | `"daily"` or `"never"` |
| Digest time | `heartbeatDigestTime` | `"09:00"` | Local time for daily digest |
| Stale threshold | `heartbeatStaleReadingDays` | 7 | Days before a "reading" paper is flagged |
| Quiet start | `heartbeatQuietStart` | `"23:00"` | Start of quiet hours (local time) |
| Quiet end | `heartbeatQuietEnd` | `"08:00"` | End of quiet hours (local time) |
