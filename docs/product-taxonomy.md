# Product Taxonomy

## Categories

- `pothole`
- `waterlogging`
- `garbage_dumping`
- `streetlight_outage`
- `traffic_hotspot`
- `illegal_parking`
- `footpath_obstruction`
- `signal_malfunction`
- `open_manhole`
- `construction_debris`

## Report Status

- `open`
- `acknowledged`
- `in_progress`
- `fixed`
- `rejected`

## Moderation State

- `clean`
- `flagged`
- `hidden`

## Locales

- `en`
- `kn`
- `ml`

## Official Roles

- `super_admin`
- `dept_manager`
- `field_officer`
- `viewer`

## Notification

Channels:

- `push`
- `email`
- `whatsapp`

Delivery states:

- `queued`
- `sent`
- `failed`
- `read`

## Confidence Policy

- Threshold: `0.72`.
- Preview confidence below threshold forces explicit category confirmation.
- Worker enrichment never overwrites `category_final` without moderator action.
