from enum import StrEnum


class Category(StrEnum):
    POTHOLE = "pothole"
    WATERLOGGING = "waterlogging"
    GARBAGE_DUMPING = "garbage_dumping"
    STREETLIGHT_OUTAGE = "streetlight_outage"
    TRAFFIC_HOTSPOT = "traffic_hotspot"
    ILLEGAL_PARKING = "illegal_parking"
    FOOTPATH_OBSTRUCTION = "footpath_obstruction"
    SIGNAL_MALFUNCTION = "signal_malfunction"
    OPEN_MANHOLE = "open_manhole"
    CONSTRUCTION_DEBRIS = "construction_debris"
    CANAL_BLOCKAGE = "canal_blockage"
    STRAY_ANIMAL_MENACE = "stray_animal_menace"
    TREE_FALL_RISK = "tree_fall_risk"
    FLOOD_DRAINAGE = "flood_drainage"
    PUBLIC_TOILET = "public_toilet"
    OTHER = "other"


class ReportStatus(StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    FIXED = "fixed"
    REJECTED = "rejected"


class ModerationState(StrEnum):
    CLEAN = "clean"
    FLAGGED = "flagged"
    HIDDEN = "hidden"


class MediaType(StrEnum):
    IMAGE = "image"
    VIDEO = "video"


class NotifyChannel(StrEnum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"


class FlagReason(StrEnum):
    ABUSE = "abuse"
    PERSONAL_DATA = "personal_data_exposure"
    WRONG_CATEGORY = "wrong_category"
    FAKE_REPORT = "fake_report"


class Locale(StrEnum):
    EN = "en"
    KN = "kn"
    ML = "ml"


class OfficialRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    DEPT_MANAGER = "dept_manager"
    FIELD_OFFICER = "field_officer"
    VIEWER = "viewer"


class NotificationChannel(StrEnum):
    PUSH = "push"
    EMAIL = "email"
    WHATSAPP = "whatsapp"


class NotificationStatus(StrEnum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"


class RepresentativeRole(StrEnum):
    MP = "mp"
    MLA = "mla"
    CORPORATION_COUNCILLOR = "corporation_councillor"
    MUNICIPAL_COUNCILLOR = "municipal_councillor"
    PANCHAYAT_PRESIDENT = "panchayat_president"
    DISTRICT_PANCHAYAT_MEMBER = "district_panchayat_member"
    BLOCK_PANCHAYAT_MEMBER = "block_panchayat_member"


class JurisdictionType(StrEnum):
    STATE = "state"
    DISTRICT = "district"
    CITY = "city"
    WARD = "ward"
    ZONE = "zone"
    LSG = "lsg"
