# Cover carousel and announcements

The original Puerto Rico cover remains the first slide. Catalog-backed highlights and a house-discovery panel follow it. The separate fragrance spotlight below the cover is unchanged. Both carousels are manually controlled: arrows, direct slide buttons, Left/Right, Home/End, and touch swipes. No automatic advance, tracking, or collection writes occur.

Product slides only use approved catalog photos and exact-bottle price rules. Missing prices stay explicit. Navigation retains the selected slide across ordinary data rerenders. If a selected product or announcement disappears, the cover becomes active again. Hidden panels are inert and excluded from keyboard navigation. Reduced-motion preferences disable the reveal animation.

## Add a real announcement later

Edit `data/home-highlights.json` and publish it through GitHub. No event is displayed until an enabled, valid announcement exists. This is a repository-managed configuration, not an admin-page event editor.

Each item in `announcements` accepts:

| Field | Purpose |
| --- | --- |
| `id` | Unique slug using letters, numbers, and hyphens |
| `enabled` | Must be `true` to appear |
| `title` | Required public banner heading |
| `eyebrow` | Optional short label, such as “Community event” |
| `description` | Optional public details |
| `href` | Required supported app hash route or HTTPS destination |
| `linkLabel` | Optional button label |
| `startsAt` | Optional publication start; ISO timestamp with explicit UTC `Z` or offset |
| `endsAt` | Optional publication end, exclusive; same timestamp format |

These timestamps control banner visibility, not the event's scheduled start. Put the actual event date, time zone, and location in its public description and linked details. At most three active announcements appear. Duplicate IDs, disabled items, invalid dates, and unsafe links are skipped. An unavailable announcement file does not block the cover or catalog.

Only publish verified event information. There are no sample events on the live site.
