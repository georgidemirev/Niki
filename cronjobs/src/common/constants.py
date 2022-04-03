BASE_URL = "https://graph.facebook.com/"
BASE_URL_V7 = "https://graph.facebook.com/v7.0/"
BASE_URL_V8 = "https://graph.facebook.com/v8.0/"
STORIES_URL = "/stories?fields=media_url,media_type,thumbnail_url,timestamp,caption,insights.metric(exits,impressions,reach,replies,taps_forward)&access_token="
INSIGHTS_URL = "?fields=like_count,comments_count,insights.metric(impressions,reach,engagement,saved)&access_token="
MEDIA_URL = "/media?fields=media_url,media_type,timestamp,comments,caption,like_count,comments_count,insights.metric(impressions,reach,engagement,saved)&access_token="
APP_DEBUG_TOKEN = "241881377023810|3cd26fce3a6a481d16496bb3196d4a65"
NEEDED_POST_COUNT_FOR_ENGAGEMENT_RATE_CALCULATION = 25
