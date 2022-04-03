import re
from datetime import date as Date
from typing import Dict, List

from src.common.constants import \
    NEEDED_POST_COUNT_FOR_ENGAGEMENT_RATE_CALCULATION


def get_insights_values_dictionary(insights: Dict) -> Dict:
    values = {}
    for insight in insights["data"]:
        values[insight["name"]] = insight["values"][0]["value"]
    return values


def filter_dictionary_by_keys(keys: List[str], dictionary: Dict) -> Dict:
    return {key: dictionary[key] for key in keys if key in dictionary}


def get_mentions_counter_from_post(post: Dict) -> Dict[str, int]:
    instagram_mentions_counter: Dict[str, int] = {}
    mentions_regex = (
        r"(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)"
    )
    if post.get("commments") and post["comments"].get("data"):
        for comment in post["comments"]["data"]:
            mentions = re.findall(mentions_regex, comment["text"])
            for mention in mentions or []:
                if mention in instagram_mentions_counter:
                    instagram_mentions_counter[mention] += 1
                else:
                    instagram_mentions_counter[mention] = 1
    if post.get("caption"):
        mentions = re.findall(mentions_regex, post["caption"])
        for mention in mentions or []:
            if mention in instagram_mentions_counter:
                instagram_mentions_counter[mention] += 1
            else:
                instagram_mentions_counter[mention] = 1

    return instagram_mentions_counter


def get_hashtags_counter_from_post(post: Dict) -> Dict[str, int]:
    instagram_hashtags_counter: Dict[str, int] = {}
    hashtags_regex = (
        r"(?:#)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)"
    )
    if post.get("commments") and post["comments"].get("data"):
        for comment in post["comments"]["data"]:
            hashtags = re.findall(hashtags_regex, comment["text"])
            for hashtag in hashtags or []:
                if hashtag in instagram_hashtags_counter:
                    instagram_hashtags_counter[hashtag] += 1
                else:
                    instagram_hashtags_counter[hashtag] = 1
    if post.get("caption"):
        hashtags = re.findall(hashtags_regex, post["caption"])
        for hashtag in hashtags or []:
            if hashtag in instagram_hashtags_counter:
                instagram_hashtags_counter[hashtag] += 1
            else:
                instagram_hashtags_counter[hashtag] = 1

    return instagram_hashtags_counter


def merge_dicts_and_sum_values(from_dict: Dict, to_dict: Dict) -> Dict:
    for key in from_dict:
        if key in to_dict:
            to_dict[key] += from_dict[key]
        else:
            to_dict[key] = from_dict[key]
    return to_dict


def calculate_engagement_rate(
    total_engagement: int, posts_count: int, followers_count: int
) -> float:
    if posts_count == 0 or followers_count == 0:
        return 0
    return ((total_engagement / posts_count) / followers_count) * 100


def calculate_engagement_from_posts(posts: List[Dict]) -> int:
    engagement = 0
    for post in posts:
        if "like_count" in post and "comments_count" in post:
            comments_count = post["comments_count"]
            like_count = post["like_count"]
            engagement += like_count + comments_count
    return engagement


def calculate_influencer_engagement(influencer: Dict) -> int:
    total_engagement = 0
    for i, post in enumerate(influencer["instagram_posts"]):
        if i == NEEDED_POST_COUNT_FOR_ENGAGEMENT_RATE_CALCULATION:
            break
        if post.get("engagement"):
            total_engagement += post["engagement"]
        else:
            total_engagement += calculate_engagement_from_posts([post])
    return total_engagement
